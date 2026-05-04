/**
 * ProfileHeader.jsx
 * Hero section of the profile page.
 *
 */

import React, { useRef, useState } from 'react';
import { Link } from 'react-router';
import PersonIcon    from '@mui/icons-material/Person';
import EditIcon      from '@mui/icons-material/Edit';
import CheckIcon     from '@mui/icons-material/Check';
import CloseIcon     from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { CircularProgress, Tooltip } from '@mui/material';
import { upsertUserProfile, uploadAvatar } from '../../profileService';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

/**
 * StatPill — clickable when `to` is provided, plain div otherwise.
 */
const StatPill = ({ value, label, to }) => {
    const inner = (
        <>
            <span className="text-xl font-bold text-white leading-none">{value}</span>
            <span className="text-xs text-[#89BAA2] uppercase tracking-wider">{label}</span>
        </>
    );
    if (to) {
        return (
            <Link to={to} className="flex flex-col items-center gap-0.5 hover:opacity-75 transition-opacity">
                {inner}
            </Link>
        );
    }
    return <div className="flex flex-col items-center gap-0.5">{inner}</div>;
};


const ProfileHeader = ({
                           user,
                           profile,
                           watchedCount,
                           followCounts,
                           favorites,
                           onProfileUpdated,
                           isOwnProfile,
                           // Follow props (public profiles only)
                           isFollowing   = false,
                           followPending = false,
                           onToggleFollow,
                       }) => {
    const fileInputRef = useRef(null);

    const [editingBio,        setEditingBio]        = useState(false);
    const [bioText,           setBioText]           = useState(profile?.bio ?? '');
    const [editingName,       setEditingName]       = useState(false);
    const [nameText,          setNameText]          = useState('');
    const [savingBio,       setSavingBio]       = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Display name: prefer profile row (reflects edits); fall back to auth metadata
    const displayName = profile?.display_name
        ?? user?.user_metadata?.display_name
        ?? user?.email
        ?? 'User';

    const avatarUrl = profile?.avatar_url ?? null;
    const profileBaseUrl = profile?.username
        ? `/profile/${profile.username}`
        : profile?.id ? `/profile/${profile.id}` : null;

    // Build blurred backdrop from favourite posters
    const backdropPosters = favorites
        .slice(0, 4)
        .map(f => f.poster_path)
        .filter(Boolean);

    // ── Bio editing ───────────────────────────────────────────────────────────

    const handleSaveBio = async () => {
        setSavingBio(true);
        const { error } = await upsertUserProfile(user.id, { bio: bioText });
        if (!error) {
            onProfileUpdated({ bio: bioText });
            setEditingBio(false);
        }
        setSavingBio(false);
    };

    const handleCancelBio = () => {
        setBioText(profile?.bio ?? '');
        setEditingBio(false);
    };

    // ── Display name editing ──────────────────────────────────────────────────

    const handleSaveName = async () => {
        if (!nameText.trim()) return;
        setSavingBio(true);
        const { error } = await upsertUserProfile(user.id, { display_name: nameText.trim() });
        if (!error) {
            onProfileUpdated({ display_name: nameText.trim() });
            setEditingName(false);
        }
        setSavingBio(false);
    };

    const handleCancelName = () => {
        setNameText(displayName);
        setEditingName(false);
    };

    // ── Avatar upload ─────────────────────────────────────────────────────────

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        const { url, error } = await uploadAvatar(user.id, file);
        if (!error && url) {
            await upsertUserProfile(user.id, { avatar_url: url });
            onProfileUpdated({ avatar_url: url });
        }
        setUploadingAvatar(false);
    };

    return (
        <div className="relative">
            {/* ── Backdrop ──────────────────────────────────────────────────── */}
            <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                {backdropPosters.length > 0 ? (
                    <div className="absolute inset-0 flex">
                        {backdropPosters.map((p, i) => (
                            <div
                                key={i}
                                className="flex-1 overflow-hidden"
                                style={{ filter: 'blur(3px) brightness(0.35)', transform: 'scale(1.05)' }}
                            >
                                <img
                                    src={`${TMDB_IMAGE_BASE}${p}`}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        ))}
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    'linear-gradient(to bottom, rgba(20,24,28,0.3) 0%, rgba(20,24,28,0.85) 80%, #14181c 100%)',
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(135deg, #1a2030 0%, #14181c 40%, #1c1a14 100%)' }}
                    >
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle at 20% 50%, #D87B53 0%, transparent 50%), radial-gradient(circle at 80% 20%, #378370 0%, transparent 40%)',
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ── Avatar + info ─────────────────────────────────────────────── */}
            <div className="wrapper relative">
                <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start sm:items-end -mt-16 sm:-mt-20 mb-6">

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#14181c] bg-[#2c3440] shadow-xl">
                            {uploadingAvatar ? (
                                <div className="w-full h-full flex items-center justify-center bg-[#2c3440]">
                                    <CircularProgress size={28} sx={{ color: '#89BAA2' }} />
                                </div>
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <PersonIcon sx={{ fontSize: 52, color: '#89BAA2' }} />
                                </div>
                            )}
                        </div>

                        {/* Upload trigger — own profile only */}
                        {isOwnProfile && (
                            <>
                                <Tooltip title="Change avatar" placement="bottom">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#D87B53] flex items-center justify-center shadow-lg hover:bg-[#EF8D72] transition-colors"
                                    >
                                        <EditIcon sx={{ fontSize: 14, color: 'white' }} />
                                    </button>
                                </Tooltip>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </>
                        )}
                    </div>

                    {/* Name + stats + follow button */}
                    <div className="flex-1 min-w-0 pb-1">
                        {/* Name row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="group/name">
                                {isOwnProfile && editingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={nameText}
                                            onChange={(e) => setNameText(e.target.value)}
                                            maxLength={50}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveName();
                                                if (e.key === 'Escape') handleCancelName();
                                            }}
                                            className="bg-[#2c3440] text-[#EBDFD9] text-xl font-bold rounded-md
                                                       px-2 py-1 border border-[#DCB35A]/30 focus:outline-none
                                                       focus:border-[#DCB35A]/60 w-48 sm:w-64"
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            disabled={savingBio}
                                            className="p-1 rounded hover:bg-[#2c3440] text-[#378370] transition-colors"
                                        >
                                            {savingBio
                                                ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                                : <CheckIcon sx={{ fontSize: 16 }} />}
                                        </button>
                                        <button
                                            onClick={handleCancelName}
                                            className="p-1 rounded hover:bg-[#2c3440] text-[#89BAA2] transition-colors"
                                        >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h1
                                            className="text-2xl sm:text-3xl font-bold leading-tight"
                                            style={{
                                                background: 'white',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }}
                                        >
                                            {displayName}
                                        </h1>
                                        {isOwnProfile && (
                                            <button
                                                onClick={() => { setNameText(displayName); setEditingName(true); }}
                                                className="sm:opacity-0 sm:group-hover/name:opacity-100
                                                           transition-opacity p-1 rounded hover:bg-[#2c3440] flex-shrink-0"
                                                title="Edit display name"
                                            >
                                                <EditIcon sx={{ fontSize: 14, color: '#89BAA2' }} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {profile?.username && (
                                    <p className="text-[#89BAA2]/70 text-sm mt-0.5">
                                        @{profile.username}
                                    </p>
                                )}
                            </div>

                            {/* Follow / unfollow — public profiles only */}
                            {!isOwnProfile && (
                                <button
                                    onClick={onToggleFollow}
                                    disabled={followPending}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold
                                        transition-all duration-200 flex-shrink-0
                                        ${isFollowing
                                        ? 'bg-[#2c3440] text-[#EBDFD9] border border-[#378370]/50 hover:border-red-400/50 hover:text-red-400 group'
                                        : 'bg-[#D87B53] text-[#14181c] hover:bg-[#EF8D72] shadow-md shadow-[#D87B53]/20'}
                                    `}
                                >
                                    {followPending ? (
                                        <CircularProgress size={14} sx={{ color: 'inherit' }} />
                                    ) : isFollowing ? (
                                        <>
                                            {/* Show "Unfollow" text on hover via group */}
                                            <span className="group-hover:hidden">Following</span>
                                            <span className="hidden group-hover:inline">Unfollow</span>
                                        </>
                                    ) : (
                                        <>
                                            <PersonAddIcon sx={{ fontSize: 16 }} />
                                            Follow
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 mt-3">
                            <StatPill value={watchedCount}           label="Watched" />
                            <div className="w-px h-8 bg-[#2c3440]" />
                            <StatPill value={followCounts.following} label="Following" to={profileBaseUrl ? `${profileBaseUrl}/following` : undefined} />
                            <div className="w-px h-8 bg-[#2c3440]" />
                            <StatPill value={followCounts.followers} label="Followers" to={profileBaseUrl ? `${profileBaseUrl}/followers` : undefined} />
                        </div>
                    </div>
                </div>

                {/* ── Bio ───────────────────────────────────────────────────── */}
                <div className="mb-6">
                    {isOwnProfile && editingBio ? (
                        <div className="flex flex-col gap-2 max-w-xl">
                            <textarea
                                value={bioText}
                                onChange={(e) => setBioText(e.target.value)}
                                maxLength={200}
                                rows={3}
                                placeholder="Write a short bio…"
                                className="w-full bg-[#2c3440] text-[#EBDFD9] rounded-md px-3 py-2 text-sm resize-none border border-[#DCB35A]/30 focus:outline-none focus:border-[#DCB35A]/60 placeholder-[#89BAA2]/50"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveBio}
                                    disabled={savingBio}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#378370] text-white text-sm font-semibold hover:bg-[#89BAA2] transition-colors"
                                >
                                    {savingBio
                                        ? <CircularProgress size={12} sx={{ color: 'white' }} />
                                        : <CheckIcon sx={{ fontSize: 14 }} />}
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelBio}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2c3440] text-[#EBDFD9] text-sm hover:bg-[#3a4452] transition-colors"
                                >
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                    Cancel
                                </button>
                                <span className="text-xs text-[#89BAA2] ml-auto">{bioText.length}/200</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 group max-w-xl">
                            <p className="text-[#EBDFD9]/70 text-sm leading-relaxed flex-1">
                                {profile?.bio || (isOwnProfile ? 'Add a bio…' : '')}
                            </p>
                            {isOwnProfile && (
                                <button
                                    onClick={() => setEditingBio(true)}
                                    className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#2c3440]"
                                >
                                    <EditIcon sx={{ fontSize: 14, color: '#89BAA2' }} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
