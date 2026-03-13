import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { CircularProgress, Tab, Tabs, Box, Chip } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TvIcon from '@mui/icons-material/Tv'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

const BASE_API_URL = 'https://api.themoviedb.org/3/'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const API_OPTIONS = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`
    }
};

const Detail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [show, setShow] = useState(null);
    const [cast, setCast] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRating, setUserRating] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const fetchShowDetails = async () => {
            setLoading(true);
            try {
                // Fetch show details
                const showResponse = await fetch(
                    `${BASE_API_URL}tv/${id}?append_to_response=credits`,
                    API_OPTIONS
                );
                if (!showResponse.ok) throw new Error('Failed to fetch show details');
                const showData = await showResponse.json();
                setShow(showData);

                // Extract cast from credits
                if (showData.credits?.cast) {
                    setCast(showData.credits.cast.slice(0, 12));
                }

                // Extract seasons (excluding season 0 - specials)
                if (showData.seasons) {
                    setSeasons(showData.seasons.filter(season => season.season_number > 0));
                }

                // Fetch similar shows
                const similarResponse = await fetch(
                    `${BASE_API_URL}tv/${id}/similar`,
                    API_OPTIONS
                );
                if (similarResponse.ok) {
                    const similarData = await similarResponse.json();
                    setSimilar(similarData.results?.slice(0, 12) || []);
                }
            } catch (error) {
                console.error('Error fetching show details:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchShowDetails();
        }
    }, [id]);

    const handleRating = (rating) => {
        setUserRating(rating);
        // Should save to backend/database
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleSimilarShowClick = (showId) => {
        navigate(`/show/${showId}`);
        window.scrollTo(0, 0);
    };

    if(loading) {
        return (
            <div className="min-h-screen bg-[#14181c] flex items-center justify-center">
                <CircularProgress sx={{ color: '#00e054' }} />
            </div>
        );
    }

    if(!show) {
        return (
            <div className="min-h-screen bg-[#14181c] flex flex-col items-center justify-center gap-4">
                <p className="text-white text-xl">Show not found</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-[#00e054] hover:underline"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    const backdropUrl = show.backdrop_path
        ? `${TMDB_IMAGE_BASE_URL}/original${show.backdrop_path}`
        : '/no-backdrop.jpg';
    const posterUrl = show.poster_path
        ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}`
        : '/no-movie.png';

    return (
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

            {/* Backdrop Section */}
            <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={backdropUrl}
                        alt={show.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#14181c]/90 via-transparent to-transparent" />
                </div>

                {/* Content Overlay */}
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
                                    <StarIcon sx={{ color: '#FF9933', fontSize: { xs: '1rem', sm: '1.25rem' } }} />
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
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                                                height: { xs: '20px', sm: '24px' }
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Info Row - Hide on very small screens */}
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
                                        {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''} • {show.number_of_episodes} Ep
                                    </span>
                                </div>
                            </div>

                            {/* User Rating - Hide on mobile, show below on mobile */}
                            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                                <span className="text-gray-400 text-xs sm:text-sm">Rate:</span>
                                <div className="flex gap-0.5 sm:gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleRating(star)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            {userRating && star <= userRating ? (
                                                <StarIcon sx={{ color: '#00e054', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                                            ) : (
                                                <StarBorderIcon sx={{ color: '#00e054', fontSize: { xs: '1.25rem', sm: '1.5rem' }, '&:hover': { color: '#00c030' } }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
                {/* Mobile Info Section */}
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
                            <span>
                                {show.number_of_seasons}S • {show.number_of_episodes}Ep
                            </span>
                        </div>
                    </div>

                    {/* Mobile Rating */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Rate this show:</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleRating(star)}
                                    className="transition-transform active:scale-90"
                                >
                                    {userRating && star <= userRating ? (
                                        <StarIcon sx={{ color: '#00e054', fontSize: '1.5rem' }} />
                                    ) : (
                                        <StarBorderIcon sx={{ color: '#6b7280', fontSize: '1.5rem' }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
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
                                {show.created_by.map((creator) => creator.name).join(', ')}
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
                            '& .Mui-selected': {
                                color: '#00c030 !important'
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#00e054'
                            }
                        }}
                    >
                        <Tab label="Cast" />
                        <Tab label="Seasons" />
                        <Tab label="Similar Shows" />
                    </Tabs>
                </Box>

                {/* Cast Tab */}
                {activeTab === 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                        {cast.length > 0 ? (
                            cast.map((member) => (
                                <div key={member.id} className="text-center">
                                    <div className="mb-2 sm:mb-3">
                                        <img
                                            src={
                                                member.profile_path
                                                    ? `${TMDB_IMAGE_BASE_URL}/w185${member.profile_path}`
                                                    : '/no-avatar.png'
                                            }
                                            alt={member.name}
                                            className="w-full aspect-square object-cover rounded-full border-2 border-gray-700"
                                        />
                                    </div>
                                    <h3 className="text-white font-semibold text-xs sm:text-sm mb-1 line-clamp-2">
                                        {member.name}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-2">{member.character}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 col-span-full text-sm">No cast information available.</p>
                        )}
                    </div>
                )}

                {/* Seasons Tab */}
                {activeTab === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {seasons.length > 0 ? (
                            seasons.map((season) => (
                                <div
                                    key={season.id}
                                    className="bg-[#2c3440] border border-gray-700 rounded-lg overflow-hidden hover:border-[#00c030] transition-colors"
                                >
                                    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                                        <img
                                            src={
                                                season.poster_path
                                                    ? `${TMDB_IMAGE_BASE_URL}/w185${season.poster_path}`
                                                    : '/no-movie.png'
                                            }
                                            alt={season.name}
                                            className="w-16 sm:w-20 md:w-24 h-24 sm:h-30 md:h-36 object-cover rounded flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base line-clamp-1">
                                                {season.name}
                                            </h3>
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
                            ))
                        ) : (
                            <p className="text-gray-400 col-span-full text-sm">No season information available.</p>
                        )}
                    </div>
                )}

                {/* Similar Shows Tab */}
                {activeTab === 2 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                        {similar.length > 0 ? (
                            similar.map((similarShow) => (
                                <button
                                    key={similarShow.id}
                                    onClick={() => handleSimilarShowClick(similarShow.id)}
                                    className="group text-left"
                                >
                                    <div className="relative overflow-hidden rounded-lg mb-2 shadow-lg">
                                        <img
                                            src={
                                                similarShow.poster_path
                                                    ? `${TMDB_IMAGE_BASE_URL}/w342${similarShow.poster_path}`
                                                    : '/no-movie.png'
                                            }
                                            alt={similarShow.name}
                                            className="w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                    <h3 className="text-white text-xs sm:text-sm font-medium group-hover:text-[#00c030] transition-colors line-clamp-2">
                                        {similarShow.name}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-1">
                                        <StarIcon sx={{ color: '#FF9933', fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                                        <span className="text-gray-400 text-xs">
                                            {similarShow.vote_average?.toFixed(1) || 'N/A'}
                                        </span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-gray-400 col-span-full text-sm">No similar shows found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Detail;