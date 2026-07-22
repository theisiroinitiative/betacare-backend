import organizationServices from './organizationServices.js';

class OrganizationController {
    async create(req, res) {
        try {
            const message = await organizationServices.createOrganization(req.body);
            return res.status(201).json({ message });
        } catch (error) {
            console.error('Organization create controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const { accessToken, refreshToken } = await organizationServices.login({ username, password });

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
            console.error('Organization login controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async fetch(req, res) {
        try {
            // Admin only
            const page = parseInt(req.query.page, 10) || 1;
            const filters = {
                status: req.query.status,
                type: req.query.type,
                state: req.query.state,
                ownership: req.query.ownership,
                dateJoined: req.query.dateJoined
            };

            const result = await organizationServices.fetchOrganizations(filters, page);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Organization fetch controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            // Admin only
            const { organization_id, status } = req.body;
            const message = await organizationServices.updateStatus(organization_id, status);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Organization updateStatus controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async approve(req, res) {
        try {
            // Admin only
            const { organization_id, username } = req.body;
            const adminId = req.user.userId; // Admin ID from JWT

            const message = await organizationServices.approveOrganization(organization_id, username, adminId);
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Organization approve controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async summary(req, res) {
        try {
            // Organization manager only (org ID should match JWT id)
            const organizationId = req.query.organization_id || req.body.organization_id || req.user.id;

            if (req.user.role !== 'organization' || req.user.id !== organizationId) {
                return res.status(403).json({ error: 'Access denied. You can only query your own organization summary.' });
            }

            const result = await organizationServices.getSummary(organizationId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Organization summary controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async renewToken(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token is missing.' });
            }

            const newAccessToken = await organizationServices.renewAccessToken(refreshToken);

            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            return res.status(200).json({ message: 'Access token renewed successfully' });
        } catch (error) {
            console.error('Organization renewToken controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            const message = await organizationServices.logout(refreshToken);

            res.clearCookie('access_token', { httpOnly: true, sameSite: 'none', secure: true });
            res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'none', secure: true });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Organization logout controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteOrg(req, res) {
        try {
            // Organization manager only (org ID from JWT)
            const orgId = req.user.id;
            const message = await organizationServices.deleteOrganization(orgId);

            res.clearCookie('access_token', { httpOnly: true, sameSite: 'none', secure: true });
            res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'none', secure: true });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Organization delete controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
}

export default new OrganizationController();
