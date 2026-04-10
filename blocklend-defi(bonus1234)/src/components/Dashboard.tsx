import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  Database,
  Gift,
  Hammer,
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
import {
  InfoMini, InfoRow, MetricCard, SidebarItem, HeroCard, SupportTag, ActionStep,
  MarketsView, PortfolioView, LiquidationView, AssetDetailsView,
} from './Views';

type AppView = 'overview' | 'markets' | 'portfolio' | 'liquidation';

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: ReactNode; description: string }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, description: 'Home dashboard' },
  { id: 'markets', label: 'Markets', icon: <Coins size={18} />, description: 'All assets' },
  { id: 'portfolio', label: 'Portfolio', icon: <Shield size={18} />, description: 'Your positions' },
  { id: 'liquidation', label: 'Liquidation', icon: <Hammer size={18} />, description: 'Liquidate positions' },
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
  if (view === 'liquidation') return 'liquidation';
  return 'portfolio';
}

export default function Dashboard() {
  const {
    account,
    connect,
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
    liquidate,
    claimRewards,
    pendingRewards,
    govBalance,
    setAssetPrice,
    setUseChainlink,
    executeFlashLoan,
  } = useProtocol();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => assets.find((asset: AssetData) => asset.address === selectedAssetAddress) ?? null,
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
              Switch to Sepolia Testnet (Chain ID 11155111) to use the deployed contracts.
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
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">DeFi Lending Dashboard</h1>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="success" className="hidden sm:inline-flex">
              MetaMask
            </Badge>
            <Badge variant="success" className="hidden sm:inline-flex">Sepolia</Badge>
            <Button variant="outline" className="font-mono hidden sm:inline-flex">
              {shortenAddress(account)}
            </Button>
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((value: boolean) => !value)}
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
              <InfoMini label="Mode" value="MetaMask" />
              <InfoMini label="Address" value={shortenAddress(account)} />
              <InfoMini label="Network" value="Sepolia Testnet" />
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
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txState.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-300 mt-2 font-mono break-all hover:underline block"
                  >
                    {txState.txHash} ↗
                  </a>
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

            {/* Bonus 4: GOV Rewards Sidebar Card */}
            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">GOV Rewards</div>
              <div className="space-y-2">
                <InfoMini label="Pending" value={`${formatNumber(pendingRewards, 4)} GOV`} />
                <InfoMini label="Balance" value={`${formatNumber(govBalance, 4)} GOV`} />
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={claimRewards}
                disabled={txState.type === 'pending' || Number(pendingRewards) <= 0}
              >
                <Gift size={14} className="mr-2" />
                Claim Rewards
              </Button>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Wallet</div>
              <div className="space-y-2">
                <InfoMini label="Mode" value="MetaMask" />
                <InfoMini label="Address" value={shortenAddress(account)} />
                <InfoMini label="Network" value="Sepolia Testnet" />
              </div>
            </GlassCard>
          </aside>

          <main className="min-w-0 space-y-6">
            {selectedAsset ? (
              <AssetDetailsView
                asset={selectedAsset}
                assets={assets}
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
                pendingRewards={pendingRewards}
                govBalance={govBalance}
                onClaimRewards={claimRewards}
                txPending={txState.type === 'pending'}
                onOpenAsset={(assetAddress) => openAsset(assetAddress, 'overview')}
                onGoMarkets={() => navigate('markets')}
                onGoPortfolio={() => navigate('portfolio')}
                onGoLiquidation={() => navigate('liquidation')}
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
                pendingRewards={pendingRewards}
                govBalance={govBalance}
                onClaimRewards={claimRewards}
                txPending={txState.type === 'pending'}
                onOpenAsset={(assetAddress) => openAsset(assetAddress, 'portfolio')}
              />
            ) : activeView === 'liquidation' ? (
              <LiquidationView
                assets={assets}
                onLiquidate={liquidate}
                onSetAssetPrice={setAssetPrice}
                onSetUseChainlink={setUseChainlink}
                onFlashLoan={executeFlashLoan}
                txPending={txState.type === 'pending'}
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
}: {
  hasInjectedWallet: boolean;
  onConnect: () => Promise<void>;
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
                A DeFi lending protocol dashboard with a real on-chain workflow.
              </h1>
              <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
                This frontend is built for the Sepolia testnet deployment. It exposes asset markets, portfolio health, and the full supply / borrow / repay / withdraw flow.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={onConnect} className="min-w-[180px]">
                {hasInjectedWallet ? 'Connect MetaMask' : 'Install MetaMask'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <HeroCard title="Overview" text="One place for collateral, debt, and borrow capacity." />
              <HeroCard title="Markets" text="Inspect USDC and WETH supply / borrow conditions." />
              <HeroCard title="Bonus Features" text="Liquidation, Flash Loans, Oracle, and GOV Rewards." />
            </div>
          </GlassCard>
          <div className="space-y-6">
            <GlassCard elevated className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Connected Modes</div>
              <ol className="space-y-3 text-sm text-on-surface-variant">
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">1.</span>Connect with MetaMask on Sepolia Testnet.</li>
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">2.</span>Use Overview, Markets, Portfolio, and Liquidation to navigate.</li>
                <li className="flex gap-3"><span className="text-sky-300 font-semibold">3.</span>Claim GOV token rewards from the sidebar.</li>
              </ol>
            </GlassCard>
            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Supported flows</div>
              <div className="grid grid-cols-2 gap-3">
                <SupportTag>Supply</SupportTag>
                <SupportTag>Borrow</SupportTag>
                <SupportTag>Repay</SupportTag>
                <SupportTag>Withdraw</SupportTag>
                <SupportTag>Liquidation</SupportTag>
                <SupportTag>Flash Loan</SupportTag>
                <SupportTag>Oracle</SupportTag>
                <SupportTag>GOV Rewards</SupportTag>
              </div>
            </GlassCard>
            <GlassCard className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Note</div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Switch MetaMask to Sepolia Testnet. Make sure you have Sepolia ETH for gas fees.
              </p>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewView({
  assets, userAccount, loading, pendingRewards, govBalance, onClaimRewards, txPending, onOpenAsset, onGoMarkets, onGoPortfolio, onGoLiquidation,
}: {
  assets: AssetData[]; userAccount: UserAccountData | null; loading: boolean;
  pendingRewards: string; govBalance: string; onClaimRewards: () => Promise<void>; txPending: boolean;
  onOpenAsset: (a: string) => void; onGoMarkets: () => void; onGoPortfolio: () => void; onGoLiquidation: () => void;
}) {
  const health = healthVariant(userAccount?.healthFactor);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard icon={<Shield size={18} />} label="Total Collateral" value={formatCurrency(userAccount?.totalCollateral || 0)} note="Across all collateral-enabled assets" />
        <MetricCard icon={<Coins size={18} />} label="Total Debt" value={formatCurrency(userAccount?.totalDebt || 0)} note="Current borrowed value" />
        <MetricCard icon={<Database size={18} />} label="Available Borrow" value={formatCurrency(userAccount?.availableBorrows || 0)} note="Additional value you can borrow" />
        <MetricCard icon={<AlertTriangle size={18} />} label="Health Factor" value={formatHealthDisplay(userAccount)} note="Must stay above 1.00" badge={<Badge variant={health.variant}>{health.label}</Badge>} />
      </section>

      {/* Bonus 4: GOV Rewards Card */}
      <GlassCard elevated className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Governance Token Rewards</div>
            <h2 className="text-xl font-bold text-white">GOV Token Mining</h2>
          </div>
          <Badge variant="info">Bonus 4</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">Pending Rewards</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{formatNumber(pendingRewards, 6)} GOV</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">GOV Balance</div>
            <div className="text-2xl font-bold text-white mt-1">{formatNumber(govBalance, 4)} GOV</div>
          </div>
          <div className="flex items-center">
            <Button variant="primary" className="w-full py-3" onClick={onClaimRewards} disabled={txPending || Number(pendingRewards) <= 0}>
              <Gift size={16} className="mr-2" /> Claim Rewards
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <GlassCard elevated className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Protocol Markets</div>
              <h2 className="text-xl font-bold text-white">Assets on the current deployment</h2>
            </div>
            {loading && <Badge variant="info">Refreshing</Badge>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <button key={asset.address} onClick={() => onOpenAsset(asset.address)} className="text-left rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 transition-colors p-4 group">
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
              <ActionStep index="01" title="Markets" text="Open USDC or WETH to inspect balances." action="Go to markets" onClick={onGoMarkets} />
              <ActionStep index="02" title="Portfolio" text="Check positions and collateral status." action="Go to portfolio" onClick={onGoPortfolio} />
              <ActionStep index="03" title="Liquidation" text="Liquidate undercollateralized positions." action="Go to liquidation" onClick={onGoLiquidation} />
            </div>
          </GlassCard>
          <GlassCard className="space-y-4">
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Quick Summary</div>
            <div className="space-y-3">
              <InfoMini label="Assets" value={String(assets.length)} />
              <InfoMini label="Loaded" value={loading ? 'Refreshing' : 'Ready'} />
              <InfoMini label="Status" value="Sepolia on-chain data" />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
