/**
 * StarRating.jsx
 * Reusable star rating component supporting half-star increments.
 *
 * Rating scale: stored as integer 1–10 in the DB.
 *   1  = ½★   2  = 1★   3  = 1½★   4  = 2★   5  = 2½★
 *   6  = 3★   7  = 3½★  8  = 4★    9  = 4½★  10 = 5★
 *
 * Props:
 *   value       {number|null}  - current rating (1–10), null if unrated
 *   onChange    {function}     - (newValue: number|null) => void — omit for read-only
 *   size        {'sm'|'md'|'lg'} - icon size preset
 *   showLabel   {boolean}      - render "X.X / 5" label beside stars
 *   disabled    {boolean}      - disables interaction
 *   className   {string}       - wrapper class
 */

import React, { useState } from 'react';
import StarIcon      from '@mui/icons-material/Star';
import StarHalfIcon  from '@mui/icons-material/StarHalf';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const TOTAL_STARS = 5;

// Icon pixel sizes per size preset
const SIZE_MAP = { sm: 14, md: 20, lg: 28 };

/**
 * Determine which icon to render for a given star position.
 * @param {number} position  1-based star index (1–5)
 * @param {number|null} value  rating on 1–10 scale
 */
const starType = (position, value) => {
    if (!value) return 'empty';
    // Each star covers 2 units. Position 1 covers 1–2, position 2 covers 3–4, etc.
    const fullThreshold = position * 2;       // value needed for full star at this position
    const halfThreshold = fullThreshold - 1;  // value needed for half star

    if (value >= fullThreshold) return 'full';
    if (value >= halfThreshold) return 'half';
    return 'empty';
};

const StarIcon_ = ({ type, sizePx }) => {
    const sx = { fontSize: sizePx, color: type === 'empty' ? '#2c3440' : '#DCB35A' };
    if (type === 'full') return <StarIcon sx={sx} />;
    if (type === 'half') return <StarHalfIcon sx={sx} />;
    return <StarBorderIcon sx={{ ...sx, color: '#3a4452' }} />;
};

// ── Interactive (input) mode ──────────────────────────────────────────────────

const InteractiveStar = ({ position, currentValue, hoveredValue, onHalfEnter, onFullEnter, onHalfClick, onFullClick, onLeave, sizePx }) => {
    const displayValue = hoveredValue ?? currentValue;
    const type = starType(position, displayValue);

    return (
        <div
            className="relative inline-flex"
            style={{ width: sizePx, height: sizePx }}
            onMouseLeave={onLeave}
        >
            {/* Render the star icon */}
            <StarIcon_ type={type} sizePx={sizePx} />

            {/* Left half triggers half-star */}
            <div
                className="absolute inset-0 cursor-pointer"
                style={{ width: '50%' }}
                onMouseEnter={onHalfEnter}
                onClick={onHalfClick}
            />
            {/* Right half triggers full star */}
            <div
                className="absolute inset-0 cursor-pointer"
                style={{ left: '50%', width: '50%' }}
                onMouseEnter={onFullEnter}
                onClick={onFullClick}
            />
        </div>
    );
};

// ── Public component ──────────────────────────────────────────────────────────

const StarRating = ({
                        value     = null,
                        onChange,
                        size      = 'md',
                        showLabel = false,
                        disabled  = false,
                        className = '',
                    }) => {
    const [hovered, setHovered] = useState(null);
    const isReadOnly = !onChange || disabled;
    const sizePx = SIZE_MAP[size] ?? SIZE_MAP.md;

    const handleClick = (newValue) => {
        if (isReadOnly) return;
        // Clicking the same value toggles it off (removes rating)
        onChange(value === newValue ? null : newValue);
    };

    const displayValue = hovered ?? value;

    // ── Read-only display ─────────────────────────────────────────────────────
    if (isReadOnly) {
        return (
            <div className={`inline-flex items-center gap-1 ${className}`}>
                <div className="flex items-center gap-0.5">
                    {Array.from({ length: TOTAL_STARS }, (_, i) => (
                        <StarIcon_
                            key={i}
                            type={starType(i + 1, value)}
                            sizePx={sizePx}
                        />
                    ))}
                </div>
                {showLabel && value != null && (
                    <span
                        className="text-[#89BAA2] leading-none"
                        style={{ fontSize: sizePx * 0.7 }}
                    >
                        {(value / 2).toFixed(1)}
                    </span>
                )}
            </div>
        );
    }

    // ── Interactive input ─────────────────────────────────────────────────────
    return (
        <div className={`inline-flex items-center gap-1 ${className}`}>
            <div
                className="flex items-center gap-0.5"
                onMouseLeave={() => setHovered(null)}
            >
                {Array.from({ length: TOTAL_STARS }, (_, i) => {
                    const pos       = i + 1;
                    const halfValue = pos * 2 - 1;  // e.g. star 1 → 1, star 2 → 3
                    const fullValue = pos * 2;       // e.g. star 1 → 2, star 2 → 4
                    return (
                        <InteractiveStar
                            key={i}
                            position={pos}
                            currentValue={value}
                            hoveredValue={hovered}
                            sizePx={sizePx}
                            onHalfEnter={() => setHovered(halfValue)}
                            onFullEnter={() => setHovered(fullValue)}
                            onHalfClick={() => handleClick(halfValue)}
                            onFullClick={() => handleClick(fullValue)}
                            onLeave={() => setHovered(null)}
                        />
                    );
                })}
            </div>

            {/* Label: shows hovered preview or current value */}
            {showLabel && (
                <span className="text-[#89BAA2] text-xs min-w-[2rem]">
                    {displayValue != null ? `${(displayValue / 2).toFixed(1)}` : '—'}
                </span>
            )}
        </div>
    );
};

export default StarRating;
