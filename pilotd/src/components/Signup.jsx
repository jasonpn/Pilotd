import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router';
import { CircularProgress, TextField, Button, Alert } from '@mui/material';
import { upsertUserProfile, toUsername, validateUsername, isUsernameTaken } from '../profileService';

/**
 * Signup Component
 * Handles new user registration.
 * - After successful signup, creates a user_profiles row with username + display_name
 */
const Signup = () => {
    const [displayName,      setDisplayName]      = useState('');
    const [username,         setUsername]         = useState('');
    const [usernameEdited,   setUsernameEdited]   = useState(false); // tracks manual edit
    const [email,            setEmail]            = useState('');
    const [password,         setPassword]         = useState('');
    const [confirmPassword,  setConfirmPassword]  = useState('');
    const [error,            setError]            = useState('');
    const [loading,          setLoading]          = useState(false);
    const [successMessage,   setSuccessMessage]   = useState('');

    const { signUp } = useAuth();
    const navigate   = useNavigate();

    // Auto-derive username from display name unless user has manually edited it
    const handleDisplayNameChange = (value) => {
        setDisplayName(value);
        if (!usernameEdited) {
            setUsername(toUsername(value));
        }
    };

    const handleUsernameChange = (value) => {
        setUsernameEdited(true);
        // Enforce valid characters live as they type
        setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    };

    const validateForm = () => {
        if (!displayName || !username || !email || !password || !confirmPassword) {
            setError('Please fill in all required fields.');
            return false;
        }

        const usernameError = validateUsername(username);
        if (usernameError) { setError(usernameError); return false; }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            // 1. Check username is not already taken
            const taken = await isUsernameTaken(username);
            if (taken) {
                setError('That username is already taken — please choose another.');
                setLoading(false);
                return;
            }

            // 2. Create the auth user with display_name in metadata
            const { data: authData, error: authError } = await signUp(
                email,
                password,
                { display_name: displayName }
            );

            if (authError) {
                // Supabase returns different messages for duplicate email depending on
                // whether email confirmations are enabled — normalise both to a clear message
                const msg = authError.message?.toLowerCase() ?? '';
                if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('email already')) {
                    setError('An account with this email already exists. Please sign in instead.');
                } else {
                    setError(authError.message);
                }
                return;
            }

            // 3. Write username + display_name to user_profiles
            //    authData.user.id is available immediately even before email confirmation
            if (authData?.user?.id) {
                await upsertUserProfile(authData.user.id, {
                    username,
                    display_name: displayName,
                });
            }

            setSuccessMessage('Account created! You can now sign in.');
            setDisplayName(''); setUsername(''); setEmail('');
            setPassword(''); setConfirmPassword('');

            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Signup error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Shared TextField sx — avoids repeating the same style object five times
    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset':          { borderColor: 'rgba(255,255,255,0.23)' },
            '&:hover fieldset':    { borderColor: 'rgba(255,255,255,0.4)'  },
            '&.Mui-focused fieldset': { borderColor: '#D87B53' },
        },
        '& .MuiInputLabel-root':    { color: 'rgba(255,255,255,0.7)' },
        '& .MuiFormHelperText-root':{ color: 'rgba(255,255,255,0.5)' },
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="pattern" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-[#1a1f28] rounded-lg shadow-xl p-8 border border-gray-700">
                    <h1 className="text-3xl font-bold text-white mb-2 text-center">Join Pilotd</h1>
                    <p className="text-gray-400 text-center mb-8">
                        Create your account to start tracking shows
                    </p>

                    {error         && <Alert severity="error"   className="mb-4">{error}</Alert>}
                    {successMessage && <Alert severity="success" className="mb-4">{successMessage}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Display name — can contain spaces and any characters */}
                            <TextField
                                label="Display Name"
                                type="text"
                                value={displayName}
                                onChange={(e) => handleDisplayNameChange(e.target.value)}
                                fullWidth required
                                variant="outlined"
                                disabled={loading}
                                helperText="This is your public name — spaces and special characters allowed"
                                sx={fieldSx}
                            />

                            {/* Username — auto-derived, user can edit, strict format */}
                            <TextField
                                label="Username"
                                type="text"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                fullWidth required
                                variant="outlined"
                                disabled={loading}
                                helperText="Your unique @handle — letters, numbers, underscores only"
                                inputProps={{ maxLength: 30 }}
                                sx={fieldSx}
                            />

                            <TextField
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth required
                                variant="outlined"
                                disabled={loading}
                                sx={fieldSx}
                            />

                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                fullWidth required
                                variant="outlined"
                                disabled={loading}
                                helperText="Must be at least 6 characters"
                                sx={fieldSx}
                            />

                            <TextField
                                label="Confirm Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                fullWidth required
                                variant="outlined"
                                disabled={loading}
                                sx={fieldSx}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    bgcolor: '#89BAA2',
                                    color: 'white',
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover':    { bgcolor: '#378370' },
                                    '&:disabled': { bgcolor: '#555' },
                                }}
                            >
                                {loading
                                    ? <CircularProgress size={24} color="inherit" />
                                    : 'Create Account'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-[#89BAA2] hover:text-[#378370] font-semibold transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
