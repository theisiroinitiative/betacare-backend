import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    async sendEmail({ to, subject, html }) {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        console.log(`[EmailService] Preparing to send email to ${to} with subject "${subject}"`);

        if (!apiKey) {
            console.warn('[EmailService] RESEND_API_KEY is not defined. Printing email content to console instead:');
            console.log(`--- EMAIL START ---\nTo: ${to}\nFrom: ${fromEmail}\nSubject: ${subject}\nBody:\n${html}\n--- EMAIL END ---`);
            return { success: true, mocked: true };
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: Array.isArray(to) ? to : [to],
                    subject: subject,
                    html: html
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[EmailService] Resend API error response:', data);
                throw new Error(data.message || 'Failed to send email via Resend API');
            }

            console.log('[EmailService] Email sent successfully via Resend:', data);
            return { success: true, data };
        } catch (error) {
            console.error('[EmailService] Error sending email via Resend:', error.message);
            // In development or test, we might want to log the email rather than completely fail
            return { success: false, error: error.message };
        }
    }
}

export default new EmailService();
