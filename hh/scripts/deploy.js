const hre = require('hardhat');

async function main() {
  const Spray = await hre.ethers.getContractFactory('Spray');
  const spray = await Spray.deploy();

  await spray.deployed();

  console.log("Spray deployed to:", spray.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
