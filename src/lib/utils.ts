import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function calculateOdds(odds: string): number {
  const numericOdds = parseInt(odds.replace(/[+-]/, ''));
  
  if (odds.startsWith('+')) {
    return (numericOdds / 100) + 1;
  } else {
    return (100 / numericOdds) + 1;
  }
}

// American odds formatting utilities
export function formatAmericanOdds(odds: number): string {
  if (odds > 0) {
    return `+${odds}`;
  } else {
    return `${odds}`;
  }
}

// Convert decimal odds to American odds
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

// Convert American odds to decimal odds
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

// Calculate implied probability from American odds
export function americanToImpliedProbability(american: number): number {
  if (american > 0) {
    return 100 / (american + 100);
  } else {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
}

// Calculate potential payout from American odds and stake
export function calculatePayout(stake: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return stake * (1 + americanOdds / 100);
  } else {
    return stake * (1 + 100 / Math.abs(americanOdds));
  }
}