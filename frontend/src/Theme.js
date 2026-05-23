/**
 * Theme.js - Material UI Custom Theme
 * 
 * Defines the warm terracotta color palette, typography, and component
 * style overrides used throughout the application. All MUI components
 * inherit these defaults automatically via ThemeProvider.
 */
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // Color palette matching the warm terracotta design
  palette: {
    primary: {
      main: '#D47B5D',       // Terracotta - primary actions, buttons, links
      light: '#E08E6C',      // Lighter terracotta - hover states
      dark: '#6B4C3B',       // Deep warm brown - text emphasis
      contrastText: '#fff',
    },
    secondary: {
      main: '#9CAF88',       // Sage green - secondary accents
      light: '#B5C4A5',
      dark: '#7D8A6A',
      contrastText: '#fff',
    },
    background: {
      default: '#EBE7E0',    // Warm beige background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#6B4C3B',    // Deep brown for primary text
      secondary: '#C4A484',  // Warm sand for secondary text
    },
    error: { main: '#D47B5D' },
    success: { main: '#9CAF88' },
    warning: { main: '#f59e0b' },
    info: { main: '#C4A484' },
  },

  // Typography using Inter font
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  // Global border radius
  shape: { borderRadius: 12 },

  // Component-level style overrides
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '2rem',
          padding: '0.5rem 1.5rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(212, 123, 93, 0.3)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #D47B5D, #E08E6C)',
          '&:hover': { background: 'linear-gradient(135deg, #C46B4D, #D07E5C)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.75rem',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D47B5D' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: '#D47B5D' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(212, 123, 93, 0.1)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: '1.5rem', maxWidth: '550px', width: '90%' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, fontSize: '1rem' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: '0.75rem' },
      },
    },
  },
});

export default theme;