import { useState, useEffect } from 'react';

export const useInit = (callback, ...args) => {
    const [mounted, setMounted] = useState(false);

    const resetInit = () => setMounted(false);

    useEffect(() => {
        if (!mounted) {
            setMounted(true);
            callback(...args);
        }
    }, [mounted, callback, args]);

    return [resetInit];
};