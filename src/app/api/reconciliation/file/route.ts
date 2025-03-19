import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 获取预生成的对账单文件
 * @route GET /api/reconciliation/file
 * @param {string} fileName - 文件名，格式为 {orgId}_{date}_对账单.md
 */
export async function GET(request: NextRequest) {
  try {
    // 获取文件名参数
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json(
        { error: '请提供文件名参数' },
        { status: 400 }
      );
    }

    // 从环境变量中获取对账单存储目录
    const reconciliationDir = process.env.RECONCILIATION_EXPORT_DIR || './data/reconciliation';
    
    // 安全检查：防止目录遍历攻击
    const sanitizedFileName = path.basename(fileName);
    const filePath = path.join(process.cwd(), reconciliationDir, sanitizedFileName);

    try {
      // 检查文件是否存在
      await fs.access(filePath);
      
      // 读取文件内容
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `inline; filename="${sanitizedFileName}"`,
        },
      });
    } catch (error) {
      console.error('文件不存在或无法访问:', filePath, error);
      return NextResponse.json(
        { error: '对账单文件不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('获取对账单文件失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 