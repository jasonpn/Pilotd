/**
 * WatchActions.jsx
 * Reusable Watched / Watchlist button pair.
 *
 * Props:
 *   show      - TMDB show object (needs .id or .show_id, .name or .show_name)
 *   compact   - bool icon-only buttons for grid cards
 *   className - string extra wrapper classes
 */

import React, { useState } from 'react';
import CheckIcon          from '@mui/icons-material/Check';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import BookmarkIcon    from '@mui/icons-material/Bookmark';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import VisibilityIcon  from '@mui/icons-material/Visibility';
import { Tooltip, CircularProgress } from '@mui/material';
import { useAuth }     from '../AuthContext';
import { useTracking } from '../ShowTrackingContext';

const WatchActions = ({ show, compact = false, className = '' }) => {
    const { user }   = useAuth();
    const { getLocalStatus, toggleWatched, toggleWatchlist, toggleWatching } = useTracking();

    const [pendingWatched,   setPendingWatched]   = useState(false);
    const [pendingWatchlist, setPendingWatchlist] = useState(false);
    const [pendingWatching,  setPendingWatching]  = useState(false);

    const showId      = show?.id ?? show?.show_id;
    const status      = showId ? getLocalStatus(showId) : null;
    const isWatched   = status === 'watched';
    const isWatchlist = status === 'watchlist';
    const isWatching  = status === 'watching';

    if (!user) return null;

    const handleWatched = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPendingWatched(true);
        await toggleWatched(show);
        setPendingWatched(false);
    };

    const handleWatching = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPendingWatching(true);
        await toggleWatching(show);
        setPendingWatching(false);
    };

    const handleWatchlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPendingWatchlist(true);
        await toggleWatchlist(show);
        setPendingWatchlist(false);
    };

    // ── Compact mode — icon-only buttons for grid/row cards ─────────────────
    if (compact) {
        return (
            <div
                className={`flex gap-1 ${className}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                <Tooltip title={isWatched ? 'Remove from watched' : 'Mark as watched'} placement="top">
                    <button
                        onClick={handleWatched}
                        disabled={pendingWatched}
                        className={`
                            w-7 h-7 rounded flex items-center justify-center transition-all duration-150
                            ${isWatched
                            ? 'bg-[#378370] text-white'
                            : 'bg-[#2c3440]/80 text-gray-400 hover:bg-[#378370]/40 hover:text-[#89BAA2]'}
                        `}
                    >
                        {pendingWatched
                            ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                            : isWatched
                                ? <CheckIcon sx={{ fontSize: 14 }} />
                                : <VisibilityIcon sx={{ fontSize: 14 }} />}
                    </button>
                </Tooltip>

                <Tooltip title={isWatchlist ? 'Remove from watchlist' : 'Add to watchlist'} placement="top">
                    <button
                        onClick={handleWatchlist}
                        disabled={pendingWatchlist}
                        className={`
                            w-7 h-7 rounded flex items-center justify-center transition-all duration-150
                            ${isWatchlist
                            ? 'bg-[#D87B53] text-white'
                            : 'bg-[#2c3440]/80 text-gray-400 hover:bg-[#D87B53]/40 hover:text-[#D87B53]'}
                        `}
                    >
                        {pendingWatchlist
                            ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                            : isWatchlist
                                ? <BookmarkIcon sx={{ fontSize: 14 }} />
                                : <BookmarkAddIcon sx={{ fontSize: 14 }} />}
                    </button>
                </Tooltip>

                <Tooltip title={isWatching ? 'Remove from watching' : 'Mark as watching'} placement="top">
                    <button
                        onClick={handleWatching}
                        disabled={pendingWatching}
                        className={`
                            w-7 h-7 rounded flex items-center justify-center transition-all duration-150
                            ${isWatching
                            ? 'bg-[#DCB35A] text-white'
                            : 'bg-[#2c3440]/80 text-gray-400 hover:bg-[#DCB35A]/40 hover:text-[#DCB35A]'}
                        `}
                    >
                        {pendingWatching
                            ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                            : <PlayCircleOutlineIcon sx={{ fontSize: 14 }} />}
                    </button>
                </Tooltip>
            </div>
        );
    }

    // ── Full mode — labelled buttons for detail page ─────────────────────────
    return (
        <div className={`flex gap-2 ${className}`}>
            <button
                onClick={handleWatched}
                disabled={pendingWatched}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold
                    transition-all duration-200
                    ${isWatched
                    ? 'bg-[#378370] text-white shadow-md shadow-[#378370]/30'
                    : 'bg-[#2c3440] text-[#EBDFD9] border border-[#378370]/30 hover:border-[#378370] hover:bg-[#378370]/15'}
                `}
            >
                {pendingWatched
                    ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    : isWatched
                        ? <CheckIcon sx={{ fontSize: 16 }} />
                        : <VisibilityIcon sx={{ fontSize: 16 }} />}
                {isWatched ? 'Watched' : 'Mark Watched'}
            </button>

            <button
                onClick={handleWatchlist}
                disabled={pendingWatchlist}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold
                    transition-all duration-200
                    ${isWatchlist
                    ? 'bg-[#D87B53] text-white shadow-md shadow-[#D87B53]/30'
                    : 'bg-[#2c3440] text-[#EBDFD9] border border-[#D87B53]/30 hover:border-[#D87B53] hover:bg-[#D87B53]/15'}
                `}
            >
                {pendingWatchlist
                    ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    : isWatchlist
                        ? <BookmarkIcon sx={{ fontSize: 16 }} />
                        : <BookmarkAddIcon sx={{ fontSize: 16 }} />}
                {isWatchlist ? 'On Watchlist' : 'Watchlist'}
            </button>

            <button
                onClick={handleWatching}
                disabled={pendingWatching}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold
                    transition-all duration-200
                    ${isWatching
                    ? 'bg-[#DCB35A] text-[#14181c] shadow-md shadow-[#DCB35A]/30'
                    : 'bg-[#2c3440] text-[#EBDFD9] border border-[#DCB35A]/30 hover:border-[#DCB35A] hover:bg-[#DCB35A]/15'}
                `}
            >
                {pendingWatching
                    ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    : <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />}
                {isWatching ? 'Watching' : 'Watching'}
            </button>
        </div>
    );
};

export default WatchActions;
