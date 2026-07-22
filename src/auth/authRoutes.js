import { Router } from 'express';
import authController from './authController.js';
import {
    authenticateUser,
    authenticatePasswordReset
} from '../utils/middleware/authMiddleware.js';
import {
    validateRegister,
    validateVerifyOTP,
    validateVerifyAccount,
    validatePasswordReset,
    validateLogin
} from '../utils/middleware/validationMiddleware.js';

const router = Router();

// Stage 1 of Onboarding
router.post('/user/new', validateRegister, authController.register);
router.put('/user/verify', validateVerifyOTP, authController.verifyOTP);

// User Reset Forgot Password Flow
router.post('/user/verify-account', validateVerifyAccount, authController.verifyAccount);
router.post('/user/verify-email', validateVerifyOTP, authController.verifyEmail);
router.put('/user/password-reset', authenticatePasswordReset, validatePasswordReset, authController.passwordReset);

// User Login, Logout & Token Renewal
router.post('/user/login', validateLogin, authController.login);
router.get('/user/renew-token', authController.renewToken);
router.put('/user/logout', authController.logout);

// Deletion of Account (Protected Route)
router.delete('/user/delete', authenticateUser, authController.deleteAccount);

export default router;
