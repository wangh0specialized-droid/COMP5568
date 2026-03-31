import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { LOCAL_RPC_URL, TARGET_CHAIN_HEX, TARGET_CHAIN_ID } from '../contracts/constants';

declare global {
  interface Window {
    ethereum?: {
      on?: (event: string, handler: (...args: any[]) => void) => void;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

type AppProvider = ethers.BrowserProvider | ethers.JsonRpcProvider;
type AppSigner = ethers.JsonRpcSigner;
type ConnectionMode = 'metamask' | 'dev' | null;

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  provider: AppProvider | null;
  signer: AppSigner | null;
  connectionMode: ConnectionMode;
  connect: () => Promise<void>;
  connectDev: () => Promise<void>;
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

async function connectLocalDev(): Promise<{
  account: string;
  chainId: number;
  provider: ethers.JsonRpcProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const rpcProvider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
  const signer = await rpcProvider.getSigner(0);
  const account = await signer.getAddress();
  const network = await rpcProvider.getNetwork();

  return {
    account,
    chainId: Number(network.chainId),
    provider: rpcProvider,
    signer,
  };
}

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<AppProvider | null>(null);
  const [signer, setSigner] = useState<AppSigner | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(null);

  const hasInjectedWallet = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  const applyConnection = (
    nextAccount: string,
    nextChainId: number,
    nextProvider: AppProvider,
    nextSigner: AppSigner,
    mode: ConnectionMode
  ) => {
    setAccount(nextAccount);
    setChainId(nextChainId);
    setProvider(nextProvider);
    setSigner(nextSigner);
    setConnectionMode(mode);
  };

  const connect = async () => {
    if (!hasInjectedWallet) {
      await connectDev();
      return;
    }

    try {
      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer, 'metamask');
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  };

  const connectDev = async () => {
    try {
      const result = await connectLocalDev();
      applyConnection(result.account, result.chainId, result.provider, result.signer, 'dev');
    } catch (error) {
      console.error('Local dev connection error:', error);
      throw error;
    }
  };

  const switchNetwork = async () => {
    if (connectionMode === 'dev') {
      return;
    }

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
            chainName: 'Hardhat Localhost',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [LOCAL_RPC_URL],
          }],
        });
      } else {
        throw error;
      }
    }

    const result = await connectMetaMask();
    applyConnection(result.account, result.chainId, result.provider, result.signer, 'metamask');
  };

  useEffect(() => {
    if (!window.ethereum?.on) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      if (connectionMode !== 'metamask') {
        return;
      }

      if (!accounts.length) {
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setChainId(null);
        setConnectionMode(null);
        return;
      }

      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer, 'metamask');
    };

    const handleChainChanged = async () => {
      if (connectionMode !== 'metamask') {
        return;
      }

      const result = await connectMetaMask();
      applyConnection(result.account, result.chainId, result.provider, result.signer, 'metamask');
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  }, [connectionMode]);

  const value = useMemo(() => ({
    account,
    chainId,
    provider,
    signer,
    connectionMode,
    connect,
    connectDev,
    isCorrectNetwork: chainId === TARGET_CHAIN_ID,
    hasInjectedWallet,
    switchNetwork,
  }), [account, chainId, provider, signer, connectionMode, hasInjectedWallet]);

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
