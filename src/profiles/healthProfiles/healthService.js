import UserProfile from './healthModel.js';
import Condition from '../conditions/conditionModel.js';
import Medication from '../medications/medicationModel.js';
import VitalLog from '../vitalLog/vitalLogModel.js';
import Observation from '../observation/observationModel.js';
import Reminder from '../../schedule/reminderModel.js';
import MedicationLog from '../medicationLogs/medicationLogModel.js';
import Practitioner from '../../practitioner/practitionerModel.js';
import sequelize from '../../config/dbConfig.js';
import otpService from '../../services/otpServices/otpService.js';

class HealthService {
    async onboardProfile(userId, data) {
        // Check if user profile already exists
        const existingProfile = await UserProfile.findOne({ where: { userId } });
        if (existingProfile) {
            const err = new Error('Health profile has already been onboarded.');
            err.statusCode = 400;
            throw err;
        }

        // Start transaction to ensure atomic creation of profile, conditions, and medications
        const transaction = await sequelize.transaction();

        try {
            // Create user profile
            const profile = await UserProfile.create({
                userId,
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                dateOfBirth: data.dateOfBirth,
                phoneNumber: data.phoneNumber,
                bloodGroup: data.bloodGroup,
                genotype: data.genotype,
                emergencyContactName: data.emergencyContactName,
                emergencyContactPhone: data.emergencyContactPhone,
                emergencyContactEmail: data.emergencyContactEmail,
                linkedPractitioners: []
            }, { transaction });

            // Create medical conditions if present
            if (data.medicalConditions && Array.isArray(data.medicalConditions)) {
                const conditionsData = data.medicalConditions.map(c => ({
                    profileId: profile.id,
                    conditionName: c.conditionName,
                    severity: c.severity,
                    diagnosedAt: c.diagnosedAt,
                    status: c.status || 'active'
                }));
                await Condition.bulkCreate(conditionsData, { transaction });
            }

            // Create medications if present
            if (data.medications && Array.isArray(data.medications)) {
                const medicationsData = data.medications.map(m => ({
                    profileId: profile.id,
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    startDate: m.startDate,
                    endDate: m.endDate
                }));
                await Medication.bulkCreate(medicationsData, { transaction });
            }

            await transaction.commit();

            // Generate and store WhatsApp verification code
            const whatsappCode = await otpService.storeWhatsappVerificationCode(data.phoneNumber);

            return {
                code: whatsappCode,
                botNumber: process.env.WHATSAPP_BOT_NUMBER || 'BetaCare Bot'
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async getProfileByUserId(userId) {
        const profile = await UserProfile.findOne({
            where: { userId },
            include: [
                { model: Condition },
                { model: Medication },
                { model: VitalLog },
                { model: Observation },
                { model: Reminder }
            ]
        });

        if (!profile) {
            const err = new Error('User profile not found.');
            err.statusCode = 404;
            throw err;
        }

        return profile;
    }

    async getProfileByPhoneNumber(phoneNumber) {
        const profile = await UserProfile.findOne({
            where: { phoneNumber },
            include: [
                { model: Condition },
                { model: Medication },
                { model: VitalLog },
                { model: Observation }
            ]
        });
        return profile;
    }

    async updateProfile(userId, data) {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            const err = new Error('User profile not found.');
            err.statusCode = 404;
            throw err;
        }

        await profile.update({
            firstName: data.firstName !== undefined ? data.firstName : profile.firstName,
            lastName: data.lastName !== undefined ? data.lastName : profile.lastName,
            gender: data.gender !== undefined ? data.gender : profile.gender,
            dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : profile.dateOfBirth,
            bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : profile.bloodGroup,
            genotype: data.genotype !== undefined ? data.genotype : profile.genotype,
            emergencyContactName: data.emergencyContactName !== undefined ? data.emergencyContactName : profile.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone !== undefined ? data.emergencyContactPhone : profile.emergencyContactPhone,
            emergencyContactEmail: data.emergencyContactEmail !== undefined ? data.emergencyContactEmail : profile.emergencyContactEmail
        });

        return profile;
    }

    async linkPractitioner(userId, practitionerId) {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            const err = new Error('User profile not found.');
            err.statusCode = 404;
            throw err;
        }

        const practitioner = await Practitioner.findByPk(practitionerId);
        if (!practitioner) {
            const err = new Error('Practitioner not found.');
            err.statusCode = 404;
            throw err;
        }

        let list = profile.linkedPractitioners || [];
        if (!list.includes(practitionerId)) {
            list = [...list, practitionerId];
            profile.linkedPractitioners = list;
            await profile.save();
        }

        return profile;
    }

    async unlinkPractitioner(userId, practitionerId) {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            const err = new Error('User profile not found.');
            err.statusCode = 404;
            throw err;
        }

        let list = profile.linkedPractitioners || [];
        if (list.includes(practitionerId)) {
            list = list.filter(id => id !== practitionerId);
            profile.linkedPractitioners = list;
            await profile.save();
        }

        return profile;
    }

