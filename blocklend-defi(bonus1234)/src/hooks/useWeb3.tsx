import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { SEPOLIA_RPC_URL, TARGET_CHAIN_HEX, TARGET_CHAIN_ID } from '../contracts/constants';

declare global {
  interface Window {
    ethereum?: {
      on?: (event: string, handler: (...args: any[]) => void) => void;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

type AppProvider = ethers.BrowserProvider;
type AppSigner = ethers.JsonRpcSigner;

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  provider: AppProvider | null;
  signer: AppSigner | null;
  connect: () => Promise<void>;
  isCorrectNetwork: boolean;
  hasInjectedWallet: boolean;
  switchNetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWeb3 must be used within a Web3Provider');
  return context;
};

async function connectMetaMask(): Promise<{
  account: string;
  chainId: number;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  if (!window.ethereum?.request) {
    throw new Error('MetaMask is not available');
  }

  const browserProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
  const accounts = await browserProvider.send('eth_requestAccounts', []);
  const network = await browserProvider.getNetwork();
  const signer = await browserProvider.getSigner();

  return {
    account: accounts[0],
    chainId: Number(network.chainId),
    provider: browserProvider,
    signer,
  };
}

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<AppProvider | null>(null);
  const [signer, setSigner] = useState<AppSigner | null>(null);
  const hasInjectedWallet = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  const applyConnection = (
    nextAccount: string,
    nextChainId: number,
    nextProvider: AppProvider,
    nextSigner: AppSigner,
  ) => {
    setAccount(nextAccount);
    setChainId(nextChainId);
    setProvider(nextProvider);
    setSigner(nextSigner);
  };

  const connect = async () => {
    if (!hasInjectedWallet) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use BlockLend.');
    }

    try {
      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer);
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum?.request) {
      throw new Error('MetaMask is not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_HEX }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: TARGET_CHAIN_HEX,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [SEPOLIA_RPC_URL],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } else {
        throw error;
      }
    }

    const result = await connectMetaMask();
    applyConnection(result.account, result.chainId, result.provider, result.signer);
  };

  useEffect(() => {
    if (!window.ethereum?.on) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      if (!accounts.length) {
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setChainId(null);
        return;
      }

      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer);
    };

    const handleChainChanged = async () => {
      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  }, []);

  const value = useMemo(() => ({
    account,
    chainId,
    provider,
    signer,
    connect,
    isCorrectNetwork: chainId === TARGET_CHAIN_ID,
    hasInjectedWallet,
    switchNetwork,
  }), [account, chainId, provider, signer, hasInjectedWallet]);

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
