/**
 * Database connection utility
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

/**
 * 查询缓存类
 * 用于缓存数据库查询结果，减少重复查询
 */
class QueryCache {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  
  /**
   * 获取缓存数据
   * @param key 缓存键
   * @param scope 缓存作用域
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  get(key: string, scope: any[] = []): any {
    const fullKey = this.getFullKey(key, scope);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (entry.expires < Date.now()) {
      this.cache.delete(fullKey);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param scope 缓存作用域
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒）
   */
  set(key: string, scope: any[] = [], data: any, ttl: number): void {
    const fullKey = this.getFullKey(key, scope);
    this.cache.set(fullKey, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  /**
   * 清除特定缓存
   * @param key 缓存键
   * @param scope 缓存作用域
   */
  clear(key: string, scope: any[] = []): void {
    const fullKey = this.getFullKey(key, scope);
    this.cache.delete(fullKey);
  }
  
  /**
   * 清除特定作用域的所有缓存
   * @param scope 缓存作用域
   */
  clearScope(scope: any[] = []): void {
    const scopePrefix = JSON.stringify(scope);
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(scopePrefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
  }
  
  /**
   * 构造完整的缓存键
   * @param key 缓存键
   * @param scope 缓存作用域
   * @returns 完整的缓存键
   */
  private getFullKey(key: string, scope: any[] = []): string {
    return `${JSON.stringify(scope)}:${key}`;
  }
}

// 创建全局查询缓存实例
const queryCache = new QueryCache();

// 显示连接参数（开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('Database config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
  });
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'queryUser',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'platform_log',
  waitForConnections: true,
  connectionLimit: 25, // 增加连接数量
  queueLimit: 0,
  enableKeepAlive: true, // 保持连接活跃
  keepAliveInitialDelay: 10000, // 10秒
  namedPlaceholders: true, // 使用命名占位符可提高某些查询的效率
  connectTimeout: 10000, // 连接超时设置为10秒
  dateStrings: true, // 直接返回日期字符串，避免JavaScript日期处理开销
  debug: process.env.NODE_ENV === 'development', // 开发环境下开启调试
});

/**
 * Execute SQL query with parameters and optional caching
 */
export async function query<T = Record<string, unknown>>(
  sql: string, 
  params?: Array<string | number | null | Buffer>,
  cacheTTL: number = 0 // 默认不缓存，单位毫秒
): Promise<T[]> {
  try {
    console.log('执行SQL查询:', {
      sql,
      params,
      cacheTTL
    });
    
    // 如果启用了缓存，尝试从缓存获取结果
    if (cacheTTL > 0) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      const cachedResult = queryCache.get(cacheKey);
      
      if (cachedResult) {
        console.log('Using cached query result');
        return cachedResult as T[];
      }
    }
    
    const startTime = Date.now();
    console.log('开始执行数据库查询...');
    const [rows] = await pool.query(sql, params);
    const queryTime = Date.now() - startTime;
    
    console.log('数据库查询完成:', {
      timeMs: queryTime,
      rowCount: Array.isArray(rows) ? rows.length : 0
    });
    
    // 记录慢查询 (超过1秒的查询)
    if (queryTime > 1000) {
      console.warn(`慢查询 (${queryTime}ms): ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`);
      if (params) console.warn('参数:', params);
    }
    
    // 如果启用了缓存，将结果存入缓存
    if (cacheTTL > 0) {
      const cacheKey = `${sql}:${JSON.stringify(params)}`;
      queryCache.set(cacheKey, [], rows as any, cacheTTL);
    }
    
    return rows as T[];
  } catch (error) {
    console.error('数据库查询错误:', {
      error,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params
    });
    throw error;
  }
}

/**
 * Execute single result SQL query with parameters
 */
