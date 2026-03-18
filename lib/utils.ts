import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number): string {
  return score.toFixed(1)
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-red-500'
  if (score >= 6) return 'text-orange-500'
  if (score >= 4) return 'text-yellow-500'
  return 'text-slate-400'
}

export function getScoreBadgeVariant(score: number): 'destructive' | 'warning' | 'secondary' {
  if (score >= 6) return 'destructive'
  if (score >= 4) return 'warning'
  return 'secondary'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}
