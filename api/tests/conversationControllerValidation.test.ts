import { describe, expect, it } from 'vitest'
import {
  createConversationSchema,
  sendConversationMessageSchema,
} from '../src/controllers/conversationController.js'

describe('conversation request validation', () => {
  it('accepts a dashboard conversation with customer identity and first message', () => {
    expect(createConversationSchema.safeParse({
      customer: { displayName: 'Website visitor', email: 'visitor@example.com' },
      subject: 'Order help',
      initialMessage: 'I need help tracking my order.',
    }).success).toBe(true)
  })

  it('rejects missing customer identity and blank first messages', () => {
    expect(createConversationSchema.safeParse({
      customer: { displayName: ' ' },
      initialMessage: '   ',
    }).success).toBe(false)
  })

  it('rejects invalid customer email addresses', () => {
    expect(createConversationSchema.safeParse({
      customer: { displayName: 'Visitor', email: 'not-an-email' },
      initialMessage: 'Hello',
    }).success).toBe(false)
  })

  it('accepts a non-empty customer message', () => {
    expect(sendConversationMessageSchema.safeParse({
      content: 'Can you check my order?',
    }).success).toBe(true)
  })

  it('rejects blank and oversized messages', () => {
    expect(sendConversationMessageSchema.safeParse({ content: '  ' }).success).toBe(false)
    expect(sendConversationMessageSchema.safeParse({ content: 'x'.repeat(20_001) }).success).toBe(false)
  })
})
