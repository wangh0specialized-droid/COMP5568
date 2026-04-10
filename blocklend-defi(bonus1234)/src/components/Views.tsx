import { type ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, Coins, Database, Gift, Hammer, Settings, Shield, Zap } from 'lucide-react';
import { ethers } from 'ethers';
import { AssetData, UserAccountData } from '../hooks/useProtocol';
import { CONTRACT_ADDRESSES } from '../contracts/constants';
import { formatCurrency, formatNumber, formatPercent, cn, shortenAddress } from '../lib/utils';
import { Badge, Button, GlassCard } from './UI';

// ─── Shared small components ───

export function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  );
}

export function MetricCard({ icon, label, value, note, badge }: { icon: ReactNode; label: string; value: string; note: string; badge?: ReactNode }) {
  return (
    <GlassCard elevated>
      <div className="flex items-center justify-between gap-4">
        <div className="w-10 h-10 rounded-full bg-sky-400/10 text-sky-300 flex items-center justify-center">{icon}</div>
        {badge}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.25em] text-on-surface-variant">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-2 text-sm text-on-surface-variant">{note}</div>
    </GlassCard>
  );
}

export function SidebarItem({ active, label, description, icon, onClick }: { active: boolean; label: string; description: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'w-full rounded-2xl border px-4 py-3 text-left transition-colors flex items-center justify-between gap-4',
      active ? 'bg-sky-400/10 border-sky-400/20 text-white' : 'bg-white/0 border-white/5 text-on-surface-variant hover:border-sky-400/20 hover:bg-sky-400/5 hover:text-white',
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', active ? 'bg-sky-400/15 text-sky-300' : 'bg-white/5')}>{icon}</div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs opacity-70">{description}</div>
        </div>
      </div>
      <ChevronRight size={16} className={active ? 'text-sky-300' : 'text-on-surface-variant'} />
    </button>
  );
}

export function HeroCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/35 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-on-surface-variant leading-relaxed">{text}</div>
    </div>
  );
}

export function SupportTag({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-on-surface-variant text-center">{children}</div>
  );
}

export function ActionStep({ index, title, text, action, onClick }: { index: string; title: string; text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-[0.25em] text-sky-300">{index}</div>
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-on-surface-variant leading-relaxed">{text}</div>
      </div>
      {action && onClick && <Button variant="outline" size="sm" onClick={onClick} className="shrink-0">{action}</Button>}
    </div>
  );
}

// ─── Markets View ───

export function MarketsView({ assets, loading, onOpenAsset }: { assets: AssetData[]; loading: boolean; onOpenAsset: (a: string) => void }) {
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
        <table className="w-full text-left min-w-[900px]">
          <thead className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
            <tr>
              <th className="pb-4 pr-4">Asset</th>
              <th className="pb-4 pr-4">Wallet</th>
              <th className="pb-4 pr-4">Supplied</th>
              <th className="pb-4 pr-4">Borrowed</th>
              <th className="pb-4 pr-4">Liquidity</th>
              <th className="pb-4 pr-4">Supply APY</th>
              <th className="pb-4 pr-4">Borrow APY</th>
              <th className="pb-4 pr-4">Oracle</th>
              <th className="pb-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((asset) => (
              <tr key={asset.address} className="align-top">
                <td className="py-4 pr-4">
                  <div className="text-white font-semibold">{asset.symbol}</div>
                  <div className="text-xs text-on-surface-variant">{asset.name} · {formatCurrency(asset.price)}</div>
                </td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.walletBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.userDepositBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.userBorrowBalance, 4)}</td>
                <td className="py-4 pr-4 text-white">{formatNumber(asset.availableLiquidity, 4)}</td>
                <td className="py-4 pr-4 text-emerald-400">{formatPercent(asset.supplyApy)}</td>
                <td className="py-4 pr-4 text-amber-400">{formatPercent(asset.borrowApy)}</td>
                <td className="py-4 pr-4">
                  <Badge variant={asset.oracle?.useChainlink ? 'success' : 'info'}>
                    {asset.oracle?.useChainlink ? 'Chainlink' : 'Manual'}
                  </Badge>
                </td>
                <td className="py-4 text-right">
                  <Button variant="outline" size="sm" onClick={() => onOpenAsset(asset.address)}>Open</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ─── Portfolio View ───

