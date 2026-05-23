# Expense Tracker

A full-stack personal finance management web application that helps users track, categorise, and visualise their daily expenses. Users can log spending across categories like Food, Transport, Shopping, and more, then view summaries through an interactive dashboard with category breakdowns and monthly trend charts. An admin panel provides user management and activity monitoring for administrators.

## The Problem

Managing personal finances is difficult without a centralised tool. Spreadsheets are tedious, and many budgeting apps are overly complex or require subscriptions. This Expense Tracker provides a simple, self-hosted solution where users can quickly log expenses, see where their money goes through visual breakdowns, and take control of their spending habits — all from a clean, modern interface.

## Key Features

- **User Authentication** — Register, login, and manage your profile with JWT-based sessions.
- **Expense CRUD** — Add, edit, and delete expenses with title, amount, category, date, and notes.
- **Interactive Dashboard** — Summary stat rings, category breakdown with progress bars, and monthly trend bar chart. Click any category or month to drill down into individual expenses.
- **Search, Filter & Sort** — Find expenses by keyword, filter by category, and sort by date or amount.
- **User Profile** — Update username/email, change password, or delete your account. All changes go through a confirmation dialog.
- **Admin Panel** — View all users, create/edit/delete accounts, reset passwords, and browse a filterable activity log (login attempts, CRUD actions, admin operations).

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI component library |
| Vite | Build tool and dev server |
| Material UI (MUI) v6 | Component library and theming |
| JavaScript (ES6+) | Programming language |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Web server framework |
| MySQL | Relational database |
| bcryptjs | Password hashing |
| jsonwebtoken (JWT) | Authentication tokens |
| uuid | Unique ID generation for expenses |
| dotenv | Environment variable management |
| cors | Cross-origin request handling |

## Prerequisites

Before running the app, make sure you have the following installed:

