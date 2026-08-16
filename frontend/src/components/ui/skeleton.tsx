export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['skeleton', className].join(' ')} />
}

export function CardSkeleton() {
  return (
    <div className='card space-y-4'>
      <div className='flex items-center justify-between'><Skeleton className='h-4 w-24' /><Skeleton className='h-8 w-8 rounded-lg' /></div>
      <Skeleton className='h-8 w-20' />
      <Skeleton className='h-3 w-16' />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className='space-y-3'>{Array.from({length: rows}).map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}</div>
}
