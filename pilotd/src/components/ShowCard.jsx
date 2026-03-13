import React from 'react'
import StarIcon from '@mui/icons-material/Star'
import LanguageIcon from '@mui/icons-material/Language';
import {BrowserRouter, Link} from 'react-router'

const ShowCard = ({show:
    {name, vote_average, poster_path, first_air_date, id, original_language}
}) => {

    console.log(id);

    return (
        <li className="show-card">
            <Link to={`/show/${id}`} className="show-card-link">
                <div className="show-card-image">
                    <img src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` : '/no-movie.png'}
                         alt={name} />
                    <div className="show-card-overlay">
                        <div className="show-card-rating-overlay">
                            <LanguageIcon lng ={{color: '#FF9933'}} />
                            <span>{original_language}</span>
                        </div>
                    </div>
                </div>

                <div className="show-card-content">
                    <div className="content">
                        <div className="title">{name}</div>

                        <div className="rating">
                            <p className="year">{first_air_date.split('-')[0]}</p>
                            <StarIcon sx={{color: '#FF9933'}} />
                            <p>{vote_average.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
            </Link>
        </li>
    )
}
export default ShowCard;