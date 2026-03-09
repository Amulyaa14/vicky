import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing password reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setSuccess(true);
            setTimeout(() => navigate('/login', { state: { message: 'Password reset successful! Please log in.' } }), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token && !error) {
        return null; // Don't render frame if missing token
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <Helmet>
                <title>Reset Password - QuickTools</title>
            </Helmet>

            <div className="glass-card w-full max-w-md p-8 rounded-3xl relative overflow-hidden">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Reset Password
                    </h1>
                    <p className="text-muted-foreground text-center mt-2 text-sm">
                        Please enter your new password below.
                    </p>
                </div>

                {error && !token ? (
                    <div className="text-center">
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center mb-6">
                            {error}
                        </div>
                        <Link to="/forgot-password" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                            Request a new link
                        </Link>
                    </div>
                ) : success ? (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <p className="text-foreground font-medium mb-2">Password reset successful!</p>
                        <p className="text-muted-foreground text-sm">Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5 pl-1">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-5 h-5 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-background/50 border border-border rounded-xl py-3 pl-11 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || password.length < 8}
                            className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set New Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
