import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'default';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'badge',
      {
        'badge-green': variant === 'green',
        'badge-yellow': variant === 'yellow',
        'badge-red': variant === 'red',
        'badge-blue': variant === 'blue',
        'badge-purple': variant === 'purple',
        'bg-dark-700 text-dark-300': variant === 'default',
      },
      className
    )}>
      {children}
    </span>
  );
}
