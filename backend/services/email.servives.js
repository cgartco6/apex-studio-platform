const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendEmail({ to, subject, text, html, attachments }) {
        try {
            const mailOptions = {
                from: `"Apex Digital Studio" <${process.env.SMTP_FROM}>`,
                to,
                subject,
                text,
                html,
                attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }

    async sendWelcomeEmail(user) {
        const html = `
            <h1>Welcome to Apex Digital Studio!</h1>
            <p>Hi ${user.name},</p>
            <p>Thank you for joining Apex Digital Studio. We're excited to have you on board!</p>
            <p>With our platform, you can:</p>
            <ul>
                <li>Create stunning designs with AI assistance</li>
                <li>Manage your design projects efficiently</li>
                <li>Collaborate with our design team</li>
                <li>Access premium design tools</li>
            </ul>
            <p>Get started by exploring our products or creating your first design project!</p>
            <p>Best regards,<br>The Apex Digital Studio Team</p>
        `;

        return this.sendEmail({
            to: user.email,
            subject: 'Welcome to Apex Digital Studio!',
            html
        });
    }

    async sendOrderConfirmation(order, user) {
        const html = `
            <h1>Order Confirmation</h1>
            <p>Hi ${user.name},</p>
            <p>Thank you for your order! Here are your order details:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Total Amount:</strong> $${order.totalPrice}</p>
            </div>
            <p>We'll notify you once your order is processed.</p>
            <p>Thank you for choosing Apex Digital Studio!</p>
        `;

        return this.sendEmail({
            to: user.email,
            subject: `Order Confirmation - ${order._id}`,
            html
        });
    }

    async sendDesignReadyNotification(project, user) {
        const html = `
            <h1>Your Design is Ready!</h1>
            <p>Hi ${user.name},</p>
            <p>Great news! Your design project "${project.name}" is now ready for review.</p>
            <p>You can access your design from your dashboard.</p>
            <p>If you have any feedback or revisions, please don't hesitate to contact our design team.</p>
            <p>Best regards,<br>The Apex Digital Studio Design Team</p>
        `;

        return this.sendEmail({
            to: user.email,
            subject: `Design Ready: ${project.name}`,
            html
        });
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const html = `
            <h1>Password Reset Request</h1>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Click the link below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        return this.sendEmail({
            to: user.email,
            subject: 'Password Reset Request - Apex Digital Studio',
            html
        });
    }
}

module.exports = new EmailService();
