/**
 * Reconciliation page component
 */

'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import ReconciliationForm from '@/components/reconciliation/ReconciliationForm';
import { BillingConfig } from '@/types';

export default function ReconciliationPage() {
  // 获取昨天的日期作为默认值
  const getYesterdayDateString = () => {
    const yesterday = subDays(new Date(), 1);
    return format(yesterday, 'yyyy-MM-dd');
  };
  
  const yesterdayStr = getYesterdayDateString();
  
  // Configuration state
  const [config, setConfig] = useState<BillingConfig>({
    orgId: '', // 初始化为空字符串，表示尚未选择客户
    periodStart: yesterdayStr,
    periodEnd: yesterdayStr,
    twoFactorPrice: 1.4,  // 默认二要素认证单价：1.4分/次
    threeFactorPrice: 3.5, // 默认三要素认证单价：3.5分/次
  });
  
  // 标记是否加载数据（仅在有效的组织ID时触发）
  const [isLoading, setIsLoading] = useState(false);
  
  // 监控config变化，仅当有有效的orgId时设置加载状态为true
  useEffect(() => {
    if (config.orgId && config.orgId.trim() !== '') {
      setIsLoading(true);
      // 加载状态只保持短暂时间，预览组件会接管后续的加载状态
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [config.orgId, config.periodStart, config.periodEnd]);
  
  // Handle config changes from the form
  const handleConfigChange = (newConfig: BillingConfig) => {
    // 确保不会传递无效的组织ID
    if (newConfig.orgId === null) {
      newConfig.orgId = '';
    }
    setConfig(newConfig);
  };
  
  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-col gap-6">
        {/* 对账单表单 */}
        <div>
          <ReconciliationForm 
            initialConfig={config} 
            onConfigChange={handleConfigChange}
          />
        </div>
      </div>
    </div>
  );
} 