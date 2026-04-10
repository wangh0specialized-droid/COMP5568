import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './useWeb3';
import {
  ASSET_METADATA,
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  FLASH_LOAN_RECEIVER_ABI,
  LENDING_POOL_ABI,
  PRICE_ORACLE_ABI,
} from '../contracts/constants';
import { describeProtocolError, formatHealthFactor } from '../lib/utils';

export interface OracleSourceData {
  priceFeed: string;
  manualPrice: bigint;
  useChainlink: boolean;
  oraclePrice: bigint;
}

export interface AssetData {
  address: string;
  name: string;
  symbol: string;
  color: string;
  decimals: number;
  totalDeposit: string;
  totalBorrow: string;
  availableLiquidity: string;
  walletBalance: string;
  userDepositBalance: string;
  userBorrowBalance: string;
  usingAsCollateral: boolean;
  totalDepositRaw: bigint;
  totalBorrowRaw: bigint;
  availableLiquidityRaw: bigint;
  walletBalanceRaw: bigint;
  userDepositBalanceRaw: bigint;
  userBorrowBalanceRaw: bigint;
  priceRaw: bigint;
  supplyApyRaw: bigint;
  borrowApyRaw: bigint;
  utilizationBps: number;
  ltv: number;
  liquidationThreshold: number;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  price: number;
  oracle?: OracleSourceData;
  receiverBalance: string;
}

export interface UserAccountData {
  totalCollateral: string;
  totalCollateralRaw: bigint;
  totalDebt: string;
  totalDebtRaw: bigint;
  availableBorrows: string;
  availableBorrowsRaw: bigint;
  healthFactor: string;
  healthFactorRaw: bigint;
  healthFactorRatio: number;
  healthFactorLabel: 'Safe' | 'Watch' | 'Risk' | 'Infinity';
}

export type TransactionStage = 'idle' | 'approving' | 'submitting' | 'confirming' | 'success' | 'error';

export interface TransactionState {
  type: 'idle' | 'pending' | 'success' | 'error';
  stage: TransactionStage;
  message: string;
  details?: string;
  txHash?: string;
}

function formatAssetAmount(value: bigint, decimals: number) {
  return ethers.formatUnits(value, decimals);
}

function formatUsdValue(value: bigint) {
  return ethers.formatUnits(value, 18);
}

function formatHealthFactorDisplay(value: bigint) {
  if (value >= (2n ** 255n)) {
    return 'Infinity';
  }
  return formatHealthFactor(value);
}

function classifyHealthFactor(value: bigint): UserAccountData['healthFactorLabel'] {
  if (value >= (2n ** 255n)) {
    return 'Infinity';
  }
  const ratio = Number.parseFloat(formatHealthFactorDisplay(value));
  if (!Number.isFinite(ratio)) {
    return 'Infinity';
  }
  if (ratio >= 2) return 'Safe';
  if (ratio >= 1.2) return 'Watch';
  return 'Risk';
}

