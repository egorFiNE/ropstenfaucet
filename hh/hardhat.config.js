require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined;

module.exports = {
  networks: {
    ropsten: {
      url: 'https://ropsten.infura.io/v3/795393a3dfd84b729bb354798100b8bb',
      accounts
    }
  },

  solidity: {
    version: '0.8.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  }
};
