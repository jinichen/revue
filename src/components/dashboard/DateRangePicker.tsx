/**
 * Date range picker component for selecting date ranges
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { DateRange } from '@/types';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Predefined date ranges
  const dateRanges: { label: string; getRange: () => DateRange }[] = [
    { label: '今天', getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    }},
    { label: '昨天', getRange: () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }},
    { label: '本周', getRange: () => {
      const today = new Date();
      const firstDay = new Date(today);
      const day = today.getDay() || 7;
      firstDay.setDate(today.getDate() - day + 1);
      return { from: firstDay, to: today };
    }},
    { label: '本月', getRange: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: firstDay, to: today };
    }},
    { label: '上个月', getRange: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: firstDay, to: lastDay };
    }},
    { label: '最近30天', getRange: () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { from: thirtyDaysAgo, to: today };
    }},
  ];
  
  // Handle selecting a predefined range
  const handleSelectRange = (getRange: () => DateRange) => {
    const range = getRange();
    onChange(range);
    setIsOpen(false);
  };
  
  // Format display date
  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyy年MM月dd日');
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 text-sm border rounded-md hover:bg-accent"
      >
        <Calendar className="h-4 w-4" />
        <span>
          {formatDisplayDate(value.from)} - {formatDisplayDate(value.to)}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-card shadow-lg z-50">
          <div className="p-2">
            <div className="text-sm font-medium mb-2">选择日期范围</div>
            <div className="space-y-1">
              {dateRanges.map((range, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                  onClick={() => handleSelectRange(range.getRange)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="border-t p-2">
            <div className="grid gap-2">
              <div>
                <label className="text-xs">开始日期</label>
                <input
                  type="date"
                  className="w-full p-1 text-sm border rounded"
                  value={value.from ? format(value.from, 'yyyy-MM-dd') : ''}
                  onChange={(e) => onChange({
                    ...value,
                    from: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  max={value.to ? format(value.to, 'yyyy-MM-dd') : undefined}
                />
              </div>
              <div>
                <label className="text-xs">结束日期</label>
                <input
                  type="date"
                  className="w-full p-1 text-sm border rounded"
                  value={value.to ? format(value.to, 'yyyy-MM-dd') : ''}
                  onChange={(e) => onChange({
                    ...value,
                    to: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  min={value.from ? format(value.from, 'yyyy-MM-dd') : undefined}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 