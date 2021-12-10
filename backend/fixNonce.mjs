import 'dotenv/config';
import Web3 from 'web3';

const web3 = new Web3(process.env.ETHEREUM_RPC);
const sponsor = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);

let nonce = null;

async function findNonceInTransactions(transactions) {
  for (const hash of transactions) {
    const transaction = await web3.eth.getTransaction(hash);
    if (transaction.from.toLowerCase() == sponsor.address.toLowerCase()) {
      nonce = transaction.nonce;
      return hash;
    }
  }
  return null;
}

async function findNonce() {
  let blockNumber = await web3.eth.getBlockNumber();
  const minBlockNumber = blockNumber - 7000;

  do {
    const block = await web3.eth.getBlock(blockNumber);
    const hash = await findNonceInTransactions(block.transactions);
    if (hash) {
      console.log(`Found nonce ${nonce} in block ${blockNumber} tx ${hash}`);
      return;
    }

    console.log("Examined block %d", blockNumber);
    blockNumber--;
  } while (blockNumber >= minBlockNumber);
}

await findNonce();
if (!nonce) {
  console.log("Cannot find nonce");
  process.exit(0);
}

nonce+=1;

const amount = 1n * 10n**18n;

const tx = {
  from: sponsor.address,
  to: process.argv[2],
  value: amount.toString(),
  gas: web3.utils.toHex(22000),
  maxFeePerGas: web3.utils.toHex(web3.utils.toWei('2', 'gwei')),
  maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('1', 'gwei')),
  nonce
};

const signed = await sponsor.signTransaction(tx);

let result = null;
try {
  result = web3.eth.sendSignedTransaction(signed.rawTransaction);
} catch (e) {
  console.error("Send failed");
  console.error(e);
  process.exit(0);
}

result.on('error', e => {
  console.log("Failed");
  console.log(e);
});

result.once('transactionHash', tx => {
  console.log("Success");
  console.log(tx);
  process.exit(0);
});