export function PortfolioView({ assets, userAccount, loading, pendingRewards, govBalance, onClaimRewards, txPending, onOpenAsset }: {
  assets: AssetData[]; userAccount: UserAccountData | null; loading: boolean;
  pendingRewards: string; govBalance: string; onClaimRewards: () => Promise<void>; txPending: boolean;
  onOpenAsset: (a: string) => void;
}) {
  const positions = assets.filter((a) => Number(a.userDepositBalance) > 0 || Number(a.userBorrowBalance) > 0);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard icon={<Shield size={18} />} label="Collateral" value={formatCurrency(userAccount?.totalCollateral || 0)} note="Enabled collateral" />
        <MetricCard icon={<Coins size={18} />} label="Debt" value={formatCurrency(userAccount?.totalDebt || 0)} note="Outstanding borrows" />
        <MetricCard icon={<Database size={18} />} label="Borrow Room" value={formatCurrency(userAccount?.availableBorrows || 0)} note="Remaining capacity" />
        <MetricCard icon={<Gift size={18} />} label="Pending GOV" value={formatNumber(pendingRewards, 4)} note="Claimable rewards" />
      </section>
      <GlassCard elevated className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Your Positions</div>
            <h2 className="text-xl font-bold text-white">Assets you are using</h2>
          </div>
          <div className="flex gap-2">
            {loading && <Badge variant="info">Refreshing</Badge>}
            <Button variant="primary" size="sm" onClick={onClaimRewards} disabled={txPending || Number(pendingRewards) <= 0}>
              <Gift size={14} className="mr-1" /> Claim GOV
            </Button>
          </div>
        </div>
        {positions.length ? (
          <div className="space-y-3">
            {positions.map((asset) => (
              <button key={asset.address} onClick={() => onOpenAsset(asset.address)} className="w-full text-left rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 transition-colors p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-semibold">{asset.symbol}</div>
                  <div className="text-xs text-on-surface-variant">Supplied {formatNumber(asset.userDepositBalance, 4)} · Borrowed {formatNumber(asset.userBorrowBalance, 4)}</div>
                </div>
                <Badge variant={asset.usingAsCollateral ? 'success' : 'warning'}>{asset.usingAsCollateral ? 'Collateral On' : 'Collateral Off'}</Badge>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-on-surface-variant">No positions yet.</div>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Bonus 1: Liquidation View ───

export function LiquidationView({ assets, onLiquidate, onSetAssetPrice, onSetUseChainlink, onFlashLoan, txPending }: {
  assets: AssetData[];
  onLiquidate: (borrower: string, debtAsset: string, repayAmount: string, collateralAsset: string) => Promise<void>;
  onSetAssetPrice?: (assetAddress: string, price: string) => Promise<void>;
  onSetUseChainlink?: (assetAddress: string, enabled: boolean) => Promise<void>;
  onFlashLoan?: (assetAddress: string, amount: string) => Promise<void>;
  txPending: boolean;
}) {
  const [borrower, setBorrower] = useState('');
  const [debtAsset, setDebtAsset] = useState(assets[0]?.address || '');
  const [collateralAsset, setCollateralAsset] = useState(assets[0]?.address || '');
  const [repayAmount, setRepayAmount] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    if (!ethers.isAddress(borrower)) { setLocalError('Invalid borrower address'); return; }
    if (!repayAmount || Number(repayAmount) <= 0) { setLocalError('Enter a valid amount'); return; }
    if (debtAsset === collateralAsset) { setLocalError('Debt and collateral must be different assets'); return; }
    setLocalError('');
    try { await onLiquidate(borrower, debtAsset, repayAmount, collateralAsset); setRepayAmount(''); } catch { /* handled globally */ }
  };

  return (
    <div className="space-y-6">
      <GlassCard elevated className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Bonus 1</div>
            <h2 className="text-xl font-bold text-white">Liquidation</h2>
            <p className="text-sm text-on-surface-variant mt-1">Liquidate undercollateralized positions when Health Factor {'<'} 1.0. Liquidator receives a 5% bonus on seized collateral.</p>
          </div>
          <Badge variant="error"><Hammer size={14} className="mr-1" /> Liquidation</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider">Borrower Address</label>
            <input type="text" value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="0x..." className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-sky-400/40 font-mono text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-wider">Debt Asset</label>
              <select value={debtAsset} onChange={(e) => setDebtAsset(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-sky-400/40">
                {assets.map((a) => <option key={a.address} value={a.address}>{a.symbol} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-wider">Collateral Asset</label>
              <select value={collateralAsset} onChange={(e) => setCollateralAsset(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-sky-400/40">
                {assets.map((a) => <option key={a.address} value={a.address}>{a.symbol} - {a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-wider">Repay Amount</label>
            <input type="number" min="0" step="any" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-2xl text-white focus:outline-none focus:border-sky-400/40" />
          </div>
          {localError && <div className="text-sm text-red-400">{localError}</div>}
          <Button onClick={submit} disabled={txPending} className="w-full py-4 text-base uppercase tracking-[0.2em]">
            {txPending ? 'Processing...' : 'Execute Liquidation'}
          </Button>
        </div>

        <GlassCard className="bg-amber-400/5 border border-amber-400/10">
          <div className="space-y-2 text-sm">
            <InfoRow label="Liquidation Bonus" value="5% (10500 / 10000)" />
            <InfoRow label="Requirement" value="Borrower Health Factor < 1.0" />
            <InfoRow label="Flash Loan Fee" value="0.09% (9 / 10000)" />
          </div>
        </GlassCard>
      </GlassCard>

      {/* Bonus 2: Flash Loan */}
      <FlashLoanPanel assets={assets} onFlashLoan={onFlashLoan} txPending={txPending} />

      {/* Admin: Oracle Price Management */}
      {onSetAssetPrice && onSetUseChainlink && (
        <AdminPricePanel assets={assets} onSetAssetPrice={onSetAssetPrice} onSetUseChainlink={onSetUseChainlink} txPending={txPending} />
      )}
    </div>
  );
}

function AdminPricePanel({ assets, onSetAssetPrice, onSetUseChainlink, txPending }: {
  assets: AssetData[];
  onSetAssetPrice: (assetAddress: string, price: string) => Promise<void>;
  onSetUseChainlink: (assetAddress: string, enabled: boolean) => Promise<void>;
  txPending: boolean;
}) {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]?.address || '');
  const [newPrice, setNewPrice] = useState('');
  const [localError, setLocalError] = useState('');

  const currentAsset = assets.find(a => a.address === selectedAsset);

  const handleSetPrice = async () => {
    if (!newPrice || Number(newPrice) <= 0) { setLocalError('Enter a valid price'); return; }
    setLocalError('');
    try { await onSetAssetPrice(selectedAsset, newPrice); setNewPrice(''); } catch { /* handled globally */ }
  };

  const handleToggleChainlink = async (enabled: boolean) => {
    setLocalError('');
    try { await onSetUseChainlink(selectedAsset, enabled); } catch { /* handled globally */ }
  };

  return (
    <GlassCard elevated className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Admin</div>
          <h2 className="text-xl font-bold text-white">Oracle Price Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Set manual prices or toggle Chainlink oracle. Only the contract owner can execute these transactions.</p>
        </div>
        <Badge variant="warning"><Settings size={14} className="mr-1" /> Owner Only</Badge>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-on-surface-variant uppercase tracking-wider">Select Asset</label>
          <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-sky-400/40">
            {assets.map((a) => <option key={a.address} value={a.address}>{a.symbol} - {a.name}</option>)}
          </select>
        </div>

        {currentAsset && (
          <GlassCard className="bg-slate-800/40 space-y-2">
            <InfoRow label="Current Price" value={`$${formatNumber(currentAsset.price, 2)}`} />
            <InfoRow label="Oracle Source" value={currentAsset.oracle?.useChainlink ? 'Chainlink' : 'Manual'} />
            {currentAsset.oracle?.useChainlink && (
              <InfoRow label="Chainlink Feed" value={currentAsset.oracle.priceFeed.slice(0, 10) + '...' + currentAsset.oracle.priceFeed.slice(-8)} />
            )}
          </GlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs text-on-surface-variant uppercase tracking-wider">Set Manual Price (USD)</label>
            <input type="number" min="0" step="any" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="e.g. 2000" className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-2xl text-white focus:outline-none focus:border-sky-400/40" />
            <Button onClick={handleSetPrice} disabled={txPending} className="w-full py-3">
              {txPending ? 'Processing...' : 'Set Price'}
            </Button>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-on-surface-variant uppercase tracking-wider">Oracle Source</label>
            <div className="flex gap-3 mt-1">
              <Button onClick={() => handleToggleChainlink(false)} disabled={txPending} variant={currentAsset?.oracle?.useChainlink === false ? 'primary' : 'ghost'} className="flex-1 py-3">
                Manual
              </Button>
              <Button onClick={() => handleToggleChainlink(true)} disabled={txPending} variant={currentAsset?.oracle?.useChainlink === true ? 'primary' : 'ghost'} className="flex-1 py-3">
                Chainlink
              </Button>
            </div>
            <p className="text-xs text-on-surface-variant">Switch between manual price and Chainlink oracle feed.</p>
          </div>
        </div>

        {localError && <div className="text-sm text-red-400">{localError}</div>}
      </div>
    </GlassCard>
  );
}

// ─── Bonus 2: Flash Loan Panel ───

function FlashLoanPanel({ assets, onFlashLoan, txPending }: {
  assets: AssetData[];
  onFlashLoan?: (assetAddress: string, amount: string) => Promise<void>;
  txPending: boolean;
}) {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]?.address || '');
  const [flashAmount, setFlashAmount] = useState('');
  const [localError, setLocalError] = useState('');

  const currentAsset = assets.find(a => a.address === selectedAsset);

  const submit = async () => {
    if (!onFlashLoan) { setLocalError('Flash loan not available'); return; }
    if (!flashAmount || Number(flashAmount) <= 0) { setLocalError('Enter a valid amount'); return; }
    if (currentAsset && Number(flashAmount) > Number(currentAsset.availableLiquidity)) {
      setLocalError('Amount exceeds available liquidity'); return;
    }
    setLocalError('');
    try { await onFlashLoan(selectedAsset, flashAmount); setFlashAmount(''); } catch { /* handled globally */ }
  };

  const estimatedFee = currentAsset ? formatNumber(Number(flashAmount || 0) * 0.0009, 6) : '0';

  return (
    <GlassCard elevated className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Bonus 2</div>
          <h2 className="text-xl font-bold text-white">Flash Loan</h2>
          <p className="text-sm text-on-surface-variant mt-1">Borrow any amount without collateral, returned within the same transaction. Fee: 0.09%.</p>
        </div>
        <Badge variant="info"><Zap size={14} className="mr-1" /> Flash Loan</Badge>
      </div>

      {/* Available liquidity per asset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div key={asset.address} className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-2">
            <div className="text-white font-semibold">{asset.symbol}</div>
            <InfoRow label="Available Liquidity" value={`${formatNumber(asset.availableLiquidity, 4)} ${asset.symbol}`} />
            <InfoRow label="Receiver Balance" value={`${formatNumber(asset.receiverBalance, 6)} ${asset.symbol}`} />
            <InfoRow label="Flash Loan Fee (0.09%)" value={`${formatNumber(Number(asset.availableLiquidity) * 0.0009, 6)} ${asset.symbol}`} />
          </div>
        ))}
      </div>

      {/* Execute Flash Loan form */}
      {onFlashLoan ? (
        <GlassCard className="bg-sky-400/5 border border-sky-400/10 space-y-4">
          <div className="text-sm font-semibold text-white">Execute Flash Loan via Receiver Contract</div>
          <p className="text-xs text-on-surface-variant">
            Calls <code className="text-sky-300">startFlashLoan()</code> on the deployed FlashLoanReceiver at{' '}
            <code className="text-sky-300">{CONTRACT_ADDRESSES.FLASH_LOAN_RECEIVER.slice(0, 8)}...{CONTRACT_ADDRESSES.FLASH_LOAN_RECEIVER.slice(-6)}</code>.
            Only the Receiver owner (deployer) can execute this. The Receiver borrows tokens, does nothing (no arbitrage target), and repays with fee.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-wider">Asset</label>
              <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-sky-400/40">
                {assets.map((a) => <option key={a.address} value={a.address}>{a.symbol} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-wider">Amount</label>
              <input type="number" min="0" step="any" value={flashAmount} onChange={(e) => setFlashAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-2xl text-white focus:outline-none focus:border-sky-400/40" />
            </div>
          </div>

          {flashAmount && Number(flashAmount) > 0 && (
            <div className="rounded-xl bg-slate-900/40 p-3 space-y-1">
              <InfoRow label="Borrow Amount" value={`${flashAmount} ${currentAsset?.symbol || ''}`} />
              <InfoRow label="Fee (0.09%)" value={`${estimatedFee} ${currentAsset?.symbol || ''}`} />
              <InfoRow label="Total Repayment" value={`${formatNumber(Number(flashAmount) * 1.0009, 6)} ${currentAsset?.symbol || ''}`} />
            </div>
          )}

          {localError && <div className="text-sm text-red-400">{localError}</div>}
          <Button onClick={submit} disabled={txPending} className="w-full py-4 text-base uppercase tracking-[0.2em]">
            {txPending ? 'Processing...' : 'Execute Flash Loan'}
          </Button>
        </GlassCard>
      ) : (
        <GlassCard className="bg-sky-400/5 border border-sky-400/10">
          <div className="text-sm text-on-surface-variant">
            Flash loans require a smart contract implementing <code className="text-sky-300">executeOperation()</code>. Connect with the Receiver contract owner wallet to execute.
          </div>
        </GlassCard>
      )}
    </GlassCard>
  );
}

// ─── Asset Details View (with Bonus 3: Oracle info) ───

type ActionType = 'supply' | 'borrow' | 'repay' | 'withdraw';

export function AssetDetailsView({ asset, assets, userHealthFactor, onBack, onBackLabel, onSupply, onBorrow, onRepay, onWithdraw, onToggleCollateral, txPending }: {
  asset: AssetData; assets: AssetData[]; userHealthFactor?: string; onBack: () => void; onBackLabel: string;
  onSupply: (a: string, amt: string) => Promise<void>; onBorrow: (a: string, amt: string) => Promise<void>;
  onRepay: (a: string, amt: string) => Promise<void>; onWithdraw: (a: string, amt: string) => Promise<void>;
  onToggleCollateral: (a: string, e: boolean) => Promise<void>; txPending: boolean;
}) {
  const [action, setAction] = useState<ActionType>('supply');
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');

  const maxAmount = useMemo(() => {
    if (action === 'supply') return asset.walletBalance;
    if (action === 'repay') {
      const wallet = Number(asset.walletBalance);
      const debt = Number(asset.userBorrowBalance);
      return String(Math.min(wallet, debt));
    }
    if (action === 'borrow') return asset.availableLiquidity;
    return asset.userDepositBalance;
  }, [action, asset]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) { setLocalError('Enter a valid amount.'); return; }
    setLocalError('');
    try {
      if (action === 'supply') await onSupply(asset.address, amount);
      if (action === 'borrow') await onBorrow(asset.address, amount);
      if (action === 'repay') await onRepay(asset.address, amount);
      if (action === 'withdraw') await onWithdraw(asset.address, amount);
      setAmount('');
    } catch { /* handled globally */ }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to {onBackLabel}
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <div className="space-y-6">
          <GlassCard elevated className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Asset Overview</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: `${asset.color}22`, border: `1px solid ${asset.color}55` }} />
                  <div>
                    <h2 className="text-3xl font-bold text-white">{asset.symbol}</h2>
                    <div className="text-sm text-on-surface-variant">{asset.name}</div>
                  </div>
                </div>
              </div>
              <Badge variant={asset.usingAsCollateral ? 'success' : 'warning'}>{asset.usingAsCollateral ? 'Collateral Enabled' : 'Collateral Disabled'}</Badge>
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
                  <div className="mt-1 text-white font-semibold">{asset.usingAsCollateral ? 'Supporting your borrow capacity.' : 'Not counted as collateral.'}</div>
                </div>
                <Button variant={asset.usingAsCollateral ? 'outline' : 'primary'} onClick={() => onToggleCollateral(asset.address, !asset.usingAsCollateral)} disabled={txPending || Number(asset.userDepositBalance) <= 0}>
                  {asset.usingAsCollateral ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </GlassCard>
          </GlassCard>

          {/* Bonus 3: Oracle Integration Display */}
          {asset.oracle && (
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Bonus 3: Price Oracle</div>
                  <h3 className="text-lg font-bold text-white">Oracle Integration</h3>
                </div>
                <Badge variant={asset.oracle.useChainlink ? 'success' : 'info'}>{asset.oracle.useChainlink ? 'Chainlink' : 'Manual'}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Oracle Price" value={`$${formatNumber(ethers.formatUnits(asset.oracle.oraclePrice, 18), 2)}`} />
                <InfoRow label="Price Mode" value={asset.oracle.useChainlink ? 'Chainlink Feed' : 'Manual Price'} />
                {asset.oracle.useChainlink && (
                  <InfoRow label="Feed Address" value={shortenAddress(asset.oracle.priceFeed)} />
                )}
                <InfoRow label="Manual Price" value={`$${formatNumber(ethers.formatUnits(asset.oracle.manualPrice, 18), 2)}`} />
              </div>
            </GlassCard>
          )}
        </div>

        <GlassCard elevated className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Trade Panel</div>
            <h3 className="mt-2 text-2xl font-bold text-white">Run a live transaction</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['supply', 'borrow', 'repay', 'withdraw'] as ActionType[]).map((item) => (
              <Button key={item} variant={action === item ? 'primary' : 'outline'} size="sm" onClick={() => setAction(item)} className="w-full capitalize">{item}</Button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Amount</span>
              <button onClick={() => setAmount(maxAmount)} className="hover:text-white transition-colors">Max: {formatNumber(maxAmount, 4)}</button>
            </div>
            <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-4 text-2xl text-white focus:outline-none focus:border-sky-400/40" placeholder="0.00" />
            {localError && <div className="text-sm text-red-400">{localError}</div>}
          </div>
          <GlassCard className="bg-sky-400/5 border border-sky-400/10">
            <div className="space-y-3 text-sm">
              <InfoRow label="Current Health Factor" value={userHealthFactor === 'Infinity' ? '∞' : formatNumber(userHealthFactor || 0, 2)} />
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
