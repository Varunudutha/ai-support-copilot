import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { chartSeries, type ChartRange } from '../../data/dashboard'

const chartWidth = 720
const chartHeight = 224
const padding = { top: 16, right: 12, bottom: 12, left: 12 }

function getPoints(values: readonly number[]) {
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  return values.map((value, index) => ({
    x: padding.left + (index / (values.length - 1)) * innerWidth,
    y: padding.top + innerHeight - (value / 100) * innerHeight,
  }))
}

function linePath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function areaPath(points: { x: number; y: number }[]) {
  const baseline = chartHeight - padding.bottom
  return `${linePath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
}

export function ConversationChart({ range, setRange }: { range: ChartRange; setRange: (value: ChartRange) => void }) {
  const series = chartSeries[range]
  const points = useMemo(() => ({ current: getPoints(series.current), previous: getPoints(series.previous) }), [series])
  const currentPath = linePath(points.current)
  const previousPath = linePath(points.previous)

  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading">
        <div>
          <div className="eyebrow">CONVERSATION VOLUME</div>
          <div className="chart-total-row"><strong>{series.total}</strong><span className="chart-trend"><ArrowUpRight size={14} /> 18.6%</span></div>
          <p>Total conversations in the selected period</p>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot legend-current" /> This period</span>
          <span><i className="legend-dot legend-previous" /> Previous period</span>
        </div>
        <div className="range-switcher" role="group" aria-label="Chart time range">
          {(['7 days', '30 days', '90 days'] as const).map((option) => (
            <button key={option} className={range === option ? 'range-option range-option-active' : 'range-option'} onClick={() => setRange(option)}>{option}</button>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <div className="chart-y-labels"><span>2.0k</span><span>1.5k</span><span>1.0k</span><span>500</span><span>0</span></div>
        <svg className="activity-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Conversation volume trend for the last ${range}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="currentFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5b6cf5" stopOpacity=".16" />
              <stop offset="100%" stopColor="#5b6cf5" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((line) => {
            const y = padding.top + (line / 4) * (chartHeight - padding.top - padding.bottom)
            return <line key={line} x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="chart-grid-line" />
          })}
          <path d={areaPath(points.current)} fill="url(#currentFill)" />
          <path d={previousPath} className="chart-line chart-line-previous" />
          <path d={currentPath} className="chart-line chart-line-current" />
          {points.current.filter((_, index) => index % 3 === 0).map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="3.5" className="chart-point" />
          ))}
        </svg>
      </div>
      <div className="chart-x-labels">{series.labels.map((label) => <span key={label}>{label}</span>)}</div>
    </section>
  )
}
