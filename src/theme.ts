/**
 * Design tokens — single source of truth for all colors and values.
 * These mirror the CSS custom properties in index.css.
 * To change the theme, edit both this file and the :root block in index.css.
 */
export const t = {
  // Brand
  accent:        'var(--color-accent)',
  accentLight:   'var(--color-accent-light)',
  accentHover:   'var(--color-accent-hover)',
  accentActive:  'var(--color-accent-active)',
  sliderThumb:   'var(--color-slider-thumb)',

  // Backgrounds
  bg:            'var(--color-bg)',
  bgSurface:     'var(--color-bg-surface)',
  bgRaised:      'var(--color-bg-raised)',

  // Text
  text:          'var(--color-text)',
  textMuted:     'var(--color-text-muted)',
  textSubtle:    'var(--color-text-subtle)',
  textDisabled:  'var(--color-text-disabled)',

  // Borders
  border:        'var(--color-border)',
  borderStrong:  'var(--color-border-strong)',

  // Misc
  shadow:        'var(--shadow-card)',
  radius:        'var(--radius)',
} as const
