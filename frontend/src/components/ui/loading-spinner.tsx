import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={cn('loading-state flex flex-col items-center justify-center gap-3 py-12', className)} role="status" aria-live="polite">
      <Loader2 className={cn('animate-spin text-primary-500', sizes[size])} />
      {text && <p className="text-sm text-dark-400">{text}</p>}
    </div>
  );
}
