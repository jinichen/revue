import React from 'react';

interface ReconciliationStatementProps {
  date: string;
  totalCalls: number;
  stats: {
    code: string;
    total: number;
    success: number;
    failure: number;
    rate: number;
  }[];
  details: {
    code: string;
    description: string;
    result: string;
    count: number;
  }[];
}

const ReconciliationStatement: React.FC<ReconciliationStatementProps> = ({
  date,
  totalCalls,
  stats,
  details
}) => {
  return (
    <div className="bg-gray-850 dark:bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden">
      {/* 对账单头部 */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-800 dark:to-indigo-800 p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white dark:text-blue-100 mb-2">对账单统计</h2>
        <p className="text-sm text-gray-300 dark:text-gray-200">
          <span className="font-medium">对账日期:</span> {date}
        </p>
      </div>

      {/* 内容区域 */}
      <div className="px-5 py-4">
        {/* 总统计 */}
        <div className="mb-6">
          <div className="flex items-center">
            <span className="text-gray-200 dark:text-gray-100 font-medium mr-2">总调用次数:</span>
            <span className="text-2xl font-bold text-white dark:text-blue-50">{totalCalls.toLocaleString()}</span>
          </div>
        </div>

        {/* 认证方式统计 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-blue-300 dark:text-blue-200 mb-3 border-b border-gray-700 pb-2">
            认证方式统计
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800 dark:bg-gray-750">
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm">认证编码</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">总数</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">成功</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">失败</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">成功率</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-700 dark:border-gray-650 hover:bg-gray-750 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-100 dark:text-gray-200 text-sm">{stat.code}</td>
                    <td className="py-3 px-4 text-gray-100 dark:text-gray-200 text-sm text-right">{stat.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-300 dark:text-green-300 text-sm text-right">{stat.success.toLocaleString()}</td>
                    <td className="py-3 px-4 text-red-300 dark:text-red-300 text-sm text-right">{stat.failure.toLocaleString()}</td>
                    <td className="py-3 px-4 text-yellow-300 dark:text-yellow-200 text-sm text-right">{stat.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 详细记录 */}
        <div>
          <h3 className="text-lg font-semibold text-blue-300 dark:text-blue-200 mb-3 border-b border-gray-700 pb-2">
            详细记录
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800 dark:bg-gray-750">
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm">认证编码</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-left">描述</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">结果</th>
                  <th className="py-3 px-4 text-blue-200 dark:text-blue-100 font-medium text-sm text-right">数量</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-700 dark:border-gray-650 hover:bg-gray-750 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-100 dark:text-gray-200 text-sm">{detail.code}</td>
                    <td className="py-3 px-4 text-gray-100 dark:text-gray-200 text-sm">{detail.description}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span 
                        className={`px-2 py-1 text-xs rounded-full ${
                          detail.result === '是' 
                            ? 'bg-green-800 text-green-200' 
                            : 'bg-red-800 text-red-200'
                        }`}
                      >
                        {detail.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white dark:text-white text-sm text-right">
                      {detail.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationStatement; 