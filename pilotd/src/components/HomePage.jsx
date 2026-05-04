/**
 * HomePage.jsx
 *
 * Logged-out:  Hero → Trending → Features → Community
 * Logged-in:   Personal greeting → Friends' activity → Trending → Community
 *
 * ShowRow handles both plain TMDB rows and friend-activity rows via an
 * optional `renderLabel` prop, no separate FriendActivityRow needed.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link }             from 'react-router';
import { useDebounce }      from 'react-use';
import { CircularProgress } from '@mui/material';
import VisibilityIcon  from '@mui/icons-material/Visibility';
import BookmarkIcon    from '@mui/icons-material/Bookmark';
import StarIcon        from '@mui/icons-material/Star';
import GroupIcon       from '@mui/icons-material/Group';
import FavoriteIcon    from '@mui/icons-material/Favorite';
import PersonIcon      from '@mui/icons-material/Person';

import Header     from './Header';
import StarRating from './profile/StarRating';
import SearchBar from './SearchBar';
import ShowCard  from './ShowCard';
import {
    getRecentCommunityActivity,
    getFollowingIds,
    getFriendActivity,
} from '../profileService';
import { useAuth } from '../AuthContext';

// ── TMDB helper ────────────────────────────────────────────────────────────────

const BASE_API_URL = 'https://api.themoviedb.org/3/';
const API_OPTIONS  = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}`,
    },
};

const fetchFromTMDB = async (endpoint) => {
    const res  = await fetch(`${BASE_API_URL}${endpoint}`, API_OPTIONS);
    const json = await res.json();
    return json.results ?? [];
};

// ── Normalise a show object to the shape ShowCard expects ─────────────────────
// Stored rows use show_id / show_name; TMDB uses id / name.

const normaliseShow = (show) => ({
    id:                show.id             ?? show.show_id,
    name:              show.name           ?? show.show_name,
    poster_path:       show.poster_path    ?? null,
    first_air_date:    show.first_air_date ?? '',
    vote_average:      show.vote_average   ?? 0,
    original_language: show.original_language ?? '',
});

// ── ShowRow ────────────────────────────────────────────────────────────────────

/**
 * Horizontally scrolling row of ShowCards.
 *
 * Props:
 *   title       {string}    - section heading
 *   shows       {object[]}  - TMDB or stored show objects
 *   loading     {boolean}
 *   emptyLabel  {string}    - text shown when shows is empty (optional)
 *   renderLabel {function}  - optional (show) => ReactNode rendered beneath
 *                            each card, used for friend attribution labels
 *
 */
