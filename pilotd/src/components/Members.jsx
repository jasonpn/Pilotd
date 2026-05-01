/**
 * Members.jsx
 * Displays all signed-up members with their watched count, review count,
 * and a follow/unfollow toggle button.
 *
 * Data strategy:
 *   - Members + stats come from the `member_stats` Supabase view (see README-members.md)
 *   - All follow IDs for the current user are fetched once on mount
 *   - Follow state is managed locally with optimistic updates — no per-member DB calls
 *
 * Requires: README-members.md SQL (member_stats view) to be run in Supabase first.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CircularProgress, Tooltip } from '@mui/material';
import VisibilityIcon  from '@mui/icons-material/Visibility';
import StarIcon        from '@mui/icons-material/Star';
import PersonAddIcon   from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonIcon      from '@mui/icons-material/Person';

import Header from './Header';
import { useAuth } from '../AuthContext';
import {
    getMembers,
    getFollowingIds,
    toggleFollow,
} from '../profileService';

// ── MemberCard ────────────────────────────────────────────────────────────────

/**
 * Single member row card.
 *
 * Props:
 *   member      - { id, display_name, avatar_url, watched_count, review_count }
 *   isFollowing - bool derived from local followingIds state in parent
 *   isOwnCard   - bool, hides the follow button on the current user's own card
 *   onToggle    - () => void, called after a successful follow/unfollow
 */
const MemberCard = ({ member, isFollowing, isOwnCard, onToggle }) => {
    const [pending, setPending] = useState(false);

    const handleToggle = async () => {
        setPending(true);
        await onToggle(member.id, isFollowing);
        setPending(false);
    };

    return (
        <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-[#1f2429]
                        border border-[#2c3440] hover:border-[#D87B53]/20 transition-colors">

            {/* Avatar */}
            <Link to={`/profile/${member.username ?? member.id}`}>
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#2c3440]
                                border-2 border-[#DCB35A]/10 flex items-center justify-center
                                hover:ring-2 ring-[#D87B53]/40 transition-all">
                    {member.avatar_url ? (
                        <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <PersonIcon sx={{ fontSize: 36, color: '#89BAA2' }} />
                    )}
                </div>
            </Link>

            {/* Name */}
            <Link
                to={`/profile/${member.username ?? member.id}`}
                className="font-semibold text-sm text-[#EBDFD9] hover:text-[#D87B53]
                           transition-colors text-center truncate max-w-full"
            >
                {member.display_name ?? 'Member'}
            </Link>

            {/* Stats + follow button in one row */}
            <div className="flex items-center gap-3">
                <Tooltip title="Shows watched" placement="top">
                    <div className="flex items-center gap-1 text-[#89BAA2]">
                        <VisibilityIcon sx={{ fontSize: 14 }} />
                        <span className="text-xs font-medium">{member.watched_count ?? 0}</span>
                    </div>
                </Tooltip>

                <Tooltip title="Reviews written" placement="top">
                    <div className="flex items-center gap-1 text-[#89BAA2]">
                        <StarIcon sx={{ fontSize: 14, color: '#DCB35A' }} />
                        <span className="text-xs font-medium">{member.review_count ?? 0}</span>
                    </div>
                </Tooltip>

                {/* Follow / unfollow — hidden on own card */}
                {!isOwnCard && (
                    <Tooltip title={isFollowing ? 'Unfollow' : 'Follow'} placement="top">
                        <button
                            onClick={handleToggle}
                            disabled={pending}
                            className={`
                                w-6 h-6 rounded-full flex items-center justify-center
                                transition-all duration-150
                                ${isFollowing
                                ? 'bg-[#378370]/20 text-[#89BAA2] hover:bg-red-500/15 hover:text-red-400'
                                : 'bg-[#D87B53]/15 text-[#D87B53] hover:bg-[#D87B53]/30'}
                            `}
                        >
                            {pending ? (
                                <CircularProgress size={10} sx={{ color: 'inherit' }} />
                            ) : isFollowing ? (
                                <PersonRemoveIcon sx={{ fontSize: 13 }} />
                            ) : (
                                <PersonAddIcon sx={{ fontSize: 13 }} />
                            )}
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────

function Members() {
    const { user } = useAuth();

    const [members,      setMembers]      = useState([]);
    const [followingIds, setFollowingIds] = useState(new Set());
    const [loading,      setLoading]      = useState(true);
    const [searchVal,    setSearchVal]    = useState('');

    // Load members + current user's following list in parallel
    useEffect(() => {
        const load = async () => {
            setLoading(true);

            const requests = [getMembers()];
            if (user) requests.push(getFollowingIds(user.id));

            const [membersRes, followingRes] = await Promise.all(requests);

            setMembers(membersRes.data);
            if (followingRes) {
                setFollowingIds(new Set(followingRes.data));
            }

            setLoading(false);
        };

        load();
    }, [user]);

    // Optimistic follow toggle — update local set before DB confirms
    const handleToggleFollow = async (targetId, currentlyFollowing) => {
        if (!user) return;

        // Optimistic update
        setFollowingIds((prev) => {
            const next = new Set(prev);
            currentlyFollowing ? next.delete(targetId) : next.add(targetId);
            return next;
        });

        const { error } = await toggleFollow(user.id, targetId, currentlyFollowing);

        // Roll back on error
        if (error) {
            setFollowingIds((prev) => {
                const next = new Set(prev);
                currentlyFollowing ? next.add(targetId) : next.delete(targetId);
                return next;
            });
        }
    };

    // Filter by search — client-side since the full list is already loaded
    const filtered = members.filter((m) => {
        if (!searchVal.trim()) return true;
        return (m.display_name ?? '').toLowerCase().includes(searchVal.toLowerCase());
    });

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />
                <div className="wrapper pt-8 pb-16">

                    {/* Heading + member count */}
                    <div className="flex items-baseline gap-3 mb-6">
                        <h1 className="text-2xl font-bold text-[#EBDFD9]">Members</h1>
                        {!loading && (
                            <span className="text-sm text-[#89BAA2]">
                                {members.length} {members.length === 1 ? 'member' : 'members'}
                            </span>
                        )}
                    </div>

                    {/* Search / filter input */}
                    <div className="mb-6 max-w-sm">
                        <input
                            type="text"
                            placeholder="Search members…"
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="w-full bg-[#2c3440] text-[#EBDFD9] text-sm rounded-md px-3 py-2
                                       border border-[#DCB35A]/15 placeholder-[#89BAA2]/50
                                       focus:outline-none focus:border-[#D87B53]/50 transition-colors"
                        />
                    </div>

                    {/* Member list */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <CircularProgress sx={{ color: '#D87B53' }} />
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filtered.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    isFollowing={followingIds.has(member.id)}
                                    isOwnCard={user?.id === member.id}
                                    onToggle={handleToggleFollow}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#89BAA2] text-sm text-center py-16">
                            {searchVal ? `No members found matching "${searchVal}".` : 'No members yet.'}
                        </p>
                    )}
                </div>
            </main>
        </>
    );
}

export default Members;
