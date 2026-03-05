import React from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, useClerk } from '@clerk/clerk-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    // If Clerk is not configured (no key), just render children directly
    try {
        useClerk();
    } catch {
        return <>{children}</>;
    }

    return (
        <>
            <SignedIn>
                {children}
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
};
