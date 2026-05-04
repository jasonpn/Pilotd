/**
 * profileService.js
 * All Supabase database operations for user profiles, show tracking, and social features.
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────

/**
 * Fetch a user's public profile data.
 * Returns null if the profile row hasn't been created yet.
 * @param {string} userId
 */
export const getUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = row not found, which is fine for new users
        console.error('getUserProfile error:', error);
        return { data: null, error };
    }

    return { data: data ?? null, error: null };
};

/**
 * Create or update a user's profile row.
 * Uses upsert so new users get a row automatically.
 * @param {string} userId
 * @param {{ bio?: string, avatar_url?: string }} updates
 */
export const upsertUserProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) console.error('upsertUserProfile error:', error);
    return { data, error };
};

/**
 * Upload a profile avatar image and return the public URL.
 *
 * Path structure: <userId>/avatar.<ext>
 * The userId is the top-level folder, which is what the storage RLS policy
 * checks against — `(storage.foldername(name))[1] = auth.uid()::text`.
 *
 * @param {string} userId
 * @param {File} file
 */
export const uploadAvatar = async (userId, file) => {
    const ext  = file.name.split('.').pop();
    // userId is the folder so the RLS policy `foldername[1] = auth.uid()` matches
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(path, file, { upsert: true });

    if (uploadError) {
        console.error('uploadAvatar error:', uploadError);
        return { url: null, error: uploadError };
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
};

// ─────────────────────────────────────────────
// SHOW TRACKING (Watched + Watchlist)
// ─────────────────────────────────────────────

/**
 * Get all shows tracked by a user (both watched and watchlist).
 * @param {string} userId
 */
export const getUserShows = async (userId) => {
    const { data, error } = await supabase
        .from('user_shows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) console.error('getUserShows error:', error);
    return { data: data ?? [], error };
};

/**
 * Check the tracking status of a single show for the current user.
 * Returns null if not tracked.
 * @param {string} userId
 * @param {number} showId
 */
export const getShowStatus = async (userId, showId) => {
    const { data, error } = await supabase
        .from('user_shows')
        .select('*')
        .eq('user_id', userId)
        .eq('show_id', showId)
        .maybeSingle();

    if (error) console.error('getShowStatus error:', error);
    return { data, error };
};

/**
 * Add or update a show's tracking status.
 * If the show already exists, it updates the status (e.g. watchlist → watched).
 * @param {string} userId
 * @param {{ show_id, show_name, poster_path, first_air_date, vote_average }} showData
 * @param {'watched'|'watchlist'} status
 */
export const upsertShowStatus = async (userId, showData, status) => {
    const { data, error } = await supabase
        .from('user_shows')
        .upsert({
            user_id: userId,
            show_id: showData.show_id,
            show_name: showData.show_name,
            poster_path: showData.poster_path,
            first_air_date: showData.first_air_date,
            vote_average: showData.vote_average,
            status,
            // Carry rating/review forward when switching status (e.g. watching → watched)
            ...(showData.rating  != null && { rating:  showData.rating  }),
            ...(showData.review  != null && { review:  showData.review  }),
            // Stamp watched_at only when marking as watched
            ...(status === 'watched' && { watched_at: new Date().toISOString() }),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,show_id',
        })
        .select()
        .single();

    if (error) console.error('upsertShowStatus error:', error);
    return { data, error };
};

/**
 * Remove a show from a user's tracking entirely.
 * @param {string} userId
 * @param {number} showId
 */
export const removeTrackedShow = async (userId, showId) => {
    const { error } = await supabase
        .from('user_shows')
        .delete()
        .eq('user_id', userId)
        .eq('show_id', showId);

    if (error) console.error('removeTrackedShow error:', error);
    return { error };
};

/**
 * Save or update a user's rating and/or review for a watched show.
 * The show must already exist in user_shows with status 'watched'.
 * @param {string} userId
 * @param {number} showId
 * @param {{ rating?: number, review?: string }} reviewData
 */
export const saveReview = async (userId, showId, reviewData) => {
    const { data, error } = await supabase
        .from('user_shows')
        .update({
            ...reviewData,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('show_id', showId)
        .select()
        .single();

    if (error) console.error('saveReview error:', error);
    return { data, error };
};

// ─────────────────────────────────────────────
// FAVORITE SHOWS (up to 4 pinned picks)
// ─────────────────────────────────────────────

/**
 * Get a user's pinned favorite shows.
 * @param {string} userId
 */
export const getFavorites = async (userId) => {
    const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });

    if (error) console.error('getFavorites error:', error);
    return { data: data ?? [], error };
};

/**
 * Replace a user's favorites list entirely.
 * Accepts an array of up to 4 show objects with a position field (1–4).
 * @param {string} userId
 * @param {Array<{ show_id, show_name, poster_path, position }>} favorites
 */
export const setFavorites = async (userId, favorites) => {
    // Delete existing favorites first, then insert fresh
    const { error: deleteError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId);

    if (deleteError) {
        console.error('setFavorites delete error:', deleteError);
        return { error: deleteError };
    }

    if (favorites.length === 0) return { error: null };

    const rows = favorites.map((fav, idx) => ({
        user_id: userId,
        show_id: fav.show_id,
        show_name: fav.show_name,
        poster_path: fav.poster_path,
        position: idx + 1,
    }));

    const { data, error } = await supabase
        .from('user_favorites')
        .insert(rows)
        .select();

    if (error) console.error('setFavorites insert error:', error);
    return { data, error };
};

// ─────────────────────────────────────────────
// SOCIAL — Following / Followers
// ─────────────────────────────────────────────

/**
 * Get follower and following counts for a user.
 * @param {string} userId
 */
export const getFollowCounts = async (userId) => {
    const [followersRes, followingRes] = await Promise.all([
        supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId),
        supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId),
    ]);

    return {
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        error: followersRes.error || followingRes.error,
    };
};

