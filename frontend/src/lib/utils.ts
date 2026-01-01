import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function formatCurrency(value: any): string {
  const num = safeNumber(value, NaN)
  if (Number.isNaN(num)) return '-'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatPercentage(value: any): string {
  const num = safeNumber(value, NaN)
  if (Number.isNaN(num)) return '-%'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function safeString(value: any, fallback: string = '-'): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length ? s : fallback;
}

export function formatPercent(value: any, decimals: number = 0): string {
  const n = safeNumber(value, NaN);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(decimals)}%`;
}

export function safeToFixed(value: any, decimals: number = 2, fallback: string = '-'): string {
  const num = safeNumber(value, NaN)
  if (Number.isNaN(num)) return fallback
  return num.toFixed(decimals)
}

export function shortenAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

