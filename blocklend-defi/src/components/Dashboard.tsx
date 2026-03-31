import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Coins,
  Database,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { AssetData, UserAccountData, useProtocol } from '../hooks/useProtocol';
import { shortenAddress, formatCurrency, formatNumber, formatPercent, cn } from '../lib/utils';
import { Badge, Button, GlassCard } from './UI';

type ActionType = 'supply' | 'borrow' | 'repay' | 'withdraw';
type AppView = 'overview' | 'markets' | 'portfolio';

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: ReactNode; description: string }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, description: 'Home dashboard' },
  { id: 'markets', label: 'Markets', icon: <Coins size={18} />, description: 'All assets' },
  { id: 'portfolio', label: 'Portfolio', icon: <Shield size={18} />, description: 'Your positions' },
];

function healthVariant(healthFactor?: string) {
  if (!healthFactor || healthFactor === 'Infinity') {
    return { label: 'Very Safe', variant: 'success' as const };
  }

  const value = Number(healthFactor);
  if (value >= 2) return { label: 'Safe', variant: 'success' as const };
  if (value >= 1.2) return { label: 'Watch', variant: 'warning' as const };
  return { label: 'At Risk', variant: 'error' as const };
}

function compactNumber(value: string | number) {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatHealthDisplay(userAccount: UserAccountData | null | undefined) {
  if (!userAccount || userAccount.healthFactor === 'Infinity' || userAccount.healthFactorLabel === 'Infinity') {
    return '∞';
  }

  if (userAccount.healthFactorRatio >= 1000) {
    return '>1000';
  }

  return formatNumber(userAccount.healthFactor, 2);
}

function formatViewLabel(view: AppView) {
  if (view === 'overview') return 'overview';
  if (view === 'markets') return 'markets';
  return 'portfolio';
}

export default function Dashboard() {
  const {
    account,
    connectionMode,
    connect,
    connectDev,
    hasInjectedWallet,
    isCorrectNetwork,
    switchNetwork,
  } = useWeb3();
  const {
    assets,
    userAccount,
    loading,
    txState,
    supply,
    borrow,
    repay,
    withdraw,
    toggleCollateral,
  } = useProtocol();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.address === selectedAssetAddress) ?? null,
    [assets, selectedAssetAddress],
  );

  const openAsset = (assetAddress: string, sourceView: AppView = activeView) => {
    setActiveView(sourceView);
    setSelectedAssetAddress(assetAddress);
    setMobileMenuOpen(false);
  };

  const closeAsset = () => {
    setSelectedAssetAddress(null);
  };

  const navigate = (view: AppView) => {
    setActiveView(view);
    setSelectedAssetAddress(null);
    setMobileMenuOpen(false);
  };

  if (!account) {
    return (
      <LandingScreen
        hasInjectedWallet={hasInjectedWallet}
        onConnect={connect}
        onConnectDev={connectDev}
      />
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <GlassCard elevated className="max-w-md w-full text-center space-y-5">
          <AlertTriangle className="mx-auto text-amber-400" size={40} />
          <div>
            <h1 className="text-2xl font-bold text-white">Wrong Network</h1>
            <p className="text-on-surface-variant mt-2">
              Switch to Hardhat Localhost (Chain ID 31337) to use the deployed contracts.
            </p>
          </div>
          <Button onClick={switchNetwork} size="lg" className="w-full">
            Switch Network
          </Button>
        </GlassCard>
      </div>
    );
  }

  const health = healthVariant(userAccount?.healthFactor);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('overview')}
            className="flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-400/10 border border-sky-400/20 text-sky-300 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-sky-300">BlockLend</div>
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Local DeFi Lending Dashboard</h1>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant={connectionMode === 'dev' ? 'info' : 'success'} className="hidden sm:inline-flex">
              {connectionMode === 'dev' ? 'Dev Account' : 'MetaMask'}
            </Badge>
            <Badge variant="success" className="hidden sm:inline-flex">Localhost 31337</Badge>
            <Button variant="outline" className="font-mono hidden sm:inline-flex">
              {shortenAddress(account)}
            </Button>
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        <div className="md:hidden border-t border-white/5 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] border transition-colors',
                  activeView === item.id
                    ? 'bg-sky-400/15 border-sky-400/30 text-sky-200'
                    : 'bg-white/0 border-white/10 text-on-surface-variant',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-sky-300">BlockLend</div>
                <div className="text-lg font-bold text-white">Navigation</div>
              </div>
              <Button variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-3">
              {NAV_ITEMS.map((item) => (
                <div key={item.id}>
                  <SidebarItem
                    active={activeView === item.id}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    onClick={() => navigate(item.id)}
                  />
                </div>
              ))}
            </div>
            <GlassCard className="mt-4 space-y-3">
              <InfoMini label="Mode" value={connectionMode === 'dev' ? 'Dev Account' : 'MetaMask'} />
              <InfoMini label="Address" value={shortenAddress(account)} />
              <InfoMini label="Network" value="Localhost 31337" />
            </GlassCard>
          </div>
        )}

        {txState.type !== 'idle' && (
          <GlassCard
            className={cn(
              'mb-6',
              txState.type === 'error' && 'border border-red-500/30',
              txState.type === 'success' && 'border border-emerald-500/30',
              txState.type === 'pending' && 'border border-sky-500/30',
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Transaction Status</div>
                <div className="text-white font-semibold mt-1">{txState.message}</div>
                {txState.details && (
                  <div className="text-sm text-on-surface-variant mt-1">{txState.details}</div>
                )}
                {txState.txHash && (
                  <div className="text-xs text-sky-300 mt-2 font-mono break-all">{txState.txHash}</div>
                )}
              </div>
              <Badge
                variant={
                  txState.type === 'error'
                    ? 'error'
                    : txState.type === 'success'
                      ? 'success'
                      : 'info'
                }
              >
                {txState.type}
              </Badge>
            </div>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          <aside className={cn(
            'hidden md:flex md:flex-col gap-4 sticky top-24 h-[calc(100vh-7rem)]',
            mobileMenuOpen && 'md:flex',
          )}>
            <GlassCard elevated className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant mb-3">Navigation</div>
              {NAV_ITEMS.map((item) => (
                <div key={item.id}>
                  <SidebarItem
                    active={activeView === item.id}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    onClick={() => navigate(item.id)}
                  />
                </div>
              ))}
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Wallet</div>
              <div className="space-y-2">
                <InfoMini label="Mode" value={connectionMode === 'dev' ? 'Dev Account' : 'MetaMask'} />
                <InfoMini label="Address" value={shortenAddress(account)} />
                <InfoMini label="Network" value="Localhost 31337" />
              </div>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Workflow</div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Open a market, inspect your balances, and manage supply, borrow, repay, withdraw, and collateral settings from the asset detail view.
              </p>
            </GlassCard>
          </aside>

          <main className="min-w-0 space-y-6">
            {selectedAsset ? (
              <AssetDetailsView
                asset={selectedAsset}
                userHealthFactor={userAccount?.healthFactor}
                onBack={closeAsset}
                onBackLabel={formatViewLabel(activeView)}
                onSupply={supply}
                onBorrow={borrow}
                onRepay={repay}
                onWithdraw={withdraw}
                onToggleCollateral={toggleCollateral}
                txPending={txState.type === 'pending'}
              />
            ) : activeView === 'overview' ? (
              <OverviewView
                assets={assets}
                userAccount={userAccount}
                loading={loading}
                onOpenAsset={(assetAddress) => openAsset(assetAddress, 'overview')}
                onGoMarkets={() => navigate('markets')}
                onGoPortfolio={() => navigate('portfolio')}
              />
            ) : activeView === 'markets' ? (
              <MarketsView
                assets={assets}
                loading={loading}
                onOpenAsset={(assetAddress) => openAsset(assetAddress, 'markets')}
              />
            ) : activeView === 'portfolio' ? (
              <PortfolioView
                assets={assets}
                userAccount={userAccount}
                loading={loading}
                onOpenAsset={(assetAddress) => openAsset(assetAddress, 'portfolio')}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function LandingScreen({
  hasInjectedWallet,
  onConnect,
  onConnectDev,
}: {
  hasInjectedWallet: boolean;
  onConnect: () => Promise<void>;
  onConnectDev: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_30%),radial-gradient(circle_at_right,rgba(200,160,240,0.08),transparent_25%),linear-gradient(to_bottom,rgba(10,14,26,0.96),rgba(10,14,26,0.98))]" />
      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 xl:gap-10 items-start">
          <GlassCard elevated className="space-y-8 overflow-hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-sky-200 w-fit">
              <Sparkles size={14} />
              BlockLend
            </div>
            <div className="space-y-5 max-w-3xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                A local lending protocol dashboard with a real on-chain workflow.
              </h1>
              <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
                This frontend is built for the local Hardhat deployment. It exposes asset markets, portfolio health, and the full supply / borrow / repay / withdraw flow without hiding the real contract behavior.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={onConnect} className="min-w-[180px]">
                {hasInjectedWallet ? 'Connect MetaMask' : 'Use Local Dev Account'}
              </Button>
              {hasInjectedWallet && (
                <Button size="lg" variant="outline" onClick={onConnectDev} className="min-w-[180px]">
                  Use Local Dev Account
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <HeroCard title="Overview" text="One place for collateral, debt, and borrow capacity." />
              <HeroCard title="Markets" text="Inspect USDC and WETH supply / borrow conditions." />
              <HeroCard title="Transactions" text="Supply, borrow, repay, withdraw, and toggle collateral." />
            </div>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard elevated className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Connected Modes</div>
              <ol className="space-y-3 text-sm text-on-surface-variant">
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">1.</span>Connect with MetaMask on Localhost 31337.</li>
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">2.</span>Or connect with the built-in local dev account.</li>
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">3.</span>Use Overview, Markets, and Portfolio to navigate protocol state.</li>
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">4.</span>Use the asset detail page to manage positions.</li>
              </ol>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Supported flows</div>
              <div className="grid grid-cols-2 gap-3">
                <SupportTag>Supply</SupportTag>
                <SupportTag>Borrow</SupportTag>
                <SupportTag>Repay</SupportTag>
                <SupportTag>Withdraw</SupportTag>
                <SupportTag>Collateral</SupportTag>
                <SupportTag>Health</SupportTag>
              </div>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Note</div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                If you use the local dev account, the app connects straight to the local Hardhat JSON-RPC endpoint. If you use MetaMask, switch the wallet to Localhost 31337 first.
              </p>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewView({
  assets,
  userAccount,
  loading,
  onOpenAsset,
  onGoMarkets,
  onGoPortfolio,
}: {
  assets: AssetData[];
  userAccount: UserAccountData | null;
  loading: boolean;
  onOpenAsset: (assetAddress: string) => void;
  onGoMarkets: () => void;
  onGoPortfolio: () => void;
}) {
  const health = healthVariant(userAccount?.healthFactor);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          icon={<Shield size={18} />}
          label="Total Collateral"
          value={formatCurrency(userAccount?.totalCollateral || 0)}
          note="Across all collateral-enabled assets"
        />
        <MetricCard
          icon={<Coins size={18} />}
          label="Total Debt"
          value={formatCurrency(userAccount?.totalDebt || 0)}
          note="Current borrowed value"
        />
        <MetricCard
          icon={<Database size={18} />}
          label="Available Borrow"
          value={formatCurrency(userAccount?.availableBorrows || 0)}
          note="Additional value you can borrow"
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Health Factor"
          value={formatHealthDisplay(userAccount)}
          note="Must stay above 1.00"
          badge={<Badge variant={health.variant}>{health.label}</Badge>}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <GlassCard elevated className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Protocol Markets</div>
              <h2 className="text-xl font-bold text-white">Assets on the current local deployment</h2>
            </div>
            {loading && <Badge variant="info">Refreshing</Badge>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <button
                key={asset.address}
                onClick={() => onOpenAsset(asset.address)}
                className="text-left rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 transition-colors p-4 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold text-lg">{asset.symbol}</div>
                    <div className="text-xs text-on-surface-variant">{asset.name} · {formatCurrency(asset.price)}</div>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant group-hover:text-sky-300" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <InfoMini label="Wallet" value={formatNumber(asset.walletBalance, 4)} />
                  <InfoMini label="Supplied" value={formatNumber(asset.userDepositBalance, 4)} />
                  <InfoMini label="Borrowed" value={formatNumber(asset.userBorrowBalance, 4)} />
                  <InfoMini label="Collateral" value={asset.usingAsCollateral ? 'Enabled' : 'Disabled'} />
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Next Steps</div>
            <div className="space-y-3">
              <ActionStep index="01" title="Markets" text="Open USDC or WETH to inspect balances and open the trade panel." action="Go to markets" onClick={onGoMarkets} />
              <ActionStep index="02" title="Portfolio" text="Check the positions view to verify collateral and borrow status." action="Go to portfolio" onClick={onGoPortfolio} />
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Quick Summary</div>
            <div className="space-y-3">
              <InfoMini label="Assets" value={String(assets.length)} />
              <InfoMini label="Loaded" value={loading ? 'Refreshing' : 'Ready'} />
              <InfoMini label="Status" value="Local on-chain data only" />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function MarketsView({
  assets,
  loading,
  onOpenAsset,
}: {
  assets: AssetData[];
  loading: boolean;
  onOpenAsset: (assetAddress: string) => void;
}) {
  return (
    <GlassCard elevated className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Markets</div>
          <h2 className="text-xl font-bold text-white">All supported assets</h2>
        </div>
        {loading && <Badge variant="info">Refreshing</Badge>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[980px]">
          <thead className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
            <tr>
              <th className="pb-4 pr-4">Asset</th>
              <th className="pb-4 pr-4">Wallet</th>
              <th className="pb-4 pr-4">Supplied</th>
              <th className="pb-4 pr-4">Borrowed</th>
              <th className="pb-4 pr-4">Liquidity</th>
              <th className="pb-4 pr-4">Supply APY</th>
              <th className="pb-4 pr-4">Borrow APY</th>
              <th className="pb-4 pr-4">Collateral</th>
              <th className="pb-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((asset) => (
              <tr key={asset.address} className="align-top">
                <td className="py-4 pr-4">
                  <div>
                    <div className="text-white font-semibold">{asset.symbol}</div>
                    <div className="text-xs text-on-surface-variant">{asset.name} · {formatCurrency(asset.price)}</div>
                  </div>
                </td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.walletBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.userDepositBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.userBorrowBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.availableLiquidity, 4)}</td>
                <td className="py-4 pr-4 text-emerald-400">{formatPercent(asset.supplyApy)}</td>
                <td className="py-4 pr-4 text-amber-400">{formatPercent(asset.borrowApy)}</td>
                <td className="py-4 pr-4">
                  <Badge variant={asset.usingAsCollateral ? 'success' : 'warning'}>
                    {asset.usingAsCollateral ? 'Enabled' : 'Disabled'}
                  </Badge>
                </td>
                <td className="py-4 text-right">
                  <Button variant="outline" size="sm" onClick={() => onOpenAsset(asset.address)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function PortfolioView({
  assets,
  userAccount,
  loading,
  onOpenAsset,
}: {
  assets: AssetData[];
  userAccount: UserAccountData | null;
  loading: boolean;
  onOpenAsset: (assetAddress: string) => void;
}) {
  const positions = assets.filter((asset) => Number(asset.userDepositBalance) > 0 || Number(asset.userBorrowBalance) > 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={<Shield size={18} />}
          label="Collateral"
          value={formatCurrency(userAccount?.totalCollateral || 0)}
          note="Sum of enabled collateral assets"
        />
        <MetricCard
          icon={<Coins size={18} />}
          label="Debt"
          value={formatCurrency(userAccount?.totalDebt || 0)}
          note="Outstanding borrowed value"
        />
        <MetricCard
          icon={<Database size={18} />}
          label="Borrow Room"
          value={formatCurrency(userAccount?.availableBorrows || 0)}
          note="Remaining capacity"
        />
      </section>

      <GlassCard elevated className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Your Positions</div>
            <h2 className="text-xl font-bold text-white">Assets you are using</h2>
          </div>
          {loading && <Badge variant="info">Refreshing</Badge>}
        </div>

        {positions.length ? (
          <div className="space-y-3">
            {positions.map((asset) => (
              <button
                key={asset.address}
                onClick={() => onOpenAsset(asset.address)}
                className="w-full text-left rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 transition-colors p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-white font-semibold">{asset.symbol}</div>
                  <div className="text-xs text-on-surface-variant">
                    Supplied {formatNumber(asset.userDepositBalance, 4)} · Borrowed {formatNumber(asset.userBorrowBalance, 4)}
                  </div>
                </div>
                <Badge variant={asset.usingAsCollateral ? 'success' : 'warning'}>
                  {asset.usingAsCollateral ? 'Collateral On' : 'Collateral Off'}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-on-surface-variant">
            No positions yet. Open an asset market and supply or borrow to create one.
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function AssetDetailsView({
  asset,
  userHealthFactor,
  onBack,
  onBackLabel,
  onSupply,
  onBorrow,
  onRepay,
  onWithdraw,
  onToggleCollateral,
  txPending,
}: {
  asset: AssetData;
  userHealthFactor?: string;
  onBack: () => void;
  onBackLabel: string;
  onSupply: (assetAddress: string, amount: string) => Promise<void>;
  onBorrow: (assetAddress: string, amount: string) => Promise<void>;
  onRepay: (assetAddress: string, amount: string) => Promise<void>;
  onWithdraw: (assetAddress: string, amount: string) => Promise<void>;
  onToggleCollateral: (assetAddress: string, enabled: boolean) => Promise<void>;
  txPending: boolean;
}) {
  const [action, setAction] = useState<ActionType>('supply');
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');

  const maxAmount = useMemo(() => {
    if (action === 'supply' || action === 'repay') return asset.walletBalance;
    if (action === 'borrow') return asset.availableLiquidity;
    return asset.userDepositBalance;
  }, [action, asset.availableLiquidity, asset.userDepositBalance, asset.walletBalance]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      setLocalError('Enter a valid amount.');
      return;
    }

    setLocalError('');

    try {
      if (action === 'supply') await onSupply(asset.address, amount);
      if (action === 'borrow') await onBorrow(asset.address, amount);
      if (action === 'repay') await onRepay(asset.address, amount);
      if (action === 'withdraw') await onWithdraw(asset.address, amount);
      setAmount('');
    } catch {
      // handled by global transaction banner
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to {onBackLabel}
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <GlassCard elevated className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Asset Overview</div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: `${asset.color}22`, border: `1px solid ${asset.color}55` }}
                />
                <div>
                  <h2 className="text-3xl font-bold text-white">{asset.symbol}</h2>
                  <div className="text-sm text-on-surface-variant">{asset.name}</div>
                </div>
              </div>
            </div>
            <Badge variant={asset.usingAsCollateral ? 'success' : 'warning'}>
              {asset.usingAsCollateral ? 'Collateral Enabled' : 'Collateral Disabled'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Wallet Balance" value={`${formatNumber(asset.walletBalance, 4)} ${asset.symbol}`} />
            <InfoRow label="Your Supplied" value={`${formatNumber(asset.userDepositBalance, 4)} ${asset.symbol}`} />
            <InfoRow label="Your Borrowed" value={`${formatNumber(asset.userBorrowBalance, 4)} ${asset.symbol}`} />
            <InfoRow label="Available Liquidity" value={`${formatNumber(asset.availableLiquidity, 4)} ${asset.symbol}`} />
            <InfoRow label="Supply APY" value={formatPercent(asset.supplyApy)} />
            <InfoRow label="Borrow APY" value={formatPercent(asset.borrowApy)} />
            <InfoRow label="Max LTV" value={formatPercent(asset.ltv)} />
            <InfoRow label="Liquidation Threshold" value={formatPercent(asset.liquidationThreshold)} />
          </div>

          <GlassCard className="bg-slate-900/40 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Collateral Setting</div>
                <div className="mt-1 text-white font-semibold">
                  {asset.usingAsCollateral
                    ? 'This asset is supporting your borrow capacity.'
                    : 'This asset is not counted as collateral.'}
                </div>
              </div>
              <Button
                variant={asset.usingAsCollateral ? 'outline' : 'primary'}
                onClick={() => onToggleCollateral(asset.address, !asset.usingAsCollateral)}
                disabled={txPending || Number(asset.userDepositBalance) <= 0}
              >
                {asset.usingAsCollateral ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </GlassCard>
        </GlassCard>

        <GlassCard elevated className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Trade Panel</div>
            <h3 className="mt-2 text-2xl font-bold text-white">Run a live transaction</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Use the tabs to switch between supply, borrow, repay, and withdraw.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['supply', 'borrow', 'repay', 'withdraw'] as ActionType[]).map((item) => (
              <div key={item}>
                <Button
                  variant={action === item ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setAction(item)}
                  className="w-full capitalize"
                >
                  {item}
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Amount</span>
              <button onClick={() => setAmount(maxAmount)} className="hover:text-white transition-colors">
                Max: {formatNumber(maxAmount, 4)}
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-4 text-2xl text-white focus:outline-none focus:border-sky-400/40"
              placeholder="0.00"
            />
            {localError && <div className="text-sm text-red-400">{localError}</div>}
          </div>

          <GlassCard className="bg-sky-400/5 border border-sky-400/10">
            <div className="space-y-3 text-sm">
              <InfoRow
                label="Current Health Factor"
                value={userHealthFactor === 'Infinity' ? '∞' : formatNumber(userHealthFactor || 0, 2)}
              />
              <InfoRow label="Pool Liquidity" value={`${formatNumber(asset.availableLiquidity, 4)} ${asset.symbol}`} />
              <InfoRow label="Your Wallet" value={`${formatNumber(asset.walletBalance, 4)} ${asset.symbol}`} />
            </div>
          </GlassCard>

          <Button onClick={submit} disabled={txPending || !amount} className="w-full py-4 text-base uppercase tracking-[0.2em]">
            {txPending ? 'Processing...' : `${action} ${asset.symbol}`}
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  badge?: ReactNode;
}) {
  return (
    <GlassCard elevated>
      <div className="flex items-center justify-between gap-4">
        <div className="w-10 h-10 rounded-full bg-sky-400/10 text-sky-300 flex items-center justify-center">
          {icon}
        </div>
        {badge}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.25em] text-on-surface-variant">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-2 text-sm text-on-surface-variant">{note}</div>
    </GlassCard>
  );
}

function SidebarItem({
  active,
  label,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border px-4 py-3 text-left transition-colors flex items-center justify-between gap-4',
        active
          ? 'bg-sky-400/10 border-sky-400/20 text-white'
          : 'bg-white/0 border-white/5 text-on-surface-variant hover:border-sky-400/20 hover:bg-sky-400/5 hover:text-white',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', active ? 'bg-sky-400/15 text-sky-300' : 'bg-white/5')}>
          {icon}
        </div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs opacity-70">{description}</div>
        </div>
      </div>
      <ChevronRight size={16} className={active ? 'text-sky-300' : 'text-on-surface-variant'} />
    </button>
  );
}

function HeroCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/35 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-on-surface-variant leading-relaxed">{text}</div>
    </div>
  );
}

function SupportTag({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-on-surface-variant text-center">
      {children}
    </div>
  );
}

function ActionStep({
  index,
  title,
  text,
  action,
  onClick,
}: {
  index: string;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-[0.25em] text-sky-300">{index}</div>
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-on-surface-variant leading-relaxed">{text}</div>
      </div>
      {action && onClick && (
        <Button variant="outline" size="sm" onClick={onClick} className="shrink-0">
          {action}
        </Button>
      )}
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  );
}
