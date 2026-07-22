import { Router } from 'express';
import departmentController from './departmentController.js';
import {
    authenticateOrganization,
    authenticateHOD,
    authenticateUser
} from '../utils/middleware/authMiddleware.js';
import {
    validateDeptRegister
} from '../utils/middleware/validationMiddleware.js';

const router = Router();

// Public routes
router.post('/login', departmentController.login);
router.put('/logout', departmentController.logout);

// Protected routes
router.post('/new', authenticateHOD, validateDeptRegister, departmentController.create);
router.put('/approve', authenticateOrganization, departmentController.approve);
router.get('/fetch', authenticateOrganization, departmentController.fetch);
router.delete('/delete', authenticateUser, departmentController.deleteDept); // Accessible to Organization or HOD (handled inside controller)
router.get('/renew-token', departmentController.renewToken); // Verified via refresh token cookie

export default router;
