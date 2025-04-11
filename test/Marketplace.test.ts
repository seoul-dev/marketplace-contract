import { expect } from "chai";
import hre from "hardhat";

describe("NftMarketplace", function () {
  let marketplace: any;
  let nft: any;
  let alice: any;
  let bob: any;
  let tokenId: bigint;

  beforeEach(async function () {
    marketplace = await hre.viem.deployContract("NftMarketplace");
    nft = await hre.viem.deployContract("BasicNft");
    [alice, bob] = await hre.viem.getWalletClients();
    
    const mintHash = await nft.write.mintNft({ account: alice.account });
    const publicClient = await hre.viem.getPublicClient();
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    
    const approveHash = await nft.write.approve([
      marketplace.address,
      0n
    ], { account: alice.account });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    
    tokenId = 0n;
  });

  describe("Listing", function () {
    it("Should list NFT with correct price", async function () {
      const price = 1000000000000000000n; // 1 ETH
      const hash = await marketplace.write.listItem([
        nft.address,
        tokenId,
        price
      ], { account: alice.account });
      
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const listing = await marketplace.read.getListing([nft.address, tokenId]);
      expect(listing.price).to.equal(price);
      expect(listing.seller.toLowerCase()).to.equal(alice.account.address.toLowerCase());
    });

    it("Should fail when listing with zero price", async function () {
      await expect(
        marketplace.write.listItem([
          nft.address,
          tokenId,
          0n
        ], { account: alice.account })
      ).to.be.rejected;
    });

    it("Should fail when listing without approval", async function () {
      // address(0)
      const approveHash = await nft.write.approve([
        "0x0000000000000000000000000000000000000000",
        tokenId
      ], { account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      
      await expect(
        marketplace.write.listItem([
          nft.address,
          tokenId,
          1000000000000000000n
        ], { account: alice.account })
      ).to.be.rejected;
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      const price = 1000000000000000000n;
      const hash = await marketplace.write.listItem([
        nft.address,
        tokenId,
        price
      ], { account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    });

    it("Should buy NFT with correct price", async function () {
      const price = 1000000000000000000n;
      const hash = await marketplace.write.buyItem([
        nft.address,
        tokenId
      ], { 
        account: bob.account,
        value: price
      });
      
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const owner = await nft.read.ownerOf([tokenId]);
      expect(owner.toLowerCase()).to.equal(bob.account.address.toLowerCase());
      
      const proceeds = await marketplace.read.getProceeds([alice.account.address]);
      expect(proceeds).to.equal(price);
    });

    it("Should fail when buying with insufficient funds", async function () {
      await expect(
        marketplace.write.buyItem([
          nft.address,
          tokenId
        ], { 
          account: bob.account,
          value: 500000000000000000n // 0.5 ETH
        })
      ).to.be.rejected;
    });
  });

  describe("Canceling", function () {
    beforeEach(async function () {
      const price = 1000000000000000000n;
      const hash = await marketplace.write.listItem([
        nft.address,
        tokenId,
        price
      ], { account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    });

    it("Should cancel listing", async function () {
      const hash = await marketplace.write.cancelListing([
        nft.address,
        tokenId
      ], { account: alice.account });
      
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const listing = await marketplace.read.getListing([nft.address, tokenId]);
      expect(listing.price).to.equal(0n);
    });

    it("Should fail when canceling other's listing", async function () {
      await expect(
        marketplace.write.cancelListing([
          nft.address,
          tokenId
        ], { account: bob.account })
      ).to.be.rejected;
    });
  });

  describe("Withdrawing", function () {
    beforeEach(async function () {
      const price = 1000000000000000000n;
      const hash = await marketplace.write.listItem([
        nft.address,
        tokenId,
        price
      ], { account: alice.account });
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      
      const buyHash = await marketplace.write.buyItem([
        nft.address,
        tokenId
      ], { 
        account: bob.account,
        value: price
      });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });
    });

    it("Should withdraw proceeds", async function () {
      const publicClient = await hre.viem.getPublicClient();
      const initialBalance = await publicClient.getBalance({
        address: alice.account.address
      });
      
      const hash = await marketplace.write.withdrawProceeds({ account: alice.account });
      await publicClient.waitForTransactionReceipt({ hash });
      
      const finalBalance = await publicClient.getBalance({
        address: alice.account.address
      });
      
      expect(finalBalance > initialBalance).to.be.true;
    });

    it("Should fail when withdrawing with no proceeds", async function () {
      await expect(
        marketplace.write.withdrawProceeds({ account: bob.account })
      ).to.be.rejected;
    });
  });
});
