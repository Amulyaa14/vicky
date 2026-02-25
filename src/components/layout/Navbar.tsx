import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Zap, Sun, Moon, ChevronRight, Home, FileText, Video, Cpu } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Button from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ExpandableTabs } from '@/components/ui/expandable-tabs';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = useMemo(() => [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Converter', path: '/converter', icon: FileText },
        { name: 'Video Studio', path: '/video-studio', icon: Video },
        { name: 'AI Tools', path: '/ai-tools', icon: Cpu },
    ], []);

    const tabs = useMemo(() => navLinks.map(link => ({
        title: link.name,
        icon: link.icon
    })), [navLinks]);

    const activeTabIndex = navLinks.findIndex(link =>
        link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path)
    );

    const handleTabChange = (index: number | null) => {
        if (index !== null) {
            navigate(navLinks[index].path);
        }
    };

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "glass h-[3.5rem]" : "h-[var(--header-height)] bg-transparent",
                isOpen && "glass"
            )}
        >
            <div className="container h-full flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
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

                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Toggle theme"
                    >
                        <Sun size={20} className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 absolute top-2 left-2" />
                        <Moon size={20} className="scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </button>

                    <Button variant="default" size="sm" className="hidden lg:flex" onClick={() => navigate('/converter')}>
                        Get Started
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isOpen && (
                <div className="md:hidden absolute top-[100%] left-0 right-0 bg-background/95 backdrop-blur-3xl border-b border-border p-4 flex flex-col gap-2 animate-accordion-down shadow-xl">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-md text-sm font-medium transition-colors",
                                location.pathname === link.path
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="flex items-center gap-3">
                                <link.icon size={18} />
                                {link.name}
                            </div>
                            <ChevronRight size={16} className="opacity-50" />
                        </Link>
                    ))}
                    <div className="h-px bg-border my-2" />
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm font-medium text-muted-foreground">Dark Mode</span>
                        <button
                            onClick={() => {
                                setTheme(theme === 'dark' ? 'light' : 'dark');
                            }}
                            className={cn(
                                "w-12 h-6 rounded-full p-1 transition-colors flex items-center",
                                theme === 'dark' ? "bg-primary justify-end" : "bg-muted justify-start"
                            )}
                        >
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
