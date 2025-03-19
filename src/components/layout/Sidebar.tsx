/**
 * Sidebar component for main navigation
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import useAppStore from '@/hooks/useAppStore';
import { BarChart, FileText, Settings, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  
  const navItems = [
    {
      name: '仪表盘',
      path: '/dashboard',
      icon: <BarChart className="h-5 w-5" />
    },
    {
      name: '账单',
      path: '/billing',
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: '对账单',
      path: '/reconciliation',
      icon: <FileSpreadsheet className="h-5 w-5" />
    },
    {
      name: '设置',
      path: '/settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];
  
  return (
    <div
      className={cn(
        'h-screen bg-card fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 border-r',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex items-center h-16 border-b px-4">
        {sidebarOpen && (
          <h1 className="text-lg font-semibold">运营平台</h1>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-full hover:bg-accent ml-auto',
            !sidebarOpen && 'mx-auto'
          )}
          aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={cn(
                  'flex items-center px-4 py-3 text-sm rounded-none hover:bg-accent',
                  pathname.startsWith(item.path) ? 'bg-accent' : '',
                  sidebarOpen ? 'justify-start' : 'justify-center'
                )}
              >
                {item.icon}
                {sidebarOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="border-t p-4">
        {sidebarOpen ? (
          <div className="text-xs text-muted-foreground">
            版本 v1.0.0
          </div>
        ) : null}
      </div>
    </div>
  );
} 