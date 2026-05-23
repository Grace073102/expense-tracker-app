/**
 * server.js - Express Backend Server
 * 
 * REST API for the Expense Tracker application.
 * 
 * ARCHITECTURE:
 * - Express server with MySQL database
 * - JWT-based authentication (7-day token expiry)
 * - Role-based access: admin role determined by ADMIN_USERNAMES array (no DB column needed)
 * - Activity logging for all key actions
 * 
 * DATABASE TABLES:
 * - users: id, username, email, password_hash, created_at, updated_at
 * - expenses: id (UUID), user_id, description, amount, category, date, created_at, updated_at
 * - user_activity: id, user_id, username, action, details, ip_address, created_at
 * 
 * NOTE: The expenses table uses 'description' column, but the API maps it as 'title'
 * for frontend compatibility. UUIDs are generated via the uuid package for expense IDs.
 * 
 * ERROR HANDLING:
 * - All routes return proper HTTP status codes with JSON error messages
 * - console.error is only used for startup messages and background activity logging
 * - Database errors return 500 with user-friendly messages
 */
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required. Set it in your .env file.');
  process.exit(1);
}
const JWT_EXPIRES_IN = '7d'; // Tokens expire after 7 days

// CORS: Allow requests from Vite dev server and production builds
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ==================== DATABASE CONNECTION ====================

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || 'gracee0731',
    database: 'expense_tracker'
});

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL Error:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL');

    // Ensure users table exists (does not include role column - role is determined by ADMIN_USERNAMES)
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(15) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Users table error:', err);
        else console.log('✅ Users table ready');
    });

    // Activity log table - tracks all user actions for admin review
    db.query(`
        CREATE TABLE IF NOT EXISTS user_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            username VARCHAR(15),
            action VARCHAR(100) NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Activity table error:', err);
        else console.log('✅ User activity table ready');
    });

    console.log('✅ Using existing expenses table');
});

// ==================== ADMIN ROLE CONFIGURATION ====================

/**
 * Admin usernames - add usernames here to grant admin access.
 * No database column needed; the role is derived from this array.
 * After changing, restart the server and have the user re-login.
 */
const ADMIN_USERNAMES = ['admin'];

/** Check if a username has admin privileges */
const isAdminUser = (username) => ADMIN_USERNAMES.includes(username);

// ==================== HELPER FUNCTIONS ====================

/**
 * Log user activity to the database (fire-and-forget).
 * Uses console.error for failures since this is a background operation
 * that shouldn't affect the main request response.
 */
const logActivity = (userId, username, action, details = '', ip = '') => {
    db.query(
        'INSERT INTO user_activity (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
        [userId, username, action, details, ip],
        (err) => { if (err) console.error('Activity log error:', err); }
    );
};

/** Extract client IP address from request headers */
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';
};

// ==================== AUTH MIDDLEWARE ====================

/**
 * Verify JWT token and attach user to request.
 * Returns 401 for missing/expired tokens, 403 for invalid tokens.
 * Attaches role based on ADMIN_USERNAMES check.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
            if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token. Please login again.' });
            return res.status(403).json({ error: 'Token verification failed.' });
        }
        // Attach role based on username (not stored in token or DB)
        user.role = isAdminUser(user.username) ? 'admin' : 'user';
        req.user = user;
        next();
    });
};

/**
 * Require admin role. Must be used after authenticateToken.
 * Returns 403 if user is not an admin.
 */
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// ==================== AUTH ROUTES ====================

/**
 * POST /api/auth/register
 * Create a new user account. Validates username, email, password.
 * Returns JWT token and user object on success.
 */
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const ip = getClientIp(req);

    // Validation
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (username.length > 15) return res.status(400).json({ error: 'Username must be 15 characters or less' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

    try {
        // Check for duplicate username or email
        db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (results.length > 0) {
                if (results[0].username === username) return res.status(400).json({ error: 'Username already taken' });
                if (results[0].email === email) return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password and insert user
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, hashedPassword], (err, result) => {
                    if (err) return res.status(500).json({ error: 'Failed to create user' });

                    // Determine role from ADMIN_USERNAMES
                    const role = isAdminUser(username) ? 'admin' : 'user';
                    const token = jwt.sign(
                        { id: result.insertId, username, email },
                        JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
                    );

                    logActivity(result.insertId, username, 'register', 'Account created', ip);

                    res.status(201).json({
                        message: 'User registered successfully', token,
                        user: { id: result.insertId, username, email, role }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate with username/email and password.
 * Returns JWT token and user object on success.
 * Logs failed attempts for admin review.
 */
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const ip = getClientIp(req);

    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    // Allow login by username or email
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) {
            logActivity(null, username, 'login_failed', 'User not found', ip);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            logActivity(user.id, user.username, 'login_failed', 'Wrong password', ip);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Role derived from ADMIN_USERNAMES, not DB
        const role = isAdminUser(user.username) ? 'admin' : 'user';
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
        );

        logActivity(user.id, user.username, 'login', 'Login successful', ip);

        res.json({
            message: 'Login successful', token,
            user: { id: user.id, username: user.username, email: user.email, role }
        });
    });
});

/**
 * POST /api/auth/logout
 * Log the logout event for activity tracking.
 * Token invalidation is handled client-side (localStorage removal).
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    logActivity(req.user.id, req.user.username, 'logout', 'User logged out', getClientIp(req));
    res.json({ message: 'Logged out successfully' });
});

// ==================== USER PROFILE ROUTES ====================

/**
 * GET /api/auth/me
 * Verify token and return current user info (used on app startup).
 * Role is derived from ADMIN_USERNAMES.
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.query('SELECT id, username, email FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = results[0];
        user.role = isAdminUser(user.username) ? 'admin' : 'user';
        res.json({ user });
    });
});

/**
 * GET /api/user/profile
 * Get full profile info for the authenticated user.
 */
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.query('SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
        [req.user.id], (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (results.length === 0) return res.status(404).json({ error: 'User not found' });
            const user = results[0];
            user.role = isAdminUser(user.username) ? 'admin' : 'user';
            res.json(user);
        }
    );
});

/**
 * PUT /api/user/profile
 * Update username and/or email for the authenticated user.
 * Checks for duplicates and issues a new JWT with updated claims.
 */
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { username, email } = req.body;
    const ip = getClientIp(req);

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    if (updates.username && (updates.username.length < 3 || updates.username.length > 15)) return res.status(400).json({ error: 'Username must be 3-15 characters' });
    if (updates.username && !/^[a-zA-Z0-9_]+$/.test(updates.username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    if (updates.email && !updates.email.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

    // Check for duplicate username/email (excluding current user)
    let checkQuery = 'SELECT id FROM users WHERE (1=0';
    const checkParams = [];
    if (updates.username) { checkQuery += ' OR username = ?'; checkParams.push(updates.username); }
    if (updates.email) { checkQuery += ' OR email = ?'; checkParams.push(updates.email); }
    checkQuery += ') AND id != ?';
    checkParams.push(userId);

    db.query(checkQuery, checkParams, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length > 0) return res.status(400).json({ error: 'Username or email already taken' });

        const setClauses = [];
        const updateParams = [];
        if (updates.username) { setClauses.push('username = ?'); updateParams.push(updates.username); }
        if (updates.email) { setClauses.push('email = ?'); updateParams.push(updates.email); }
        updateParams.push(userId);

        db.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, updateParams, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update profile' });

            // Fetch updated user and issue new JWT
            db.query('SELECT id, username, email FROM users WHERE id = ?', [userId], (err, userResults) => {
                if (err) return res.status(500).json({ error: 'Failed to fetch updated user' });
                const updatedUser = userResults[0];
                updatedUser.role = isAdminUser(updatedUser.username) ? 'admin' : 'user';
                const newToken = jwt.sign(
                    { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email },
                    JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
                );

                const changeDetails = Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(', ');
                logActivity(userId, updatedUser.username, 'profile_update', changeDetails, ip);

                res.json({ message: 'Profile updated successfully', token: newToken, user: updatedUser });
            });
        });
    });
});

/**
 * PUT /api/user/password
 * Change password for authenticated user. Requires current password verification.
 */
app.put('/api/user/password', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const ip = getClientIp(req);

    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    db.query('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(currentPassword, results[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Current password is incorrect' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update password' });
            logActivity(userId, req.user.username, 'password_change', 'Password updated', ip);
            res.json({ message: 'Password updated successfully' });
        });
    });
});

/**
 * DELETE /api/user/account
 * Delete the authenticated user's account and all their data.
 */
app.delete('/api/user/account', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const ip = getClientIp(req);
    logActivity(userId, req.user.username, 'account_delete', 'Account deleted by user', ip);

    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete account' });
        res.json({ message: 'Account deleted successfully' });
    });
});

/**
 * GET /api/user/stats
 * Get expense statistics for the authenticated user.
 */
app.get('/api/user/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.query(`
        SELECT COUNT(*) as totalExpenses, COALESCE(SUM(amount), 0) as totalSpent,
               COALESCE(AVG(amount), 0) as averageExpense, COUNT(DISTINCT category) as categoriesCount
        FROM expenses WHERE user_id = ?
    `, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        db.query('SELECT DATE_FORMAT(created_at, "%Y-%m-%d") as memberSince FROM users WHERE id = ?', [userId], (err, dateResults) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ ...results[0], memberSince: dateResults[0]?.memberSince || null });
        });
    });
});

// ==================== EXPENSE ROUTES ====================
// NOTE: DB column is 'description', API maps it as 'title' for frontend compatibility

/**
 * GET /api/expenses
 * Get all expenses for the authenticated user, sorted by date descending.
 * Maps description → title for frontend.
 */
app.get('/api/expenses', authenticateToken, (req, res) => {
    db.query('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const mapped = results.map(row => ({
            id: row.id, title: row.description || '', amount: row.amount, category: row.category,
            date: row.date, description: row.description || '', created_at: row.created_at, updated_at: row.updated_at
        }));
        res.json(mapped);
    });
});

/**
 * GET /api/expenses/:id
 * Get a single expense by ID (must belong to authenticated user).
 */
app.get('/api/expenses/:id', authenticateToken, (req, res) => {
    db.query('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Expense not found' });
        const row = results[0];
        res.json({ id: row.id, title: row.description || '', amount: row.amount, category: row.category, date: row.date, description: row.description || '' });
    });
});

/**
 * POST /api/expenses
 * Create a new expense. Generates UUID for the id.
 * Maps title → description for DB storage.
 */
app.post('/api/expenses', authenticateToken, (req, res) => {
    const { title, amount, category, date, description } = req.body;
    const userId = req.user.id;
    const ip = getClientIp(req);
    const expenseDescription = title || description || '';

    if (!expenseDescription || !amount || !category || !date) return res.status(400).json({ error: 'Description, amount, category, and date are required' });

    const id = uuidv4();
    db.query('INSERT INTO expenses (id, user_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, expenseDescription, amount, category, date], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(userId, req.user.username, 'expense_create', `${expenseDescription} - $${amount} (${category})`, ip);
            // Return the newly created expense
            db.query('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const row = rows[0];
                res.status(201).json({ id: row.id, title: row.description || '', amount: row.amount, category: row.category, date: row.date, description: row.description || '' });
            });
        }
    );
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense (must belong to authenticated user).
 */
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    const { title, amount, category, date, description } = req.body;
    const { id } = req.params;
    const userId = req.user.id;
    const ip = getClientIp(req);
    const expenseDescription = title || description || '';

    db.query('UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
        [expenseDescription, amount, category, date, id, userId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
            logActivity(userId, req.user.username, 'expense_update', `${expenseDescription} - $${amount} (${category})`, ip);
            db.query('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const row = rows[0];
                res.json({ id: row.id, title: row.description || '', amount: row.amount, category: row.category, date: row.date, description: row.description || '' });
            });
        }
    );
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense (must belong to authenticated user).
 * Logs the deleted expense details for audit trail.
 */
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const ip = getClientIp(req);

    // Fetch expense details before deleting (for activity log)
    db.query('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const expense = rows[0];

        db.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, userId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
            logActivity(userId, req.user.username, 'expense_delete', expense ? `${expense.description} - $${expense.amount}` : `ID: ${req.params.id}`, ip);
            res.json({ message: 'Deleted successfully', id: req.params.id });
        });
    });
});

// ==================== STATS ROUTES ====================

/** GET /api/stats/summary - Expense summary stats for authenticated user */
app.get('/api/stats/summary', authenticateToken, (req, res) => {
    db.query(`
        SELECT COALESCE(SUM(amount), 0) as totalSpent, COALESCE(MAX(amount), 0) as highestExpense,
               COUNT(*) as totalExpenses, COALESCE(AVG(amount), 0) as averageExpense
        FROM expenses WHERE user_id = ?
    `, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

/** GET /api/stats/categories - Spending by category for authenticated user */
app.get('/api/stats/categories', authenticateToken, (req, res) => {
    db.query(`
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC
    `, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==================== ADMIN ROUTES ====================
// All admin routes require authenticateToken + requireAdmin middleware

/**
 * GET /api/admin/users
 * List all users with expense counts and total spent.
 * Role is derived from ADMIN_USERNAMES, not a DB column.
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.query(`
        SELECT u.id, u.username, u.email, u.created_at,
               COUNT(e.id) as expense_count,
               COALESCE(SUM(e.amount), 0) as total_spent
        FROM users u
        LEFT JOIN expenses e ON u.id = e.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        // Add role based on ADMIN_USERNAMES check
        const usersWithRoles = results.map(u => ({
            ...u,
            role: isAdminUser(u.username) ? 'admin' : 'user'
        }));
        res.json(usersWithRoles);
    });
});

