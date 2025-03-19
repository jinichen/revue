/**
 * Period selector component for selecting time periods (year, month, day)
 */

import { TimePeriod } from '@/types';
import { cn } from '@/lib/utils';

const periods: { value: string; label: string }[] = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-md border">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium',
            value === period.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-accent'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
} 