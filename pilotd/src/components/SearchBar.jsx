import react, {useEffect} from 'react';
import { useState } from 'react'
import {Box, IconButton, TextField, Typography, Stack, Autocomplete, InputAdornment} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';

function SearchBar({ fetchedData, searchVal, setSearchVal }) {

    const searchOptions = fetchedData.map((searchOption) => {
        const firstLetter = searchOption.name[0].toUpperCase();
        return {
            firstLetter: /[0-9]/.test(firstLetter) ? '0-9' : firstLetter,
            ...searchOption,
        };
    });

    return (
        <Stack sx={{margin: "auto"}}>
            <Autocomplete
                id="tv_search"
                getOptionLabel={(searchOption) => searchOption.name}
                options={searchOptions.sort((a, b) => a.firstLetter.localeCompare(b.firstLetter))}
                groupBy={(searchOption) => searchOption.firstLetter}
                noOptionsText={'No results found'}
                forcePopupIcon={false}
                sx={{backgroundColor:'#2C343F', opacity: 0.5}}
                autoSelect = {true}
                //onKeyDown={search}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="filled"
                        fullWidth
                        placeholder="Search shows"
                        sx={{ input: {color: 'white'}, "::placeholder": {color: '#556678', opacity: 1}}}
                        value = {searchVal}
                        onChange={(e) => {setSearchVal(e.target.value)}}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{color: '#556678'}} />
                                        </InputAdornment>
                                        {params.InputProps?.endAdornment}
                                    </>),
                                disableUnderline: true
                               },
                           }}
                    />
                )}
            />
        </Stack>
    )
}

export default SearchBar;
