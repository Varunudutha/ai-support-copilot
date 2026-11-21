import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Conversation } from '../models/Conversation.js'
import { Customer } from '../models/Customer.js'
import {
  DailyConversationMetrics,
  AgentPerformance,
  SatisfactionSurvey,
  AIFeedback,
} from '../models/Analytics.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentId: z.string().optional(),
})

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  return request.workspace
}

function parseDateRange(query: z.infer<typeof analyticsQuerySchema>) {
  const endDate = query.endDate ? new Date(query.endDate) : new Date()
  const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return { startDate, endDate }
}

export const getOverviewMetrics = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))

  const pipeline = [
    { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: '$totalConversations' },
        aiResolved: { $sum: '$aiResolved' },
        humanResolved: { $sum: '$humanResolved' },
        escalated: { $sum: '$escalated' },
        open: { $sum: '$open' },
        pending: { $sum: '$pending' },
        closed: { $sum: '$closed' },
        avgResponseTimeMs: { $avg: '$avgResponseTimeMs' },
        avgResolutionTimeMs: { $avg: '$avgResolutionTimeMs' },
        aiMessages: { $sum: '$aiMessages' },
        humanMessages: { $sum: '$humanMessages' },
        customerMessages: { $sum: '$customerMessages' },
        customerSatisfactionSum: { $sum: '$customerSatisfactionSum' },
        customerSatisfactionCount: { $sum: '$customerSatisfactionCount' },
      },
    },
  ]

  const [metrics] = await DailyConversationMetrics.aggregate(pipeline).limit(1)

  const openConversations = await Conversation.countDocuments({
    workspaceId: workspace.id,
    status: 'open',
  })

  const totalCustomers = await Customer.countDocuments({ workspaceId: workspace.id })

  const totalResolved = (metrics?.aiResolved || 0) + (metrics?.humanResolved || 0)
  const aiResolutionRate = totalResolved > 0
    ? Math.round(((metrics?.aiResolved || 0) / totalResolved) * 100)
    : 0

  const avgSatisfaction = (metrics?.customerSatisfactionCount || 0) > 0
    ? Number(((metrics?.customerSatisfactionSum || 0) / metrics.customerSatisfactionCount).toFixed(2))
    : 0

  response.json({
    period: { startDate, endDate },
    conversations: {
      total: metrics?.totalConversations || 0,
      open: openConversations,
      pending: metrics?.pending || 0,
      closed: metrics?.closed || 0,
      escalated: metrics?.escalated || 0,
    },
    resolution: {
      totalResolved,
      aiResolved: metrics?.aiResolved || 0,
      humanResolved: metrics?.humanResolved || 0,
      aiResolutionRate,
    },
    timing: {
      avgResponseTimeMs: Math.round(metrics?.avgResponseTimeMs || 0),
      avgResolutionTimeMs: Math.round(metrics?.avgResolutionTimeMs || 0),
    },
    messages: {
      total: (metrics?.aiMessages || 0) + (metrics?.humanMessages || 0) + (metrics?.customerMessages || 0),
      ai: metrics?.aiMessages || 0,
      human: metrics?.humanMessages || 0,
      customer: metrics?.customerMessages || 0,
    },
    satisfaction: {
      average: avgSatisfaction,
      count: metrics?.customerSatisfactionCount || 0,
    },
    customers: {
      total: totalCustomers,
    },
  })
})

export const getConversationTrends = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))

  const pipeline: mongoose.PipelineStage[] = [
    { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
    { $sort: { date: 1 } as Record<string, 1 | -1> },
    {
      $project: {
        date: 1,
        totalConversations: 1,
        aiResolved: 1,
        humanResolved: 1,
        escalated: 1,
        open: 1,
        pending: 1,
        closed: 1,
        avgResponseTimeMs: 1,
        avgResolutionTimeMs: 1,
      },
    },
  ]

  const trends = await DailyConversationMetrics.aggregate(pipeline)

  response.json({
    period: { startDate, endDate },
    trends,
  })
})

export const getAgentPerformance = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const query = analyticsQuerySchema.parse(request.query)
  const { startDate, endDate } = parseDateRange(query)

  const match: Record<string, unknown> = { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } }
  if (query.agentId) match.agentId = new mongoose.Types.ObjectId(query.agentId)

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $group: {
        _id: '$agentId',
        conversationsAssigned: { $sum: '$conversationsAssigned' },
        conversationsResolved: { $sum: '$conversationsResolved' },
        conversationsEscalated: { $sum: '$conversationsEscalated' },
        avgResponseTimeMs: { $avg: '$avgResponseTimeMs' },
        avgResolutionTimeMs: { $avg: '$avgResolutionTimeMs' },
        messagesSent: { $sum: '$messagesSent' },
        customerSatisfactionSum: { $sum: '$customerSatisfactionSum' },
        customerSatisfactionCount: { $sum: '$customerSatisfactionCount' },
        firstResponseTimeMs: { $avg: '$firstResponseTimeMs' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $project: {
        agentId: '$_id',
        name: '$agent.fullName',
        email: '$agent.email',
        conversationsAssigned: 1,
        conversationsResolved: 1,
        conversationsEscalated: 1,
        avgResponseTimeMs: { $round: ['$avgResponseTimeMs', 0] },
        avgResolutionTimeMs: { $round: ['$avgResolutionTimeMs', 0] },
        messagesSent: 1,
        avgSatisfaction: {
          $cond: [
            { $gt: ['$customerSatisfactionCount', 0] },
            { $round: [{ $divide: ['$customerSatisfactionSum', '$customerSatisfactionCount'] }, 2] },
            0,
          ],
        },
        firstResponseTimeMs: { $round: ['$firstResponseTimeMs', 0] },
      },
    },
    { $sort: { conversationsResolved: -1 } as Record<string, 1 | -1> },
  ]

  const agents = await AgentPerformance.aggregate(pipeline)

  response.json({
    period: { startDate, endDate },
    agents,
  })
})

