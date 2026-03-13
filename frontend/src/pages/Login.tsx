import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                toast.success('Logged in successfully!');
                navigate('/');
            } else {
                if (data.unverified) {
                    toast.error('Please verify your email address before logging in.', { duration: 5000 });
                } else {
                    toast.error(data.error || 'Login failed');
                }
            }
        } catch (err) {
            toast.error('Network error during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] bg-background">
            <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 mb-4">
                        <LogIn size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
                    <p className="text-muted-foreground text-sm mt-2">Log in to access your tools and history.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-muted/30 border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-muted/30 border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="flex justify-end pt-1">
                            <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-colors mt-6 disabled:opacity-50 shadow-lg shadow-violet-500/20"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
