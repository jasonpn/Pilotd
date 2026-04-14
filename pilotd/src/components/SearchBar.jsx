import React from 'react';
import { TextField, Stack, Autocomplete, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

function SearchBar({ fetchedData, searchVal, setSearchVal }) {
    const searchOptions = fetchedData.map((searchOption) => {
        const firstLetter = searchOption.name[0].toUpperCase();
        return {
            firstLetter: /[0-9]/.test(firstLetter) ? '0-9' : firstLetter,
            ...searchOption
        };
    });

    return (
        <Stack sx={{ margin: 'auto', maxWidth: '600px' }}>
            <Autocomplete
                id="tv_search"
                getOptionLabel={(searchOption) => searchOption.name}
                options={searchOptions.sort((a, b) =>
                    a.firstLetter.localeCompare(b.firstLetter)
                )}
                groupBy={(searchOption) => searchOption.firstLetter}
                noOptionsText="No results found"
                forcePopupIcon={false}
                sx={{
                    backgroundColor: '#2c3440',
                    borderRadius: '8px',
                    border: '1px solid rgba(220, 179, 90, 0.15)',
                    transition: 'all 0.2s',
                    '&:hover': {
                        borderColor: 'rgba(220, 179, 90, 0.3)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    },
                    '&:focus-within': {
                        borderColor: '#EBDFD9',
                        boxShadow: '0 0 0 3px rgba(220, 179, 90, 0.15)'
                    }
                }}
                autoSelect={true}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="filled"
                        fullWidth
                        placeholder="Search for TV shows..."
                        sx={{
                            input: {
                                color: '#e4e4e7',
                                fontSize: '0.9375rem',
                                fontWeight: 400
                            },
                            '& .MuiInputBase-root': {
                                backgroundColor: 'transparent !important'
                            },
                            '& .MuiFilledInput-root:before': {
                                display: 'none'
                            },
                            '& .MuiFilledInput-root:after': {
                                display: 'none'
                            }
                        }}
                        value={searchVal}
                        onChange={(e) => {
                            setSearchVal(e.target.value);
                        }}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        <InputAdornment position="start">
                                            <SearchIcon
                                                sx={{
                                                    color: '#89BAA2',
                                                    fontSize: '1.25rem'
                                                }}
                                            />
                                        </InputAdornment>
                                        {params.InputProps?.endAdornment}
                                    </>
                                ),
                                disableUnderline: true,
                                sx: {
                                    padding: '0.875rem 1rem',
                                    fontSize: '0.9375rem'
                                }
                            }
                        }}
                    />
                )}
                componentsProps={{
                    paper: {
                        sx: {
                            backgroundColor: '#2c3440',
                            border: '1px solid rgba(220, 179, 90, 0.2)',
                            borderRadius: '8px',
                            marginTop: '0.5rem',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                            '& .MuiAutocomplete-listbox': {
                                padding: '0.5rem',
                                '& .MuiAutocomplete-option': {
                                    color: '#e4e4e7',
                                    borderRadius: '4px',
                                    padding: '0.625rem 0.875rem',
                                    fontSize: '0.875rem',
                                    '&:hover': {
                                        backgroundColor: 'rgba(220, 179, 90, 0.1)'
                                    },
                                    '&[aria-selected="true"]': {
                                        backgroundColor: 'rgba(220, 179, 90, 0.15)',
                                        color: '#DCB35A'
                                    }
                                },
                                '& .MuiAutocomplete-groupLabel': {
                                    color: '#89BAA2',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: '#1f2429',
                                    padding: '0.5rem 0.875rem',
                                    borderRadius: '4px',
                                    marginTop: '0.25rem'
                                }
                            },
                            '& .MuiAutocomplete-noOptions': {
                                color: '#89BAA2',
                                padding: '1rem',
                                textAlign: 'center'
                            }
                        }
                    }
                }}
            />
        </Stack>
    );
}

export default SearchBar;
