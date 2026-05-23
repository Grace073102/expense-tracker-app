/**
 * api.js - Centralised Frontend API Service
 *
 * Single HTTP client for ALL backend communication. Every component
 * uses this instead of calling fetch() directly, ensuring consistent
 * auth headers, error handling, and a single place to change the
 * API base URL.
 *
 * Sections:
 * - Expense CRUD (used by App.jsx)
 * - Expense stats (used by Dashboard.jsx)
 * - User profile (used by UserProfile.jsx)
 * - Admin endpoints (used by AdminPanel.jsx)
 *
 * Error handling: All methods throw Error objects with user-friendly
 * messages. Callers catch these in try/catch and show them via
 * MUI Alert/Snackbar. No console-only error handling.
 */

// Backend API base URL — change this single value when deploying
const API_BASE_URL = 'http://localhost:5000/api';

/** Get the JWT token from localStorage */
const getToken = () => localStorage.getItem('token');

/** Build request headers with auth token */
const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

/**
 * Handle API response — checks for auth errors, validation errors,
 * server errors, and returns parsed JSON.
 *
 * @param {Response} response - Fetch response object
 * @returns {Object} Parsed JSON response
 * @throws {Error} With user-friendly message
 */
const handleResponse = async (response) => {
  // Handle expired/invalid token — dispatch event so AuthContext can logout
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-error'));
    throw new Error('Session expired. Please login again.');
  }

  // Handle non-OK responses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * Handle network errors (server unreachable)
 * @param {Error} error - Original error
 * @throws {Error} With network-specific message
 */
const handleNetworkError = (error) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('Unable to connect to server. Please check if the backend is running on port 5000.');
  }
  throw error;
};

/**
 * Generic request helper — reduces boilerplate across all methods.
 *
 * @param {string} path - API path (appended to API_BASE_URL)
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Object} Parsed JSON response
 */
const request = async (path, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: getHeaders(),
      ...options,
    });
    return await handleResponse(response);
  } catch (error) {
    handleNetworkError(error);
    throw error;
  }
};

// ==================== API Service ====================

export const api = {

  // ==================== Expense CRUD ====================

  /**
   * Fetch all expenses for the current user
   * @returns {Array} Array of expense objects
   */
  getExpenses: async () => {
    const data = await request('/expenses');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Create a new expense
   * @param {Object} expense - { title, amount, category, date, description }
   * @returns {Object} Created expense with id
   */
  createExpense: async (expense) => {
    return request('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: expense.title, amount: expense.amount,
        category: expense.category, date: expense.date,
        description: expense.description || ''
      }),
    });
  },

  /**
   * Update an existing expense
   * @param {string} id - Expense ID (UUID)
   * @param {Object} expense - Updated fields
   * @returns {Object} Updated expense
   */
  updateExpense: async (id, expense) => {
    return request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: expense.title, amount: expense.amount,
        category: expense.category, date: expense.date,
        description: expense.description || ''
      }),
    });
  },

  /**
   * Delete an expense
   * @param {string} id - Expense ID (UUID)
   * @returns {Object} Deletion confirmation
   */
  deleteExpense: async (id) => {
    return request(`/expenses/${id}`, { method: 'DELETE' });
  },

  // ==================== Expense Stats ====================

  /** Get expense summary stats for the current user */
  getStats: async () => request('/stats/summary'),

  /** Get spending breakdown by category for the current user */
  getCategoryStats: async () => request('/stats/categories'),

  // ==================== User Profile ====================

  /** Fetch current user's profile */
  getProfile: async () => request('/user/profile'),

  /**
   * Update profile (username and/or email)
   * @param {Object} fields - { username?, email? }
   * @returns {Object} { message, token, user }
   */
  updateProfile: async (fields) => {
    return request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
  },

  /**
   * Change password (requires current password)
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Object} { message }
   */
  changePassword: async (currentPassword, newPassword) => {
    return request('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  /**
   * Delete current user's account permanently
   * @returns {Object} { message }
   */
  deleteAccount: async () => {
    return request('/user/account', { method: 'DELETE' });
  },

  // ==================== Admin Endpoints ====================

  /** Fetch all users with expense counts and totals */
  adminGetUsers: async () => request('/admin/users'),

  /** Fetch activity log (up to limit entries) */
  adminGetActivity: async (limit = 100) => request(`/admin/activity?limit=${limit}`),

  /** Fetch admin dashboard stats */
  adminGetStats: async () => request('/admin/stats'),

  /** Fetch a specific user's expenses */
  adminGetUserExpenses: async (userId) => request(`/admin/users/${userId}/expenses`),

  /**
   * Create a new user (admin)
   * @param {Object} data - { username, email, password }
   */
  adminCreateUser: async (data) => {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a user's details (admin)
   * @param {number} userId
   * @param {Object} data - { username?, email? }
   */
  adminUpdateUser: async (userId, data) => {
    return request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Reset a user's password (admin, no current password needed)
   * @param {number} userId
   * @param {string} newPassword
   */
  adminResetPassword: async (userId, newPassword) => {
    return request(`/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  /**
   * Delete a user and all their data (admin)
   * @param {number} userId
   */
  adminDeleteUser: async (userId) => {
    return request(`/admin/users/${userId}`, { method: 'DELETE' });
  },
};