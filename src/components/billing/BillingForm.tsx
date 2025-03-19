/**
 * Billing form component for selecting options
 */

import { useState, useEffect } from 'react';
import { format, lastDayOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { BillingConfig } from '@/types';
import { getOrganizations } from '@/lib/services';
import useAppStore from '@/hooks/useAppStore';

interface BillingFormProps {
  initialConfig?: BillingConfig;
  onConfigChange?: (config: BillingConfig) => void;
}

export default function BillingForm({ initialConfig, onConfigChange }: BillingFormProps) {
  const { organizations, setOrganizations } = useAppStore();
  
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 设置默认为当年当月
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript月份是0-11
  
  // Form state
  const [formState, setFormState] = useState<BillingConfig>(
    initialConfig || {
      orgId: '',
      periodStart: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
      periodEnd: format(lastDayOfMonth(new Date(currentYear, currentMonth - 1)), 'yyyy-MM-dd'),
      twoFactorPrice: 1.4,  // 默认二要素认证单价：1.4分/次
      threeFactorPrice: 3.5, // 默认三要素认证单价：3.5分/次
    }
  );
  
  // 年月选择状态
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  
  // 设置当前组织的名称
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  
  // Load organizations data
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };
    
    if (organizations.length === 0) {
      fetchOrganizations();
    } else {
      setLoadingOrgs(false);
    }
  }, [organizations.length, setOrganizations]);
  
  // Set period start and end dates when month or year changes
  useEffect(() => {
    // 设置月份的第一天和最后一天
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = lastDayOfMonth(firstDay);
    
    const periodStart = format(firstDay, 'yyyy-MM-dd');
    const periodEnd = format(lastDay, 'yyyy-MM-dd');
    
    setFormState(prev => ({
      ...prev,
      periodStart,
      periodEnd
    }));
  }, [selectedMonth, selectedYear]);
  
  // Update parent component when form state changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(formState);
    }
  }, [formState, onConfigChange]);
  
  // Handle form input changes
  const handleChange = (field: keyof BillingConfig, value: any) => {
    const newState = { ...formState, [field]: value };
    setFormState(newState);
    
    // Update selected org name
    if (field === 'orgId') {
      const org = organizations.find(org => org.org_id === value);
      setSelectedOrgName(org?.org_name || '');
    }
  };
  
  // Get available years
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  };
  
  // Get available months
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };
  
  return (
    <div className="bg-card rounded-lg border p-2 shadow-sm text-sm">
      <h3 className="text-base font-medium mb-2">账单选项</h3>
      
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
          {error}
        </div>
      )}
      
      <form className="space-y-2">
        {/* 客户选择 */}
        <div className="space-y-1">
          <label className="text-xs font-medium">客户</label>
          <select
            className="w-full p-1 border rounded-md bg-background text-sm"
            value={formState.orgId}
            onChange={(e) => handleChange('orgId', e.target.value)}
            disabled={loadingOrgs}
          >
            <option value="">选择客户</option>
            {organizations.map((org) => (
              <option key={org.org_id} value={org.org_id}>
                {org.org_name}
              </option>
            ))}
          </select>
          {loadingOrgs && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              加载客户...
            </div>
          )}
        </div>
        
        {/* 账单周期选择 */}
        <div className="space-y-1">
          <label className="text-xs font-medium">账单周期</label>
          <div className="flex gap-1">
            <select
              className="w-full p-1 border rounded-md bg-background text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {getYearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
            
            <select
              className="w-full p-1 border rounded-md bg-background text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {getMonthOptions().map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* 单价设置 */}
        <div className="space-y-1">
          <label className="text-xs font-medium">单价设置 (分/次)</label>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-xs mb-1 block">二要素</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full p-1 border rounded-md bg-background text-sm"
                value={formState.twoFactorPrice}
                onChange={(e) => handleChange('twoFactorPrice', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block">三要素</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full p-1 border rounded-md bg-background text-sm"
                value={formState.threeFactorPrice}
                onChange={(e) => handleChange('threeFactorPrice', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
} 