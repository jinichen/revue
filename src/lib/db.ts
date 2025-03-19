/**
 * Database connection utility
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 简单的内存缓存实现
interface CacheItem<T> {
  data: T;
  expiry: number;
}

class QueryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  // 生成缓存键
  private generateKey(sql: string, params?: any[]): string {
    return `${sql}:${params ? JSON.stringify(params) : ''}`;
  }
  
  // 获取缓存数据
  get<T>(sql: string, params?: any[]): T | null {
    const key = this.generateKey(sql, params);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  // 设置缓存数据
  set<T>(sql: string, params: any[] | undefined, data: T, ttlMs: number): void {
    const key = this.generateKey(sql, params);
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
  }
  
  // 清除缓存
  clear(): void {
    this.cache.clear();
  }
  
  // 清除特定查询的缓存
  invalidate(sql: string, params?: any[]): void {
    const key = this.generateKey(sql, params);
    this.cache.delete(key);
  }
}

// 创建查询缓存实例
const queryCache = new QueryCache();

// 显示连接参数（开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('DB Connection Params:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    // 出于安全原因不显示密码
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
    // 尝试从缓存获取
    if (cacheTTL > 0) {
      const cachedResult = queryCache.get<T[]>(sql, params);
      if (cachedResult) {
        return cachedResult;
      }
    }
    
    const startTime = Date.now();
    const [rows] = await pool.query(sql, params);
    const queryTime = Date.now() - startTime;
    
    // 记录慢查询 (超过1秒的查询)
    if (queryTime > 1000) {
      console.warn(`慢查询 (${queryTime}ms): ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`);
      if (params) console.warn('参数:', params);
    }
    
    // 设置缓存
    if (cacheTTL > 0) {
      queryCache.set<T[]>(sql, params, rows as T[], cacheTTL);
    }
    
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', sql);
    console.error('Params:', params);
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

// 导出缓存实例以便外部使用
export { queryCache }; 