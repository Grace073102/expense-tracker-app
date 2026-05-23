/**
 * Login.jsx - Authentication Page Component
 * 
 * Handles both login and registration flows in a single component.
 * Toggles between login/register modes with form validation.
 * Uses MUI components for styling (Card, TextField, Button, Alert).
 * 
 * Error handling: All errors shown via MUI Alert component.
 * try/catch/finally ensures loading state always resets.
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Divider, IconButton, InputAdornment
} from '@mui/material';
import {
  Visibility, VisibilityOff, AccountBalanceWallet,
  Person, Email, Lock, CheckCircle
} from '@mui/icons-material';

export default function Login() {
  // ==================== State ====================
  const [isLogin, setIsLogin] = useState(true);            // Toggle login/register mode
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false); // Password visibility toggle
  const [error, setError] = useState('');                   // Error message
  const [loading, setLoading] = useState(false);            // Submit loading state
  const { login, register } = useAuth();

  /**
   * Handle form submission for both login and register
   * Validates inputs before calling auth context methods
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!isLogin) {
        // Registration validation
        if (formData.username.length < 3) { setError('Username must be at least 3 characters'); return; }
        if (formData.username.length > 15) { setError('Username must be 15 characters or less'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) { setError('Username can only contain letters, numbers, and underscores'); return; }
        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }

        const result = await register(formData.username, formData.email, formData.password);
        if (!result.success) setError(result.error);
      } else {
        // Login
        const result = await login(formData.username, formData.password);
        if (!result.success) setError(result.error);
      }
    } catch (err) {
      // Catch any unexpected errors (should not happen normally)
      setError('An unexpected error occurred. Please try again.');
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  /**
   * Handle input changes with username length enforcement
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username' && value.length > 15) return; // Enforce max length
    setFormData({ ...formData, [name]: value });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header with icon and title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <AccountBalanceWallet sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" color="text.primary">{isLogin ? 'Welcome Back!' : 'Create Account'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isLogin ? 'Login to track your expenses' : 'Start tracking your expenses today'}
            </Typography>
          </Box>

          {/* Login/Register Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Username field */}
            <TextField fullWidth name="username" label={isLogin ? 'Username or Email' : 'Username'}
              value={formData.username} onChange={handleChange} required
              slotProps={{ htmlInput: { maxLength: 15 }, input: { startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
            />

            {/* Email field - only shown during registration */}
            {!isLogin && (
              <TextField fullWidth name="email" label="Email Address" type="email"
                value={formData.email} onChange={handleChange} required
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
              />
            )}

            {/* Password field with visibility toggle */}
            <TextField fullWidth name="password" label="Password" type={showPassword ? 'text' : 'password'}
              value={formData.password} onChange={handleChange} required
              slotProps={{ input: {
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              } }}
            />

            {/* Confirm password - only shown during registration */}
            {!isLogin && (
              <TextField fullWidth name="confirmPassword" label="Confirm Password" type="password"
                value={formData.confirmPassword} onChange={handleChange} required
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><CheckCircle sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
              />
            )}

            {/* Error alert */}
            {error && <Alert severity="error">{error}</Alert>}

            {/* Submit button with loading spinner */}
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ py: 1.5, mt: 1 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Login' : 'Register')}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Toggle between login and register modes */}
          <Typography variant="body2" align="center" color="text.secondary">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Button variant="text" color="primary" onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ username: '', email: '', password: '', confirmPassword: '' });
            }}>
              {isLogin ? 'Register' : 'Login'}
            </Button>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}