import departmentServices from './departmentServices.js';

class DepartmentController {
    async create(req, res) {
        try {
            // Protected: Approved HOD only (HOD practitioner ID in req.user.id)
            const hodId = req.user.id;
            const department = await departmentServices.createDepartment(hodId, req.body);
            return res.status(201).json({
                message: 'Department registered successfully',
                department
            });
        } catch (error) {
            console.error('Department create controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async approve(req, res) {
        try {
            // Protected: Organization only (organization_id in req.user.id)
            const orgId = req.user.id;
            const { department_id } = req.body;
            const message = await departmentServices.approveDepartment(orgId, department_id);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Department approve controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async fetch(req, res) {
        try {
            // Protected: Organization only
            const orgId = req.user.id;
            const filters = {
                status: req.query.status,
                dateJoined: req.query.dateJoined
            };
            const departments = await departmentServices.fetchDepartments(orgId, filters);
            return res.status(200).json(departments);
        } catch (error) {
            console.error('Department fetch controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteDept(req, res) {
        try {
            // Protected: Organization or HOD (practitioner role with job: 'hod')
            const requesterId = req.user.id;
            const requesterRole = req.user.role; // 'organization' or 'practitioner'
            const departmentId = req.body.department_id || req.query.department_id;

            if (!departmentId) {
                return res.status(400).json({ error: 'department_id is required.' });
            }

            const message = await departmentServices.deleteDepartment(requesterId, requesterRole, departmentId);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Department delete controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const { accessToken, refreshToken } = await departmentServices.login({ username, password });

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 4 * 60 * 60 * 1000 // 4 hours
            });

            return res.status(200).json({ message: 'Logged in successfully' });
        } catch (error) {
            console.error('Department login controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async renewToken(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token is missing.' });
            }

            const newAccessToken = await departmentServices.renewAccessToken(refreshToken);

            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            return res.status(200).json({ message: 'Access token renewed successfully' });
        } catch (error) {
            console.error('Department renewToken controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            const message = await departmentServices.logout(refreshToken);

            res.clearCookie('access_token', { httpOnly: true, sameSite: 'none', secure: true });
            res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'none', secure: true });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Department logout controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
}

export default new DepartmentController();
