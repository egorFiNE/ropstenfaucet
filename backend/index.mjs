import 'dotenv/config';
import path from 'path';
import url from 'url';
import fs from 'fs';
import ms from 'ms';
import axios from 'axios';
import Fastify from 'fastify';
import FastifyCors from 'fastify-cors';
import { ethers } from 'ethers';

const isProduction = process.env.NODE_ENV === 'production';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const weiPerAddressFilename = path.join(__dirname, 'wei-per-address.txt');
let weiPerAddress = null;
let faucetBalance = null;

let blockNumber = null;
let blockTimestamp = null;

let queue = null;
let lastQueueExecutedAtUnixtime = 0;
let isExitRequested = false;

const MAX_QUEUE_LENGTH = 10;
const MAX_QUEUE_SECONDS = 60;
const RUN_QUEUE_INTERVAL_MS = ms('5s');
const EXPIRATION_SECONDS = 86400;
const PING_EVERY = '45s';
const limitsFilename = path.join(__dirname, 'limits.json');
const ipsFilename = path.join(__dirname, 'ips.json');
let limits = {};
let ips = {};

const WHITE_LIST = (process.env.WHITE_LIST || '').trim().toLowerCase().replace(/\s+/g, ' ').split(' ');

const provider = new ethers.providers.InfuraWebSocketProvider(process.env.INFURA_NETWORK, {
  projectId: process.env.INFURA_PROJECT_ID
});

provider._websocket.on('open', () => {
  console.log("Provider open");
  provider._websocket.ping();
});

provider._websocket.on('pong', () => setTimeout(() => provider._websocket.ping(), ms(PING_EVERY)));

provider._websocket.on('close', () => {
  console.log("Connection died. exit");
  process.exit(0);
});

const sponsor = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const SprayABI = [
  'function spread(uint256 amount, address[] memory accounts)'
];

const contract = new ethers.Contract(process.env.CONTRACT, SprayABI, sponsor);

provider.on('block', _blockNumber => {
  blockNumber = _blockNumber;
  blockTimestamp = unixtime();
});

const _blockNumber = await provider.getBlockNumber();
if (
  (blockNumber !== null && _blockNumber > blockNumber) ||
  !blockNumber
) {
  blockNumber = _blockNumber;
  blockTimestamp = unixtime();
}

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
  faucetBalance = (await provider.getBalance(contract.address)).toBigInt();
}

export async function waitTransaction(transactionRequest) {
  console.log("\t↳ Waiting for transaction %s to mine", transactionRequest.hash);

  try {
    const transactionReceipt = await transactionRequest.wait();
    console.log("\t\t↳ Mined in block %s", transactionReceipt.blockNumber);
  } catch (e) {
    console.error("\t\t↳ Transaction failed:");
    console.error(e);
  }
}

async function possiblyRunQueue() {
  if (queue.length == 0) {
    if (isExitRequested) {
      console.log("Exiting before queue execution");
      process.exit(0);
    }

    lastQueueExecutedAtUnixtime = unixtime();
    setTimeout(possiblyRunQueue, RUN_QUEUE_INTERVAL_MS);
    return;
  }

  if (queue.length < MAX_QUEUE_LENGTH && (unixtime() - lastQueueExecutedAtUnixtime) < MAX_QUEUE_SECONDS) {
    console.log("Skip queue execution, length=%d, seconds=%d", queue.length, unixtime() - lastQueueExecutedAtUnixtime);
    setTimeout(possiblyRunQueue, RUN_QUEUE_INTERVAL_MS);
    return;
  }

  const workingQueue = queue.splice(0, MAX_QUEUE_LENGTH);

  const nonce = await sponsor.getTransactionCount();

  const overrides = {
    maxFeePerGas: ethers.utils.parseUnits('700', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('700', 'gwei'),
    nonce
  };

  console.log(`queue length ${workingQueue.length} nonce ${overrides.nonce} maxFeePerGas ${ethers.utils.formatUnits(overrides.maxFeePerGas, 'gwei')} maxPriorityFeePerGas ${ethers.utils.formatUnits(overrides.maxPriorityFeePerGas, 'gwei')}`);

  const addressList = workingQueue.map(entry => entry.address);
  const transactionRequest = await contract.spread(weiPerAddress, addressList, overrides);

  lastQueueExecutedAtUnixtime = unixtime();

  await waitTransaction(transactionRequest);

  setTimeout(possiblyRunQueue, RUN_QUEUE_INTERVAL_MS);
}

const fastify = Fastify({
  logger: !isProduction
});

fastify.register(FastifyCors, {
});

fastify.get('/api/stats/',
  async () => {
    return {
      success: true,
      address: contract.address,
      donationsToAddress: sponsor.address,
      balance: faucetBalance.toString(),
      queueSize: queue.length,

      blockNumber,
      blockTimestamp,

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

    const isAddress = ethers.utils.isAddress(address);
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
setInterval(updateFaucetBalance, ms('5m'));

queue = [];
possiblyRunQueue();

process.on('SIGINT', async () => {
  console.log("Got SIGINT, draining");
  if (isExitRequested) {
    console.log("Force exit");
    process.exit(0);
  }

  isExitRequested = true;

  fastify.close();
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

