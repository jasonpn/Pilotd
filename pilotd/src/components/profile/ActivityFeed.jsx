/**
 * ActivityFeed.jsx
 * Chronological diary of recent watched/watchlist activity.
 */

import React from 'react';
import { Link }           from 'react-router';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import BookmarkIcon       from '@mui/icons-material/Bookmark';
import StarRating         from './StarRating.jsx';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

const formatDate = (isoString) => {
    if (!isoString) return '';
    const d    = new Date(isoString);
    const now  = new Date();
    const diff = Math.floor((now - d) / 86_400_000);

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ActivityRow = ({ entry }) => {
    const isWatched = entry.status === 'watched';

    return (
        <div className="flex gap-4 py-3 border-b border-[#2c3440]/60 last:border-0 group">
            {/* Date */}
            <div className="w-16 flex-shrink-0 text-right">
                <span className="text-xs text-[#89BAA2] leading-none">
                    {formatDate(entry.watched_at ?? entry.created_at)}
                </span>
            </div>

            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
                {isWatched
                    ? <VisibilityIcon sx={{ fontSize: 14, color: '#378370' }} />
                    : <BookmarkIcon   sx={{ fontSize: 14, color: '#D87B53' }} />}
            </div>

            {/* Poster + info */}
            <div className="flex-1 flex gap-3 min-w-0">
                <Link to={`/show/${entry.show_id}`} className="flex-shrink-0">
                    <div className="w-9 h-14 rounded overflow-hidden bg-[#2c3440] shadow hover:ring-1 ring-[#D87B53] transition-all">
                        {entry.poster_path && (
                            <img
                                src={`${TMDB_IMAGE_BASE}${entry.poster_path}`}
                                alt={entry.show_name}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                </Link>

                <div className="flex-1 min-w-0">
                    <Link to={`/show/${entry.show_id}`}>
                        <p className="text-sm font-semibold text-[#EBDFD9] hover:text-[#D87B53] transition-colors line-clamp-1">
                            {entry.show_name}
                        </p>
                    </Link>

                    <p className="text-xs text-[#89BAA2] mt-0.5">
                        {isWatched ? 'Watched' : 'Added to watchlist'}
                    </p>

                    {/* Half-star rating display */}
                    {entry.rating && (
                        <StarRating
                            value={entry.rating}
                            size="sm"
                            className="mt-1"
                        />
                    )}

                    {entry.review && (
                        <p className="text-xs text-[#EBDFD9]/60 mt-1 line-clamp-2">
                            {entry.review}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityFeed = ({ watched, watchlist, limit = 10 }) => {
    const allEntries = [...watched, ...watchlist]
        .sort((a, b) => {
            const aDate = new Date(a.watched_at ?? a.created_at ?? 0);
            const bDate = new Date(b.watched_at ?? b.created_at ?? 0);
            return bDate - aDate;
        })
        .slice(0, limit);

    if (allEntries.length === 0) {
        return (
            <section className="mb-8">
                <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-widest mb-4">
                    Recent Activity
                </h2>
                <p className="text-[#89BAA2] text-sm">
                    No activity yet — start tracking shows to build your diary.
                </p>
            </section>
        );
    }

    return (
        <section className="mb-8">
            <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-widest mb-4">
                Recent Activity
            </h2>
            <div className="bg-[#1a1f28] rounded-lg border border-[#2c3440] px-4 divide-y divide-transparent">
                {allEntries.map((entry) => (
                    <ActivityRow key={`${entry.show_id}-${entry.status}`} entry={entry} />
                ))}
            </div>
        </section>
    );
};

export default ActivityFeed;
