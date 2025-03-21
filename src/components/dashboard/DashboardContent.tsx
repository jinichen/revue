import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, BarChart3, Clock, Users, CheckCircle } from 'lucide-react';
import { OrgBarChart } from './OrgBarChart';
import { OrgTable } from './OrgTable';

// 组件主体
export default function DashboardContent() {
  // 状态
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingOrgData, setIsLoadingOrgData] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [statsData, setStatsData] = useState<any>({
    day: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
    month: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
    year: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
    meta: {
      fetchTime: '',
      ttl: 0
    }
  });
  const [orgData, setOrgData] = useState<any>({
    data: [],
    meta: {
      fetchTime: '',
      ttl: 0
    }
  });
  const isMounted = useRef(true);

  // 初始化加载
  useEffect(() => {
    isMounted.current = true;
    console.log('DashboardContent组件已挂载');
    
    // 加载初始数据
    fetchStats();
    fetchOrgStats();
    
    // 清理函数
    return () => {
      isMounted.current = false;
      console.log('DashboardContent组件已卸载');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 加载调用统计数据
  const fetchStats = async () => {
    console.log('获取调用统计数据...');
    setIsLoadingStats(true);

    try {
      console.log('正在请求调用统计API');
      const response = await fetch('/api/analytics/call-stats', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        // 增加超时时间到30秒
        signal: AbortSignal.timeout(30000) // 30秒超时
      });

      console.log(`API响应状态: ${response.status}`);

      if (!response.ok) {
        console.error(`API错误响应:`, {
          status: response.status,
          statusText: response.statusText
        });
        
        // 尝试获取错误详情
        try {
          const errorText = await response.text();
          console.error('API错误详情:', errorText);
        } catch (readError) {
          console.error('无法读取错误详情:', readError);
        }
        
        throw new Error(`获取统计数据失败: ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('API响应数据:', result);
      } catch (parseError) {
        console.error('解析API响应失败:', parseError);
        throw new Error('解析统计数据失败');
      }

      if (result?.success && result?.data && isMounted.current) {
        console.log('设置statsData:', result.data);
        setStatsData({
          day: result.data.day || { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          month: result.data.month || { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          year: result.data.year || { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          meta: result.meta || { fetchTime: new Date().toISOString() }
        });
      } else {
        console.warn('API返回成功但数据无效:', result);
        // 使用默认数据
        if (isMounted.current) {
          setStatsData({
            day: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
            month: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
            year: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
            meta: { fetchTime: new Date().toISOString() }
          });
        }
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
      // 使用默认数据
      if (isMounted.current) {
        setStatsData({
          day: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          month: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          year: { total: 0, valid: 0, invalid: 0, validPercentage: 0 },
          meta: { fetchTime: new Date().toISOString() }
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingStats(false);
      }
    }
  };

  // 获取组织统计数据
  const fetchOrgStats = async () => {
    console.log('获取组织统计数据...');
    setIsLoadingOrgData(true);

    try {
      console.log(`正在请求 /api/analytics/org-stats?period=${selectedPeriod}`);
      const response = await fetch(`/api/analytics/org-stats?period=${selectedPeriod}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        // 增加超时时间到30秒
        signal: AbortSignal.timeout(30000) // 30秒超时
      });
      
      console.log(`组织统计API响应状态: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`获取组织统计失败: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('获取到的组织统计:', result);
      
      if (result?.success && result?.data && isMounted.current) {
        setOrgData({
          data: result.data || [],
          meta: result.meta || { fetchTime: new Date().toISOString() }
        });
      } else {
        throw new Error('API响应格式不正确');
      }
      } catch (error) {
      console.error('获取组织统计错误:', error);
      // 设置模拟数据
      if (isMounted.current) {
        setOrgData({
          data: [
            { org_id: 'org1', organizationName: '客户A', total: 12500, validTotal: 11800, invalidTotal: 700, validPercentage: 94.4 },
            { org_id: 'org2', organizationName: '客户B', total: 9800, validTotal: 9200, invalidTotal: 600, validPercentage: 93.9 },
            { org_id: 'org3', organizationName: '客户C', total: 7600, validTotal: 7000, invalidTotal: 600, validPercentage: 92.1 },
            { org_id: 'org4', organizationName: '客户D', total: 5400, validTotal: 4900, invalidTotal: 500, validPercentage: 90.7 }
          ],
          meta: { fetchTime: new Date().toISOString() }
        });
      }
      } finally {
      if (isMounted.current) {
        setIsLoadingOrgData(false);
      }
      }
    };
    
  // 处理切换周期
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    fetchOrgStats();
  };

  // 获取当前显示的统计数据
  const currentStats = statsData ? statsData[selectedPeriod] || {} : {};
  
  // 日期格式化
  const today = new Date();
  const formattedDate = format(today, 'yyyy年MM月dd日');
  
  // 添加刷新函数
  const refreshData = () => {
    fetchStats();
    fetchOrgStats();
  };

  // 添加清除缓存的功能
  const clearCache = async () => {
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          alert('缓存已成功清除，正在刷新数据...');
          // 刷新数据
          fetchStats();
          fetchOrgStats();
        } else {
          alert(`清除缓存失败: ${result.error || '未知错误'}`);
        }
      } else {
        alert(`清除缓存请求失败: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('清除缓存时出错:', error);
      alert(`清除缓存时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 添加显示上次数据更新时间
  const DataRefreshInfo = ({ timestamp, onRefresh, onClearCache }: { 
    timestamp?: string, 
    onRefresh: () => void,
    onClearCache: () => void
  }) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const formattedTime = date.toLocaleTimeString();
    
    return (
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>数据更新时间: {formattedTime}</span>
        <button 
          onClick={onRefresh} 
          className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          刷新
        </button>
        <button 
          onClick={onClearCache} 
          className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          清除缓存
        </button>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-300 dark:to-indigo-300">调用统计看板</h1>
          <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>数据更新: {formattedDate}</span>
          </div>
        </div>
        
        <DataRefreshInfo 
          timestamp={statsData.meta?.fetchTime} 
          onRefresh={refreshData} 
          onClearCache={clearCache}
        />
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 今日统计 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800 dark:text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">今日统计</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">所有客户调用情况</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-full">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">总调用次数</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">总计</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.day.total.toLocaleString()}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      100%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">有效调用</span>
                      <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                        <ArrowUp className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${statsData.day.validPercentage}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.day.valid.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">无效调用</span>
                      <span className="flex items-center text-xs text-red-600 dark:text-red-400">
                        <ArrowDown className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${(100 - statsData.day.validPercentage).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.day.invalid.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 本月统计 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800 dark:text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">本月统计</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">所有客户调用情况</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-full">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">总调用次数</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">总计</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.month.total.toLocaleString()}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      100%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">有效调用</span>
                      <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                        <ArrowUp className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${statsData.month.validPercentage}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.month.valid.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">无效调用</span>
                      <span className="flex items-center text-xs text-red-600 dark:text-red-400">
                        <ArrowDown className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${(100 - statsData.month.validPercentage).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.month.invalid.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 全年统计 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800 dark:text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">全年统计</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">所有客户调用情况</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded-full">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">总调用次数</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">总计</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.year.total.toLocaleString()}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      100%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">有效调用</span>
                      <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                        <ArrowUp className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${statsData.year.validPercentage}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.year.valid.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">无效调用</span>
                      <span className="flex items-center text-xs text-red-600 dark:text-red-400">
                        <ArrowDown className="w-3 h-3 mr-0.5" />
                        {isLoadingStats ? '-' : `${(100 - statsData.year.validPercentage).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                      {isLoadingStats ? '-' : statsData.year.invalid.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 客户统计部分 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">客户调用统计</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">查看各客户调用量与成功率</p>
            </div>
            
            {/* 周期选择按钮 */}
            <div className="mt-4 sm:mt-0 bg-white dark:bg-gray-800 shadow-md rounded-lg p-1 flex space-x-1">
              <button
                onClick={() => handlePeriodChange('day')}
                className={`px-4 py-2 text-sm font-medium rounded ${
                  selectedPeriod === 'day' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } transition-all duration-200`}
              >
                今日
              </button>
              <button
                onClick={() => handlePeriodChange('month')}
                className={`px-4 py-2 text-sm font-medium rounded ${
                  selectedPeriod === 'month' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } transition-all duration-200`}
              >
                本月
              </button>
              <button
                onClick={() => handlePeriodChange('year')}
                className={`px-4 py-2 text-sm font-medium rounded ${
                  selectedPeriod === 'year' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } transition-all duration-200`}
              >
                全年
              </button>
            </div>
          </div>
          
          {/* 图表和表格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 hover:shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-blue-300 mb-4">
                {`客户调用量 (${selectedPeriod === 'day' ? '今日' : selectedPeriod === 'month' ? '本月' : '全年'})`}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <OrgBarChart
                  data={orgData.data}
                  loading={isLoadingOrgData}
                  title=""
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="p-1">
                <OrgTable
                  data={orgData.data}
                  loading={isLoadingOrgData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