/**
 * GET /api/admin/activity
 * Get activity log entries, optionally filtered by user_id and action type.
 * Default limit: 50 entries.
 */
app.get('/api/admin/activity', authenticateToken, requireAdmin, (req, res) => {
    const { user_id, action, limit = 50 } = req.query;
    let sql = 'SELECT * FROM user_activity WHERE 1=1';
    const params = [];

    if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
    if (action) { sql += ' AND action = ?'; params.push(action); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/** GET /api/admin/users/:id - Get a specific user's details */
app.get('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    db.query('SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
        [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ error: 'User not found' });
            const user = results[0];
            user.role = isAdminUser(user.username) ? 'admin' : 'user';
            res.json(user);
        }
    );
});

/**
 * PUT /api/admin/users/:id
 * Admin update user details (username and/or email).
 * Validates input and checks for duplicates.
 */
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { username, email } = req.body;
    const ip = getClientIp(req);
    const userId = req.params.id;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    if (updates.username && (updates.username.length < 3 || updates.username.length > 15)) return res.status(400).json({ error: 'Username must be 3-15 characters' });
    if (updates.username && !/^[a-zA-Z0-9_]+$/.test(updates.username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    if (updates.email && !updates.email.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

    // Check for duplicate username/email (excluding the user being edited)
    let checkQuery = 'SELECT id FROM users WHERE (1=0';
    const checkParams = [];
    if (updates.username) { checkQuery += ' OR username = ?'; checkParams.push(updates.username); }
    if (updates.email) { checkQuery += ' OR email = ?'; checkParams.push(updates.email); }
    checkQuery += ') AND id != ?';
    checkParams.push(userId);

    db.query(checkQuery, checkParams, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length > 0) return res.status(400).json({ error: 'Username or email already taken' });

        const setClauses = [];
        const updateParams = [];
        if (updates.username) { setClauses.push('username = ?'); updateParams.push(updates.username); }
        if (updates.email) { setClauses.push('email = ?'); updateParams.push(updates.email); }
        updateParams.push(userId);

        db.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, updateParams, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

            const changeDetails = Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(', ');
            logActivity(req.user.id, req.user.username, 'admin_edit_user', `Edited user ${userId}: ${changeDetails}`, ip);
            res.json({ message: 'User updated successfully' });
        });
    });
});

