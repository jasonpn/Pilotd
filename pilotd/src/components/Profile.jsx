/**
 * Profile.jsx
 * Handles both the current user's own profile (/profile) and
 * public profiles of other users (/profile/:userId).
 *
 * Own profile  → full read/write, edit controls visible
 * Public profile → read-only, follow/unfollow button visible
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CircularProgress }       from '@mui/material';

import { useAuth }      from '../AuthContext';
import { useTracking }  from '../ShowTrackingContext';
import {
    getUserProfile,
    getUserProfileByUsername,
    isUUID,
    getUserShows,
    getFavorites,
    getFollowCounts,
    checkIsFollowing,
    toggleFollow,
    removeTrackedShow,
    upsertShowStatus,
} from '../profileService';

import Header             from './Header';
import ProfileHeader      from './profile/ProfileHeader';
import FavoriteShows      from './profile/FavoriteShows';
import ActivityFeed       from './profile/ActivityFeed';
import { WatchedGrid, WatchlistGrid, WatchingGrid } from './profile/ShowsGrid';
import ReviewsList        from './profile/ReviewsList';
import EditFavoritesModal from './profile/EditFavoritesModal';

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Watched', 'Watching', 'Watchlist', 'Reviews'];

const TabButton = ({ label, active, count, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative pb-3 text-sm font-semibold transition-colors duration-150
            ${active ? 'text-[#EBDFD9]' : 'text-[#89BAA2] hover:text-[#EBDFD9]'}
        `}
    >
        {label}
        {count != null && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-[#D87B53]/20 text-[#D87B53]' : 'bg-[#2c3440] text-[#89BAA2]'
            }`}>
                {count}
            </span>
        )}
        {active && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D87B53] rounded-full" />
        )}
    </button>
);

// ── Main component ────────────────────────────────────────────────────────────

const Profile = () => {
    const { userId: targetUserId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const isOwnProfile  = !targetUserId || targetUserId === user?.id;
    const profileUserId = isOwnProfile ? user?.id : targetUserId;

    // Shared tracking state from context (same instance as WatchActions)
    const {
        watched:   ownWatched,
        watchlist: ownWatchlist,
        watching:  ownWatching,
        favorites: ownFavorites,
        loading:   trackingLoading,
        submitReview,
        updateFavorites,
        updateProgress,
        reload,
    } = useTracking();

    // Public profile data (loaded separately — read-only)
    const [pubWatched,   setPubWatched]   = useState([]);
    const [pubWatchlist, setPubWatchlist] = useState([]);
    const [pubWatching,  setPubWatching]  = useState([]);
    const [pubFavorites, setPubFavorites] = useState([]);

    // Shared metadata
    const [profile,        setProfile]        = useState(null);
    const [followCounts,   setFollowCounts]   = useState({ followers: 0, following: 0 });
    const [isFollowing,    setIsFollowing]    = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);

    // UI state
    const [activeTab,       setActiveTab]       = useState(0);
    const [showFavModal,    setShowFavModal]    = useState(false);
    const [savingFavorites, setSavingFavorites] = useState(false);
    const [followPending,   setFollowPending]   = useState(false);

    // Redirect if not logged in and trying to view own profile
    useEffect(() => {
        if (!authLoading && !user && isOwnProfile) {
            navigate('/login', { replace: true });
        }
    }, [user, authLoading, isOwnProfile, navigate]);

    // Resolved userId — may differ from URL param when param is a slug
    const [resolvedUserId, setResolvedUserId] = useState(profileUserId);

    // Load profile metadata + follow state.
    // If the URL param is a slug (not a UUID), resolve it to a userId first.
    const loadProfile = useCallback(async () => {
        if (!profileUserId) return;
        setProfileLoading(true);

        // Resolve slug → userId when the param isn't a UUID
        let targetId = profileUserId;
        if (!isOwnProfile && !isUUID(profileUserId)) {
            const { data: slugProfile } = await getUserProfileByUsername(profileUserId);
            if (!slugProfile) {
                setProfileLoading(false);
                return; // 404 — render handled below
            }
            targetId = slugProfile.id;
            setResolvedUserId(targetId);
        }

        const requests = [
            getUserProfile(targetId),
            getFollowCounts(targetId),
        ];

        if (!isOwnProfile) {
            requests.push(getUserShows(targetId));
            requests.push(getFavorites(targetId));
        }

        if (!isOwnProfile && user) {
            requests.push(checkIsFollowing(user.id, targetId));
        }

        const [profileRes, followRes, showsRes, favsRes, followingRes] =
            await Promise.all(requests);

        setProfile(profileRes.data);
        setFollowCounts({ followers: followRes.followers, following: followRes.following });

        if (!isOwnProfile) {
            const shows = showsRes?.data ?? [];
            setPubWatched(shows.filter(s => s.status === 'watched'));
            setPubWatchlist(shows.filter(s => s.status === 'watchlist'));
            setPubWatching(shows.filter(s => s.status === 'watching'));
            setPubFavorites(favsRes?.data ?? []);
            setIsFollowing(followingRes?.isFollowing ?? false);
        }

        setProfileLoading(false);
    }, [profileUserId, isOwnProfile, user]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleProfileUpdated = (updates) =>
        setProfile(prev => ({ ...prev, ...updates }));

    const handleRemoveShow = async (showId) => {
        if (!user) return;
        await removeTrackedShow(user.id, showId);
        reload();
    };

    const handleMarkWatched = async (show) => {
        if (!user) return;
        await upsertShowStatus(user.id, {
            show_id:        show.show_id,
            show_name:      show.show_name,
            poster_path:    show.poster_path,
            first_air_date: show.first_air_date,
            vote_average:   show.vote_average,
        }, 'watched');
        reload();
    };

    const handleSaveFavorites = async (newFavorites) => {
        setSavingFavorites(true);
        await updateFavorites(newFavorites);
        setSavingFavorites(false);
        setShowFavModal(false);
    };

    const handleToggleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        setFollowPending(true);
        const { error } = await toggleFollow(user.id, resolvedUserId, isFollowing);
        if (!error) {
            setIsFollowing(prev => !prev);
            setFollowCounts(prev => ({
                ...prev,
                followers: prev.followers + (isFollowing ? -1 : 1),
            }));
        }
        setFollowPending(false);
    };

    // ── Resolve which data set to display ─────────────────────────────────────

    const watched   = isOwnProfile ? ownWatched   : pubWatched;
    const watchlist = isOwnProfile ? ownWatchlist : pubWatchlist;
    const watching  = isOwnProfile ? ownWatching  : pubWatching;
    const favorites = isOwnProfile ? ownFavorites : pubFavorites;

    // ── Loading ───────────────────────────────────────────────────────────────

    // authLoading only blocks own profile — public profiles can render as soon as profileLoading resolves
    const isLoading = (isOwnProfile ? authLoading : false) || profileLoading || (isOwnProfile && trackingLoading);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#14181c] flex flex-col">
                <div className="pattern" />
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <CircularProgress sx={{ color: '#D87B53' }} />
                </div>
            </div>
        );
    }

    // Only block render for own profile — public profiles are visible to everyone
    if (isOwnProfile && !user) return null;

    // 404 — userId in URL but no profile found
    if (!isOwnProfile && !profile && !profileLoading) {
        return (
            <div className="min-h-screen bg-[#14181c] flex flex-col">
                <div className="pattern" />
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-[#EBDFD9] text-xl font-semibold">User not found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#89BAA2] hover:text-[#D87B53] text-sm transition-colors"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        );
    }

    // ── Tab content ───────────────────────────────────────────────────────────

    const tabContent = {
        0: (
            <div className="space-y-8">
                <FavoriteShows
                    favorites={favorites}
                    isOwnProfile={isOwnProfile}
                    onEditClick={() => setShowFavModal(true)}
                />
                <ActivityFeed watched={watched} watchlist={watchlist} limit={12} />
            </div>
        ),
        1: (
            <WatchedGrid
                shows={watched}
                isOwnProfile={isOwnProfile}
                onRemove={handleRemoveShow}
                onMarkWatched={handleMarkWatched}
                onSaveReview={submitReview}
            />
        ),
        2: (
            <WatchingGrid
                shows={watching}
                isOwnProfile={isOwnProfile}
                onRemove={handleRemoveShow}
                onUpdateProgress={updateProgress}
                onSaveReview={submitReview}
            />
        ),
        3: (
            <WatchlistGrid
                shows={watchlist}
                isOwnProfile={isOwnProfile}
                onRemove={handleRemoveShow}
                onMarkWatched={handleMarkWatched}
            />
        ),
        4: (
            <ReviewsList
                watchedShows={watched}
                watchingShows={watching}
                isOwnProfile={isOwnProfile}
                onSaveReview={submitReview}
            />
        ),
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#14181c]">
            <div className="pattern" />
            <Header />

            <ProfileHeader
                user={isOwnProfile
                    ? user
                    : { id: resolvedUserId, user_metadata: { display_name: profile?.display_name } }
                }
                profile={profile}
                watchedCount={watched.length}
                followCounts={followCounts}
                favorites={favorites}
                onProfileUpdated={handleProfileUpdated}
                isOwnProfile={isOwnProfile}
                isFollowing={isFollowing}
                followPending={followPending}
                onToggleFollow={handleToggleFollow}
            />

            <div className="wrapper">
                {/*
                 * Desktop (sm+): horizontal tab strip along the top.
                 * Mobile: Overview content always visible, then a vertical
                 * list of section links below it — no horizontal overflow.
                 */}

                {/* ── Desktop tab strip ── */}
                <div className="hidden sm:flex items-center gap-6 border-b border-[#2c3440] mb-6">
                    {TABS.map((tab, idx) => {
                        const countMap = {
                            1: watched.length,
                            2: watching.length,
                            3: watchlist.length,
                            4: [...watched, ...watching].filter(s => s.rating || s.review).length,
                        };
                        return (
                            <TabButton
                                key={tab}
                                label={tab}
                                active={activeTab === idx}
                                count={countMap[idx]}
                                onClick={() => setActiveTab(idx)}
                            />
                        );
                    })}
                </div>

                {/* ── Desktop tab content ── */}
                <div className="hidden sm:block">
                    {tabContent[activeTab]}
                </div>

                {/* ── Mobile layout ──
                     Overview section always rendered.
                     Remaining tabs shown as a vertical nav list beneath it;
                     tapping one expands its content inline below the button.
                ── */}
                <div className="sm:hidden">
                    {/* Overview always visible on mobile */}
                    {tabContent[0]}

                    {/* Vertical section list */}
                    <div className="mt-6 space-y-2">
                        {TABS.slice(1).map((tab, i) => {
                            const idx = i + 1;
                            const countMap = {
                                1: watched.length,
                                2: watching.length,
                                3: watchlist.length,
                                4: [...watched, ...watching].filter(s => s.rating || s.review).length,
                            };
                            const isOpen = activeTab === idx;
                            return (
                                <div key={tab} className="border border-[#2c3440] rounded-lg overflow-hidden">
                                    {/* Section header / toggle */}
                                    <button
                                        onClick={() => setActiveTab(isOpen ? 0 : idx)}
                                        className={`w-full flex items-center justify-between px-4 py-3
                                                    text-sm font-bold transition-colors
                                                    ${isOpen
                                            ? 'bg-[#2c3440] text-[#EBDFD9]'
                                            : 'bg-[#1f2429] text-[#89BAA2]'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {tab}
                                            {countMap[idx] != null && countMap[idx] > 0 && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full
                                                    ${isOpen
                                                    ? 'bg-[#D87B53]/20 text-[#D87B53]'
                                                    : 'bg-[#2c3440] text-[#89BAA2]'}`}>
                                                    {countMap[idx]}
                                                </span>
                                            )}
                                        </span>
                                        <span className={`transition-transform duration-200
                                                          ${isOpen ? 'rotate-180' : ''} text-[#89BAA2]`}>
                                            ▾
                                        </span>
                                    </button>

                                    {/* Section content — shown when open */}
                                    {isOpen && (
                                        <div className="px-4 pb-4 pt-2 bg-[#14181c]">
                                            {tabContent[idx]}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showFavModal && (
                <EditFavoritesModal
                    currentFavorites={favorites}
                    watchedShows={watched}
                    onSave={handleSaveFavorites}
                    onClose={() => setShowFavModal(false)}
                    saving={savingFavorites}
                />
            )}
        </div>
    );
};

export default Profile;
