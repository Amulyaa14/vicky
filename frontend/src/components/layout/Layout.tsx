import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
            <Navbar />
            {/*
              Spacer that always matches the fixed navbar height (4rem / 64px).
              This is separate from any extra padding individual pages add.
              The mobile dropdown menu is rendered via a fixed overlay and
              does NOT push this spacer — it slides over a semi-transparent
              backdrop instead, so content is never shifted or hidden.
            */}
            <div className="h-16 shrink-0" aria-hidden="true" />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