/**
 * PUT /api/admin/users/:id/role
 * Role change endpoint - since roles are determined by ADMIN_USERNAMES,
 * this endpoint informs the admin to update the config instead.
 */
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
    res.status(400).json({
        error: 'Roles are managed via the ADMIN_USERNAMES configuration in server.js. To change a user\'s role, update the ADMIN_USERNAMES array and restart the server.'
    });
});

/**
 * POST /api/admin/users
 * Admin creates a new user account.
 * Same validation as registration but done by admin.
 */
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, email, password } = req.body;
    const ip = getClientIp(req);

    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });
    if (username.length < 3 || username.length > 15) return res.status(400).json({ error: 'Username must be 3-15 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length > 0) {
            if (results[0].username === username) return res.status(400).json({ error: 'Username already taken' });
            if (results[0].email === email) return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword], (err, result) => {
                if (err) return res.status(500).json({ error: 'Failed to create user' });
                logActivity(req.user.id, req.user.username, 'admin_create_user', `Created user: ${username} (${email})`, ip);
                res.status(201).json({ message: 'User created successfully', userId: result.insertId });
            }
        );
    });
});

/**
 * PUT /api/admin/users/:id/password
 * Admin resets a user's password. Does not require current password.
 */
app.put('/api/admin/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    const ip = getClientIp(req);
    const userId = req.params.id;

    if (!newPassword) return res.status(400).json({ error: 'New password is required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    db.query('SELECT username FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        const targetUsername = results[0].username;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to reset password' });
            logActivity(req.user.id, req.user.username, 'admin_reset_password', `Reset password for: ${targetUsername} (ID: ${userId})`, ip);
            res.json({ message: `Password reset successfully for ${targetUsername}` });
        });
    });
});

