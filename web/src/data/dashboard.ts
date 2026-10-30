export type ConversationStatus = 'Resolved' | 'Escalated' | 'In progress'

export interface Conversation {
  id: string
  customer: string
  initials: string
  email: string
  subject: string
  channel: string
  time: string
  status: ConversationStatus
  tone: 'violet' | 'blue' | 'amber' | 'green' | 'rose'
}

export const conversations: Conversation[] = [
  {
    id: '#CON-8492',
    customer: 'Olivia Rhye',
    initials: 'OR',
    email: 'olivia.rhye@email.com',
    subject: 'Question about my recent order',
    channel: 'Website chat',
    time: '2 min ago',
    status: 'Resolved',
    tone: 'violet',
  },
  {
    id: '#CON-8491',
    customer: 'Phoenix Baker',
    initials: 'PB',
    email: 'phoenix.baker@email.com',
    subject: 'Unable to update billing details',
    channel: 'Website chat',
    time: '8 min ago',
    status: 'Escalated',
    tone: 'blue',
  },
  {
    id: '#CON-8490',
    customer: 'Lana Steiner',
    initials: 'LS',
    email: 'lana.steiner@email.com',
    subject: 'Do you offer international shipping?',
    channel: 'Website chat',
    time: '14 min ago',
    status: 'Resolved',
    tone: 'amber',
  },
  {
    id: '#CON-8489',
    customer: 'Demi Wilkinson',
    initials: 'DW',
    email: 'demi.wilkinson@email.com',
    subject: 'Product compatibility question',
    channel: 'Website chat',
    time: '21 min ago',
    status: 'In progress',
    tone: 'green',
  },
  {
    id: '#CON-8488',
    customer: 'Candice Wu',
    initials: 'CW',
    email: 'candice.wu@email.com',
    subject: 'Requesting a copy of my invoice',
    channel: 'Website chat',
    time: '32 min ago',
    status: 'Resolved',
    tone: 'rose',
  },
]

export const chartSeries = {
  '7 days': {
    current: [26, 35, 31, 47, 42, 56, 51, 68, 61, 76, 69, 88, 82],
    previous: [18, 24, 22, 30, 27, 39, 35, 42, 40, 48, 46, 55, 51],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    total: '8,429',
  },
  '30 days': {
    current: [18, 28, 24, 39, 34, 49, 42, 58, 53, 67, 61, 78, 72],
    previous: [14, 19, 18, 26, 24, 34, 31, 39, 35, 44, 41, 49, 46],
    labels: ['Oct 1', 'Oct 5', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 25', 'Oct 30'],
    total: '24,892',
  },
  '90 days': {
    current: [14, 23, 21, 31, 29, 42, 38, 51, 48, 63, 58, 74, 82],
    previous: [10, 16, 15, 22, 20, 29, 25, 34, 32, 39, 37, 44, 49],
    labels: ['Aug 1', 'Aug 15', 'Sep 1', 'Sep 15', 'Oct 1', 'Oct 15', 'Oct 30'],
    total: '71,306',
  },
} as const

export type ChartRange = keyof typeof chartSeries
