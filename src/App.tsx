import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import './index.css'
import { t } from './theme'
import { CropEditor } from './CropEditor'
import { getImageUploadErrorMessage, loadImageFile, releaseImageFile } from './imageUpload'
import { FULL_CROP, renderWatermark } from './render'
import type { CropRect, ObjectFit, WatermarkConfig } from './render'

// Named hex constants for text color swatches.
// Must stay as real hex values (used in canvas fillStyle and as color picker seeds).
const SWATCH_BLACK   = '#000000'
const SWATCH_DGRAY   = '#444444'
const SWATCH_GRAY    = '#888888'
const SWATCH_LGRAY   = '#cccccc'
const SWATCH_WHITE   = '#ffffff'
const SWATCH_RED     = '#e53935'
const SWATCH_ORANGE  = '#fb8c00'
const SWATCH_YELLOW  = '#fdd835'
const SWATCH_GREEN   = '#43a047'
const SWATCH_TEAL    = '#00897b'
const SWATCH_TIFFANY = '#81d8d0'
const SWATCH_CYAN    = '#00acc1'
const SWATCH_BLUE    = '#1e88e5'
const SWATCH_INDIGO  = '#3949ab'
const SWATCH_PURPLE  = '#8e24aa'
const SWATCH_PINK    = '#e91e8c'
const TEXT_COLOR_SWATCHES = [
  SWATCH_BLACK, SWATCH_DGRAY, SWATCH_GRAY, SWATCH_LGRAY, SWATCH_WHITE,
  SWATCH_RED, SWATCH_ORANGE, SWATCH_YELLOW, SWATCH_GREEN,
  SWATCH_TEAL, SWATCH_TIFFANY, SWATCH_CYAN, SWATCH_BLUE,
  SWATCH_INDIGO, SWATCH_PURPLE, SWATCH_PINK,
]