export const getSatisfaction = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))

  const pipeline: mongoose.PipelineStage[] = [
    { $match: { workspaceId: workspace.id, submittedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } as Record<string, 1 | -1> },
  ]

  const ratingDistribution = await SatisfactionSurvey.aggregate(pipeline)

  const avgPipeline = [
    { $match: { workspaceId: workspace.id, submittedAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]

  const [avgResult] = await SatisfactionSurvey.aggregate(avgPipeline).limit(1)

  const recentFeedback = await SatisfactionSurvey.find({
    workspaceId: workspace.id,
    submittedAt: { $gte: startDate, $lte: endDate },
    feedback: { $ne: null },
  })
    .sort({ submittedAt: -1 })
    .limit(10)
    .populate('customerId', 'displayName email')
    .populate('conversationId', '_id subject')
    .lean()

  response.json({
    period: { startDate, endDate },
    averageRating: avgResult ? Number(avgResult.avgRating.toFixed(2)) : 0,
    totalSurveys: avgResult?.count || 0,
    distribution: ratingDistribution.map((r) => ({ rating: r._id, count: r.count })),
    recentFeedback,
  })
})

export const getAIFeedback = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))

  const pipeline = [
    { $match: { workspaceId: workspace.id, submittedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$feedback',
        count: { $sum: 1 },
      },
    },
  ]

  const distribution = await AIFeedback.aggregate(pipeline)

  const recentFeedback = await AIFeedback.find({
    workspaceId: workspace.id,
    submittedAt: { $gte: startDate, $lte: endDate },
    comment: { $ne: null },
  })
    .sort({ submittedAt: -1 })
    .limit(10)
    .populate('submittedBy', 'fullName')
    .populate('messageId', 'content')
    .lean()

  const helpful = distribution.find((d) => d._id === 'helpful')?.count || 0
  const notHelpful = distribution.find((d) => d._id === 'not_helpful')?.count || 0
  const total = helpful + notHelpful
  const helpfulRate = total > 0 ? Math.round((helpful / total) * 100) : 0

  response.json({
    period: { startDate, endDate },
    helpfulRate,
    totalFeedback: total,
    distribution: distribution.map((d) => ({ feedback: d._id, count: d.count })),
    recentFeedback,
  })
})

export const getChannelBreakdown = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))

  const pipeline: mongoose.PipelineStage[] = [
    { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        channelDashboard: { $sum: '$channelDashboard' },
        channelWidget: { $sum: '$channelWidget' },
      },
    },
  ]

  const [result] = await DailyConversationMetrics.aggregate(pipeline).limit(1)

  const dashboardConversations = await Conversation.countDocuments({
    workspaceId: workspace.id,
    channel: 'dashboard',
  })

  const widgetConversations = await Conversation.countDocuments({
    workspaceId: workspace.id,
    channel: 'widget',
  })

  response.json({
    period: { startDate, endDate },
    historical: {
      dashboard: result?.channelDashboard || 0,
      widget: result?.channelWidget || 0,
    },
    current: {
      dashboard: dashboardConversations,
      widget: widgetConversations,
    },
  })
})

export const exportAnalytics = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { startDate, endDate } = parseDateRange(analyticsQuerySchema.parse(request.query))
  const format = request.query.format as string || 'json'

  const [overview, trends, agents, satisfaction, aiFeedback, channels] = await Promise.all([
    (async () => {
      const pipeline = [
        { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: '$totalConversations' },
            aiResolved: { $sum: '$aiResolved' },
            humanResolved: { $sum: '$humanResolved' },
            escalated: { $sum: '$escalated' },
          },
        },
      ]
      const [result] = await DailyConversationMetrics.aggregate(pipeline).limit(1)
      return result || {}
    })(),
    DailyConversationMetrics.aggregate([
      { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
      { $sort: { date: 1 } as Record<string, 1 | -1> },
      { $project: { date: 1, totalConversations: 1, aiResolved: 1, humanResolved: 1 } },
    ]),
    AgentPerformance.aggregate([
      { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$agentId',
          conversationsAssigned: { $sum: '$conversationsAssigned' },
          conversationsResolved: { $sum: '$conversationsResolved' },
        },
      },
    ]),
    SatisfactionSurvey.aggregate([
      { $match: { workspaceId: workspace.id, submittedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    AIFeedback.aggregate([
      { $match: { workspaceId: workspace.id, submittedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$feedback', count: { $sum: 1 } } },
    ]),
    DailyConversationMetrics.aggregate([
      { $match: { workspaceId: workspace.id, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, channelDashboard: { $sum: '$channelDashboard' }, channelWidget: { $sum: '$channelWidget' } } },
    ]),
  ])

  const exportData = {
    period: { startDate, endDate },
    overview,
    trends,
    agents,
    satisfaction,
    aiFeedback,
    channels,
    generatedAt: new Date().toISOString(),
  }

  if (format === 'csv') {
    const csv = [
      'Metric,Value',
      `Total Conversations,${overview.totalConversations || 0}`,
      `AI Resolved,${overview.aiResolved || 0}`,
      `Human Resolved,${overview.humanResolved || 0}`,
      `Escalated,${overview.escalated || 0}`,
    ].join('\n')
    response.setHeader('Content-Type', 'text/csv')
    response.setHeader('Content-Disposition', `attachment; filename="analytics-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`)
    return response.send(csv)
  }

  response.json(exportData)
})