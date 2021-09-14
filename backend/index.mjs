import 'dotenv/config';
import path from 'path';
import url from 'url';
import fs from 'fs';
import ms from 'ms';
import Fastify from 'fastify';
import FastifyCors from 'fastify-cors';
import Web3 from 'web3';

const isProduction = process.env.NODE_ENV === 'production';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const weiPerAddressFilename = path.join(__dirname, 'wei-per-address.txt');
let weiPerAddress = null;
let faucetBalance = null;

let blockNumberCache = null;
let blockTimestampCache = null;
let blockNumberCacheUpdatedAtMs = 0;

const BLOCK_EXPIRATION_MS = ms('15s');
const RESTART_ON_FAIL_MS = ms('2s');
const EXPIRATION_SECONDS = 86400;
const limitsFilename = path.join(__dirname, 'limits.json');
let limits = {};

const web3 = new Web3(process.env.ETHEREUM_RPC);
const sponsor = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);

function loadLimits() {
  if (!fs.existsSync(limitsFilename)) {
    return;
  }

  limits = JSON.parse(fs.readFileSync(limitsFilename));
}

function storeLimits() {
  fs.writeFileSync(limitsFilename, JSON.stringify(limits, null, "\t"));
}

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
          }
        },
        required: [ 'address' ]
      }
    }
  },

  async (request, reply) => {
    const address = (request.body.address || '').trim();

    const isAddress = web3.utils.isAddress(address);
    if (!isAddress) {
      return {
        success: false,
        message: "Invalid address"
      };
    }

    const addressLC = address.toLowerCase();
    if (limits[addressLC]) {
      return {
        success: false,
        isLimited: true,
        liftAtUnixtime: limits[addressLC] + EXPIRATION_SECONDS
      };
    }

    const faucetBalance = BigInt(await web3.eth.getBalance(sponsor.address));

    if (faucetBalance < weiPerAddress) {
      return {
        success: false,
        isEmpty: true
      };
    }

    const tx = {
      from: sponsor.address,
      to: address,
      value: weiPerAddress.toString(),
      gas: web3.utils.toHex(70000),
      maxFeePerGas: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
      maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('5', 'gwei'))
      // nonce: 21
    };

    const signed = await sponsor.signTransaction(tx);

    let result = null;
    try {
      result = web3.eth.sendSignedTransaction(signed.rawTransaction);
    } catch (e) {
      console.error("SEND TR");
      console.error(e);
    }

    if (!result) {
      return {
        success: false,
        message: "Cannot init transaction"
      };
    }

    result.on('error', e => {
      limits[addressLC] = unixtime(); // eslint-disable-line require-atomic-updates
      storeLimits();

      console.log("Failed sending to %s", address);
      console.log(e);
      console.log("Restarting");
      setTimeout(() => process.exit(0), RESTART_ON_FAIL_MS);

      reply.send({
        success: false,
        message: "Transaction failed"
      });
    });

    result.once('transactionHash', tx => {
      limits[addressLC] = unixtime(); // eslint-disable-line require-atomic-updates
      storeLimits();

      reply.send({
        success: true,
        address,
        amount: weiPerAddress.toString(),
        tx
      });
    });
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
setInterval(expireLimits, ms('60s'));

updateFaucetBalance();
setInterval(updateFaucetBalance, ms('60s'));

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
