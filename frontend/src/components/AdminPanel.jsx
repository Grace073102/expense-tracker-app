/**
 * AdminPanel.jsx - Admin Dashboard Component
 *
 * Full admin management interface accessible only to admin users.
 * Provides two main tabs:
 *
 * 1. USERS TAB:
 *    - Searchable table of all registered users
 *    - Shows ID, username, email, role, expense count, total spent, join date
 *    - "New User" button to create accounts via dialog
 *    - Click any row → User Detail Dialog (edit, delete, reset password, view expenses/activity)
 *    - Trash icon on each row for quick deletion (with confirmation)
 *
 * 2. ACTIVITY LOG TAB:
 *    - Full log of all user actions (login, logout, CRUD, admin actions)
 *    - Search by username or details text
 *    - Filter by user dropdown and action type dropdown
 *    - Refresh button to re-fetch latest data
 *
 * ERROR HANDLING:
 * - All async operations use try/catch with user-facing Alert messages
 * - Error auto-clears after 5s, success after 3s
 * - No console-only error handling anywhere
 *
 * API ENDPOINTS USED:
 *   GET    /api/admin/users              - List all users with expense stats
 *   GET    /api/admin/activity           - Get filterable activity log
 *   GET    /api/admin/stats              - Dashboard stats (users, expenses, total, 24h activity)
 *   GET    /api/admin/users/:id/expenses - Get a specific user's expenses
 *   POST   /api/admin/users              - Create new user
 *   PUT    /api/admin/users/:id          - Update user details (username/email)
 *   PUT    /api/admin/users/:id/password - Reset user password (admin, no current pw needed)
 *   DELETE /api/admin/users/:id          - Delete user and all their data
 */
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getCategoryColor, getCategoryIcon } from '../utils/categories';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Tooltip, TextField, InputAdornment, Divider, Avatar
} from '@mui/material';
import {
  People, Timeline, Delete, AdminPanelSettings, Search,
  Shield, ShieldOutlined, Refresh, Close, Edit, Person,
  Email, Lock, Add, Receipt, Visibility, VisibilityOff
} from '@mui/icons-material';

