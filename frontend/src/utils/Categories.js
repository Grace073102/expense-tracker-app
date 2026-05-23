/**
 * categories.js - Shared Category Configuration
 *
 * Centralised category definitions used across Dashboard, ExpenseList,
 * and AdminPanel. Eliminates duplicated getCategoryColor/getCategoryIcon
 * functions that were previously copy-pasted in 3 files.
 *
 * Used by: Dashboard.jsx, ExpenseList.jsx, AdminPanel.jsx
 */

/** Category display configuration: icon and color for each expense category */
const CATEGORY_CONFIG = {
  Food:          { icon: '🍔', color: '#D47B5D' },
  Transport:     { icon: '🚗', color: '#9CAF88' },
  Shopping:      { icon: '🛍️', color: '#C4A484' },
  Entertainment: { icon: '🎬', color: '#E08E6C' },
  Bills:         { icon: '📄', color: '#8B6F5C' },
  Health:        { icon: '💪', color: '#7D8A6A' },
  Education:     { icon: '📚', color: '#D47B5D' },
  Other:         { icon: '✨', color: '#C4A484' },
};

/** Default fallback for unknown categories */
const DEFAULT_CATEGORY = { icon: '💰', color: '#D47B5D' };

/**
 * Get the emoji icon for an expense category
 * @param {string} category - Category name
 * @returns {string} Emoji icon
 */
export const getCategoryIcon = (category) => {
  return (CATEGORY_CONFIG[category] || DEFAULT_CATEGORY).icon;
};

/**
 * Get the hex color for an expense category
 * @param {string} category - Category name
 * @returns {string} Hex color string
 */
export const getCategoryColor = (category) => {
  return (CATEGORY_CONFIG[category] || DEFAULT_CATEGORY).color;
};

/**
 * Get full config (icon + color) for a category
 * @param {string} category - Category name
 * @returns {{ icon: string, color: string }}
 */
export const getCategoryConfig = (category) => {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
};

/** All available categories as an array (for category selectors) */
export const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
  value,
  ...config,
}));

export default CATEGORY_CONFIG;