import crypto from 'crypto';

/**
 * Generates a unique referral code.
 * @param {string} prefix - Prefix for the referral code e.g. 'REF-ORG' or 'REF-DEPT'
 * @returns {string} The formatted referral code string.
 */
export function generateReferralCode(prefix = 'REF') {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${randomHex}`;
}
