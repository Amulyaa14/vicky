import { Hono } from 'hono';
import { verify } from 'hono/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const historyRouter = new Hono<{ Bindings: Bindings }>();

// Middleware to verify JWT
export const authMiddleware = async (c: any, next: any) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = header.split(' ')[1];
    try {
        const payload = await verify(token, c.env.JWT_SECRET);
        c.set('user', payload);
        await next();
    } catch (e) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
};

// Save AI History
historyRouter.post('/ai', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const { toolName, inputText, outputText } = await c.req.json();

        await c.env.DB.prepare(
            'INSERT INTO ai_history (user_id, tool_name, input_text, output_text) VALUES (?, ?, ?, ?)'
        ).bind(user.id, toolName, inputText, outputText).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Save Document History
historyRouter.post('/document', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const { originalFormat, targetFormat, fileName } = await c.req.json();

        // Backend Validation: Only PDF allowed
        if (originalFormat !== 'pdf' || !fileName.toLowerCase().endsWith('.pdf')) {
            return c.json({ error: 'Only PDF files are allowed for conversion' }, 400);
        }

        await c.env.DB.prepare(
            'INSERT INTO document_history (user_id, original_format, target_format, file_name) VALUES (?, ?, ?, ?)'
        ).bind(user.id, originalFormat, targetFormat, fileName).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

historyRouter.post('/audio', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const { fileName, outputFileName, sourceFormat, targetFormat } = await c.req.json();

        if (!fileName || !outputFileName || !sourceFormat || !targetFormat) {
            return c.json({ error: 'Missing conversion metadata' }, 400);
        }

        await c.env.DB.prepare(
            'INSERT INTO audio_history (user_id, file_name, output_file_name, source_format, target_format) VALUES (?, ?, ?, ?, ?)'
        ).bind(user.id, fileName, outputFileName, sourceFormat, targetFormat).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default historyRouter;
