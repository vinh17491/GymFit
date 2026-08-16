import { cn } from '../../lib/utils';

export default function Card({ children, className = '', hover = false, ...props }: { children: React.ReactNode; className?: string; hover?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-5 sm:p-6', hover && 'card-hover', className)} {...props}>{children}</div>
}
