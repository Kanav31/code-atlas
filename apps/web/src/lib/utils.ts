import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rand(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('pick() called with an empty array');
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function ts(): string {
  const d = new Date();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${mm}:${ss}`;
}
