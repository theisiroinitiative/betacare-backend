import redisClient from '../../config/redisConfig.js';
import bcrypt from 'bcryptjs';

class OTPService {
    /**
     * Hashes the OTP and stores it in Redis under the email key.
     * @param {string} email 
     * @param {string} otp 
     * @param {number} ttl - TTL in seconds (default 5 minutes / 300s)
     */
    async storeOTP(email, otp, ttl = 300) {
        // Generate bcrypt hash of the OTP
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);

        // Store with email as key
        await redisClient.set(email, otpHash, { EX: ttl });
    }

    /**
     * Fetches the stored OTP hash, deletes it immediately, and compares it with the entered OTP.
     * @param {string} email 
     * @param {string} enteredOtp 
     * @returns {Promise<boolean>}
     */
    async verifyOTP(email, enteredOtp) {
        // Fetch the stored OTP hash
        const storedHash = await redisClient.get(email);

        if (!storedHash) {
            return false;
        }

        // Delete from cache immediately on fetch
        await redisClient.del(email);

        // Compare entered OTP with stored hash
        return await bcrypt.compare(enteredOtp, storedHash);
    }

    /**
     * Generates a random 6-character alphanumeric code.
     * @returns {string}
     */
    generateAlphanumericCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Generates, hashes, and stores a WhatsApp verification code in Redis.
     * key: phoneNumber, value: bcrypt hash of XXXXXX-phoneNumber
     * @param {string} phoneNumber 
     * @returns {Promise<string>} The plain verification code (XXXXXX-phoneNumber)
     */
    async storeWhatsappVerificationCode(phoneNumber) {
        const alphanumeric = this.generateAlphanumericCode(6);
        const plainCode = `${alphanumeric}-${phoneNumber}`;

        const salt = await bcrypt.genSalt(10);
        const codeHash = await bcrypt.hash(plainCode, salt);

        // Store in Redis (key: phoneNumber, TTL: 24 hours / 86400s)
        await redisClient.set(phoneNumber, codeHash, { EX: 86400 });

        return plainCode;
    }
}

export default new OTPService();