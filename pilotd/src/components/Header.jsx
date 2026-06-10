/**
 * Header.jsx
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../AuthContext';
import PersonIcon     from '@mui/icons-material/Person';
import LogoutIcon     from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon  from '@mui/icons-material/Settings';
import { getUserProfile } from '../profileService';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';


const Header = () => {
    const { user, signOut } = useAuth();
    const navigate          = useNavigate();
    const dropdownRef       = useRef(null);

    const [avatarUrl,  setAvatarUrl]  = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!user) { setAvatarUrl(null); return; }
        getUserProfile(user.id).then(({ data }) => {
            setAvatarUrl(data?.avatar_url ?? null);
        });
    }, [user]);

    // Close dropdown when tapping outside it on mobile
    useEffect(() => {
        if (!mobileOpen) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileOpen]);

    const handleSignOut = async () => {
        setMobileOpen(false);
        await signOut();
        navigate('/login');
    };

    const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Profile';

    return (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#14181c]/95 shadow-lg">
            <div className="wrapper">
                <div className="flex items-center justify-between py-3.5">

                    {/* Left: logo */}
                    <Link
                        to="/"
                        className="text-2xl font-bold transition-all duration-200 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Pilotd
                    </Link>

                    {/* Right: nav tabs + auth controls */}
                    <div className="flex items-center gap-5">

                        <nav className="flex items-center gap-5">
                            <Link to="/shows"   className="text-sm font-bold text-[#89BAA2] hover:text-[#EBDFD9] transition-colors">Shows</Link>
                            <Link to="/members" className="text-sm font-bold text-[#89BAA2] hover:text-[#EBDFD9] transition-colors">Members</Link>
                            {user && (
                                <Link
                                    to="/activity"
                                    className="text-[#89BAA2] hover:text-[#EBDFD9] transition-colors"
                                    title="Activity"
                                >
                                    <NotificationsNoneIcon sx={{ fontSize: 22 }} />
                                </Link>
                            )}
                        </nav>

                        {user ? (
                            <div ref={dropdownRef} className="relative group">

                                {/* Trigger — onClick for mobile, group-hover handles desktop */}
                                <button
                                    onClick={() => setMobileOpen((prev) => !prev)}
                                    className="flex items-center gap-1 transition-all duration-200"
                                >
                                    <div className="w-7 h-7 rounded-full overflow-hidden bg-[#2c3440] border border-[#DCB35A]/20 flex items-center justify-center flex-shrink-0">
                                        {avatarUrl
                                            ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                            : <PersonIcon sx={{ fontSize: 16, color: '#89BAA2' }} />
                                        }
                                    </div>
                                    <span className="text-sm font-bold hidden sm:inline text-[#EBDFD9]">{displayName}</span>
                                    <ExpandMoreIcon
                                        sx={{ fontSize: 16, color: '#89BAA2' }}
                                        className={`hidden sm:block transition-transform duration-200 group-hover:rotate-180 ${mobileOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Panel — visible on CSS hover (desktop) or mobileOpen state (mobile) */}
                                <div className={`absolute right-0 top-full pt-1 min-w-[160px] z-50 invisible group-hover:visible ${mobileOpen ? '!visible' : ''}`}>
                                    <div className="bg-[#1f2429] border border-[#2c3440] rounded-lg shadow-xl overflow-hidden">
                                        <Link
                                            to="/profile"
                                            onClick={() => setMobileOpen(false)}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#EBDFD9] hover:bg-[#2c3440] hover:text-[#D87B53] transition-colors"
                                        >
                                            <PersonIcon sx={{ fontSize: 16 }} />
                                            Profile
                                        </Link>
                                        <Link
                                            to="/settings"
                                            onClick={() => setMobileOpen(false)}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#EBDFD9] hover:bg-[#2c3440] hover:text-[#D87B53] transition-colors"
                                        >
                                            <SettingsIcon sx={{ fontSize: 16 }} />
                                            Edit Profile
                                        </Link>
                                        <div className="border-t border-[#2c3440]" />
                                        <button
                                            onClick={handleSignOut}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#EBDFD9] hover:bg-[#2c3440] hover:text-red-400 transition-colors"
                                        >
                                            <LogoutIcon sx={{ fontSize: 16 }} />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Single compact Sign In button — fits on one line on all screen sizes */
                            <Link
                                to="/login"
                                className="whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-semibold
                                           text-[#14181c] transition-all duration-200 hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)' }}
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
