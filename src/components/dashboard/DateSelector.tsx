import React from 'react';

export interface DateSelectorProps {
  selectedPeriod: 'year' | 'month' | 'day';
  onPeriodChange: (period: 'year' | 'month' | 'day') => void;
}

export function DateSelector({ selectedPeriod, onPeriodChange }: DateSelectorProps) {
  return (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => onPeriodChange('day')}
        className={`px-4 py-2 rounded-md transition-colors ${
          selectedPeriod === 'day'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        今日
      </button>
      <button
        onClick={() => onPeriodChange('month')}
        className={`px-4 py-2 rounded-md transition-colors ${
          selectedPeriod === 'month'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        本月
      </button>
      <button
        onClick={() => onPeriodChange('year')}
        className={`px-4 py-2 rounded-md transition-colors ${
          selectedPeriod === 'year'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        全年
      </button>
    </div>
  );
} 