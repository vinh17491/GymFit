import { cn } from '../../lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '../ui/empty-state';

interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, loading, onRowClick, emptyTitle = 'No data', emptyDescription, pageSize = 10,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey], bVal = b[sortKey];
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {columns.map((_, j) => (
              <div key={j} className="h-4 bg-dark-800 animate-pulse rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  className="table-header cursor-pointer select-none"
                  style={c.width ? { width: c.width } : undefined}
                  onClick={() => c.sortable !== false && handleSort(c.key)}
                >
                  <div className="flex items-center gap-1">
                    {c.header}
                    {sortKey === c.key ? (
                      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : <ChevronsUpDown size={14} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={row.id || i}
                className={cn('hover:bg-dark-800/50 transition-colors', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(c => (
                  <td key={c.key} className="table-cell">{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
          <span className="text-xs text-dark-400">{data.length} total</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={cn(
                  'w-8 h-8 rounded text-xs font-medium transition-colors',
                  page === i + 1 ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
