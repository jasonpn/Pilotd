/**
 * ReviewsList.jsx
 * Displays all shows the user has watched, with inline rating + review editor.
 *
 * - Supports half-star ratings (stored as 1–10, displayed as 0.5–5 stars)
 * - Rating is saved immediately on click (no need to hit Save just for stars)
 */

import React, { useState } from 'react';
import { Link }       from 'react-router';
import EditIcon       from '@mui/icons-material/Edit';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarRating        from './StarRating';
import ReviewEditPanel from './ReviewEditPanel';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

// ── Single review card ────────────────────────────────────────────────────────

const ReviewCard = ({ entry, isOwnProfile, onSave }) => {
    const [editing,     setEditing]    = useState(false);
    const [rating,      setRating]     = useState(entry.rating ?? null);
    const [reviewText,  setReviewText] = useState(entry.review ?? '');
    const [saving,      setSaving]     = useState(false);

    // Save rating immediately when changed (no need to open edit mode just for stars)
    const handleRatingChange = async (newRating) => {
        setRating(newRating);
        await onSave(entry.show_id, { rating: newRating, review: reviewText });
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(entry.show_id, { rating, review: reviewText });
        setEditing(false);
        setSaving(false);
    };

    const handleCancel = () => {
        setRating(entry.rating ?? null);
        setReviewText(entry.review ?? '');
        setEditing(false);
    };

    return (
        <div className="flex gap-4 py-5 border-b border-[#2c3440] last:border-0 group">
            {/* Poster */}
            <Link to={`/show/${entry.show_id}`} className="flex-shrink-0">
                <div className="w-16 h-24 rounded overflow-hidden bg-[#2c3440] shadow hover:ring-1 ring-[#D87B53] transition-all">
                    {entry.poster_path && (
                        <img
                            src={`${TMDB_IMAGE_BASE}${entry.poster_path}`}
                            alt={entry.show_name}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <Link to={`/show/${entry.show_id}`}>
                            <h3 className="text-[#EBDFD9] font-semibold hover:text-[#D87B53] transition-colors">
                                {entry.show_name}
                            </h3>
                        </Link>
                    </div>

                    {/* Edit review text toggle */}
                    {isOwnProfile && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#2c3440] flex-shrink-0"
                            title="Edit review"
                        >
                            <EditIcon sx={{ fontSize: 15, color: '#89BAA2' }} />
                        </button>
                    )}
                </div>

                {/* ── Read-only mode ──────────────────────────────────────── */}
                {!editing && (
                    <>
                        {/* Star rating — interactive even outside edit mode */}
                        {isOwnProfile ? (
                            <StarRating
                                value={rating}
                                onChange={handleRatingChange}
                                size="sm"
                                showLabel
                                className="mb-2"
                            />
                        ) : (
                            rating && (
                                <StarRating
                                    value={rating}
                                    size="sm"
                                    showLabel
                                    className="mb-2"
                                />
                            )
                        )}

                        {/* Review text */}
                        {entry.review ? (
                            <p className="text-sm text-[#EBDFD9]/75 leading-relaxed ">
                                {entry.review}
                            </p>
                        ) : (
                            isOwnProfile && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-xs text-[#89BAA2]/50 hover:text-[#89BAA2] transition-colors"
                                >
                                    + Add a review
                                </button>
                            )
                        )}
                    </>
                )}

                {/* ── Edit mode ── */}
                {editing && (
                    <ReviewEditPanel
                        rating={rating}
                        onRatingChange={handleRatingChange}
                        reviewText={reviewText}
                        onReviewTextChange={setReviewText}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        className="mt-1"
                    />
                )}
            </div>
        </div>
    );
};

// ── ReviewsList ───────────────────────────────────────────────────────────────

const ReviewsList = ({ watchedShows, watchingShows = [], isOwnProfile, onSaveReview }) => {
    // Merge watched + watching, include entries with a rating or review
    const allReviewable = [...watchedShows, ...watchingShows]
        .filter(s => s.rating != null || s.review);

    const sorted = allReviewable.sort((a, b) => {
        const aDate = new Date(a.updated_at ?? a.created_at ?? 0);
        const bDate = new Date(b.updated_at ?? b.created_at ?? 0);
        return bDate - aDate;
    });

    if (sorted.length === 0) {
        return (
            <div className="py-16 text-center">
                <StarBorderIcon sx={{ fontSize: 40, color: '#2c3440' }} />
                <p className="text-[#89BAA2] mt-3 text-sm">No reviews yet.</p>
                {isOwnProfile && (
                    <p className="text-[#89BAA2]/60 text-xs mt-1">
                        Rate or review any show you're watching or have watched.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="py-2">
            {sorted.map((entry) => (
                <ReviewCard
                    key={entry.show_id}
                    entry={entry}
                    isOwnProfile={isOwnProfile}
                    onSave={onSaveReview}
                />
            ))}
        </div>
    );
};

export default ReviewsList;
