/**
 * ReviewEditPanel.jsx
 * Shared edit form for rating, review text, and date watched.
 *
 * Used by:
 *   - ReviewCard (ReviewsList.jsx)   — no date picker, no remove button
 *   - DiaryEntry (ShowsGrid.jsx)     — with date picker and remove button
 *   - WatchingCard (ShowsGrid.jsx)   — with date picker, no remove button
 *
 * Props:
 *   rating            {number|null}  - current star rating (1–10)
 *   onRatingChange    {function}     - (newRating) => void
 *   reviewText        {string}       - current review text
 *   onReviewTextChange{function}     - (newText) => void
 *   watchedDate       {string}       - YYYY-MM-DD, omit to hide the date field
 *   onWatchedDateChange{function}    - (newDate) => void, omit to hide the date field
 *   saving            {boolean}
 *   onSave            {function}
 *   onCancel          {function}
 *   onRemove          {function}     - omit to hide the Remove button
 *   removing          {boolean}      - pending state for remove button
 *   className         {string}       - extra wrapper classes
 */

import React from 'react';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { CircularProgress } from '@mui/material';
import StarRating from './StarRating';

const ReviewEditPanel = ({
                             rating,
                             onRatingChange,
                             reviewText,
                             onReviewTextChange,
                             watchedDate,
                             onWatchedDateChange,
                             saving    = false,
                             onSave,
                             onCancel,
                             onRemove,
                             removing  = false,
                             className = '',
                         }) => {
    const showDateField = typeof onWatchedDateChange === 'function';
    const showRemove    = typeof onRemove === 'function';

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Rating */}
            <div>
                <label className="text-xs text-[#89BAA2] block mb-1.5">Rating</label>
                <StarRating
                    value={rating}
                    onChange={onRatingChange}
                    size="md"
                    showLabel
                    disabled={saving}
                />
            </div>

            {/* Review */}
            <div>
                <label className="text-xs text-[#89BAA2] block mb-1.5">Review</label>
                <textarea
                    value={reviewText}
                    onChange={(e) => onReviewTextChange(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Write your thoughts…"
                    disabled={saving}
                    className="w-full bg-[#2c3440] text-sm text-[#EBDFD9] rounded-md px-3 py-2
                               resize-none border border-[#DCB35A]/20 focus:outline-none
                               focus:border-[#DCB35A]/50 placeholder-[#89BAA2]/40 disabled:opacity-60"
                />
                <span className="text-xs text-[#89BAA2]/40 float-right">
                    {reviewText.length}/500
                </span>
            </div>

            {/* Date watched — only rendered when prop is provided */}
            {showDateField && (
                <div>
                    <label className="text-xs text-[#89BAA2] block mb-1.5">Date watched</label>
                    <input
                        type="date"
                        value={watchedDate}
                        onChange={(e) => onWatchedDateChange(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        disabled={saving}
                        className="bg-[#2c3440] text-[#EBDFD9] text-sm rounded-md px-3 py-1.5
                                   border border-[#DCB35A]/20 focus:outline-none
                                   focus:border-[#DCB35A]/50 disabled:opacity-60 [color-scheme:dark]"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm
                               font-semibold text-white bg-[#378370] hover:bg-[#89BAA2]
                               transition-colors disabled:opacity-60"
                >
                    {saving
                        ? <CircularProgress size={12} sx={{ color: 'white' }} />
                        : <CheckIcon sx={{ fontSize: 14 }} />}
                    Save
                </button>

                <button
                    onClick={onCancel}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-md text-sm text-[#EBDFD9]
                               bg-[#2c3440] hover:bg-[#3a4452] transition-colors"
                >
                    Cancel
                </button>

                {/* Remove — only rendered when prop is provided, pushed to far right */}
                {showRemove && (
                    <button
                        onClick={onRemove}
                        disabled={removing || saving}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-md text-sm
                                   text-red-400 border border-red-400/20 hover:bg-red-400/10
                                   transition-colors disabled:opacity-60"
                    >
                        {removing
                            ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                            : <CloseIcon sx={{ fontSize: 14 }} />}
                        Remove entry
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReviewEditPanel;
