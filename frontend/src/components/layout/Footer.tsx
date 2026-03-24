import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const Footer = () => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = () => {
        const trimmed = email.trim();
        if (!trimmed) {
            toast.error('Please enter your email address.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast.error('Please enter a valid email address.');
            return;
        }
        setSubscribed(true);
        setEmail('');
        toast.success('🎉 You\'ve subscribed! We\'ll keep you updated.');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSubscribe();
    };

    return (
        <footer className="border-t border-border bg-card/50 mt-auto">
            {/* Grid: 1-col mobile → 2-col sm → 4-col md */}
            <div className="container py-10 px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4 sm:col-span-2 md:col-span-1">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Quick<span className="text-primary">Tools</span>
                        </span>
                    </Link>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                        The ultimate all-in-one platform for your daily digital needs.
                        Convert, Edit, and Create with professional-grade tools.
                    </p>
                </div>

                {/* Product */}
                <div>
                    <h4 className="font-semibold text-foreground mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/converter" className="hover:text-primary transition-colors">Document Converter</Link></li>
                        <li><Link to="/video-studio" className="hover:text-primary transition-colors">Video Editor</Link></li>
                        <li><Link to="/ai-tools" className="hover:text-primary transition-colors">AI Writer</Link></li>
                        <li><Link to="/image-editor" className="hover:text-primary transition-colors">Image Studio</Link></li>
                        <li><Link to="/bg-remover" className="hover:text-primary transition-colors">BG Remover</Link></li>
                    </ul>
                </div>

                {/* Company */}
                <div>
                    <h4 className="font-semibold text-foreground mb-4">Company</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                        <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                        <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                        <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>

                {/* Newsletter + Socials */}
                <div>
                    <h4 className="font-semibold text-foreground mb-4">Stay Updated</h4>
                    {subscribed ? (
                        <p className="text-sm text-green-400 font-medium py-2">✅ You're subscribed!</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your email"
                                className="bg-background border border-border rounded-md px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                                aria-label="Email for newsletter"
                            />
                            <button
                                onClick={handleSubscribe}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2.5 rounded-md transition-colors text-sm font-medium w-full"
                            >
                                Subscribe
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-4 mt-6">
                        <a href="https://github.com/Amulyaa14/vicky" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-foreground transition-colors p-1"><Github size={20} /></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-foreground transition-colors p-1"><Twitter size={20} /></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground transition-colors p-1"><Linkedin size={20} /></a>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-border/50">
                <div className="container py-5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p className="text-muted-foreground text-sm">
                        &copy; {new Date().getFullYear()} QuickTools. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