export async function querySingle<T = Record<string, unknown>>(
  sql: string, 
  params?: Array<string | number | null | Buffer>,
  cacheTTL: number = 0
): Promise<T | null> {
  try {
    const rows = await query<T>(sql, params, cacheTTL);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute SQL transaction with multiple queries
 */
export async function transaction<T = Record<string, unknown>>(
  queries: Array<{
    sql: string;
    params?: Array<string | number | null | Buffer>;
  }>
): Promise<T[][]> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.query(sql, params);
      results.push(result);
    }
    
    await connection.commit();
    
    return results as T[][];
  } catch (error) {
    await connection.rollback();
    console.error('Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// Export pool for direct access if needed
export { pool };

/**
 * 生成模拟数据
 * @param sql SQL查询语句
 * @param params 查询参数
 * @returns 模拟数据
 */
function generateMockData(sql: string, params: any[]): any {
  // 这里仅用于展示，实际应用中会连接到真正的数据库
  
  // 模拟组织数据
  if (sql.includes('t_org_info')) {
    return [
      { org_id: 'org1', org_name: '兴业' },
      { org_id: 'org2', org_name: 'JD' },
      { org_id: 'org3', org_name: 'JD2' },
      { org_id: 'org4', org_name: 'XD' },
      { org_id: 'org5', org_name: '上海汇通' },
      { org_id: 'org6', org_name: '天创' },
      { org_id: 'org7', org_name: '平台测试机构' },
      { org_id: 'org8', org_name: '福富' },
      { org_id: 'org9', org_name: '黑鹰' }
    ];
  }
  
  // 模拟服务日志数据查询
  if (sql.includes('t_service_log') && sql.includes('COUNT(*)')) {
    // 模拟统计查询
    
    // 判断统计周期类型
    let total = 0;
    if (params[0]?.includes('year') || (params.length > 0 && params[0]?.startsWith('2025-'))) {
      total = 7890970;
    } else if (params[0]?.includes('month')) {
      total = 654321;
    } else {
      total = 24679;
    }
    
    // 按组织分组的统计
    if (sql.includes('GROUP BY') && sql.includes('org_id')) {
      return [
        { org_id: 'org1', org_name: '兴业', total_calls: 12000, valid_calls: 11500, invalid_calls: 500, two_factor_calls: 8000, three_factor_calls: 4000, avg_response_time_ms: 125 },
        { org_id: 'org2', org_name: 'JD', total_calls: 9500, valid_calls: 9300, invalid_calls: 200, two_factor_calls: 6000, three_factor_calls: 3500, avg_response_time_ms: 110 },
        { org_id: 'org3', org_name: 'JD2', total_calls: 8400, valid_calls: 8100, invalid_calls: 300, two_factor_calls: 5500, three_factor_calls: 2900, avg_response_time_ms: 118 },
        { org_id: 'org4', org_name: 'XD', total_calls: 7300, valid_calls: 7000, invalid_calls: 300, two_factor_calls: 4800, three_factor_calls: 2500, avg_response_time_ms: 122 },
        { org_id: 'org5', org_name: '上海汇通', total_calls: 6200, valid_calls: 6000, invalid_calls: 200, two_factor_calls: 4100, three_factor_calls: 2100, avg_response_time_ms: 115 },
        { org_id: 'org6', org_name: '天创', total_calls: 5100, valid_calls: 4900, invalid_calls: 200, two_factor_calls: 3400, three_factor_calls: 1700, avg_response_time_ms: 105 },
        { org_id: 'org7', org_name: '平台测试机构', total_calls: 4000, valid_calls: 3800, invalid_calls: 200, two_factor_calls: 2700, three_factor_calls: 1300, avg_response_time_ms: 95 },
        { org_id: 'org8', org_name: '福富', total_calls: 2900, valid_calls: 2750, invalid_calls: 150, two_factor_calls: 2000, three_factor_calls: 900, avg_response_time_ms: 100 },
        { org_id: 'org9', org_name: '黑鹰', total_calls: 1800, valid_calls: 1700, invalid_calls: 100, two_factor_calls: 1300, three_factor_calls: 500, avg_response_time_ms: 90 }
      ];
    }
    
    // 按结果码分组的统计
    if (sql.includes('result_code')) {
      return [
        { org_id: 'org1', result_code: '0', result_msg: '成功', count: 11000, two_factor_count: 7500, three_factor_count: 3500 },
        { org_id: 'org1', result_code: '200001', result_msg: '参数错误', count: 350, two_factor_count: 200, three_factor_count: 150 },
        { org_id: 'org1', result_code: '200002', result_msg: '验证失败', count: 450, two_factor_count: 250, three_factor_count: 200 },
        { org_id: 'org1', result_code: '200003', result_msg: '余额不足', count: 150, two_factor_count: 80, three_factor_count: 70 },
        { org_id: 'org1', result_code: '200004', result_msg: '超时', count: 50, two_factor_count: 30, three_factor_count: 20 }
      ];
    }
    
    // 默认返回简单统计数据
    return [
      { total: total }
    ];
  }
  
  // 模拟年度调用统计
  if (sql.includes('period') && params.includes('year')) {
    return {
      data: [
        { date: '2025-01', validCalls: 583410, invalidCalls: 12347 },
        { date: '2025-02', validCalls: 620155, invalidCalls: 13589 },
        { date: '2025-03', validCalls: 687432, invalidCalls: 15432 },
        { date: '2025-04', validCalls: 729876, invalidCalls: 16543 },
        { date: '2025-05', validCalls: 793421, invalidCalls: 18765 },
        { date: '2025-06', validCalls: 823546, invalidCalls: 19876 },
        { date: '2025-07', validCalls: 856732, invalidCalls: 20432 },
        { date: '2025-08', validCalls: 901234, invalidCalls: 22345 },
        { date: '2025-09', validCalls: 943215, invalidCalls: 24567 },
        { date: '2025-10', validCalls: 989432, invalidCalls: 26789 },
        { date: '2025-11', validCalls: 1043212, invalidCalls: 28765 },
        { date: '2025-12', validCalls: 1102544, invalidCalls: 30987 }
      ],
      summary: {
        total: 7890970,
        validTotal: 7658210,
        invalidTotal: 232760,
        change: 1430256,
        changePercentage: 18.9
      },
      resultCodes: [
        { result_code: '0', result_msg: '成功', count: 7658210, percentage: 97.05 },
        { result_code: '200001', result_msg: '参数错误', count: 87654, percentage: 1.11 },
        { result_code: '200002', result_msg: '验证失败', count: 76543, percentage: 0.97 },
        { result_code: '200003', result_msg: '余额不足', count: 43210, percentage: 0.55 },
        { result_code: '200004', result_msg: '超时', count: 25353, percentage: 0.32 }
      ]
    };
  }
  
  // 模拟月度调用统计
  if (sql.includes('period') && params.includes('month')) {
    return {
      data: [
        { date: '2025-03-01', validCalls: 21543, invalidCalls: 456 },
        { date: '2025-03-02', validCalls: 20987, invalidCalls: 432 },
        { date: '2025-03-03', validCalls: 22345, invalidCalls: 476 },
        { date: '2025-03-04', validCalls: 22876, invalidCalls: 487 },
        { date: '2025-03-05', validCalls: 23456, invalidCalls: 498 },
        { date: '2025-03-06', validCalls: 23987, invalidCalls: 512 },
        { date: '2025-03-07', validCalls: 24532, invalidCalls: 543 },
        { date: '2025-03-08', validCalls: 24876, invalidCalls: 532 },
        { date: '2025-03-09', validCalls: 24321, invalidCalls: 521 },
        { date: '2025-03-10', validCalls: 23987, invalidCalls: 512 },
        { date: '2025-03-11', validCalls: 23543, invalidCalls: 498 },
        { date: '2025-03-12', validCalls: 22987, invalidCalls: 476 },
        { date: '2025-03-13', validCalls: 23456, invalidCalls: 487 },
        { date: '2025-03-14', validCalls: 23987, invalidCalls: 512 },
        { date: '2025-03-15', validCalls: 24321, invalidCalls: 521 },
        { date: '2025-03-16', validCalls: 24876, invalidCalls: 532 },
        { date: '2025-03-17', validCalls: 24532, invalidCalls: 543 },
        { date: '2025-03-18', validCalls: 23987, invalidCalls: 512 },
        { date: '2025-03-19', validCalls: 23456, invalidCalls: 498 },
        { date: '2025-03-20', validCalls: 22987, invalidCalls: 476 },
        { date: '2025-03-21', validCalls: 22345, invalidCalls: 432 },
        { date: '2025-03-22', validCalls: 21987, invalidCalls: 421 },
        { date: '2025-03-23', validCalls: 21543, invalidCalls: 409 },
        { date: '2025-03-24', validCalls: 21098, invalidCalls: 398 },
        { date: '2025-03-25', validCalls: 21654, invalidCalls: 412 },
        { date: '2025-03-26', validCalls: 22345, invalidCalls: 432 },
        { date: '2025-03-27', validCalls: 22876, invalidCalls: 456 },
        { date: '2025-03-28', validCalls: 23456, invalidCalls: 487 },
        { date: '2025-03-29', validCalls: 23987, invalidCalls: 512 },
        { date: '2025-03-30', validCalls: 24321, invalidCalls: 543 },
        { date: '2025-03-31', validCalls: 24532, invalidCalls: 532 }
      ],
      summary: {
        total: 654321,
        validTotal: 639876,
        invalidTotal: 14445,
        change: 32154,
        changePercentage: 4.9
      },
      resultCodes: [
        { result_code: '0', result_msg: '成功', count: 639876, percentage: 97.78 },
        { result_code: '200001', result_msg: '参数错误', count: 5432, percentage: 0.83 },
        { result_code: '200002', result_msg: '验证失败', count: 4321, percentage: 0.66 },
        { result_code: '200003', result_msg: '余额不足', count: 3210, percentage: 0.49 },
        { result_code: '200004', result_msg: '超时', count: 1482, percentage: 0.23 }
      ]
    };
  }
  
  // 模拟日度调用统计
  if (sql.includes('period') && params.includes('day')) {
    return {
      data: [
        { date: '2025-03-19 00:00', validCalls: 890, invalidCalls: 21 },
        { date: '2025-03-19 01:00', validCalls: 456, invalidCalls: 12 },
        { date: '2025-03-19 02:00', validCalls: 234, invalidCalls: 8 },
        { date: '2025-03-19 03:00', validCalls: 123, invalidCalls: 5 },
        { date: '2025-03-19 04:00', validCalls: 98, invalidCalls: 4 },
        { date: '2025-03-19 05:00', validCalls: 234, invalidCalls: 6 },
        { date: '2025-03-19 06:00', validCalls: 567, invalidCalls: 14 },
        { date: '2025-03-19 07:00', validCalls: 987, invalidCalls: 23 },
        { date: '2025-03-19 08:00', validCalls: 1543, invalidCalls: 32 },
        { date: '2025-03-19 09:00', validCalls: 1876, invalidCalls: 39 },
        { date: '2025-03-19 10:00', validCalls: 2345, invalidCalls: 45 },
        { date: '2025-03-19 11:00', validCalls: 2543, invalidCalls: 48 },
        { date: '2025-03-19 12:00', validCalls: 2234, invalidCalls: 44 },
        { date: '2025-03-19 13:00', validCalls: 2456, invalidCalls: 46 },
        { date: '2025-03-19 14:00', validCalls: 2654, invalidCalls: 49 },
        { date: '2025-03-19 15:00', validCalls: 2876, invalidCalls: 52 },
        { date: '2025-03-19 16:00', validCalls: 2543, invalidCalls: 48 },
        { date: '2025-03-19 17:00', validCalls: 2345, invalidCalls: 45 },
        { date: '2025-03-19 18:00', validCalls: 1987, invalidCalls: 41 },
        { date: '2025-03-19 19:00', validCalls: 1765, invalidCalls: 37 },
        { date: '2025-03-19 20:00', validCalls: 1543, invalidCalls: 32 },
        { date: '2025-03-19 21:00', validCalls: 1234, invalidCalls: 27 },
        { date: '2025-03-19 22:00', validCalls: 987, invalidCalls: 23 },
        { date: '2025-03-19 23:00', validCalls: 765, invalidCalls: 19 }
      ],
      summary: {
        total: 24679,
        validTotal: 24532,
        invalidTotal: 147,
        change: 1543,
        changePercentage: 6.3
      },
      resultCodes: [
        { result_code: '0', result_msg: '成功', count: 24532, percentage: 99.4 },
        { result_code: '200001', result_msg: '参数错误', count: 65, percentage: 0.26 },
        { result_code: '200002', result_msg: '验证失败', count: 45, percentage: 0.18 },
        { result_code: '200003', result_msg: '余额不足', count: 25, percentage: 0.1 },
        { result_code: '200004', result_msg: '超时', count: 12, percentage: 0.05 }
      ]
    };
  }
  
  // 模拟组织统计数据查询
  if (sql.includes('org-stats') || sql.includes('organizations') && sql.includes('service_logs')) {
    console.log('返回模拟组织统计数据...');
    
    // 判断统计周期类型
    if (params[0]?.includes('year') || (params.length > 0 && String(params[0]).startsWith('2025-01'))) {
      return [
        { org_id: 'org1', organizationName: '兴业', total: 12000, validTotal: 11500, totalCalls: 12000, validCalls: 11500 },
        { org_id: 'org2', organizationName: 'JD', total: 9500, validTotal: 9300, totalCalls: 9500, validCalls: 9300 },
        { org_id: 'org3', organizationName: 'JD2', total: 8400, validTotal: 8100, totalCalls: 8400, validCalls: 8100 },
        { org_id: 'org4', organizationName: 'XD', total: 7300, validTotal: 7000, totalCalls: 7300, validCalls: 7000 },
        { org_id: 'org5', organizationName: '上海汇通', total: 6200, validTotal: 6000, totalCalls: 6200, validCalls: 6000 },
        { org_id: 'org6', organizationName: '天创', total: 5100, validTotal: 4900, totalCalls: 5100, validCalls: 4900 },
        { org_id: 'org7', organizationName: '平台测试机构', total: 4000, validTotal: 3800, totalCalls: 4000, validCalls: 3800 },
        { org_id: 'org8', organizationName: '福富', total: 2900, validTotal: 2750, totalCalls: 2900, validCalls: 2750 },
        { org_id: 'org9', organizationName: '黑鹰', total: 1800, validTotal: 1700, totalCalls: 1800, validCalls: 1700 }
      ];
    } else if (params[0]?.includes('month') || (params.length > 0 && String(params[0]).startsWith('2025-03-01'))) {
      return [
        { org_id: 'org1', organizationName: '兴业', total: 9800, validTotal: 9600, totalCalls: 9800, validCalls: 9600 },
        { org_id: 'org2', organizationName: 'JD', total: 8700, validTotal: 8500, totalCalls: 8700, validCalls: 8500 },
        { org_id: 'org3', organizationName: 'JD2', total: 7600, validTotal: 7400, totalCalls: 7600, validCalls: 7400 },
        { org_id: 'org4', organizationName: 'XD', total: 6500, validTotal: 6300, totalCalls: 6500, validCalls: 6300 },
        { org_id: 'org5', organizationName: '上海汇通', total: 5400, validTotal: 5200, totalCalls: 5400, validCalls: 5200 },
        { org_id: 'org6', organizationName: '天创', total: 4300, validTotal: 4100, totalCalls: 4300, validCalls: 4100 },
        { org_id: 'org7', organizationName: '平台测试机构', total: 3200, validTotal: 3000, totalCalls: 3200, validCalls: 3000 },
        { org_id: 'org8', organizationName: '福富', total: 2100, validTotal: 1900, totalCalls: 2100, validCalls: 1900 },
        { org_id: 'org9', organizationName: '黑鹰', total: 1000, validTotal: 800, totalCalls: 1000, validCalls: 800 }
      ];
    } else {
      return [
        { org_id: 'org1', organizationName: '兴业', total: 950, validTotal: 920, totalCalls: 950, validCalls: 920 },
        { org_id: 'org2', organizationName: 'JD', total: 850, validTotal: 830, totalCalls: 850, validCalls: 830 },
        { org_id: 'org3', organizationName: 'JD2', total: 750, validTotal: 730, totalCalls: 750, validCalls: 730 },
        { org_id: 'org4', organizationName: 'XD', total: 650, validTotal: 630, totalCalls: 650, validCalls: 630 },
        { org_id: 'org5', organizationName: '上海汇通', total: 550, validTotal: 530, totalCalls: 550, validCalls: 530 },
        { org_id: 'org6', organizationName: '天创', total: 450, validTotal: 430, totalCalls: 450, validCalls: 430 },
        { org_id: 'org7', organizationName: '平台测试机构', total: 350, validTotal: 330, totalCalls: 350, validCalls: 330 },
        { org_id: 'org8', organizationName: '福富', total: 250, validTotal: 230, totalCalls: 250, validCalls: 230 },
        { org_id: 'org9', organizationName: '黑鹰', total: 150, validTotal: 130, totalCalls: 150, validCalls: 130 }
      ];
    }
  }
  
  // 默认返回空数组
  return [];
}

// 导出缓存实例，便于在其他模块中操作缓存
export { queryCache }; 