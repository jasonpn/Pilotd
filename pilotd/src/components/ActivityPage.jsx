/**
 * ActivityPage.jsx
 * Protected page showing a merged notification feed for the logged-in user.
 *
 * Activity types:
 *   show_tracked     — someone you follow logged/rated a show
 *   review_liked     — someone liked your review
 *   review_commented — someone commented on your review
 *   new_follower     — someone started following you
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate }   from 'react-router';
import { CircularProgress }    from '@mui/material';
import PersonIcon              from '@mui/icons-material/Person';

import Header     from './Header';
import StarRating from './profile/StarRating';
import { useAuth } from '../AuthContext';
import { getFollowingIds, getActivityFeed } from '../profileService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

const formatTime = (isoString) => {
    if (!isoString) return '';
    const d    = new Date(isoString);
    const now  = new Date();
    const diff = Math.floor((now - d) / 1000); // seconds

    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── ActorLink — reusable clickable avatar + name ───────────────────────────────

const ActorLink = ({ actor }) => {
    if (!actor) return <span className="font-semibold text-[#EBDFD9]">A member</span>;
    const url = `/profile/${actor.username ?? actor.id}`;
    return (
        <Link to={url} className="inline-flex items-baseline gap-1.5 group/actor">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2c3440] flex-shrink-0
                            border border-[#DCB35A]/10 flex items-center justify-center">
                {actor.avatar_url ? (
                    <img src={actor.avatar_url} alt={actor.display_name} className="w-full h-full object-cover" />
                ) : (
                    <PersonIcon sx={{ fontSize: 12, color: '#89BAA2' }} />
                )}
            </div>
            <span className="font-semibold text-[#EBDFD9] group-hover/actor:text-[#D87B53] transition-colors">
                {actor.display_name ?? actor.username ?? 'A member'}
            </span>
        </Link>
    );
};

// ── ActivityItem — renders one notification row ────────────────────────────────

const STATUS_VERB = {
    watched:   'watched',
    watching:  'started watching',
    watchlist: 'added to watchlist',
};

const ActivityItem = ({ item }) => {
    const showLink = item.showId ? `/show/${item.showId}` : null;

    return (
        <div className="flex items-start gap-3 py-4 border-b border-[#2c3440]/60 last:border-0">


            {/* Poster thumbnail for show-related items */}
            {item.posterPath && showLink && (
                <Link to={showLink} className="flex-shrink-0">
                    <div className="w-8 h-12 rounded overflow-hidden bg-[#2c3440] shadow
                                    hover:ring-1 ring-[#D87B53] transition-all">
                        <img
                            src={`${TMDB_IMAGE_BASE}${item.posterPath}`}
                            alt={item.showName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </Link>
            )}

            {/* Text content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-[#EBDFD9]/80 leading-snug">
                    {item.type === 'show_tracked' && (
                        <>
                            <ActorLink actor={item.actor} />
                            {' '}{STATUS_VERB[item.status] ?? 'logged'}{' '}
                            {showLink
                                ? <Link to={showLink} className="font-semibold text-[#EBDFD9] hover:text-[#D87B53] transition-colors">{item.showName}</Link>
                                : <span className="font-semibold text-[#EBDFD9]">{item.showName}</span>}
                            {item.rating && (
                                <span className="ml-2 inline-flex items-center align-middle">
                                    <StarRating value={item.rating} size="sm" />
                                </span>
                            )}
                            {item.hasReview && (
                                <span className="ml-1.5 text-[#89BAA2] text-xs">+ review</span>
                            )}
                        </>
                    )}

                    {item.type === 'review_liked' && (
                        <>
                            <ActorLink actor={item.actor} />
                            {' '}liked your review
                            {showLink && (
                                <>{' '}of <Link to={showLink} className="font-semibold text-[#EBDFD9] hover:text-[#D87B53] transition-colors">{item.showName}</Link></>
                            )}
                        </>
                    )}

                    {item.type === 'review_commented' && (
                        <>
                            <ActorLink actor={item.actor} />
                            {' '}commented on your review
                            {showLink && (
                                <>{' '}of <Link to={showLink} className="font-semibold text-[#EBDFD9] hover:text-[#D87B53] transition-colors">{item.showName}</Link></>
                            )}
                        </>
                    )}

                    {item.type === 'new_follower' && (
                        <>
                            <ActorLink actor={item.actor} />
                            {' '}started following you
                        </>
                    )}
                </p>

                {/* Comment text preview */}
                {item.type === 'review_commented' && item.comment && (
                    <p className="text-xs text-[#89BAA2] mt-1 line-clamp-2">
                        {item.comment}
                    </p>
                )}

                <p className="text-xs text-[#89BAA2]/50 mt-1">{formatTime(item.timestamp)}</p>
            </div>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────

function ActivityPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) navigate('/login', { replace: true });
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            const { data: ids }  = await getFollowingIds(user.id);
            const { data: feed } = await getActivityFeed(user.id, ids);
            setItems(feed);
            setLoading(false);
        };
        load();
    }, [user]);

    if (authLoading || (!user && !authLoading)) return null;

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />
                <div className="wrapper pt-8 pb-16 max-w-2xl">
                    <h1 className="text-2xl font-bold text-[#EBDFD9] mb-6">Activity</h1>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <CircularProgress sx={{ color: '#D87B53' }} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-[#89BAA2] text-sm">No activity yet.</p>
                            <p className="text-[#89BAA2]/60 text-xs mt-1">
                                Follow members to see their activity here.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[#1a1f28] rounded-xl border border-[#2c3440] px-4">
                            {items.map((item, idx) => (
                                <ActivityItem
                                    key={`${item.type}-${item.actorId}-${item.timestamp}-${idx}`}
                                    item={item}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

export default ActivityPage;
