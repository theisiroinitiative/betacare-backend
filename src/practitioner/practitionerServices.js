import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Practitioner from './practitionerModel.js';
import emailService from '../services/emailServices/emailService.js';
import redisClient from '../config/redisConfig.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

class PractitionerServices {
    async registerPractitioner(data) {
        // Check unique username
        const existingUsername = await Practitioner.findOne({ where: { username: data.username } });
        if (existingUsername) {
            const err = new Error('Username is already taken.');
            err.statusCode = 400;
            throw err;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Create practitioner in pending status for manual Admin MDCN verification
        const practitioner = await Practitioner.create({
            ...data,
            password: hashedPassword,
            status: 'pending'
        });

        return 'Doctor registration submitted successfully. Your account is pending manual MDCN verification by an administrator.';
    }

    async login({ username, password }) {
        const prac = await Practitioner.findOne({ where: { username } });
        if (!prac) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        if (prac.status !== 'approved') {
            const err = new Error(`Practitioner account is pending approval or inactive. Current status: ${prac.status}`);
            err.statusCode = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, prac.password);
        if (!isMatch) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        const payload = {
            id: prac.id,
            username: prac.username,
            role: 'practitioner',
            job: prac.job
        };

        const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '4h' });

        // Store refresh token in Redis
        await redisClient.set(`refresh_token:prac:${prac.id}`, refreshToken, { EX: 4 * 60 * 60 });

        return { accessToken, refreshToken };
    }

    async renewAccessToken(refreshTokenString) {
        try {
            const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
            if (decoded.role !== 'practitioner') {
                throw new Error();
            }

            const activeToken = await redisClient.get(`refresh_token:prac:${decoded.id}`);
            if (activeToken !== refreshTokenString) {
                const err = new Error('Invalid or revoked refresh token.');
                err.statusCode = 401;
                throw err;
            }

            const payload = {
                id: decoded.id,
                username: decoded.username,
                role: 'practitioner',
                job: decoded.job
            };

            const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
            return accessToken;
        } catch (err) {
            const error = new Error('Invalid or expired refresh token.');
            error.statusCode = 401;
            throw error;
        }
    }

    async logout(refreshTokenString) {
        try {
            const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
            await redisClient.del(`refresh_token:prac:${decoded.id}`);
        } catch (err) {
            // Ignore token parsing errors on logout
        }
        return 'logout successfully';
    }

    async approvePractitioner(pracId) {
        const practitioner = await Practitioner.findByPk(pracId);
        if (!practitioner) {
            const err = new Error('Practitioner not found.');
            err.statusCode = 404;
            throw err;
        }

        practitioner.status = 'approved';
        await practitioner.save();

        await emailService.sendEmail({
            to: practitioner.email,
            subject: 'BetaCare Doctor Verification Approved',
            html: `<p>Hello Dr. ${practitioner.lastName},</p>
                   <p>Your doctor account has been verified via MDCN and approved by the platform administrator!</p>
                   <p>You can now log in to access linked patient health records.</p>`
        });

        return 'practitioner approved successfully';
    }

    async rejectPractitioner(pracId) {
        const practitioner = await Practitioner.findByPk(pracId);
        if (!practitioner) {
            const err = new Error('Practitioner not found.');
            err.statusCode = 404;
            throw err;
        }

        practitioner.status = 'rejected';
        await practitioner.save();

        return 'practitioner rejected successfully';
    }

    async fetchPractitioners(filters = {}) {
        const where = {};
        if (filters.job) where.job = filters.job;
        if (filters.status) where.status = filters.status;
        if (filters.specialization) where.specialization = filters.specialization;
        if (filters.mdcnNumber) where.mdcnNumber = filters.mdcnNumber;

        return await Practitioner.findAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
    }

    async deletePractitioner(pracId) {
        const practitioner = await Practitioner.findByPk(pracId);
        if (!practitioner) {
            const err = new Error('Practitioner not found.');
            err.statusCode = 404;
            throw err;
        }

        await practitioner.destroy();
        return 'practitioner deleted successfully';
    }
}

export default new PractitionerServices();
