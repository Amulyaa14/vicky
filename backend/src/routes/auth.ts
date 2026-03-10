import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { authMiddleware } from './history';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    RESEND_API_KEY?: string;
    FRONTEND_URL?: string;
};

const authRouter = new Hono<{ Bindings: Bindings }>();

const generateId = () => crypto.randomUUID();
const generateToken = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

const FRONTEND_URL_DEFAULT = 'http://localhost:5173';

// Simulated Email Sender Function
async function sendEmail(env: Bindings, to: string, subject: string, html: string) {
    if (env.RESEND_API_KEY) {
        // Send via Resend
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Auth <onboarding@resend.dev>', // Replace with verified domain
                    to: [to],
                    subject: subject,
                    html: html
                })
            });
        } catch (e) {
            console.error("Failed to send email via Resend:", e);
        }
    } else {
        // In local development or before Resend is configured, just print to terminal
        console.log('\n=======================================');
        console.log(`📧 MOCK EMAIL SENT TO: ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`CONTENT:\n${html.replace(/<[^>]*>?/gm, '')}`); // Strip basic HTML for logs
        console.log('=======================================\n');
    }
}

// 1. Register
authRouter.post('/register', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingUser) return c.json({ error: 'User already exists' }, 400);

        const id = generateId();
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const verificationToken = generateToken();

        await c.env.DB.prepare(
            'INSERT INTO users (id, email, password_hash, is_email_verified, verification_token) VALUES (?, ?, ?, 0, ?)'
        ).bind(id, email, hash, verificationToken).run();

        const frontendUrl = c.env.FRONTEND_URL || FRONTEND_URL_DEFAULT;
        const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

        await sendEmail(
            c.env,
            email,
            'Verify your email address',
            `<p>Welcome!</p><p>Please <a href="${verificationLink}">click here to verify your email address</a>.</p><br><p>Link: ${verificationLink}</p>`
        );

        return c.json({ message: 'Registration successful. Please check your email (or terminal console) to verify your account.' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// 2. Verify Email
authRouter.post('/verify-email', async (c) => {
    try {
        const { token } = await c.req.json();
        if (!token) return c.json({ error: 'Verification token required' }, 400);

        const user = await c.env.DB.prepare('SELECT id FROM users WHERE verification_token = ?').bind(token).first();
        if (!user) return c.json({ error: 'Invalid or expired verification token' }, 400);

        await c.env.DB.prepare(
            'UPDATE users SET is_email_verified = 1, verification_token = NULL WHERE id = ?'
        ).bind(user.id).run();

        return c.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// 3. Login
authRouter.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

        const user = await c.env.DB.prepare('SELECT id, email, password_hash, is_email_verified FROM users WHERE email = ?').bind(email).first();
        if (!user) return c.json({ error: 'Invalid credentials' }, 401);

        // Email verification check disabled for development
        // if (user.is_email_verified === 0) {
        //     return c.json({ error: 'Please verify your email address before logging in.', unverified: true }, 403);
        // }

        const isValid = bcrypt.compareSync(password, user.password_hash as string);
        if (!isValid) return c.json({ error: 'Invalid credentials' }, 401);

        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const userAgent = c.req.header('User-Agent') || 'unknown';
        await c.env.DB.prepare(
            'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES (?, ?, ?)'
        ).bind(user.id, ip, userAgent).run();

        const token = await sign({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET);

        return c.json({ user: { id: user.id, email: user.email }, token });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// 4. Get Current User ("Me")
authRouter.get('/me', authMiddleware, async (c) => {
    const user = c.get('user');
    return c.json({ user: { id: user.id, email: user.email } });
});

// 5. Forgot Password
authRouter.post('/forgot-password', async (c) => {
    try {
        const { email } = await c.req.json();
        if (!email) return c.json({ error: 'Email required' }, 400);

        const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!user) {
            // Always return success to prevent email enumeration
            return c.json({ message: 'If an account exists with that email, a reset link has been sent.' });
        }

        const resetToken = generateToken();
        // Set expiry for 1 hour from now
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await c.env.DB.prepare(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
        ).bind(resetToken, expires, user.id).run();

        const frontendUrl = c.env.FRONTEND_URL || FRONTEND_URL_DEFAULT;
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        await sendEmail(
            c.env,
            email,
            'Password Reset Request',
            `<p>You requested a password reset.</p><p>Please <a href="${resetLink}">click here to reset your password</a>.</p><p>This link expires in 1 hour.</p><br><p>Link: ${resetLink}</p>`
        );

        return c.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// 6. Reset Password
authRouter.post('/reset-password', async (c) => {
    try {
        const { token, newPassword } = await c.req.json();
        if (!token || !newPassword) return c.json({ error: 'Token and new password required' }, 400);

        // SQLite timestamps format comparison might require careful handling.
        // For simplicity, we compare ISO strings
        const now = new Date().toISOString();

        const user = await c.env.DB.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?').bind(token, now).first();

        if (!user) {
            return c.json({ error: 'Invalid or expired reset token' }, 400);
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);

        await c.env.DB.prepare(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
        ).bind(hash, user.id).run();

        return c.json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default authRouter;
