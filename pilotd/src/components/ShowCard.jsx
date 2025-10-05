import React from 'react'
import StarIcon from '@mui/icons-material/Star'

const ShowCard = ({show:
    {name, vote_average, poster_path, first_air_date, original_language}
}) => {
    return (
        <div className="show-card">
            <img src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` : '/no-movie.png'} alt={name} />

            <div className="mt-4">

                <div className="content">

                    <div className="rating">
                        <StarIcon sx={{color:'#FF9933'}}/>
                        <p>{vote_average.toFixed(1)}</p>
                    </div>

                    <p className="year">
                        {first_air_date.split('-')[0]}

                    </p>

                </div>
            </div>
        </div>

    )
}
export default ShowCard;