import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Conversation, conversationChannels, conversationStatuses } from '../src/models/Conversation.js'
import { Message, messageSenderTypes } from '../src/models/Message.js'

describe('Conversation model', () => {
  it('applies safe defaults and normalizes customer email via customerId', () => {
    const conversation = new Conversation({
      workspaceId: new Types.ObjectId(),
      channel: 'dashboard',
      customerId: new Types.ObjectId(),
    })

    expect(conversation.status).toBe('open')
    expect(conversation.messageCount).toBe(0)
    expect(conversation.assignedTo).toBeNull()
    expect(conversation.validateSync()).toBeUndefined()
  })

  it('requires workspace, channel, and customerId', () => {
    const conversation = new Conversation({})

    const error = conversation.validateSync()
    expect(error?.errors.workspaceId).toBeDefined()
    expect(error?.errors.channel).toBeDefined()
    expect(error?.errors.customerId).toBeDefined()
  })

  it('restricts channel and status to supported values', () => {
    expect(conversationChannels).toEqual(['dashboard', 'widget'])
    expect(conversationStatuses).toEqual(['open', 'pending', 'closed'])

    const conversation = new Conversation({
      workspaceId: new Types.ObjectId(),
      channel: 'email',
      status: 'archived',
      customerId: new Types.ObjectId(),
    })

    const error = conversation.validateSync()
    expect(error?.errors.channel).toBeDefined()
    expect(error?.errors.status).toBeDefined()
  })

  it('defines workspace-first compound indexes for inbox queries', () => {
    const indexKeys = Conversation.schema.indexes().map(([keys]) => keys)
    expect(indexKeys).toContainEqual({ workspaceId: 1, status: 1, lastMessageAt: -1 })
    expect(indexKeys).toContainEqual({ workspaceId: 1, customerId: 1, updatedAt: -1 })
  })
})

describe('Message model', () => {
  it('validates a customer message and defaults citations to an empty list', () => {
    const message = new Message({
      workspaceId: new Types.ObjectId(),
      conversationId: new Types.ObjectId(),
      senderType: 'customer',
      content: 'I need help with my order.',
    })

    expect(message.citations).toEqual([])
    expect(message.senderId).toBeNull()
    expect(message.validateSync()).toBeUndefined()
  })

  it('requires workspace, conversation, sender type, and message content', () => {
    const message = new Message({})
    const error = message.validateSync()

    expect(error?.errors.workspaceId).toBeDefined()
    expect(error?.errors.conversationId).toBeDefined()
    expect(error?.errors.senderType).toBeDefined()
    expect(error?.errors.content).toBeDefined()
  })

  it('restricts sender types to supported actors', () => {
    expect(messageSenderTypes).toEqual(['customer', 'assistant', 'agent', 'system'])

    const message = new Message({
      workspaceId: new Types.ObjectId(),
      conversationId: new Types.ObjectId(),
      senderType: 'bot',
      content: 'Hello',
    })

    expect(message.validateSync()?.errors.senderType).toBeDefined()
  })

  it('stores RAG citation fields using the existing answer response shape', () => {
    const message = new Message({
      workspaceId: new Types.ObjectId(),
      conversationId: new Types.ObjectId(),
      senderType: 'assistant',
      content: 'The warranty is one year.',
      citations: [{
        citationId: 'source-1',
        id: 'chunk-1',
        documentId: new Types.ObjectId(),
        chunkIndex: 0,
        sourceName: 'Warranty.pdf',
        mimeType: 'application/pdf',
        pageCount: 2,
        score: 0.91,
        excerpt: 'Warranty period: one year.',
      }],
    })

    expect(message.validateSync()).toBeUndefined()
    expect(message.citations).toHaveLength(1)
    expect(message.citations[0]?.sourceName).toBe('Warranty.pdf')
  })

  it('defines workspace-scoped conversation history indexes', () => {
    const indexKeys = Message.schema.indexes().map(([keys]) => keys)
    expect(indexKeys).toContainEqual({ workspaceId: 1, conversationId: 1, createdAt: 1 })
    expect(indexKeys).toContainEqual({ workspaceId: 1, createdAt: -1 })
  })
})
