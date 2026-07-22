import { Router } from 'express';
import healthController from './healthController.js';
import { authenticateUser } from '../../utils/middleware/authMiddleware.js';
import { validateUserProfileOnboard } from '../../utils/middleware/validationMiddleware.js';

const router = Router();

// Onboard user health profile (Stage 2 of onboarding)
router.post('/onboard', authenticateUser, validateUserProfileOnboard, healthController.onboard);

// Demographics & Practitioner Linkage
router.get('/', authenticateUser, healthController.getProfile);
router.put('/', authenticateUser, healthController.updateProfile);
router.post('/link-practitioner', authenticateUser, healthController.linkPractitioner);
router.post('/unlink-practitioner', authenticateUser, healthController.unlinkPractitioner);

// Conditions CRUD
router.get('/conditions', authenticateUser, healthController.getConditions);
router.post('/conditions', authenticateUser, healthController.addCondition);
router.put('/conditions/:id', authenticateUser, healthController.updateCondition);
router.delete('/conditions/:id', authenticateUser, healthController.deleteCondition);

// Medications CRUD
router.get('/medications', authenticateUser, healthController.getMedications);
router.post('/medications', authenticateUser, healthController.addMedication);
router.put('/medications/:id', authenticateUser, healthController.updateMedication);
router.delete('/medications/:id', authenticateUser, healthController.deleteMedication);

// Vitals
router.get('/vitals', authenticateUser, healthController.getVitals);
router.post('/vitals', authenticateUser, healthController.addVitalLog);

// Medication Logs
router.get('/medication-logs', authenticateUser, healthController.getMedicationLogs);
router.post('/medication-logs', authenticateUser, healthController.addMedicationLog);

// Observations
router.get('/observations', authenticateUser, healthController.getObservations);

// Reminders
router.get('/reminders', authenticateUser, healthController.getReminders);
router.delete('/reminders/:id', authenticateUser, healthController.deleteReminder);

export default router;
