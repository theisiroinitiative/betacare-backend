import { Router } from 'express';
import departmentController from './departmentController.js';
import {
    authenticateOrganization,
    authenticateHOD,
    authenticateUser,
    authenticateDepartmentOrHOD
} from '../utils/middleware/authMiddleware.js';
import {
    validateDeptRegister,
    validateGenerateReferral
} from '../utils/middleware/validationMiddleware.js';

const router = Router();

// Public routes
router.post('/new', validateDeptRegister, departmentController.create);
router.post('/login', departmentController.login);
router.put('/logout', departmentController.logout);

// Protected routes
router.post('/generate-referral', authenticateDepartmentOrHOD, validateGenerateReferral, departmentController.generateReferral);
router.put('/approve', authenticateOrganization, departmentController.approve);
router.get('/fetch', authenticateOrganization, departmentController.fetch);
router.delete('/delete', authenticateUser, departmentController.deleteDept); // Accessible to Organization or HOD (handled inside controller)
router.get('/renew-token', departmentController.renewToken); // Verified via refresh token cookie

export default router;
