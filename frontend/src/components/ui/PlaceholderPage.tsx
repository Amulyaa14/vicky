import React from 'react';

interface PlaceholderPageProps {
    title: string;
    description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
    title,
    description = "This tool is coming soon."
}) => {
    return (
        <div className="container mx-auto py-20 text-center px-4">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {title}
            </h1>
            <p className="text-gray-400 text-lg">{description}</p>
        </div>
    );
};

export default PlaceholderPage;