// Web-safe + common system font options for the watermark text (105 fonts)
const FONT_OPTIONS: { label: string; value: string }[] = [
  // ── Sans-serif ──────────────────────────────────────────────────────────────
  { label: 'Arial',                  value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Arial Black',            value: "'Arial Black', 'Arial Bold', Gadget, sans-serif" },
  { label: 'Arial Narrow',           value: "'Arial Narrow', Arial, sans-serif" },
  { label: 'Arial Rounded MT Bold',  value: "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif" },
  { label: 'Helvetica',              value: "Helvetica, 'Helvetica Neue', Arial, sans-serif" },
  { label: 'Helvetica Neue',         value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Verdana',                value: 'Verdana, Geneva, Tahoma, sans-serif' },
  { label: 'Tahoma',                 value: 'Tahoma, Verdana, Segoe, sans-serif' },
  { label: 'Trebuchet MS',           value: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif" },
  { label: 'Geneva',                 value: 'Geneva, Tahoma, Verdana, sans-serif' },
  { label: 'Impact',                 value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { label: 'Haettenschweiler',       value: "Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { label: 'Segoe UI',               value: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  { label: 'Calibri',                value: "Calibri, Candara, Segoe, 'Segoe UI', Optima, Arial, sans-serif" },
  { label: 'Candara',                value: "Candara, Calibri, Segoe, 'Segoe UI', Optima, Arial, sans-serif" },
  { label: 'Corbel',                 value: "Corbel, 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Verdana, sans-serif" },
  { label: 'Franklin Gothic Medium', value: "'Franklin Gothic Medium', 'Franklin Gothic', 'ITC Franklin Gothic', Arial, sans-serif" },
  { label: 'Microsoft Sans Serif',   value: "'Microsoft Sans Serif', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Bahnschrift',            value: "Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif" },
  { label: 'Lucida Grande',          value: "'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif" },
  { label: 'Optima',                 value: "Optima, Segoe, 'Segoe UI', Candara, Calibri, Arial, sans-serif" },
  { label: 'Gill Sans',              value: "'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif" },
  { label: 'Gill Sans Nova',         value: "'Gill Sans Nova', 'Gill Sans MT', 'Gill Sans', Calibri, sans-serif" },
  { label: 'Futura',                 value: "Futura, 'Century Gothic', 'Trebuchet MS', Arial, sans-serif" },
  { label: 'Avenir',                 value: "Avenir, 'Avenir Next', Corbel, 'Century Gothic', sans-serif" },
  { label: 'Avenir Next',            value: "'Avenir Next', Avenir, Corbel, 'Century Gothic', sans-serif" },
  { label: 'Century Gothic',         value: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif" },
  { label: 'Tw Cen MT',              value: "'Tw Cen MT', 'Century Gothic', Futura, Arial, sans-serif" },
  // ── Serif ────────────────────────────────────────────────────────────────────
  { label: 'Times New Roman',        value: "'Times New Roman', Times, serif" },
  { label: 'Georgia',                value: "Georgia, Times, 'Times New Roman', serif" },
  { label: 'Palatino',               value: "Palatino, 'Palatino Linotype', 'Palatino LT STD', 'Book Antiqua', Georgia, serif" },
  { label: 'Palatino Linotype',      value: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
  { label: 'Cambria',                value: "Cambria, 'Hoefler Text', 'Liberation Serif', Times, 'Times New Roman', serif" },
  { label: 'Constantia',             value: "Constantia, 'Lucida Bright', 'Lucida Serif', Lucida, Georgia, serif" },
  { label: 'Sitka Text',             value: "'Sitka Text', Cambria, Georgia, serif" },
  { label: 'Sylfaen',                value: "Sylfaen, Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif" },
  { label: 'Hoefler Text',           value: "'Hoefler Text', 'Baskerville Old Face', Garamond, 'Times New Roman', serif" },
  { label: 'Baskerville',            value: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif" },
  { label: 'Big Caslon',             value: "'Big Caslon', 'Book Antiqua', 'Palatino Linotype', Georgia, serif" },
  { label: 'Didot',                  value: "Didot, 'Didot LT STD', 'Hoefler Text', Garamond, 'Times New Roman', serif" },
  { label: 'New York',               value: "'New York', 'Iowan Old Style', 'Apple Garamond', Baskerville, 'Times New Roman', serif" },
  { label: 'Iowan Old Style',        value: "'Iowan Old Style', 'Apple Garamond', Baskerville, 'Times New Roman', serif" },
  { label: 'Book Antiqua',           value: "'Book Antiqua', Palatino, 'Palatino Linotype', 'Palatino LT STD', Georgia, serif" },
  { label: 'Garamond',               value: "Garamond, Baskerville, 'Baskerville Old Face', 'Hoefler Text', 'Times New Roman', serif" },
  { label: 'Bookman Old Style',      value: "'Bookman Old Style', Bookman, Garamond, Palatino, Georgia, serif" },
  { label: 'Bodoni MT',              value: "'Bodoni MT', Didot, 'Didot LT STD', 'Hoefler Text', 'Times New Roman', serif" },
  { label: 'Bodoni 72',              value: "'Bodoni 72', 'Bodoni MT', Didot, 'Hoefler Text', Georgia, serif" },
  { label: 'Century Schoolbook',     value: "'Century Schoolbook', Century, 'New Century Schoolbook', Georgia, serif" },
  { label: 'Goudy Old Style',        value: "'Goudy Old Style', Garamond, 'Big Caslon', 'Times New Roman', serif" },
  { label: 'Perpetua',               value: "Perpetua, Baskerville, 'Big Caslon', 'Palatino Linotype', Palatino, serif" },
  { label: 'Rockwell',               value: "Rockwell, 'Courier Bold', Courier, Georgia, 'Times New Roman', serif" },
  { label: 'Rockwell Nova',          value: "'Rockwell Nova', Rockwell, 'Courier Bold', Georgia, serif" },
  { label: 'Lucida Bright',          value: "'Lucida Bright', Georgia, serif" },
  { label: 'Bell MT',                value: "'Bell MT', 'Goudy Old Style', Georgia, serif" },
  { label: 'Centaur',                value: "Centaur, Garamond, 'Times New Roman', serif" },
  { label: 'Calisto MT',             value: "'Calisto MT', 'Bookman Old Style', Garamond, Georgia, serif" },
  { label: 'High Tower Text',        value: "'High Tower Text', 'Gill Sans MT', Georgia, serif" },
  { label: 'American Typewriter',    value: "'American Typewriter', Consolas, 'Courier New', Courier, monospace" },
  // ── Monospace ────────────────────────────────────────────────────────────────
  { label: 'Courier New',            value: "'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter', monospace" },
  { label: 'Courier',                value: "Courier, 'Courier New', 'Lucida Sans Typewriter', monospace" },
  { label: 'Lucida Console',         value: "'Lucida Console', 'Lucida Sans Typewriter', Monaco, monospace" },
  { label: 'Lucida Sans Typewriter', value: "'Lucida Sans Typewriter', 'Lucida Console', Monaco, monospace" },
  { label: 'Consolas',               value: "Consolas, 'Andale Mono', 'Lucida Console', 'Lucida Sans Typewriter', monospace" },
  { label: 'Monaco',                 value: 'Monaco, Consolas, monospace' },
  { label: 'Andale Mono',            value: "'Andale Mono', AndaleMono, monospace" },
  { label: 'Menlo',                  value: "Menlo, Monaco, Consolas, 'Courier New', monospace" },
  { label: 'Cascadia Code',          value: "'Cascadia Code', Consolas, 'Courier New', monospace" },
  { label: 'Cascadia Mono',          value: "'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace" },
  { label: 'SF Mono',                value: "'SF Mono', Menlo, Monaco, Consolas, monospace" },
  // ── Display ──────────────────────────────────────────────────────────────────
  { label: 'Copperplate',            value: "Copperplate, 'Copperplate Gothic Light', fantasy" },
  { label: 'Copperplate Gothic',     value: "'Copperplate Gothic Bold', 'Copperplate Gothic Light', Copperplate, fantasy" },
  { label: 'Papyrus',                value: 'Papyrus, fantasy' },
  { label: 'Gabriola',               value: "Gabriola, Palatino, 'Palatino Linotype', Georgia, serif" },
  { label: 'Luminari',               value: 'Luminari, fantasy' },
  { label: 'Herculanum',             value: 'Herculanum, Papyrus, fantasy' },
  { label: 'Trattatello',            value: 'Trattatello, fantasy' },
  { label: 'Ink Free',               value: "'Ink Free', 'Segoe Print', 'Bradley Hand', cursive" },
  { label: 'Segoe Print',            value: "'Segoe Print', 'Bradley Hand', cursive" },
  // ── Script / Cursive ─────────────────────────────────────────────────────────
  { label: 'Comic Sans MS',          value: "'Comic Sans MS', 'Comic Sans', cursive" },
  { label: 'Brush Script MT',        value: "'Brush Script MT', 'Brush Script Std', cursive" },
  { label: 'Segoe Script',           value: "'Segoe Script', cursive" },
  { label: 'Monotype Corsiva',       value: "'Monotype Corsiva', 'Corsiva Hebrew', 'Apple Chancery', cursive" },
  { label: 'Apple Chancery',         value: "'Apple Chancery', cursive" },
  { label: 'Zapfino',                value: "Zapfino, 'Snell Roundhand', cursive" },
  { label: 'Snell Roundhand',        value: "'Snell Roundhand', 'Apple Chancery', cursive" },
  { label: 'Bradley Hand',           value: "'Bradley Hand', 'Bradley Hand ITC', cursive" },
  { label: 'Lucida Handwriting',     value: "'Lucida Handwriting', 'Apple Chancery', cursive" },
  { label: 'Lucida Calligraphy',     value: "'Lucida Calligraphy', 'Apple Chancery', cursive" },
  { label: 'Vivaldi',                value: "Vivaldi, 'Zapf Chancery', 'Monotype Corsiva', cursive" },
  { label: 'Edwardian Script ITC',   value: "'Edwardian Script ITC', 'Palace Script MT', cursive" },
  { label: 'Palace Script MT',       value: "'Palace Script MT', 'Edwardian Script ITC', cursive" },
  { label: 'French Script MT',       value: "'French Script MT', cursive" },
  { label: 'Mistral',                value: 'Mistral, cursive' },
  { label: 'Freestyle Script',       value: "'Freestyle Script', cursive" },
  { label: 'Kunstler Script',        value: "'Kunstler Script', cursive" },
  { label: 'SignPainter',            value: "SignPainter, 'URW Chancery L', cursive" },
  { label: 'Marker Felt',            value: "'Marker Felt', 'Segoe Print', cursive" },
  { label: 'Chalkboard',             value: "'Chalkboard', 'Comic Sans MS', cursive" },
  { label: 'Chalkduster',            value: 'Chalkduster, fantasy' },
]

const DEFAULT_CONFIG: WatermarkConfig = {
  type: 'text',
  mode: 'tiled',
  text: 'CONFIDENTIAL',
  textColor: SWATCH_GRAY,
  fontFamily: FONT_OPTIONS[0].value,
  fontSize: 24,
  spacingX: 120,
  spacingY: 120,
  posX: 50,
  posY: 50,
  tileOffsetX: 60,
  tileOffsetY: 60,
  opacity: 0.3,
  rotation: -30,
  canvasWidth: 800,
  canvasHeight: 600,
  transparentBg: false,
  bgColor: '#ffffff',
  stagger: false,
  mirrorH: false,
  mirrorV: false,
  wmFit: 'contain',
  bgFit: 'cover',
  wmCrop: FULL_CROP,
  bgCrop: FULL_CROP,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 700,
      color: t.text,
      letterSpacing: '0.01em',
      marginBottom: 7,
    }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: t.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: 4,
    }}>
      {children}
    </div>
  )
}

function NvidiaInput({ value, onChange, placeholder, ariaLabel }: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: '7px 10px',
        color: t.text,
        fontSize: 14,
        fontWeight: 400,
        fontFamily: 'Arial, Helvetica, sans-serif',
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => (e.target.style.borderColor = t.accent)}
      onBlur={(e) => (e.target.style.borderColor = t.border)}
    />
  )
}

function DimensionInput({ label, value, onChange }: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState({ source: value, text: String(value) })
  const raw = draft.source === value ? draft.text : String(value)
  const commit = () => {
    const parsed = Number(raw)
    if (!raw.trim() || !Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setDraft({ source: value, text: String(value) })
      return
    }
    const next = Math.min(8000, Math.max(1, parsed))
    setDraft({ source: next, text: String(next) })
    onChange(next)
  }
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={1}
        max={8000}
        step={1}
        value={raw}
        aria-label={`Canvas ${label.toLowerCase()} in pixels`}
        onChange={(event) => setDraft({ source: value, text: event.target.value })}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
        style={{ width: '100%', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: '7px 10px', color: t.text, fontSize: 14, fontFamily: 'Arial, Helvetica, sans-serif' }}
      />
    </div>
  )
}

function RangeInput({ label, value, min, max, unit = '', onChange }: {
  label: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (v: number) => void
}) {
  // Local string state lets the user type freely without being blocked mid-input
  const [raw, setRaw] = useState(String(value))
  const inputId = useId()

  // Keep raw in sync when the value changes from the slider or external reset
  useEffect(() => { setRaw(String(value)) }, [value])

  const commit = (str: string) => {
    const parsed = Number(str)
    if (!str.trim() || !Number.isFinite(parsed)) { setRaw(String(value)); return }
    const clamped = Math.min(max, Math.max(min, parsed))
    onChange(clamped)
    setRaw(String(clamped))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <label htmlFor={inputId} style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.02em', minWidth: 0, whiteSpace: 'nowrap' }}>
          {label}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <input
            type="number"
            value={raw}
            aria-label={`${label} value in ${unit || 'pixels'}`}
            min={min}
            max={max}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => { e.target.style.borderColor = t.border; commit(e.target.value) }}
            onFocus={(e) => (e.target.style.borderColor = t.accent)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
            style={{
              width: 50,
              background: t.bgSurface,
              border: `1px solid ${t.border}`,
              borderRight: 'none',
              borderRadius: `${t.radius} 0 0 ${t.radius}`,
              padding: '2px 4px',
              color: t.sliderThumb,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              outline: 'none',
              textAlign: 'right',
              MozAppearance: 'textfield',
            } as React.CSSProperties}
          />
          <span style={{
            background: t.bgRaised,
            border: `1px solid ${t.border}`,
            borderRadius: `0 ${t.radius} ${t.radius} 0`,
            padding: '2px 4px',
            fontSize: 10,
            fontWeight: 700,
            color: t.textMuted,
            fontFamily: 'monospace',
            userSelect: 'none' as const,
            whiteSpace: 'nowrap' as const,
          }}>
            {unit || 'px'}
          </span>
        </div>
      </div>
      <input id={inputId} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function CheckboxRow({ id, label, checked, onChange }: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' as const }}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>
        {label}
      </span>
    </label>
  )
}

function GreenButton({ onClick, children, fullWidth = false, disabled = false }: {
  onClick: () => void
  children: React.ReactNode
  fullWidth?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : undefined,
        background: disabled ? t.bgRaised : t.accent,
        border: `2px solid ${disabled ? t.border : t.accent}`,
        borderRadius: t.radius,
        padding: '11px 13px',
        color: disabled ? t.textDisabled : '#000000',
        fontSize: 15, fontWeight: 700,
        fontFamily: 'Arial, Helvetica, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        transition: 'all 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.background = t.accentHover
        e.currentTarget.style.borderColor = t.accentHover
        e.currentTarget.style.color = t.text
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.background = t.accent
        e.currentTarget.style.borderColor = t.accent
        e.currentTarget.style.color = '#000000'
      }}
    >
      {children}
    </button>
  )
}

// Searchable font picker — shows selected font in trigger, filters list by query
function FontSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const selectedLabel = FONT_OPTIONS.find(f => f.value === value)?.label ?? 'Arial'
  const matches = query.trim()
    ? FONT_OPTIONS.filter(f => f.label.toLowerCase().includes(query.toLowerCase()))
    : [FONT_OPTIONS.find(f => f.value === value) ?? FONT_OPTIONS[0], ...FONT_OPTIONS.filter(f => f.value !== value)]
  const visibleFonts = matches.slice(0, 5)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    triggerRef.current?.focus()
  }

  const choose = (font: typeof FONT_OPTIONS[number]) => {
    onChange(font.value)
    close()
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen(true); setQuery(''); setActiveIndex(0) }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Font: ${selectedLabel}`}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.bgSurface, border: `1px solid ${open ? t.accent : t.border}`,
          borderRadius: t.radius, padding: '7px 10px',
          color: t.text, fontSize: 13, fontWeight: 700, fontFamily: value,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
        <span aria-hidden="true" style={{ color: t.accent, marginLeft: 8 }}>⌄</span>
      </button>
      {open && createPortal(<div className="font-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
        <div className="font-dialog" role="dialog" aria-modal="true" aria-label="Choose font" onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close() }
          if (event.key === 'Tab') {
            if (event.shiftKey && document.activeElement === inputRef.current) { event.preventDefault(); closeRef.current?.focus() }
            if (!event.shiftKey && document.activeElement === closeRef.current) { event.preventDefault(); inputRef.current?.focus() }
          }
        }}>
          <div className="font-dialog-heading">Choose font <span>{FONT_OPTIONS.length} available</span></div>
          <input ref={inputRef} role="combobox" aria-label="Search fonts" aria-expanded="true" aria-controls="font-options"
            aria-autocomplete="list" aria-activedescendant={visibleFonts.length ? `font-option-${activeIndex}` : undefined}
            value={query} placeholder="Search by font name" onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, visibleFonts.length - 1)) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)) }
              if (event.key === 'Enter' && visibleFonts[activeIndex]) { event.preventDefault(); choose(visibleFonts[activeIndex]) }
            }} />
          <div id="font-options" role="listbox" aria-label="Matching fonts" className="font-options">
            {visibleFonts.length ? visibleFonts.map((font, index) => <button key={font.value} id={`font-option-${index}`}
              type="button" role="option" tabIndex={-1} aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''} style={{ fontFamily: font.value }}
              onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(font)}>{font.label}</button>)
              : <div className="settings-note">No matching fonts. Try a shorter name.</div>}
          </div>
          <div className="font-dialog-footer"><span>{matches.length > 5 ? 'Keep typing to narrow results' : '↑ ↓ to choose · Enter to apply'}</span>
            <button ref={closeRef} type="button" className="utility-button" onClick={close}>Cancel</button></div>
        </div>
      </div>, document.body)}
    </div>
  )
}

// Compact segmented button group for selecting an ObjectFit value
function FitToggle({ label, value, options, onChange }: {
  label: string
  value: ObjectFit
  options: { label: string; value: ObjectFit }[]
  onChange: (v: ObjectFit) => void
}) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex' }}>
      {options.map((opt, i) => {
        const active = value === opt.value
        const isFirst = i === 0
        const isLast = i === options.length - 1
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={`${label}: ${opt.label}`}
            style={{
              flex: 1,
              padding: '3px 7px',
              background: active ? t.accent : 'transparent',
              border: `1px solid ${t.accent}`,
              borderLeft: isFirst ? `1px solid ${t.accent}` : 'none',
              borderRadius: isFirst
                ? `${t.radius} 0 0 ${t.radius}`
                : isLast
                ? `0 ${t.radius} ${t.radius} 0`
                : '0',
              color: active ? '#000000' : t.text,
              fontSize: 11, fontWeight: 700,
              fontFamily: 'Arial, Helvetica, sans-serif',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function WatermarkCanvas({ config, bgImage, watermarkImage, onPlacementChange }: {
  config: WatermarkConfig
  bgImage: HTMLImageElement | null
  watermarkImage: HTMLImageElement | null
  onPlacementChange: (start: WatermarkConfig, dx: number, dy: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; config: WatermarkConfig } | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const pendingDragRef = useRef<{ config: WatermarkConfig; dx: number; dy: number } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => () => {
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = Math.min(1, 1800 / Math.max(config.canvasWidth, config.canvasHeight), Math.sqrt(2_000_000 / (config.canvasWidth * config.canvasHeight)))
    const previewWidth = Math.max(1, Math.round(config.canvasWidth * scale))
    const previewHeight = Math.max(1, Math.round(config.canvasHeight * scale))
    if (canvas.width !== previewWidth) canvas.width = previewWidth
    if (canvas.height !== previewHeight) canvas.height = previewHeight
    ctx.setTransform(canvas.width / config.canvasWidth, 0, 0, canvas.height / config.canvasHeight, 0, 0)
    try {
      renderWatermark(ctx, config, bgImage, watermarkImage)
      setPreviewError(null)
    } catch (error) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setPreviewError(error instanceof Error ? error.message : 'Could not draw the preview.')
    }
  }, [config, bgImage, watermarkImage])

  useEffect(() => {
    const frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [render])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Preview header */}
      <div style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: t.bgRaised,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live Preview
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: 'monospace' }}>
          {config.canvasWidth} × {config.canvasHeight}px
        </span>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          background: t.bgRaised,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          overflow: 'hidden',
          padding: 16,
          minHeight: 0,
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          className={config.transparentBg ? 'canvas-checkerboard' : ''}
          tabIndex={0}
          aria-label="Watermark preview. Drag or use arrow keys to move the watermark; hold Shift for larger steps."
          onKeyDown={(event) => {
            const step = event.shiftKey ? 10 : 1
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
            }
            const delta = directions[event.key]
            if (!delta) return
            event.preventDefault()
            onPlacementChange(config, delta[0], delta[1])
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 && event.pointerType !== 'touch') return
            if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
            pendingDragRef.current = null
            dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, config }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const start = dragRef.current
            if (!start || start.pointerId !== event.pointerId) return
            const bounds = event.currentTarget.getBoundingClientRect()
            pendingDragRef.current = {
              config: start.config,
              dx: (event.clientX - start.x) * start.config.canvasWidth / bounds.width,
              dy: (event.clientY - start.y) * start.config.canvasHeight / bounds.height,
            }
            if (dragFrameRef.current === null) {
              dragFrameRef.current = requestAnimationFrame(() => {
                dragFrameRef.current = null
                const pending = pendingDragRef.current
                pendingDragRef.current = null
                if (pending) onPlacementChange(pending.config, pending.dx, pending.dy)
              })
            }
          }}
          onPointerUp={(event) => {
            const start = dragRef.current
            if (!start || start.pointerId !== event.pointerId) return
            if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
            pendingDragRef.current = null
            const bounds = event.currentTarget.getBoundingClientRect()
            onPlacementChange(start.config, (event.clientX - start.x) * start.config.canvasWidth / bounds.width, (event.clientY - start.y) * start.config.canvasHeight / bounds.height)
            dragRef.current = null
          }}
          onPointerCancel={(event) => {
            if (dragRef.current?.pointerId !== event.pointerId) return
            if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
            pendingDragRef.current = null
            dragRef.current = null
          }}
          style={{ maxWidth: '100%', maxHeight: '100%', boxShadow: t.shadow, display: 'block', border: `1px solid ${t.borderStrong}`, cursor: 'grab', touchAction: 'none' }}
        />
        {previewError && <div role="alert" style={{ position: 'absolute', left: 24, right: 24, bottom: 24, padding: 10, borderRadius: t.radius, background: t.bgSurface, color: '#ff6b6b', fontSize: 12, textAlign: 'center' }}>{previewError}</div>}
      </div>

    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null)
  const [cropTarget, setCropTarget] = useState<'background' | 'watermark' | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [wmUploadError, setWmUploadError] = useState<string | null>(null)
  const [bgUploadError, setBgUploadError] = useState<string | null>(null)
  const [wmLoading, setWmLoading] = useState(false)
  const [bgLoading, setBgLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const watermarkLoadId = useRef(0)
  const backgroundLoadId = useRef(0)
  const watermarkAbortRef = useRef<AbortController | null>(null)
  const backgroundAbortRef = useRef<AbortController | null>(null)
  const watermarkImageRef = useRef<HTMLImageElement | null>(null)
  const backgroundImageRef = useRef<HTMLImageElement | null>(null)
  const exportInProgress = useRef(false)

  useEffect(() => () => {
    watermarkLoadId.current++
    backgroundLoadId.current++
    watermarkAbortRef.current?.abort()
    backgroundAbortRef.current?.abort()
    if (watermarkImageRef.current) releaseImageFile(watermarkImageRef.current)
    if (backgroundImageRef.current) releaseImageFile(backgroundImageRef.current)
  }, [])

  const update = <K extends keyof WatermarkConfig>(key: K, value: WatermarkConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const loadWatermark = async (file: File) => {
    if (exportInProgress.current) return
    const requestId = ++watermarkLoadId.current
    watermarkAbortRef.current?.abort()
    const controller = new AbortController()
    watermarkAbortRef.current = controller
    setCropTarget(null)
    setWmUploadError(null)
    setWmLoading(true)
    try {
      const image = await loadImageFile(file, controller.signal)
      if (requestId !== watermarkLoadId.current) {
        releaseImageFile(image)
        return
      }
      setCropTarget(null)
      if (watermarkImageRef.current) releaseImageFile(watermarkImageRef.current)
      watermarkImageRef.current = image
      setWatermarkImage(image)
      update('wmCrop', { ...FULL_CROP })
    } catch (error) {
      if (requestId === watermarkLoadId.current) setWmUploadError(getImageUploadErrorMessage(error))
    } finally {
      if (requestId === watermarkLoadId.current) {
        watermarkAbortRef.current = null
        setWmLoading(false)
      }
    }
  }

  const loadBackground = async (file: File) => {
    if (exportInProgress.current) return
    const requestId = ++backgroundLoadId.current
    backgroundAbortRef.current?.abort()
    const controller = new AbortController()
    backgroundAbortRef.current = controller
    setCropTarget(null)
    setBgUploadError(null)
    setBgLoading(true)
    try {
      const image = await loadImageFile(file, controller.signal)
      if (requestId !== backgroundLoadId.current) {
        releaseImageFile(image)
        return
      }
      setCropTarget(null)
      if (backgroundImageRef.current) releaseImageFile(backgroundImageRef.current)
      backgroundImageRef.current = image
      setBgImage(image)
      update('bgCrop', { ...FULL_CROP })
    } catch (error) {
      if (requestId === backgroundLoadId.current) setBgUploadError(getImageUploadErrorMessage(error))
    } finally {
      if (requestId === backgroundLoadId.current) {
        backgroundAbortRef.current = null
        setBgLoading(false)
      }
    }
  }

  const removeWatermark = () => {
    if (exportInProgress.current) return
    watermarkLoadId.current++
    watermarkAbortRef.current?.abort()
    watermarkAbortRef.current = null
    if (watermarkImageRef.current) releaseImageFile(watermarkImageRef.current)
    watermarkImageRef.current = null
    setWmLoading(false)
    setCropTarget((target) => target === 'watermark' ? null : target)
    setWatermarkImage(null)
    update('wmCrop', { ...FULL_CROP })
    setWmUploadError(null)
  }

  const removeBackground = () => {
    if (exportInProgress.current) return
    backgroundLoadId.current++
    backgroundAbortRef.current?.abort()
    backgroundAbortRef.current = null
    if (backgroundImageRef.current) releaseImageFile(backgroundImageRef.current)
    backgroundImageRef.current = null
    setBgLoading(false)
    setCropTarget((target) => target === 'background' ? null : target)
    setBgImage(null)
    update('bgCrop', { ...FULL_CROP })
    setBgUploadError(null)
  }

  const movePlacement = (start: WatermarkConfig, dx: number, dy: number) => {
    setConfig((previous) => {
      if (start.mode === 'single') {
        return {
          ...previous,
          posX: Math.min(100, Math.max(0, start.posX + (start.mirrorH ? -dx : dx) / start.canvasWidth * 100)),
          posY: Math.min(100, Math.max(0, start.posY + (start.mirrorV ? -dy : dy) / start.canvasHeight * 100)),
        }
      }
      const phase = (value: number, span: number) => ((value % span) + span) % span
      return {
        ...previous,
        tileOffsetX: phase(Math.round(start.tileOffsetX + (start.mirrorH ? -dx : dx)), start.spacingX),
        tileOffsetY: phase(Math.round(start.tileOffsetY + (start.mirrorV ? -dy : dy)), start.spacingY * (start.stagger ? 2 : 1)),
      }
    })
  }

  const download = async () => {
    if (exportInProgress.current || wmLoading || bgLoading) return
    exportInProgress.current = true
    setExportError(null)
    setDownloading(true)
    try {
      if (config.canvasWidth * config.canvasHeight > 32_000_000) {
        throw new Error('Canvas is too large to export. Keep width × height under 32 million pixels.')
      }
      if (config.type === 'image' && !watermarkImage) {
        throw new Error('Upload a watermark image before exporting.')
      }
      if (config.type === 'text' && !config.text.trim()) {
        throw new Error('Enter watermark text before exporting.')
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const canvas = document.createElement('canvas')
      try {
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas export is unavailable in this browser.')

        canvas.width = config.canvasWidth
        canvas.height = config.canvasHeight
        renderWatermark(ctx, config, bgImage, watermarkImage)
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create the PNG. Try a smaller canvas.')), 'image/png')
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `watermark-${Date.now()}.png`
        link.href = url
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      } finally {
        canvas.width = 0
        canvas.height = 0
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export the PNG.')
    } finally {
      exportInProgress.current = false
      setDownloading(false)
    }
  }

  const [activeTab, setActiveTab] = useState<'source' | 'layout' | 'style' | 'canvas'>('source')
  const [canvasView, setCanvasView] = useState<'size' | 'background'>('size')
  const [colorOpen, setColorOpen] = useState(false)
  const [shortPreview, setShortPreview] = useState(false)
  const exportTooLarge = config.canvasWidth * config.canvasHeight > 32_000_000

  return (
    <div className={`app-shell${shortPreview ? ' show-short-preview' : ''}`}>

      {/* Header */}
      <header style={{ flexShrink: 0, background: t.bg, borderBottom: `2px solid ${t.accent}`, zIndex: 50 }}>
        <div style={{ padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ki-logo.png" alt="KI Logo" style={{ height: 28, objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: t.accent, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Stamped
                </span>
                <span className="header-subtitle" style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Tiled Watermark Generator
                </span>
              </div>
              <span className="header-subtitle" style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, lineHeight: 1.2 }}>
                Custom size, spacing, rotation &amp; transparency
              </span>
            </div>
          </div>
          <button type="button" className="short-preview-toggle" aria-pressed={shortPreview} onClick={() => setShortPreview((shown) => !shown)}>
            {shortPreview ? 'Settings' : 'Preview'}
          </button>
        </div>
      </header>

      <div className="workspace-tabs" role="tablist" aria-label="Editor controls" onKeyDown={(event) => {
        const tabs = ['source', 'layout', 'style', 'canvas'] as const
        const current = tabs.indexOf(activeTab)
        const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
          : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        setActiveTab(tabs[next])
        setColorOpen(false)
        setShortPreview(false)
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
      }}>
        {(['source', 'layout', 'style', 'canvas'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={tab === 'source' ? 'source-settings' : 'detail-settings'}
            tabIndex={activeTab === tab ? 0 : -1}
            className={activeTab === tab ? 'active' : ''} onClick={() => { setActiveTab(tab); setColorOpen(false); setShortPreview(false) }}>
            {tab === 'source' ? 'Watermark' : tab}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="main-grid">

        {/* Left controls panel — watermark type / content */}
        <div id="source-settings" role="tabpanel" aria-label="Watermark settings" className={`panel-left${activeTab !== 'source' ? ' hidden' : ''}`} style={{ background: t.bgSurface, borderRight: `1px solid ${t.border}` }}>
          <div className="settings-content">

            {/* Type toggle */}
            <div>
              <SectionLabel>Watermark</SectionLabel>
              <div className="segmented-row" role="group" aria-label="Watermark type">
                {(['text', 'image'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => update('type', tp)}
                    aria-pressed={config.type === tp}
                  >
                    {tp === 'text' ? 'Text' : 'Image'}
                  </button>
                ))}
              </div>
            </div>

            {/* Text options */}
            {config.type === 'text' && (
              <div className="settings-section">
                <div>
                  <FieldLabel>Watermark Text</FieldLabel>
                  <NvidiaInput value={config.text} onChange={(v) => update('text', v)} placeholder="Enter watermark text" ariaLabel="Watermark text" />
                </div>
                <div>
                  <FieldLabel>Font</FieldLabel>
                  <FontSearch value={config.fontFamily} onChange={(v) => update('fontFamily', v)} />
                </div>
                <div>
                  <FieldLabel>Text Color</FieldLabel>
                  <div className="color-row">
                    <input type="color" aria-label="Text color" value={config.textColor} onChange={(e) => update('textColor', e.target.value)} />
                    {[SWATCH_BLACK, SWATCH_WHITE, SWATCH_GRAY, SWATCH_RED, SWATCH_TIFFANY, SWATCH_BLUE].map((color) => (
                      <button key={color} type="button" className="color-swatch" title={color} aria-label={`Text color ${color}`}
                        aria-pressed={config.textColor === color} onClick={() => update('textColor', color)} style={{ background: color }} />
                    ))}
                    <button type="button" className="palette-button" onClick={() => setColorOpen((open) => !open)} aria-expanded={colorOpen}>More</button>
                  </div>
                </div>
              </div>
            )}

            {/* Image watermark */}
            {config.type === 'image' && (
              <div>
                <SectionLabel>Watermark Image</SectionLabel>
                <label className="file-upload"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 13px', border: `2px dashed ${t.border}`, borderRadius: t.radius,
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     {watermarkImage ? 'Click to replace image' : 'Click to upload image'}
                  </span>
                   <input type="file" accept="image/*" className="file-input" aria-label="Upload watermark image" disabled={downloading} onChange={(e) => {
                    const file = e.target.files?.[0]
                     e.target.value = ''
                     if (file) void loadWatermark(file)
                  }} />
                </label>
                {wmUploadError && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#ff6b6b', fontWeight: 700 }}>{wmUploadError}</div>
                )}
                 {wmLoading && <div role="status" style={{ marginTop: 6, fontSize: 11, color: t.textMuted }}>Loading image…</div>}
                 {watermarkImage && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                     <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>&#10003; Watermark image ready</span>
                     <button className="utility-button" disabled={wmLoading || downloading} onClick={() => setCropTarget('watermark')}>Crop image</button>
                     <button className="utility-button" disabled={downloading} onClick={removeWatermark}>Remove</button>
                   </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <FieldLabel>Object Fit</FieldLabel>
                  <FitToggle
                     label="Watermark image fit"
                    value={config.wmFit}
                    options={[
                      { label: 'Contain', value: 'contain' },
                      { label: 'Cover',   value: 'cover'   },
                      { label: 'Fill',    value: 'fill'    },
                      { label: 'None',    value: 'none'    },
                    ]}
                    onChange={(v) => update('wmFit', v)}
                  />
                </div>
              </div>
            )}

            {config.type === 'text' && colorOpen && <div className="color-popover" role="group" aria-label="All text colors">
              <div className="popover-heading"><span>Color palette</span><button type="button" className="utility-button" onClick={() => setColorOpen(false)}>Close</button></div>
              <div className="palette-grid">
                {TEXT_COLOR_SWATCHES.map((color) => (
                  <button key={color} type="button" className="color-swatch" title={color} aria-label={`Text color ${color}`}
                    aria-pressed={config.textColor === color} onClick={() => { update('textColor', color); setColorOpen(false) }} style={{ background: color }} />
                ))}
              </div>
            </div>}

          </div>
        </div>

        {/* Canvas preview */}
        <div className="panel-canvas">
          <WatermarkCanvas
            config={config}
            bgImage={bgImage}
            watermarkImage={watermarkImage}
            onPlacementChange={movePlacement}
          />
        </div>

        <div id="detail-settings" role="tabpanel" aria-label={`${activeTab} settings`} className={`panel-right${activeTab === 'source' ? ' hidden' : ''}`} style={{ background: t.bgSurface, borderRight: `1px solid ${t.border}` }}>
          <div className="settings-content">

            {activeTab === 'canvas' && <>
            <div className="segmented-row" role="group" aria-label="Canvas controls">
              <button type="button" aria-pressed={canvasView === 'size'} onClick={() => setCanvasView('size')}>Size & export</button>
              <button type="button" aria-pressed={canvasView === 'background'} onClick={() => setCanvasView('background')}>Background</button>
            </div>
            {canvasView === 'size' && <div className="settings-section">
            <div>
              <SectionLabel>Canvas Size (px)</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <DimensionInput label="Width" value={config.canvasWidth} onChange={(v) => update('canvasWidth', v)} />
                <DimensionInput label="Height" value={config.canvasHeight} onChange={(v) => update('canvasHeight', v)} />
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' as const }}>
                {[
                  { label: 'HD',     w: 1280, h: 720  },
                  { label: 'FHD',    w: 1920, h: 1080 },
                  { label: 'Square', w: 1000, h: 1000 },
                  { label: 'A4',     w: 794,  h: 1123 },
                ].map((p) => (
                  <button key={p.label} onClick={() => { update('canvasWidth', p.w); update('canvasHeight', p.h) }} style={{
                    padding: '3px 8px', background: 'transparent',
                    border: `1px solid ${t.border}`, borderRadius: t.radius,
                    color: t.textMuted, fontSize: 11, fontWeight: 700,
                    fontFamily: 'Arial', cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {exportTooLarge && <div role="alert" style={{ marginTop: 7, color: '#ff6b6b', fontSize: 11 }}>Reduce canvas size below 32 million pixels to export.</div>}
            </div>
            <CheckboxRow id="transparent" label="Transparent PNG" checked={config.transparentBg} onChange={(v) => update('transparentBg', v)} />
            {config.transparentBg && <div className="settings-note">Only watermark pixels are exported. The checkerboard marks the canvas bounds.</div>}
            </div>}

            {canvasView === 'background' && <div className="settings-section">
              <SectionLabel>Background</SectionLabel>
              {config.transparentBg && <div className="settings-note">This background is hidden while Transparent PNG is selected.</div>}
              {!config.transparentBg && <div className="color-row">
                <input type="color" aria-label="Background color" value={config.bgColor} onChange={(e) => update('bgColor', e.target.value)} />
                {['#ffffff', '#000000', '#f5f5f5', '#1a1a1a', '#e8f4f8', '#fff8e1'].map((color) => (
                  <button key={color} type="button" className="color-swatch" title={color} aria-label={`Background color ${color}`}
                    aria-pressed={config.bgColor === color} onClick={() => update('bgColor', color)} style={{ background: color }} />
                ))}
              </div>}
              <label className="file-upload background-upload">
                {bgImage ? 'Replace background image' : 'Upload background image'}
                <input type="file" accept="image/*" className="file-input" aria-label="Upload background image" disabled={downloading}
                  onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void loadBackground(file) }} />
              </label>
              {bgLoading && <span role="status" className="settings-note">Loading image…</span>}
              {bgUploadError && <span role="alert" className="settings-error">{bgUploadError}</span>}
              {bgImage && <>
                <div className="image-actions">
                  <span>Image ready</span>
                  <button type="button" className="utility-button" disabled={bgLoading || downloading} onClick={() => setCropTarget('background')}>Crop</button>
                  <button type="button" className="utility-button" disabled={downloading} onClick={removeBackground}>Remove</button>
                </div>
                <FitToggle label="Background fit" value={config.bgFit} options={[
                  { label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' },
                  { label: 'Fill', value: 'fill' }, { label: 'None', value: 'none' },
                ]} onChange={(fit) => update('bgFit', fit)} />
              </>}
            </div>}
            </>}

            {activeTab === 'layout' && <>
            <div>
              <SectionLabel>Placement mode</SectionLabel>
              <div className="segmented-row" role="group" aria-label="Placement mode">
                {(['tiled', 'single'] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={config.mode === mode} onClick={() => update('mode', mode)}>
                    {mode === 'tiled' ? 'Repeat' : 'Single'}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-section">
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8,
              }}>
                <SectionLabel>{config.mode === 'tiled' ? 'Pattern layout' : 'Stamp position'}</SectionLabel>
                <button
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    fontSize:  DEFAULT_CONFIG.fontSize,
                    spacingX:  DEFAULT_CONFIG.spacingX,
                    spacingY:  DEFAULT_CONFIG.spacingY,
                    posX:      DEFAULT_CONFIG.posX,
                    posY:      DEFAULT_CONFIG.posY,
                    tileOffsetX: DEFAULT_CONFIG.tileOffsetX,
                    tileOffsetY: DEFAULT_CONFIG.tileOffsetY,
                    opacity:   DEFAULT_CONFIG.opacity,
                    rotation:  DEFAULT_CONFIG.rotation,
                  }))}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${t.border}`,
                    borderRadius: t.radius,
                    padding: '3px 9px',
                    color: t.textMuted,
                    fontSize: 11, fontWeight: 700,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    cursor: 'pointer',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}
                >
                  Reset
                </button>
              </div>
              <RangeInput label="Size"      value={config.fontSize}                  min={8}    max={1000} unit="px" onChange={(v) => update('fontSize', v)} />
              {config.mode === 'tiled' && <>
                <div className="control-grid">
                  <RangeInput label="Spacing X" value={config.spacingX} min={20} max={2000} unit="px" onChange={(v) => setConfig((prev) => ({ ...prev, spacingX: v, tileOffsetX: Math.min(prev.tileOffsetX, v) }))} />
                  <RangeInput label="Spacing Y" value={config.spacingY} min={20} max={2000} unit="px" onChange={(v) => setConfig((prev) => ({ ...prev, spacingY: v, tileOffsetY: Math.min(prev.tileOffsetY, v * (prev.stagger ? 2 : 1)) }))} />
                  <RangeInput label="Origin X" value={Math.round(config.tileOffsetX)} min={0} max={config.spacingX} unit="px" onChange={(v) => update('tileOffsetX', v)} />
                  <RangeInput label="Origin Y" value={Math.round(config.tileOffsetY)} min={0} max={config.spacingY * (config.stagger ? 2 : 1)} unit="px" onChange={(v) => update('tileOffsetY', v)} />
                </div>
              </>}
              {config.mode === 'single' && <>
                <div className="control-grid">
                  <RangeInput label="Position X" value={config.posX} min={0} max={100} unit="%" onChange={(v) => update('posX', v)} />
                  <RangeInput label="Position Y" value={config.posY} min={0} max={100} unit="%" onChange={(v) => update('posY', v)} />
                </div>
              </>}
              {config.mode === 'tiled' && <CheckboxRow id="stagger" label="Stagger rows" checked={config.stagger} onChange={(v) => setConfig((prev) => ({ ...prev, stagger: v, tileOffsetY: Math.min(prev.tileOffsetY, prev.spacingY * (v ? 2 : 1)) }))} />}
              <div className="settings-note">Drag the preview to move the {config.mode === 'tiled' ? 'entire pattern' : 'stamp'}.</div>
            </div>
            </>}

            {activeTab === 'style' && <>
              <div className="settings-section">
                <SectionLabel>Watermark appearance</SectionLabel>
                <RangeInput label="Opacity" value={Math.round(config.opacity * 100)} min={0} max={100} unit="%" onChange={(v) => update('opacity', v / 100)} />
                <RangeInput label="Rotation" value={config.rotation} min={-180} max={180} unit="°" onChange={(v) => update('rotation', v)} />
              </div>
              <div className="settings-section">
                <SectionLabel>Flip</SectionLabel>
                <div className="control-grid">
                  <CheckboxRow id="mirrorH" label="Horizontal" checked={config.mirrorH} onChange={(v) => update('mirrorH', v)} />
                  <CheckboxRow id="mirrorV" label="Vertical" checked={config.mirrorV} onChange={(v) => update('mirrorV', v)} />
                </div>
              </div>
              <div className="settings-note">These changes apply to the watermark. Canvas transparency and background are under Canvas.</div>
            </>}

          </div>

        </div>

      </div>

      <div className="export-bar">
        {exportError && <div role="alert" style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 6 }}>{exportError}</div>}
        <span className="export-summary">PNG · {config.canvasWidth} × {config.canvasHeight}px · {config.transparentBg ? 'Transparent' : 'Background'}</span>
        <GreenButton onClick={download} disabled={downloading || wmLoading || bgLoading || exportTooLarge}>
          {downloading ? 'Exporting...' : wmLoading || bgLoading ? 'Loading image…' : exportTooLarge ? 'Canvas too large' : 'Export PNG'}
        </GreenButton>
      </div>

      {cropTarget && (cropTarget === 'background' ? bgImage : watermarkImage) && (
        <CropEditor
          key={cropTarget}
          image={(cropTarget === 'background' ? bgImage : watermarkImage)!}
          crop={cropTarget === 'background' ? config.bgCrop : config.wmCrop}
          onApply={(crop: CropRect) => {
            update(cropTarget === 'background' ? 'bgCrop' : 'wmCrop', crop)
            setCropTarget(null)
          }}
          onClose={() => setCropTarget(null)}
        />
      )}

    </div>
  )
}
