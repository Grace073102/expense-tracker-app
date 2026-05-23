/**
 * Dashboard.jsx - Main Dashboard Component
 * 
 * Displays expense overview with:
 * - Welcome banner with "Add Expense" button and total spent
 * - Stat rings (total transactions, average, highest)
 * - Category breakdown with clickable drill-down
 * - Monthly trends chart with clickable bars
 * - Smart saving tips section
 * 
 * All statistics are computed client-side from the expenses prop.
 * Click a category or month bar to open a dialog showing filtered expenses.
 * 
 * Props:
 * - expenses: Array of expense objects
 * - onAddExpense: Callback to open the add expense modal (in App.jsx)
 */
import { useState, useEffect } from 'react';
import { getCategoryColor, getCategoryIcon, getCategoryConfig } from '../utils/categories';
import {
  Box, Card, CardContent, Typography, Button,
  Dialog, DialogTitle, DialogContent, IconButton, Chip, Divider
} from '@mui/material';
import { Add, TrendingUp, Category, Close } from '@mui/icons-material';

export default function Dashboard({ expenses, onAddExpense }) {
  // ==================== State ====================
  const [stats, setStats] = useState({ totalSpent: 0, highestExpense: 0, totalExpenses: 0, averageExpense: 0 });
  const [categoryStats, setCategoryStats] = useState([]);  // Computed category breakdowns
  const [monthlyData, setMonthlyData] = useState([]);      // Computed monthly totals
  const [drillDown, setDrillDown] = useState({ open: false, title: '', expenses: [] }); // Drill-down dialog state

  // ==================== Compute Statistics ====================
  // Recalculate all stats whenever expenses change
  useEffect(() => {
    // Summary stats
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const highest = expenses.length > 0 ? Math.max(...expenses.map(exp => parseFloat(exp.amount || 0))) : 0;
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;
    setStats({ totalSpent: total, highestExpense: highest, totalExpenses: count, averageExpense: average });

    // Category breakdown
    const categories = {};
    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount || 0);
      categories[exp.category] = (categories[exp.category] || 0) + amount;
    });

    // Build category array using shared config from categories.js
    const categoryArray = Object.entries(categories).map(([name, catTotal]) => ({
      category: name, total: catTotal,
      count: expenses.filter(e => e.category === name).length,
      percentage: total > 0 ? (catTotal / total * 100).toFixed(1) : 0,
      ...getCategoryConfig(name)
    })).sort((a, b) => b.total - a.total);
    setCategoryStats(categoryArray);

    // Monthly data (last 6 months)
    const months = {};
    expenses.forEach(exp => {
      const date = new Date(exp.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      if (!months[monthKey]) months[monthKey] = { month: monthName, year, total: 0, count: 0 };
      months[monthKey].total += parseFloat(exp.amount || 0);
      months[monthKey].count++;
    });
    setMonthlyData(Object.entries(months).map(([key, value]) => ({ ...value, key })).slice(-6));
  }, [expenses]);

  // Max total for scaling chart bar heights
  const maxTotal = Math.max(...monthlyData.map(m => m.total), 1);

  // ==================== Drill-Down Handlers ====================

  /** Open drill-down dialog filtered by category */
  const handleCategoryClick = (cat) => {
    const filtered = expenses.filter(e => e.category === cat.category);
    setDrillDown({
      open: true,
      title: `${cat.icon} ${cat.category}`,
      subtitle: `${filtered.length} expense${filtered.length !== 1 ? 's' : ''} · $${Math.floor(cat.total).toLocaleString()} total`,
      color: cat.color,
      expenses: filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  };

  /** Open drill-down dialog filtered by month */
  const handleMonthClick = (month) => {
    const [year, mon] = month.key.split('-');
    const filtered = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(mon);
    });
    setDrillDown({
      open: true,
      title: `📅 ${month.month} ${month.year}`,
      subtitle: `${filtered.length} expense${filtered.length !== 1 ? 's' : ''} · $${Math.floor(month.total).toLocaleString()} total`,
      color: '#D47B5D',
      expenses: filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  };

  /** Close the drill-down dialog */
  const closeDrillDown = () => setDrillDown({ open: false, title: '', expenses: [] });

  // ==================== Helper Functions ====================

  /** Format date string for display */
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return 'Invalid date'; }
  };

  // ==================== Render ====================
  return (
    <Box>
      {/* ===== Welcome Banner ===== */}
      <Card sx={{ background: 'linear-gradient(135deg, #D47B5D 0%, #C49A6C 100%)', color: 'white', mb: 3, boxShadow: '0 10px 25px rgba(212,123,93,0.3)', border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>Welcome back! 👋</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Track your spending and save smarter</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button variant="contained" startIcon={<Add />} onClick={onAddExpense}
                sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
                Add Expense
              </Button>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', px: 2.5, py: 1, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800}>${stats.totalSpent.toLocaleString()}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Total spent</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ===== Stat Rings ===== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Transactions', value: stats.totalExpenses, sub: `${stats.totalExpenses} recorded`, color: '#D47B5D', progress: (stats.totalExpenses / 100) * 327 },
          { label: 'Average Expense', value: `$${Math.floor(stats.averageExpense)}`, sub: 'per transaction', color: '#9CAF88', progress: 218 },
          { label: 'Highest Expense', value: `$${Math.floor(stats.highestExpense)}`, sub: 'largest transaction', color: '#C4A484', progress: 262 },
        ].map((stat, i) => (
          <Card key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 } }}>
            <Box sx={{ position: 'relative', width: 100, height: 100 }}>
              <svg width="100" height="100" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#F0EDE5" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={stat.color} strokeWidth="8"
                  strokeDasharray={`${stat.progress} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <Typography variant="body1" fontWeight={800} color="text.primary">{stat.value}</Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={700} color="text.primary">{stat.label}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.sub}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ===== Categories & Monthly Trends (side by side) ===== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Spending Categories - clickable rows */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '2px solid rgba(212,123,93,0.1)' }}>
              <Category color="primary" />
              <Box>
                <Typography variant="body1" fontWeight={700} color="text.primary">Spending Categories</Typography>
                <Typography variant="caption" color="text.secondary">Click a category to see expenses</Typography>
              </Box>
            </Box>
            {categoryStats.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 400, overflowY: 'auto' }}>
                {categoryStats.map(cat => (
                  <Box key={cat.category} onClick={() => handleCategoryClick(cat)}
                    sx={{ display: 'flex', gap: 1.5, cursor: 'pointer', p: 1, borderRadius: 2, transition: 'all 0.2s', '&:hover': { bgcolor: cat.color + '10', transform: 'translateX(4px)' } }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', bgcolor: cat.color + '20', flexShrink: 0 }}>
                      {cat.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">{cat.category}</Typography>
                        <Typography variant="body2" fontWeight={700} color="primary.main">${Math.floor(cat.total).toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden', mb: 0.5 }}>
                        <Box sx={{ height: '100%', width: `${cat.percentage}%`, bgcolor: cat.color, borderRadius: 3, transition: 'width 0.6s' }} />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">{cat.count} transactions</Typography>
                        <Typography variant="caption" color="text.secondary">{cat.percentage}%</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h4" sx={{ opacity: 0.5 }}>💸</Typography>
                <Typography variant="body2" color="text.primary">No spending data yet</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends - clickable bars */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '2px solid rgba(212,123,93,0.1)' }}>
              <TrendingUp color="primary" />
              <Box>
                <Typography variant="body1" fontWeight={700} color="text.primary">Monthly Trends</Typography>
                <Typography variant="caption" color="text.secondary">Click a month to see expenses</Typography>
              </Box>
            </Box>
            {monthlyData.length > 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', gap: 1, minHeight: 220, pt: 2 }}>
                {monthlyData.map(month => (
                  <Box key={month.key} onClick={() => handleMonthClick(month)}
                    sx={{ flex: 1, textAlign: 'center', cursor: 'pointer', '&:hover .bar': { transform: 'scaleX(1.15)', opacity: 0.85 } }}>
                    <Typography variant="caption" color="text.secondary">{month.month}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                      <Box className="bar" sx={{
                        width: 36, borderRadius: '10px 10px 4px 4px', transition: 'all 0.3s',
                        height: `${(month.total / maxTotal) * 140}px`,
                        background: 'linear-gradient(180deg, #D47B5D, #E08E6C)',
                      }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">${Math.floor(month.total / 1000)}k</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h4" sx={{ opacity: 0.5 }}>📅</Typography>
                <Typography variant="body2" color="text.primary">No monthly data yet</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ===== Smart Saving Tips ===== */}
      <Card sx={{ background: 'linear-gradient(135deg, rgba(212,123,93,0.08), rgba(156,175,136,0.08))', border: '1px solid rgba(212,123,93,0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1.3rem' }}>💡</Typography>
            <Typography variant="body1" fontWeight={700} color="text.primary">Smart Saving Tips</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {[
              { icon: '🎯', text: 'Set a monthly budget and track your progress' },
              { icon: '📱', text: 'Use the 50/30/20 rule: Needs vs Wants vs Savings' },
              { icon: '🏦', text: 'Review your subscriptions monthly' },
            ].map((tip, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 2, transition: 'all 0.2s', '&:hover': { bgcolor: 'white', transform: 'translateX(4px)' } }}>
                <Typography sx={{ fontSize: '1.2rem' }}>{tip.icon}</Typography>
                <Typography variant="body2" color="text.primary">{tip.text}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* ===== Drill-Down Dialog (category or month detail) ===== */}
      <Dialog open={drillDown.open} onClose={closeDrillDown} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0 }}>
          <Typography variant="h6" component="span" sx={{ flex: 1 }}>{drillDown.title}</Typography>
          <IconButton onClick={closeDrillDown} size="small"><Close /></IconButton>
        </DialogTitle>
        {drillDown.subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>{drillDown.subtitle}</Typography>
        )}
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          {drillDown.expenses.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {drillDown.expenses.map((expense, index) => (
                <Box key={expense.id || index}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', bgcolor: getCategoryColor(expense.category) + '20', flexShrink: 0 }}>
                      {getCategoryIcon(expense.category)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                        {expense.title || expense.description || 'Untitled'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={expense.category} size="small"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: getCategoryColor(expense.category) + '15', color: getCategoryColor(expense.category) }} />
                        <Typography variant="caption" color="text.secondary">{formatDate(expense.date)}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" fontWeight={800} color="primary.main" sx={{ whiteSpace: 'nowrap' }}>
                      ${parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  {index < drillDown.expenses.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No expenses found</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}