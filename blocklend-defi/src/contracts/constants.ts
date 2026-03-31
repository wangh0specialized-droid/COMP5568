export const TARGET_CHAIN_ID = 31337;
export const TARGET_CHAIN_HEX = '0x7a69';
export const LOCAL_RPC_URL = 'http://127.0.0.1:8545';

export const CONTRACT_ADDRESSES = {
  LENDING_POOL: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  USDC: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  WETH: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  INTEREST_RATE_MODEL: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
} as const;

export const LENDING_POOL_ABI = [
  'function getAssetList() view returns (address[])',
  'function assetConfigs(address asset) view returns (uint256 ltv, uint256 liquidationThreshold, uint256 price, uint8 decimals, bool isActive)',
  'function userAssetData(address user, address asset) view returns (uint256 depositShares, uint256 borrowShares, bool usingAsCollateral)',
  'function getAssetData(address asset) view returns (uint256 totalDeposits, uint256 totalBorrows, uint256 borrowIndex, uint256 supplyIndex, uint256 borrowRate, uint256 supplyRate)',
  'function getAvailableLiquidity(address asset) view returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralValue, uint256 totalBorrowValue, uint256 availableBorrowValue, uint256 healthFactor)',
  'function getUserDepositBalance(address user, address asset) view returns (uint256)',
  'function getUserBorrowBalance(address user, address asset) view returns (uint256)',
  'function deposit(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
  'function borrow(address asset, uint256 amount)',
  'function repay(address asset, uint256 amount)',
  'function setCollateralEnabled(address asset, bool enabled)',
  'event Deposit(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
  'event Repay(address indexed user, address indexed asset, uint256 amount, uint256 shares)',
] as const;

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
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
