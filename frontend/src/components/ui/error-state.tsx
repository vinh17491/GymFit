export default function ErrorState({ message = 'Something went wrong', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className='empty-state'>
      <div className='empty-state-icon bg-red-500/10'><svg className='w-6 h-6 text-red-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'/></svg></div>
      <h3 className='text-lg font-medium text-white mb-1'>Error</h3>
      <p className='text-sm text-[#94A3B8] mb-4'>{message}</p>
      {onRetry && <button onClick={onRetry} className='btn-primary btn-sm'>Try Again</button>}
    </div>
  )
}
