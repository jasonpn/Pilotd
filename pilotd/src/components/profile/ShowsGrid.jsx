/**
 * ShowsGrid.jsx
 * Responsive grid of tracked show poster cards.
 *
 * Changes from original:
 * - Rating badge on watched cards uses StarRating for consistent half-star display
 */

import React, { useState } from 'react';
import { Link }          from 'react-router';
import CloseIcon              from '@mui/icons-material/Close';
import CheckIcon              from '@mui/icons-material/Check';
import PlayCircleOutlineIcon  from '@mui/icons-material/PlayCircleOutline';
import EditIcon    from '@mui/icons-material/Edit';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import BookmarkIcon      from '@mui/icons-material/Bookmark';
import { Tooltip, CircularProgress } from '@mui/material';
import StarRating        from './StarRating';
import ReviewEditPanel   from './ReviewEditPanel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

// ── Individual card ───────────────────────────────────────────────────────────

const TrackedShowCard = ({ show, isOwnProfile, onRemove, onMarkWatched, mode }) => {
    const [removing, setRemoving] = useState(false);
    const [moving,   setMoving]   = useState(false);

    const handleRemove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setRemoving(true);
        await onRemove(show.show_id);
        setRemoving(false);
    };

    const handleMarkWatched = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMoving(true);
        await onMarkWatched(show);
        setMoving(false);
    };

    return (
        <li className="relative group">
            <Link to={`/show/${show.show_id}`} className="block">
                {/* Poster */}
                <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[#2c3440] shadow-md group-hover:-translate-y-1 transition-transform duration-200">
                    {show.poster_path ? (
                        <img
                            src={`${TMDB_IMAGE_BASE}${show.poster_path}`}
                            alt={show.show_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {mode === 'watched'
                                ? <VisibilityIcon sx={{ fontSize: 32, color: '#89BAA2' }} />
                                : <BookmarkIcon   sx={{ fontSize: 32, color: '#D87B53' }} />}
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />

                    {/* Owner action buttons */}
                    {isOwnProfile && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            {mode === 'watchlist' && (
                                <Tooltip title="Mark as watched" placement="top">
                                    <button
                                        onClick={handleMarkWatched}
                                        disabled={moving}
                                        className="w-6 h-6 rounded bg-[#378370] flex items-center justify-center shadow-lg hover:bg-[#89BAA2] transition-colors"
                                    >
                                        {moving
                                            ? <CircularProgress size={10} sx={{ color: 'white' }} />
                                            : <VisibilityIcon sx={{ fontSize: 12, color: 'white' }} />}
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip title="Remove" placement="top">
                                <button
                                    onClick={handleRemove}
                                    disabled={removing}
                                    className="w-6 h-6 rounded bg-[#1a1f28]/80 flex items-center justify-center shadow-lg hover:bg-red-500/70 transition-colors"
                                >
                                    {removing
                                        ? <CircularProgress size={10} sx={{ color: 'white' }} />
                                        : <CloseIcon sx={{ fontSize: 12, color: 'white' }} />}
                                </button>
                            </Tooltip>
                        </div>
                    )}

                    {/* Rating badge — half-star aware, shown on watched cards */}
                    {mode === 'watched' && show.rating && (
                        <div className="absolute bottom-1.5 left-1.5 bg-[#14181c]/80 px-1.5 py-0.5 rounded">
                            <StarRating value={show.rating} size="sm" />
                        </div>
                    )}
                </div>

                {/* Title + year */}
                <div className="mt-1.5 px-0.5">
                    <p className="text-xs font-semibold text-[#EBDFD9] line-clamp-2 leading-tight">
                        {show.show_name}
                    </p>
                </div>
            </Link>
        </li>
    );
};

// ── Filter/sort helpers ───────────────────────────────────────────────────────

const SORT_OPTIONS = [
    { value: 'rating_desc',   label: 'My Rating (High → Low)' },
    { value: 'rating_asc',    label: 'My Rating (Low → High)' },
    { value: 'watched_desc',  label: 'Recently Watched'        },
    { value: 'watched_asc',   label: 'Oldest Watched'          },
    { value: 'name_asc',      label: 'Name (A → Z)'            },
    { value: 'name_desc',     label: 'Name (Z → A)'            },
    { value: 'tmdb_desc',     label: 'TMDB Rating (High → Low)'},
];

const RATING_FILTER_OPTIONS = [
    { value: 'all',    label: 'All shows'    },
    { value: 'rated',  label: 'Rated only'   },
    { value: 'unrated',label: 'Unrated only' },
];

/**
 * Sort and filter a watched list client-side.
 * All data is already loaded so no extra requests are needed.
 */


// ── Diary helpers ─────────────────────────────────────────────────────────────

/**
 * Group an array of watched shows into { "Month Year": [show, ...] }
 * sorted most-recent-first within each group, groups also most-recent-first.
 */
/**
 * Group shows into { "Month Year": [show, ...] }.
 * Months are always ordered most-recent-first.
 * Within each month, entries are sorted by `sortBy`.
 */
const groupByMonth = (shows, sortBy = 'watched_desc') => {
    // Always bucket by watched date regardless of sort
    const groups = {};
    shows.forEach((show) => {
        const date  = new Date(show.watched_at ?? show.created_at ?? Date.now());
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(show);
    });

    // Sort within each month by the chosen criteria
    Object.values(groups).forEach((list) => {
        list.sort((a, b) => {
            switch (sortBy) {
                case 'rating_desc':  return (b.rating ?? -1) - (a.rating ?? -1);
                case 'rating_asc':   return (a.rating ?? 99) - (b.rating ?? 99);
                case 'watched_asc':  return new Date(a.watched_at ?? 0) - new Date(b.watched_at ?? 0);
                case 'name_asc':     return (a.show_name ?? '').localeCompare(b.show_name ?? '');
                case 'name_desc':    return (b.show_name ?? '').localeCompare(a.show_name ?? '');
                case 'tmdb_desc':    return (b.vote_average ?? 0) - (a.vote_average ?? 0);
                default:             // watched_desc — newest first within month
                    return new Date(b.watched_at ?? 0) - new Date(a.watched_at ?? 0);
            }
        });
    });

    // Sort month keys most-recent-first
    return Object.fromEntries(
        Object.entries(groups).sort(
            ([a], [b]) => new Date(b) - new Date(a)
        )
    );
};

const formatDay = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
        weekday: 'short',
        day:     'numeric',
    });
};

// ── DiaryEntry ─────────────────────────────────────────────────────────────────

/**
 * A single diary row with an inline edit panel.
 *
 * Edit button (pencil) reveals a panel with:
 *   - Star rating picker
 *   - Review textarea
 *   - Save button
 *   - Remove button (clearly labelled, requires its own click — no accidental removal)
 *
 * Props:
 *   show          - watched show row
 *   isOwnProfile  - bool — controls whether edit button is visible
 *   onRemove      - (showId) => Promise
 *   onSaveReview  - (showId, { rating, review }) => Promise
 */
const DiaryEntry = ({ show, isOwnProfile, onRemove, onSaveReview }) => {
    const [editing,     setEditing]    = useState(false);
    const [rating,      setRating]     = useState(show.rating ?? null);
    const [reviewText,  setReviewText] = useState(show.review ?? '');
    const [watchedDate, setWatchedDate] = useState(
        show.watched_at ? new Date(show.watched_at).toISOString().slice(0, 10) : ''
    );
    const [saving,    setSaving]    = useState(false);
    const [removing,  setRemoving]  = useState(false);

    const year = show.first_air_date ? show.first_air_date.split('-')[0] : null;

    const handleSave = async () => {
        setSaving(true);
        await onSaveReview(show.show_id, {
            rating,
            review: reviewText,
            ...(watchedDate && { watched_at: new Date(watchedDate).toISOString() }),
        });
        setSaving(false);
        setEditing(false);
    };

    const handleRemove = async () => {
        setRemoving(true);
        await onRemove(show.show_id);
        // No need to setRemoving(false) — the row will unmount
    };

    const handleCancel = () => {
        setRating(show.rating ?? null);
        setReviewText(show.review ?? '');
        setWatchedDate(show.watched_at ? new Date(show.watched_at).toISOString().slice(0, 10) : '');
        setEditing(false);
    };

    return (
        <div className="py-3.5 border-b border-[#2c3440]/60 last:border-0 group">
            {/* Main row */}
            <div className="flex items-start gap-3 sm:gap-4">
                {/* Date badge */}
                <div className="w-12 flex-shrink-0 text-center pt-0.5">
                    <span className="text-xs text-[#89BAA2] leading-tight block">
                        {formatDay(show.watched_at ?? show.created_at)}
                    </span>
                </div>

                {/* Poster */}
                <Link to={`/show/${show.show_id}`} className="flex-shrink-0">
                    <div className="w-10 h-14 rounded overflow-hidden bg-[#2c3440] shadow
                                    hover:ring-1 ring-[#D87B53] transition-all">
                        {show.poster_path && (
                            <img
                                src={`${TMDB_IMAGE_BASE}${show.poster_path}`}
                                alt={show.show_name}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                </Link>

                {/* Show info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <Link to={`/show/${show.show_id}`}>
                                <p className="text-sm font-semibold text-[#EBDFD9] hover:text-[#D87B53]
                                              transition-colors line-clamp-1">
                                    {show.show_name}
                                </p>
                            </Link>
                        </div>

                        {/* Edit toggle — own profile only, revealed on hover (always on mobile) */}
                        {isOwnProfile && (
                            <button
                                onClick={() => setEditing(prev => !prev)}
                                className={`flex-shrink-0 p-1 rounded hover:bg-[#2c3440] transition-colors
                                            ${editing ? 'text-[#D87B53]' : 'text-[#89BAA2]'}`}
                                title="Edit entry"
                            >
                                <EditIcon sx={{ fontSize: 14 }} />
                            </button>
                        )}
                    </div>

                    {/* Rating + review — read-only when not editing */}
                    {!editing && (
                        <>
                            {show.rating && (
                                <StarRating value={show.rating} size="sm" showLabel className="mt-1" />
                            )}
                            {show.review && (
                                <p className="text-xs text-[#EBDFD9]/60 mt-1 line-clamp-2">
                                    {show.review}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Inline edit panel */}
            {editing && (
                <ReviewEditPanel
                    rating={rating}
                    onRatingChange={setRating}
                    reviewText={reviewText}
                    onReviewTextChange={setReviewText}
                    watchedDate={watchedDate}
                    onWatchedDateChange={setWatchedDate}
                    saving={saving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onRemove={handleRemove}
                    removing={removing}
                    className="mt-3 ml-16 p-3 rounded-lg bg-[#1a1f28] border border-[#2c3440]"
                />
            )}
        </div>
    );
};

// ── WatchedGrid ────────────────────────────────────────────────────────────────

/**
 * Reusable styled select matching the site filter style.
 * Extracted to avoid repeating the className string three times.
 */
const FilterSelect = ({ value, onChange, options }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-[#2c3440] text-[#EBDFD9] text-sm rounded-md
                       pl-3 pr-8 py-2 border border-[#DCB35A]/15 cursor-pointer
                       hover:border-[#DCB35A]/35 focus:outline-none focus:border-[#D87B53]/60
                       transition-colors"
        >
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
        <ExpandMoreIcon
            sx={{ fontSize: 16, color: '#89BAA2' }}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        />
    </div>
);

export const WatchedGrid = ({ shows, isOwnProfile, onRemove, onMarkWatched, onSaveReview }) => {
    const [sortBy,       setSortBy]       = useState('watched_desc');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [yearFilter,   setYearFilter]   = useState('all');

    if (shows.length === 0) {
        return (
            <div className="py-16 text-center">
                <VisibilityIcon sx={{ fontSize: 40, color: '#2c3440' }} />
                <p className="text-[#89BAA2] mt-3 text-sm">No shows watched yet.</p>
                <p className="text-[#89BAA2]/60 text-xs mt-1">
                    Browse the home page and mark shows as watched.
                </p>
            </div>
        );
    }

    // Derive year options from the user's own watch history
    const availableYears = [
        { value: 'all', label: 'All years' },
        ...[...new Set(
            shows
                .map(s => new Date(s.watched_at ?? s.created_at ?? 0).getFullYear())
                .filter(Boolean)
        )]
            .sort((a, b) => b - a)
            .map(y => ({ value: String(y), label: String(y) })),
    ];

    // Apply all filters, then group into months
    const filtered = shows.filter(s => {
        if (ratingFilter === 'rated'   && s.rating == null) return false;
        if (ratingFilter === 'unrated' && s.rating != null) return false;
        if (yearFilter !== 'all') {
            const year = new Date(s.watched_at ?? s.created_at ?? 0).getFullYear();
            if (String(year) !== yearFilter) return false;
        }
        return true;
    });

    const groups = groupByMonth(filtered, sortBy);
    const months = Object.keys(groups);

    return (
        <>
            {/* Filter bar — own profile only */}
            {isOwnProfile && (
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <FilterSelect
                        value={sortBy}
                        onChange={setSortBy}
                        options={SORT_OPTIONS}
                    />
                    <FilterSelect
                        value={ratingFilter}
                        onChange={setRatingFilter}
                        options={RATING_FILTER_OPTIONS}
                    />
                    <FilterSelect
                        value={yearFilter}
                        onChange={setYearFilter}
                        options={availableYears}
                    />
                    <span className="text-xs text-[#89BAA2]">
                        {filtered.length} {filtered.length === 1 ? 'show' : 'shows'}
                        {filtered.length !== shows.length && ` of ${shows.length}`}
                    </span>
                </div>
            )}

            {filtered.length === 0 ? (
                <p className="text-[#89BAA2] text-sm text-center py-12">
                    No shows match the current filters.
                </p>
            ) : (
                <div className="space-y-8 pb-8">
                    {months.map((month) => (
                        <section key={month}>
                            <h3 className="text-xs font-bold text-[#89BAA2] uppercase tracking-widest
                                           mb-1 pb-2 border-b border-[#2c3440]">
                                {month}
                            </h3>
                            <div>
                                {groups[month].map((show) => (
                                    <DiaryEntry
                                        key={show.show_id}
                                        show={show}
                                        isOwnProfile={isOwnProfile}
                                        onRemove={onRemove}
                                        onSaveReview={onSaveReview}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </>
    );
};


// ── WatchlistGrid ─────────────────────────────────────────────────────────────

export const WatchlistGrid = ({ shows, isOwnProfile, onRemove, onMarkWatched }) => {
    if (shows.length === 0) {
        return (
            <div className="py-16 text-center">
                <BookmarkIcon sx={{ fontSize: 40, color: '#2c3440' }} />
                <p className="text-[#89BAA2] mt-3 text-sm">Your watchlist is empty.</p>
                <p className="text-[#89BAA2]/60 text-xs mt-1">
                    Add shows from any page using the Watchlist button.
                </p>
            </div>
        );
    }

    return (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 py-4">
            {shows.map((show) => (
                <TrackedShowCard
                    key={show.show_id}
                    show={show}
                    mode="watchlist"
                    isOwnProfile={isOwnProfile}
                    onRemove={onRemove}
                    onMarkWatched={onMarkWatched}
                />
            ))}
        </ul>
    );
};

// ── WatchingGrid ──────────────────────────────────────────────────────────────

/**
 * WatchingCard
 * A show the user is currently watching, with inline season/episode progress.
 */
const WatchingCard = ({ show, isOwnProfile, onRemove, onUpdateProgress, onSaveReview }) => {
    const [season,     setSeason]     = useState(show.current_season  ?? 1);
    const [episode,    setEpisode]    = useState(show.current_episode ?? 1);
    const [savingProg, setSavingProg] = useState(false);

    // Review edit state
    const [editing,     setEditing]    = useState(false);
    const [rating,      setRating]     = useState(show.rating  ?? null);
    const [reviewText,  setReviewText] = useState(show.review  ?? '');
    const [watchedDate, setWatchedDate] = useState(
        show.watched_at ? new Date(show.watched_at).toISOString().slice(0, 10) : ''
    );
    const [savingRev,  setSavingRev]  = useState(false);

    const isDirty = season  !== (show.current_season  ?? 1)
        || episode !== (show.current_episode ?? 1);

    //const year = show.first_air_date ? show.first_air_date.split('-')[0] : null;

    const handleSaveProgress = async () => {
        setSavingProg(true);
        await onUpdateProgress(show.show_id, {
            current_season:  season,
            current_episode: episode,
        });
        setSavingProg(false);
    };

    const handleSaveReview = async () => {
        setSavingRev(true);
        await onSaveReview(show.show_id, {
            rating,
            review: reviewText,
            ...(watchedDate && { watched_at: new Date(watchedDate).toISOString() }),
        });
        setSavingRev(false);
        setEditing(false);
    };

    const handleCancelReview = () => {
        setRating(show.rating ?? null);
        setReviewText(show.review ?? '');
        setWatchedDate(show.watched_at ? new Date(show.watched_at).toISOString().slice(0, 10) : '');
        setEditing(false);
    };

    return (
        <div className="rounded-xl bg-[#1f2429] border border-[#2c3440] hover:border-[#DCB35A]/20
                        transition-colors group overflow-hidden">

            {/* Main row */}
            <div className="flex items-center gap-4 px-4 py-3">

                {/* Poster */}
                <Link to={`/show/${show.show_id}`} className="flex-shrink-0">
                    <div className="w-12 h-16 rounded overflow-hidden bg-[#2c3440] shadow
                                    hover:ring-1 ring-[#DCB35A] transition-all">
                        {show.poster_path && (
                            <img
                                src={`${TMDB_IMAGE_BASE}${show.poster_path}`}
                                alt={show.show_name}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                </Link>

                {/* Name + year + review snippet */}
                <div className="flex-1 min-w-0">
                    <Link to={`/show/${show.show_id}`}>
                        <p className="text-sm font-semibold text-[#EBDFD9] hover:text-[#D87B53]
                                      transition-colors line-clamp-1">
                            {show.show_name}
                        </p>
                    </Link>
                    {/* Show rating/review snippet in read mode */}
                    {!editing && show.rating && (
                        <StarRating value={show.rating} size="sm" className="mt-1" />
                    )}
                    {!editing && show.review && (
                        <p className="text-xs text-[#EBDFD9]/50 mt-0.5 line-clamp-1">
                            {show.review}
                        </p>
                    )}
                </div>

                {/* Progress inputs — own profile */}
                {isOwnProfile ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-[#89BAA2] uppercase tracking-wider">S</span>
                            <input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                className="w-10 text-center bg-[#2c3440] text-[#EBDFD9] text-sm font-semibold
                                           rounded-md border border-[#DCB35A]/15 py-1 focus:outline-none
                                           focus:border-[#DCB35A]/50 [appearance:textfield]
                                           [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                        <span className="text-[#89BAA2] text-xs mt-3">·</span>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-[#89BAA2] uppercase tracking-wider">Ep</span>
                            <input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={episode}
                                onChange={(e) => setEpisode(e.target.value)}
                                className="w-12 text-center bg-[#2c3440] text-[#EBDFD9] text-sm font-semibold
                                           rounded-md border border-[#DCB35A]/15 py-1 focus:outline-none
                                           focus:border-[#DCB35A]/50 [appearance:textfield]
                                           [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>

                        {isDirty && (
                            <button
                                onClick={handleSaveProgress}
                                disabled={savingProg}
                                className="ml-1 flex items-center justify-center w-7 h-7 rounded-full
                                           bg-[#DCB35A]/20 text-[#DCB35A] hover:bg-[#DCB35A]/40
                                           transition-colors flex-shrink-0"
                                title="Save progress"
                            >
                                {savingProg
                                    ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                    : <CheckIcon sx={{ fontSize: 14 }} />}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-[#89BAA2] flex-shrink-0 text-right">
                        {show.current_season && (
                            <span>S{show.current_season} E{show.current_episode ?? 1}</span>
                        )}
                    </div>
                )}

                {/* Edit review button — own profile */}
                {isOwnProfile && (
                    <button
                        onClick={() => setEditing(prev => !prev)}
                        className={`flex-shrink-0 p-1 rounded hover:bg-[#2c3440] transition-colors
                                    ${editing ? 'text-[#D87B53]' : 'text-[#89BAA2]'}`}
                        title="Edit review"
                    >
                        <EditIcon sx={{ fontSize: 14 }} />
                    </button>
                )}

                {/* Remove */}
                {isOwnProfile && (
                    <Tooltip title="Remove from watching" placement="top">
                        <button
                            onClick={() => onRemove(show.show_id)}
                            className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors p-1"
                        >
                            <CloseIcon sx={{ fontSize: 14 }} />
                        </button>
                    </Tooltip>
                )}
            </div>

            {/* Inline review edit panel */}
            {editing && (
                <ReviewEditPanel
                    rating={rating}
                    onRatingChange={setRating}
                    reviewText={reviewText}
                    onReviewTextChange={setReviewText}
                    watchedDate={watchedDate}
                    onWatchedDateChange={setWatchedDate}
                    saving={savingRev}
                    onSave={handleSaveReview}
                    onCancel={handleCancelReview}
                    className="mx-4 mb-3 p-3 rounded-lg bg-[#14181c] border border-[#2c3440]"
                />
            )}
        </div>
    );
};

export const WatchingGrid = ({ shows, isOwnProfile, onRemove, onUpdateProgress, onSaveReview }) => {
    if (shows.length === 0) {
        return (
            <div className="py-16 text-center">
                <PlayCircleOutlineIcon sx={{ fontSize: 40, color: '#2c3440' }} />
                <p className="text-[#89BAA2] mt-3 text-sm">Not watching anything yet.</p>
                <p className="text-[#89BAA2]/60 text-xs mt-1">
                    Use the Watching button on any show to track it here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 py-4">
            {shows.map((show) => (
                <WatchingCard
                    key={show.show_id}
                    show={show}
                    isOwnProfile={isOwnProfile}
                    onRemove={onRemove}
                    onUpdateProgress={onUpdateProgress}
                    onSaveReview={onSaveReview}
                />
            ))}
        </div>
    );
};
