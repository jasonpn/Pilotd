/**
 * FavoriteShows.jsx
 * Displays up to 4 pinned "favorite" shows as tall poster cards.
 * Owners can click the edit button to open the EditFavoritesModal.
 */

import React from 'react';
import { Link } from 'react-router';
import EditIcon    from '@mui/icons-material/Edit';
import AddIcon     from '@mui/icons-material/Add';
import StarIcon    from '@mui/icons-material/Star';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';
const SLOT_COUNT = 4;

/**
 * Single favorite poster slot.
 * Renders a poster if filled, or an empty dashed slot.
 */
const FavoriteSlot = ({ favorite, position, isOwnProfile, onEdit }) => {
    if (!favorite) {
        return isOwnProfile ? (
            <button
                onClick={onEdit}
                className="aspect-[2/3] rounded-md border-2 border-dashed border-[#2c3440] hover:border-[#D87B53]/50 transition-colors flex flex-col items-center justify-center gap-2 text-[#89BAA2]/50 hover:text-[#D87B53]/70 group"
            >
                <AddIcon sx={{ fontSize: 28 }} className="transition-transform group-hover:scale-110" />
                <span className="text-xs">Add #{position}</span>
            </button>
        ) : (
            <div className="aspect-[2/3] rounded-md bg-[#1f2429] border border-[#2c3440]" />
        );
    }

    return (
        <Link
            to={`/show/${favorite.show_id}`}
            className="block group relative aspect-[2/3] rounded-md overflow-hidden shadow-lg hover:-translate-y-1 transition-transform duration-200"
        >
            {favorite.poster_path ? (
                <img
                    src={`${TMDB_IMAGE_BASE}${favorite.poster_path}`}
                    alt={favorite.show_name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-[#2c3440] flex items-center justify-center">
                    <StarIcon sx={{ color: '#DCB35A', fontSize: 32 }} />
                </div>
            )}

            {/* Hover overlay with title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                <span className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                    {favorite.show_name}
                </span>
            </div>

            {/* Subtle border glow on hover */}
            <div className="absolute inset-0 rounded-md ring-0 group-hover:ring-2 ring-[#D87B53]/50 transition-all duration-200 pointer-events-none" />
        </Link>
    );
};

const FavoriteShows = ({ favorites, isOwnProfile, onEditClick }) => {
    // Pad the array to always have SLOT_COUNT entries
    const slots = Array.from({ length: SLOT_COUNT }, (_, i) => favorites[i] ?? null);

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#EBDFD9] uppercase tracking-widest">
                    Favourite Shows
                </h2>
                {isOwnProfile && (
                    <button
                        onClick={onEditClick}
                        className="flex items-center gap-1.5 text-xs text-[#89BAA2] hover:text-[#D87B53] transition-colors"
                    >
                        <EditIcon sx={{ fontSize: 14 }} />
                        Edit
                    </button>
                )}
            </div>

            <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {slots.map((fav, i) => (
                    <FavoriteSlot
                        key={fav?.show_id ?? `empty-${i}`}
                        favorite={fav}
                        position={i + 1}
                        isOwnProfile={isOwnProfile}
                        onEdit={onEditClick}
                    />
                ))}
            </div>
        </section>
    );
};

export default FavoriteShows;
