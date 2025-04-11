import { expect } from "chai";
import hre from "hardhat";

describe("BasicNft", function () {
  let BasicNft: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    BasicNft = await hre.viem.deployContract("BasicNft");
    [alice, bob] = await hre.viem.getWalletClients();
  });

  describe("Initial State", function () {
    it("Should have correct name and symbol", async function () {
      const name = await BasicNft.read.name();
      const symbol = await BasicNft.read.symbol();
      
      expect(name).to.equal("Dogie");
      expect(symbol).to.equal("DOG");
    });

    it("Should start with zero tokens", async function () {
      const counter = await BasicNft.read.getTokenCounter();
      expect(counter).to.equal(0n);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT to alice", async function () {
      const hash = await BasicNft.write.mintNft({ account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const ownerOf = await BasicNft.read.ownerOf([0n]);
      expect(ownerOf.toLowerCase()).to.equal(alice.account.address.toLowerCase());
    });

    it("Should increment counter after minting", async function () {
      const initialCounter = await BasicNft.read.getTokenCounter();
      
      const hash = await BasicNft.write.mintNft({ account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const finalCounter = await BasicNft.read.getTokenCounter();
      expect(finalCounter).to.equal(initialCounter + 1n);
    });
  });

  describe("Transfer", function () {
    beforeEach(async function () {
      const hash = await BasicNft.write.mintNft({ account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    });

    it("Should transfer NFT from alice to bob", async function () {
      const transferHash = await BasicNft.write.transferFrom([
        alice.account.address,
        bob.account.address,
        0n
      ], { account: alice.account });
      
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: transferHash });
      
      const newOwner = await BasicNft.read.ownerOf([0n]);
      expect(newOwner.toLowerCase()).to.equal(bob.account.address.toLowerCase());
    });

    it("Should fail when bob tries to transfer without approval", async function () {
      await expect(
        BasicNft.write.transferFrom([
          alice.account.address,
          bob.account.address,
          0n
        ], { account: bob.account })
      ).to.be.rejected;
    });
  });
});