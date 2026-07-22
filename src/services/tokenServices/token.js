import jwt from 'jsonwebtoken';
import tokenService from './tokenServices.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

export function signAccessToken(userData) {
    // userData contains userId, email, role
    return jwt.sign(userData, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export async function signRefreshToken(userData) {
    // userData contains userId, email, role
    const refreshToken = jwt.sign(userData, JWT_REFRESH_SECRET, { expiresIn: '4h' });
    await tokenService.storeRefreshToken(userData.email, refreshToken);
    return refreshToken;
}

export function signPasswordResetToken(userId) {
    return jwt.sign(
        { userId, passwordResetOnly: true },
        JWT_ACCESS_SECRET, // using the access secret or we can use the same
        { expiresIn: '5m' }
    );
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_ACCESS_SECRET);
    } catch (err) {
        return null;
    }
}

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
        return null;
    }
}

export function verifyPasswordResetToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        if (decoded && decoded.passwordResetOnly) {
            return decoded;
        }
        return null;
    } catch (err) {
        return null;
    }
}