/**
 * Check whether the current user follows another user.
 * @param {string} followerId
 * @param {string} followingId
 */
export const checkIsFollowing = async (followerId, followingId) => {
    const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

    return { isFollowing: !!data, error };
};

/**
 * Follow or unfollow a user.
 * @param {string} followerId
 * @param {string} followingId
 * @param {boolean} currentlyFollowing
 */
export const toggleFollow = async (followerId, followingId, currentlyFollowing) => {
    if (currentlyFollowing) {
        const { error } = await supabase
            .from('user_follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
        return { error };
    } else {
        const { error } = await supabase
            .from('user_follows')
            .insert({ follower_id: followerId, following_id: followingId });
        return { error };
    }
};

// ─────────────────────────────────────────────
// COMMUNITY ACTIVITY (homepage feed)
// ─────────────────────────────────────────────

/**
 * Fetch the most recent show interactions across all users.
 * Used on the homepage to show what members are watching.
 *
 * Requires user_shows SELECT policy to be public (`using (true)`).
 * See README-homepage.md for the SQL to enable this.
 *
 * @param {number} limit  - number of entries to return (default 12)
 */
export const getRecentCommunityActivity = async (limit = 12) => {
    // Fetch entries that have a rating or written review — avoids cross-schema FK issue
    const { data: shows, error: showsError } = await supabase
        .from('user_shows')
        .select('show_id, show_name, poster_path, first_air_date, vote_average, status, rating, review, watched_at, created_at, user_id')
        .or('rating.not.is.null,review.not.is.null')
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (showsError) {
        console.error('getRecentCommunityActivity error:', showsError);
        return { data: [], error: showsError };
    }

    if (!shows || shows.length === 0) return { data: [], error: null };

    // Fetch profiles for the users in this result set
    const userIds = [...new Set(shows.map(s => s.user_id))];
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

    // Index profiles by id for O(1) lookup
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    // Attach profile data in the same shape the components expect
    const data = shows.map(s => ({
        ...s,
        user_profiles: profileMap[s.user_id] ?? null,
    }));

    return { data, error: null };
};

// ─────────────────────────────────────────────
// MEMBERS LIST
// ─────────────────────────────────────────────

/**
 * Fetch all members with their watched and review counts.
 * Reads from the `member_stats` view — see README-members.md for the SQL.
 */
export const getMembers = async () => {
    const { data, error } = await supabase
        .from('member_stats')
        .select('*')
        .order('watched_count', { ascending: false });

    if (error) {
        console.error('getMembers error:', error);
        return { data: [], error };
    }

    return { data: data ?? [], error: null };
};

/**
 * Fetch the list of user IDs that the current user follows.
 * Used by the Members page to derive follow state locally
 * without a per-member DB call.
 *
 * @param {string} userId - the current user's ID
 */
export const getFollowingIds = async (userId) => {
    const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

    if (error) {
        console.error('getFollowingIds error:', error);
        return { data: [], error };
    }

    return { data: (data ?? []).map((row) => row.following_id), error: null };
};

// ─────────────────────────────────────────────
// FRIEND ACTIVITY (logged-in homepage feed)
// ─────────────────────────────────────────────

/**
 * Fetch recent show activity from users that the current user follows.
 * Returns shows they've watched or added to their watchlist, newest first.
 *
 * @param {string[]} followingIds  - array of user IDs the current user follows
 * @param {number}   limit         - max entries to return (default 16)
 */
export const getFriendActivity = async (followingIds, limit = 16) => {
    if (!followingIds || followingIds.length === 0) {
        return { data: [], error: null };
    }

    // Fetch shows — no join, avoids the cross-schema FK issue
    const { data: shows, error: showsError } = await supabase
        .from('user_shows')
        .select('show_id, show_name, poster_path, status, rating, watched_at, created_at, user_id')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (showsError) {
        console.error('getFriendActivity error:', showsError);
        return { data: [], error: showsError };
    }

    if (!shows || shows.length === 0) return { data: [], error: null };

    // Fetch profiles for users in this result set
    const userIds = [...new Set(shows.map(s => s.user_id))];
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    const data = shows.map(s => ({
        ...s,
        user_profiles: profileMap[s.user_id] ?? null,
    }));

    return { data, error: null };
};

// ─────────────────────────────────────────────
// SHOW REVIEWS (Detail page)
// ─────────────────────────────────────────────

/**
 * Fetch all member reviews for a specific show.
 * Only returns rows that have a rating or written review.
 * Profiles are fetched separately to avoid the cross-schema FK issue.
 *
 * @param {number} showId - TMDB show ID
 */
export const getShowReviews = async (showId) => {
    const { data: reviews, error } = await supabase
        .from('user_shows')
        .select('user_id, rating, review, updated_at')
        .eq('show_id', showId)
        .or('rating.not.is.null,review.not.is.null')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('getShowReviews error:', error);
        return { data: [], error };
    }

    if (!reviews || reviews.length === 0) return { data: [], error: null };

    // Fetch profiles for reviewers
    const userIds = reviews.map(r => r.user_id);
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    const data = reviews.map(r => ({
        ...r,
        user_profiles: profileMap[r.user_id] ?? null,
    }));

    return { data, error: null };
};

