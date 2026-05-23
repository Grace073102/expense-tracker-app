/**
 * App.jsx - Root Application Component
 * 
 * Orchestrates the entire application:
 * - Wraps everything in AuthProvider for authentication state
 * - Routes between Login (unauthenticated) and main app (authenticated)
 * - Admin users see AdminPanel; regular users see Dashboard + ExpenseList
 * - Owns the single ExpenseModal for add/edit (no duplicate modals)
 * - Manages expense CRUD operations via api.js
 * - Shows notifications via MUI Snackbar for all user feedback
 * 
 * Error handling: All async operations use try/catch with showNotification()
 * to display errors to the user.
 */
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import ConfirmDialog from './components/ConfirmDialog';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import { api } from './services/api';
import {
  Box, Typography, Button, Tabs, Tab,
  Snackbar, Alert, CircularProgress, Avatar, Chip
} from '@mui/material';
import { Logout, Person } from '@mui/icons-material';
import './style/base.css';

/**
 * AppContent - Main app content (rendered inside AuthProvider)
 * Separated from App so it can access useAuth() hook
 */
function AppContent() {
  // ==================== State ====================
  const [expenses, setExpenses] = useState([]);           // All user expenses
  const [loading, setLoading] = useState(true);            // Initial data loading
  const [activeTab, setActiveTab] = useState(0);           // Current tab index
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [showProfile, setShowProfile] = useState(false);   // Profile modal visibility
  const [showModal, setShowModal] = useState(false);       // Expense modal visibility
  const [editingExpense, setEditingExpense] = useState(null); // Expense being edited (null = adding new)
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' }); // Delete confirmation state

  // Auth context
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  // ==================== Auth Error Listener ====================
  // Listens for 401 errors dispatched by api.js when token expires
  useEffect(() => {
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  /** Handle authentication errors (expired token) */
  const handleAuthError = () => {
    showNotification('Session expired. Please login again.', 'error');
    logout();
  };

  // ==================== Data Fetching ====================
  // Fetch expenses when user authenticates
  useEffect(() => {
    if (isAuthenticated) fetchExpenses();
  }, [isAuthenticated]);

  /** Fetch all expenses from the backend */
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification(error.message || 'Failed to load expenses', 'error');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Notifications ====================
  /** Show a notification snackbar */
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  /** Close the notification snackbar */
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // ==================== Modal Handlers ====================
  /** Open modal for adding a new expense */
  const handleAddNew = () => { setEditingExpense(null); setShowModal(true); };

  /** Open modal for editing an existing expense */
  const handleEdit = (expense) => { setEditingExpense(expense); setShowModal(true); };

  /** Close the expense modal */
  const handleCloseModal = () => { setShowModal(false); setEditingExpense(null); };

  // ==================== CRUD Operations ====================
  /**
   * Save expense (create or update based on editingExpense state)
   * Called by ExpenseModal's onSave callback
   */
  const handleSave = async (expenseData) => {
    if (editingExpense) {
      // Update existing expense
      try {
        const updated = await api.updateExpense(editingExpense.id, expenseData);
        setExpenses(expenses.map(e => e.id === editingExpense.id ? updated : e));
        showNotification('Expense updated successfully!', 'success');
        handleCloseModal();
      } catch (error) {
        showNotification(error.message || 'Failed to update expense', 'error');
      }
    } else {
      // Create new expense
      try {
        const newExpense = await api.createExpense(expenseData);
        setExpenses([newExpense, ...expenses]);
        showNotification('Expense added successfully!', 'success');
        handleCloseModal();
      } catch (error) {
        showNotification(error.message || 'Failed to add expense', 'error');
      }
    }
  };

  /**
   * Initiate delete - opens confirmation dialog
   * Actual deletion happens in confirmDelete()
   */
  const handleDelete = (id) => {
    const expense = expenses.find(e => e.id === id);
    setDeleteConfirm({
      isOpen: true,
      id,
      title: expense?.title || expense?.description || 'this expense'
    });
  };

  /** Execute deletion after user confirms */
  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: null, title: '' });
    try {
      await api.deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      showNotification('Expense deleted successfully!', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to delete expense', 'error');
    }
  };

  /** Cancel deletion */
  const cancelDelete = () => setDeleteConfirm({ isOpen: false, id: null, title: '' });

  /** Handle user profile updates from UserProfile component */
  const handleUpdateUser = (updatedUser) => {
    window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
  };

  // ==================== Render ====================

  // Show login page if not authenticated
  if (!isAuthenticated) return <Login />;

  // Show loading spinner during initial data fetch
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 2 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
        <Typography color="text.secondary">Loading your finances...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', position: 'relative', zIndex: 1 }}>
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 4, p: { xs: 2, md: 3 }, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.5)' }}>

        {/* ===== Header with app title, user chip, and logout ===== */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '2px solid rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ background: 'linear-gradient(135deg, #D47B5D, #9CAF88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Expense Tracker
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Welcome back, {user?.username}!
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Profile chip - click to open profile modal */}
            <Chip
              avatar={<Avatar sx={{ bgcolor: 'primary.light' }}><Person sx={{ fontSize: 16, color: 'white' }} /></Avatar>}
              label={user?.username}
              variant="outlined"
              onClick={() => setShowProfile(true)}
              sx={{ borderColor: 'rgba(212,123,93,0.3)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(212,123,93,0.1)' } }}
            />
            <Button variant="outlined" color="primary" startIcon={<Logout />} onClick={logout} size="small">
              Logout
            </Button>
          </Box>
        </Box>

        {/* ===== Main Content: Admin Panel OR User Tabs ===== */}
        {isAdmin ? (
          // Admin users see only the AdminPanel - no expense tabs
          <AdminPanel />
        ) : (
          <>
            {/* Tab navigation for regular users */}
            <Tabs
              value={activeTab} onChange={(_, v) => setActiveTab(v)}
              sx={{
                mb: 3, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, p: 0.5,
                '& .MuiTab-root': { borderRadius: 1.5, minHeight: 44 },
                '& .Mui-selected': { bgcolor: 'primary.main', color: 'white !important' },
                '& .MuiTabs-indicator': { display: 'none' },
              }}
            >
              <Tab label="Dashboard" />
              <Tab label="All Expenses" />
            </Tabs>

            {/* Tab content - conditionally rendered based on activeTab */}
            {activeTab === 0 && <Dashboard expenses={expenses} onAddExpense={handleAddNew} />}
            {activeTab === 1 && <ExpenseList expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} />}
          </>
        )}
      </Box>

      {/* ===== Modals and Dialogs (rendered outside main container) ===== */}

      {/* Expense Add/Edit Modal - single instance shared by Dashboard and ExpenseList */}
      <ExpenseModal isOpen={showModal} onClose={handleCloseModal} onSave={handleSave} editingExpense={editingExpense} />

      {/* User Profile Modal */}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} onUpdateUser={handleUpdateUser} />}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen} onConfirm={confirmDelete} onCancel={cancelDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
      />

      {/* Global Notification Snackbar - shows success/error messages */}
      <Snackbar open={notification.open} autoHideDuration={3000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} variant="filled" sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * App - Root component that wraps AppContent with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;