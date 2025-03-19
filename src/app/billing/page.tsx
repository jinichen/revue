/**
 * Billing page component
 */

'use client';

import { useState } from 'react';
import BillingForm from '@/components/billing/BillingForm';
import BillPreview from '@/components/billing/BillPreview';
import { BillingConfig } from '@/types';
import { format, lastDayOfMonth } from 'date-fns';

export default function BillingPage() {
  // 设置当年当月
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript月份是0-11
  
  // 计算当月第一天和最后一天
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = lastDayOfMonth(firstDay);
  
  // Bill configuration state
  const [config, setConfig] = useState<BillingConfig>({
    orgId: '',
    periodStart: format(firstDay, 'yyyy-MM-dd'),
    periodEnd: format(lastDay, 'yyyy-MM-dd'),
    twoFactorPrice: 1.4,  // 默认二要素认证单价：1.4分/次
    threeFactorPrice: 3.5, // 默认三要素认证单价：3.5分/次
  });
  
  // Handle config changes from the form
  const handleConfigChange = (newConfig: BillingConfig) => {
    setConfig(newConfig);
  };
  
  return (
    <div className="space-y-3 p-3">
      {/* 两栏布局：左侧账单选项，右侧账单预览 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* 左侧：账单选项 */}
        <div className="md:col-span-3">
          <BillingForm 
            initialConfig={config} 
            onConfigChange={handleConfigChange}
          />
        </div>
        
        {/* 右侧：账单预览 */}
        <div className="md:col-span-9">
          <BillPreview config={config} />
        </div>
      </div>
    </div>
  );
} 