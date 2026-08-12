import cron from 'node-cron';
import { Op } from 'sequelize';
import sequelize from '../config/dbConfig.js';
import Reminder from './reminderModel.js';
import whatsappBotService from '../agent/agentServices.js';
import WhatsAppJidMapping from '../auth/whatsapp-auth/whatsappMappingModel.js';

/**
 * Reminder Scheduler
 *
 * Runs every minute, finds pending reminders that are due,
 * sends them via WhatsApp, and handles recurrence.
 */

const RECURRENCE_OFFSETS = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
};

async function processDueReminders() {
    try {
        const now = new Date();
        console.log(`[ReminderScheduler] Heartbeat — checking due reminders at ${now.toISOString()}...`);

        const dueReminders = await Reminder.findAll({
            where: {
                scheduledAt: { [Op.lte]: now },
                status: 'pending'
            }
        });
        console.log(dueReminders);

        if (dueReminders.length === 0) {
            console.log('[ReminderScheduler] No pending reminders are due.');
            return;
        }

        console.log(`[ReminderScheduler] Found ${dueReminders.length} due reminder(s) to process.`);

        for (const reminder of dueReminders) {
            try {
                // Format reminder message in Pidgin
                const message = `⏰ *BetaCare Reminder*\n\n` +
                    `📌 *${reminder.title}*\n` +
                    `${reminder.description || ''}\n\n` +
                    `Type: ${reminder.type}\n` +
                    `Abeg no forget o! 💪`;

                // Resolve target WhatsApp recipient JID
                const cleanDigits = reminder.phoneNumber ? reminder.phoneNumber.replace(/[^0-9]/g, '') : '';
                const mapping = await WhatsAppJidMapping.findOne({
                    where: {
                        [Op.or]: [
                            { phoneNumber: reminder.phoneNumber },
                            ...(cleanDigits ? [
                                sequelize.where(
                                    sequelize.fn('regexp_replace', sequelize.col('phoneNumber'), '[^0-9]', 'g'),
                                    cleanDigits
                                )
                            ] : [])
                        ]
                    }
                });

                const targetRecipient = mapping ? mapping.whatsappJid : reminder.phoneNumber;

                // Send via WhatsApp
                await whatsappBotService.sendMessage(targetRecipient, message);

                // Mark as sent
                reminder.status = 'sent';
                await reminder.save();

                // Handle recurrence — create the next reminder
                if (reminder.recurrence !== 'none' && RECURRENCE_OFFSETS[reminder.recurrence]) {
                    const nextScheduledAt = new Date(
                        reminder.scheduledAt.getTime() + RECURRENCE_OFFSETS[reminder.recurrence]
                    );

                    await Reminder.create({
                        profileId: reminder.profileId,
                        phoneNumber: reminder.phoneNumber,
                        type: reminder.type,
                        title: reminder.title,
                        description: reminder.description,
                        scheduledAt: nextScheduledAt,
                        recurrence: reminder.recurrence,
                        status: 'pending'
                    });

                    console.log(`[ReminderScheduler] Created recurring reminder for ${reminder.phoneNumber} at ${nextScheduledAt.toISOString()}`);
                }

                console.log(`[ReminderScheduler] Sent reminder "${reminder.title}" to ${targetRecipient}`);
            } catch (err) {
                console.error(`[ReminderScheduler] Failed to process reminder ${reminder.id}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[ReminderScheduler] Error during scheduled run:', error.message);
    }
}

export function startReminderScheduler() {
    // Run every minute
    cron.schedule('* * * * *', processDueReminders);
    console.log('[ReminderScheduler] Started — checking for due reminders every minute.');
}
