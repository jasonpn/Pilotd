/**
 * Settings.jsx
 * Full profile-editing page at /settings.
 * Protected — redirects to /login if the user is not authenticated.
 *
 * Editable fields:
 *   display_name · pronouns · location · website · bio · avatar
 *
 * Read-only fields (shown for reference):
 *   username · email
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED SUPABASE MIGRATION
 * Run once in your Supabase SQL editor to add the three new columns:
 *
 *   ALTER TABLE user_profiles
 *     ADD COLUMN IF NOT EXISTS pronouns TEXT,
 *     ADD COLUMN IF NOT EXISTS location TEXT,
 *     ADD COLUMN IF NOT EXISTS website  TEXT;
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate }  from 'react-router';
import { CircularProgress }   from '@mui/material';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import PersonIcon             from '@mui/icons-material/Person';
import CameraAltOutlinedIcon  from '@mui/icons-material/CameraAltOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline';

import Header from './Header';
import { useAuth } from '../AuthContext';
import { getUserProfile, upsertUserProfile, uploadAvatar } from '../profileService';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRONOUN_OPTIONS = [
    { value: '',          label: 'Prefer not to say' },
    { value: 'he/him',    label: 'He/Him'            },
    { value: 'she/her',   label: 'She/Her'           },
    { value: 'they/them', label: 'They/Them'         },
    { value: 'he/they',   label: 'He/They'           },
    { value: 'she/they',  label: 'She/They'          },
    { value: 'it/its',    label: 'It/Its'            },
    { value: 'any/all',   label: 'Any/All'           },
    { value: 'xe/xem',    label: 'Xe/Xem'            },
];

/** Maximum avatar file size enforced client-side before the upload is attempted. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * MIME types accepted for avatar uploads.
 * Using a Set for O(1) lookup. This is a client-side convenience check;
 * Supabase Storage should also be configured to reject non-image MIME types.
 */
const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

/**
 * Ensures website values are proper URLs when stored.
 * Social handles (@username) are stored unchanged — no protocol is prepended.
 * Bare domains (example.com) receive https:// automatically.
 */
