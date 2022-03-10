import 'dotenv/config';
import path from 'path';
import url from 'url';
import fs from 'fs';
import ms from 'ms';
import axios from 'axios';
import Fastify from 'fastify';
import async from 'async';
import FastifyCors from 'fastify-cors';
import Web3 from 'web3';

const isProduction = process.env.NODE_ENV === 'production';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// const NONCE_FILENAME = path.join(__dirname, 'nonce.txt');
const weiPerAddressFilename = path.join(__dirname, 'wei-per-address.txt');
let weiPerAddress = null;
let faucetBalance = null;

let blockNumberCache = null;
let blockTimestampCache = null;
let blockNumberCacheUpdatedAtMs = 0;

let queue = null;
// let nonce = null;
let isExitRequested = false;

const RUN_QUEUE_INTERVAL_MS = ms('15s');
const BLOCK_EXPIRATION_MS = ms('15s');
const EXPIRATION_SECONDS = 86400;
const limitsFilename = path.join(__dirname, 'limits.json');
const ipsFilename = path.join(__dirname, 'ips.json');
let limits = {};
let ips = {};

const WHITE_LIST = (process.env.WHITE_LIST || '').trim().toLowerCase().replace(/\s+/g, ' ').split(' ');

const web3 = new Web3(process.env.ETHEREUM_RPC);
const sponsor = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);

async function verifyRecaptcha(token, ip = null) {
  const data = {
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: token
  };

  if (ip) {
    data.remoteip = ip;
  }

  const response = await axios({
    url: 'https://www.google.com/recaptcha/api/siteverify',
    params: data,
    metohd: 'POST',
    validateStatus: () => true,
  });

  if (!response.data?.success) {
    return true; // failsafe
  }

  return response.data?.score >= 0.7;
}

function loadLimits() {
  if (!fs.existsSync(limitsFilename)) {
    return;
  }

  limits = JSON.parse(fs.readFileSync(limitsFilename));
}

function storeLimits() {
  fs.writeFileSync(limitsFilename, JSON.stringify(limits, null, "\t"));
}

function loadIps() {
  if (!fs.existsSync(ipsFilename)) {
    return;
  }

  ips = JSON.parse(fs.readFileSync(ipsFilename));
}

function storeIps() {
  fs.writeFileSync(ipsFilename, JSON.stringify(ips, null, "\t"));
}

// function storeNonce() {
//   fs.writeFileSync(NONCE_FILENAME, nonce.toString() + "\n");
// }

// function loadNonce() {
//   nonce = parseInt(fs.readFileSync(NONCE_FILENAME).toString());
// }

function unixtime() {
  return Math.floor(Date.now() / 1000);
}

function expireLimits() {
  const cutoffUnixtime = unixtime() - EXPIRATION_SECONDS;
  for (const [ address, lastSentUnixtime ] of Object.entries(limits)) {
    if (lastSentUnixtime <= cutoffUnixtime) {
      delete limits[address];
    }
  }

  storeLimits();
}

function expireIps() {
  const cutoffUnixtime = unixtime() - EXPIRATION_SECONDS;
  for (const [ ip, lastSentUnixtime ] of Object.entries(ips)) {
    if (lastSentUnixtime <= cutoffUnixtime) {
      delete ips[ip];
    }
  }

  storeIps();
}

function readWeiPerAddress() {
  weiPerAddress = BigInt(fs.readFileSync(weiPerAddressFilename).toString());
}

async function updateFaucetBalance() {
  faucetBalance = await web3.eth.getBalance(sponsor.address);
}

async function getBlockNumber() {
  if (Date.now() - blockNumberCacheUpdatedAtMs >= BLOCK_EXPIRATION_MS) {
    let block = null;
    try {
      block = await web3.eth.getBlock('latest');
    } catch (e) {
      console.error("Cannot load block");
      console.error(e);

      blockNumberCache = null;
      blockTimestampCache = null;
      blockNumberCacheUpdatedAtMs = 0;

      return;
    }

    blockNumberCache = block.number;
    blockTimestampCache = block.timestamp;
    blockNumberCacheUpdatedAtMs = Date.now();
  }
}

function sendTransaction(address, ip, nonce) {
  return new Promise(resolve => {
    sponsor.signTransaction({
      from: sponsor.address,
      to: address,
      value: weiPerAddress.toString(),
      gas: web3.utils.toHex(70000),
      maxFeePerGas: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
      maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('5', 'gwei')),
      nonce

    }).then(tx => {
      console.log("Signed");
      const addressLC = address.toLowerCase();

      try {
        const promiEvent = web3.eth.sendSignedTransaction(tx.rawTransaction);
        console.log("sendSigned");

        promiEvent.once('transactionHash', hash => console.log(hash));
        promiEvent.once('sent', () => {
          console.log('sent');
          resolve(promiEvent);
        });

        promiEvent.once('sending', () => console.log("SENDING"));

        promiEvent.on('error', e => {
          console.error("SEND TRANSACTION FAILED (1)");
          console.error(e);

          delete limits[addressLC];
          delete ips[ip];
          storeLimits();
          storeIps();

          resolve();
        });

      } catch (e) {
        console.error("SEND TRANSACTION FAILED");
        console.error(e);

        delete limits[addressLC];
        delete ips[ip];
        storeLimits();
        storeIps();

        resolve();
      }
    });
  });
}

