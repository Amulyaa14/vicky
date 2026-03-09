import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRouter from './routes/auth';
import historyRouter from './routes/history';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend
app.use('/*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Mount Modular Routers
app.route('/api/auth', authRouter);
app.route('/api/history', historyRouter);

// Basic health check route
app.get('/api/health', (c) => c.json({ status: 'ok', message: 'Backend is running' }));

export default app;
