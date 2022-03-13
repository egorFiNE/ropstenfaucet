const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Spray", function () {
  let signers;
  let spray;

  before(async () => {
    signers = await hre.ethers.getSigners();

    const Spray = await ethers.getContractFactory("Spray");
    spray = await Spray.deploy();
    await spray.deployed();
  });

  it("Should accept and collect", async function () {
    await signers[0].sendTransaction({
      to: spray.address,
      value: ethers.utils.parseEther('10')
    });

    expect(await ethers.provider.getBalance(spray.address)).to.be.eq(ethers.utils.parseEther('10'));

    await spray.collect();

    expect(await ethers.provider.getBalance(spray.address)).to.be.eq(0);
  });

  it("Should spread", async function () {
    await signers[0].sendTransaction({
      to: spray.address,
      value: ethers.utils.parseEther('10')
    });

    expect(await ethers.provider.getBalance(spray.address)).to.be.eq(ethers.utils.parseEther('10'));

    const alice = ethers.Wallet.createRandom().connect(hre.ethers.provider);
    const bob = ethers.Wallet.createRandom().connect(hre.ethers.provider);

    await spray.spread(ethers.utils.parseEther('1'), [ alice.address, bob.address ]);

    expect(await ethers.provider.getBalance(alice.address)).to.be.eq(ethers.utils.parseEther('1'));
    expect(await ethers.provider.getBalance(bob.address)).to.be.eq(ethers.utils.parseEther('1'));
  });
});
