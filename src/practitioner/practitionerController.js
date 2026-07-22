import practitionerServices from './practitionerServices.js';
import healthService from '../profiles/healthProfiles/healthService.js';

class PractitionerController {
    async register(req, res) {
        try {
            const message = await practitionerServices.registerPractitioner(req.body);
            return res.status(201).json({ message });
        } catch (error) {
            console.error('Practitioner register controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const { accessToken, refreshToken } = await practitionerServices.login({ username, password });

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 4 * 60 * 60 * 1000 // 4 hours
            });

            return res.status(200).json({ message: 'Logged in successfully' });
        } catch (error) {
            console.error('Practitioner login controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async renewToken(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token is missing.' });
            }

            const newAccessToken = await practitionerServices.renewAccessToken(refreshToken);

            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            return res.status(200).json({ message: 'Access token renewed successfully' });
        } catch (error) {
            console.error('Practitioner renewToken controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            const message = await practitionerServices.logout(refreshToken);

            res.clearCookie('access_token', { httpOnly: true, sameSite: 'none', secure: true });
            res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'none', secure: true });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Practitioner logout controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async approve(req, res) {
        try {
            // Protected: HOD only (HOD practitioner ID in req.user.id)
            const hodId = req.user.id;
            const { practitioner_id } = req.body;
            const message = await practitionerServices.approvePractitioner(hodId, practitioner_id);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Practitioner approve controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async reject(req, res) {
        try {
            // Protected: HOD only (HOD practitioner ID in req.user.id)
            const hodId = req.user.id;
            const { practitioner_id } = req.body;
            const message = await practitionerServices.rejectPractitioner(hodId, practitioner_id);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Practitioner reject controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async fetch(req, res) {
        try {
            // Protected: HOD only (HOD practitioner ID in req.user.id)
            const hodId = req.user.id;
            const filters = {
                job: req.query.job,
                status: req.query.status,
                specialization: req.query.specialization
            };
            const practitioners = await practitionerServices.fetchPractitioners(hodId, filters);
            return res.status(200).json(practitioners);
        } catch (error) {
            console.error('Practitioner fetch controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deletePrac(req, res) {
        try {
            // Protected: HOD only (HOD practitioner ID in req.user.id)
            const hodId = req.user.id;
            const practitionerId = req.body.practitioner_id || req.query.practitioner_id;

            if (!practitionerId) {
                return res.status(400).json({ error: 'practitioner_id is required.' });
            }

            const message = await practitionerServices.deletePractitioner(hodId, practitionerId);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Practitioner delete controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getLinkedPatientProfile(phoneNumber, practitionerId) {
        const profile = await healthService.getProfileByPhoneNumber(phoneNumber);
        if (!profile) {
            const err = new Error('Patient profile not found.');
            err.statusCode = 404;
            throw err;
        }

        const linked = profile.linkedPractitioners || [];
        if (!linked.includes(practitionerId)) {
            const err = new Error('Access denied. You are not linked to this patient.');
            err.statusCode = 403;
            throw err;
        }
        return profile;
    }

    async getPatientProfile(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            return res.status(200).json(profile);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addPatientCondition(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const condition = await healthService.addCondition(profile.id, req.body);
            return res.status(201).json({ message: 'Condition added successfully by practitioner.', condition });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async addPatientMedication(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const medication = await healthService.addMedication(profile.id, req.body);
            return res.status(201).json({ message: 'Medication prescribed successfully by practitioner.', medication });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getPatientMedications(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const medications = await healthService.getMedications(profile.id);
            return res.status(200).json(medications);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async updatePatientMedication(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const medication = await healthService.updateMedication(profile.id, req.params.medicationId, req.body);
            return res.status(200).json({ message: 'Medication updated successfully by practitioner.', medication });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deletePatientMedication(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            await healthService.deleteMedication(profile.id, req.params.medicationId);
            return res.status(200).json({ message: 'Medication deleted successfully by practitioner.' });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getPatientMedicationLogs(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const logs = await healthService.getMedicationLogs(profile.id);
            return res.status(200).json(logs);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getPatientObservations(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const observations = await healthService.getObservations(profile.id);
            return res.status(200).json(observations);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async getPatientVitals(req, res) {
        try {
            const practitionerId = req.user.id;
            const profile = await this.getLinkedPatientProfile(req.params.phoneNumber, practitionerId);
            const vitals = await healthService.getVitals(profile.id);
            return res.status(200).json(vitals);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
}

export default new PractitionerController();
