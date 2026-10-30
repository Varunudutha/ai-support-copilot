import { ArrowUpRight, MessageCircle, MoreHorizontal } from 'lucide-react'
import type { Conversation } from '../../data/dashboard'

type ConversationTableProps = {
  conversations: Conversation[]
  onViewAll: () => void
}

export function ConversationTable({ conversations, onViewAll }: ConversationTableProps) {
  return (
    <section className="panel conversation-panel">
      <div className="panel-heading conversation-heading">
        <div>
          <h2>Recent conversations</h2>
          <p>A snapshot of your latest customer interactions.</p>
        </div>
        <button className="text-button" onClick={onViewAll}>
          View all <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="table-scroll">
        <table className="conversation-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Conversation</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Last activity</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="customer-cell">
                    <span className={`avatar avatar-${item.tone}`}>{item.initials}</span>
                    <span className="customer-name-wrap">
                      <strong>{item.customer}</strong>
                      <small>{item.email}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <div className="subject-cell">
                    <strong>{item.subject}</strong>
                    <small>{item.id}</small>
                  </div>
                </td>
                <td><span className="channel-label"><MessageCircle size={14} /> {item.channel}</span></td>
                <td><span className={`status-pill status-${item.status.toLowerCase().replace(' ', '-')}`}><i />{item.status}</span></td>
                <td className="activity-time">{item.time}</td>
                <td><span className="icon-button subtle-button" aria-hidden="true"><MoreHorizontal size={17} /></span></td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr><td className="empty-table" colSpan={6}>No conversations match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
