import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router';
import { CircularProgress, TextField, Button, Alert } from '@mui/material';

/**
 * Login Component
 * Handles user authentication with email and password
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
      } else {
        // Successfully logged in, navigate to home
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setResetMessage('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="pattern" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1a1f28] rounded-lg shadow-xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Welcome to Pilotd
          </h1>
          <p className="text-gray-400 text-center mb-8">
            {showResetPassword ? 'Reset your password' : 'Sign in to continue'}
          </p>

          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {resetMessage && (
            <Alert severity="success" className="mb-4">
              {resetMessage}
            </Alert>
          )}

          <form onSubmit={showResetPassword ? handleResetPassword : handleSubmit}>
            <div className="space-y-4">
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#D87B53' }
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                }}
              />

              {!showResetPassword && (
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#D87B53' }
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                />
              )}

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
                  '&:hover': { bgcolor: '#378370' },
                  '&:disabled': { bgcolor: '#555' }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : showResetPassword ? (
                  'Send Reset Email'
                ) : (
                  'Sign In'
                )}
              </Button>

              {!showResetPassword && (
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-gray-400 hover:text-white transition-colors w-full text-center"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              )}

              {showResetPassword && (
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors w-full text-center"
                  disabled={loading}
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-[#89BAA2] hover:text-[#378370] font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
