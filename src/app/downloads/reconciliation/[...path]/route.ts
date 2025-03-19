import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 导出目录
const EXPORT_DIR = path.join(process.cwd(), 'public', 'exports', 'reconciliation');

// 简单的 MIME 类型映射
const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.pdf': 'application/pdf'
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 等待路由参数
    const pathSegments = await Promise.resolve(params.path);
    const filePath = path.join(EXPORT_DIR, ...pathSegments);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('文件不存在:', filePath);
      return new NextResponse('文件不存在', { status: 404 });
    }

    // 读取文件
    const file = await fs.readFile(filePath);
    
    // 获取文件类型
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // 对文件名进行编码
    const fileName = encodeURIComponent(path.basename(filePath));
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);

    return new NextResponse(file, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('下载文件失败:', error);
    return new NextResponse(
      error instanceof Error ? error.message : '下载文件失败',
      { status: 500 }
    );
  }
} 