- **Node.js** (v18 or higher) — [https://nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- **MySQL** (v8 or higher) — [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd expense-tracker
```

### 2. Set Up the Database

Open MySQL and create the database. The server will automatically create all required tables on startup.

```sql
CREATE DATABASE expense_tracker;
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

### 4. Install Dependencies & Start the Backend

```bash
cd backend
npm install
node server.js
```

You should see:

```
✅ Connected to MySQL
✅ Users table ready
✅ User activity table ready
✅ Using existing expenses table
🚀 Server running on http://localhost:5000
```

### 5. Install Dependencies & Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

### 6. Admin Access

The default admin account is determined by the `ADMIN_USERNAMES` array in `server.js`. By default, any user with the username `admin` is treated as an admin. To get started:

1. Register an account with the username `admin` and password `admin1`.
2. Log in — you will see the Admin Panel instead of the regular dashboard.

To add more admin users, edit the array in `server.js` and restart the server:

```javascript
const ADMIN_USERNAMES = ['admin', 'anotherAdmin'];
```

## Folder Structure

```
expense-tracker/
├── backend/
│   ├── server.js              # Express server — all API routes, auth middleware,
│   │                          #   database setup, and admin endpoints
│   ├── package.json           # Backend dependencies (express, mysql2, bcryptjs, etc.)
│   └── .env                   # Environment variables (DB_PASSWORD, JWT_SECRET, PORT)
│
├── frontend/
│   ├── public/                # Static assets served by Vite
│   ├── src/
│   │   ├── main.jsx           # App entry point — mounts React with ThemeProvider
│   │   ├── App.jsx            # Root component — auth routing, expense CRUD,
│   │   │                      #   tab navigation, and modal management
│   │   ├── App.css            # Minimal global styles (background)
│   │   ├── index.css          # Global resets, Inter font import, custom scrollbar,
│   │   │                      #   and base body styles
│   │   ├── Theme.js           # MUI custom theme — terracotta palette, Inter font,
│   │   │                      #   and component style overrides
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state provider — login, register, logout,
│   │   │                      #   token verification, and role detection (isAdmin)
│   │   │
│   │   ├── services/
│   │   │   └── api.js         # Centralised HTTP client — all backend calls go
│   │   │                      #   through here (expenses, profile, admin endpoints)
│   │   │
│   │   ├── utils/
│   │   │   └── Categories.js  # Shared category config (icons, colors) used by
│   │   │                      #   Dashboard, ExpenseList, and AdminPanel
│   │   │
│   │   ├── components/
│   │   │   ├── Login.jsx       # Login and registration form with validation
│   │   │   ├── Dashboard.jsx   # Stats rings, category breakdown, monthly trends,
│   │   │   │                   #   and clickable drill-down dialogs
│   │   │   ├── ExpenseList.jsx # Searchable, filterable, sortable expense list
│   │   │   ├── ExpenseModal.jsx# Add/edit expense dialog with category chips
│   │   │   ├── ConfirmDialog.jsx # Reusable confirmation dialog with changes list
│   │   │   ├── UserProfile.jsx # Profile dialog — edit profile, change password,
│   │   │   │                   #   delete account (MUI Dialog with tabs)
│   │   │   └── AdminPanel.jsx  # Admin dashboard — user management, activity log,
│   │   │                       #   user detail dialog with expenses/activity tabs
│   │   │
│   │   └── style/
│   │       └── base.css        # Global base styles (fonts, resets)
│   │
│   ├── package.json           # Frontend dependencies (react, @mui/material, vite, etc.)
│   └── vite.config.js         # Vite configuration
│
└── README.md                  # This file
```

## Database Schema

The server automatically creates these tables on startup:

**users** — Registered user accounts

| Column | Type | Description |
|---|---|---|
| id | INT (PK, auto-increment) | Unique user ID |
| username | VARCHAR(15), unique | Display name (3–15 chars, alphanumeric + underscores) |
| email | VARCHAR(100), unique | Email address |
| password_hash | VARCHAR(255) | bcrypt-hashed password |
| created_at | TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | Last profile update |

**expenses** — User expense records

| Column | Type | Description |
|---|---|---|
| id | VARCHAR(36) (PK) | UUID generated by the backend |
| user_id | INT | Owner of the expense |
| description | VARCHAR(255) | Expense title/description (mapped as `title` in API) |
| amount | DECIMAL(10,2) | Expense amount in dollars |
| category | VARCHAR(50) | Category (Food, Transport, Shopping, etc.) |
| date | DATE | Date of the expense |
| created_at | TIMESTAMP | Record creation date |
| updated_at | TIMESTAMP | Last modification date |

**user_activity** — Audit log of all user and admin actions

| Column | Type | Description |
|---|---|---|
| id | INT (PK, auto-increment) | Unique log entry ID |
| user_id | INT | User who performed the action (nullable) |
| username | VARCHAR(15) | Username at the time of action |
| action | VARCHAR(100) | Action type (login, expense_create, admin_delete_user, etc.) |
| details | TEXT | Human-readable description of what happened |
| ip_address | VARCHAR(45) | Client IP address |
| created_at | TIMESTAMP | When the action occurred |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login (returns JWT token) |
| POST | `/api/auth/logout` | Log the logout event |
| GET | `/api/auth/me` | Verify token and get current user |

### User Profile

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/profile` | Get profile details |
| PUT | `/api/user/profile` | Update username/email |
| PUT | `/api/user/password` | Change password |
| DELETE | `/api/user/account` | Delete own account |
| GET | `/api/user/stats` | Get personal expense statistics |

### Expenses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/expenses` | List all expenses (current user) |
| GET | `/api/expenses/:id` | Get a single expense |
| POST | `/api/expenses` | Create a new expense |
| PUT | `/api/expenses/:id` | Update an expense |
| DELETE | `/api/expenses/:id` | Delete an expense |
| GET | `/api/stats/summary` | Expense summary (total, avg, highest) |
| GET | `/api/stats/categories` | Spending by category |

### Admin (requires admin role)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users with expense stats |
| GET | `/api/admin/users/:id` | Get a specific user's details |
| POST | `/api/admin/users` | Create a new user account |
| PUT | `/api/admin/users/:id` | Edit user's username/email |
| PUT | `/api/admin/users/:id/password` | Reset a user's password |
| GET | `/api/admin/users/:id/expenses` | View a user's expenses |
| DELETE | `/api/admin/users/:id` | Delete a user and their data |
| GET | `/api/admin/activity` | Get filterable activity log |
| GET | `/api/admin/stats` | Dashboard stats (totals, 24h activity) |

## Workload Allocation

This project was completed individually. All files, including both the frontend and backend, were designed, developed, and documented by Grace Chi Yen Chong.

## Notes

- **Admin role** is determined by the `ADMIN_USERNAMES` array in `server.js`, not by a database column. This keeps the users table simple and avoids SQL migration issues.
- **All MUI**: Every component uses Material UI for styling. The only remaining CSS files are `base.css` (global resets) and `index.css` (Inter font import and custom scrollbar). No component depends on custom CSS classes.
- **Centralised API service**: All frontend components use `api.js` for backend communication instead of calling `fetch()` directly. This ensures consistent auth headers, error handling, and a single place to change the API base URL.
- **Shared utilities**: Category icons and colors are defined once in `categories.js` and imported wherever needed, avoiding code duplication across Dashboard, ExpenseList, and AdminPanel.
- **Title ↔ Description mapping**: The database column is `description`, but the API returns it as `title` for frontend compatibility. Both fields are accepted on create/update.
- **No hardcoded credentials**: The JWT secret and database password are loaded from environment variables (`.env` file). The server will not start without `JWT_SECRET` set.
- **Error handling**: All frontend components show errors to the user via MUI Alerts or Snackbars. There are no `console.log` or `console.error` calls in any frontend file. Server-side, `console` is only used for startup messages and the background `logActivity` helper.