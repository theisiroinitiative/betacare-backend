import healthService from './healthService.js';

class HealthController {
    async onboard(req, res) {
        try {
            const userId = req.user.userId;
            const result = await healthService.onboardProfile(userId, req.body);

            return res.status(200).json({
                code: result.code,
                message: `send the code to our whatsapp agent @ ${result.botNumber}`
            });
        } catch (error) {
            console.error('Health onboarding controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            return res.status(200).json(profile);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.updateProfile(userId, req.body);
            return res.status(200).json({ message: 'Profile updated successfully.', profile });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async linkPractitioner(req, res) {
        try {
            const userId = req.user.userId;
            const { practitionerId } = req.body;
            if (!practitionerId) return res.status(400).json({ error: 'practitionerId is required.' });

            const profile = await healthService.linkPractitioner(userId, practitionerId);
            return res.status(200).json({ message: 'Practitioner linked successfully.', profile });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async unlinkPractitioner(req, res) {
        try {
            const userId = req.user.userId;
            const { practitionerId } = req.body;
            if (!practitionerId) return res.status(400).json({ error: 'practitionerId is required.' });

            const profile = await healthService.unlinkPractitioner(userId, practitionerId);
            return res.status(200).json({ message: 'Practitioner unlinked successfully.', profile });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Conditions
    async getConditions(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const conditions = await healthService.getConditions(profile.id);
            return res.status(200).json(conditions);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addCondition(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const condition = await healthService.addCondition(profile.id, req.body);
            return res.status(201).json({ message: 'Condition added successfully.', condition });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async updateCondition(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const condition = await healthService.updateCondition(profile.id, req.params.id, req.body);
            return res.status(200).json({ message: 'Condition updated successfully.', condition });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteCondition(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            await healthService.deleteCondition(profile.id, req.params.id);
            return res.status(200).json({ message: 'Condition deleted successfully.' });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Medications
    async getMedications(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const medications = await healthService.getMedications(profile.id);
            return res.status(200).json(medications);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addMedication(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const medication = await healthService.addMedication(profile.id, req.body);
            return res.status(201).json({ message: 'Medication added successfully.', medication });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async updateMedication(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const medication = await healthService.updateMedication(profile.id, req.params.id, req.body);
            return res.status(200).json({ message: 'Medication updated successfully.', medication });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteMedication(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            await healthService.deleteMedication(profile.id, req.params.id);
            return res.status(200).json({ message: 'Medication deleted successfully.' });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Vitals
    async getVitals(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const vitals = await healthService.getVitals(profile.id);
            return res.status(200).json(vitals);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addVitalLog(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const vital = await healthService.addVitalLog(profile.id, req.body);
            return res.status(201).json({ message: 'Vitals logged successfully.', vital });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Medication Logs
    async getMedicationLogs(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const logs = await healthService.getMedicationLogs(profile.id);
            return res.status(200).json(logs);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addMedicationLog(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const log = await healthService.addMedicationLog(profile.id, req.body);
            return res.status(201).json({ message: 'Medication intake logged successfully.', log });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Observations
    async getObservations(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const observations = await healthService.getObservations(profile.id);
            return res.status(200).json(observations);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    // Reminders
    async getReminders(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            const reminders = await healthService.getReminders(profile.id);
            return res.status(200).json(reminders);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteReminder(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await healthService.getProfileByUserId(userId);
            await healthService.deleteReminder(profile.id, req.params.id);
            return res.status(200).json({ message: 'Reminder deleted/cancelled successfully.' });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
}

export default new HealthController();
