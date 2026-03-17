const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    console.log("MockUSDC deployed to:", await usdc.getAddress());

    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await weth.waitForDeployment();
    console.log("MockWETH deployed to:", await weth.getAddress());

    const InterestRateModel = await hre.ethers.getContractFactory("InterestRateModel");
    const baseRate = hre.ethers.parseUnits("0.02", 18);
    const slope1 = hre.ethers.parseUnits("0.04", 18);
    const slope2 = hre.ethers.parseUnits("0.75", 18);
    const optimalUtilization = hre.ethers.parseUnits("0.8", 18);

    const interestRateModel = await InterestRateModel.deploy(
        baseRate,
        slope1,
        slope2,
        optimalUtilization
    );
    await interestRateModel.waitForDeployment();
    console.log("InterestRateModel deployed to:", await interestRateModel.getAddress());

    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(await interestRateModel.getAddress());
    await lendingPool.waitForDeployment();
    console.log("LendingPool deployed to:", await lendingPool.getAddress());

    const usdcPrice = hre.ethers.parseUnits("1", 18);
    const usdcLtv = 8000;
    const usdcLiquidationThreshold = 8500;

    await lendingPool.addAsset(
        await usdc.getAddress(),
        usdcLtv,
        usdcLiquidationThreshold,
        usdcPrice,
        6
    );
    console.log("USDC asset added to LendingPool");

    const wethPrice = hre.ethers.parseUnits("2000", 18);
    const wethLtv = 7500;
    const wethLiquidationThreshold = 8000;

    await lendingPool.addAsset(
        await weth.getAddress(),
        wethLtv,
        wethLiquidationThreshold,
        wethPrice,
        18
    );
    console.log("WETH asset added to LendingPool");

    const mintAmount = hre.ethers.parseUnits("1000000", 6);
    await usdc.mint(deployer.address, mintAmount);
    console.log("Minted 1,000,000 USDC to deployer");

    const wethMintAmount = hre.ethers.parseUnits("1000", 18);
    await weth.mint(deployer.address, wethMintAmount);
    console.log("Minted 1,000 WETH to deployer");

    console.log("\n--- Deployment Summary ---");
    console.log("MockUSDC:", await usdc.getAddress());
    console.log("MockWETH:", await weth.getAddress());
    console.log("InterestRateModel:", await interestRateModel.getAddress());
    console.log("LendingPool:", await lendingPool.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
