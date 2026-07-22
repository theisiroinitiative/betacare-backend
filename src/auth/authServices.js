import bcrypt from 'bcryptjs';
import UserAuth from './authModel.js';
import Token from '../services/tokenServices/tokenModel.js';
import otpService from '../services/otpServices/otpService.js';
import { generateOTP } from '../services/otpServices/otp.js';
import emailService from '../services/emailServices/emailService.js';
import tokenService from '../services/tokenServices/tokenServices.js';
import {
    signAccessToken,
    signRefreshToken,
    signPasswordResetToken,
    verifyRefreshToken
} from '../services/tokenServices/token.js';

class AuthServices {
    async register({ firstname, lastname, email, password, phoneNumber }) {
        // Check if user already exists
        const existingEmail = await UserAuth.findOne({ where: { email } });
        if (existingEmail) {
            const err = new Error('Email is already registered.');
            err.statusCode = 400;
            throw err;
        }

        const existingPhone = await UserAuth.findOne({ where: { phoneNumber } });
        if (existingPhone) {
            const err = new Error('Phone number is already registered.');
            err.statusCode = 400;
            throw err;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Store user details in DB
        await UserAuth.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            phoneNumber,
            isEmailVerified: false,
            isWhatsappVerified: true // defaults to true in requirements
        });

        // Generate OTP code
        const otp = generateOTP();

        // Store in Redis (TTL: 5 minutes / 300 seconds)
        await otpService.storeOTP(email, otp, 300);

        // Send OTP to user's email
        await emailService.sendEmail({
            to: email,
            subject: 'Verify Your BetaCare Account',
            html: `<p>Welcome to BetaCare, ${firstname}!</p>
                   <p>Please verify your email address by entering the following OTP code:</p>
                   <h2>${otp}</h2>
                   <p>This code will expire in 5 minutes.</p>`
        });

        return 'OTP sent to mail';
    }

    async verifyOTP({ email, otpcode }) {
        const user = await UserAuth.findOne({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Verify and delete OTP
        const isValid = await otpService.verifyOTP(email, otpcode);
        if (!isValid) {
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        // Update user verification status
        user.isEmailVerified = true;
        await user.save();

        return 'Email verified successfully. Proceed to complete your health profile.';
    }

    async verifyAccount({ email }) {
        const user = await UserAuth.findOne({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Generate OTP code
        const otp = generateOTP();

        // Store in Redis (TTL: 5 minutes / 300 seconds)
        await otpService.storeOTP(email, otp, 300);

        // Send OTP to user's email
        await emailService.sendEmail({
            to: email,
            subject: 'BetaCare Password Reset Request',
            html: `<p>Hello ${user.firstname},</p>
                   <p>You requested to reset your password. Use the OTP code below to verify your identity:</p>
                   <h2>${otp}</h2>
                   <p>This code will expire in 5 minutes.</p>`
        });

        return 'verification code sent to mail';
    }

    async verifyEmail({ email, otpcode }) {
        const user = await UserAuth.findOne({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Verify and delete OTP
        const isValid = await otpService.verifyOTP(email, otpcode);
        if (!isValid) {
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        // Generate a temporary access token for password reset (TTL: 5 minutes)
        const resetToken = signPasswordResetToken(user.userId);

        return resetToken;
    }

    async resetPassword(userId, newpassword) {
        const user = await UserAuth.findOne({ where: { userId } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newpassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        return 'Password reset successfully';
    }

    async login({ email, password }) {
        const user = await UserAuth.findOne({ where: { email } });
        if (!user) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            throw err;
        }

        // Verify password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            throw err;
        }

        const userData = {
            userId: user.userId,
            email: user.email,
            role: user.role
        };

        // Generate tokens
        const accessToken = signAccessToken(userData);
        const refreshToken = await signRefreshToken(userData); // storing in db inside signRefreshToken

        return { accessToken, refreshToken };
    }

    async renewAccessToken(refreshTokenString) {
        const decoded = verifyRefreshToken(refreshTokenString);
        if (!decoded) {
            const err = new Error('Invalid or expired refresh token.');
            err.statusCode = 401;
            throw err;
        }

        // Find token in database
        const tokenRecord = await tokenService.findRefreshToken(decoded.email, refreshTokenString);
        if (!tokenRecord) {
            const err = new Error('Refresh token not found.');
            err.statusCode = 401;
            throw err;
        }

        // Check if token is still active (expiryStatus must be true)
        if (tokenRecord.expiryStatus !== true) {
            const err = new Error('Refresh token has expired or is inactive.');
            err.statusCode = 401;
            throw err;
        }

        const userData = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        // Generate new access token
        const newAccessToken = signAccessToken(userData);
        return newAccessToken;
    }

    async logout(refreshTokenString) {
        if (refreshTokenString) {
            await tokenService.invalidateRefreshToken(refreshTokenString);
        }
        return 'logged out successfully';
    }

    async deleteAccount(userId) {
        const user = await UserAuth.findOne({ where: { userId } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Cascade delete tokens first to prevent foreign key errors
        await Token.destroy({ where: { email: user.email } });

        // Delete user auth
        await UserAuth.destroy({ where: { userId } });

        return 'Account deleted successfully';
    }
}

export default new AuthServices();
