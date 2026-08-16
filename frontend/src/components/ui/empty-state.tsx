import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 text-dark-500">
        {icon || <Inbox size={28} />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-dark-400 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
