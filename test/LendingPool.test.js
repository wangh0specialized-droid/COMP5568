const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
    let usdc, weth, interestRateModel, lendingPool;
    let owner, user1, user2;
    const PRECISION = ethers.parseUnits("1", 18);

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);

        const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
        interestRateModel = await InterestRateModel.deploy(
            ethers.parseUnits("0.02", 18),
            ethers.parseUnits("0.04", 18),
            ethers.parseUnits("0.75", 18),
            ethers.parseUnits("0.8", 18)
        );

        const LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy(await interestRateModel.getAddress());

        await lendingPool.addAsset(
            await usdc.getAddress(),
            8000,
            8500,
            ethers.parseUnits("1", 18),
            6
        );

        await lendingPool.addAsset(
            await weth.getAddress(),
            7500,
            8000,
            ethers.parseUnits("2000", 18),
            18
        );

        await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
        await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
        await weth.mint(user1.address, ethers.parseUnits("10", 18));
        await weth.mint(user2.address, ethers.parseUnits("10", 18));
    });

    describe("Deposit", function () {
        it("should allow users to deposit", async function () {
            const depositAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await usdc.getAddress(), depositAmount);

            const balance = await lendingPool.getUserDepositBalance(user1.address, await usdc.getAddress());
            expect(balance).to.equal(depositAmount);
        });
    });

    describe("Withdraw", function () {
        it("should allow users to withdraw", async function () {
            const depositAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await usdc.getAddress(), depositAmount);

            const withdrawAmount = ethers.parseUnits("500", 6);
            await lendingPool.connect(user1).withdraw(await usdc.getAddress(), withdrawAmount);

            const balance = await lendingPool.getUserDepositBalance(user1.address, await usdc.getAddress());
            expect(balance).to.be.closeTo(depositAmount - withdrawAmount, 1);
        });
    });

    describe("Borrow", function () {
        it("should allow users to borrow against collateral", async function () {
            const depositAmount = ethers.parseUnits("1", 18);
            await weth.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await weth.getAddress(), depositAmount);

            const usdcDeposit = ethers.parseUnits("5000", 6);
            await usdc.connect(user2).approve(await lendingPool.getAddress(), usdcDeposit);
            await lendingPool.connect(user2).deposit(await usdc.getAddress(), usdcDeposit);

            const borrowAmount = ethers.parseUnits("1000", 6);
            await lendingPool.connect(user1).borrow(await usdc.getAddress(), borrowAmount);

            const borrowBalance = await lendingPool.getUserBorrowBalance(user1.address, await usdc.getAddress());
            expect(borrowBalance).to.equal(borrowAmount);
        });

        it("should enforce LTV limits", async function () {
            const depositAmount = ethers.parseUnits("1", 18);
            await weth.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await weth.getAddress(), depositAmount);

            const usdcDeposit = ethers.parseUnits("10000", 6);
            await usdc.connect(user2).approve(await lendingPool.getAddress(), usdcDeposit);
            await lendingPool.connect(user2).deposit(await usdc.getAddress(), usdcDeposit);

            const excessiveBorrow = ethers.parseUnits("2000", 6);
            await expect(
                lendingPool.connect(user1).borrow(await usdc.getAddress(), excessiveBorrow)
            ).to.be.revertedWith("Exceeds max borrow capacity");
        });
    });

    describe("Repay", function () {
        it("should allow users to repay borrowed amount", async function () {
            const depositAmount = ethers.parseUnits("1", 18);
            await weth.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await weth.getAddress(), depositAmount);

            const usdcDeposit = ethers.parseUnits("5000", 6);
            await usdc.connect(user2).approve(await lendingPool.getAddress(), usdcDeposit);
            await lendingPool.connect(user2).deposit(await usdc.getAddress(), usdcDeposit);

            const borrowAmount = ethers.parseUnits("1000", 6);
            await lendingPool.connect(user1).borrow(await usdc.getAddress(), borrowAmount);

            await usdc.mint(user1.address, ethers.parseUnits("100", 6));

            const repayAmount = ethers.parseUnits("500", 6);
            await usdc.connect(user1).approve(await lendingPool.getAddress(), repayAmount);
            await lendingPool.connect(user1).repay(await usdc.getAddress(), repayAmount);

            const borrowBalance = await lendingPool.getUserBorrowBalance(user1.address, await usdc.getAddress());
            expect(borrowBalance).to.be.closeTo(borrowAmount - repayAmount, 100);
        });
    });

    describe("Health Factor", function () {
        it("should calculate health factor correctly", async function () {
            const depositAmount = ethers.parseUnits("1", 18);
            await weth.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            await lendingPool.connect(user1).deposit(await weth.getAddress(), depositAmount);

            const usdcDeposit = ethers.parseUnits("5000", 6);
            await usdc.connect(user2).approve(await lendingPool.getAddress(), usdcDeposit);
            await lendingPool.connect(user2).deposit(await usdc.getAddress(), usdcDeposit);

            const borrowAmount = ethers.parseUnits("1000", 6);
            await lendingPool.connect(user1).borrow(await usdc.getAddress(), borrowAmount);

            const healthFactor = await lendingPool.getHealthFactor(user1.address);
            expect(healthFactor).to.be.gt(PRECISION);
        });

        it("should return max uint256 when no borrows", async function () {
            const healthFactor = await lendingPool.getHealthFactor(user1.address);
            expect(healthFactor).to.equal(ethers.MaxUint256);
        });
    });

    describe("Interest Rate Model", function () {
        it("should calculate utilization rate", async function () {
            const utilization = await interestRateModel.getUtilizationRate(
                ethers.parseUnits("800", 18),
                ethers.parseUnits("200", 18)
            );
            expect(utilization).to.equal(ethers.parseUnits("0.2", 18));
        });
    });
});