const normalizeWebsite = (raw) => {
    if (!raw?.trim()) return '';
    const s = raw.trim();
    if (s.startsWith('@')) return s;               // social handle — keep as-is
    if (/^https?:\/\//i.test(s)) return s;         // already has protocol
    return `https://${s}`;                          // bare domain
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * Section card wrapper — consistent card style across all settings sections.
 */
const Section = ({ title, description, children }) => (
    <div className="bg-[#1f2429] border border-[#2c3440] rounded-xl overflow-hidden">
        {(title || description) && (
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-[#2c3440]/60">
                {title && (
                    <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-wider">
                        {title}
                    </h2>
                )}
                {description && (
                    <p className="text-xs text-[#89BAA2]/60 mt-1">{description}</p>
                )}
            </div>
        )}
        <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-5">
            {children}
        </div>
    </div>
);

/**
 * Labelled text / select field wrapper — keeps label, input, and helper text
 * consistently spaced without repeating className strings across every field.
 */
const Field = ({ label, required, hint, children, charCount, maxChars }) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#89BAA2] uppercase tracking-wider">
                {label}
                {required && <span className="text-[#EF8D72] ml-1">*</span>}
            </label>
            {maxChars != null && (
                <span className="text-[10px] text-[#89BAA2]/40">
                    {charCount ?? 0}/{maxChars}
                </span>
            )}
        </div>
        {children}
        {hint && (
            <p className="text-[10px] text-[#89BAA2]/40 mt-1.5">{hint}</p>
        )}
    </div>
);

/** Shared className for editable text inputs. */
const inputCls = `
    w-full bg-[#14181c] text-[#EBDFD9] rounded-xl px-4 py-3
    border border-[#2c3440] text-sm
    focus:outline-none focus:border-[#DCB35A]/50
    placeholder-[#89BAA2]/25 transition-colors
`.trim();

/** Shared className for the read-only display fields. */
const readonlyCls = `
    w-full bg-[#14181c]/60 text-[#89BAA2] rounded-xl px-4 py-3
    border border-[#2c3440]/50 text-sm cursor-not-allowed select-none
`.trim();

// ── Main component ─────────────────────────────────────────────────────────────

function Settings() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Profile data
    const [profile,        setProfile]        = useState(null);
    const [pageLoading,    setPageLoading]    = useState(true);

    // Form fields — mirrors user_profiles columns
    const [displayName, setDisplayName] = useState('');
    const [pronouns,    setPronouns]    = useState('');
    const [location,    setLocation]    = useState('');
    const [website,     setWebsite]     = useState('');
    const [bio,         setBio]         = useState('');

    // Avatar state
    const [avatarUrl,       setAvatarUrl]       = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarErr,       setAvatarErr]       = useState('');

    // Submit state
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);
    const [saveErr, setSaveErr] = useState('');

    // ── Auth guard ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!authLoading && !user) navigate('/login', { replace: true });
    }, [user, authLoading, navigate]);

    // ── Load profile ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.id).then(({ data }) => {
            if (data) {
                setProfile(data);
                setDisplayName(data.display_name ?? user.user_metadata?.display_name ?? '');
                setPronouns(data.pronouns  ?? '');
                setLocation(data.location  ?? '');
                setWebsite(data.website    ?? '');
                setBio(data.bio            ?? '');
                setAvatarUrl(data.avatar_url ?? null);
            }
            setPageLoading(false);
        });
    }, [user]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    /** Avatar upload — independent of the main Save flow so it applies immediately. */
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate MIME type before touching the network.
        // Note: file.type is supplied by the browser and can be spoofed, so this
        // is a convenience check, not a security guarantee. Supabase Storage's
        // allowed MIME type policy is the authoritative enforcement layer.
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setAvatarErr('Please upload a JPG, PNG, GIF, or WebP image.');
            return;
        }

        // Enforce size limit before the upload is attempted to avoid a wasted
        // request and a confusing error from the storage layer.
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarErr('Photo must be 5 MB or smaller.');
            return;
        }

        setAvatarErr('');
        setUploadingAvatar(true);
        const { url, error } = await uploadAvatar(user.id, file);
        if (!error && url) {
            await upsertUserProfile(user.id, { avatar_url: url });
            setAvatarUrl(url);
        } else if (error) {
            setAvatarErr('Upload failed — please try again.');
        }
        setUploadingAvatar(false);
    };

    /**
     * Triggers the hidden file input.
     * Clears any previous avatar error so the user starts fresh on each attempt.
     * Used by both the camera-overlay button and the "Change photo" text button.
     */
    const openFilePicker = () => {
        setAvatarErr('');
        fileInputRef.current?.click();
    };

    /** Save all text fields in one upsert. */
    const handleSave = useCallback(async () => {
        if (!displayName.trim()) {
            setSaveErr('Display name cannot be empty.');
            return;
        }

        setSaving(true);
        setSaveErr('');
        setSaved(false);

        const { error } = await upsertUserProfile(user.id, {
            display_name: displayName.trim(),
            pronouns:     pronouns || null,
            location:     location.trim()              || null,
            website:      normalizeWebsite(website)    || null,
            bio:          bio.trim()                   || null,
        });

        setSaving(false);

        if (error) {
            setSaveErr('Could not save changes — please try again.');
        } else {
            setSaved(true);
            // Auto-dismiss the success banner after 4 s
            setTimeout(() => setSaved(false), 4000);
        }
    }, [user, displayName, pronouns, location, website, bio]);

    /** Allow Cmd/Ctrl+S to submit from any field. */
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleSave]);

    // ── Render ─────────────────────────────────────────────────────────────────

    if (authLoading || pageLoading) {
        return (
            <div className="min-h-screen bg-[#14181c] flex items-center justify-center">
                <div className="pattern" />
                <CircularProgress sx={{ color: '#D87B53' }} />
            </div>
        );
    }

    if (!user) return null;

    const profileUrl = `/profile/${profile?.username ?? user.id}`;

    return (
        <>
            <Header />
            <main>
                <div className="pattern" />
                <div className="wrapper pt-8 pb-20 max-w-2xl mx-auto">

                    {/* ── Breadcrumb ───────────────────────────────────────── */}
                    <Link
                        to={profileUrl}
                        className="inline-flex items-center gap-1.5 text-sm text-[#89BAA2]
                                   hover:text-[#EBDFD9] transition-colors mb-5 sm:mb-7"
                    >
                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                        Back to profile
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-bold text-[#EBDFD9] mb-5 sm:mb-7">
                        Edit Profile
                    </h1>

                    <div className="space-y-5">

                        {/* ── Avatar ───────────────────────────────────────── */}
                        <Section>
                            <div className="flex items-center gap-5">
                                {/* Avatar preview */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-20 h-20 rounded-full overflow-hidden
                                                    bg-[#2c3440] border-2 border-[#DCB35A]/10">
                                        {uploadingAvatar ? (
                                            <div className="w-full h-full flex items-center
                                                            justify-center bg-[#2c3440]">
                                                <CircularProgress size={22} sx={{ color: '#89BAA2' }} />
                                            </div>
                                        ) : avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt="Your avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PersonIcon sx={{ fontSize: 34, color: '#89BAA2' }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Camera overlay button */}
                                    <button
                                        onClick={openFilePicker}
                                        disabled={uploadingAvatar}
                                        aria-label="Change avatar"
                                        className="absolute inset-0 rounded-full flex items-center
                                                   justify-center bg-black/0 hover:bg-black/50
                                                   transition-colors group disabled:pointer-events-none"
                                    >
                                        <CameraAltOutlinedIcon
                                            sx={{ fontSize: 22, color: 'white' }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                    </button>
                                </div>

                                {/* Upload copy */}
                                <div className="min-w-0">
                                    <p className="text-[#EBDFD9] font-semibold text-sm mb-1">
                                        Profile photo
                                    </p>
                                    <p className="text-[#89BAA2]/50 text-xs mb-3">
                                        JPG, PNG, GIF · max 5 MB
                                    </p>
                                    <button
                                        onClick={openFilePicker}
                                        disabled={uploadingAvatar}
                                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold
                                                   text-[#EBDFD9] bg-[#2c3440]
                                                   border border-[#DCB35A]/15
                                                   hover:border-[#DCB35A]/40 hover:bg-[#3a4452]
                                                   transition-all disabled:opacity-50"
                                    >
                                        Change photo
                                    </button>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                    aria-label="Upload avatar"
                                />
                            </div>

                            {/* Avatar-specific error — shown inline so it is clearly
                                associated with the photo upload, not the Save button */}
                            {avatarErr && (
                                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg
                                                bg-red-500/10 border border-red-500/25
                                                text-red-400 text-xs">
                                    <ErrorOutlineIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                                    {avatarErr}
                                </div>
                            )}
                        </Section>

                        {/* ── Personal info ────────────────────────────────── */}
                        <Section
                            title="Personal Info"
                            description="How you appear to other members across the site."
                        >
                            {/* Display name + pronouns */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field
                                    label="Display Name"
                                    required
                                    charCount={displayName.length}
                                    maxChars={50}
                                >
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        maxLength={50}
                                        placeholder="Your name"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="Pronouns">
                                    <div className="relative">
                                        <select
                                            value={pronouns}
                                            onChange={(e) => setPronouns(e.target.value)}
                                            className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                                        >
                                            {PRONOUN_OPTIONS.map((opt) => (
                                                <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                    style={{ background: '#14181c' }}
                                                >
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Custom chevron so the select matches the app's style */}
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2
                                                         pointer-events-none text-[#89BAA2] text-xs">
                                            ▾
                                        </span>
                                    </div>
                                </Field>
                            </div>

                            {/* Username — read-only reference */}
                            <Field
                                label="Username"
                                hint="Usernames cannot be changed."
                            >
                                <div className={`${readonlyCls} flex items-center gap-1.5`}>
                                    <span className="text-[#89BAA2]/40">@</span>
                                    <span>{profile?.username ?? ''}</span>
                                </div>
                            </Field>

                            {/* Email — read-only reference */}
                            <Field
                                label="Email"
                                hint="To change your email address, contact support."
                            >
                                <div className={readonlyCls}>
                                    {user.email}
                                </div>
                            </Field>
                        </Section>

                        {/* ── Presence ─────────────────────────────────────── */}
                        <Section
                            title="Presence"
                            description="Optional details shown on your public profile."
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field
                                    label="Location"
                                    hint="e.g. Toronto, Canada"
                                    charCount={location.length}
                                    maxChars={60}
                                >
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        maxLength={60}
                                        placeholder="City, Country"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field
                                    label="Website / Social"
                                    hint="A URL or @handle — https:// added automatically."
                                    charCount={website.length}
                                    maxChars={100}
                                >
                                    <input
                                        type="text"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        maxLength={100}
                                        placeholder="yoursite.com or @handle"
                                        className={inputCls}
                                        inputMode="url"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </Field>
                            </div>
                        </Section>

                        {/* ── About ────────────────────────────────────────── */}
                        <Section
                            title="About"
                            //description="Tell everyone about you"
                        >
                            <Field
                                label="Bio"
                                charCount={bio.length}
                                maxChars={200}
                            >
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={200}
                                    rows={4}
                                    placeholder="What are you into? What genres do you love or hate? Any hot takes?"
                                    className={`${inputCls} resize-none`}
                                />
                            </Field>
                        </Section>

                        {/* ── Feedback banners ─────────────────────────────── */}
                        {saveErr && (
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl
                                            bg-red-500/10 border border-red-500/25
                                            text-red-400 text-sm">
                                <ErrorOutlineIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                                {saveErr}
                            </div>
                        )}

                        {saved && (
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl
                                            bg-[#378370]/15 border border-[#378370]/30
                                            text-[#89BAA2] text-sm">
                                <CheckCircleOutlineIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                                Profile updated successfully.
                            </div>
                        )}

                        {/* ── Actions ──────────────────────────────────────── */}
                        {/*
                          * Mobile:  both buttons fill the row equally (flex-1),
                          *          taller tap target (py-3 = 44 px total, iOS minimum).
                          * Desktop: buttons are auto-width and right-aligned;
                          *          keyboard tip appears on the left.
                          */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                            <p className="hidden sm:block text-[10px] text-[#89BAA2]/30">
                                Tip: press Ctrl+S / ⌘S to save
                            </p>

                            <div className="flex gap-3">
                                <Link
                                    to={profileUrl}
                                    className="flex-1 sm:flex-none text-center
                                               px-5 py-3 sm:py-2.5 rounded-xl
                                               text-sm font-semibold text-[#EBDFD9]
                                               bg-[#2c3440] hover:bg-[#3a4452]
                                               transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !displayName.trim()}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2
                                               px-6 py-3 sm:py-2.5 rounded-xl
                                               text-sm font-semibold text-[#14181c]
                                               transition-all active:scale-95
                                               disabled:opacity-60 disabled:pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                                    }}
                                >
                                    {saving && (
                                        <CircularProgress size={14} sx={{ color: '#14181c' }} />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </>
    );
}

export default Settings;
