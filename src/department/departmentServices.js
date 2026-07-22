import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Department from './departmentModel.js';
import Organization from '../organization/organizationModel.js';
import Practitioner from '../practitioner/practitionerModel.js';
import emailService from '../services/emailServices/emailService.js';
import redisClient from '../config/redisConfig.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

class DepartmentServices {
    async createDepartment(hodId, data) {
        // Verify HOD is approved as a practitioner
        const hod = await Practitioner.findByPk(hodId);
        if (!hod) {
            const err = new Error('HOD practitioner not found.');
            err.statusCode = 404;
            throw err;
        }

        if (hod.job !== 'hod' || hod.status !== 'approved') {
            const err = new Error('Only approved Head of Department (HOD) practitioners can register a department.');
            err.statusCode = 403;
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

        // Fetch organization to get email and ensure it exists
        const org = await Organization.findByPk(data.organization_id);
        if (!org) {
            const err = new Error('Organization not found.');
            err.statusCode = 404;
            throw err;
        }

        // Create department in pending status
        const department = await Department.create({
            ...data,
            password: hashedPassword,
            headOfDepartmentId: hodId,
            status: 'pending'
        });

        // Set HOD practitioner's department_id
        hod.department_id = department.id;
        await hod.save();

        // Send email to Organization
        await emailService.sendEmail({
            to: org.email,
            subject: 'New Department Registered Under Your Organization',
            html: `<p>Hello ${org.name},</p>
                   <p>A new department has been registered under your organization:</p>
                   <p><strong>Department Name:</strong> ${data.departmentName}</p>
                   <p><strong>HOD Name:</strong> ${hod.firstName} ${hod.lastName}</p>
                   <p>Please log in to your dashboard to review and approve this department.</p>`
        });

        return department;
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
