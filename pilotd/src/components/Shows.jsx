/**
 * Shows.jsx
 * Browse all TV shows with combinable filters and sorting.
 *
 * Filters (all optional, all combinable):
 *   - Sort by: popularity, air date
 *   - Genre: multi-select (AND logic — shows must match all selected genres)
 *   - Rating: highest, lowest
 *   - Streaming service: major providers via TMDB watch providers
 *   - Year: single year of first air date
 *
 * Results use the existing shows-grid CSS and ShowCard component.
 * Pagination: "Load more" button appends the next page of results.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Header   from './Header';
import ShowCard from './ShowCard';

// ── TMDB config ────────────────────────────────────────────────────────────────

const BASE_API_URL = 'https://api.themoviedb.org/3/';
const API_OPTIONS  = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}`,
    },
};

// ── Static filter option lists ─────────────────────────────────────────────────

const SORT_OPTIONS = [
    { value: '',     label: 'Any Order'   },
    { value: 'popularity.desc',     label: 'Most Popular'   },
    { value: 'popularity.asc',      label: 'Least Popular'  },
    { value: 'first_air_date.desc', label: 'Newest First'   },
    { value: 'first_air_date.asc',  label: 'Oldest First'   },
];

const RATING_OPTIONS = [
    { value: '',   label: 'Any Rating'  },
    { value: 'vote_average.desc',   label: 'Highest Rated'  },
    { value: 'vote_average.asc',    label: 'Lowest Rated'   },
];

// TMDB watch provider IDs for major services
const STREAMING_SERVICES = [
    { value: '',     label: 'Any Service'   },
    { value: '8',    label: 'Netflix'       },
    { value: '9',    label: 'Amazon Prime'  },
    { value: '337',  label: 'Disney+'       },
    { value: '1899', label: 'Max'           },
    { value: '15',   label: 'Hulu'          },
    { value: '2',    label: 'Apple TV+'     },
    { value: '386',  label: 'Peacock'       },
    { value: '531',  label: 'Paramount+'    },
];

// Years from current year down to 1950
const currentYear = new Date().getFullYear();
const YEARS = [
    { value: '', label: 'Any Year' },
    ...Array.from({ length: currentYear - 1949 }, (_, i) => {
        const year = String(currentYear - i);
        return { value: year, label: year };
    }),
];

// Default filter state — exported so it can be compared to detect active filters
const DEFAULT_FILTERS = {
    sortBy:     'popularity.desc',
    genreIds:   [],
    minRating:  '',
    providerId: '',
    year:       '',
};

// ── TMDB helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch a page of discover results, returning both the show list and pagination info.
 */
const fetchDiscoverPage = async (filters, page) => {
    const params = new URLSearchParams({
        include_adult: 'true',
        sort_by:       filters.sortBy,
        page:          String(page),
    });

    if (filters.genreIds.length > 0) {
        params.set('with_genres', filters.genreIds.join(','));
    }
    if (filters.minRating) {
        params.set('vote_average.gte', filters.minRating);
        // Require enough votes so low-vote shows don't dominate rated queries
        params.set('vote_count.gte', '50');
    }
    if (filters.providerId) {
        params.set('with_watch_providers', filters.providerId);
        params.set('watch_region', 'US');
    }
    if (filters.year) {
        params.set('first_air_date.gte', `${filters.year}-01-01`);
        params.set('first_air_date.lte', `${filters.year}-12-31`);
    }

    const res  = await fetch(`${BASE_API_URL}discover/tv?${params}`, API_OPTIONS);
    const json = await res.json();
    return {
        results:     json.results     ?? [],
        totalPages:  json.total_pages ?? 1,
    };
};

/**
 * Fetch the full list of TV genres from TMDB.
 */
