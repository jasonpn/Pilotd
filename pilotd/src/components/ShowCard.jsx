import React from 'react'
import { Link } from 'react-router'
import WatchActions from './WatchActions'

const ShowCard = ({ show: { name, vote_average, poster_path, first_air_date, id, original_language } }) => {
    return (
        <li className="show-card">
            <Link to={`/show/${id}`} className="show-card-link">
                <div className="show-card-image">
                    <img
                        src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` : '/no-movie.png'}
                        alt={name}
                    />

                    {/* Hover overlay for watch actions only */}
                    <div className="show-card-overlay">
                        <WatchActions
                            show={{ id, name, poster_path, first_air_date, vote_average }}
                            compact
                            className="ml-auto"
                        />
                    </div>
                </div>

                {/* Title only no rating, year, or language */}
                <div className="show-card-content">
                    <div className="content">
                        <div className="title">{name}</div>
                    </div>
                </div>

                {/* Mobile-only watch actions */}
                <div className="sm:hidden mt-2">
                    <WatchActions
                        show={{ id, name, poster_path, first_air_date, vote_average }}
                        compact
                    />
                </div>
            </Link>
        </li>
    )
}

export default ShowCard
