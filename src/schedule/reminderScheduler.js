import cron from 'node-cron';
import { Op } from 'sequelize';
import Reminder from './reminderModel.js';
import whatsappBotService from '../agent/agentServices.js';

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

        const dueReminders = await Reminder.findAll({
            where: {
                scheduledAt: { [Op.lte]: now },
                status: 'pending'
            }
        });

        if (dueReminders.length === 0) return;

        console.log(`[ReminderScheduler] Processing ${dueReminders.length} due reminder(s)...`);

        for (const reminder of dueReminders) {
            try {
                // Format reminder message in Pidgin
                const message = `⏰ *BetaCare Reminder*\n\n` +
                    `📌 *${reminder.title}*\n` +
                    `${reminder.description || ''}\n\n` +
                    `Type: ${reminder.type}\n` +
                    `Abeg no forget o! 💪`;

                // Send via WhatsApp
                await whatsappBotService.sendMessage(reminder.phoneNumber, message);

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

                console.log(`[ReminderScheduler] Sent reminder "${reminder.title}" to ${reminder.phoneNumber}`);
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
