/**
 * EditFavoritesModal.jsx
 * Modal that lets a user pick up to 4 favourite shows.
 *
 * Sources candidates from:
 *   1. Their already-watched shows (local state, no extra DB call).
 *   2. A live TMDB search for shows they haven't tracked yet.
 *
 * Selected shows can be reordered by drag-and-drop (or simply removed and re-added).
 */

import React, { useState, useEffect, useCallback } from 'react';
import CloseIcon  from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckIcon  from '@mui/icons-material/Check';
import { CircularProgress } from '@mui/material';
import { useDebounce } from 'react-use';

const TMDB_IMAGE_BASE  = 'https://image.tmdb.org/t/p/w185';
const MAX_FAVORITES    = 4;

const API_OPTIONS = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}`,
    },
};

// ── Small poster thumbnail used in both lists ────────────────────────────────

const ShowThumb = ({ show, selected, onToggle }) => {
    const name   = show.name ?? show.show_name;
    const poster = show.poster_path
        ? `${TMDB_IMAGE_BASE}${show.poster_path}`
        : null;
    const showId = show.id ?? show.show_id;

    return (
        <button
            onClick={() => onToggle(show)}
            className={`
                flex items-center gap-3 w-full px-3 py-2 rounded-md text-left
                transition-colors duration-150
                ${selected
                ? 'bg-[#378370]/20 border border-[#378370]/50'
                : 'hover:bg-[#2c3440] border border-transparent'}
            `}
        >
            {/* Poster */}
            <div className="w-9 h-14 rounded overflow-hidden flex-shrink-0 bg-[#2c3440]">
                {poster
                    ? <img src={poster} alt={name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full" />
                }
            </div>

            {/* Name */}
            <span className="flex-1 text-sm text-[#EBDFD9] line-clamp-2 leading-tight">
                {name}
            </span>

            {/* Checkmark */}
            {selected && (
                <CheckIcon sx={{ fontSize: 16, color: '#89BAA2', flexShrink: 0 }} />
            )}
        </button>
    );
};

// ── Selected slot (ordered list on the right panel) ──────────────────────────

const SelectedSlot = ({ favorite, position, onRemove }) => (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#2c3440] rounded-md">
        <DragIndicatorIcon sx={{ fontSize: 18, color: '#89BAA2', flexShrink: 0 }} />
        <span className="text-xs text-[#89BAA2] w-4 flex-shrink-0">{position}</span>
        <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0 bg-[#1f2429]">
            {favorite.poster_path && (
                <img
                    src={`${TMDB_IMAGE_BASE}${favorite.poster_path}`}
                    alt={favorite.show_name ?? favorite.name}
                    className="w-full h-full object-cover"
                />
            )}
        </div>
        <span className="flex-1 text-sm text-[#EBDFD9] line-clamp-1">
            {favorite.show_name ?? favorite.name}
        </span>
        <button
            onClick={() => onRemove(favorite)}
            className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
        >
            <CloseIcon sx={{ fontSize: 16 }} />
        </button>
    </div>
);

// ── Main modal ────────────────────────────────────────────────────────────────

const EditFavoritesModal = ({ currentFavorites, watchedShows, onSave, onClose, saving }) => {
    // Mirror current favorites into local editing state
    const [selected, setSelected] = useState(
        currentFavorites.map((f) => ({
            show_id:    f.show_id,
            show_name:  f.show_name ?? f.name,
            poster_path: f.poster_path,
        }))
    );

    const [query,       setQuery]       = useState('');
    const [debouncedQ,  setDebouncedQ]  = useState('');
    const [results,     setResults]     = useState([]);
    const [searching,   setSearching]   = useState(false);

    useDebounce(() => setDebouncedQ(query), 400, [query]);

    // Search TMDB when query changes
    useEffect(() => {
        if (!debouncedQ.trim()) {
            setResults([]);
            return;
        }
        let cancelled = false;

        (async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(debouncedQ)}&include_adult=false`,
                    API_OPTIONS
                );
                const json = await res.json();
                if (!cancelled) setResults(json.results?.slice(0, 8) ?? []);
            } catch { /* silent */ }
            finally  { if (!cancelled) setSearching(false); }
        })();

        return () => { cancelled = true; };
    }, [debouncedQ]);

    // ── Selection logic ────────────────────────────────────────────────────

    const isSelected = (show) => {
        const id = show.id ?? show.show_id;
        return selected.some((s) => s.show_id === id);
    };

    const toggle = useCallback((show) => {
        const id   = show.id ?? show.show_id;
        const name = show.name ?? show.show_name;

        if (isSelected(show)) {
            setSelected((prev) => prev.filter((s) => s.show_id !== id));
        } else if (selected.length < MAX_FAVORITES) {
            setSelected((prev) => [
                ...prev,
                { show_id: id, show_name: name, poster_path: show.poster_path ?? null },
            ]);
        }
    }, [selected]);

    const remove = (show) => {
        const id = show.show_id ?? show.id;
        setSelected((prev) => prev.filter((s) => s.show_id !== id));
    };

    const handleSave = () => onSave(selected);

    // Candidate list: watched shows first (exclude already selected)
    const candidatesFromWatched = watchedShows
        .filter((s) => !isSelected(s))
        .slice(0, 20);

    const searchCandidates = results.filter((r) => !isSelected(r));

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Modal panel */}
            <div
                className="bg-[#1a1f28] border border-[#2c3440] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#2c3440]">
                    <div>
                        <h2 className="text-[#EBDFD9] font-bold">Edit Favourite Shows</h2>
                        <p className="text-xs text-[#89BAA2] mt-0.5">Pick up to {MAX_FAVORITES} shows</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                {/* Body — two-column layout */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* ── Left: candidate picker ──────────────────────────── */}
                    <div className="flex-1 flex flex-col border-r border-[#2c3440] min-w-0">
                        {/* Search */}
                        <div className="px-4 py-3 border-b border-[#2c3440]">
                            <div className="flex items-center gap-2 bg-[#2c3440] rounded-md px-3 py-1.5">
                                <SearchIcon sx={{ fontSize: 16, color: '#89BAA2' }} />
                                <input
                                    type="text"
                                    placeholder="Search any show…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-[#EBDFD9] outline-none placeholder-[#89BAA2]/50"
                                />
                                {searching && <CircularProgress size={12} sx={{ color: '#89BAA2' }} />}
                            </div>
                        </div>

                        {/* Show list */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                            {query ? (
                                searchCandidates.length > 0
                                    ? searchCandidates.map((s) => (
                                        <ShowThumb
                                            key={s.id}
                                            show={s}
                                            selected={isSelected(s)}
                                            onToggle={toggle}
                                        />
                                    ))
                                    : !searching && (
                                    <p className="text-[#89BAA2] text-sm text-center py-4">No results</p>
                                )
                            ) : (
                                <>
                                    {candidatesFromWatched.length > 0 && (
                                        <>
                                            <p className="text-xs text-[#89BAA2] uppercase tracking-wider mb-2">
                                                From your watched list
                                            </p>
                                            {candidatesFromWatched.map((s) => (
                                                <ShowThumb
                                                    key={s.show_id}
                                                    show={s}
                                                    selected={isSelected(s)}
                                                    onToggle={toggle}
                                                />
                                            ))}
                                        </>
                                    )}
                                    {candidatesFromWatched.length === 0 && (
                                        <p className="text-[#89BAA2] text-sm text-center py-4">
                                            Search for shows above
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Right: selected slots ───────────────────────────── */}
                    <div className="w-56 sm:w-64 flex flex-col">
                        <div className="px-4 py-3 border-b border-[#2c3440]">
                            <span className="text-xs text-[#89BAA2] uppercase tracking-wider">
                                Selected ({selected.length}/{MAX_FAVORITES})
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {selected.map((fav, i) => (
                                <SelectedSlot
                                    key={fav.show_id}
                                    favorite={fav}
                                    position={i + 1}
                                    onRemove={remove}
                                />
                            ))}
                            {/* Empty slot hints */}
                            {Array.from({ length: MAX_FAVORITES - selected.length }, (_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="h-16 rounded-md border-2 border-dashed border-[#2c3440] flex items-center justify-center"
                                >
                                    <span className="text-xs text-[#89BAA2]/40">
                                        #{selected.length + i + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#2c3440]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-sm text-[#EBDFD9] bg-[#2c3440] hover:bg-[#3a4452] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-[#14181c] bg-[#D87B53] hover:bg-[#EF8D72] transition-colors disabled:opacity-60"
                    >
                        {saving && <CircularProgress size={14} sx={{ color: '#14181c' }} />}
                        Save Favourites
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditFavoritesModal;