async function runQueue() {
  if (queue.length == 0) {
    if (isExitRequested) {
      console.log("Exiting before queue execution");
      process.exit(0);
    }

    setTimeout(runQueue, RUN_QUEUE_INTERVAL_MS);
    return;
  }

  const workingQueue = queue;
  queue = [];

  let nonce = await web3.eth.getTransactionCount(sponsor.address);

  console.log("Running queue of %d addresses with nonce %d", workingQueue.length, nonce);

  const promises1 = [];

  for (const { address, ip } of workingQueue) {
    console.log("Sending %s nonce %d", address, nonce);
    const transaction = await sendTransaction(address, ip, nonce);
    if (transaction) {
      console.log("Sent %s nonce %d", address, nonce);
      promises1.push(transaction);
      nonce++;
    } else {
      console.log("NOT %s", address);
    }
  }

  console.log("Sent, mining...");

  await Promise.all(promises1);

  console.log("All mined");

  if (isExitRequested) {
    console.log("Exiting after queue execution");
    process.exit(0);
  }

  setTimeout(runQueue, RUN_QUEUE_INTERVAL_MS);
}

async function executeTransaction({ address, ip }) {
  // nonce++;
  // storeNonce();

  console.log("[%s] %s: executing", (new Date()).toISOString(), address);

  const addressLC = address.toLowerCase();

  const tx = {
    from: sponsor.address,
    to: address,
    value: weiPerAddress.toString(),
    gas: web3.utils.toHex(70000),
    maxFeePerGas: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
    maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('5', 'gwei'))
  };

  const signed = await sponsor.signTransaction(tx);

  try {
    const promiEvent = web3.eth.sendSignedTransaction(signed.rawTransaction);
    promiEvent.once('transactionHash', hash => console.log("[%s] %s: %s", (new Date()).toISOString(), address, hash));

    await promiEvent;

    console.log("[%s] %s: mined", (new Date()).toISOString(), address);

    limits[addressLC] = unixtime(); // eslint-disable-line require-atomic-updates
    ips[ip] = unixtime(); // eslint-disable-line require-atomic-updates

  } catch (e) {
    console.error("SEND TRANSACTION FAILED");
    console.error(e);

    // nonce--;

    delete limits[addressLC];
    delete ips[ip];

  } finally {
    // storeNonce();
    storeLimits();
    storeIps();
  }
}

const fastify = Fastify({
  logger: !isProduction
});

fastify.register(FastifyCors, {
});

fastify.get('/api/stats/',
  async () => {
    await getBlockNumber();

    return {
      success: true,
      address: sponsor.address,
      balance: faucetBalance,
      blockNumber: blockNumberCache,
      blockTimestamp: blockTimestampCache,
      weiPerAddress: weiPerAddress.toString()
    };
  }
);

fastify.post('/api/gimme/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          address: {
            type: 'string'
          },
          token: {
            type: 'string'
          }
        },
        required: [ 'address', 'token' ]
      }
    }
  },

  async request => {
    if (isExitRequested) {
      return {
        success: false,
        isExit: true
      };
    }

    const ip = request.headers['x-real-ip'] || '0.0.0.0';

    const isCaptchaValidated = await verifyRecaptcha(request.body.token, ip);
    if (!isCaptchaValidated) {
      return {
        success: false,
        isBot: true,
        message: "I believe you are a bot"
      };
    }

    const address = (request.body.address || '').trim();

    const isAddress = web3.utils.isAddress(address);
    if (!isAddress) {
      return {
        success: false,
        message: "Invalid address"
      };
    }

    const addressLC = address.toLowerCase();

    if (!WHITE_LIST.includes(addressLC)) {
      if (limits[addressLC]) {
        return {
          success: false,
          isLimited: true,
          liftAtUnixtime: limits[addressLC] + EXPIRATION_SECONDS
        };
      }

      if (ips[ip]) {
        return {
          success: false,
          isLimited: true,
          liftAtUnixtime: ips[ip] + EXPIRATION_SECONDS
        };
      }
    }

    if (faucetBalance < weiPerAddress) {
      return {
        success: false,
        isEmpty: true
      };
    }

    limits[addressLC] = unixtime(); // eslint-disable-line require-atomic-updates
    ips[ip] = unixtime(); // eslint-disable-line require-atomic-updates
    storeLimits();

    queue.push({ address, ip });

    return {
      success: true,
      address,
      amount: weiPerAddress.toString()
    };
  }
);

readWeiPerAddress();
fs.watchFile(
  weiPerAddressFilename, {
    persistent: true,
    interval: ms('30s')
  },
  readWeiPerAddress
);

loadLimits();
loadIps();
setInterval(expireLimits, ms('120s'));
setInterval(expireIps, ms('120s'));

updateFaucetBalance();
setInterval(updateFaucetBalance, ms('2m'));

queue = [];
runQueue();

// loadNonce();
// console.log("Starting with nonce %d", nonce);

// queue = async.queue(executeTransaction, 1);

process.on('SIGINT', async () => {
  console.log("Got SIGINT, draining");
  if (isExitRequested) {
    console.log("Force exit");
    process.exit(0);
  }

  isExitRequested = true;

  // try {
  //   await queue.drain(() => console.log("Drained callback"));
  // } catch {
  //   // ignore
  // }

  fastify.close();

  // console.log("Queue drained, exit");
  // process.exit(0);
});

fastify.listen(process.env.LISTEN_PORT, process.env.LISTEN_HOST, (err, address) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log(`server listening on ${address}`);

  if (process.send) {
    process.send('ready');
  }
});

