export const TARGET_CHAIN_ID = 11155111;
export const TARGET_CHAIN_HEX = '0xaa36a7';
export const SEPOLIA_RPC_URL = 'https://rpc.sepolia.org';

export const CONTRACT_ADDRESSES = {
  LENDING_POOL: '0xD6C093f145467482aDA8e74c3Ca2001715979761',
  USDC: '0x960BB2E40d6FD61Cb2a54C6597888aEa4ae1b2b6',
  WETH: '0x1981631026c3A3FC1C9de4545082607AA910eb08',
  GOV_TOKEN: '0xf6c756d4a07fb991b0371BAcbc739E2D4eC5157B',
  INTEREST_RATE_MODEL: '0x9f6Fc78872C8cfb07756cEF2041F1B6FbFA71668',
  PRICE_ORACLE: '0xf693813547Cbe993803cb6d5036458D92003a0FA',
  FLASH_LOAN_RECEIVER: '0x0C5a2699683ccBC4FC3De3F4Be1dcfCd16e94743',
} as const;

export const LENDING_POOL_ABI = [
  // View functions
  'function getAssetList() view returns (address[])',
  'function assetConfigs(address asset) view returns (uint256 ltv, uint256 liquidationThreshold, uint256 price, uint8 decimals, bool isActive)',
  'function userAssetData(address user, address asset) view returns (uint256 depositShares, uint256 borrowShares, bool usingAsCollateral)',
  'function getAssetData(address asset) view returns (uint256 totalDeposits, uint256 totalBorrows, uint256 borrowIndex, uint256 supplyIndex, uint256 borrowRate, uint256 supplyRate)',
  'function getAvailableLiquidity(address asset) view returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralValue, uint256 totalBorrowValue, uint256 availableBorrowValue, uint256 healthFactor)',
  'function getUserDepositBalance(address user, address asset) view returns (uint256)',
  'function getUserBorrowBalance(address user, address asset) view returns (uint256)',
  'function getHealthFactor(address user) view returns (uint256)',
  'function getAssetPrice(address asset) view returns (uint256)',
  'function getMaxBorrowValue(address user) view returns (uint256)',
  'function getUserCollateralValue(address user) view returns (uint256)',
  'function getUserBorrowValue(address user) view returns (uint256)',
  // Bonus 4: Rewards
  'function getPendingRewards(address user) view returns (uint256)',
  'function govToken() view returns (address)',
  // Core functions
  'function deposit(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
  'function borrow(address asset, uint256 amount)',
  'function repay(address asset, uint256 amount)',
  'function setCollateralEnabled(address asset, bool enabled)',
  // Bonus 3: Liquidation
  'function liquidate(address borrower, address debtAsset, uint256 repayAmount, address collateralAsset)',
  // Bonus 4: Flash Loan & Rewards
  'function flashLoan(address receiver, address asset, uint256 amount, bytes params)',
  'function claimRewards()',
  // Events
  'event Deposit(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Repay(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Liquidation(address indexed liquidator, address indexed borrower, address debtAsset, uint256 repayAmount, address collateralAsset, uint256 collateralSeized)',
  'event FlashLoan(address indexed borrower, address indexed asset, uint256 amount, uint256 fee)',
  'event RewardClaimed(address indexed user, uint256 amount)',
] as const;

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const;

export const PRICE_ORACLE_ABI = [
  'function getAssetPrice(address asset) view returns (uint256)',
  'function getPriceSource(address asset) view returns (address priceFeed, uint256 manualPrice, bool useChainlink)',
  'function STALENESS_THRESHOLD() view returns (uint256)',
  // Admin write functions (onlyOwner)
  'function setAssetPrice(address asset, uint256 price)',
  'function setUseChainlink(address asset, bool enabled)',
  'function setPriceFeed(address asset, address priceFeed)',
  'function owner() view returns (address)',
] as const;

export const FLASH_LOAN_RECEIVER_ABI = [
  'function startFlashLoan(address asset, uint256 amount, address target, bytes callData)',
  'function withdrawToken(address token, uint256 amount)',
  'function owner() view returns (address)',
  'function lendingPool() view returns (address)',
] as const;

export const ASSET_METADATA: Record<string, { name: string; symbol: string; color: string }> = {
  [CONTRACT_ADDRESSES.USDC.toLowerCase()]: {
    name: 'USD Coin',
    symbol: 'USDC',
    color: '#2775ca',
  },
  [CONTRACT_ADDRESSES.WETH.toLowerCase()]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    color: '#627eea',
  },
};
