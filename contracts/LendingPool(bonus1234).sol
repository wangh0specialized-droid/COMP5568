// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InterestRateModel.sol";
import "./PriceOracle.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

contract LendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e18;
    uint256 public constant PERCENTAGE_BASE = 10000;
    uint256 public constant LIQUIDATION_BONUS = 10500;
    uint256 public constant FLASH_LOAN_FEE = 9;

    struct AssetConfig {
        uint256 ltv;
        uint256 liquidationThreshold;
        uint256 price;
        uint8 decimals;
        bool isActive;
    }

    struct AssetData {
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 borrowIndex;
        uint256 supplyIndex;
        uint256 lastUpdateTimestamp;
    }

    struct UserAssetData {
        uint256 depositShares;
        uint256 borrowShares;
        bool usingAsCollateral;
    }

    struct RewardState {
        uint256 supplyRewardIndex;
        uint256 borrowRewardIndex;
        uint256 supplyRewardSpeed;
        uint256 borrowRewardSpeed;
        uint256 lastRewardTimestamp;
    }

    struct UserRewardState {
        uint256 supplyRewardIndex;
        uint256 borrowRewardIndex;
        uint256 accrued;
    }

    InterestRateModel public interestRateModel;
    PriceOracle public priceOracle;
    address[] public assetList;

    address public govToken;

    mapping(address => AssetConfig) public assetConfigs;
    mapping(address => AssetData) public assetData;
    mapping(address => mapping(address => UserAssetData)) public userAssetData;

    mapping(address => RewardState) public rewardStates;
    mapping(address => mapping(address => UserRewardState)) public userRewardStates;

    event AssetAdded(address indexed asset, uint256 ltv, uint256 liquidationThreshold);
    event AssetPriceUpdated(address indexed asset, uint256 newPrice);
    event Deposit(address indexed user, address indexed asset, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 shares);
    event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 shares);
    event Repay(address indexed user, address indexed asset, uint256 amount, uint256 shares);
    event PriceOracleUpdated(address indexed newPriceOracle);
    event Liquidation(address indexed liquidator, address indexed borrower, address debtAsset, uint256 repayAmount, address collateralAsset, uint256 collateralSeized);
    event FlashLoan(address indexed borrower, address indexed asset, uint256 amount, uint256 fee);

    event GovTokenUpdated(address indexed newGovToken);
    event RewardSpeedUpdated(address indexed asset, uint256 supplySpeed, uint256 borrowSpeed);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address interestRateModel_, address priceOracle_) Ownable(msg.sender) {
        interestRateModel = InterestRateModel(interestRateModel_);
        priceOracle = PriceOracle(priceOracle_);
    }

    function setGovToken(address govToken_) external onlyOwner {
        require(govToken_ != address(0), "Invalid address");
        govToken = govToken_;
        emit GovTokenUpdated(govToken_);
    }

    function setRewardSpeed(
        address asset,
        uint256 supplySpeed,
        uint256 borrowSpeed
    ) external onlyOwner {
        require(assetConfigs[asset].isActive, "Asset not active");
        _updateRewardIndex(asset);
        rewardStates[asset].supplyRewardSpeed = supplySpeed;
        rewardStates[asset].borrowRewardSpeed = borrowSpeed;
        emit RewardSpeedUpdated(asset, supplySpeed, borrowSpeed);
    }

    function _updateRewardIndex(address asset) internal {
        RewardState storage reward = rewardStates[asset];
        AssetData storage data = assetData[asset];

        if (block.timestamp <= reward.lastRewardTimestamp) {
            return;
        }

        uint256 timeDelta = block.timestamp - reward.lastRewardTimestamp;

        if (data.totalDeposits > 0 && reward.supplyRewardSpeed > 0) {
            uint256 supplyReward = timeDelta * reward.supplyRewardSpeed;
            uint256 totalSupplyShares = (data.totalDeposits * PRECISION) / data.supplyIndex;
            reward.supplyRewardIndex += (supplyReward * PRECISION) / totalSupplyShares;
        }

        if (data.totalBorrows > 0 && reward.borrowRewardSpeed > 0) {
            uint256 borrowReward = timeDelta * reward.borrowRewardSpeed;
            uint256 totalBorrowShares = (data.totalBorrows * PRECISION) / data.borrowIndex;
            reward.borrowRewardIndex += (borrowReward * PRECISION) / totalBorrowShares;
        }

        reward.lastRewardTimestamp = block.timestamp;
    }

    function _accrueUserReward(address user, address asset) internal {
        _updateRewardIndex(asset);

        RewardState storage reward = rewardStates[asset];
        UserRewardState storage userReward = userRewardStates[user][asset];
        UserAssetData storage userData = userAssetData[user][asset];

        if (userData.depositShares > 0) {
            uint256 supplyDelta = reward.supplyRewardIndex - userReward.supplyRewardIndex;
            if (supplyDelta > 0) {
                userReward.accrued += (userData.depositShares * supplyDelta) / PRECISION;
            }
        }
        userReward.supplyRewardIndex = reward.supplyRewardIndex;

        if (userData.borrowShares > 0) {
            uint256 borrowDelta = reward.borrowRewardIndex - userReward.borrowRewardIndex;
            if (borrowDelta > 0) {
                userReward.accrued += (userData.borrowShares * borrowDelta) / PRECISION;
            }
        }
        userReward.borrowRewardIndex = reward.borrowRewardIndex;
    }

    function claimRewards() external nonReentrant {
        require(govToken != address(0), "GOV token not set");

        uint256 totalReward = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            _accrueUserReward(msg.sender, assetList[i]);
            UserRewardState storage userReward = userRewardStates[msg.sender][assetList[i]];
            totalReward += userReward.accrued;
            userReward.accrued = 0;
        }

        if (totalReward > 0) {
            IMintableERC20(govToken).mint(msg.sender, totalReward);
            emit RewardClaimed(msg.sender, totalReward);
        }
    }

    function getPendingRewards(address user) external view returns (uint256) {
        uint256 totalReward = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            RewardState storage reward = rewardStates[asset];
            UserRewardState storage userReward = userRewardStates[user][asset];
            UserAssetData storage userData = userAssetData[user][asset];
            AssetData storage data = assetData[asset];

            uint256 currentSupplyIndex = reward.supplyRewardIndex;
            uint256 currentBorrowIndex = reward.borrowRewardIndex;

            if (block.timestamp > reward.lastRewardTimestamp) {
                uint256 timeDelta = block.timestamp - reward.lastRewardTimestamp;

                if (data.totalDeposits > 0 && reward.supplyRewardSpeed > 0) {
                    uint256 supplyReward = timeDelta * reward.supplyRewardSpeed;
                    uint256 totalSupplyShares = (data.totalDeposits * PRECISION) / data.supplyIndex;
                    currentSupplyIndex += (supplyReward * PRECISION) / totalSupplyShares;
                }

                if (data.totalBorrows > 0 && reward.borrowRewardSpeed > 0) {
                    uint256 borrowReward = timeDelta * reward.borrowRewardSpeed;
                    uint256 totalBorrowShares = (data.totalBorrows * PRECISION) / data.borrowIndex;
                    currentBorrowIndex += (borrowReward * PRECISION) / totalBorrowShares;
                }
            }

            uint256 pending = userReward.accrued;

            if (userData.depositShares > 0) {
                uint256 supplyDelta = currentSupplyIndex - userReward.supplyRewardIndex;
                pending += (userData.depositShares * supplyDelta) / PRECISION;
            }

            if (userData.borrowShares > 0) {
                uint256 borrowDelta = currentBorrowIndex - userReward.borrowRewardIndex;
                pending += (userData.borrowShares * borrowDelta) / PRECISION;
            }

            totalReward += pending;
        }
        return totalReward;
    }

    function addAsset(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 price,
        uint8 decimals
    ) external onlyOwner {
        require(!assetConfigs[asset].isActive, "Asset already added");
        require(ltv < liquidationThreshold, "Invalid LTV");
        require(liquidationThreshold <= PERCENTAGE_BASE, "Invalid threshold");

        assetConfigs[asset] = AssetConfig({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            price: price,
            decimals: decimals,
            isActive: true
        });

        assetData[asset] = AssetData({
            totalDeposits: 0,
            totalBorrows: 0,
            borrowIndex: PRECISION,
            supplyIndex: PRECISION,
            lastUpdateTimestamp: block.timestamp
        });

        rewardStates[asset] = RewardState({
            supplyRewardIndex: 0,
            borrowRewardIndex: 0,
            supplyRewardSpeed: 0,
            borrowRewardSpeed: 0,
            lastRewardTimestamp: block.timestamp
        });

        assetList.push(asset);
        emit AssetAdded(asset, ltv, liquidationThreshold);
    }

    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        require(assetConfigs[asset].isActive, "Asset not active");
        assetConfigs[asset].price = price;
        emit AssetPriceUpdated(asset, price);
    }

    function accrueInterest(address asset) public {
        AssetData storage data = assetData[asset];

        if (block.timestamp == data.lastUpdateTimestamp) {
            return;
        }

        if (data.totalDeposits == 0) {
            data.lastUpdateTimestamp = block.timestamp;
            return;
        }

        uint256 cash = IERC20(asset).balanceOf(address(this));
        uint256 borrowRatePerSecond = interestRateModel.getBorrowRatePerSecond(cash, data.totalBorrows);
        uint256 supplyRatePerSecond = interestRateModel.getSupplyRatePerSecond(cash, data.totalBorrows);

        uint256 timeDelta = block.timestamp - data.lastUpdateTimestamp;

        uint256 borrowInterestFactor = borrowRatePerSecond * timeDelta;
        uint256 supplyInterestFactor = supplyRatePerSecond * timeDelta;

        data.borrowIndex = data.borrowIndex + (data.borrowIndex * borrowInterestFactor / PRECISION);
        data.supplyIndex = data.supplyIndex + (data.supplyIndex * supplyInterestFactor / PRECISION);

        data.totalBorrows = data.totalBorrows + (data.totalBorrows * borrowInterestFactor / PRECISION);

        data.lastUpdateTimestamp = block.timestamp;
    }

    function getAssetList() external view returns (address[] memory) {
        return assetList;
    }

    function getUserDepositBalance(address user, address asset) public view returns (uint256) {
        UserAssetData storage userData = userAssetData[user][asset];
        AssetData storage data = assetData[asset];
        if (userData.depositShares == 0) {
            return 0;
        }
        return (userData.depositShares * data.supplyIndex) / PRECISION;
    }

    function getUserBorrowBalance(address user, address asset) public view returns (uint256) {
        UserAssetData storage userData = userAssetData[user][asset];
        AssetData storage data = assetData[asset];
        if (userData.borrowShares == 0) {
            return 0;
        }
        return (userData.borrowShares * data.borrowIndex) / PRECISION;
    }

    function getAssetPrice(address asset) public view returns (uint256) {
        if (address(priceOracle) != address(0)) {
            return priceOracle.getAssetPrice(asset);
        }
        return assetConfigs[asset].price;
    }

    function normalizeAmount(address asset, uint256 amount) internal view returns (uint256) {
        uint8 decimals = assetConfigs[asset].decimals;
        if (decimals < 18) {
            return amount * (10 ** (18 - decimals));
        }
        return amount;
    }

    function getUserCollateralValue(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            UserAssetData storage userData = userAssetData[user][asset];
            if (userData.usingAsCollateral && userData.depositShares > 0) {
                uint256 balance = getUserDepositBalance(user, asset);
                uint256 normalizedBalance = normalizeAmount(asset, balance);
                uint256 price = getAssetPrice(asset);
                totalValue += (normalizedBalance * price) / PRECISION;
            }
        }
        return totalValue;
    }

    function getUserBorrowValue(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            uint256 balance = getUserBorrowBalance(user, asset);
            if (balance > 0) {
                uint256 normalizedBalance = normalizeAmount(asset, balance);
                uint256 price = getAssetPrice(asset);
                totalValue += (normalizedBalance * price) / PRECISION;
            }
        }
        return totalValue;
    }

    function getHealthFactor(address user) public view returns (uint256) {
        uint256 borrowValue = getUserBorrowValue(user);
        if (borrowValue == 0) {
            return type(uint256).max;
        }

        uint256 liquidationValue = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            UserAssetData storage userData = userAssetData[user][asset];
            if (userData.usingAsCollateral && userData.depositShares > 0) {
                uint256 balance = getUserDepositBalance(user, asset);
                uint256 normalizedBalance = normalizeAmount(asset, balance);
                uint256 price = getAssetPrice(asset);
                uint256 threshold = assetConfigs[asset].liquidationThreshold;
                liquidationValue += (normalizedBalance * price * threshold) / (PRECISION * PERCENTAGE_BASE);
            }
        }

        return (liquidationValue * PRECISION) / borrowValue;
    }

    function getMaxBorrowValue(address user) public view returns (uint256) {
        uint256 maxBorrow = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            UserAssetData storage userData = userAssetData[user][asset];
            if (userData.usingAsCollateral && userData.depositShares > 0) {
                uint256 balance = getUserDepositBalance(user, asset);
                uint256 normalizedBalance = normalizeAmount(asset, balance);
                uint256 price = getAssetPrice(asset);
                uint256 ltv = assetConfigs[asset].ltv;
                maxBorrow += (normalizedBalance * price * ltv) / (PRECISION * PERCENTAGE_BASE);
            }
        }
        return maxBorrow;
    }

    function deposit(address asset, uint256 amount) external nonReentrant {
        require(assetConfigs[asset].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        accrueInterest(asset);

        _accrueUserReward(msg.sender, asset);

        AssetData storage data = assetData[asset];
        UserAssetData storage userData = userAssetData[msg.sender][asset];

        uint256 shares;
        if (data.totalDeposits == 0) {
            shares = amount;
        } else {
            shares = (amount * PRECISION) / data.supplyIndex;
        }

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        userData.depositShares += shares;
        userData.usingAsCollateral = true;
        data.totalDeposits += amount;

        emit Deposit(msg.sender, asset, amount, shares);
    }

    function withdraw(address asset, uint256 amount) external nonReentrant {
        require(assetConfigs[asset].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        accrueInterest(asset);

        _accrueUserReward(msg.sender, asset);

        AssetData storage data = assetData[asset];
        UserAssetData storage userData = userAssetData[msg.sender][asset];

        uint256 userBalance = getUserDepositBalance(msg.sender, asset);
        require(userBalance >= amount, "Insufficient balance");

        uint256 shares = (amount * PRECISION) / data.supplyIndex;
        require(userData.depositShares >= shares, "Insufficient shares");

        userData.depositShares -= shares;
        data.totalDeposits -= amount;

        if (userData.borrowShares > 0 || getUserBorrowBalance(msg.sender, asset) > 0) {
            uint256 healthFactor = getHealthFactor(msg.sender);
            require(healthFactor >= PRECISION, "Health factor too low");
        }

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, asset, amount, shares);
    }

    function setCollateralEnabled(address asset, bool enabled) external {
        require(assetConfigs[asset].isActive, "Asset not active");
        userAssetData[msg.sender][asset].usingAsCollateral = enabled;

        if (!enabled && getUserBorrowValue(msg.sender) > 0) {
            uint256 healthFactor = getHealthFactor(msg.sender);
            require(healthFactor >= PRECISION, "Health factor too low");
        }
    }

    function borrow(address asset, uint256 amount) external nonReentrant {
        require(assetConfigs[asset].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        accrueInterest(asset);

        _accrueUserReward(msg.sender, asset);

        AssetData storage data = assetData[asset];
        UserAssetData storage userData = userAssetData[msg.sender][asset];

        uint256 availableLiquidity = IERC20(asset).balanceOf(address(this));
        require(availableLiquidity >= amount, "Insufficient liquidity");

        uint256 shares;
        if (data.totalBorrows == 0) {
            shares = amount;
        } else {
            shares = (amount * PRECISION) / data.borrowIndex;
        }

        userData.borrowShares += shares;
        data.totalBorrows += amount;

        uint256 maxBorrowValue = getMaxBorrowValue(msg.sender);
        uint256 currentBorrowValue = getUserBorrowValue(msg.sender);
        require(currentBorrowValue <= maxBorrowValue, "Exceeds max borrow capacity");

        uint256 healthFactor = getHealthFactor(msg.sender);
        require(healthFactor >= PRECISION, "Health factor too low");

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit Borrow(msg.sender, asset, amount, shares);
    }

    function repay(address asset, uint256 amount) external nonReentrant {
        require(assetConfigs[asset].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        accrueInterest(asset);

        _accrueUserReward(msg.sender, asset);

        AssetData storage data = assetData[asset];
        UserAssetData storage userData = userAssetData[msg.sender][asset];

        uint256 userBorrowBalance = getUserBorrowBalance(msg.sender, asset);
        require(userBorrowBalance > 0, "No borrow to repay");

        uint256 repayAmount = amount > userBorrowBalance ? userBorrowBalance : amount;

        uint256 shares = (repayAmount * PRECISION) / data.borrowIndex;

        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);

        userData.borrowShares -= shares;
        data.totalBorrows -= repayAmount;

        emit Repay(msg.sender, asset, repayAmount, shares);
    }

    function getAvailableLiquidity(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function getAssetData(address asset) external view returns (
        uint256 totalDeposits,
        uint256 totalBorrows,
        uint256 borrowIndex,
        uint256 supplyIndex,
        uint256 borrowRate,
        uint256 supplyRate
    ) {
        AssetData storage data = assetData[asset];
        uint256 cash = IERC20(asset).balanceOf(address(this));
        return (
            data.totalDeposits,
            data.totalBorrows,
            data.borrowIndex,
            data.supplyIndex,
            interestRateModel.getBorrowRatePerYear(cash, data.totalBorrows),
            interestRateModel.getSupplyRatePerYear(cash, data.totalBorrows)
        );
    }

    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralValue,
        uint256 totalBorrowValue,
        uint256 availableBorrowValue,
        uint256 healthFactor
    ) {
        totalCollateralValue = getUserCollateralValue(user);
        totalBorrowValue = getUserBorrowValue(user);
        uint256 maxBorrow = getMaxBorrowValue(user);
        availableBorrowValue = maxBorrow > totalBorrowValue ? maxBorrow - totalBorrowValue : 0;
        healthFactor = getHealthFactor(user);
    }

    function _repayDebt(address borrower, address debtAsset, uint256 repayAmount) internal {
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), repayAmount);

        uint256 shares = (repayAmount * PRECISION) / assetData[debtAsset].borrowIndex;
        userAssetData[borrower][debtAsset].borrowShares -= shares;
        assetData[debtAsset].totalBorrows -= repayAmount;
    }

    function _calculateCollateralAmount(
        address debtAsset,
        address collateralAsset,
        uint256 repayAmount
    ) internal view returns (uint256) {
        uint256 priceDebt = getAssetPrice(debtAsset);
        uint256 priceColl = getAssetPrice(collateralAsset);

        uint256 collateralSeizeValue = (repayAmount * priceDebt * LIQUIDATION_BONUS) / (PRECISION * PERCENTAGE_BASE);
        return (collateralSeizeValue * PRECISION) / priceColl;
    }

    function _seizeCollateral(
        address borrower,
        address collateralAsset,
        uint256 collateralAmount
    ) internal {
        uint256 borrowerCollateral = getUserDepositBalance(borrower, collateralAsset);
        require(borrowerCollateral >= collateralAmount, "Not enough collateral");

        uint256 collShares = (collateralAmount * PRECISION) / assetData[collateralAsset].supplyIndex;
        userAssetData[borrower][collateralAsset].depositShares -= collShares;
        assetData[collateralAsset].totalDeposits -= collateralAmount;

        IERC20(collateralAsset).safeTransfer(msg.sender, collateralAmount);
    }

    function liquidate(
        address borrower,
        address debtAsset,
        uint256 repayAmount,
        address collateralAsset
    ) external nonReentrant {
        require(assetConfigs[debtAsset].isActive, "Debt asset not active");
        require(assetConfigs[collateralAsset].isActive, "Collateral asset not active");

        uint256 healthFactor = getHealthFactor(borrower);
        require(healthFactor < PRECISION, "Health factor >= 1, not eligible");

        accrueInterest(debtAsset);
        accrueInterest(collateralAsset);

        _accrueUserReward(borrower, debtAsset);
        _accrueUserReward(borrower, collateralAsset);

        uint256 borrowerDebt = getUserBorrowBalance(borrower, debtAsset);
        require(borrowerDebt > 0, "No debt to liquidate");

        uint256 actualRepay = repayAmount > borrowerDebt ? borrowerDebt : repayAmount;

        // 1. Execute repaying
        _repayDebt(borrower, debtAsset, actualRepay);

        // 2. Calculate amount of liquidatable collateral
        uint256 collateralAmount = _calculateCollateralAmount(debtAsset, collateralAsset, actualRepay);

        // 3. Transfer collateral
        _seizeCollateral(borrower, collateralAsset, collateralAmount);

        emit Liquidation(msg.sender, borrower, debtAsset, actualRepay, collateralAsset, collateralAmount);
    }
    
    function flashLoan(
        address receiver,
        address asset,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant {
        require(assetConfigs[asset].isActive, "Asset not active");
        uint256 availableLiquidity = IERC20(asset).balanceOf(address(this));
        require(availableLiquidity >= amount, "Insufficient liquidity");

        uint256 fee = (amount * FLASH_LOAN_FEE) / PERCENTAGE_BASE;
        uint256 totalRepayment = amount + fee;

        // Transfer funds to receiver
        IERC20(asset).safeTransfer(receiver, amount);

        // Call receiver contract
        (bool success, ) = receiver.call(
            abi.encodeWithSignature("executeOperation(address,uint256,uint256,bytes)", asset, amount, fee, params)
        );
        require(success, "Flash loan callback failed");

        // Ensure repayment
        IERC20(asset).safeTransferFrom(receiver, address(this), totalRepayment);

        emit FlashLoan(receiver, asset, amount, fee);
    }
}
