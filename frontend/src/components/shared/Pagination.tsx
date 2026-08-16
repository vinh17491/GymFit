import { ArrowLeft, ArrowRight } from 'lucide-react';

export type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, total, loading = false, onPageChange }: PaginationProps) {
  const pages = Math.max(1, totalPages);
  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400 sm:flex-row">
      <span>{total} records · Trang {Math.min(page, pages)}/{pages}</span>
      <div className="flex gap-2">
        <button
          type="button"
          className="secondary-button inline-flex items-center gap-1"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft size={15} /> Trước
        </button>
        <button
          type="button"
          className="secondary-button inline-flex items-center gap-1"
          disabled={loading || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
