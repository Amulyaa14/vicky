import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

const NotFound: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h1 className="text-6xl font-bold mb-4 text-indigo-500">404</h1>
            <h2 className="text-2xl font-bold mb-6">Page Not Found</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link to="/">
                <Button variant="default">
                    Go Home
                </Button>
            </Link>
        </div>
    );
};

export default NotFound;