    // Condition CRUD
    async getConditions(profileId) {
        return await Condition.findAll({ where: { profileId } });
    }

    async addCondition(profileId, data) {
        return await Condition.create({
            profileId,
            conditionName: data.conditionName,
            severity: data.severity,
            diagnosedAt: data.diagnosedAt,
            status: data.status || 'active'
        });
    }

    async updateCondition(profileId, conditionId, data) {
        const condition = await Condition.findOne({ where: { id: conditionId, profileId } });
        if (!condition) {
            const err = new Error('Condition not found.');
            err.statusCode = 404;
            throw err;
        }
        await condition.update(data);
        return condition;
    }

    async deleteCondition(profileId, conditionId) {
        const condition = await Condition.findOne({ where: { id: conditionId, profileId } });
        if (!condition) {
            const err = new Error('Condition not found.');
            err.statusCode = 404;
            throw err;
        }
        await condition.destroy();
    }

    // Medication CRUD
    async getMedications(profileId) {
        return await Medication.findAll({ where: { profileId } });
    }

    async addMedication(profileId, data) {
        return await Medication.create({
            profileId,
            name: data.name,
            dosage: data.dosage,
            frequency: data.frequency,
            startDate: data.startDate,
            endDate: data.endDate
        });
    }

    async updateMedication(profileId, medicationId, data) {
        const medication = await Medication.findOne({ where: { id: medicationId, profileId } });
        if (!medication) {
            const err = new Error('Medication not found.');
            err.statusCode = 404;
            throw err;
        }
        await medication.update(data);
        return medication;
    }

    async deleteMedication(profileId, medicationId) {
        const medication = await Medication.findOne({ where: { id: medicationId, profileId } });
        if (!medication) {
            const err = new Error('Medication not found.');
            err.statusCode = 404;
            throw err;
        }
        await medication.destroy();
    }

    // VitalLog CRUD
    async getVitals(profileId) {
        return await VitalLog.findAll({
            where: { profileId },
            order: [['loggedAt', 'DESC']]
        });
    }

    async addVitalLog(profileId, data) {
        return await VitalLog.create({
            profileId,
            bmi: data.bmi,
            bloodPressureSystolic: data.bloodPressureSystolic,
            bloodPressureDiastolic: data.bloodPressureDiastolic,
            bloodSugar: data.bloodSugar,
            temperature: data.temperature,
            pulseRate: data.pulseRate,
            loggedAt: data.loggedAt || new Date()
        });
    }

    // MedicationLog CRUD
    async getMedicationLogs(profileId) {
        const medications = await Medication.findAll({ where: { profileId } });
        const medicationIds = medications.map(m => m.id);
        if (medicationIds.length === 0) return [];
        return await MedicationLog.findAll({
            where: { medicationId: medicationIds },
            order: [['takenAt', 'DESC']]
        });
    }

    async addMedicationLog(profileId, data) {
        const medication = await Medication.findOne({ where: { id: data.medicationId, profileId } });
        if (!medication) {
            const err = new Error('Medication not found in this profile.');
            err.statusCode = 404;
            throw err;
        }
        return await MedicationLog.create({
            medicationId: data.medicationId,
            takenAt: data.takenAt || new Date(),
            status: data.status || 'taken',
            notes: data.notes
        });
    }

    // Observation CRUD
    async getObservations(profileId) {
        return await Observation.findAll({
            where: { profileId },
            order: [['observedAt', 'DESC']]
        });
    }

    // Reminder CRUD
    async getReminders(profileId) {
        return await Reminder.findAll({
            where: { profileId },
            order: [['scheduledAt', 'DESC']]
        });
    }

    async deleteReminder(profileId, reminderId) {
        const reminder = await Reminder.findOne({ where: { id: reminderId, profileId } });
        if (!reminder) {
            const err = new Error('Reminder not found.');
            err.statusCode = 404;
            throw err;
        }
        await reminder.destroy();
    }
}

export default new HealthService();
