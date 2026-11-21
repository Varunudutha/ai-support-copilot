import { Router } from 'express'
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerConversations,
  getCustomerTimeline,
  listCustomers,
  updateCustomer,
} from '../controllers/customerController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)

router.get('/', listCustomers)
router.post('/', requireWorkspaceRoles('owner', 'admin', 'agent'), createCustomer)
router.get('/:customerId', getCustomer)
router.patch('/:customerId', requireWorkspaceRoles('owner', 'admin', 'agent'), updateCustomer)
router.delete('/:customerId', requireWorkspaceRoles('owner', 'admin'), deleteCustomer)
router.get('/:customerId/conversations', getCustomerConversations)
router.get('/:customerId/timeline', getCustomerTimeline)

export default router