/**
 * Script to check database table structure
 */

import { query, closePool } from '../src/lib/db';

async function checkTableStructure() {
  try {
    // 获取 t_org_info 表结构
    console.log('======= t_org_info Table Structure =======');
    const orgInfoColumns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 't_org_info'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(orgInfoColumns, null, 2));
    
    // 获取 t_service_log 表结构
    console.log('\n======= t_service_log Table Structure =======');
    const serviceLogColumns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 't_service_log'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(serviceLogColumns, null, 2));
    
    // 检查是否存在 t_third_service_log 表
    console.log('\n======= Checking for t_third_service_log Table =======');
    const tables = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 't_third_service_log'
    `);
    
    if (tables.length > 0) {
      console.log('t_third_service_log table exists, checking structure:');
      const thirdServiceLogColumns = await query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 't_third_service_log'
        ORDER BY ORDINAL_POSITION
      `);
      console.log(JSON.stringify(thirdServiceLogColumns, null, 2));
    } else {
      console.log('t_third_service_log table does not exist.');
    }
    
    // 获取一些示例数据
    console.log('\n======= Sample data from t_org_info =======');
    const orgSample = await query('SELECT * FROM t_org_info LIMIT 3');
    console.log(JSON.stringify(orgSample, null, 2));
    
    console.log('\n======= Sample data from t_service_log =======');
    const logSample = await query('SELECT * FROM t_service_log LIMIT 3');
    console.log(JSON.stringify(logSample, null, 2));
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  } finally {
    await closePool();
  }
}

// dotenv 配置已在 db.ts 中加载
checkTableStructure(); 