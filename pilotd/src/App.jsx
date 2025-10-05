import React, {useEffect, useState} from 'react'
import SearchBar from './components/SearchBar'
import ShowCard from './components/ShowCard'
import './App.css'
import { useDebounce } from 'react-use'
import {CircularProgress} from '@mui/material'

const BASE_API_URL = 'https://api.themoviedb.org/3/'
const DISCOVER_API_URL = `discover/tv?include_adult=true&include_null_first_air_dates=false&sort_by=popularity.desc`;
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`
    }
};

function App() {
    const [showList, setShowList] = useState([]);
    //const [state, setState] = useState({})
    const [searchVal, setSearchVal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useDebounce(() => setDebouncedSearch(searchVal), 500, [searchVal]);
    const fetchShows = async (query='') => {
        setIsLoading(true);
        let endpoint;

        if(query.trim()){
            endpoint = `${BASE_API_URL}search/tv?query=${encodeURIComponent(query)}&include_adult=true`;
        } else{
            endpoint = `${BASE_API_URL}${DISCOVER_API_URL}`
        }

        try{
            const response = await fetch(endpoint, API_OPTIONS);

            if(!response.ok){
                throw Error(response.statusText);
            }
            const json = await response.json();

            if(json.success === false){
                console.error(json.error);
                setShowList([]);
                return;
            }
            setShowList(json.results);

        } catch(error){
            console.error(`Error fetching TV shows: ${error}`);
            setShowList([]);
        } finally{
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchShows(debouncedSearch);
    },[debouncedSearch]);

    //console.log(showList);

    //console.log(searchVal);
    console.log(debouncedSearch);
    /*const search = (e) => {
        if (e.key === 'Enter') {

        }
    }*/

  return (
    <main>
      <div className="pattern" />

        <div className="wrapper">
            <h1 className="text-4xl font-bold text-white">
                Pilotd
            </h1>
            <SearchBar fetchedData={showList} searchVal={searchVal} setSearchVal={setSearchVal} />
            <section className="all-shows">
                <h2 className="text-xl font-bold text-white">All Shows</h2>

                {isLoading ? (
                    <CircularProgress color="inherit" />
                ):(
                    <ul>
                        {showList.length > 0 ? (
                            showList.map((show) => (
                                <ShowCard key={show.id} show={show} />
                            ))
                        ):(
                            <p className="text-xl font-bold text-white">No shows found.</p>
                        )}
                    </ul>
                )}

            </section>
        </div>
    </main>
  )
}

export default App
