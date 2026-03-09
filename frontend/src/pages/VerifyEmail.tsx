import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Verification token is missing.');
            return;
        }

        const verifyToken = async () => {
            try {
                const res = await fetch(`${API_URL}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to verify email');
                }

                setStatus('success');
                setMessage(data.message || 'Email verified successfully!');

                // Automatically redirect to login after a few seconds
                setTimeout(() => navigate('/login', { state: { message: 'Email verified! Please log in.' } }), 3000);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message);
            }
        };

        verifyToken();
    }, [token, navigate]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Helmet>
                <title>Verify Email - QuickTools</title>
            </Helmet>

            <div className="glass-card w-full max-w-md p-8 rounded-3xl text-center">
                <div className="mb-6 flex justify-center">
                    {status === 'loading' && <Loader2 className="w-16 h-16 text-primary animate-spin" />}
                    {status === 'success' && <CheckCircle2 className="w-16 h-16 text-green-500" />}
                    {status === 'error' && <XCircle className="w-16 h-16 text-destructive" />}
                </div>

                <h1 className="text-2xl font-bold mb-4">Email Verification</h1>

                <p className="text-muted-foreground mb-8">
                    {status === 'loading' && 'We are verifying your email address. Please wait...'}
                    {status === 'success' && message}
                    {status === 'error' && message}
                </p>

                {status !== 'loading' && (
                    <Link
                        to="/login"
                        className="inline-block w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        Go to Login
                    </Link>
                )}
            </div>
        </div>
    );
}
