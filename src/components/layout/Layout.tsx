import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
            <Navbar />
            <main className="flex-grow pt-[var(--header-height)]">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
