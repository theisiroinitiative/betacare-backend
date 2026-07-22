import { Router } from 'express';
import practitionerController from './practitionerController.js';
import {
    authenticateHOD,
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

// Protected routes (HOD only)
router.put('/approve-practitioner', authenticateHOD, practitionerController.approve);
router.put('/reject-practitioner', authenticateHOD, practitionerController.reject);
router.get('/fetch', authenticateHOD, practitionerController.fetch);
router.delete('/delete', authenticateHOD, practitionerController.deletePrac);
router.get('/renew-token', practitionerController.renewToken); // Verified via refresh token cookie

// Practitioner Patient Access (Practitioners only)
router.get('/patient/:phoneNumber', authenticatePractitioner, practitionerController.getPatientProfile);
router.post('/patient/:phoneNumber/condition', authenticatePractitioner, practitionerController.addPatientCondition);
router.post('/patient/:phoneNumber/medication', authenticatePractitioner, practitionerController.addPatientMedication);
router.get('/patient/:phoneNumber/medications', authenticatePractitioner, practitionerController.getPatientMedications);
router.put('/patient/:phoneNumber/medication/:medicationId', authenticatePractitioner, practitionerController.updatePatientMedication);
router.delete('/patient/:phoneNumber/medication/:medicationId', authenticatePractitioner, practitionerController.deletePatientMedication);
router.get('/patient/:phoneNumber/medication-logs', authenticatePractitioner, practitionerController.getPatientMedicationLogs);
router.get('/patient/:phoneNumber/observations', authenticatePractitioner, practitionerController.getPatientObservations);
router.get('/patient/:phoneNumber/vitals', authenticatePractitioner, practitionerController.getPatientVitals);

export default router;
