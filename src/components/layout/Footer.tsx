import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="border-t border-border bg-card/50 mt-auto">
            <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
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

                <div>
                    <h4 className="font-semibold text-foreground mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/converter" className="hover:text-primary transition-colors">Document Converter</Link></li>
                        <li><Link to="/video-tools" className="hover:text-primary transition-colors">Video Editor</Link></li>
                        <li><Link to="/ai-tools" className="hover:text-primary transition-colors">AI Writer</Link></li>
                        <li><Link to="/bg-remover" className="hover:text-primary transition-colors">Background Remover</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-foreground mb-4">Company</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="#" className="hover:text-primary transition-colors">About Us</Link></li>
                        <li><Link to="#" className="hover:text-primary transition-colors">Contact</Link></li>
                        <li><Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                        <li><Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-foreground mb-4">Stay Updated</h4>
                    <div className="flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        />
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-md transition-colors text-sm font-medium">
                            Subscribe
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mt-6">
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Github size={20} /></a>
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter size={20} /></a>
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin size={20} /></a>
                    </div>
                </div>
            </div>
            <div className="border-t border-border/50">
                <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <p className="text-muted-foreground text-sm">
                        &copy; {new Date().getFullYear()} QuickTools. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link to="#" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link to="#" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link to="#" className="hover:text-foreground transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
