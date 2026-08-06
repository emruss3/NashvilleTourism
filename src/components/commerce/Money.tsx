import type { MoneyV2 } from '@/lib/shopify/types';

export function formatMoney(money: MoneyV2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
    maximumFractionDigits: Number(money.amount) % 1 === 0 ? 0 : 2,
  }).format(Number(money.amount));
}

export default function Money({ value, className = '' }: { value: MoneyV2; className?: string }) {
  return <span className={className}>{formatMoney(value)}</span>;
}
