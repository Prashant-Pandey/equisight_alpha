/**
 * Institutional number, currency, EPS, and timestamp formatting utilities.
 * Centralized formatting logic shared across frontend pages and pipeline modules.
 */

export function formatCurrency(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatFCF(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return '$0';
  const abs = Math.abs(val);
  const sign = val >= 0 ? '+' : '-';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatEPS(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  if (val < 0) return `-$${Math.abs(val).toFixed(2)}`;
  return `$${val.toFixed(2)}`;
}

export function formatPriceTimestamp(dateInput: string | Date, explicitTimestamp?: string): string {
  if (explicitTimestamp && explicitTimestamp.trim().length > 0) {
    return explicitTimestamp.startsWith('Price on') ? explicitTimestamp : `Price on ${explicitTimestamp}`;
  }
  const d = new Date(dateInput);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });
  return `Price on ${datePart}, ${timePart} EDT`;
}
