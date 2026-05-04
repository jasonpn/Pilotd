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
import { CircularProgress } from '@mui/material';

import Header     from './Header';
import MemberCard from './MemberCard';
import { useAuth } from '../AuthContext';
import {
    getMembers,
    getFollowingIds,
    toggleFollow,
} from '../profileService';

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
                                       placeholder-[#89BAA2]/50
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
