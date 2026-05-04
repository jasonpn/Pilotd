/**
 * FollowList.jsx
 * Displays the followers or following list for any member.
 *
 * Routes:
 *   /profile/:username/followers
 *   /profile/:username/following
 *
 * `mode` prop (injected by the Route) controls which list is fetched.
 * Resolves username → userId using the same pattern as Profile.jsx.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Header     from './Header';
import MemberCard from './MemberCard';
import { useAuth } from '../AuthContext';
import {
    getUserProfileByUsername,
    getUserProfile,
    isUUID,
    getFollowersList,
    getFollowingList,
    getFollowingIds,
    toggleFollow,
} from '../profileService';


const useFollowToggle = (user, initialIds = []) => {
    const [followingIds, setFollowingIds] = useState(new Set(initialIds));

    const handleToggle = async (targetId, currentlyFollowing) => {
        if (!user) return;
        setFollowingIds(prev => {
            const next = new Set(prev);
            currentlyFollowing ? next.delete(targetId) : next.add(targetId);
            return next;
        });
        const { error } = await toggleFollow(user.id, targetId, currentlyFollowing);
        if (error) {
            setFollowingIds(prev => {
                const next = new Set(prev);
                currentlyFollowing ? next.add(targetId) : next.delete(targetId);
                return next;
            });
        }
    };

    return { followingIds, setFollowingIds, handleToggle };
};

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * @param {'followers'|'following'} mode - injected by App.jsx route definition
 */
function FollowList({ mode }) {
    const { username } = useParams();
    const { user }     = useAuth();

    const [ownerProfile, setOwnerProfile] = useState(null);
    const [members,      setMembers]      = useState([]);
    const [loading,      setLoading]      = useState(true);

    const { followingIds, setFollowingIds, handleToggle } = useFollowToggle(user);

    const isFollowers = mode === 'followers';
    const title       = isFollowers ? 'Followers' : 'Following';

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            // Resolve username → userId (same pattern as Profile.jsx)
            let targetId = username;
            let profile  = null;

            if (isUUID(username)) {
                const res = await getUserProfile(username);
                profile   = res.data;
                targetId  = username;
            } else {
                const res = await getUserProfileByUsername(username);
                profile   = res.data;
                targetId  = res.data?.id;
            }

            setOwnerProfile(profile);
            if (!targetId) { setLoading(false); return; }

            // Fetch the relevant list + current user's following ids in parallel
            const requests = [
                isFollowers ? getFollowersList(targetId) : getFollowingList(targetId),
            ];
            if (user) requests.push(getFollowingIds(user.id));

            const [listRes, followingRes] = await Promise.all(requests);

            setMembers(listRes.data);
            if (followingRes) setFollowingIds(new Set(followingRes.data));

            setLoading(false);
        };

        load();
    }, [username, mode, user]);

    const ownerName    = ownerProfile?.display_name ?? username;
    const ownerProfile_ = `/profile/${ownerProfile?.username ?? ownerProfile?.id ?? username}`;

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />
                <div className="wrapper pt-8 pb-16">

                    {/* Back link + heading */}
                    <div className="mb-6">
                        <Link
                            to={ownerProfile_}
                            className="flex items-center gap-1.5 text-sm text-[#89BAA2]
                                       hover:text-[#EBDFD9] transition-colors mb-3"
                        >
                            <ArrowBackIcon sx={{ fontSize: 16 }} />
                            Back to {ownerName}'s profile
                        </Link>

                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold text-[#EBDFD9]">
                                {ownerName}'s {title}
                            </h1>
                            {!loading && (
                                <span className="text-sm text-[#89BAA2]">
                                    {members.length} {members.length === 1 ? 'member' : 'members'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <CircularProgress sx={{ color: '#D87B53' }} />
                        </div>
                    ) : members.length === 0 ? (
                        <p className="text-[#89BAA2] text-sm text-center py-16">
                            {isFollowers
                                ? `${ownerName} has no followers yet.`
                                : `${ownerName} isn't following anyone yet.`}
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {members.map(member => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    isFollowing={followingIds.has(member.id)}
                                    isOwnCard={user?.id === member.id}
                                    onToggle={handleToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

export default FollowList;
