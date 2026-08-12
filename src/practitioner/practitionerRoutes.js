import { Router } from 'express';
import practitionerController from './practitionerController.js';
import {
    authenticateAdmin,
    authenticatePractitioner
} from '../utils/middleware/authMiddleware.js';
import {
    validatePractitionerRegister
} from '../utils/middleware/validationMiddleware.js';

const router = Router();

// Public routes
router.post('/register', validatePractitionerRegister, practitionerController.register);
router.post('/login', practitionerController.login);
router.put('/logout', practitionerController.logout);

// Admin-protected doctor verification routes
router.put('/approve-practitioner', authenticateAdmin, practitionerController.approve);
router.put('/reject-practitioner', authenticateAdmin, practitionerController.reject);
router.get('/fetch', authenticateAdmin, practitionerController.fetch);
router.delete('/delete', authenticateAdmin, practitionerController.deletePrac);
router.get('/renew-token', practitionerController.renewToken); // Verified via refresh token cookie

// Doctor Connections & Patient Access (Practitioners only)
router.get('/connections', authenticatePractitioner, practitionerController.getConnections);
router.get('/patient/:userId', authenticatePractitioner, practitionerController.getPatientProfile);
router.post('/patient/:userId/condition', authenticatePractitioner, practitionerController.addPatientCondition);
router.post('/patient/:userId/medication', authenticatePractitioner, practitionerController.addPatientMedication);
router.get('/patient/:userId/medications', authenticatePractitioner, practitionerController.getPatientMedications);
router.put('/patient/:userId/medication/:medicationId', authenticatePractitioner, practitionerController.updatePatientMedication);
router.delete('/patient/:userId/medication/:medicationId', authenticatePractitioner, practitionerController.deletePatientMedication);
router.get('/patient/:userId/medication-logs', authenticatePractitioner, practitionerController.getPatientMedicationLogs);
router.get('/patient/:userId/observations', authenticatePractitioner, practitionerController.getPatientObservations);
router.get('/patient/:userId/vitals', authenticatePractitioner, practitionerController.getPatientVitals);

export default router;
