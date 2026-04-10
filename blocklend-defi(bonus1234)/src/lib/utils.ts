import { clsx, type ClassValue } from 'clsx';
import { formatUnits } from 'ethers';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NumericLike = number | string | bigint;

function toNumber(value: NumericLike) {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return Number.parseFloat(value.replace(/,/g, ''));
}

function clampFinite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function formatCurrency(value: NumericLike) {
  const num = clampFinite(toNumber(value));
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: NumericLike, decimals = 2) {
  const num = clampFinite(toNumber(value));
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: NumericLike) {
  const num = clampFinite(toNumber(value));
  if (!Number.isFinite(num)) return '0.00%';
  const normalized = Math.abs(num) <= 1 && num !== 0 ? num * 100 : num;
  return `${normalized.toFixed(2)}%`;
}

export function formatHealthFactor(value: NumericLike) {
  const raw = typeof value === 'bigint' ? value : BigInt(Math.trunc(toNumber(value)));
  if (raw >= (2n ** 255n)) return 'Infinity';
  return formatUnits(raw, 18);
}

export function describeProtocolError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Transaction failed';
  }

  const candidate = error as {
    code?: number | string;
    shortMessage?: string;
    reason?: string;
    message?: string;
    info?: { error?: { message?: string } };
    data?: { message?: string };
  };

  const raw = [
    candidate.shortMessage,
    candidate.reason,
    candidate.info?.error?.message,
    candidate.data?.message,
    candidate.message,
  ].find(Boolean) || 'Transaction failed';

  const normalized = String(raw);
  if (candidate.code === 4001 || String(candidate.code) === 'ACTION_REJECTED') {
    return 'Transaction rejected in wallet';
  }
  if (/insufficient funds/i.test(normalized)) return 'Insufficient funds for gas or balance';
  if (/exceeds max borrow capacity/i.test(normalized)) return 'Borrow amount exceeds your available borrowing power';
  if (/health factor too low/i.test(normalized)) return 'Operation would make your position unsafe';
  if (/insufficient liquidity/i.test(normalized)) return 'The pool does not have enough liquidity';
  if (/no borrow to repay/i.test(normalized)) return 'There is no outstanding borrow on this asset';
  if (/asset not active/i.test(normalized)) return 'This asset is not active in the pool';
  if (/amount must be greater than 0/i.test(normalized)) return 'Enter an amount greater than zero';
  if (/execution reverted/i.test(normalized)) {
    return normalized.replace(/^execution reverted:?\s*/i, '');
  }

  return normalized;
}

export function shortenAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
