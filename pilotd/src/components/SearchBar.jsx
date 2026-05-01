/**
 * SearchBar.jsx
 * Simple search input with no dropdown.
 *
 * Live search: onChange → setSearchVal → debounce in App → fetchShows
 * Immediate search: Enter key or icon click → onSearch(searchVal)
 *
 * Props:
 *   searchVal    {string}    - controlled input value
 *   setSearchVal {function}  - updates value (triggers debounced fetch in parent)
 *   onSearch     {function}  - (query: string) => void, fires immediately on Enter / icon click
 */

import React, { useRef } from 'react';
import SearchIcon from '@mui/icons-material/Search';

function SearchBar({ searchVal, setSearchVal, onSearch }) {
    const inputRef = useRef(null);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onSearch(searchVal);
    };

    const handleIconClick = () => {
        onSearch(searchVal);
        inputRef.current?.focus();
    };

    return (
        <div className="mx-auto max-w-[600px] mb-6">
            <div
                className="flex items-center gap-2 bg-[#2c3440] rounded-lg px-4 py-3.5
                           transition-all duration-200
                           hover:border-[#DCB35A]/30 focus-within:border-[#DCB35A]/50
                           focus-within:shadow-[0_0_0_3px_rgba(220,179,90,0.10)]"
            >
                {/* Clickable search icon — triggers immediate fetch */}
                <button
                    onClick={handleIconClick}
                    className="flex-shrink-0 text-[#89BAA2] hover:text-[#D87B53] transition-colors"
                    aria-label="Search"
                >
                    <SearchIcon sx={{ fontSize: '1.25rem' }} />
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for TV shows..."
                    className="flex-1 bg-transparent text-[#e4e4e7] text-[0.9375rem]
                               placeholder-[#89BAA2]/50 outline-none"
                />

                {/* Clear button is only visible when there's a value */}
                {searchVal && (
                    <button
                        onClick={() => { setSearchVal(''); onSearch(''); inputRef.current?.focus(); }}
                        className="flex-shrink-0 text-[#89BAA2]/50 hover:text-[#EBDFD9] transition-colors text-lg leading-none"
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}

export default SearchBar;
