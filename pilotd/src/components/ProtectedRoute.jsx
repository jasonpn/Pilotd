import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { CircularProgress } from '@mui/material';

/**
 * ProtectedRoute Component
 * Wrapper component that requires authentication to access
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="pattern" />
        <div className="relative z-10">
          <CircularProgress size={48} style={{ color: '#00c030' }} />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
