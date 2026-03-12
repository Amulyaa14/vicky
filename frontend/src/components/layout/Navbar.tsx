import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Zap, Sun, Moon, ChevronRight, Home, FileText, Video, Cpu, Image as ImageIcon, Layers, Target } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ExpandableTabs } from '@/components/ui/expandable-tabs';
import { useAuth } from '@/contexts/AuthContext';

const NAV_HEIGHT = 64; // px — matches --header-height (4rem)

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    // Close menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Close menu on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll when menu is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const navLinks = useMemo(() => [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Converter', path: '/converter', icon: FileText },
        { name: 'Video Studio', path: '/video-studio', icon: Video },
        { name: 'Image Editor', path: '/image-editor', icon: ImageIcon },
        { name: 'ATS Checker', path: '/ats-checker', icon: Target },
        { name: 'AI Tools', path: '/ai-tools', icon: Cpu },
        { name: 'BG Remover', path: '/bg-remover', icon: Layers },
    ], []);

    const tabs = useMemo(() => navLinks.map(link => ({
        title: link.name,
        icon: link.icon
    })), [navLinks]);

    const activeTabIndex = navLinks.findIndex(link =>
        link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path)
    );

    const handleTabChange = (index: number | null) => {
        if (index !== null) navigate(navLinks[index].path);
    };

    return (
        <>
            {/* ─── Fixed Navbar Shell ─── */}
            <div
                ref={navRef}
                className={cn(
                    'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent',
                    (scrolled || isOpen) ? 'bg-background/95 backdrop-blur-xl border-border/60 shadow-sm' : 'bg-transparent'
                )}
                style={{ height: NAV_HEIGHT }}
            >
                <div className="container h-full flex items-center justify-between px-4">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:rotate-3">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Quick<span className="text-primary">Tools</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        <ExpandableTabs
                            tabs={tabs}
                            onChange={handleTabChange}
                            activeTab={activeTabIndex !== -1 ? activeTabIndex : null}
                            className="border-none bg-transparent shadow-none"
                        />
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Toggle theme"
                        >
                            <Sun size={18} className="absolute transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
                            <Moon size={18} className="absolute transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
                        </button>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-muted-foreground hidden lg:block">
                                    {user.email}
                                </span>
                                <Button variant="outline" size="sm" onClick={logout}>
                                    Log Out
                                </Button>
                            </div>
                        ) : (
                            <Link to="/login">
                                <Button variant="default" size="sm" className="hidden lg:flex">
                                    Sign In
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    <div className="md:hidden flex items-center gap-1">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                            aria-label="Toggle theme"
                        >
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Sun size={19} className="absolute transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
                                <Moon size={19} className="absolute transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
                            </div>
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
                            aria-label={isOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isOpen}
                            aria-controls="mobile-menu"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={isOpen ? 'close' : 'open'}
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {isOpen ? <X size={22} /> : <Menu size={22} />}
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Mobile Dropdown — rendered OUTSIDE nav, below it in the fixed stack ─── */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop — dims the page, clicking it closes the menu */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/30 md:hidden"
                            style={{ top: NAV_HEIGHT }}
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />

                        {/* Menu Panel — slides down from the bottom of the navbar */}
                        <motion.div
                            key="menu"
                            id="mobile-menu"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="fixed left-0 right-0 z-40 md:hidden bg-background border-b border-border shadow-2xl"
                            style={{ top: NAV_HEIGHT }}
                        >
                            <nav className="px-4 pt-3 pb-4 flex flex-col gap-1" aria-label="Mobile navigation">
                                {navLinks.map((link) => {
                                    const isActive = link.path === '/'
                                        ? location.pathname === '/'
                                        : location.pathname.startsWith(link.path);
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className={cn(
                                                'flex items-center justify-between px-3 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
                                                isActive
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'
                                            )}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <link.icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                                                {link.name}
                                            </div>
                                            <ChevronRight size={15} className="opacity-40" />
                                        </Link>
                                    );
                                })}

                                <div className="h-px bg-border/60 my-1.5" />

                                {/* Dark mode row */}
                                <div className="flex items-center justify-between px-3 py-2.5">
                                    <span className="text-sm font-medium text-muted-foreground">Dark Mode</span>
                                    <button
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                        className={cn(
                                            'w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center',
                                            theme === 'dark' ? 'bg-primary justify-end' : 'bg-muted justify-start'
                                        )}
                                        aria-label="Toggle dark mode"
                                    >
                                        <motion.div
                                            layout
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                                        />
                                    </button>
                                </div>

                                {/* CTA */}
                                {user ? (
                                    <div className="flex flex-col gap-2 mt-3">
                                        <div className="text-sm font-medium text-center text-muted-foreground py-2 bg-muted/30 rounded-lg">
                                            {user.email}
                                        </div>
                                        <button onClick={() => { logout(); setIsOpen(false); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-semibold transition-colors">
                                            Log Out
                                        </button>
                                    </div>
                                ) : (
                                    <Link to="/login" onClick={() => setIsOpen(false)}>
                                        <button className="w-full mt-1 py-3 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground rounded-xl text-sm font-semibold transition-colors">
                                            Sign In →
                                        </button>
                                    </Link>
                                )}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
