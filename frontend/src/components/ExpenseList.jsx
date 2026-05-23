/**
 * ExpenseList.jsx - Expense List Component
 * 
 * Displays all expenses in a searchable, filterable, sortable list.
 * Each expense shows icon, title, category chip, date, amount, and edit/delete buttons.
 * 
 * Props:
 * - expenses: Array of expense objects (default: [])
 * - onEdit: Callback when edit button clicked (receives expense object)
 * - onDelete: Callback when delete button clicked (receives expense id)
 * 
 * No direct API calls - all data comes from props, actions go through callbacks.
 */
import { useState } from 'react';
import { getCategoryColor, getCategoryIcon } from '../utils/categories';
import {
  Box, Card, CardContent, Typography, TextField, MenuItem,
  Select, FormControl, InputLabel, IconButton, Chip, Button,
  InputAdornment, Tooltip
} from '@mui/material';
import { Search, Clear, Edit, Delete, Receipt } from '@mui/icons-material';

export default function ExpenseList({ expenses = [], onEdit, onDelete }) {
  // ==================== Filter/Sort State ====================
  const [searchTerm, setSearchTerm] = useState('');          // Text search filter
  const [filterCategory, setFilterCategory] = useState('all'); // Category dropdown filter
  const [sortBy, setSortBy] = useState('date-desc');          // Sort order

  // Build unique category list from expenses for the filter dropdown
  const categories = ['all', ...new Set(expenses.map(e => e?.category).filter(Boolean))];

  /**
   * Apply search, category filter, and sort to expenses
   * Returns a new sorted array (does not mutate original)
   */
  const getFilteredAndSortedExpenses = () => {
    if (!expenses || !Array.isArray(expenses)) return [];

    // Filter by search term and category
    let filtered = expenses.filter(expense => {
      if (!expense) return false;
      const title = expense.title || '';
      const matchesSearch = title.toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort the filtered results
    switch (sortBy) {
      case 'date-desc': return [...filtered].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
      case 'date-asc': return [...filtered].sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0));
      case 'amount-desc': return [...filtered].sort((a, b) => (b?.amount || 0) - (a?.amount || 0));
      case 'amount-asc': return [...filtered].sort((a, b) => (a?.amount || 0) - (b?.amount || 0));
      default: return filtered;
    }
  };

  const filteredExpenses = getFilteredAndSortedExpenses();

  // ==================== Helper Functions ====================

  /** Format date string for display */
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try { return new Date(dateString).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }); }
    catch { return 'Invalid date'; }
  };

  /** Format amount with dollar sign and 2 decimal places */
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return `$${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ==================== Render ====================
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {/* Header with title and expense count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            <Typography variant="h6">Recent Expenses</Typography>
          </Box>
          <Chip label={`${expenses?.length || 0} total`} size="small" variant="outlined" />
        </Box>

        {/* Search and filter controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          {/* Search input with clear button */}
          <TextField
            fullWidth size="small" placeholder="Search expenses..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}><Clear fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            } }}
          />
          {/* Category and sort dropdowns */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} label="Category">
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
                <MenuItem value="date-desc">Newest first</MenuItem>
                <MenuItem value="date-asc">Oldest first</MenuItem>
                <MenuItem value="amount-desc">Highest amount</MenuItem>
                <MenuItem value="amount-asc">Lowest amount</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Expense list or empty state */}
        {filteredExpenses.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflowY: 'auto' }}>
            {filteredExpenses.map((expense, index) => (
              <Box key={expense.id || index} sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                borderRadius: 2, bgcolor: 'background.default',
                transition: 'all 0.2s', '&:hover': { bgcolor: 'background.paper', boxShadow: 1, transform: 'translateX(4px)' }
              }}>
                {/* Category icon */}
                <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', bgcolor: getCategoryColor(expense.category) + '20', flexShrink: 0 }}>
                  {getCategoryIcon(expense.category)}
                </Box>
                {/* Expense info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={700} color="text.primary" noWrap>{expense.title || 'Untitled'}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={expense.category || 'Uncategorized'} size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: getCategoryColor(expense.category) + '15', color: getCategoryColor(expense.category) }} />
                    <Typography variant="caption" color="text.secondary">{formatDate(expense.date)}</Typography>
                  </Box>
                </Box>
                {/* Amount */}
                <Typography variant="body1" fontWeight={800} color="primary.main" sx={{ minWidth: 90, textAlign: 'right' }}>
                  {formatAmount(expense.amount)}
                </Typography>
                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit && onEdit(expense)}
                      sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete && onDelete(expense.id)}
                      sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          /* Empty state with clear filters button */
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h4" sx={{ mb: 1, opacity: 0.5 }}>📭</Typography>
            <Typography variant="h6" color="text.primary">No expenses found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Try adjusting your search or filters</Typography>
            {(searchTerm || filterCategory !== 'all') && (
              <Button variant="contained" size="small" onClick={() => { setSearchTerm(''); setFilterCategory('all'); setSortBy('date-desc'); }}>
                Clear all filters
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}