/**
 * main.jsx - Application Entry Point
 * 
 * Initializes the React app with MUI ThemeProvider for consistent
 * styling across all components. Imports global CSS for base styles.
 * All components now use MUI — no CSS file dependencies remain
 * except base.css (global resets) and index.css (font import).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './Theme'

// Global CSS imports (base styles only; MUI handles all component styling)
import './style/base.css'

import './index.css'
import App from './App'

// Mount the React app with MUI theme and strict mode enabled
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)