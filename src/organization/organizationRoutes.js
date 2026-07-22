import { Router } from 'express';
import organizationController from './organizationController.js';
import {
    authenticateAdmin,
    authenticateOrganization
} from '../utils/middleware/authMiddleware.js';
import {
    validateOrgRegister,
    validateOrgLogin
} from '../utils/middleware/validationMiddleware.js';

const router = Router();

// Public routes
router.post('/new', validateOrgRegister, organizationController.create);
router.post('/login', validateOrgLogin, organizationController.login);
router.put('/logout', organizationController.logout);

// Admin-protected routes
router.get('/fetch', authenticateAdmin, organizationController.fetch);
router.put('/update-status', authenticateAdmin, organizationController.updateStatus);
router.put('/approve', authenticateAdmin, organizationController.approve);

// Organization-protected routes
router.get('/summary', authenticateOrganization, organizationController.summary);
router.get('/renew-token', organizationController.renewToken); // no auth middleware, verified via refresh token cookie
router.put('/delete', authenticateOrganization, organizationController.deleteOrg);

export default router;
