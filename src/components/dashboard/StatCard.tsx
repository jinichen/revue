import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { numberWithCommas } from '@/lib/utils';

// 定义组件属性
export interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  percentage?: number;
  variant?: 'default' | 'success' | 'danger' | 'info';
  isLoading?: boolean;
}

/**
 * 统计卡片组件
 * 用于展示关键统计数据，支持展示变化趋势和百分比
 */
export default function StatCard({
  title,
  value,
  change = 0,
  percentage = 0,
  variant = 'default',
  isLoading = false
}: StatCardProps) {
  
  // 确定颜色样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgClass: 'bg-green-50',
          textClass: 'text-green-700',
          iconClass: 'text-green-500'
        };
      case 'danger':
        return {
          bgClass: 'bg-red-50',
          textClass: 'text-red-700',
          iconClass: 'text-red-500'
        };
      case 'info':
        return {
          bgClass: 'bg-blue-50',
          textClass: 'text-blue-700',
          iconClass: 'text-blue-500'
        };
      default:
        return {
          bgClass: 'bg-gray-50',
          textClass: 'text-gray-700',
          iconClass: 'text-gray-500'
        };
    }
  };
  
  const styles = getVariantStyles();
  
  // 加载状态
  if (isLoading) {
    return (
      <div className={`${styles.bgClass} p-5 rounded-lg shadow-sm`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.bgClass} p-5 rounded-lg shadow-sm`}>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <div className="flex items-baseline">
        <p className={`text-2xl font-semibold ${styles.textClass}`}>
          {typeof value === 'number' ? numberWithCommas(value) : value}
        </p>
      </div>
      {(change !== 0 || percentage !== 0) && (
        <div className="flex items-center mt-2">
          {change > 0 ? (
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
          ) : change < 0 ? (
            <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
          ) : null}
          <span className={`text-sm ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {change > 0 ? '+' : ''}{numberWithCommas(change)} ({percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
} 