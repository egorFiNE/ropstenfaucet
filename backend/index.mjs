import 'dotenv/config';
import path from 'path';
import url from 'url';
import fs from 'fs';
import Fastify from 'fastify';
import FastifyCors from 'fastify-cors';
import Web3 from 'web3';

const isProduction = process.env.NODE_ENV === 'production';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const weiPerAddressFilename = path.join(__dirname, 'wei-per-address.txt');

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
  return BigInt(fs.readFileSync(weiPerAddressFilename).toString());
}

const fastify = Fastify({
  logger: !isProduction
});

fastify.register(FastifyCors, {
});

fastify.get('/api/stats/',
  async () => {
    const balance = await web3.eth.getBalance(sponsor.address);

    return {
      success: true,
      address: sponsor.address,
      balance,
      weiPerAddress: readWeiPerAddress().toString()
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

    const amount = readWeiPerAddress();
    const faucetBalance = BigInt(await web3.eth.getBalance(sponsor.address));

    if (faucetBalance < amount) {
      return {
        success: false,
        isEmpty: true
      };
    }

    const tx = {
      from: sponsor.address,
      to: address,
      value: amount.toString(),
      gas: web3.utils.toHex(22000),
      maxFeePerGas: web3.utils.toHex(web3.utils.toWei('2', 'gwei')),
      maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('1', 'gwei')),
      nonce: 21
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
      console.log("Failed");
      console.log(e);
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
        amount: amount.toString(),
        tx
      });
    });
  }
);

loadLimits();
setInterval(expireLimits, 60000);

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
