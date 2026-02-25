/**
 * Environment configuration for Video Studio.
 * 
 * To use the Pixabay Content Library:
 * 1. Get a free API key from https://pixabay.com/api/docs/
 * 2. Create a .env file in the project root with:
 *    VITE_PIXABAY_API_KEY=your_key_here
 * 
 * Without an API key, the Content Library will show 
 * hardcoded royalty-free sample assets as a fallback.
 */

export const PIXABAY_API_KEY: string =
    (import.meta as any).env?.VITE_PIXABAY_API_KEY ?? '';
