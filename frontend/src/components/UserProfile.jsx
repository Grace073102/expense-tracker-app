/**
 * UserProfile.jsx - User Profile Modal (MUI)
 *
 * A MUI Dialog for managing the user's own account.
 * Fully converted from CSS-based layout to Material UI components.
 *
 * THREE TABS:
 * 1. PROFILE - Edit username and email with change confirmation dialog
 * 2. SECURITY - Change password (requires current password verification)
 * 3. SETTINGS - Danger zone: delete account permanently
 *
 * All destructive or important actions go through ConfirmDialog before
 * executing, showing the user exactly what will change (old → new values).
 *
 * ERROR HANDLING:
 * - All async operations use try/catch with user-facing Alert messages
 * - No console-only error handling
 * - Session expiry (401) triggers logout + redirect
 * - Network errors show friendly messages
 *
 * Props:
 * - onClose: Callback to close the profile modal
 * - onUpdateUser: Callback to notify parent (App.jsx) of updated user data
 *
 * API ENDPOINTS USED:
 *   GET    /api/user/profile  - Fetch current user profile
 *   PUT    /api/user/profile  - Update username/email (returns new JWT)
 *   PUT    /api/user/password - Change password (requires current password)
 *   DELETE /api/user/account  - Permanently delete account
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Avatar, Typography,
  Box, Tabs, Tab, TextField, Button, Alert, CircularProgress,
  InputAdornment, Card, CardContent, Divider
} from '@mui/material';
import {
  Close, Person, Email, Lock, Visibility, VisibilityOff,
  Warning, DeleteForever
} from '@mui/icons-material';

export default function UserProfile({ onClose, onUpdateUser }) {
  const { user, token, logout } = useAuth();

  // ==================== State ====================

  const [activeTab, setActiveTab] = useState(0); // 0 = Profile, 1 = Security, 2 = Settings

  // Profile edit state
  const [profileData, setProfileData] = useState({ username: '', email: '' });   // Current form values
  const [originalData, setOriginalData] = useState({ username: '', email: '' }); // Original values (for change detection)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);                  // Loading state for form submissions
  const [message, setMessage] = useState({ type: '', text: '' }); // Feedback message (severity: 'success'|'error'|'info')

  // Confirmation dialog state (shared by profile update, password change, and delete)
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [confirmChangesList, setConfirmChangesList] = useState([]);
  const [confirmTitle, setConfirmTitle] = useState('Confirm Changes');
  const [confirmMessage, setConfirmMessage] = useState('Please review the changes below before saving:');

  // ==================== Data Fetching ====================

  // Fetch profile data on mount
  useEffect(() => { fetchProfile(); }, []);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (message.text) {
      const t = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  /**
   * Fetch current user profile from backend.
   * Populates both profileData (form) and originalData (for change detection).
   */
  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfileData({ username: data.username, email: data.email });
      setOriginalData({ username: data.username, email: data.email });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load profile' });
    }
  };

  // ==================== Change Detection Helpers ====================

  /** Check if user has made any changes to their profile */
  const hasChanges = () => {
    return profileData.username !== originalData.username ||
           profileData.email !== originalData.email;
  };

  /** Get only the fields that have been changed (for partial update) */
  const getChangedFields = () => {
    const changes = {};
    if (profileData.username !== originalData.username) changes.username = profileData.username;
    if (profileData.email !== originalData.email) changes.email = profileData.email;
    return changes;
  };

  // ==================== Profile Update ====================

  /**
   * Handle profile form submission.
   * If changes exist, opens a confirmation dialog showing old → new values.
   */
  const handleProfileUpdate = (e) => {
    e.preventDefault();

    if (!hasChanges()) {
      setMessage({ type: 'info', text: 'No changes to update' });
      return;
    }

    const changedFields = getChangedFields();
    const changesList = [];
    if (changedFields.username) {
      changesList.push({ field: 'Username', old: originalData.username, new: changedFields.username });
    }
    if (changedFields.email) {
      changesList.push({ field: 'Email', old: originalData.email, new: changedFields.email });
    }

    setConfirmChangesList(changesList);
    setPendingChanges(changedFields);
    setConfirmTitle('Confirm Profile Update');
    setConfirmMessage('Please review the changes below before saving:');
    setShowConfirm(true);
  };

  /** Called when user confirms the profile update */
  const handleConfirmUpdate = async () => {
    setShowConfirm(false);
    await performUpdate(pendingChanges);
  };

  /** Called when user cancels any confirmation dialog */
  const handleCancelUpdate = () => {
    setShowConfirm(false);
    setPendingChanges(null);
    setConfirmChangesList([]);
  };

  /**
   * Actually perform the profile update via PUT /api/user/profile.
   * On success: saves new JWT, notifies parent, reloads page.
   * On 401: session expired → logout.
   */
  const performUpdate = async (changedFields) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await api.updateProfile(changedFields);
      // Save new JWT (contains updated username/email claims)
      if (data.token) localStorage.setItem('token', data.token);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setOriginalData({ username: profileData.username, email: profileData.email });
      if (onUpdateUser) onUpdateUser(data.user);
      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
      // If session expired, api.js dispatches auth-error event which triggers logout
    } finally {
      setLoading(false);
    }
  };

  // ==================== Password Update ====================

  /**
   * Handle password form submission.
   * Validates inputs, then opens confirmation dialog.
   */
  const handlePasswordUpdate = (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setConfirmChangesList([{ field: 'Password', old: '••••••', new: '•••••• (new password)' }]);
    setPendingChanges({ type: 'password', data: passwordData });
    setConfirmTitle('Confirm Password Change');
    setConfirmMessage('Are you sure you want to change your password? You will need to login again after this change.');
    setShowConfirm(true);
  };

  /** Called when user confirms password change */
  const handleConfirmPasswordUpdate = async () => {
    setShowConfirm(false);
    await performPasswordUpdate();
  };

  /**
   * Actually perform the password change via PUT /api/user/password.
   * On success: clears form and logs user out after 2 seconds.
   */
  const performPasswordUpdate = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully! Please login again.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { logout(); onClose(); }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  // ==================== Account Deletion ====================

  /** Open confirmation dialog for account deletion */
  const handleDeleteAccount = () => {
    setConfirmChangesList([{ field: 'Account', old: 'Active', new: 'Deleted (Permanent)' }]);
    setPendingChanges({ type: 'delete' });
    setConfirmTitle('Delete Account');
    setConfirmMessage('This action is PERMANENT and CANNOT be undone. All your expenses and data will be deleted forever.');
    setShowConfirm(true);
  };

  /** Called when user confirms account deletion */
  const handleConfirmDeleteAccount = async () => {
    setShowConfirm(false);
    await performDeleteAccount();
  };

  /**
   * Actually delete the account via api.deleteAccount().
   * On success: logs out and redirects to home page.
   */
  const performDeleteAccount = async () => {
    setLoading(true);
    try {
      await api.deleteAccount();
      logout();
      onClose();
      window.location.href = '/';
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
  };

  // ==================== Confirmation Router ====================

  /**
   * Routes the confirmation dialog's onConfirm to the correct handler
   * based on what type of action is pending.
   */
  const handleConfirmAction = async () => {
    if (pendingChanges?.type === 'password') {
      await handleConfirmPasswordUpdate();
    } else if (pendingChanges?.type === 'delete') {
      await handleConfirmDeleteAccount();
    } else {
      await handleConfirmUpdate();
    }
  };

  // ==================== Render ====================
  return (
    <>
      {/* Main Profile Dialog */}
      <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
        {/* ===== Header: Avatar, username, email, close button ===== */}
        <DialogTitle sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* User avatar with first letter */}
            <Avatar sx={{
              bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem',
              boxShadow: '0 4px 12px rgba(212,123,93,0.3)'
            }}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {user?.username}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small"><Close /></IconButton>
          </Box>

          {/* Tab navigation */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => { setActiveTab(v); setMessage({ type: '', text: '' }); }}
            sx={{
              mt: 2,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 },
              '& .MuiTabs-indicator': { borderRadius: 2 },
            }}
          >
            <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Profile" />
            <Tab icon={<Lock sx={{ fontSize: 18 }} />} iconPosition="start" label="Security" />
            <Tab label="Settings" />
          </Tabs>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {/* Feedback message (auto-clears after 5s) */}
          {message.text && (
            <Alert severity={message.type || 'info'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}

          {/* ===== Profile Tab: Edit username and email ===== */}
          {activeTab === 0 && (
            <Box component="form" onSubmit={handleProfileUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 3 }}>

              {/* Username field */}
              <TextField
                fullWidth label="Username" value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                helperText="Maximum 15 characters"
                slotProps={{
                  htmlInput: { maxLength: 15 },
                  input: { startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary' }} /></InputAdornment> }
                }}
              />

              {/* Email field */}
              <TextField
                fullWidth label="Email" type="email" value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                helperText="Your email address"
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment> }
                }}
              />

              {/* Unsaved changes warning */}
              {hasChanges() && (
                <Alert severity="warning" icon={<Warning />}>
                  You have unsaved changes. Click "Save Changes" to update your profile.
                </Alert>
              )}

              {/* Save button */}
              <Button
                type="submit" variant="contained" fullWidth disabled={loading || !hasChanges()}
                sx={{ py: 1.3, mt: 1 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
              </Button>
            </Box>
          )}

          {/* ===== Security Tab: Change password ===== */}
          {activeTab === 1 && (
            <Box component="form" onSubmit={handlePasswordUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 3 }}>

              {/* Current password */}
              <TextField
                fullWidth label="Current Password" type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                slotProps={{ input: {
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>,
                } }}
              />

              {/* New password */}
              <TextField
                fullWidth label="New Password" type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required helperText="Minimum 6 characters"
                slotProps={{ input: {
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>,
                } }}
              />

              {/* Confirm new password */}
              <TextField
                fullWidth label="Confirm New Password" type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment> }
                }}
              />

              {/* Update password button */}
              <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.3, mt: 1 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
              </Button>
            </Box>
          )}

          {/* ===== Settings Tab: Danger zone ===== */}
          {activeTab === 2 && (
            <Box sx={{ mt: 1 }}>

              {/* Danger zone card */}
              <Card sx={{
                border: '1px solid',
                borderColor: 'error.main',
                bgcolor: 'rgba(211,47,47,0.03)',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Warning sx={{ color: 'error.main' }} />
                    <Typography variant="body1" fontWeight={700} color="error.main">
                      Danger Zone
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Once you delete your account, there is no going back. All your expenses and data will be permanently removed.
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Button
                    variant="outlined" color="error" startIcon={<DeleteForever />}
                    onClick={handleDeleteAccount} disabled={loading} fullWidth
                    sx={{ py: 1.2, fontWeight: 700, borderWidth: 2, '&:hover': { borderWidth: 2, bgcolor: 'error.main', color: 'white' } }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Delete Account Permanently'}
                  </Button>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Shared Confirmation Dialog - used for profile update, password change, and deletion */}
      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelUpdate}
        title={confirmTitle}
        message={confirmMessage}
        changes={confirmChangesList}
        isDanger={confirmTitle?.includes('Delete')}
      />
    </>
  );
}