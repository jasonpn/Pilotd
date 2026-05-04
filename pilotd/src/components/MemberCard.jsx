/**
 * MemberCard.jsx
 * Reusable member card: avatar, name, stats, follow button.
 *
 * Used by:
 *   - Members.jsx     (all members grid)
 *   - FollowList.jsx  (followers / following pages)
 *
 * Props:
 *   member      - { id, username, display_name, avatar_url,
 *                   watched_count, watching_count, review_count }
 *   isFollowing - bool
 *   isOwnCard   - bool hides the follow button on the logged-in user's own card
 *   onToggle    - async (memberId, currentlyFollowing) => void
 */

import React, { useState } from 'react';
import { Link } from 'react-router';
import { CircularProgress, Tooltip } from '@mui/material';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StarIcon          from '@mui/icons-material/Star';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon  from '@mui/icons-material/PersonRemove';
import PersonIcon        from '@mui/icons-material/Person';

const MemberCard = ({ member, isFollowing, isOwnCard, onToggle }) => {
    const [pending, setPending] = useState(false);

    const handleToggle = async () => {
        setPending(true);
        await onToggle(member.id, isFollowing);
        setPending(false);
    };

    const profileUrl = `/profile/${member.username ?? member.id}`;

    return (
        <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-[#1f2429]
                        border border-[#2c3440] hover:border-[#D87B53]/20 transition-colors">

            {/* Avatar */}
            <Link to={profileUrl}>
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

            {/* Display name */}
            <Link
                to={profileUrl}
                className="font-semibold text-sm text-[#EBDFD9] hover:text-[#D87B53]
                           transition-colors text-center truncate max-w-full"
            >
                {member.display_name ?? 'Member'}
            </Link>

            {/* Stats + follow button */}
            <div className="flex items-center gap-3">
                <Tooltip title="Shows watched" placement="top">
                    <div className="flex items-center gap-1 text-[#89BAA2]">
                        <VisibilityIcon sx={{ fontSize: 14 }} />
                        <span className="text-xs font-medium">{member.watched_count ?? 0}</span>
                    </div>
                </Tooltip>

                <Tooltip title="Currently watching" placement="top">
                    <div className="flex items-center gap-1 text-[#89BAA2]">
                        <PlayCircleOutlineIcon sx={{ fontSize: 14 }} />
                        <span className="text-xs font-medium">{member.watching_count ?? 0}</span>
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

export default MemberCard;
