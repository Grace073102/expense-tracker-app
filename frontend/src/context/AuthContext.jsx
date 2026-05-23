/**
 * AuthContext.jsx - Authentication Context Provider
 * 
 * Manages user authentication state across the application.
 * Handles login, register, logout, and token verification.
 * Provides role-based access control (isAdmin flag).
 * 
 * Error handling: All auth operations return { success, error } objects
 * to the calling component. Network errors and expired sessions are
 * surfaced via authError state. No console-only error handling.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';

// API base URL - centralized for easy configuration
const API_URL = 'http://localhost:5000/api';

// Create the auth context
const AuthContext = createContext();

/**
 * Custom hook to access auth context
 * Throws if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/**
 * AuthProvider - Wraps the app and provides authentication state
 * 
 * State:
 * - user: Current authenticated user object (includes id, username, email, role)
 * - token: JWT token string
 * - loading: True while initial token verification is in progress
 * - authError: User-facing error message for auth failures
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [authError, setAuthError] = useState(null);

  // On mount, check for saved token and verify it
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-clear auth errors after 5 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => setAuthError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  /**
   * Verify an existing JWT token with the backend
   * If valid, sets the user state; if invalid, clears auth state
   */
  const verifyToken = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // User object includes role from backend
        setAuthError(null);
      } else {
        // Token is invalid or expired - clear everything
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setAuthError('Session expired. Please login again.');
      }
    } catch (error) {
      // Network error - server might be down
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setAuthError('Unable to connect to server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user account
   * Returns { success: true } or { success: false, error: 'message' }
   */
  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthError(null);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Unable to connect to server. Please check if the backend is running.' };
    }
  };

  /**
   * Login with username/email and password
   * Returns { success: true } or { success: false, error: 'message' }
   */
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthError(null);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Unable to connect to server. Please check if the backend is running.' };
    }
  };

  /**
   * Logout the current user
   * Sends logout event to backend for activity logging, then clears local state
   * Network errors during logout are intentionally ignored (user is logging out anyway)
   */
  const logout = async () => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        // Intentionally ignored - logout should always succeed locally
      }
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  /**
   * Helper to get authorization headers for API calls
   */
  const getAuthHeaders = () => {
    const currentToken = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` };
  };

  // Context value exposed to all child components
  const value = {
    user,                          // Current user object or null
    loading,                       // True during initial auth check
    login,                         // Login function
    register,                      // Register function
    logout,                        // Logout function
    token,                         // Current JWT token
    authError,                     // Auth error message or null
    getAuthHeaders,                // Helper for API headers
    isAuthenticated: !!user,       // Boolean: is user logged in?
    isAdmin: user?.role === 'admin' // Boolean: is user an admin?
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};