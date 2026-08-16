export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className='page-header flex-wrap gap-4'>
      <div><h1 className='page-title'>{title}</h1>{subtitle && <p className='page-subtitle'>{subtitle}</p>}</div>
      {action && <div>{action}</div>}
    </div>
  )
}
