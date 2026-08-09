import cron from 'node-cron';
import { Op } from 'sequelize';
import Referral from './referralModel.js';


async function deleteDueReferrals() {
    try {
        const now = new Date();

        const dueReferrals = await Referral.findAll({
            where: {
                deleteAt: { [Op.lte]: now },
            },
            attributes: ['id']
        });

        if (dueReferrals.length === 0) return;

        console.log(`[ReferralScheduler]: Deleting ${dueReferrals.length} due referral(s)...`);

        const deleted = await Referral.destroy({
            where: {
                id: { [Op.in]: dueReferrals.map(r => r.id) }
            }
        });

        console.log(`[ReferralScheduler]: deleted ${deleted} due referral(s).`);
    } catch (error) {
        console.error('[ReferralScheduler]: Error during scheduled run:', error.message);
    }
}

export function startReferralScheduler() {
    // Run every day at midnight
    cron.schedule('0 0 * * *', deleteDueReferrals);
    console.log('[ReferralScheduler] Started — checking for due referrals every day.');
}
