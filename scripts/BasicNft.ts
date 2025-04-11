import hre from "hardhat";

async function main() {
    const BasicNft = await hre.viem.deployContract("BasicNft");

    console.log("BasicNft deployed to:", BasicNft.address);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });