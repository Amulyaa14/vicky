import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset link');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <Helmet>
                <title>Forgot Password - QuickTools</title>
            </Helmet>

            <div className="glass-card w-full max-w-md p-8 rounded-3xl relative overflow-hidden">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Forgot Password
                    </h1>
                    <p className="text-muted-foreground text-center mt-2 text-sm">
                        Enter your email address to receive a secure password reset link.
                    </p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <p className="text-foreground font-medium mb-6">
                            If an account exists for that email, a reset link has been sent. Please check your inbox (or local terminal output).
                        </p>
                        <Link to="/login" className="text-primary hover:text-primary/80 font-semibold group flex items-center justify-center gap-2">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5 pl-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="demo@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                        </button>

                        <div className="text-center pt-4 border-t border-border/50">
                            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block pt-2">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
