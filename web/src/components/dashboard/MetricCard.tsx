import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from 'lucide-react'

type MetricCardProps = {
  label: string
  value: string
  change: string
  comparison: string
  positive?: boolean
  icon: ReactNode
  iconTone: string
}

export function MetricCard({ label, value, change, comparison, positive = true, icon, iconTone }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <div className={`metric-icon ${iconTone}`}>{icon}</div>
        <span className="icon-button subtle-button" aria-hidden="true">
          <MoreHorizontal size={18} />
        </span>
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <strong className="metric-value">{value}</strong>
        <span className={`metric-change ${positive ? 'change-positive' : 'change-negative'}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      </div>
      <p className="metric-comparison">{comparison}</p>
    </article>
  )
}
