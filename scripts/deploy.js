const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // --- 1. Deploy Mock ERC20 tokens ---
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    console.log("MockUSDC deployed to:", await usdc.getAddress());

    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await weth.waitForDeployment();
    console.log("MockWETH deployed to:", await weth.getAddress());

    // --- 2. Bonus 4: Deploy GOV token (reuse MockERC20) ---
    const govToken = await MockERC20.deploy("Governance Token", "GOV", 18);
    await govToken.waitForDeployment();
    console.log("GOV Token deployed to:", await govToken.getAddress());

    // --- 3. Deploy InterestRateModel ---
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

    // --- 4. Bonus 3: Deploy PriceOracle ---
    const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
    console.log("PriceOracle deployed to:", await priceOracle.getAddress());

    // --- 5. Deploy LendingPool ---
    const LendingPool = await hre.ethers.getContractFactory("contracts/LendingPool(bonus1234).sol:LendingPool");
    const lendingPool = await LendingPool.deploy(
        await interestRateModel.getAddress(),
        await priceOracle.getAddress()
    );
    await lendingPool.waitForDeployment();
    console.log("LendingPool deployed to:", await lendingPool.getAddress());

    // --- 6. Deploy FlashLoanReceiver (Receiver.sol) ---
    const FlashLoanReceiver = await hre.ethers.getContractFactory("FlashLoanReceiver");
    const receiver = await FlashLoanReceiver.deploy(await lendingPool.getAddress());
    await receiver.waitForDeployment();
    console.log("FlashLoanReceiver deployed to:", await receiver.getAddress());

    // --- 7. Bonus 4: Set GOV token in LendingPool ---
    let tx = await lendingPool.setGovToken(await govToken.getAddress());
    await tx.wait();
    console.log("GOV token set in LendingPool");

    // --- 8. Add USDC asset ---
    const usdcPrice = hre.ethers.parseUnits("1", 18);
    const usdcLtv = 8000;
    const usdcLiquidationThreshold = 8500;

    tx = await lendingPool.addAsset(
        await usdc.getAddress(),
        usdcLtv,
        usdcLiquidationThreshold,
        usdcPrice,
        6
    );
    await tx.wait();
    console.log("USDC asset added to LendingPool");

    // --- 9. Bonus 3: Set USDC price in oracle ---
    tx = await priceOracle.setAssetPrice(
        await usdc.getAddress(),
        hre.ethers.parseUnits("1", 18)
    );
    await tx.wait();
    tx = await priceOracle.setUseChainlink(await usdc.getAddress(), false);
    await tx.wait();

    // --- 10. Add WETH asset ---
    const wethPrice = hre.ethers.parseUnits("2000", 18);
    const wethLtv = 7500;
    const wethLiquidationThreshold = 8000;

    tx = await lendingPool.addAsset(
        await weth.getAddress(),
        wethLtv,
        wethLiquidationThreshold,
        wethPrice,
        18
    );
    await tx.wait();
    console.log("WETH asset added to LendingPool");

    // --- 11. Bonus 3: Set WETH price in oracle ---
    tx = await priceOracle.setPriceFeed(
        await weth.getAddress(),
        "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    );
    await tx.wait();
    tx = await priceOracle.setAssetPrice(
        await weth.getAddress(),
        hre.ethers.parseUnits("2000", 18)
    );
    await tx.wait();
    tx = await priceOracle.setUseChainlink(await weth.getAddress(), true);
    await tx.wait();

    // --- 12. Bonus 4: Set reward speeds ---
    // 0.01 GOV per second for both supply and borrow on each asset
    const rewardSpeed = hre.ethers.parseUnits("0.01", 18);

    tx = await lendingPool.setRewardSpeed(
        await usdc.getAddress(),
        rewardSpeed,
        rewardSpeed
    );
    await tx.wait();
    console.log("USDC reward speed set:", "0.01 GOV/sec (supply + borrow)");

    tx = await lendingPool.setRewardSpeed(
        await weth.getAddress(),
        rewardSpeed,
        rewardSpeed
    );
    await tx.wait();
    console.log("WETH reward speed set:", "0.01 GOV/sec (supply + borrow)");

    // --- 13. Mint tokens to deployer ---
    const mintAmount = hre.ethers.parseUnits("1000000", 6);
    tx = await usdc.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log("Minted 1,000,000 USDC to deployer");

    const wethMintAmount = hre.ethers.parseUnits("1000", 18);
    tx = await weth.mint(deployer.address, wethMintAmount);
    await tx.wait();
    console.log("Minted 1,000 WETH to deployer");

    // --- 14. NEW: Fund FlashLoanReceiver with fee tokens ---
    // Transfer small amounts to Receiver so it can pay the 0.09% flash loan fee
    const usdcFee = hre.ethers.parseUnits("1000", 6);   // 1000 USDC for fees
    const wethFee = hre.ethers.parseUnits("1", 18);      // 1 WETH for fees

    tx = await usdc.transfer(await receiver.getAddress(), usdcFee);
    await tx.wait();
    console.log("Funded FlashLoanReceiver with 1,000 USDC for fees");

    tx = await weth.transfer(await receiver.getAddress(), wethFee);
    await tx.wait();
    console.log("Funded FlashLoanReceiver with 1 WETH for fees");

    // --- Deployment Summary ---
    console.log("\n========== Deployment Summary ==========");
    console.log("MockUSDC:", await usdc.getAddress());
    console.log("MockWETH:", await weth.getAddress());
    console.log("GOV Token:", await govToken.getAddress());
    console.log("InterestRateModel:", await interestRateModel.getAddress());
    console.log("PriceOracle:", await priceOracle.getAddress());
    console.log("LendingPool:", await lendingPool.getAddress());
    console.log("FlashLoanReceiver:", await receiver.getAddress());
    console.log("\n--- Bonus 3 Config ---");
    console.log("USDC: Manual price $1, Chainlink=false");
    console.log("WETH: Chainlink feed 0x694A...5306, Chainlink=true");
    console.log("\n--- Bonus 4 Config ---");
    console.log("GOV token set in LendingPool: YES");
    console.log("USDC reward speed: 0.01 GOV/sec (supply + borrow)");
    console.log("WETH reward speed: 0.01 GOV/sec (supply + borrow)");
    console.log("\n--- Flash Loan Config ---");
    console.log("FlashLoanReceiver owner:", deployer.address);
    console.log("FlashLoanReceiver funded: 1000 USDC + 1 WETH");
    console.log("=========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
