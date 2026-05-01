/**
 * ShowTrackingContext.jsx
 * Provides a single instance of useShowTracking to the entire app via context.
 *
 * WHY THIS EXISTS:
 * WatchActions is rendered inside every ShowCard. Without context, each ShowCard
 * creates its own useShowTracking instance, meaning 30+ separate Supabase
 * connections and independent state trees on the homepage alone. This caused
 * competing state updates that broke layout after interactions.
 *
 * With this context, the hook runs once at the app root. Every component that
 * needs tracking state (WatchActions, Profile, Detail) reads from the same
 * instance via useTracking().
 *
 * USAGE:
 *   // Anywhere in the tree
 *   import { useTracking } from '../ShowTrackingContext';
 *   const { watched, toggleWatched } = useTracking();
 */

import React, { createContext, useContext } from 'react';
import useShowTracking from './useShowTracking.jsx';

const ShowTrackingContext = createContext(null);


export const ShowTrackingProvider = ({ children }) => {
    const tracking = useShowTracking();
    return (
        <ShowTrackingContext.Provider value={tracking}>
            {children}
        </ShowTrackingContext.Provider>
    );
};

/**
 * Hook to consume tracking state anywhere in the tree.
 * Returns the same object as useShowTracking().
 */
export const useTracking = () => {
    const context = useContext(ShowTrackingContext);
    if (!context) {
        throw new Error('useTracking must be used within a ShowTrackingProvider');
    }
    return context;
};