export default function AdminPanel() {

  // ==================== State ====================

  // Main panel state
  const [activeTab, setActiveTab] = useState(0);       // 0 = Users tab, 1 = Activity Log tab
  const [users, setUsers] = useState([]);               // All users fetched from backend
  const [activities, setActivities] = useState([]);     // All activity log entries
  const [stats, setStats] = useState({ users: 0, expenses: 0, totalSpent: 0, recentActivity: 0 }); // Dashboard stat cards
  const [loading, setLoading] = useState(true);         // True during initial data fetch
  const [error, setError] = useState('');                // Error message shown in Alert (auto-clears 5s)
  const [success, setSuccess] = useState('');            // Success message shown in Alert (auto-clears 3s)

  // Filter and search state
  const [filterUser, setFilterUser] = useState('');      // Activity log: filter by user ID
  const [filterAction, setFilterAction] = useState('');  // Activity log: filter by action type
  const [searchUser, setSearchUser] = useState('');      // Users tab: search by username/email
  const [searchActivity, setSearchActivity] = useState(''); // Activity log: search username/details text

  // Confirmation dialog state (used for destructive actions like delete)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  // ----- User Detail Dialog -----
  const [selectedUser, setSelectedUser] = useState(null);     // The user whose detail dialog is open
  const [userDetailOpen, setUserDetailOpen] = useState(false); // Controls detail dialog visibility
  const [userActivities, setUserActivities] = useState([]);   // Selected user's activity entries
  const [userExpenses, setUserExpenses] = useState([]);        // Selected user's expense list
  const [editMode, setEditMode] = useState(false);             // Toggles inline edit mode for username/email
  const [editData, setEditData] = useState({ username: '', email: '' }); // Edit form values
  const [editLoading, setEditLoading] = useState(false);       // Loading state while saving edits
  const [detailTab, setDetailTab] = useState(0);               // 0 = Expenses sub-tab, 1 = Activity sub-tab
  const [detailError, setDetailError] = useState('');           // Error shown inside user detail dialog
  const [detailSuccess, setDetailSuccess] = useState('');       // Success shown inside user detail dialog

  // ----- Password Reset (inline in detail dialog) -----
  const [showResetPassword, setShowResetPassword] = useState(false); // Toggles password reset section
  const [newPassword, setNewPassword] = useState('');                // New password input value
  const [showPassword, setShowPassword] = useState(false);           // Toggle password visibility
  const [resetLoading, setResetLoading] = useState(false);           // Loading state while resetting

  // ----- Create User Dialog -----
  const [createDialogOpen, setCreateDialogOpen] = useState(false);           // Controls create dialog visibility
  const [createData, setCreateData] = useState({ username: '', email: '', password: '' }); // Create form values
  const [createLoading, setCreateLoading] = useState(false);                 // Loading state while creating
  const [createError, setCreateError] = useState('');                        // Error shown inside the create dialog
  const [showCreatePassword, setShowCreatePassword] = useState(false);       // Toggle password visibility in create form

  // ==================== Data Fetching ====================

  // Fetch all admin data on component mount
  useEffect(() => { fetchAll(); }, []);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  // Auto-clear detail dialog messages
  useEffect(() => {
    if (detailSuccess) { const t = setTimeout(() => setDetailSuccess(''), 3000); return () => clearTimeout(t); }
  }, [detailSuccess]);
  useEffect(() => {
    if (detailError) { const t = setTimeout(() => setDetailError(''), 5000); return () => clearTimeout(t); }
  }, [detailError]);

  /**
   * Fetch all admin data in parallel: users list, activity log, and dashboard stats.
   * Called on mount and after any data-modifying action (create, edit, delete, reset password).
   */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersData, activityData, statsData] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetActivity(100),
        api.adminGetStats()
      ]);
      setUsers(usersData);
      setActivities(activityData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally { setLoading(false); }
  };

  // ==================== User Detail Handlers ====================

  /**
   * Open the user detail dialog when a user row is clicked.
   * Resets all detail-related state, filters activities for this user
   * from the already-loaded list, and fetches the user's expenses.
   *
   * @param {Object} user - User object from the users table row
   */
  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setEditData({ username: user.username, email: user.email });
    setEditMode(false);
    setDetailTab(0);
    setShowResetPassword(false);
    setNewPassword('');
    setDetailError('');
    setDetailSuccess('');

    // Filter activities client-side (already loaded from fetchAll)
    const userActs = activities.filter(a => a.user_id === user.id);
    setUserActivities(userActs);

    // Fetch this user's expenses from dedicated admin endpoint
    try {
      const expenses = await api.adminGetUserExpenses(user.id);
      setUserExpenses(expenses);
    } catch { setUserExpenses([]); } // Network error - show empty list rather than blocking

    setUserDetailOpen(true);
  };

  /** Close the user detail dialog and reset all related state */
  const closeUserDetail = () => {
    setUserDetailOpen(false);
    setSelectedUser(null);
    setEditMode(false);
    setShowResetPassword(false);
  };

  /**
   * Save edited user details (username/email) via PUT /api/admin/users/:id.
   * Validates inputs are non-empty before sending. On success, refreshes
   * all data and updates the selectedUser locally for immediate UI feedback.
   */
  const handleEditUser = async () => {
    if (!selectedUser) return;
    setEditLoading(true);
    setDetailError('');
    try {
      await api.adminUpdateUser(selectedUser.id, { username: editData.username, email: editData.email });
      setEditMode(false);
      setDetailSuccess('User updated successfully');
      await fetchAll();
      setSelectedUser(prev => ({ ...prev, username: editData.username, email: editData.email }));
    } catch (err) { setDetailError(err.message); }
    finally { setEditLoading(false); }
  };

  /**
   * Reset a user's password via PUT /api/admin/users/:id/password.
   * Admin does not need the user's current password.
   * Minimum 6 characters enforced both client-side (disabled button) and server-side.
   */
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    setResetLoading(true);
    setDetailError('');
    try {
      const data = await api.adminResetPassword(selectedUser.id, newPassword);
      setDetailSuccess(data.message);
      setNewPassword('');
      setShowResetPassword(false);
      await fetchAll();
    } catch (err) { setDetailError(err.message); }
    finally { setResetLoading(false); }
  };

  /**
   * Delete user from the detail dialog.
   * Opens a confirmation dialog first; actual deletion happens in onConfirm callback.
   * Cannot delete yourself (enforced server-side).
   */
  const handleDeleteFromDetail = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      open: true, title: 'Delete User',
      message: `Permanently delete "${selectedUser.username}" and all their data? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await api.adminDeleteUser(selectedUser.id);
          closeUserDetail();
          setSuccess('User deleted successfully');
          fetchAll();
        } catch (err) { setError(err.message); }
      }
    });
  };

  /**
   * Delete user from the users table (via trash icon on each row).
   * Uses e.stopPropagation() to prevent the row click from opening the detail dialog.
   *
   * @param {Event} e - Click event (stopped from propagating)
   * @param {number} userId - ID of the user to delete
   * @param {string} username - Username for the confirmation message
   */
  const handleDeleteUser = (e, userId, username) => {
    e.stopPropagation();
    setConfirmDialog({
      open: true, title: 'Delete User',
      message: `Permanently delete "${username}" and all their data? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await api.adminDeleteUser(userId);
          setSuccess('User deleted successfully');
          fetchAll();
        } catch (err) { setError(err.message); }
      }
    });
  };

  // ==================== Create User Handler ====================

  /**
   * Create a new user via POST /api/admin/users.
   * Validation happens server-side (username length, email format, password length).
   * On success, clears the form and refreshes the user list.
   */
  const handleCreateUser = async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      await api.adminCreateUser(createData);
      setCreateDialogOpen(false);
      setCreateData({ username: '', email: '', password: '' });
      setCreateError('');
      setSuccess('User created successfully');
      fetchAll();
    } catch (err) { setCreateError(err.message); }
    finally { setCreateLoading(false); }
  };

  // ==================== Helper Functions ====================

  /**
   * Map activity action types to MUI Chip color props.
   * Provides visual distinction between different action categories.
   */
  const getActionColor = (action) => {
    const colors = {
      login: 'success', logout: 'default', login_failed: 'error', register: 'info',
      expense_create: 'success', expense_update: 'warning', expense_delete: 'error',
      profile_update: 'info', password_change: 'warning', account_delete: 'error',
      admin_role_change: 'secondary', admin_delete_user: 'error', admin_create_user: 'info',
      admin_edit_user: 'info', admin_reset_password: 'warning'
    };
    return colors[action] || 'default';
  };

  /** Format datetime string for display (e.g., "21 May 2026, 11:37 pm") */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  /** Format date-only string for display (e.g., "21 May 2026") */
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ==================== Filtered/Computed Data ====================

  /** Filter users table by search term (matches username or email, case-insensitive) */
  const filteredUsers = users.filter(u =>
    !searchUser || u.username.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  /** Filter activity log by: user dropdown, action type dropdown, and search text */
  const filteredActivities = activities.filter(a => {
    if (filterUser && a.user_id !== parseInt(filterUser)) return false;
    if (filterAction && a.action !== filterAction) return false;
    if (searchActivity) {
      const term = searchActivity.toLowerCase();
      // Search matches against username or details fields
      if (!(a.username || '').toLowerCase().includes(term) && !(a.details || '').toLowerCase().includes(term)) return false;
    }
    return true;
  });

  /** Get unique action types from all activities for the action filter dropdown */
  const actionTypes = [...new Set(activities.map(a => a.action))].sort();

  // ==================== Render ====================

  // Show loading spinner during initial data fetch
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Error and success alerts (auto-dismiss via useEffect timers) */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ===== Stats Cards (top of admin panel) ===== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Users', value: stats.users, icon: <People />, color: '#D47B5D' },
          { label: 'Total Expenses', value: stats.expenses, icon: <Timeline />, color: '#9CAF88' },
          { label: 'Total Spent', value: `$${Number(stats.totalSpent).toLocaleString()}`, icon: <AdminPanelSettings />, color: '#C4A484' },
          { label: 'Activity (24h)', value: stats.recentActivity, icon: <Refresh />, color: '#E08E6C' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <Box sx={{ color: stat.color }}>{stat.icon}</Box>
              <Box>
                <Typography variant="h5" fontWeight={800} color="text.primary">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ===== Tab Navigation (Users / Activity Log) ===== */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<People />} iconPosition="start" label="Users" />
        <Tab icon={<Timeline />} iconPosition="start" label="Activity Log" />
      </Tabs>

      {/* ==================== Users Tab ==================== */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            {/* Header with search input and "New User" button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>All Users</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" placeholder="Search by username or email..." value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  sx={{ minWidth: 240 }}
                />
                <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setCreateDialogOpen(true); setCreateError(''); }}>
                  New User
                </Button>
              </Box>
            </Box>

            {/* Users table - click any row to open detail dialog */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(212,123,93,0.05)' }}>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Username</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Expenses</strong></TableCell>
                    <TableCell><strong>Total Spent</strong></TableCell>
                    <TableCell><strong>Joined</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id} hover onClick={() => handleUserClick(user)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(212,123,93,0.04)' } }}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell><Typography fontWeight={600} color="primary.main">{user.username}</Typography></TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {/* Role chip: filled style for admin, outlined for regular user */}
                        <Chip icon={user.role === 'admin' ? <Shield sx={{ fontSize: 14 }} /> : <ShieldOutlined sx={{ fontSize: 14 }} />}
                          label={user.role} size="small" color={user.role === 'admin' ? 'primary' : 'default'}
                          variant={user.role === 'admin' ? 'filled' : 'outlined'} />
                      </TableCell>
                      <TableCell>{user.expense_count}</TableCell>
                      <TableCell>${Number(user.total_spent).toLocaleString()}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      {/* Delete button - stopPropagation prevents opening detail dialog */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Delete User">
                          <IconButton size="small" onClick={(e) => handleDeleteUser(e, user.id, user.username)} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Empty state when no users match the search */}
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No users found</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ==================== Activity Log Tab ==================== */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            {/* Header with search, user filter, action filter, and refresh button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>Activity Log</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {/* Text search - matches username and details fields */}
                <TextField size="small" placeholder="Search user or details..." value={searchActivity}
                  onChange={(e) => setSearchActivity(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  sx={{ minWidth: 200 }}
                />
                {/* User dropdown filter */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>User</InputLabel>
                  <Select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} label="User">
                    <MenuItem value="">All Users</MenuItem>
                    {users.map(u => <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>)}
                  </Select>
                </FormControl>
                {/* Action type dropdown filter */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Action</InputLabel>
                  <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} label="Action">
                    <MenuItem value="">All Actions</MenuItem>
                    {actionTypes.map(a => <MenuItem key={a} value={a}>{a.replace(/_/g, ' ')}</MenuItem>)}
                  </Select>
                </FormControl>
                {/* Refresh button re-fetches all admin data */}
                <Button variant="outlined" size="small" onClick={fetchAll} startIcon={<Refresh />}>Refresh</Button>
              </Box>
            </Box>

            {/* Activity log table (scrollable with sticky header) */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                    <TableCell><strong>Details</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredActivities.map(activity => (
                    <TableRow key={activity.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(activity.created_at)}</TableCell>
                      <TableCell><Typography fontWeight={600} variant="body2">{activity.username || 'Unknown'}</Typography></TableCell>
                      <TableCell>
                        {/* Color-coded action chip (green for login, red for delete, etc.) */}
                        <Chip label={activity.action.replace(/_/g, ' ')} size="small" color={getActionColor(activity.action)} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.details || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {/* Empty state */}
                  {filteredActivities.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No activity found</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ==================== User Detail Dialog ==================== */}
      {/* Opens when clicking a user row in the Users tab */}
      <Dialog open={userDetailOpen} onClose={closeUserDetail} maxWidth="md" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0 }}>
              <Person color="primary" />
              <Typography variant="h6" component="span" sx={{ flex: 1 }}>User Details</Typography>
              <IconButton size="small" onClick={closeUserDetail}><Close /></IconButton>
            </DialogTitle>

            <DialogContent>
              {/* Success/error alerts shown inside the dialog */}
              {detailError && <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setDetailError('')}>{detailError}</Alert>}
              {detailSuccess && <Alert severity="success" sx={{ mt: 1, mb: 1 }} onClose={() => setDetailSuccess('')}>{detailSuccess}</Alert>}
              {/* ===== User Info Card ===== */}
              {/* Shows avatar, username, email, role chip, and action buttons (edit/delete/reset) */}
              {/* Toggles between view mode and inline edit mode */}
              <Card sx={{ bgcolor: 'rgba(212,123,93,0.05)', mt: 1, mb: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  {/* Avatar showing first letter of username */}
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem' }}>
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    {editMode ? (
                      /* ===== Edit Mode: inline username/email fields with Save/Cancel ===== */
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField size="small" label="Username" fullWidth value={editData.username}
                          onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                          slotProps={{ htmlInput: { maxLength: 15 } }} />
                        <TextField size="small" label="Email" fullWidth type="email" value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="contained" size="small" onClick={handleEditUser}
                            disabled={editLoading || !editData.username.trim() || !editData.email.trim()}>
                            {editLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                          </Button>
                          {/* Cancel resets edit data back to selected user's original values */}
                          <Button variant="outlined" size="small" color="inherit" onClick={() => {
                            setEditData({ username: selectedUser.username, email: selectedUser.email });
                            setEditMode(false);
                          }}>Cancel</Button>
                        </Box>
                      </Box>
                    ) : (
                      /* ===== View Mode: display username and email ===== */
                      <>
                        <Typography variant="h6" fontWeight={700}>{selectedUser.username}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                  {/* Action buttons - only visible when not in edit mode */}
                  {!editMode && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      {/* Role chip */}
                      <Chip icon={selectedUser.role === 'admin' ? <Shield sx={{ fontSize: 14 }} /> : <ShieldOutlined sx={{ fontSize: 14 }} />}
                        label={selectedUser.role} size="small" color={selectedUser.role === 'admin' ? 'primary' : 'default'}
                        variant={selectedUser.role === 'admin' ? 'filled' : 'outlined'} />
                      {/* Edit / Reset Password / Delete icon buttons */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit User"><IconButton size="small" onClick={() => setEditMode(true)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Reset Password"><IconButton size="small" onClick={() => setShowResetPassword(!showResetPassword)}><Lock fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete User"><IconButton size="small" onClick={handleDeleteFromDetail} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton></Tooltip>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* ===== Password Reset Section (inline, toggled by lock icon) ===== */}
              {showResetPassword && (
                <Card sx={{ mb: 2, border: '1px solid rgba(212,123,93,0.3)' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                    <Lock sx={{ color: 'primary.main' }} />
                    <TextField size="small" label="New Password" type={showPassword ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} sx={{ flex: 1 }}
                      slotProps={{ input: {
                        endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton></InputAdornment>
                      } }}
                    />
                    {/* Disabled until password is at least 6 characters */}
                    <Button variant="contained" size="small" onClick={handleResetPassword}
                      disabled={resetLoading || newPassword.length < 6}>
                      {resetLoading ? <CircularProgress size={20} color="inherit" /> : 'Reset'}
                    </Button>
                    <Button variant="outlined" size="small" color="inherit"
                      onClick={() => { setShowResetPassword(false); setNewPassword(''); }}>Cancel</Button>
                  </CardContent>
                </Card>
              )}

              {/* ===== User Stats Row (expenses count, total spent, join date) ===== */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={800} color="primary.main">{selectedUser.expense_count}</Typography>
                  <Typography variant="caption" color="text.secondary">Expenses</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={800} color="primary.main">${Number(selectedUser.total_spent).toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Total Spent</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={800} color="primary.main">{formatShortDate(selectedUser.created_at)}</Typography>
                  <Typography variant="caption" color="text.secondary">Joined</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* ===== Detail Sub-Tabs: Expenses & Activity ===== */}
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 1 }}>
                <Tab icon={<Receipt />} iconPosition="start" label={`Expenses (${userExpenses.length})`} />
                <Tab icon={<Timeline />} iconPosition="start" label={`Activity (${userActivities.length})`} />
              </Tabs>

              {/* ===== Expenses Sub-Tab ===== */}
              {detailTab === 0 && (
                userExpenses.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Title</strong></TableCell>
                          <TableCell><strong>Category</strong></TableCell>
                          <TableCell align="right"><strong>Amount</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userExpenses.map(exp => (
                          <TableRow key={exp.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatShortDate(exp.date)}</TableCell>
                            <TableCell>{exp.title || exp.description || '-'}</TableCell>
                            <TableCell>
                              {/* Category chip with icon and color matching the rest of the app */}
                              <Chip label={`${getCategoryIcon(exp.category)} ${exp.category}`} size="small" variant="outlined"
                                sx={{ borderColor: getCategoryColor(exp.category), color: getCategoryColor(exp.category) }} />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700} color="primary.main">
                                ${parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}><Typography color="text.secondary">No expenses recorded</Typography></Box>
                )
              )}

              {/* ===== Activity Sub-Tab ===== */}
              {detailTab === 1 && (
                userActivities.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Time</strong></TableCell>
                          <TableCell><strong>Action</strong></TableCell>
                          <TableCell><strong>Details</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userActivities.map(a => (
                          <TableRow key={a.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(a.created_at)}</TableCell>
                            <TableCell><Chip label={a.action.replace(/_/g, ' ')} size="small" color={getActionColor(a.action)} variant="outlined" /></TableCell>
                            <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{a.details || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}><Typography color="text.secondary">No activity recorded</Typography></Box>
                )
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeUserDetail} variant="outlined" color="inherit">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ==================== Create User Dialog ==================== */}
      {/* Opened via the "New User" button in the Users tab */}
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); setCreateError(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add color="primary" />
          <Typography variant="h6" component="span" sx={{ flex: 1 }}>Create New User</Typography>
          <IconButton size="small" onClick={() => { setCreateDialogOpen(false); setCreateError(''); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3, overflow: 'visible' }}>
          {/* Error alert shown inside the dialog */}
          {createError && <Alert severity="error" onClose={() => setCreateError('')}>{createError}</Alert>}
          {/* Username input with icon and validation hint */}
          <TextField fullWidth label="Username" value={createData.username}
            onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 15 }, input: { startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
            helperText="3-15 characters, letters, numbers, underscores"
          />
          {/* Email input */}
          <TextField fullWidth label="Email" type="email" value={createData.email}
            onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
          />
          {/* Password input with show/hide toggle */}
          <TextField fullWidth label="Password" type={showCreatePassword ? 'text' : 'password'} value={createData.password}
            onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
            helperText="Minimum 6 characters"
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowCreatePassword(!showCreatePassword)}>
                {showCreatePassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton></InputAdornment>
            } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setCreateDialogOpen(false); setCreateError(''); }} variant="outlined" color="inherit">Cancel</Button>
          {/* Button disabled until all fields are filled and password >= 6 chars */}
          <Button variant="contained" onClick={handleCreateUser}
            disabled={createLoading || !createData.username.trim() || !createData.email.trim() || createData.password.length < 6}>
            {createLoading ? <CircularProgress size={20} color="inherit" /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Confirm Dialog (for destructive actions) ==================== */}
      {/* Shown before deleting a user; onConfirm callback performs the actual deletion */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={confirmDialog.onConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}