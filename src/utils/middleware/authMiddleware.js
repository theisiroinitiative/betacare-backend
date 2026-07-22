import { verifyAccessToken, verifyPasswordResetToken } from '../../services/tokenServices/token.js';
import Practitioner from '../../practitioner/practitionerModel.js';
import Organization from '../../organization/organizationModel.js';
import Department from '../../department/departmentModel.js';

/**
 * Middleware to authenticate requests using JWT access token stored in cookies.
 */
export function authenticateUser(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing. Please log in.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired access token.' });
    }

    req.user = decoded;
    next();
}

/**
 * Middleware to authenticate password reset requests using password reset token stored in cookies.
 */
export function authenticatePasswordReset(req, res, next) {
    const token = req.cookies.password_reset_token;

    if (!token) {
        return res.status(401).json({ error: 'Password reset token is missing. Please verify your email first.' });
    }

    const decoded = verifyPasswordResetToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired password reset token.' });
    }

    req.user = decoded;
    next();
}

/**
 * Middleware to verify that the logged-in user is an administrator.
 */
export function authenticateAdmin(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    req.user = decoded;
    next();
}

/**
 * Middleware to verify the logged-in entity is an active Organization.
 */
export async function authenticateOrganization(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.role !== 'organization') {
        return res.status(403).json({ error: 'Access denied. Organization credentials required.' });
    }

    // Verify Organization is still active in DB
    try {
        const org = await Organization.findByPk(decoded.id);
        if (!org || org.status !== 'active') {
            return res.status(403).json({ error: 'Organization is not active or has been suspended.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
}

/**
 * Middleware to verify the logged-in entity is an approved Department.
 */
export async function authenticateDepartment(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.role !== 'department') {
        return res.status(403).json({ error: 'Access denied. Department credentials required.' });
    }

    try {
        const dept = await Department.findByPk(decoded.id);
        if (!dept || dept.status !== 'approved') {
            return res.status(403).json({ error: 'Department is not approved or is inactive.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
}

/**
 * Middleware to verify the logged-in entity is an approved Practitioner.
 */
export async function authenticatePractitioner(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.role !== 'practitioner') {
        return res.status(403).json({ error: 'Access denied. Practitioner credentials required.' });
    }

    try {
        const prac = await Practitioner.findByPk(decoded.id);
        if (!prac || prac.status !== 'approved') {
            return res.status(403).json({ error: 'Practitioner account is pending approval or inactive.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
}

/**
 * Middleware to verify the logged-in practitioner is an approved Head of Department (HOD).
 */
export async function authenticateHOD(req, res, next) {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.role !== 'practitioner') {
        return res.status(403).json({ error: 'Access denied. Practitioner credentials required.' });
    }

    try {
        const prac = await Practitioner.findByPk(decoded.id);
        if (!prac || prac.job !== 'hod' || prac.status !== 'approved') {
            return res.status(403).json({ error: 'Access denied. Only approved Heads of Department (HOD) are authorized.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
}
