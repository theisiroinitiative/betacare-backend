import authServices from './authServices.js';

class AuthController {
    async register(req, res) {
        try {
            const { firstname, lastname, email, password, phoneNumber } = req.body;
            const message = await authServices.register({ firstname, lastname, email, password, phoneNumber });
            return res.status(201).json({ message });
        } catch (error) {
            console.error('Register controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async verifyOTP(req, res) {
        try {
            const { email, otpcode } = req.body;
            const message = await authServices.verifyOTP({ email, otpcode });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Verify OTP controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async verifyAccount(req, res) {
        try {
            const { email } = req.body;
            const message = await authServices.verifyAccount({ email });
            return res.status(200).json({ message });
        } catch (error) {
            console.error('Verify account controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async verifyEmail(req, res) {
        try {
            const { email, otpcode } = req.body;
            const resetToken = await authServices.verifyEmail({ email, otpcode });

            // Set httponly cookie for password-reset-only token with TTL of 5 minutes
            res.cookie('password_reset_token', resetToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 5 * 60 * 1000 // 5 minutes
            });

            return res.status(200).json({ message: 'Email verified successfully. Proceed to reset password.' });
        } catch (error) {
            console.error('Verify email controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async passwordReset(req, res) {
        try {
            const { newpassword } = req.body;
            const userId = req.user.userId;

            const message = await authServices.resetPassword(userId, newpassword);

            // Clear the password reset token cookie
            res.clearCookie('password_reset_token', {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Password reset controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const { accessToken, refreshToken } = await authServices.login({ email, password });

            // Set HttpOnly cookies with SameSite=None and Secure=True
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
            console.error('Login controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async renewToken(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token is missing.' });
            }

            const newAccessToken = await authServices.renewAccessToken(refreshToken);

            // Set new access token cookie
            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            return res.status(200).json({ message: 'Access token renewed successfully' });
        } catch (error) {
            console.error('Renew token controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refresh_token;
            const message = await authServices.logout(refreshToken);

            // Clear cookies
            res.clearCookie('access_token', {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            });

            res.clearCookie('refresh_token', {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Logout controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }

    async deleteAccount(req, res) {
        try {
            const userId = req.user.userId;
            const message = await authServices.deleteAccount(userId);

            // Clear all cookies
            res.clearCookie('access_token', {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            });

            res.clearCookie('refresh_token', {
                httpOnly: true,
                sameSite: 'none',
                secure: true
            });

            return res.status(200).json({ message });
        } catch (error) {
            console.error('Delete account controller error:', error);
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
}

export default new AuthController();
