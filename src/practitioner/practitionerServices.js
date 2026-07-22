import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Practitioner from './practitionerModel.js';
import Department from '../department/departmentModel.js';
import emailService from '../services/emailServices/emailService.js';
import redisClient from '../config/redisConfig.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

class PractitionerServices {
    async registerPractitioner(data) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Check unique username
        const existingUsername = await Practitioner.findOne({ where: { username: data.username } });
        if (existingUsername) {
            const err = new Error('Username is already taken.');
            err.statusCode = 400;
            throw err;
        }

        // Create practitioner as pending
        const practitioner = await Practitioner.create({
            ...data,
            password: hashedPassword,
            status: 'pending'
        });

        // Email notification to the HOD of the department
        if (data.department_id) {
            const department = await Department.findByPk(data.department_id);
            if (department && department.headOfDepartmentId) {
                const hod = await Practitioner.findByPk(department.headOfDepartmentId);
                if (hod) {
                    await emailService.sendEmail({
                        to: hod.email,
                        subject: 'New Practitioner Registration Notification',
                        html: `<p>Hello Dr. ${hod.lastName},</p>
                               <p>A new practitioner, ${data.firstName} ${data.lastName}, has registered under your department (${department.departmentName}).</p>
                               <p>Please log in and review their request to approve or reject them.</p>`
                    });
                }
            }
        }

        return 'practitioner registered successfully';
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

    async approvePractitioner(hodId, pracId) {
        // Fetch the department where this practitioner is HOD
        const department = await Department.findOne({ where: { headOfDepartmentId: hodId } });
        if (!department) {
            const err = new Error('HOD department not found.');
            err.statusCode = 404;
            throw err;
        }

        const practitioner = await Practitioner.findOne({
            where: { id: pracId, department_id: department.id }
        });
        if (!practitioner) {
            const err = new Error('Practitioner not found under your department.');
            err.statusCode = 404;
            throw err;
        }

        practitioner.status = 'approved';
        await practitioner.save();

        return 'practitioner approved successfully';
    }

    async rejectPractitioner(hodId, pracId) {
        const department = await Department.findOne({ where: { headOfDepartmentId: hodId } });
        if (!department) {
            const err = new Error('HOD department not found.');
            err.statusCode = 404;
            throw err;
        }

        const practitioner = await Practitioner.findOne({
            where: { id: pracId, department_id: department.id }
        });
        if (!practitioner) {
            const err = new Error('Practitioner not found under your department.');
            err.statusCode = 404;
            throw err;
        }

        practitioner.status = 'rejected';
        await practitioner.save();

        return 'practitioner rejected successfully';
    }

    async fetchPractitioners(hodId, filters = {}) {
        const department = await Department.findOne({ where: { headOfDepartmentId: hodId } });
        if (!department) {
            const err = new Error('HOD department not found.');
            err.statusCode = 404;
            throw err;
        }

        const where = { department_id: department.id };
        if (filters.job) where.job = filters.job;
        if (filters.status) where.status = filters.status;
        if (filters.specialization) where.specialization = filters.specialization;

        return await Practitioner.findAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
    }

    async deletePractitioner(hodId, pracId) {
        if (hodId === pracId) {
            const err = new Error('Deletion of practitioner failed. The practitioner is the HOD.');
            err.statusCode = 400;
            throw err;
        }

        const department = await Department.findOne({ where: { headOfDepartmentId: hodId } });
        if (!department) {
            const err = new Error('HOD department not found.');
            err.statusCode = 404;
            throw err;
        }

        const practitioner = await Practitioner.findOne({
            where: { id: pracId, department_id: department.id }
        });
        if (!practitioner) {
            const err = new Error('Practitioner not found under your department.');
            err.statusCode = 404;
            throw err;
        }

        await practitioner.destroy();
        return 'practitioner deleted successfully';
    }
}

export default new PractitionerServices();
