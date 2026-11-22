import { Router } from 'express'
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  listWebhookEndpoints,
  getWebhookEndpoint,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  rotateWebhookSecret,
  getWebhookDeliveryLogs,
  testWebhookEndpoint,
  listIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '../controllers/settingsController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)

// ============ Workspace Settings ============
router.get('/settings', getWorkspaceSettings)
router.patch('/settings', requireWorkspaceRoles('owner', 'admin'), updateWorkspaceSettings)

// ============ Webhook Endpoints ============
router.get('/webhooks', listWebhookEndpoints)
router.post('/webhooks', requireWorkspaceRoles('owner', 'admin'), createWebhookEndpoint)
router.get('/webhooks/:webhookId', getWebhookEndpoint)
router.patch('/webhooks/:webhookId', requireWorkspaceRoles('owner', 'admin'), updateWebhookEndpoint)
router.delete('/webhooks/:webhookId', requireWorkspaceRoles('owner', 'admin'), deleteWebhookEndpoint)
router.post('/webhooks/:webhookId/rotate-secret', requireWorkspaceRoles('owner', 'admin'), rotateWebhookSecret)
router.get('/webhooks/:webhookId/deliveries', getWebhookDeliveryLogs)
router.post('/webhooks/:webhookId/test', requireWorkspaceRoles('owner', 'admin'), testWebhookEndpoint)

// ============ Integrations ============
router.get('/integrations', listIntegrations)
router.post('/integrations', requireWorkspaceRoles('owner', 'admin'), createIntegration)
router.get('/integrations/:integrationId', getIntegration)
router.patch('/integrations/:integrationId', requireWorkspaceRoles('owner', 'admin'), updateIntegration)
router.delete('/integrations/:integrationId', requireWorkspaceRoles('owner', 'admin'), deleteIntegration)
router.post('/integrations/:integrationId/test', requireWorkspaceRoles('owner', 'admin'), testIntegration)

// ============ Email Templates ============
router.get('/email-templates', listEmailTemplates)
router.post('/email-templates', requireWorkspaceRoles('owner', 'admin'), createEmailTemplate)
router.get('/email-templates/:templateId', getEmailTemplate)
router.patch('/email-templates/:templateId', requireWorkspaceRoles('owner', 'admin'), updateEmailTemplate)
router.delete('/email-templates/:templateId', requireWorkspaceRoles('owner', 'admin'), deleteEmailTemplate)

// ============ User Notification Preferences ============
router.get('/notification-preferences', getUserNotificationPreferences)
router.patch('/notification-preferences', updateUserNotificationPreferences)

export default router