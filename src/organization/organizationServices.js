import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Organization from './organizationModel.js';
import Department from '../department/departmentModel.js';
import Practitioner from '../practitioner/practitionerModel.js';
import emailService from '../services/emailServices/emailService.js';
import redisClient from '../config/redisConfig.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

class OrganizationServices {
    async createOrganization(data) {
        // Check for existing registration number
        const existingReg = await Organization.findOne({ where: { registrationNumber: data.registrationNumber } });
        if (existingReg) {
            const err = new Error('Organization with this registration number already exists.');
            err.statusCode = 400;
            throw err;
        }

        // Create organization in pending state
        await Organization.create({
            ...data,
            status: 'pending'
        });

        return 'Your organization has been created, wait for approval';
    }

    async login({ username, password }) {
        const org = await Organization.findOne({ where: { username } });
        if (!org) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        if (org.status !== 'active') {
            const err = new Error(`Organization login is unauthorized. Account status: ${org.status}`);
            err.statusCode = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, org.password);
        if (!isMatch) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        const payload = {
            id: org.id,
            username: org.username,
            role: 'organization'
        };

        const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '4h' });

        // Store refresh token in Redis (expires in 4 hours)
        await redisClient.set(`refresh_token:org:${org.id}`, refreshToken, { EX: 4 * 60 * 60 });

        return { accessToken, refreshToken };
    }

    async fetchOrganizations(filters = {}, page = 1) {
        const limit = 10;
        const offset = (page - 1) * limit;

        const where = {};
        if (filters.status) where.status = filters.status;
        if (filters.type) where.type = filters.type;
        if (filters.state) where.state = filters.state;
        if (filters.ownership) where.ownership = filters.ownership;
        if (filters.dateJoined) {
            where.createdAt = {
                [Op.gte]: new Date(filters.dateJoined)
            };
        }

        const { rows, count } = await Organization.findAndCountAll({
            where,
            attributes: [
                'id', 'name', 'email', 'phone', 'state',
                'registrationNumber', 'status', 'type',
                'address', 'lga', 'ownership', 'createdAt'
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            organizations: rows,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        };
    }

    async updateStatus(orgId, status) {
        const org = await Organization.findByPk(orgId);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        org.status = status;
        await org.save();

        return 'success';
    }

    async approveOrganization(orgId, username, adminId) {
        const org = await Organization.findByPk(orgId);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        // Check if username is already taken
        const existingUsername = await Organization.findOne({ where: { username } });
        if (existingUsername && existingUsername.id !== orgId) {
            const err = new Error('Username is already taken.');
            err.statusCode = 400;
            throw err;
        }

        // Generate dynamic 8-character password
        const initialPassword = Math.random().toString(36).slice(-8);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(initialPassword, salt);

        // Update organization attributes
        org.status = 'active';
        org.username = username;
        org.password = hashedPassword;
        org.verifiedBy = adminId;
        org.verifiedAt = new Date();

        await org.save();

        // Send credentials to organization's email
        await emailService.sendEmail({
            to: org.email,
            subject: 'BetaCare Hospital Integration Approved',
            html: `<p>Hello ${org.name},</p>
                   <p>Your request to integrate with BetaCare has been approved!</p>
                   <p>Here are your initial login credentials:</p>
                   <p><strong>Username:</strong> ${username}</p>
                   <p><strong>Initial Password:</strong> ${initialPassword}</p>
                   <p>Please log in and update your password immediately.</p>`
        });

        return 'success';
    }

    async getSummary(orgId) {
        const org = await Organization.findByPk(orgId);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        const departments = await Department.findAll({
            where: { organization_id: orgId },
            attributes: ['id', 'departmentName', 'description', 'phone', 'email', 'status']
        });

        const totalPractitioners = await Practitioner.count({
            where: { organization_id: orgId }
        });

        return {
            departments,
            totalPractitioners
        };
    }

    async renewAccessToken(refreshTokenString) {
        try {
            const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
            if (decoded.role !== 'organization') {
                throw new Error();
            }

            // Check if active in Redis
            const activeToken = await redisClient.get(`refresh_token:org:${decoded.id}`);
            if (activeToken !== refreshTokenString) {
                const err = new Error('Invalid or revoked refresh token.');
                err.statusCode = 401;
                throw err;
            }

            const payload = {
                id: decoded.id,
                username: decoded.username,
                role: 'organization'
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
            await redisClient.del(`refresh_token:org:${decoded.id}`);
        } catch (err) {
            // Ignore token parsing errors on logout
        }
        return 'logout successfully';
    }

    async deleteOrganization(orgId) {
        const org = await Organization.findByPk(orgId);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        // Delete from database. Associations with CASCADE will delete departments & practitioners.
        await Organization.destroy({ where: { id: orgId } });
        return 'success';
    }
}

export default new OrganizationServices();