const fetchGenres = async () => {
    const res  = await fetch(`${BASE_API_URL}genre/tv/list`, API_OPTIONS);
    const json = await res.json();
    return json.genres ?? [];
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * FilterSelect
 * A styled native <select> that matches the site's dark colour scheme.
 */
const FilterSelect = ({ label, value, onChange, options }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-[#2c3440] text-[#EBDFD9] text-sm rounded-md
                       pl-3 pr-8 py-2 border border-[#DCB35A]/15 cursor-pointer
                       hover:border-[#DCB35A]/35 focus:outline-none focus:border-[#D87B53]/60
                       transition-colors duration-150"
        >
            {/* Group label as a disabled first option when value is set */}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        {/* Custom chevron icon */}
        <ExpandMoreIcon
            sx={{ fontSize: 16, color: '#89BAA2' }}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        />
    </div>
);

/**
 * GenreDropdown
 * A custom multi-select dropdown backed by checkboxes.
 * Genres fetched from TMDB are listed; any number can be toggled.
 * Click-outside or pressing Escape closes the panel.
 */
const GenreDropdown = ({ genres, selectedIds, onChange }) => {
    const [open, setOpen] = useState(false);
    const containerRef    = useRef(null);

    // Close when clicking outside the dropdown
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const toggleGenre = (id) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((g) => g !== id)
                : [...selectedIds, id]
        );
    };

    const label = selectedIds.length > 0
        ? `Genre (${selectedIds.length})`
        : 'Genre';

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 bg-[#2c3440] text-sm rounded-md
                            px-3 py-2 border transition-colors duration-150
                            ${open || selectedIds.length > 0
                    ? 'border-[#D87B53]/60 text-[#D87B53]'
                    : 'border-[#DCB35A]/15 text-[#EBDFD9] hover:border-[#DCB35A]/35'}
                           `}
            >
                {label}
                <ExpandMoreIcon
                    sx={{ fontSize: 16 }}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute top-full mt-1 left-0 z-50 w-52 max-h-72 overflow-y-auto
                                bg-[#1f2429] border border-[#2c3440] rounded-lg shadow-xl py-1">
                    {genres.map((genre) => {
                        const checked = selectedIds.includes(genre.id);
                        return (
                            <label
                                key={genre.id}
                                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer
                                           hover:bg-[#2c3440] transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleGenre(genre.id)}
                                    className="accent-[#D87B53] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className={`text-sm ${checked ? 'text-[#D87B53]' : 'text-[#EBDFD9]'}`}>
                                    {genre.name}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * ActiveFilterChip
 * A small dismissible pill showing one active filter value.
 */
const ActiveFilterChip = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                     font-medium bg-[#D87B53]/15 text-[#D87B53] border border-[#D87B53]/25">
        {label}
        <button
            onClick={onRemove}
            className="hover:text-[#EF8D72] transition-colors ml-0.5"
            aria-label={`Remove ${label} filter`}
        >
            <CloseIcon sx={{ fontSize: 12 }} />
        </button>
    </span>
);

// ── Main component ─────────────────────────────────────────────────────────────

function Shows() {
    const [filters,    setFilters]    = useState(DEFAULT_FILTERS);
    const [genres,     setGenres]     = useState([]);
    const [results,    setResults]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page,       setPage]       = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Load genre list once on mount
    useEffect(() => {
        fetchGenres().then(setGenres);
    }, []);

    // Fetch fresh results whenever filters change — reset to page 1
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setPage(1);
            const { results: data, totalPages: pages } = await fetchDiscoverPage(filters, 1);
            if (!cancelled) {
                setResults(data);
                setTotalPages(pages);
                setLoading(false);
            }
        };

        // Small debounce so rapid filter changes don't fire multiple requests
        const timer = setTimeout(load, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [filters]);

    // Append the next page of results without disturbing the existing list
    const handleLoadMore = useCallback(async () => {
        const nextPage = page + 1;
        setLoadingMore(true);
        const { results: more, totalPages: pages } = await fetchDiscoverPage(filters, nextPage);
        setResults((prev) => [...prev, ...more]);
        setPage(nextPage);
        setTotalPages(pages);
        setLoadingMore(false);
    }, [filters, page]);

    // Generic single-value filter updater
    const updateFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearAllFilters = () => setFilters(DEFAULT_FILTERS);

    // Determine which non-sort filters are active (for chips + clear button)
    const hasActiveFilters =
        filters.genreIds.length > 0 ||
        filters.minRating  !== '' ||
        filters.providerId !== '' ||
        filters.year       !== '';

    // Helpers to find labels for active filter chips
    const genreNameById    = (id) => genres.find((g) => g.id === id)?.name ?? '';
    const serviceNameById  = (id) => STREAMING_SERVICES.find((s) => s.value === id)?.label ?? '';
    const ratingLabelByVal = (v)  => RATING_OPTIONS.find((r) => r.value === v)?.label ?? '';

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />
                <div className="wrapper pt-8">

                    {/* ── Page heading ───────────────────────────────────────── */}
                    <h1 className="text-2xl font-bold text-[#EBDFD9] mb-6">Browse Shows</h1>

                    {/* ── Filter bar ─────────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-2 mb-3">

                        {/* Sort */}
                        <FilterSelect
                            label="Sort by"
                            value={filters.sortBy}
                            onChange={(v) => updateFilter('sortBy', v)}
                            options={SORT_OPTIONS}
                        />

                        {/* Genre — custom multi-select */}
                        <GenreDropdown
                            genres={genres}
                            selectedIds={filters.genreIds}
                            onChange={(ids) => updateFilter('genreIds', ids)}
                        />

                        {/* Rating */}
                        <FilterSelect
                            label="Rating"
                            value={filters.minRating}
                            onChange={(v) => updateFilter('minRating', v)}
                            options={RATING_OPTIONS}
                        />

                        {/* Streaming service */}
                        <FilterSelect
                            label="Service"
                            value={filters.providerId}
                            onChange={(v) => updateFilter('providerId', v)}
                            options={STREAMING_SERVICES}
                        />

                        {/* Year */}
                        <FilterSelect
                            label="Year"
                            value={filters.year}
                            onChange={(v) => updateFilter('year', v)}
                            options={YEARS}
                        />

                        {/* Clear all — only shown when non-default filters are active */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="px-3 py-2 rounded-md text-sm text-[#89BAA2]
                                           hover:text-[#EBDFD9] transition-colors border
                                           border-transparent hover:border-[#2c3440]"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* ── Active filter chips ────────────────────────────────── */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 mb-5">
                            {/* One chip per selected genre */}
                            {filters.genreIds.map((id) => (
                                <ActiveFilterChip
                                    key={id}
                                    label={genreNameById(id)}
                                    onRemove={() =>
                                        updateFilter('genreIds', filters.genreIds.filter((g) => g !== id))
                                    }
                                />
                            ))}

                            {filters.minRating && (
                                <ActiveFilterChip
                                    label={ratingLabelByVal(filters.minRating)}
                                    onRemove={() => updateFilter('minRating', '')}
                                />
                            )}

                            {filters.providerId && (
                                <ActiveFilterChip
                                    label={serviceNameById(filters.providerId)}
                                    onRemove={() => updateFilter('providerId', '')}
                                />
                            )}

                            {filters.year && (
                                <ActiveFilterChip
                                    label={filters.year}
                                    onRemove={() => updateFilter('year', '')}
                                />
                            )}
                        </div>
                    )}

                    {/* ── Results ───────────────────────────────────────────── */}
                    <section className="all-shows">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <CircularProgress sx={{ color: '#D87B53' }} />
                            </div>
                        ) : results.length > 0 ? (
                            <>
                                <ul className="shows-grid">
                                    {results.map((show) => (
                                        <ShowCard key={show.id} show={show} />
                                    ))}
                                </ul>

                                {/* Load more — hidden when on the last page */}
                                {page < totalPages && (
                                    <div className="flex justify-center mt-8 mb-4">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg
                                                       text-sm font-semibold text-[#EBDFD9]
                                                       bg-[#2c3440] border border-[#DCB35A]/15
                                                       hover:border-[#D87B53]/40 hover:bg-[#3a4452]
                                                       transition-colors disabled:opacity-60"
                                        >
                                            {loadingMore && (
                                                <CircularProgress size={14} sx={{ color: '#89BAA2' }} />
                                            )}
                                            {loadingMore ? 'Loading…' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-[#EBDFD9] text-lg font-semibold mb-2">
                                    No shows found
                                </p>
                                <p className="text-[#89BAA2] text-sm">
                                    Try adjusting or clearing some filters.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

export default Shows;
