import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Department from './departmentModel.js';
import Organization from '../organization/organizationModel.js';
import Practitioner from '../practitioner/practitionerModel.js';
import emailService from '../services/emailServices/emailService.js';
import redisClient from '../config/redisConfig.js';
import Referral from '../schedule/referrals/referralModel.js';
import { generateReferralCode } from '../utils/referralUtils.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

class DepartmentServices {
    async createDepartment(data, hodId = null) {
        // Validate referral code
        const referral = await Referral.findOne({
            where: {
                referralCode: data.referralCode,
                referrerType: 'organisation',
                status: 'fresh',
                deleteAt: { [Op.gt]: new Date() }
            }
        });

        if (!referral) {
            const err = new Error('Invalid or expired referral code.');
            err.statusCode = 400;
            throw err;
        }

        if (referral.referrerid !== data.organization_id) {
            const err = new Error('Referral code does not match the specified organization.');
            err.statusCode = 400;
            throw err;
        }

        // Check if username is already taken
        const existingUsername = await Department.findOne({ where: { username: data.username } });
        if (existingUsername) {
            const err = new Error('Department username is already taken.');
            err.statusCode = 400;
            throw err;
        }

        // Hash department password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Fetch organization to ensure it exists
        const org = await Organization.findByPk(data.organization_id);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        const effectiveHodId = hodId || data.headOfDepartmentId || null;

        // Create department directly in approved status (pre-authorized via referral code)
        const department = await Department.create({
            ...data,
            password: hashedPassword,
            headOfDepartmentId: effectiveHodId,
            status: 'approved'
        });

        if (effectiveHodId) {
            const hod = await Practitioner.findByPk(effectiveHodId);
            if (hod) {
                hod.department_id = department.id;
                await hod.save();
            }
        }

        // Mark referral code as used
        referral.status = 'used';
        await referral.save();

        return department;
    }

    async generateReferralCode(requesterId, requesterRole, { name, email }) {
        let deptId = requesterId;
        if (requesterRole === 'practitioner') {
            const dept = await Department.findOne({ where: { headOfDepartmentId: requesterId } });
            if (!dept) {
                const err = new Error('HOD department not found.');
                err.statusCode = 404;
                throw err;
            }
            deptId = dept.id;
        }

        const dept = await Department.findByPk(deptId);
        if (!dept) {
            const err = new Error('Department not found.');
            err.statusCode = 404;
            throw err;
        }

        const referralCode = generateReferralCode('REF-DEPT');
        const deleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        await Referral.create({
            referrerid: deptId,
            referrerType: 'department',
            target: email,
            deleteAt,
            referralCode,
            status: 'fresh'
        });

        await emailService.sendEmail({
            to: email,
            subject: 'Practitioner Invitation Referral Code',
            html: `<p>Hello ${name},</p>
                   <p>The department <strong>${dept.departmentName}</strong> has invited you to register as a practitioner on BetaCare.</p>
                   <p>Your referral code is: <strong>${referralCode}</strong></p>
                   <p>This referral code will expire in 7 days (on ${deleteAt.toUTCString()}).</p>`
        });

        return {
            message: 'Referral code generated and sent successfully',
            referralCode,
            deleteAt
        };
    }

    async approveDepartment(orgId, deptId) {
        const department = await Department.findOne({ where: { id: deptId, organization_id: orgId } });
        if (!department) {
            const err = new Error('Department not found under this organization.');
            err.statusCode = 404;
            throw err;
        }

        department.status = 'approved';
        await department.save();

        return 'success';
    }

    async fetchDepartments(orgId, filters = {}) {
        const where = { organization_id: orgId };
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.dateJoined) {
            where.createdAt = {
                [Op.gte]: new Date(filters.dateJoined)
            };
        }

        return await Department.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
    }

    async deleteDepartment(requesterId, requesterRole, deptId) {
        // Find department
        const department = await Department.findByPk(deptId);
        if (!department) {
            const err = new Error('Department not found.');
            err.statusCode = 404;
            throw err;
        }

        // Authorization check: requester must be either the organization or the HOD of the department
        if (requesterRole === 'organization') {
            if (department.organization_id !== requesterId) {
                const err = new Error('Access denied. Department does not belong to your organization.');
                err.statusCode = 403;
                throw err;
            }
        } else if (requesterRole === 'practitioner') {
            if (department.headOfDepartmentId !== requesterId) {
                const err = new Error('Access denied. Only the HOD of this department can delete it.');
                err.statusCode = 403;
                throw err;
            }
        } else {
            const err = new Error('Unauthorized role.');
            err.statusCode = 403;
            throw err;
        }

        // Deleting a department also deletes every practitioner under it.
        await Practitioner.destroy({ where: { department_id: deptId } });

        // Delete the department itself
        await Department.destroy({ where: { id: deptId } });

        return 'Department and all practitioners under it deleted successfully';
    }

    async login({ username, password }) {
        const dept = await Department.findOne({ where: { username } });
        if (!dept) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        if (dept.status !== 'approved') {
            const err = new Error(`Department login is unauthorized. Status: ${dept.status}`);
            err.statusCode = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, dept.password);
        if (!isMatch) {
            const err = new Error('Invalid username or password.');
            err.statusCode = 401;
            throw err;
        }

        const payload = {
            id: dept.id,
            username: dept.username,
            role: 'department',
            headOfDepartmentId: dept.headOfDepartmentId
        };

        const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '4h' });

        // Store refresh token in Redis (expires in 4 hours)
        await redisClient.set(`refresh_token:dept:${dept.id}`, refreshToken, { EX: 4 * 60 * 60 });

        return { accessToken, refreshToken };
    }

    async renewAccessToken(refreshTokenString) {
        try {
            const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
            if (decoded.role !== 'department') {
                throw new Error();
            }

            const activeToken = await redisClient.get(`refresh_token:dept:${decoded.id}`);
            if (activeToken !== refreshTokenString) {
                const err = new Error('Invalid or revoked refresh token.');
                err.statusCode = 401;
                throw err;
            }

            const payload = {
                id: decoded.id,
                username: decoded.username,
                role: 'department',
                headOfDepartmentId: decoded.headOfDepartmentId
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
            await redisClient.del(`refresh_token:dept:${decoded.id}`);
        } catch (err) {
            // Ignore token parsing errors on logout
        }
        return 'logout successfully';
    }
}

export default new DepartmentServices();
