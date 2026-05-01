/**
 * useShowTracking.js
 * Custom React hook that manages a user's watched shows, watchlist, and favorites.
 *
 * Exposes clean state + action methods so UI components stay free of
 * direct Supabase calls.
 *
 * Usage:
 *   const { watched, watchlist, favorites, loading, toggleWatched, ... } = useShowTracking();
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
    getUserShows,
    upsertShowStatus,
    removeTrackedShow,
    saveReview,
    getFavorites,
    setFavorites as setFavoritesService,
    updateShowProgress,
} from './profileService';

const useShowTracking = () => {
    const { user } = useAuth();

    const [watched,        setWatched]        = useState([]);
    const [watchlist,      setWatchlist]      = useState([]);
    const [watching,       setWatching]       = useState([]);
    const [favorites,      setFavoritesState] = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState(null);

    // ── Initial load ──────────────────────────────────────────────────────────

    const loadAllData = useCallback(async () => {
        if (!user) {
            setWatched([]);
            setWatchlist([]);
            setFavoritesState([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [showsRes, favsRes] = await Promise.all([
                getUserShows(user.id),
                getFavorites(user.id),
            ]);

            if (showsRes.error) throw showsRes.error;
            if (favsRes.error)  throw favsRes.error;

            setWatched(showsRes.data.filter((s) => s.status === 'watched'));
            setWatchlist(showsRes.data.filter((s) => s.status === 'watchlist'));
            setWatching(showsRes.data.filter((s) => s.status === 'watching'));
            setFavoritesState(favsRes.data);
        } catch (err) {
            console.error('useShowTracking load error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Build the minimal DB payload from a TMDB show object or a stored row.
     */
    const buildShowPayload = (show) => ({
        show_id:        show.id         ?? show.show_id,
        show_name:      show.name       ?? show.show_name,
        poster_path:    show.poster_path   ?? null,
        first_air_date: show.first_air_date ?? null,
        vote_average:   show.vote_average  ?? null,
    });

    /**
     * Update local state after a DB write without a full reload.
     */
    const syncLocalState = (updatedRow, removed = false) => {
        const updateList = (list) => {
            if (removed) return list.filter((s) => s.show_id !== updatedRow.show_id);
            const exists = list.find((s) => s.show_id === updatedRow.show_id);
            return exists
                ? list.map((s) => (s.show_id === updatedRow.show_id ? updatedRow : s))
                : [updatedRow, ...list];
        };

        const removeFromAll = (showId) => {
            setWatched((prev)   => prev.filter((s) => s.show_id !== showId));
            setWatchlist((prev) => prev.filter((s) => s.show_id !== showId));
            setWatching((prev)  => prev.filter((s) => s.show_id !== showId));
        };

        if (removed) {
            removeFromAll(updatedRow.show_id);
        } else if (updatedRow.status === 'watched') {
            removeFromAll(updatedRow.show_id);
            setWatched((prev) => updateList(prev));
        } else if (updatedRow.status === 'watching') {
            removeFromAll(updatedRow.show_id);
            setWatching((prev) => updateList(prev));
        } else {
            removeFromAll(updatedRow.show_id);
            setWatchlist((prev) => updateList(prev));
        }
    };

    // ── Public actions ────────────────────────────────────────────────────────

    /**
     * Toggle a show's watched status.
     * - Not tracked → marks as watched
     * - Already watched → removes it
     * - On watchlist → moves to watched
     */
    const toggleWatched = useCallback(async (show) => {
        if (!user) return { error: 'Not authenticated' };

        const payload      = buildShowPayload(show);
        const alreadyWatched = watched.some((s) => s.show_id === payload.show_id);

        if (alreadyWatched) {
            // If the entry has a rating or review, move to 'watching' to preserve it
            // rather than deleting the row entirely
            const watchedEntry = watched.find((s) => s.show_id === payload.show_id);
            const hasReviewData = watchedEntry?.rating != null || watchedEntry?.review;

            if (hasReviewData) {
                const merged = {
                    ...buildShowPayload(watchedEntry),
                    rating: watchedEntry.rating,
                    review: watchedEntry.review,
                };
                const { data, error } = await upsertShowStatus(user.id, merged, 'watching');
                if (!error && data) syncLocalState(data);
                return { error };
            }

            const { error } = await removeTrackedShow(user.id, payload.show_id);
            if (!error) syncLocalState(payload, true);
            return { error };
        }

        const { data, error } = await upsertShowStatus(user.id, payload, 'watched');
        if (!error && data) syncLocalState(data);
        return { error };
    }, [user, watched]);

    /**
     * Toggle a show's watchlist status.
     * - Not tracked → adds to watchlist
     * - On watchlist → removes it
     * - Already watched → no-op (use toggleWatched instead)
     */
    const toggleWatchlist = useCallback(async (show) => {
        if (!user) return { error: 'Not authenticated' };

        const payload     = buildShowPayload(show);
        const onWatchlist = watchlist.some((s) => s.show_id === payload.show_id);

        // If already watched or watching, don't change that status —
        // watchlist is only meaningful for untracked shows
        const isAlreadyTracked = watched.some((s)  => s.show_id === payload.show_id)
            || watching.some((s) => s.show_id === payload.show_id);

        if (isAlreadyTracked) return { error: null };

        if (onWatchlist) {
            // Remove from watchlist (toggle off)
            const { error } = await removeTrackedShow(user.id, payload.show_id);
            if (!error) syncLocalState(payload, true);
            return { error };
        }

        // Add to watchlist — only for untracked shows
        const { data, error } = await upsertShowStatus(user.id, payload, 'watchlist');
        if (!error && data) syncLocalState(data);
        return { error };
    }, [user, watchlist, watched, watching]);

    /**
     * Check a show's tracking status using local state (no DB call).
     * @returns {'watched' | 'watchlist' | null}
     */
    const getLocalStatus = useCallback((showId) => {
        if (watched.find((s)   => s.show_id === showId || s.id === showId)) return 'watched';
        if (watchlist.find((s) => s.show_id === showId || s.id === showId)) return 'watchlist';
        if (watching.find((s)  => s.show_id === showId || s.id === showId)) return 'watching';
        return null;
    }, [watched, watchlist, watching]);

    /**
     * Toggle a show's currently-watching status.
     * - Not tracked / on watchlist → marks as watching
     * - Already watching → removes it
     * - Watched → moves to watching, preserving any existing rating/review
     */
    const toggleWatching = useCallback(async (show) => {
        if (!user) return { error: 'Not authenticated' };

        const payload         = buildShowPayload(show);
        const alreadyWatching = watching.some((s) => s.show_id === payload.show_id);

        if (alreadyWatching) {
            const { error } = await removeTrackedShow(user.id, payload.show_id);
            if (!error) syncLocalState(payload, true);
            return { error };
        }

        // Preserve rating/review from the watched entry if it exists
        const watchedEntry = watched.find((s) => s.show_id === payload.show_id);
        const merged = watchedEntry
            ? { ...payload, rating: watchedEntry.rating, review: watchedEntry.review }
            : payload;

        const { data, error } = await upsertShowStatus(user.id, merged, 'watching');
        if (!error && data) syncLocalState(data);
        return { error };
    }, [user, watching, watched]);

    /**
     * Update the current season/episode progress for a watching show.
     * @param {number} showId
     * @param {{ current_season?: number, current_episode?: number }} progress
     */
    const updateProgress = useCallback(async (showId, progress) => {
        if (!user) return { error: 'Not authenticated' };

        const { data, error } = await updateShowProgress(user.id, showId, progress);

        if (!error && data) {
            setWatching((prev) =>
                prev.map((s) => (s.show_id === showId ? { ...s, ...progress } : s))
            );
        }
        return { error };
    }, [user]);

    /**
     * Save a rating and/or review for a show.    /**
     * Save a rating and/or review for a show.
     * If the show isn't tracked yet, automatically marks it as 'watching'
     * so the user can switch to 'watched' themselves when done.
     *
     * @param {number} showId
     * @param {{ rating?: number, review?: string }} reviewData
     * @param {object|null} showData - TMDB show object, required only when
     *   the show has no existing row (so we can create one as 'watching')
     */
    const submitReview = useCallback(async (showId, reviewData, showData = null) => {
        if (!user) return { error: 'Not authenticated' };

        const isTracked = watched.some((s)  => s.show_id === showId)
            || watching.some((s) => s.show_id === showId);

        // Auto-mark as watching if not tracked yet
        if (!isTracked) {
            if (!showData) {
                console.warn('submitReview: showData required to auto-mark as watching');
                return { error: 'Missing show data' };
            }
            const payload = buildShowPayload(showData);
            const { data, error } = await upsertShowStatus(user.id, payload, 'watching');
            if (error) return { error };
            if (data) syncLocalState(data);
        }

        const { data, error } = await saveReview(user.id, showId, reviewData);
        if (!error && data) {
            const update = (list) =>
                list.map((s) => (s.show_id === showId ? { ...s, ...reviewData } : s));
            setWatched((prev)  => update(prev));
            setWatching((prev) => update(prev));
        }
        return { error };
    }, [user, watched, watching]);

    /**
     * Replace the user's pinned favourite shows (max 4).
     */
    const updateFavorites = useCallback(async (newFavorites) => {
        if (!user) return { error: 'Not authenticated' };

        const { error } = await setFavoritesService(user.id, newFavorites);
        if (!error) {
            setFavoritesState(newFavorites.map((f, i) => ({ ...f, position: i + 1 })));
        }
        return { error };
    }, [user]);

    return {
        // State
        watched,
        watchlist,
        watching,
        favorites,
        loading,
        error,
        // Actions
        toggleWatched,
        toggleWatchlist,
        toggleWatching,
        updateProgress,
        getLocalStatus,
        submitReview,
        updateFavorites,
        reload: loadAllData,
    };
};

export default useShowTracking;
