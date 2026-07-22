import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from './systemPrompt.js';
import UserAuth from '../../auth/authModel.js';
import UserProfile from '../../profiles/healthProfiles/healthModel.js';
import Condition from '../../profiles/conditions/conditionModel.js';
import Medication from '../../profiles/medications/medicationModel.js';
import MedicationLog from '../../profiles/medicationLogs/medicationLogModel.js';
import VitalLog from '../../profiles/vitalLog/vitalLogModel.js';
import Observation from '../../profiles/observation/observationModel.js';
import Reminder from '../../schedule/reminderModel.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Fetch complete health context for a user by phone number.
 */
async function getUserContext(phoneNumber) {
    const user = await UserAuth.findOne({ where: { phoneNumber } });
    if (!user) return null;

    const profile = await UserProfile.findOne({ where: { userId: user.userId } });
    if (!profile) return { profile: null, conditions: [], medications: [], recentVitals: [], recentMedicationLogs: [] };

    const conditions = await Condition.findAll({ where: { profileId: profile.id } });
    const medications = await Medication.findAll({ where: { profileId: profile.id } });

    const recentVitals = await VitalLog.findAll({
        where: { profileId: profile.id },
        order: [['loggedAt', 'DESC']],
        limit: 5
    });

    // Get medication logs across all medications for this profile
    const medicationIds = medications.map(m => m.id);
    const recentMedicationLogs = medicationIds.length > 0
        ? await MedicationLog.findAll({
            where: { medicationId: medicationIds },
            order: [['takenAt', 'DESC']],
            limit: 10
        })
        : [];

    return {
        profile: profile.toJSON(),
        conditions: conditions.map(c => c.toJSON()),
        medications: medications.map(m => m.toJSON()),
        recentVitals: recentVitals.map(v => v.toJSON()),
        recentMedicationLogs: recentMedicationLogs.map(l => l.toJSON())
    };
}

/**
 * Parse action blocks from the AI response.
 * Format: :::ACTION{ ... }ACTION:::
 */
function parseActions(responseText) {
    const actions = [];
    const actionRegex = /:::ACTION(\{[\s\S]*?\})ACTION:::/g;
    let match;

    while ((match = actionRegex.exec(responseText)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            actions.push(parsed);
        } catch (err) {
            console.error('[AI Interpreter] Failed to parse action block:', match[1], err.message);
        }
    }

    // Strip action blocks from text to get clean reply
    const cleanText = responseText.replace(/:::ACTION\{[\s\S]*?\}ACTION:::/g, '').trim();

    return { cleanText, actions };
}

/**
 * Execute parsed actions against the database.
 */
async function executeActions(actions, profileId, phoneNumber) {
    for (const action of actions) {
        try {
            switch (action.action) {
                case 'CREATE_REMINDER': {
                    const d = action.data;
                    await Reminder.create({
                        profileId,
                        phoneNumber,
                        type: d.type || 'other',
                        title: d.title,
                        description: d.description || null,
                        scheduledAt: new Date(d.scheduledAt),
                        recurrence: d.recurrence || 'none',
                        status: 'pending'
                    });
                    console.log(`[AI Action] Created reminder: "${d.title}" for ${phoneNumber}`);
                    break;
                }

                case 'LOG_OBSERVATION': {
                    const d = action.data;
                    await Observation.create({
                        profileId,
                        symptom: d.symptom,
                        severity: d.severity || 'mild',
                        notes: d.notes || null,
                        observedAt: d.observedAt ? new Date(d.observedAt) : new Date()
                    });
                    console.log(`[AI Action] Logged observation: "${d.symptom}" for profile ${profileId}`);
                    break;
                }

                case 'LOG_VITAL': {
                    const d = action.data;
                    await VitalLog.create({
                        profileId,
                        bmi: d.bmi ?? null,
                        bloodPressureSystolic: d.bloodPressureSystolic ?? null,
                        bloodPressureDiastolic: d.bloodPressureDiastolic ?? null,
                        bloodSugar: d.bloodSugar ?? null,
                        temperature: d.temperature ?? null,
                        pulseRate: d.pulseRate ?? null,
                        loggedAt: new Date()
                    });
                    console.log(`[AI Action] Logged vitals for profile ${profileId}`);
                    break;
                }

                case 'LOG_MEDICATION': {
                    const d = action.data;
                    await MedicationLog.create({
                        medicationId: d.medicationId,
                        takenAt: d.takenAt ? new Date(d.takenAt) : new Date(),
                        status: d.status || 'taken',
                        notes: d.notes || null
                    });
                    console.log(`[AI Action] Logged medication adherence for medication ${d.medicationId}`);
                    break;
                }

                default:
                    console.warn(`[AI Action] Unknown action type: ${action.action}`);
            }
        } catch (err) {
            console.error(`[AI Action] Failed to execute ${action.action}:`, err.message);
        }
    }
}

/**
 * Main message processor — called by the WhatsApp bot for each user message.
 *
 * @param {string} message - The user's WhatsApp message text
 * @param {string} phoneNumber - The user's standard phone number
 * @returns {string} The AI's Pidgin reply (action blocks stripped)
 */
export async function messageProcessor(message, phoneNumber) {
    try {
        // 1. Fetch full user health context
        const userContext = await getUserContext(phoneNumber);

        if (!userContext || !userContext.profile) {
            return 'Bros/Sis, I no fit find your health profile. Abeg go complete your registration for the BetaCare web platform first. 🙏';
        }

        // 2. Build system prompt with context
        const systemPrompt = buildSystemPrompt(userContext);

        // 3. Call Gemini API
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(message);
        const responseText = result.response.text();

        // 4. Parse actions from the response
        const { cleanText, actions } = parseActions(responseText);

        // 5. Execute any actions
        if (actions.length > 0) {
            await executeActions(actions, userContext.profile.id, phoneNumber);
        }

        // 6. Return the cleaned Pidgin text reply
        return cleanText || 'I don receive your message. 👍';

    } catch (error) {
        console.error('[AI Interpreter] Error processing message:', error);
        return 'Wahala dey o! Something go wrong for my side. Abeg try again later. 🙏';
    }
}
