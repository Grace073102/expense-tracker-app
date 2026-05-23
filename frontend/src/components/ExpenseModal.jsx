/**
 * ExpenseModal.jsx - Add/Edit Expense Dialog
 * 
 * A MUI Dialog for creating new expenses or editing existing ones.
 * Uses the same form for both modes, pre-filling fields when editing.
 * 
 * Features:
 * - Title, amount, date, category (chip selector), and description fields
 * - Client-side validation before submission
 * - Loading state on save button to prevent double-submission
 * - Date is optional when editing (keeps existing date if unchanged)
 * - Handles timezone-safe date formatting from database values
 * 
 * Props:
 * - isOpen: Boolean to control dialog visibility
 * - onClose: Callback to close the dialog
 * - onSave: Async callback receiving expense data object
 * - editingExpense: Expense object to edit, or null for new expense
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, Chip, IconButton,
  CircularProgress
} from '@mui/material';
import { Close, Add, Edit } from '@mui/icons-material';

export default function ExpenseModal({ isOpen, onClose, onSave, editingExpense }) {
  // ==================== State ====================
  const [formData, setFormData] = useState({
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0], description: ''
  });
  const [errors, setErrors] = useState({});    // Field-level validation errors
  const [saving, setSaving] = useState(false);  // Prevents double-submission

  /**
   * Convert database date to yyyy-MM-dd format for <input type="date">
   * Uses local date methods to avoid timezone shifting
   * (e.g., 2026-05-18T00:00:00.000Z should stay as 2026-05-18, not shift to 2026-05-17)
   */
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Reset form when modal opens or editing expense changes
  useEffect(() => {
    if (editingExpense) {
      // Pre-fill form with existing expense data
      setFormData({
        title: editingExpense.title || editingExpense.description || '',
        amount: editingExpense.amount || '',
        category: editingExpense.category || 'Food',
        date: formatDateForInput(editingExpense.date),
        description: editingExpense.description || ''
      });
    } else {
      // Reset to defaults for new expense
      setFormData({
        title: '', amount: '', category: 'Food',
        date: new Date().toISOString().split('T')[0], description: ''
      });
    }
    setErrors({});
    setSaving(false);
  }, [editingExpense, isOpen]);

  /**
   * Validate form fields
   * Returns object with field names as keys and error messages as values
   */
  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.amount) newErrors.amount = 'Amount is required';
    else if (isNaN(formData.amount) || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    // Date only required for new expenses (editing keeps existing date)
    if (!editingExpense && !formData.date) newErrors.date = 'Date is required';
    return newErrors;
  };

  /**
   * Handle form submission
   * Validates, sets saving state, and calls onSave callback
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        description: formData.description.trim()
      });
    } catch (err) {
      // Error is handled by parent (App.jsx showNotification)
      setSaving(false);
    }
  };

  // Available expense categories with icons and colors
  const categories = [
    { value: 'Food', icon: '🍕', color: '#D47B5D' },
    { value: 'Transport', icon: '🚗', color: '#9CAF88' },
    { value: 'Shopping', icon: '🛍️', color: '#C4A484' },
    { value: 'Entertainment', icon: '🎬', color: '#E08E6C' },
    { value: 'Bills', icon: '📄', color: '#8B6F5C' },
    { value: 'Health', icon: '💪', color: '#7D8A6A' },
    { value: 'Education', icon: '📚', color: '#D47B5D' },
    { value: 'Other', icon: '✨', color: '#C4A484' }
  ];

  // ==================== Render ====================
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Dialog header with mode-specific icon and title */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {editingExpense ? <Edit color="primary" /> : <Add color="primary" />}
        <Typography variant="h6" component="span" sx={{ flex: 1 }}>
          {editingExpense ? 'Edit Expense' : 'Add New Expense'}
        </Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3, overflow: 'visible' }}>
          {/* Title field */}
          <TextField fullWidth label="Title" placeholder="e.g., Grocery Shopping"
            value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={!!errors.title} helperText={errors.title} />

          {/* Amount and date side by side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Amount ($)" type="number"
              slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
              placeholder="0.00" value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              error={!!errors.amount} helperText={errors.amount} />
            <TextField fullWidth label={editingExpense ? 'Date (optional)' : 'Date'}
              type="date" value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              error={!!errors.date} helperText={errors.date}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Box>

          {/* Category selector using clickable chips */}
          <Box>
            <Typography variant="body2" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>Category</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categories.map(cat => (
                <Chip key={cat.value} label={`${cat.icon} ${cat.value}`}
                  variant={formData.category === cat.value ? 'filled' : 'outlined'}
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  sx={{
                    borderColor: formData.category === cat.value ? cat.color : 'divider',
                    backgroundColor: formData.category === cat.value ? `${cat.color}20` : 'transparent',
                    color: formData.category === cat.value ? cat.color : 'text.primary',
                    fontWeight: formData.category === cat.value ? 700 : 500,
                    '&:hover': { backgroundColor: `${cat.color}15` },
                  }} />
              ))}
            </Box>
          </Box>

          {/* Optional description */}
          <TextField fullWidth label="Description (Optional)" multiline rows={3}
            placeholder="Add any additional notes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </DialogContent>

        {/* Action buttons */}
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving} sx={{ flex: 2 }}>
            {saving ? <CircularProgress size={24} color="inherit" /> : (editingExpense ? 'Save Changes' : 'Add Expense')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}