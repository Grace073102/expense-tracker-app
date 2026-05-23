/**
 * ConfirmDialog.jsx - Reusable Confirmation Dialog
 * 
 * A styled MUI Dialog for confirming destructive or important actions.
 * Optionally shows a list of changes being made (field, old value, new value).
 * 
 * Props:
 * - isOpen: Boolean to control dialog visibility
 * - onConfirm: Callback when user clicks "Yes"
 * - onCancel: Callback when user clicks "Cancel" or closes dialog
 * - title: Dialog title (default: "Confirm Changes")
 * - message: Confirmation message text
 * - changes: Optional array of { field, old, new } objects to display
 */
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, IconButton, Box
} from '@mui/material';
import { Warning, Close } from '@mui/icons-material';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, changes }) {
  return (
    <Dialog open={isOpen} onClose={onCancel} maxWidth="xs" fullWidth>
      {/* Header with warning icon */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(212,123,93,0.05)' }}>
        <Warning color="warning" />
        <Typography variant="h6" component="span" sx={{ flex: 1 }}>{title || 'Confirm Changes'}</Typography>
        <IconButton onClick={onCancel} size="small"><Close /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Main message */}
        <Typography variant="body1" color="text.primary" sx={{ mb: 1 }}>
          {message || 'Are you sure you want to make these changes?'}
        </Typography>

        {/* Optional changes list (shows old → new values) */}
        {changes && changes.length > 0 && (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, mt: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Changes to be made:
            </Typography>
            {changes.map((change, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: index < changes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ minWidth: 70 }}>{change.field}:</Typography>
                <Typography variant="body2" sx={{ textDecoration: 'line-through', opacity: 0.6, color: 'error.main' }}>{change.old}</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>→</Typography>
                <Typography variant="body2" color="success.main" fontWeight={600}>{change.new}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      {/* Action buttons */}
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" color="inherit" sx={{ flex: 1 }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" sx={{ flex: 1 }}>Yes</Button>
      </DialogActions>
    </Dialog>
  );
}