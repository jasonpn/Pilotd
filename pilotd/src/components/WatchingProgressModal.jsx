/**
 * WatchingProgressModal.jsx
 *
 * Lets a member set their current season and episode when they mark a show
 * as "Watching". Rendered via React Portal directly onto document.body so it
 * is never clipped by a CSS transform or limited stacking context on a parent
 * (e.g. the hover translateY applied to ShowCard).
 *
 * Layout:
 *   Mobile  — bottom sheet (slides up, rounded top corners, drag-handle pill)
 *   Desktop — centred dialog (max-w-sm, fully rounded)
 *
 * Props:
 *   show      {object}   TMDB or stored show (.name / .show_name, .poster_path)
 *   onConfirm {function} ({ current_season, current_episode }) => void
 *   onClose   {function} () => void
 *   saving    {boolean}  true while the DB write is in flight
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal }      from 'react-dom';
import CloseIcon             from '@mui/icons-material/Close';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { CircularProgress }  from '@mui/material';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

/** Clamp a raw string/number input to a safe integer >= 1. */
const toSafe = (raw) => Math.max(1, parseInt(raw, 10) || 1);

// ── component ──────────────────────────────────────────────────────────────────

const WatchingProgressModal = ({ show, onConfirm, onClose, saving }) => {
    const [season,  setSeason]  = useState(1);
    const [episode, setEpisode] = useState(1);

    const showName    = show?.name ?? show?.show_name ?? 'this show';
    const posterPath  = show?.poster_path ?? null;
    const safeSeason  = toSafe(season);
    const safeEpisode = toSafe(episode);

    // ── side effects ──────────────────────────────────────────────────────────

    /**
     * Body-scroll lock with iOS Safari fix.
     * overflow:hidden alone does not stop scroll on iOS. The position:fixed +
     * top offset trick is the only reliable cross-browser solution. We restore
     * everything — including the scroll position — on unmount.
     */
    useEffect(() => {
        const scrollY = window.scrollY;
        const prev = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            top:      document.body.style.top,
            width:    document.body.style.width,
        };
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top      = `-${scrollY}px`;
        document.body.style.width    = '100%';
        return () => {
            document.body.style.overflow = prev.overflow;
            document.body.style.position = prev.position;
            document.body.style.top      = prev.top;
            document.body.style.width    = prev.width;
            window.scrollTo(0, scrollY);
        };
    }, []);

    /**
     * Global Escape key listener.
     * Attached to window (not just the focused element) so it fires regardless
     * of which child has focus. Cleaned up on unmount via useEffect return.
     */
    const stableClose = useCallback(onClose, [onClose]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') stableClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [stableClose]);

    // ── handlers ──────────────────────────────────────────────────────────────

    const handleConfirm = () => {
        onConfirm({ current_season: safeSeason, current_episode: safeEpisode });
    };

    /** Enter inside either input submits the form. */
    const handleInputKey = (e) => {
        if (e.key === 'Enter') handleConfirm();
    };

    /**
     * React portals still bubble synthetic events through the React component
     * tree even though the DOM node lives on document.body. Stopping propagation
     * on inner panel clicks prevents them from bubbling to the <Link> ancestor
     * in ShowCard and triggering an unwanted navigation.
     */
    const stopProp = (e) => e.stopPropagation();

    // ── render ────────────────────────────────────────────────────────────────

    const modal = (
        /*
         * Backdrop — full-viewport overlay.
         *   items-end        → sheet anchors to the bottom on mobile
         *   sm:items-center  → centres vertically on desktop
         */
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Set watching progress for ${showName}`}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center
                       bg-black/75 backdrop-blur-sm"
            onClick={onClose}
        >
            {/*
              * Panel.
              * Mobile  → full width, rounded top corners only, sits at screen bottom.
              * Desktop → constrained width, fully rounded, centred.
              */}
            <div
                className="relative w-full sm:max-w-sm
                           bg-[#1a1f28] border border-[#2c3440]/80
                           rounded-t-2xl sm:rounded-2xl
                           shadow-2xl"
                onClick={stopProp}
            >
                {/* ── Drag handle (mobile only) ──────────────────────────── */}
                <div className="sm:hidden flex justify-center pt-3 pb-0" aria-hidden="true">
                    <div className="w-9 h-[3px] rounded-full bg-[#2c3440]" />
                </div>

                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 pt-4 pb-4
                                border-b border-[#2c3440]/60">
                    <div className="flex items-center gap-3 min-w-0">

                        {/* Poster thumbnail gives the user visual confirmation of
                            which show they are acting on — reduces cognitive load. */}
                        {posterPath ? (
                            <div className="w-8 h-12 rounded-md overflow-hidden flex-shrink-0
                                            border border-[#DCB35A]/10 shadow-md">
                                <img
                                    src={`${TMDB_IMAGE_BASE}${posterPath}`}
                                    alt=""
                                    aria-hidden="true"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-8 h-12 rounded-md flex-shrink-0
                                            bg-[#2c3440] border border-[#DCB35A]/10
                                            flex items-center justify-center">
                                <PlayCircleOutlineIcon sx={{ fontSize: 16, color: '#DCB35A' }} />
                            </div>
                        )}

                        <div className="min-w-0">
                            <p className="text-[10px] text-[#89BAA2]/60 uppercase
                                          tracking-widest font-semibold mb-0.5">
                                Now Watching
                            </p>
                            <p className="text-[#EBDFD9] font-semibold text-sm
                                          leading-tight truncate">
                                {showName}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex-shrink-0 ml-3 w-8 h-8 flex items-center justify-center
                                   rounded-full text-[#89BAA2] hover:text-[#EBDFD9]
                                   hover:bg-[#2c3440] transition-colors"
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </button>
                </div>

                {/* ── Inputs ────────────────────────────────────────────── */}
                <div className="px-6 pt-5 pb-2">
                    <p className="text-xs text-[#89BAA2]/60 text-center mb-5">
                        Where are you up to?
                    </p>

                    <div className="flex items-end gap-3">

                        {/* Season */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <label
                                htmlFor="wpm-season"
                                className="text-[10px] text-[#89BAA2] uppercase
                                           tracking-widest font-semibold"
                            >
                                Season
                            </label>
                            <input
                                id="wpm-season"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                onKeyDown={handleInputKey}
                                autoFocus
                                className="w-full text-center bg-[#14181c] text-[#EBDFD9]
                                           text-3xl font-bold rounded-xl py-3
                                           border-2 border-[#2c3440]
                                           focus:outline-none focus:border-[#DCB35A]/60
                                           transition-colors
                                           [appearance:textfield]
                                           [&::-webkit-inner-spin-button]:appearance-none
                                           [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>

                        <span className="text-[#2c3440] text-2xl pb-3.5 flex-shrink-0
                                         select-none font-light" aria-hidden="true">
                            ·
                        </span>

                        {/* Episode */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <label
                                htmlFor="wpm-episode"
                                className="text-[10px] text-[#89BAA2] uppercase
                                           tracking-widest font-semibold"
                            >
                                Episode
                            </label>
                            <input
                                id="wpm-episode"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={episode}
                                onChange={(e) => setEpisode(e.target.value)}
                                onKeyDown={handleInputKey}
                                className="w-full text-center bg-[#14181c] text-[#EBDFD9]
                                           text-3xl font-bold rounded-xl py-3
                                           border-2 border-[#2c3440]
                                           focus:outline-none focus:border-[#DCB35A]/60
                                           transition-colors
                                           [appearance:textfield]
                                           [&::-webkit-inner-spin-button]:appearance-none
                                           [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>
                    </div>

                    {/* Live preview — updates as the user types */}
                    <div className="mt-4 py-2.5 px-4 rounded-xl
                                    bg-[#DCB35A]/10 border border-[#DCB35A]/20
                                    text-center" aria-live="polite">
                        <span className="text-xs text-[#89BAA2]/60">Currently at </span>
                        <span className="text-sm font-bold text-[#DCB35A] tracking-wide">
                            S{safeSeason}&thinsp;E{safeEpisode}
                        </span>
                    </div>
                </div>

                {/* ── Actions ───────────────────────────────────────────── */}
                {/*
                  * pb-6 on mobile pads above the home-indicator / safe area.
                  * sm:pb-5 tightens it back up on desktop where that doesn't apply.
                  */}
                <div className="flex gap-3 px-6 pt-4 pb-6 sm:pb-5">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold
                                   text-[#EBDFD9] bg-[#2c3440] hover:bg-[#3a4452]
                                   transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2
                                   py-3 rounded-xl text-sm font-semibold
                                   text-[#14181c] bg-[#DCB35A] hover:bg-[#c9a24f]
                                   active:scale-95 transition-all
                                   disabled:opacity-60 disabled:pointer-events-none"
                    >
                        {saving && (
                            <CircularProgress size={14} sx={{ color: '#14181c' }} />
                        )}
                        Save
                    </button>
                </div>

            </div>
        </div>
    );

    /* Mount directly on document.body — completely escapes any CSS transform,
       overflow:hidden, or stacking-context limitations of ancestor elements. */
    return createPortal(modal, document.body);
};

export default WatchingProgressModal;
