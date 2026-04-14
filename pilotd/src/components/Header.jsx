import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
/**
 * Header Component
 * Navigation bar with authentication controls
 */
const Header = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#14181c]/95 border-b border-[#D87B53]/15 shadow-lg">
            <div className="wrapper">
                <div className="flex items-center justify-between py-3.5">
                    {/* Logo with gradient */}
                    <Link
                        to="/"
                        className="text-2xl font-bold transition-all duration-200 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Pilotd
                    </Link>

                    {/* Auth Controls */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#2c3440]/60 border border-[#DCB35A]/10">
                                    <PersonIcon size={18} className="text-[#89BAA2]" />
                                    <span className="text-sm hidden sm:inline text-[#EBDFD9]">
                                        {user.user_metadata?.display_name}
                                    </span>
                                </div>
                                <Button
                                    onClick={handleSignOut}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<LogoutIcon size={16} />}
                                    sx={{
                                        color: '#EBDFD9',
                                        borderColor: '#378370',
                                        textTransform: 'none',
                                        borderRadius: '6px',
                                        px: 2,
                                        py: 0.75,
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: '#D87B53',
                                            bgcolor: 'rgba(220, 179, 90, 0.1)',
                                            color: '#D87B53'
                                        }
                                    }}
                                >
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            color: '#EBDFD9',
                                            borderColor: 'rgba(220, 179, 90, 0.3)',
                                            textTransform: 'none',
                                            borderRadius: '6px',
                                            px: 2.5,
                                            py: 0.75,
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: '#D87B53',
                                                bgcolor: 'rgba(220, 179, 90, 0.1)',
                                                color: '#D87B53'
                                            }
                                        }}
                                    >
                                        Sign In
                                    </Button>
                                </Link>
                                <Link to="/signup">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        sx={{
                                            background: 'linear-gradient(135deg, #D87B53 0%, #EF8D72 100%)',
                                            color: '#14181c',
                                            textTransform: 'none',
                                            borderRadius: '6px',
                                            px: 2.5,
                                            py: 0.75,
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            boxShadow: '0 2px 8px rgba(220, 179, 90, 0.25)',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #EF8D72 0%, #D87B53 100%)',
                                                boxShadow: '0 4px 12px rgba(220, 179, 90, 0.4)',
                                                transform: 'translateY(-1px)'
                                            }
                                        }}
                                    >
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
