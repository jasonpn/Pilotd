import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { CircularProgress, Tab, Tabs, Box, Chip } from '@mui/material'
import StarIcon          from '@mui/icons-material/Star'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon    from '@mui/icons-material/AccessTime'
import TvIcon            from '@mui/icons-material/Tv'
import ArrowBackIcon     from '@mui/icons-material/ArrowBack'
import Header       from './Header'
import WatchActions from './WatchActions'
import StarRating   from './profile/StarRating'
import { useTracking }    from '../ShowTrackingContext'
import { useAuth }        from '../AuthContext'
import {
    getShowReviews,
    getReviewLikes,
    getReviewComments,
    toggleReviewLike,
    addReviewComment,
    deleteReviewComment,
} from '../profileService'

const BASE_API_URL      = 'https://api.themoviedb.org/3/'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const API_KEY           = import.meta.env.VITE_TMDB_API_KEY

const API_OPTIONS = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`
    }
}


// ── ReviewCard ─────────────────────────────────────────────────────────────────
/**
 * Single review entry with like and comment functionality.
 * Comment section is toggled open/closed with a local useState
 * clicking the comment icon shows/hides it, no page navigation needed.
 *
 * Props:
 *   review          - review row with user_profiles attached
 *   showId          - TMDB show ID
 *   currentUser     - logged-in user (null if logged out)
 *   likes           - array of user_ids who liked this review
 *   comments        - array of comment objects for this review
 *   onLikeToggle    - (liked: bool) => void — optimistic update in parent
 *   onCommentAdded  - (comment) => void
 *   onCommentDeleted- (commentId) => void
 */
const ReviewCard = ({
                        review, showId, currentUser,
                        likes, comments,
                        onLikeToggle, onCommentAdded, onCommentDeleted,
                    }) => {
    const [showComments,  setShowComments]  = React.useState(false)
    const [commentText,   setCommentText]   = React.useState('')
    const [submitting,    setSubmitting]    = React.useState(false)
    const [likePending,   setLikePending]   = React.useState(false)

    const displayName = review.user_profiles?.display_name ?? 'Member'
    const avatarUrl   = review.user_profiles?.avatar_url   ?? null
    const isOwnReview = currentUser?.id === review.user_id
    const hasLiked    = currentUser ? likes.includes(currentUser.id) : false

    const handleLike = async () => {
        if (!currentUser || isOwnReview || likePending) return
        setLikePending(true)
        const { liked, error } = await toggleReviewLike(currentUser.id, showId, review.user_id)
        if (!error) onLikeToggle(liked)
        setLikePending(false)
    }

    const handleAddComment = async () => {
        if (!currentUser || !commentText.trim() || submitting) return
        setSubmitting(true)
        const { data, error } = await addReviewComment(
            currentUser.id, showId, review.user_id, commentText.trim()
        )
        if (!error && data) {
            onCommentAdded({
                ...data,
                user_profiles: {
                    display_name: currentUser.user_metadata?.display_name ?? 'You',
                    avatar_url:   null,
                },
            })
            setCommentText('')
        }
        setSubmitting(false)
    }

    const handleDeleteComment = async (commentId) => {
        const { error } = await deleteReviewComment(commentId)
        if (!error) onCommentDeleted(commentId)
    }

    return (
        <div className="pb-6 border-b border-gray-800 last:border-0 pt-6 first:pt-0">
            {/* Review header */}
            <div className="flex gap-4">
                <Link to={`/profile/${review.user_id}`} className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2c3440]
                                    border border-[#DCB35A]/10 flex items-center justify-center
                                    hover:ring-2 ring-[#D87B53]/40 transition-all">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[#89BAA2] text-sm font-bold">
                                {displayName[0]?.toUpperCase()}
                            </span>
                        )}
                    </div>
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        <Link
                            to={`/profile/${review.user_id}`}
                            className="text-sm font-semibold text-[#EBDFD9] hover:text-[#D87B53] transition-colors"
                        >
                            {displayName}
                        </Link>
                        {review.rating && <StarRating value={review.rating} size="sm" showLabel />}
                    </div>

                    {review.review && (
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
                            {review.review}
                        </p>
                    )}

                    {/* Action row: like + comment toggle */}
                    <div className="flex items-center gap-4">
                        {/* Like button — hidden on own review */}
                        {!isOwnReview && (
                            <button
                                onClick={handleLike}
                                disabled={!currentUser || likePending}
                                className={`flex items-center gap-1.5 text-xs transition-colors
                                    ${hasLiked ? 'text-[#EF8D72]' : 'text-gray-500 hover:text-[#EF8D72]'}
                                    ${!currentUser ? 'cursor-default' : ''}`}
                                title={!currentUser ? 'Sign in to like' : hasLiked ? 'Unlike' : 'Like'}
                            >
                                {/* Heart icon via inline SVG — avoids an extra MUI import */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                {likes.length > 0 && <span>{likes.length}</span>}
                            </button>
                        )}

                        {/* Comment toggle */}
                        <button
                            onClick={() => setShowComments(prev => !prev)}
                            className={`flex items-center gap-1.5 text-xs transition-colors
                                ${showComments ? 'text-[#89BAA2]' : 'text-gray-500 hover:text-[#89BAA2]'}`}
                        >
                            {/* Speech bubble icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            {comments.length > 0 && <span>{comments.length}</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Comment section — toggled open/closed by clicking the icon */}
            {showComments && (
                <div className="mt-4 ml-14 space-y-3">
                    {/* Existing comments */}
                    {comments.map((c) => {
                        const cName   = c.user_profiles?.display_name ?? 'Member'
                        const cAvatar = c.user_profiles?.avatar_url   ?? null
                        const isOwn   = currentUser?.id === c.user_id

                        return (
                            <div key={c.id} className="flex gap-2 group/comment">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2c3440] flex-shrink-0
                                                border border-[#DCB35A]/10 flex items-center justify-center">
                                    {cAvatar ? (
                                        <img src={cAvatar} alt={cName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[8px] text-[#89BAA2] font-bold">
                                            {cName[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 bg-[#2c3440]/50 rounded-lg px-3 py-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-semibold text-[#EBDFD9]">{cName}</span>
                                        <span className="text-xs text-gray-500 flex-1">{c.comment}</span>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleDeleteComment(c.id)}
                                                className="text-gray-600 hover:text-red-400 transition-colors
                                                           opacity-0 group-hover/comment:opacity-100
                                                           sm:opacity-0 sm:group-hover/comment:opacity-100
                                                           text-xs flex-shrink-0"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* New comment input: logged-in users only */}
                    {currentUser ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
                                placeholder="Add a comment…"
                                maxLength={300}
                                className="flex-1 bg-[#2c3440] text-[#EBDFD9] text-xs rounded-lg px-3 py-2
                                           border border-[#DCB35A]/10 placeholder-gray-600
                                           focus:outline-none focus:border-[#89BAA2]/40 transition-colors"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || submitting}
                                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#14181c]
                                           bg-[#89BAA2] hover:bg-[#378370] transition-colors
                                           disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {submitting ? '…' : 'Post'}
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">
                            <Link to="/login" className="text-[#89BAA2] hover:text-[#D87B53] transition-colors">
                                Sign in
                            </Link>
                            {' '}to leave a comment.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

const Detail = () => {
    const { id }      = useParams()
    const navigate    = useNavigate()
    const [show,      setShow]     = useState(null)
    const [cast,      setCast]     = useState([])
    const [seasons,   setSeasons]  = useState([])
    const [similar,   setSimilar]  = useState([])
    const [loading,   setLoading]  = useState(true)
    const [activeTab,   setActiveTab]   = useState(0)
    const [reviews,      setReviews]      = useState([])
    const [likesMap,     setLikesMap]     = useState({})
    const [commentsMap,  setCommentsMap]  = useState({})
    const [reviewsLoading, setReviewsLoading] = useState(false)

    // Single shared tracking instance via context
    const { getLocalStatus, watched, watching, submitReview } = useTracking()
    const { user } = useAuth()

    useEffect(() => {
        const fetchShowDetails = async () => {
            setLoading(true)
            try {
                const showResponse = await fetch(
                    `${BASE_API_URL}tv/${id}?append_to_response=credits`,
                    API_OPTIONS
                )
                if (!showResponse.ok) throw new Error('Failed to fetch show details')
                const showData = await showResponse.json()
                setShow(showData)

                if (showData.credits?.cast) {
                    setCast(showData.credits.cast.slice(0, 12))
                }
                if (showData.seasons) {
                    setSeasons(showData.seasons.filter(s => s.season_number > 0))
                }

                const similarResponse = await fetch(
                    `${BASE_API_URL}tv/${id}/recommendations`,
                    API_OPTIONS
                )
                if (similarResponse.ok) {
                    const similarData = await similarResponse.json()
                    setSimilar(similarData.results?.slice(0, 12) || [])
                }
            } catch (error) {
                console.error('Error fetching show details:', error)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchShowDetails()
    }, [id])

    const handleTabChange = async (_, newValue) => {
        setActiveTab(newValue)
        // Load reviews, likes, and comments lazily on first open (tab index 3)
        if (newValue === 3 && reviews.length === 0 && id) {
            setReviewsLoading(true)
            const showId = Number(id)
            const [reviewsRes, likesRes, commentsRes] = await Promise.all([
                getShowReviews(showId),
                getReviewLikes(showId),
                getReviewComments(showId),
            ])
            setReviews(reviewsRes.data)
            setLikesMap(likesRes.data)
            setCommentsMap(commentsRes.data)
            setReviewsLoading(false)
        }
    }

    const handleSimilarShowClick = (showId) => {
        navigate(`/show/${showId}`)
        window.scrollTo(0, 0)
    }

    // Rating comes from whichever list the show is in (or null if untracked)
    const trackedEntry = show && (
        watched.find(s  => s.show_id === show.id) ||
        watching.find(s => s.show_id === show.id)
    )
    const userRating = trackedEntry?.rating ?? null

    // Pass full show object so submitReview can auto-mark as watching if needed
    const handleRatingChange = async (newRating) => {
        if (!show) return
        await submitReview(show.id, { rating: newRating }, show)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#14181c] flex items-center justify-center">
                <CircularProgress sx={{ color: '#00e054' }} />
            </div>
        )
    }

    if (!show) {
        return (
            <div className="min-h-screen bg-[#14181c] flex flex-col items-center justify-center gap-4">
                <p className="text-white text-xl">Show not found</p>
                <button onClick={() => navigate('/')} className="text-[#00e054] hover:underline">
                    Return to Home
                </button>
            </div>
        )
    }

    const backdropUrl = show.backdrop_path
        ? `${TMDB_IMAGE_BASE_URL}/original${show.backdrop_path}`
        : '/no-backdrop.jpg'
    const posterUrl = show.poster_path
        ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}`
        : '/no-movie.png'

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#14181c]">

                {/* Back Button */}
                <div className="container mx-auto px-4 pt-4 max-w-7xl">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowBackIcon fontSize="small" />
                        <span>Back to Shows</span>
                    </button>
                </div>

                {/* Backdrop */}
                <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
                    <div className="absolute inset-0">
                        <img src={backdropUrl} alt={show.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#14181c]/90 via-transparent to-transparent" />
                    </div>

                    <div className="relative h-full container mx-auto px-4 max-w-7xl flex items-end pb-4 sm:pb-8">
                        <div className="flex gap-3 sm:gap-4 md:gap-6 items-end w-full flex-row">

                            {/* Poster */}
                            <div className="flex-shrink-0">
                                <img
                                    src={posterUrl}
                                    alt={show.name}
                                    className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] rounded-lg shadow-2xl border-2 border-white/10"
                                />
                            </div>

                            {/* Show Info */}
                            <div className="flex-1 pb-2 sm:pb-4 min-w-0">
                                <div className="flex items-start sm:items-center gap-2 mb-2 flex-col sm:flex-row">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                                        {show.name}
                                    </h1>
                                    {show.first_air_date && (
                                        <span className="text-lg sm:text-xl md:text-2xl text-gray-400 flex-shrink-0">
                                        {new Date(show.first_air_date).getFullYear()}
                                    </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <StarIcon sx={{ color: '#D87B53', fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                                        <span className="text-white font-semibold text-sm sm:text-base">
                                        {show.vote_average?.toFixed(1) || 'N/A'}
                                    </span>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                                        {show.genres?.slice(0, 3).map((genre) => (
                                            <Chip
                                                key={genre.id}
                                                label={genre.name}
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                                                    height: { xs: '20px', sm: '24px' }
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-3 md:gap-6 text-gray-300 mb-3 md:mb-4 flex-wrap text-xs sm:text-sm">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <CalendarTodayIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
                                        <span>{show.status || 'Unknown'}</span>
                                    </div>
                                    {show.episode_run_time?.[0] && (
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <AccessTimeIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
                                            <span>{show.episode_run_time[0]} min</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <TvIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
                                        <span>
                                        {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''} · {show.number_of_episodes} Ep
                                    </span>
                                    </div>
                                </div>

                                {/* Desktop: watch actions + personal rating */}
                                <div className="hidden sm:flex items-center gap-4 flex-wrap">
                                    {user ? (
                                        <>
                                            <WatchActions show={show} />
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 text-sm">Your rating:</span>
                                                <StarRating value={userRating} onChange={handleRatingChange} size="md" showLabel />
                                            </div>
                                        </>
                                    ) : (
                                        <Link
                                            to="/login"
                                            className="px-4 py-2 rounded-md text-sm font-semibold text-[#14181c] transition-all duration-200 hover:-translate-y-0.5"
                                            style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                                        >
                                            Sign in to log &amp; review
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-7xl">

                    {/* Mobile info + actions */}
                    <div className="sm:hidden mb-6">
                        <div className="flex items-center gap-4 text-gray-300 mb-4 flex-wrap text-xs">
                            <div className="flex items-center gap-1">
                                <CalendarTodayIcon sx={{ fontSize: '0.875rem' }} />
                                <span>{show.status || 'Unknown'}</span>
                            </div>
                            {show.episode_run_time?.[0] && (
                                <div className="flex items-center gap-1">
                                    <AccessTimeIcon sx={{ fontSize: '0.875rem' }} />
                                    <span>{show.episode_run_time[0]} min</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <TvIcon sx={{ fontSize: '0.875rem' }} />
                                <span>{show.number_of_seasons}S · {show.number_of_episodes}Ep</span>
                            </div>
                        </div>
                        {user ? (
                            <div className="flex flex-col gap-3">
                                <WatchActions show={show} />
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">Your rating:</span>
                                    <StarRating value={userRating} onChange={handleRatingChange} size="md" showLabel />
                                </div>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="inline-block px-4 py-2 rounded-md text-sm font-semibold text-[#14181c] transition-all duration-200 hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                            >
                                Sign in to log &amp; review
                            </Link>
                        )}
                    </div>

                    {/* Overview */}
                    <div className="mb-8 sm:mb-12">
                        <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed">
                            {show.overview || 'No overview available.'}
                        </p>
                        {show.created_by?.length > 0 && (
                            <p className="text-gray-400 mt-3 sm:mt-4 text-sm sm:text-base">
                                Created by{' '}
                                <span className="text-white">
                                {show.created_by.map(c => c.name).join(', ')}
                            </span>
                            </p>
                        )}
                    </div>

                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 3, sm: 4 } }}>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            sx={{
                                '& .MuiTab-root': {
                                    color: '#9ca3af',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    fontSize: { xs: '0.875rem', sm: '1rem' },
                                    minWidth: { xs: 'auto', sm: 90 },
                                    padding: { xs: '12px 16px', sm: '12px 16px' }
                                },
                                '& .Mui-selected': { color: '#89BAA2 !important' },
                                '& .MuiTabs-indicator': { backgroundColor: '#89BAA2' }
                            }}
                        >
                            <Tab label="Cast" />
                            <Tab label="Seasons" />
                            <Tab label="Similar Shows" />
                            <Tab label="Reviews" />
                        </Tabs>
                    </Box>

                    {/* Cast Tab */}
                    {activeTab === 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                            {cast.length > 0 ? cast.map((member) => (
                                <div key={member.id} className="text-center">
                                    <div className="mb-2 sm:mb-3">
                                        <img
                                            src={member.profile_path
                                                ? `${TMDB_IMAGE_BASE_URL}/w185${member.profile_path}`
                                                : '/no-avatar.png'}
                                            alt={member.name}
                                            className="w-full aspect-square object-cover rounded-full border-2 border-gray-700"
                                        />
                                    </div>
                                    <h3 className="text-white font-semibold text-xs sm:text-sm mb-1 line-clamp-2">{member.name}</h3>
                                    <p className="text-gray-400 text-xs line-clamp-2">{member.character}</p>
                                </div>
                            )) : (
                                <p className="text-gray-400 col-span-full text-sm">No cast information available.</p>
                            )}
                        </div>
                    )}

                    {/* Seasons Tab */}
                    {activeTab === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {seasons.length > 0 ? seasons.map((season) => (
                                <div
                                    key={season.id}
                                    className="bg-[#2c3440] border border-gray-700 rounded-lg overflow-hidden hover:border-[#89BAA2] transition-colors"
                                >
                                    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                                        <img
                                            src={season.poster_path
                                                ? `${TMDB_IMAGE_BASE_URL}/w185${season.poster_path}`
                                                : '/no-movie.png'}
                                            alt={season.name}
                                            className="w-16 sm:w-20 md:w-24 h-24 sm:h-30 md:h-36 object-cover rounded flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base line-clamp-1">{season.name}</h3>
                                            <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">
                                                {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
                                            </p>
                                            {season.air_date && (
                                                <p className="text-gray-400 text-xs mb-1 sm:mb-2">
                                                    {new Date(season.air_date).getFullYear()}
                                                </p>
                                            )}
                                            <p className="text-gray-500 text-xs line-clamp-2 sm:line-clamp-3">
                                                {season.overview || 'No overview available.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-400 col-span-full text-sm">No season information available.</p>
                            )}
                        </div>
                    )}

                    {/* Similar Shows Tab */}
                    {activeTab === 2 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                            {similar.length > 0 ? similar.map((similarShow) => (
                                <button
                                    key={similarShow.id}
                                    onClick={() => handleSimilarShowClick(similarShow.id)}
                                    className="group text-left"
                                >
                                    <div className="relative overflow-hidden rounded-lg mb-2 shadow-lg">
                                        <img
                                            src={similarShow.poster_path
                                                ? `${TMDB_IMAGE_BASE_URL}/w342${similarShow.poster_path}`
                                                : '/no-movie.png'}
                                            alt={similarShow.name}
                                            className="w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                    <h3 className="text-white text-xs sm:text-sm font-medium group-hover:text-[#89BAA2] transition-colors line-clamp-2">
                                        {similarShow.name}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-1">
                                        <StarIcon sx={{ color: '#FF9933', fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                                        <span className="text-gray-400 text-xs">
                                        {similarShow.vote_average?.toFixed(1) || 'N/A'}
                                    </span>
                                    </div>
                                </button>
                            )) : (
                                <p className="text-gray-400 col-span-full text-sm">No similar shows found.</p>
                            )}
                        </div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 3 && (
                        <div className="space-y-0">
                            {reviewsLoading ? (
                                <div className="flex justify-center py-12">
                                    <CircularProgress sx={{ color: '#D87B53' }} />
                                </div>
                            ) : reviews.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-12">
                                    No reviews yet — be the first to rate this show.
                                </p>
                            ) : (
                                reviews.map((review) => (
                                    <ReviewCard
                                        key={review.user_id}
                                        review={review}
                                        showId={Number(id)}
                                        currentUser={user}
                                        likes={likesMap[review.user_id] ?? []}
                                        comments={commentsMap[review.user_id] ?? []}
                                        onLikeToggle={(liked) => {
                                            setLikesMap(prev => {
                                                const list = prev[review.user_id] ?? []
                                                return {
                                                    ...prev,
                                                    [review.user_id]: liked
                                                        ? [...list, user.id]
                                                        : list.filter(uid => uid !== user.id)
                                                }
                                            })
                                        }}
                                        onCommentAdded={(newComment) => {
                                            setCommentsMap(prev => ({
                                                ...prev,
                                                [review.user_id]: [...(prev[review.user_id] ?? []), newComment]
                                            }))
                                        }}
                                        onCommentDeleted={(commentId) => {
                                            setCommentsMap(prev => ({
                                                ...prev,
                                                [review.user_id]: (prev[review.user_id] ?? []).filter(c => c.id !== commentId)
                                            }))
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default Detail
