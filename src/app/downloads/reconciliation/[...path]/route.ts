import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 常用文件类型的MIME映射
const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.html': 'text/html',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 验证参数
    if (!params?.path || !Array.isArray(params.path) || params.path.length === 0) {
      return NextResponse.json(
        { error: 'Invalid path parameter' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'reconciliation', ...params.path);
    
    // 安全检查 - 防止目录遍历攻击
    const safeBasePath = path.resolve(path.join(process.cwd(), 'public', 'downloads', 'reconciliation'));
    const resolvedPath = path.resolve(filePath);
    
    if (!resolvedPath.startsWith(safeBasePath)) {
      console.error(`Security warning: Attempted path traversal to ${resolvedPath}`);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return NextResponse.json(
          { error: 'Not a file' },
          { status: 404 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileContent = fs.readFileSync(filePath);
    
    // 确定内容类型
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // 获取文件名
    const fileName = path.basename(filePath);
    
    // 返回文件响应
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 