// ─────────────────────────────────────────────
// REVIEW LIKES
// ─────────────────────────────────────────────

/**
 * Fetch all likes for every review of a given show.
 * Returns a map keyed by reviewer_id → array of user_ids who liked it.
 *
 * @param {number} showId
 */
export const getReviewLikes = async (showId) => {
    const { data, error } = await supabase
        .from('review_likes')
        .select('reviewer_id, user_id')
        .eq('show_id', showId);

    if (error) {
        console.error('getReviewLikes error:', error);
        return { data: {}, error };
    }

    // Group into { [reviewer_id]: [user_id, ...] }
    const map = {};
    (data ?? []).forEach(({ reviewer_id, user_id }) => {
        if (!map[reviewer_id]) map[reviewer_id] = [];
        map[reviewer_id].push(user_id);
    });

    return { data: map, error: null };
};

/**
 * Toggle a like on a review.
 * @param {string} userId      - the user performing the action
 * @param {number} showId
 * @param {string} reviewerId  - the user whose review is being liked
 */
export const toggleReviewLike = async (userId, showId, reviewerId) => {
    // Check if the like already exists
    const { data: existing } = await supabase
        .from('review_likes')
        .select('id')
        .eq('show_id', showId)
        .eq('reviewer_id', reviewerId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('review_likes')
            .delete()
            .eq('id', existing.id);
        return { liked: false, error };
    } else {
        const { error } = await supabase
            .from('review_likes')
            .insert({ show_id: showId, reviewer_id: reviewerId, user_id: userId });
        return { liked: true, error };
    }
};

// ─────────────────────────────────────────────
// REVIEW COMMENTS
// ─────────────────────────────────────────────

/**
 * Fetch all comments for every review of a given show.
 * Returns a map keyed by reviewer_id → array of comment objects.
 * Profiles fetched separately to avoid cross-schema FK issue.
 *
 * @param {number} showId
 */
export const getReviewComments = async (showId) => {
    const { data: comments, error } = await supabase
        .from('review_comments')
        .select('id, reviewer_id, user_id, comment, created_at')
        .eq('show_id', showId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('getReviewComments error:', error);
        return { data: {}, error };
    }

    if (!comments || comments.length === 0) return { data: {}, error: null };

    // Fetch profiles for all commenters
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    // Group into { [reviewer_id]: [{ ...comment, user_profiles }] }
    const map = {};
    comments.forEach(c => {
        if (!map[c.reviewer_id]) map[c.reviewer_id] = [];
        map[c.reviewer_id].push({ ...c, user_profiles: profileMap[c.user_id] ?? null });
    });

    return { data: map, error: null };
};