export const useProtocol = () => {
  const { provider, signer, account, isCorrectNetwork } = useWeb3();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [userAccount, setUserAccount] = useState<UserAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<TransactionState>({ type: 'idle', stage: 'idle', message: '' });
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [pendingRewardsRaw, setPendingRewardsRaw] = useState<bigint>(0n);
  const [govBalance, setGovBalance] = useState<string>('0');
  const [govBalanceRaw, setGovBalanceRaw] = useState<bigint>(0n);

  const updateTxState = useCallback((patch: Partial<TransactionState>) => {
    setTxState((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!provider || !isCorrectNetwork) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, provider);
      const priceOracle = new ethers.Contract(CONTRACT_ADDRESSES.PRICE_ORACLE, PRICE_ORACLE_ABI, provider);
      const assetAddresses: string[] = await lendingPool.getAssetList();

      const fetchedAssets = await Promise.all(assetAddresses.map(async (assetAddress) => {
        const token = new ethers.Contract(assetAddress, ERC20_ABI, provider);
        const [name, symbol, decimals, config, rawData, rawLiquidity, rawReceiverBalance] = await Promise.all([
          token.name(),
          token.symbol(),
          token.decimals(),
          lendingPool.assetConfigs(assetAddress),
          lendingPool.getAssetData(assetAddress),
          lendingPool.getAvailableLiquidity(assetAddress),
          token.balanceOf(CONTRACT_ADDRESSES.FLASH_LOAN_RECEIVER),
        ]);

        // Bonus 3: Fetch oracle source data
        let oracle: OracleSourceData | undefined;
        try {
          const [priceSource, oraclePrice] = await Promise.all([
            priceOracle.getPriceSource(assetAddress),
            priceOracle.getAssetPrice(assetAddress),
          ]);
          oracle = {
            priceFeed: priceSource[0] as string,
            manualPrice: priceSource[1] as bigint,
            useChainlink: priceSource[2] as boolean,
            oraclePrice: oraclePrice as bigint,
          };
        } catch {
          // Oracle data not available, skip
        }

        let walletBalance = 0n;
        let userDepositBalance = 0n;
        let userBorrowBalance = 0n;
        let usingAsCollateral = false;

        if (account) {
          const [rawWalletBalance, rawUserDepositBalance, rawUserBorrowBalance, userAssetData] = await Promise.all([
            token.balanceOf(account),
            lendingPool.getUserDepositBalance(account, assetAddress),
            lendingPool.getUserBorrowBalance(account, assetAddress),
            lendingPool.userAssetData(account, assetAddress),
          ]);

          walletBalance = rawWalletBalance;
          userDepositBalance = rawUserDepositBalance;
          userBorrowBalance = rawUserBorrowBalance;
          usingAsCollateral = Boolean(userAssetData.usingAsCollateral);
        }

        const totalDeposits = rawData.totalDeposits as bigint;
        const totalBorrows = rawData.totalBorrows as bigint;
        // Use oracle price (actual price used by contract) instead of stale assetConfigs.price
        const priceRaw = oracle?.oraclePrice ?? config.price as bigint;
        const price = Number(ethers.formatUnits(priceRaw, 18));
        const utilization = totalDeposits === 0n ? 0 : Number((totalBorrows * 10000n) / totalDeposits) / 100;

        return {
          address: assetAddress,
          name: ASSET_METADATA[assetAddress.toLowerCase()]?.name || name,
          symbol: ASSET_METADATA[assetAddress.toLowerCase()]?.symbol || symbol,
          color: ASSET_METADATA[assetAddress.toLowerCase()]?.color || '#7dd3fc',
          decimals: Number(decimals),
          totalDeposit: formatAssetAmount(totalDeposits, Number(decimals)),
          totalBorrow: formatAssetAmount(totalBorrows, Number(decimals)),
          availableLiquidity: formatAssetAmount(rawLiquidity as bigint, Number(decimals)),
          walletBalance: formatAssetAmount(walletBalance, Number(decimals)),
          userDepositBalance: formatAssetAmount(userDepositBalance, Number(decimals)),
          userBorrowBalance: formatAssetAmount(userBorrowBalance, Number(decimals)),
          usingAsCollateral,
          totalDepositRaw: totalDeposits,
          totalBorrowRaw: totalBorrows,
          availableLiquidityRaw: rawLiquidity as bigint,
          walletBalanceRaw: walletBalance,
          userDepositBalanceRaw: userDepositBalance,
          userBorrowBalanceRaw: userBorrowBalance,
          priceRaw,
          supplyApyRaw: rawData.supplyRate as bigint,
          borrowApyRaw: rawData.borrowRate as bigint,
          utilizationBps: Math.round(utilization * 100),
          ltv: Number(config.ltv) / 100,
          liquidationThreshold: Number(config.liquidationThreshold) / 100,
          supplyApy: Number(ethers.formatUnits(rawData.supplyRate as bigint, 18)),
          borrowApy: Number(ethers.formatUnits(rawData.borrowRate as bigint, 18)),
          utilization,
          price,
          oracle,
          receiverBalance: formatAssetAmount(rawReceiverBalance as bigint, Number(decimals)),
        } satisfies AssetData;
      }));

      setAssets(fetchedAssets);

      if (account) {
        const rawUserData = await lendingPool.getUserAccountData(account);
        const totalCollateralRaw = rawUserData.totalCollateralValue as bigint;
        const totalDebtRaw = rawUserData.totalBorrowValue as bigint;
        const availableBorrowsRaw = rawUserData.availableBorrowValue as bigint;
        const healthFactorRaw = rawUserData.healthFactor as bigint;
        const healthFactorDisplay = formatHealthFactorDisplay(healthFactorRaw);

        setUserAccount({
          totalCollateral: formatUsdValue(totalCollateralRaw),
          totalCollateralRaw,
          totalDebt: formatUsdValue(totalDebtRaw),
          totalDebtRaw,
          availableBorrows: formatUsdValue(availableBorrowsRaw),
          availableBorrowsRaw,
          healthFactor: healthFactorDisplay,
          healthFactorRaw,
          healthFactorRatio: Number.parseFloat(healthFactorDisplay),
          healthFactorLabel: classifyHealthFactor(healthFactorRaw),
        });

        // Bonus 4: Fetch pending rewards and GOV balance
        try {
          const [rawPending, rawGovBal] = await Promise.all([
            lendingPool.getPendingRewards(account),
            new ethers.Contract(CONTRACT_ADDRESSES.GOV_TOKEN, ERC20_ABI, provider).balanceOf(account),
          ]);
          setPendingRewardsRaw(rawPending as bigint);
          setPendingRewards(ethers.formatUnits(rawPending as bigint, 18));
          setGovBalanceRaw(rawGovBal as bigint);
          setGovBalance(ethers.formatUnits(rawGovBal as bigint, 18));
        } catch {
          setPendingRewards('0');
          setGovBalance('0');
        }
      } else {
        setUserAccount(null);
        setPendingRewards('0');
        setGovBalance('0');
      }
    } catch (error) {
      console.error('Error fetching protocol data:', error);
    } finally {
      setLoading(false);
    }
  }, [account, isCorrectNetwork, provider]);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 15000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  const runTransaction = useCallback(async (
    message: string,
    action: (context: {
      signer: ethers.JsonRpcSigner;
      account: string;
      updateTxState: (patch: Partial<TransactionState>) => void;
    }) => Promise<void>
  ) => {
    if (!signer || !account) {
      throw new Error('Connect a wallet first');
    }

    setTxState({ type: 'pending', stage: 'submitting', message });

    try {
      await action({ signer, account, updateTxState });
      setTxState({ type: 'success', stage: 'success', message: 'Transaction confirmed' });
      await fetchData();
      window.setTimeout(() => {
        setTxState((current) => (current.type === 'success'
          ? { type: 'idle', stage: 'idle', message: '' }
          : current));
      }, 3000);
    } catch (error) {
      const friendlyMessage = describeProtocolError(error);
      setTxState({ type: 'error', stage: 'error', message: friendlyMessage });
      throw error;
    }
  }, [account, fetchData, signer, updateTxState]);

  const supply = useCallback(async (assetAddress: string, amount: string) => {
    await runTransaction('Supplying asset...', async ({ signer: connectedSigner, account: owner, updateTxState: patchTxState }) => {
      const token = new ethers.Contract(assetAddress, ERC20_ABI, connectedSigner);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      const decimals = await token.decimals();
      const parsedAmount = ethers.parseUnits(amount, Number(decimals));
      const symbol = await token.symbol();
      const allowance = await token.allowance(owner, CONTRACT_ADDRESSES.LENDING_POOL);

      if (allowance < parsedAmount) {
        patchTxState({
          stage: 'approving',
          message: `Approving ${symbol} for the pool...`,
          details: `Spending ${amount} ${symbol} on your behalf`,
        });
        const approveTx = await token.approve(CONTRACT_ADDRESSES.LENDING_POOL, parsedAmount);
        patchTxState({
          stage: 'confirming',
          message: `Waiting for ${symbol} approval confirmation...`,
          txHash: approveTx.hash,
        });
        await approveTx.wait();
      }

      patchTxState({
        stage: 'submitting',
        message: `Submitting supply transaction for ${symbol}...`,
        details: `${amount} ${symbol}`,
      });
      const tx = await lendingPool.deposit(assetAddress, parsedAmount);
      patchTxState({
        stage: 'confirming',
        message: `Waiting for supply confirmation...`,
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  const borrow = useCallback(async (assetAddress: string, amount: string) => {
    await runTransaction('Borrowing asset...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const token = new ethers.Contract(assetAddress, ERC20_ABI, connectedSigner);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      const decimals = await token.decimals();
      const parsedAmount = ethers.parseUnits(amount, Number(decimals));
      const symbol = await token.symbol();
      patchTxState({
        stage: 'submitting',
        message: `Submitting borrow transaction for ${symbol}...`,
        details: `${amount} ${symbol}`,
      });
      const tx = await lendingPool.borrow(assetAddress, parsedAmount);
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for borrow confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  const repay = useCallback(async (assetAddress: string, amount: string) => {
    await runTransaction('Repaying debt...', async ({ signer: connectedSigner, account: owner, updateTxState: patchTxState }) => {
      const token = new ethers.Contract(assetAddress, ERC20_ABI, connectedSigner);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      const decimals = await token.decimals();
      const parsedAmount = ethers.parseUnits(amount, Number(decimals));
      const symbol = await token.symbol();
      const allowance = await token.allowance(owner, CONTRACT_ADDRESSES.LENDING_POOL);

      if (allowance < parsedAmount) {
        patchTxState({
          stage: 'approving',
          message: `Approving ${symbol} for repayment...`,
          details: `Allowing the pool to pull ${amount} ${symbol}`,
        });
        const approveTx = await token.approve(CONTRACT_ADDRESSES.LENDING_POOL, parsedAmount);
        patchTxState({
          stage: 'confirming',
          message: `Waiting for ${symbol} approval confirmation...`,
          txHash: approveTx.hash,
        });
        await approveTx.wait();
      }

      patchTxState({
        stage: 'submitting',
        message: `Submitting repayment transaction for ${symbol}...`,
        details: `${amount} ${symbol}`,
      });
      const tx = await lendingPool.repay(assetAddress, parsedAmount);
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for repayment confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  const withdraw = useCallback(async (assetAddress: string, amount: string) => {
    await runTransaction('Withdrawing asset...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const token = new ethers.Contract(assetAddress, ERC20_ABI, connectedSigner);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      const decimals = await token.decimals();
      const parsedAmount = ethers.parseUnits(amount, Number(decimals));
      const symbol = await token.symbol();
      patchTxState({
        stage: 'submitting',
        message: `Submitting withdrawal transaction for ${symbol}...`,
        details: `${amount} ${symbol}`,
      });
      const tx = await lendingPool.withdraw(assetAddress, parsedAmount);
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for withdrawal confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  const toggleCollateral = useCallback(async (assetAddress: string, enabled: boolean) => {
    await runTransaction(enabled ? 'Enabling collateral...' : 'Disabling collateral...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      patchTxState({
        stage: 'submitting',
        message: `${enabled ? 'Enabling' : 'Disabling'} collateral...`,
      });
      const tx = await lendingPool.setCollateralEnabled(assetAddress, enabled);
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for collateral setting confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  // Bonus 1: Liquidation
  const liquidate = useCallback(async (
    borrower: string,
    debtAssetAddress: string,
    repayAmount: string,
    collateralAssetAddress: string,
  ) => {
    await runTransaction('Liquidating position...', async ({ signer: connectedSigner, account: owner, updateTxState: patchTxState }) => {
      const debtToken = new ethers.Contract(debtAssetAddress, ERC20_ABI, connectedSigner);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      const decimals = await debtToken.decimals();
      const parsedAmount = ethers.parseUnits(repayAmount, Number(decimals));
      const symbol = await debtToken.symbol();
      const allowance = await debtToken.allowance(owner, CONTRACT_ADDRESSES.LENDING_POOL);

      if (allowance < parsedAmount) {
        patchTxState({
          stage: 'approving',
          message: `Approving ${symbol} for liquidation...`,
          details: `Allowing the pool to pull ${repayAmount} ${symbol}`,
        });
        const approveTx = await debtToken.approve(CONTRACT_ADDRESSES.LENDING_POOL, parsedAmount);
        patchTxState({
          stage: 'confirming',
          message: `Waiting for ${symbol} approval confirmation...`,
          txHash: approveTx.hash,
        });
        await approveTx.wait();
      }

      patchTxState({
        stage: 'submitting',
        message: `Submitting liquidation for borrower ${borrower.slice(0, 8)}...`,
        details: `Repaying ${repayAmount} ${symbol}`,
      });
      const tx = await lendingPool.liquidate(borrower, debtAssetAddress, parsedAmount, collateralAssetAddress);
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for liquidation confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  // Bonus 4: Claim Rewards
  const claimRewards = useCallback(async () => {
    await runTransaction('Claiming GOV rewards...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_POOL_ABI, connectedSigner);
      patchTxState({
        stage: 'submitting',
        message: 'Submitting claim rewards transaction...',
      });
      const tx = await lendingPool.claimRewards();
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for rewards claim confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  const setAssetPrice = useCallback(async (assetAddress: string, price: string) => {
    await runTransaction('Setting asset price...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES.PRICE_ORACLE, PRICE_ORACLE_ABI, connectedSigner);
      const priceWei = ethers.parseEther(price);
      patchTxState({ stage: 'submitting', message: 'Submitting price update...' });
      const tx = await oracle.setAssetPrice(assetAddress, priceWei);
      patchTxState({ stage: 'confirming', message: 'Waiting for price update confirmation...', txHash: tx.hash });
      await tx.wait();
    });
  }, [runTransaction]);

  const setUseChainlink = useCallback(async (assetAddress: string, enabled: boolean) => {
    await runTransaction(enabled ? 'Enabling Chainlink...' : 'Switching to manual price...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES.PRICE_ORACLE, PRICE_ORACLE_ABI, connectedSigner);
      patchTxState({ stage: 'submitting', message: 'Submitting oracle config...' });
      const tx = await oracle.setUseChainlink(assetAddress, enabled);
      patchTxState({ stage: 'confirming', message: 'Waiting for oracle config confirmation...', txHash: tx.hash });
      await tx.wait();
    });
  }, [runTransaction]);

  // Flash Loan via Receiver contract
  const executeFlashLoan = useCallback(async (assetAddress: string, amount: string) => {
    await runTransaction('Executing flash loan...', async ({ signer: connectedSigner, updateTxState: patchTxState }) => {
      const token = new ethers.Contract(assetAddress, ERC20_ABI, connectedSigner);
      const receiver = new ethers.Contract(CONTRACT_ADDRESSES.FLASH_LOAN_RECEIVER, FLASH_LOAN_RECEIVER_ABI, connectedSigner);
      const decimals = await token.decimals();
      const parsedAmount = ethers.parseUnits(amount, Number(decimals));
      const symbol = await token.symbol();
      patchTxState({
        stage: 'submitting',
        message: `Submitting flash loan for ${symbol}...`,
        details: `${amount} ${symbol} (fee: 0.09%)`,
      });
      // target=address(0), callData=0x — simple borrow-and-return, no arbitrage target
      const tx = await receiver.startFlashLoan(assetAddress, parsedAmount, ethers.ZeroAddress, '0x');
      patchTxState({
        stage: 'confirming',
        message: 'Waiting for flash loan confirmation...',
        txHash: tx.hash,
      });
      await tx.wait();
    });
  }, [runTransaction]);

  return {
    assets,
    userAccount,
    loading,
    txState,
    refresh: fetchData,
    supply,
    borrow,
    repay,
    withdraw,
    toggleCollateral,
    liquidate,
    claimRewards,
    pendingRewards,
    pendingRewardsRaw,
    govBalance,
    govBalanceRaw,
    setAssetPrice,
    setUseChainlink,
    executeFlashLoan,
  };
};
