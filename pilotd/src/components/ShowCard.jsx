import React from 'react'
import StarIcon from '@mui/icons-material/Star'
import {BrowserRouter, Link} from 'react-router'

const ShowCard = ({show:
    {name, vote_average, poster_path, first_air_date, id, original_language}
}) => {
    return (
        <div className="show-card">

            <img src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` : '/no-movie.png'} alt={name} />


            <div className="mt-4">

                <div className="content">

                    <p className="title">{name}</p>

                    <div className="rating">
                        <p className="year">
                            {first_air_date.split('-')[0]}
                        </p>

                        <StarIcon sx={{color:'#FF9933'}}/>
                        <p>{vote_average.toFixed(1)}</p>


                    </div>




                </div>
            </div>


        </div>

    )
}
export default ShowCard;