/**
 * Organization usage data table component
 */

import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getPaginationRowModel,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Building, Check } from 'lucide-react';
import { OrgUsageData } from '@/types';

interface OrgUsageTableProps {
  data: OrgUsageData[];
  isLoading: boolean;
  onSelectOrg?: (orgId: string) => void;
  selectedOrgId?: string | null;
}

export default function OrgUsageTable({ 
  data, 
  isLoading, 
  onSelectOrg,
  selectedOrgId 
}: OrgUsageTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'total_usage',
      desc: true,
    },
  ]);
  
  const columns = [
    {
      accessorKey: 'org_name',
      header: '组织名称',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue('org_name')}</span>
          {selectedOrgId === row.original.org_id && (
            <Check className="h-4 w-4 text-green-500 ml-1" />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'total_usage',
      header: () => <div className="text-right">调用次数</div>,
      cell: ({ row }: any) => (
        <div className="text-right font-medium">
          {new Intl.NumberFormat('zh-CN').format(row.getValue('total_usage'))}
        </div>
      ),
    },
    {
      accessorKey: 'success_count',
      header: () => <div className="text-right">成功次数</div>,
      cell: ({ row }: any) => (
        <div className="text-right font-medium">
          {new Intl.NumberFormat('zh-CN').format(row.getValue('success_count'))}
        </div>
      ),
    },
    {
      accessorKey: 'avg_response_time',
      header: () => <div className="text-right">平均响应时间(ms)</div>,
      cell: ({ row }: any) => (
        <div className="text-right font-medium">
          {new Intl.NumberFormat('zh-CN').format(row.getValue('avg_response_time'))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => (
        <div className="text-right">
          <button 
            className="p-1 hover:bg-accent rounded-full"
            onClick={() => onSelectOrg && onSelectOrg(row.original.org_id)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
  
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });
  
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">暂无组织使用数据</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border bg-card">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom">
          <thead className="border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'flex items-center gap-1 cursor-pointer select-none'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        
                        {{
                          asc: <ChevronUp className="h-4 w-4" />,
                          desc: <ChevronDown className="h-4 w-4" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr 
                key={row.id} 
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onSelectOrg && onSelectOrg(row.original.org_id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-4 align-middle"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-end p-4 border-t">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </button>
          <span className="text-sm text-muted-foreground">
            第 {table.getState().pagination.pageIndex + 1} 页，
            共 {table.getPageCount()} 页
          </span>
          <button
            className="p-2 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
} 