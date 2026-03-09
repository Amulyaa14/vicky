import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, SearchX } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const NotFound: React.FC = () => {
    return (
        <>
            <Helmet>
                <title>404 – Page Not Found | QuickTools</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4 overflow-hidden">
                {/* Animated glow backdrop */}
                <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse" />

                {/* Floating 404 */}
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative"
                >
                    <motion.h1
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                        className="text-[8rem] sm:text-[12rem] font-extrabold leading-none bg-gradient-to-br from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent select-none"
                    >
                        404
                    </motion.h1>
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="h-1 bg-gradient-to-r from-primary to-pink-400 rounded-full"
                    />
                </motion.div>

                {/* Icon + message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mt-6 flex flex-col items-center gap-3"
                >
                    <SearchX size={36} className="text-muted-foreground" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Page Not Found</h2>
                    <p className="text-muted-foreground max-w-md text-sm sm:text-base leading-relaxed">
                        The page you're looking for might have been removed, renamed, or is temporarily unavailable.
                    </p>
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, duration: 0.35 }}
                    className="mt-8"
                >
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95"
                    >
                        <Home size={18} /> Go Home
                    </Link>
                </motion.div>
            </div>
        </>
    );
};

export default NotFound;