/**
 * Add a comment to a review.
 * @param {string} userId      - commenter
 * @param {number} showId
 * @param {string} reviewerId  - whose review is being commented on
 * @param {string} comment     - comment text
 */
export const addReviewComment = async (userId, showId, reviewerId, comment) => {
    const { data, error } = await supabase
        .from('review_comments')
        .insert({ user_id: userId, show_id: showId, reviewer_id: reviewerId, comment })
        .select()
        .single();

    if (error) console.error('addReviewComment error:', error);
    return { data, error };
};

/**
 * Delete a comment. Only the comment author can delete their own.
 * @param {string} commentId
 */
export const deleteReviewComment = async (commentId) => {
    const { error } = await supabase
        .from('review_comments')
        .delete()
        .eq('id', commentId);

    if (error) console.error('deleteReviewComment error:', error);
    return { error };
};

/**
 * Update the season/episode progress for a show the user is currently watching.
 * @param {string} userId
 * @param {number} showId
 * @param {{ current_season?: number, current_episode?: number }} progress
 */
export const updateShowProgress = async (userId, showId, progress) => {
    const { data, error } = await supabase
        .from('user_shows')
        .update({ ...progress, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('show_id', showId)
        .select()
        .single();

    if (error) console.error('updateShowProgress error:', error);
    return { data, error };
};

// ─────────────────────────────────────────────
// USERNAME HELPERS
// ─────────────────────────────────────────────

/**
 * Derive a valid username from a display name.
 * Rules: lowercase, letters/numbers/underscores only, max 30 chars.
 * e.g. "John Doe!" → "john_doe"
 */
export const toUsername = (displayName) =>
    displayName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')   // replace invalid chars with underscore
        .replace(/_+/g, '_')            // collapse consecutive underscores
        .replace(/^_|_$/g, '')          // strip leading/trailing underscores
        .slice(0, 30);

/**
 * Validate a username string.
 * Returns null if valid, or an error message string if invalid.
 */
export const validateUsername = (username) => {
    if (!username) return 'Username is required.';
    if (username.length < 2) return 'Username must be at least 2 characters.';
    if (username.length > 30) return 'Username must be 30 characters or fewer.';
    if (!/^[a-z0-9_]+$/.test(username)) return 'Only lowercase letters, numbers, and underscores are allowed.';
    return null;
};

/**
 * Check whether a string looks like a UUID.
 * Used in Profile.jsx to decide whether to look up by id or by username.
 */
export const isUUID = (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Fetch a profile by username (exact match, case-insensitive).
 * @param {string} username
 */
export const getUserProfileByUsername = async (username) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', username)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('getUserProfileByUsername error:', error);
        return { data: null, error };
    }
    return { data: data ?? null, error: null };
};

/**
 * Check whether a username is already taken.
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export const isUsernameTaken = async (username) => {
    const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

    return !!data;
};


// ─────────────────────────────────────────────
// FOLLOWERS / FOLLOWING LISTS
// ─────────────────────────────────────────────

/**
 * Fetch the list of users who follow a given user, with member_stats.
 * @param {string} userId
 */
export const getFollowersList = async (userId) => {
    const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

    if (error) {
        console.error('getFollowersList error:', error);
        return { data: [], error };
    }

    const ids = (data ?? []).map(r => r.follower_id);
    if (ids.length === 0) return { data: [], error: null };

    const { data: stats, error: statsError } = await supabase
        .from('member_stats')
        .select('*')
        .in('id', ids);

    if (statsError) console.error('getFollowersList stats error:', statsError);
    return { data: stats ?? [], error: statsError };
};

/**
 * Fetch the list of users that a given user follows, with member_stats.
 * @param {string} userId
 */
export const getFollowingList = async (userId) => {
    const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

    if (error) {
        console.error('getFollowingList error:', error);
        return { data: [], error };
    }

    const ids = (data ?? []).map(r => r.following_id);
    if (ids.length === 0) return { data: [], error: null };

    const { data: stats, error: statsError } = await supabase
        .from('member_stats')
        .select('*')
        .in('id', ids);

    if (statsError) console.error('getFollowingList stats error:', statsError);
    return { data: stats ?? [], error: statsError };
};
