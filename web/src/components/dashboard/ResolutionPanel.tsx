import { ArrowUpRight, CheckCircle2, CircleHelp, Headset, Sparkles } from 'lucide-react'

export function ResolutionPanel() {
  return (
    <section className="panel resolution-panel">
      <div className="panel-heading">
        <div>
          <h2>AI resolution rate</h2>
          <p>How often your copilot resolves a conversation.</p>
        </div>
        <button className="icon-button subtle-button" aria-label="Resolution rate information"><CircleHelp size={17} /></button>
      </div>
      <div className="resolution-content">
        <div className="donut-chart" role="img" aria-label="82.4 percent of conversations resolved by AI">
          <div className="donut-center"><strong>82.4%</strong><span>Resolved by AI</span></div>
        </div>
        <div className="resolution-legend">
          <div><i className="legend-dot dot-resolved" /><span>AI resolved</span><strong>82.4%</strong></div>
          <div><i className="legend-dot dot-escalated" /><span>Human support</span><strong>12.8%</strong></div>
          <div><i className="legend-dot dot-open" /><span>Still open</span><strong>4.8%</strong></div>
        </div>
      </div>
      <div className="resolution-footer"><span><Sparkles size={15} /> Up 4.2% from last month</span><ArrowUpRight size={16} /></div>
    </section>
  )
}

export function AgentHealthPanel() {
  return (
    <section className="agent-health-panel">
      <div className="agent-health-top">
        <div className="agent-sparkle"><Sparkles size={17} /></div>
        <span className="online-indicator"><i /> All systems operational</span>
      </div>
      <h3>Your copilot is looking good.</h3>
      <p>Your assistant is responding normally and your knowledge base is up to date.</p>
      <div className="health-stats">
        <div><CheckCircle2 size={15} /><span>Knowledge synced</span></div>
        <div><Headset size={15} /><span>Human handoff ready</span></div>
      </div>
    </section>
  )
}
