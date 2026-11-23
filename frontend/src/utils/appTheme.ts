import type { ThemeOptions } from '@mui/material/styles'

/** Both the rendered controls and portaled menus follow the selected mode. */
export const appThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => {
  const dark = mode === 'dark'
  const text = dark ? '#f4f5f7' : '#171b24'
  const muted = dark ? '#b4bdca' : '#596273'
  const surface = dark ? '#1a202b' : '#ffffff'
  const raised = dark ? '#252e3c' : '#f3f5f7'
  const border = dark ? '#3c485b' : '#dce1e8'
  return {
    palette: {
      mode,
      primary: { main: '#ffa62b', contrastText: '#171b24' },
      secondary: { main: dark ? '#58c7d6' : '#107487', contrastText: dark ? '#10252a' : '#ffffff' },
      background: { default: dark ? '#10151e' : '#f7f8fa', paper: surface },
      text: { primary: text, secondary: muted, disabled: dark ? '#8c97a8' : '#727c8a' },
      divider: border,
      action: { hover: dark ? '#ffffff0d' : '#11182708', selected: dark ? '#ffa62b20' : '#fff0d9', disabled: muted, disabledBackground: raised },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      h1: { fontWeight: 800, fontSize: 'clamp(32px, 4vw, 56px)', lineHeight: 1.15 },
      h2: { fontWeight: 800, fontSize: 'clamp(28px, 3vw, 42px)' },
      h3: { fontWeight: 750, fontSize: 'clamp(26px, 2.5vw, 36px)' },
      h4: { fontWeight: 750, fontSize: 'clamp(24px, 2vw, 30px)' },
      h5: { fontWeight: 700, fontSize: '22px' },
      h6: { fontWeight: 700, fontSize: '18px' },
      body1: { lineHeight: 1.65 }, body2: { lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 650 },
    },
    components: {
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: dark ? '#10151e' : '#f7f8fa', color: text, colorScheme: mode } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8, minHeight: 42, paddingInline: 20 }, outlined: { borderColor: border } } },
      MuiInputBase: { styleOverrides: { root: { color: text }, input: { '&::placeholder': { color: muted, opacity: 1 }, '&.Mui-disabled': { WebkitTextFillColor: muted } } } },
      MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: raised, borderRadius: 8 }, notchedOutline: { borderColor: border } } },
      MuiInputLabel: { styleOverrides: { root: { color: muted, '&.Mui-focused': { color: dark ? '#ffc16a' : '#9a5000' } } } },
      MuiFormHelperText: { styleOverrides: { root: { color: muted } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${border}` } } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${border}`, boxShadow: '0 16px 48px #00000020' } } },
      MuiAutocomplete: { styleOverrides: { paper: { backgroundColor: surface, color: text }, option: { '&[aria-selected="true"]': { backgroundColor: raised } } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: border, padding: '16px 20px' }, head: { backgroundColor: raised, color: muted, fontWeight: 700, fontSize: 12, letterSpacing: '.03em' } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: dark ? '#eef2f7' : '#1a202b', color: dark ? '#171b24' : '#ffffff', fontSize: 12 } } },
      MuiLink: { styleOverrides: { root: { color: dark ? '#58c7d6' : '#107487' } } },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3 } } },
      MuiAccordion: { defaultProps: { disableGutters: true }, styleOverrides: { root: { '&:before': { display: 'none' } } } },
    },
  }
}