const ShowRow = ({ title, shows, loading, emptyLabel, renderLabel, normalise }) => {
    const hasLabel  = typeof renderLabel === 'function';
    // Allow callsites to override the normaliser (e.g. community reviews uses member rating)
    const normaliser = typeof normalise === 'function' ? normalise : normaliseShow;

    const content = () => {
        if (loading) {
            return (
                <div className="flex justify-center py-12">
                    <CircularProgress sx={{ color: '#D87B53' }} size={28} />
                </div>
            );
        }

        if (shows.length === 0) {
            return (
                <p className="text-[#89BAA2] text-sm px-1">
                    {emptyLabel ?? 'Nothing here yet.'}
                </p>
            );
        }

        const normalised = shows.map(normaliser);

        if (!hasLabel) {
            // Plain row
            return (
                <ul className="shows-row">
                    {normalised.map((show, idx) => (
                        <ShowCard key={`${show.id}-${idx}`} show={show} />
                    ))}
                </ul>
            );
        }

        // Labelled row
        return (
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                {normalised.map((show, idx) => (
                    <div key={`${show.id}-${idx}`} className="flex-shrink-0 w-[140px] sm:w-[160px] flex flex-col gap-1.5">
                        {/* Render ShowCard inside a <ul> so its <li> is valid */}
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            <ShowCard show={show} />
                        </ul>
                        {renderLabel(shows[idx])}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section className="mb-10">
            <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-widest mb-4 px-1">
                {title}
            </h2>
            {content()}
        </section>
    );
};

// ── ReviewerLabel — shown beneath each card in the community reviews row ────────

const ReviewerLabel = ({ entry }) => {
    const displayName = entry.user_profiles?.display_name ?? 'A member';
    const avatarUrl   = entry.user_profiles?.avatar_url   ?? null;
    const profileUrl  = `/profile/${entry.user_id}`;

    return (
        <div className="flex flex-col gap-0.5 px-0.5">
            {/* Member name + avatar */}
            <div className="flex items-center gap-1.5">
                <Link to={profileUrl} className="flex items-center gap-1.5 group/member">
                <div className="w-4 h-4 rounded-full overflow-hidden bg-[#2c3440] flex-shrink-0
                                flex items-center justify-center border border-[#DCB35A]/10">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <PersonIcon sx={{ fontSize: 10, color: '#89BAA2' }} />
                    )}
                </div>
                <span className="text-xs text-[#89BAA2] truncate group-hover/member:text-[#D87B53] transition-colors">
                    {displayName}
                </span>
                </Link>
            </div>

            {/* Member rating + written review indicator */}
            {entry.rating && (
                <div className="flex items-center gap-1.5">
                    <StarRating value={entry.rating} size="sm" />
                    {/* Small chat icon only when there is a written review */}
                    {entry.review && (
                        <svg
                            width="10" height="10" viewBox="0 0 24 24"
                            fill="none" stroke="#89BAA2" strokeWidth="2"
                            title="Has written review"
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Feature cards (logged-out only) ───────────────────────────────────────────

const FeatureCard = ({ icon: Icon, title, description, iconColor }) => (
    <div className="flex flex-col items-start gap-3 p-5 rounded-xl bg-[#1f2429] border border-[#2c3440] hover:border-[#D87B53]/30 transition-colors">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}18` }}>
            <Icon sx={{ fontSize: 22, color: iconColor }} />
        </div>
        <div>
            <h3 className="text-[#EBDFD9] font-semibold mb-1">{title}</h3>
            <p className="text-[#89BAA2] text-sm leading-relaxed">{description}</p>
        </div>
    </div>
);

const FEATURES = [
    { icon: VisibilityIcon, iconColor: '#378370', title: 'Log what you watch',   description: "Mark shows as watched and build a complete record of everything you've seen." },
    { icon: BookmarkIcon,   iconColor: '#D87B53', title: 'Build your watchlist', description: "Save shows you want to watch so you never forget what's next in your queue." },
    { icon: StarIcon,       iconColor: '#DCB35A', title: 'Rate and review',      description: 'Give each show a star rating and write your own review to remember how it made you feel.' },
    { icon: FavoriteIcon,   iconColor: '#EF8D72', title: 'Pin your favourites',  description: 'Choose up to four all-time favourite shows to display on your profile.' },
    { icon: GroupIcon,      iconColor: '#89BAA2', title: 'Follow friends',       description: 'See what other members are watching and discover shows through people you trust.' },
    { icon: PersonIcon,     iconColor: '#EBDFD9', title: 'Your public profile',  description: 'Share your taste — every member gets a profile page showcasing their shows and reviews.' },
];

// ── Main component ─────────────────────────────────────────────────────────────

function HomePage() {
    const { user } = useAuth();
    const displayName = user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'back';

    const [searchVal,       setSearchVal]       = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchResults,   setSearchResults]   = useState([]);
    const [searchLoading,   setSearchLoading]   = useState(false);

    const [trending,         setTrending]         = useState([]);
    const [rowsLoading,      setRowsLoading]      = useState(true);

    const [friendEntries,    setFriendEntries]    = useState([]);
    const [friendLoading,    setFriendLoading]    = useState(false);

    const [communityEntries, setCommunityEntries] = useState([]);
    const [communityLoading, setCommunityLoading] = useState(true);

    useDebounce(() => setDebouncedSearch(searchVal), 500, [searchVal]);

    useEffect(() => {
        const load = async () => {
            setRowsLoading(true);
            const data = await fetchFromTMDB('discover/tv?include_adult=false&sort_by=popularity.desc&page=1');
            setTrending(data.slice(0, 16));
            setRowsLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        const load = async () => {
            setCommunityLoading(true);
            const { data } = await getRecentCommunityActivity(12);
            setCommunityEntries(data);
            setCommunityLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (!user) { setFriendEntries([]); return; }
        const load = async () => {
            setFriendLoading(true);
            const { data: ids } = await getFollowingIds(user.id);
            if (ids.length > 0) {
                const { data } = await getFriendActivity(ids, 16);
                setFriendEntries(data);
            }
            setFriendLoading(false);
        };
        load();
    }, [user]);

    useEffect(() => {
        if (!debouncedSearch.trim()) { setSearchResults([]); return; }
        const search = async () => {
            setSearchLoading(true);
            const results = await fetchFromTMDB(`search/tv?query=${encodeURIComponent(debouncedSearch)}&include_adult=false`);
            setSearchResults(results);
            setSearchLoading(false);
        };
        search();
    }, [debouncedSearch]);

    const handleSearch = useCallback(async (query) => {
        if (!query.trim()) { setSearchResults([]); return; }
        setSearchLoading(true);
        const results = await fetchFromTMDB(`search/tv?query=${encodeURIComponent(query)}&include_adult=false`);
        setSearchResults(results);
        setSearchLoading(false);
    }, []);

    const isSearching = searchVal.trim().length > 0;

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />

                {/* ── HERO ─────────────────────────────────────────────────── */}
                <section className="wrapper pt-12 pb-6 text-center">
                    {user ? (
                        <>
                            <h1 className="text-3xl sm:text-4xl font-bold text-[#EBDFD9] mb-2">
                                Welcome back,{' '}
                                <span style={{
                                    background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                    {displayName}
                                </span>
                            </h1>
                        </>
                    ) : (
                        <>
                            <h1
                                className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight"
                                style={{
                                    background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Pilotd
                            </h1>
                            <p className="text-[#EBDFD9]/70 text-lg sm:text-xl mb-2 max-w-lg mx-auto leading-relaxed">
                                Track every show you watch. Discover what's next.
                            </p>
                            <p className="text-[#89BAA2] text-sm mb-8 max-w-md mx-auto">
                                Log, rate, and review TV shows — then share your taste with friends.
                            </p>
                        </>
                    )}

                    <div className="max-w-xl mx-auto mb-6">
                        <SearchBar searchVal={searchVal} setSearchVal={setSearchVal} onSearch={handleSearch} />
                    </div>

                    {!user && (
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Link
                                to="/signup"
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-[#14181c] transition-all duration-200 hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                            >
                                Get started — it's free
                            </Link>
                        </div>
                    )}
                </section>

                {/* ── SEARCH RESULTS ────────────────────────────────────────── */}
                {isSearching && (
                    <div className="wrapper pb-10">
                        <section className="all-shows">
                            <h2 className="text-xl font-bold text-white">Search results</h2>
                            {searchLoading ? (
                                <CircularProgress color="inherit" />
                            ) : (
                                <ul className="shows-grid">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((show) => <ShowCard key={show.id} show={show} />)
                                    ) : (
                                        <p className="text-xl font-bold text-white">No shows found.</p>
                                    )}
                                </ul>
                            )}
                        </section>
                    </div>
                )}

                {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
                {!isSearching && (
                    <div className="wrapper">
                        {user ? (
                            /* ── LOGGED-IN ──────────────────────────────────── */
                            <>
                                {/* Friends' activity — ShowRow with a FriendLabel beneath each card */}
                                <ShowRow
                                    title="What your friends are watching"
                                    shows={friendEntries}
                                    loading={friendLoading}
                                    emptyLabel={
                                        <span>
                                            Follow some members to see what they're watching.{' '}
                                            <Link to="/members" className="text-[#D87B53] hover:text-[#EF8D72] transition-colors">
                                                Browse members →
                                            </Link>
                                        </span>
                                    }
                                    renderLabel={(entry) => <ReviewerLabel entry={entry} />}
                                    normalise={(entry) => ({
                                        ...normaliseShow(entry),
                                        vote_average: entry.rating ?? 0,
                                    })}
                                />

                                <ShowRow title="Trending now" shows={trending} loading={rowsLoading} />

                                <div className="border-t border-[#2c3440] pt-10">
                                    <ShowRow
                                        title="Recent member reviews"
                                        shows={communityEntries}
                                        loading={communityLoading}
                                        emptyLabel="No reviews yet — be the first to rate a show!"
                                        renderLabel={(entry) => <ReviewerLabel entry={entry} />}
                                        normalise={(entry) => ({
                                            ...normaliseShow(entry),
                                            vote_average: entry.rating ?? 0,
                                        })}
                                    />
                                </div>
                            </>
                        ) : (
                            /* ── LOGGED-OUT ─────────────────────────────────── */
                            <>
                                <ShowRow title="Trending now" shows={trending} loading={rowsLoading} />

                                <section className="py-10 border-t border-[#2c3440]">
                                    <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-widest mb-2 text-center">
                                        Everything you need
                                    </h2>
                                    <p className="text-[#89BAA2] text-sm text-center mb-8">
                                        Pilotd is a free tool for people who take their TV seriously.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
                                    </div>
                                    <div className="text-center mt-10">
                                        <Link
                                            to="/signup"
                                            className="inline-block px-8 py-3 rounded-lg text-sm font-semibold text-[#14181c] transition-all duration-200 hover:-translate-y-0.5"
                                            style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)'}}
                                        >
                                            Create your free account
                                        </Link>
                                    </div>
                                </section>

                                <div className="border-t border-[#2c3440] pt-10">
                                    <ShowRow
                                        title="Recent member reviews"
                                        shows={communityEntries}
                                        loading={communityLoading}
                                        emptyLabel="No reviews yet — be the first to rate a show!"
                                        renderLabel={(entry) => <ReviewerLabel entry={entry} />}
                                        normalise={(entry) => ({
                                            ...normaliseShow(entry),
                                            vote_average: entry.rating ?? 0,
                                        })}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}

export default HomePage;