/**
 * GET /api/admin/users/:id/expenses
 * Get all expenses for a specific user (admin view).
 */
app.get('/api/admin/users/:id/expenses', authenticateToken, requireAdmin, (req, res) => {
    db.query('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const mapped = results.map(row => ({
            id: row.id, title: row.description || '', amount: row.amount, category: row.category,
            date: row.date, description: row.description || '', created_at: row.created_at
        }));
        res.json(mapped);
    });
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and their data. Cannot delete yourself.
 */
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const ip = getClientIp(req);
    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account from admin panel' });
    }

    db.query('SELECT username FROM users WHERE id = ?', [req.params.id], (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        const targetUsername = users[0]?.username || 'unknown';

        db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
            logActivity(req.user.id, req.user.username, 'admin_delete_user', `Deleted user: ${targetUsername} (ID: ${req.params.id})`, ip);
            res.json({ message: 'User deleted successfully' });
        });
    });
});

/**
 * GET /api/admin/stats
 * Dashboard statistics: total users, expenses, spending, and 24h activity count.
 * Runs 4 queries in parallel and aggregates results.
 */
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const queries = {
        users: 'SELECT COUNT(*) as count FROM users',
        expenses: 'SELECT COUNT(*) as count FROM expenses',
        totalSpent: 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses',
        recentActivity: 'SELECT COUNT(*) as count FROM user_activity WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach(key => {
        db.query(queries[key], (err, rows) => {
            results[key] = err ? 0 : (rows[0].count || rows[0].total || 0);
            completed++;
            if (completed === keys.length) res.json(results);
        });
    });
});

// ==================== TEST & HEALTH ROUTES ====================

/** GET /api/test - Simple test endpoint */
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

/** GET /api/health - Health check with database connectivity test */
app.get('/api/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Database connection failed' });
        res.json({ status: 'ok', message: 'Server is running', database: 'connected' });
    });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints ready`);
    console.log(`\n🧪 Test API: http://localhost:${PORT}/api/test\n`);
});