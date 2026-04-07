import { useState, useRef, useEffect, useCallback } from 'react'
import './index.css'
import { t } from './theme'

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

type WatermarkType = 'text' | 'image'
type WatermarkMode = 'tiled' | 'single'
type ObjectFit = 'fill' | 'contain' | 'cover' | 'none'

// Draws `img` into a `dw × dh` rect at `(dx, dy)` on `ctx` using CSS-style object-fit semantics.
function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  fit: ObjectFit,
) {
  const iw = img.naturalWidth  || img.width
  const ih = img.naturalHeight || img.height
  if (fit === 'fill') {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  if (fit === 'none') {
    // Draw at natural size, centred
    const ox = dx + (dw - iw) / 2
    const oy = dy + (dh - ih) / 2
    ctx.save()
    ctx.beginPath()
    ctx.rect(dx, dy, dw, dh)
    ctx.clip()
    ctx.drawImage(img, ox, oy, iw, ih)
    ctx.restore()
    return
  }
  const imgRatio = iw / ih
  const destRatio = dw / dh
  let sw = dw, sh = dh
  if (fit === 'contain') {
    if (imgRatio > destRatio) { sh = dw / imgRatio } else { sw = dh * imgRatio }
  } else { // cover
    if (imgRatio > destRatio) { sw = dh * imgRatio } else { sh = dw / imgRatio }
  }
  const ox = dx + (dw - sw) / 2
  const oy = dy + (dh - sh) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, dy, dw, dh)
  ctx.clip()
  ctx.drawImage(img, ox, oy, sw, sh)
  ctx.restore()
}

interface WatermarkConfig {
  type: WatermarkType
  mode: WatermarkMode
  text: string
  textColor: string
  fontFamily: string
  fontSize: number
  spacingX: number
  spacingY: number
  posX: number
  posY: number
  opacity: number
  rotation: number
  canvasWidth: number
  canvasHeight: number
  transparentBg: boolean
  bgColor: string
  stagger: boolean
  mirrorH: boolean
  mirrorV: boolean
  wmFit: ObjectFit
  bgFit: ObjectFit
  uploadedImage: string | null
}

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
  uploadedImage: null,
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  config: WatermarkConfig,
  watermarkImage: HTMLImageElement | null,
) {
  const { canvasWidth, canvasHeight, spacingX, spacingY, rotation, fontSize, type, text, textColor, fontFamily, stagger, mode, posX, posY, mirrorH, mirrorV, wmFit } = config

  ctx.globalAlpha = config.opacity

  // Apply global mirror transforms around canvas centre
  if (mirrorH || mirrorV) {
    ctx.save()
    ctx.translate(mirrorH ? canvasWidth : 0, mirrorV ? canvasHeight : 0)
    ctx.scale(mirrorH ? -1 : 1, mirrorV ? -1 : 1)
  }

  const drawStamp = (x: number, y: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rotation * Math.PI) / 180)
    if (type === 'text' && text) {
      ctx.font = `700 ${fontSize}px ${fontFamily}`
      ctx.fillStyle = textColor
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(text, 0, 0)
    } else if (type === 'image' && watermarkImage) {
      const imgSize = fontSize * 2
      drawImageFitted(ctx, watermarkImage, -imgSize / 2, -imgSize / 2, imgSize, imgSize, wmFit)
    }
    ctx.restore()
  }

  if (mode === 'single') {
    const x = (posX / 100) * canvasWidth
    const y = (posY / 100) * canvasHeight
    drawStamp(x, y)
  } else {
    const cols = Math.ceil(canvasWidth / spacingX) + 2
    const rows = Math.ceil(canvasHeight / spacingY) + 2
    for (let row = -1; row < rows; row++) {
      const offsetX = stagger && row % 2 !== 0 ? spacingX / 2 : 0
      for (let col = -1; col < cols; col++) {
        drawStamp(col * spacingX + offsetX, row * spacingY)
      }
    }
  }

  if (mirrorH || mirrorV) {
    ctx.restore()
  }

  ctx.globalAlpha = 1
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700,
      color: t.accent,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: `1px solid ${t.border}`,
    }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700,
      color: t.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

function NvidiaInput({ value, onChange, placeholder, type = 'text' }: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: '9px 11px',
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

  // Keep raw in sync when the value changes from the slider or external reset
  useEffect(() => { setRaw(String(value)) }, [value])

  const commit = (str: string) => {
    const parsed = Number(str)
    if (isNaN(parsed)) { setRaw(String(value)); return }
    const clamped = Math.min(max, Math.max(min, parsed))
    onChange(clamped)
    setRaw(String(clamped))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', flexShrink: 0 }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <input
            type="number"
            value={raw}
            min={min}
            max={max}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => { e.target.style.borderColor = t.border; commit(e.target.value) }}
            onFocus={(e) => (e.target.style.borderColor = t.accent)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
            style={{
              width: 62,
              background: t.bgSurface,
              border: `1px solid ${t.border}`,
              borderRight: 'none',
              borderRadius: `${t.radius} 0 0 ${t.radius}`,
              padding: '3px 6px',
              color: t.sliderThumb,
              fontSize: 12,
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
            padding: '3px 6px',
            fontSize: 11,
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
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
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
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' as const }}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
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
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedLabel = FONT_OPTIONS.find(f => f.value === value)?.label ?? 'Arial'
  const filtered = query.trim()
    ? FONT_OPTIONS.filter(f => f.label.toLowerCase().includes(query.toLowerCase()))
    : FONT_OPTIONS

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => open ? setOpen(false) : handleOpen()}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.bgSurface, border: `1px solid ${open ? t.accent : t.border}`,
          borderRadius: t.radius, padding: '9px 11px', paddingRight: 10,
          color: t.text, fontSize: 13, fontWeight: 700, fontFamily: value,
          cursor: 'pointer', textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={t.accent} strokeWidth="2" style={{ flexShrink: 0, marginLeft: 6,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: t.bgSurface, border: `1px solid ${t.accent}`,
          borderRadius: t.radius, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {/* Search input */}
          <div style={{ padding: '7px 8px', borderBottom: `1px solid ${t.border}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search fonts..."
              style={{
                width: '100%',                 background: t.bg, border: `1px solid ${t.border}`,
                borderRadius: t.radius, padding: '5px 8px',
                color: t.text, fontSize: 12, fontFamily: 'Arial, Helvetica, sans-serif' as string,
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = t.accent)}
              onBlur={e => (e.target.style.borderColor = t.border)}
            />
          </div>
          {/* Options list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: t.textMuted, fontSize: 12 }}>No fonts found</div>
            ) : filtered.map(f => (
              <button
                key={f.value}
                onClick={() => { onChange(f.value); setOpen(false); setQuery('') }}
                style={{
                  width: '100%', display: 'block', textAlign: 'left',
                  padding: '8px 12px', background: f.value === value ? t.accentHover : 'transparent',
                  border: 'none', color: f.value === value ? t.accent : t.text,
                  fontSize: 13, fontWeight: 600, fontFamily: f.value,
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (f.value !== value) e.currentTarget.style.background = t.accentHover }}
                onMouseLeave={e => { if (f.value !== value) e.currentTarget.style.background = 'transparent' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact segmented button group for selecting an ObjectFit value
function FitToggle({ value, options, onChange }: {
  value: ObjectFit
  options: { label: string; value: ObjectFit }[]
  onChange: (v: ObjectFit) => void
}) {
  return (
    <div style={{ display: 'flex' }}>
      {options.map((opt, i) => {
        const active = value === opt.value
        const isFirst = i === 0
        const isLast = i === options.length - 1
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
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

function WatermarkCanvas({ config, bgImage, onBgImageChange, bgUploadError, onBgUploadError, onBgFitChange, onBgColorChange }: {
  config: WatermarkConfig
  bgImage: HTMLImageElement | null
  onBgImageChange: (img: HTMLImageElement | null) => void
  bgUploadError: string | null
  onBgUploadError: (msg: string | null) => void
  onBgFitChange: (fit: ObjectFit) => void
  onBgColorChange: (color: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (config.uploadedImage) {
      const img = new Image()
      img.onload = () => setWatermarkImage(img)
      img.src = config.uploadedImage
    } else {
      setWatermarkImage(null) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [config.uploadedImage])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = config.canvasWidth
    canvas.height = config.canvasHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!config.transparentBg) {
      if (bgImage) {
        drawImageFitted(ctx, bgImage, 0, 0, canvas.width, canvas.height, config.bgFit)
      } else {
        ctx.fillStyle = config.bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    drawWatermark(ctx, config, watermarkImage)  }, [config, bgImage, watermarkImage])

  useEffect(() => { render() }, [render])

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
        className={config.transparentBg ? 'canvas-checkerboard' : ''}
        style={{
          flex: 1,
          background: config.transparentBg ? undefined : t.bg,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          overflow: 'auto',
          padding: 16,
        }}
      >
        <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', boxShadow: t.shadow, display: 'block' }} />
      </div>

      {/* Bottom bar: background upload + spec strip */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${t.border}`, background: t.bgSurface }}>

        {/* Background upload */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 14px',
          borderBottom: `1px solid ${t.border}`,
          flexWrap: 'wrap' as const,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            Background
          </span>
          {!config.transparentBg && (
            <>
              <input type="color" value={config.bgColor} onChange={(e) => onBgColorChange(e.target.value)}
                style={{ width: 28, height: 24, padding: 0, border: `1px solid ${t.border}`, borderRadius: t.radius, cursor: 'pointer', flexShrink: 0 }} />
              <div style={{ display: 'flex', gap: 3 }}>
                {['#ffffff', '#000000', '#f5f5f5', '#1a1a1a', '#e8f4f8', '#fff8e1', '#fce4ec', '#e8f5e9'].map((c) => (
                  <button key={c} title={c} onClick={() => onBgColorChange(c)} style={{
                    width: 16, height: 16, background: c, padding: 0, flexShrink: 0,
                    border: config.bgColor === c ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 0, cursor: 'pointer',
                  }} />
                ))}
              </div>
            </>
          )}
          <label
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              cursor: 'pointer', padding: '4px 10px',
              border: `1px solid ${t.accent}`, borderRadius: t.radius,
              fontSize: 11, fontWeight: 700, color: t.text,
              background: 'transparent', transition: 'background 0.15s',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Upload
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onBgUploadError(null)
              if (file.size > 20 * 1024 * 1024) {
                onBgUploadError('File exceeds 20 MB limit.')
                e.target.value = ''
                return
              }
              const reader = new FileReader()
              reader.onload = (ev) => {
                const img = new Image()
                img.onload = () => onBgImageChange(img)
                img.src = ev.target?.result as string
              }
              reader.readAsDataURL(file)
            }} />
          </label>
          {bgUploadError && (
            <span style={{ fontSize: 11, color: '#ff6b6b', fontWeight: 700 }}>{bgUploadError}</span>
          )}
          {bgImage && !bgUploadError && (
            <>
              <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>&#10003; Loaded</span>
              <button onClick={() => onBgImageChange(null)} style={{ fontSize: 11, color: t.textDisabled, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                Remove
              </button>
            </>
          )}
          {bgImage && (
            <div style={{ marginLeft: 'auto' }}>
              <FitToggle
                value={config.bgFit}
                options={[
                  { label: 'Cover',   value: 'cover'   },
                  { label: 'Contain', value: 'contain' },
                  { label: 'Fill',    value: 'fill'    },
                  { label: 'None',    value: 'none'    },
                ]}
                onChange={onBgFitChange}
              />
            </div>
          )}
        </div>

        {/* Spec strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        }}>
          {[
            { label: 'Type',     value: config.type.toUpperCase() },
            { label: 'Size',     value: `${config.fontSize}px` },
            { label: 'Opacity',  value: `${Math.round(config.opacity * 100)}%` },
            { label: 'Rotation', value: `${config.rotation}°` },
            { label: 'Pattern',  value: config.mode === 'single' ? `${config.posX}%,${config.posY}%` : config.stagger ? 'Staggered' : 'Grid' },
          ].map((item, i) => (
            <div key={item.label} style={{
              padding: '7px 12px',
              borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: 'monospace' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [wmUploadError, setWmUploadError] = useState<string | null>(null)
  const [bgUploadError, setBgUploadError] = useState<string | null>(null)

  const update = <K extends keyof WatermarkConfig>(key: K, value: WatermarkConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const download = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = config.canvasWidth
      canvas.height = config.canvasHeight

      if (!config.transparentBg) {
        if (bgImage) {
          drawImageFitted(ctx, bgImage, 0, 0, canvas.width, canvas.height, config.bgFit)
        } else {
          ctx.fillStyle = config.bgColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }

      let watermarkImage: HTMLImageElement | null = null
      if (config.type === 'image' && config.uploadedImage) {
        const img = new Image()
        await new Promise<void>((res) => { img.onload = () => res(); img.src = config.uploadedImage! })
        watermarkImage = img
      }

      drawWatermark(ctx, config, watermarkImage)
      const link = document.createElement('a')
      link.download = `watermark-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg, color: t.text, fontFamily: 'Arial, Helvetica, sans-serif', overflow: 'hidden' }}>

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
                <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Tiled Watermark Generator
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, lineHeight: 1.2 }}>
                Custom size, spacing, rotation &amp; transparency
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 260px', overflow: 'hidden' }}>

        {/* Left controls panel — watermark type / content */}
        <div style={{ background: t.bgSurface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{ flexShrink: 0, padding: '8px 14px', background: t.bgRaised, borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Watermark
            </span>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Type toggle */}
            <div>
              <SectionLabel>Watermark Type</SectionLabel>
              <div style={{ display: 'flex' }}>
                {(['text', 'image'] as const).map((tp, i) => (
                  <button
                    key={tp}
                    onClick={() => update('type', tp)}
                    style={{
                      flex: 1, padding: '7px 13px',
                      background: config.type === tp ? t.accent : 'transparent',
                      border: `2px solid ${t.accent}`,
                      borderLeft: i > 0 ? 'none' : `2px solid ${t.accent}`,
                      borderRadius: i === 0 ? `${t.radius} 0 0 ${t.radius}` : `0 ${t.radius} ${t.radius} 0`,
                      color: config.type === tp ? '#000000' : t.text,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <SectionLabel>Mode</SectionLabel>
              <div style={{ display: 'flex' }}>
                {(['tiled', 'single'] as const).map((m, i) => (
                  <button
                    key={m}
                    onClick={() => update('mode', m)}
                    style={{
                      flex: 1, padding: '7px 13px',
                      background: config.mode === m ? t.accent : 'transparent',
                      border: `2px solid ${t.accent}`,
                      borderLeft: i > 0 ? 'none' : `2px solid ${t.accent}`,
                      borderRadius: i === 0 ? `${t.radius} 0 0 ${t.radius}` : `0 ${t.radius} ${t.radius} 0`,
                      color: config.mode === m ? '#000000' : t.text,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Text options */}
            {config.type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Text Options</SectionLabel>
                <div>
                  <FieldLabel>Watermark Text</FieldLabel>
                  <NvidiaInput value={config.text} onChange={(v) => update('text', v)} placeholder="Enter watermark text" />
                </div>
                <div>
                  <FieldLabel>Font</FieldLabel>
                  <FontSearch value={config.fontFamily} onChange={(v) => update('fontFamily', v)} />
                </div>
                <div>
                  <FieldLabel>Text Color</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <input type="color" value={config.textColor} onChange={(e) => update('textColor', e.target.value)} style={{ width: 34, height: 30 }} />
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace', fontWeight: 700 }}>
                      {config.textColor.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                    {TEXT_COLOR_SWATCHES.map((c) => (
                      <button key={c} title={c} onClick={() => update('textColor', c)} style={{
                        aspectRatio: '1', width: '100%', background: c, padding: 0,
                        border: config.textColor === c ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                        borderRadius: 0, cursor: 'pointer',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image watermark */}
            {config.type === 'image' && (
              <div>
                <SectionLabel>Watermark Image</SectionLabel>
                <label
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
                    {config.uploadedImage ? 'Click to replace image' : 'Click to upload image'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setWmUploadError(null)
                    if (file.size > 20 * 1024 * 1024) {
                      setWmUploadError('File exceeds 20 MB limit.')
                      e.target.value = ''
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = (ev) => update('uploadedImage', ev.target?.result as string)
                    reader.readAsDataURL(file)
                  }} />
                </label>
                {wmUploadError && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#ff6b6b', fontWeight: 700 }}>{wmUploadError}</div>
                )}
                {config.uploadedImage && !wmUploadError && (
                  <div style={{ marginTop: 8, fontSize: 11, color: t.accent, fontWeight: 700 }}>&#10003; Watermark image ready</div>
                )}
                <div style={{ marginTop: 10 }}>
                  <FieldLabel>Object Fit</FieldLabel>
                  <FitToggle
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

          </div>
        </div>

        {/* Canvas preview */}
        <WatermarkCanvas config={config} bgImage={bgImage} onBgImageChange={setBgImage} bgUploadError={bgUploadError} onBgUploadError={setBgUploadError} onBgFitChange={(v) => update('bgFit', v)} onBgColorChange={(v) => update('bgColor', v)} />

        {/* Right controls panel — canvas size, parameters, options */}
        <div style={{ background: t.bgSurface, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{ flexShrink: 0, padding: '8px 14px', background: t.bgRaised, borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Parameters
            </span>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Canvas size */}
            <div>
              <SectionLabel>Canvas Size (px)</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <FieldLabel>Width</FieldLabel>
                  <NvidiaInput type="number" value={config.canvasWidth} onChange={(v) => update('canvasWidth', Math.min(8000, Math.max(1, Number(v))))} placeholder="800" />
                </div>
                <div>
                  <FieldLabel>Height</FieldLabel>
                  <NvidiaInput type="number" value={config.canvasHeight} onChange={(v) => update('canvasHeight', Math.min(8000, Math.max(1, Number(v))))} placeholder="600" />
                </div>
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
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 8,
                borderBottom: `1px solid ${t.border}`,
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>
                  {config.mode === 'tiled' ? 'Tile Parameters' : 'Stamp Parameters'}
                </span>
                <button
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    fontSize:  DEFAULT_CONFIG.fontSize,
                    spacingX:  DEFAULT_CONFIG.spacingX,
                    spacingY:  DEFAULT_CONFIG.spacingY,
                    posX:      DEFAULT_CONFIG.posX,
                    posY:      DEFAULT_CONFIG.posY,
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
                <RangeInput label="Spacing X" value={config.spacingX}                  min={20}   max={2000} unit="px" onChange={(v) => update('spacingX', v)} />
                <RangeInput label="Spacing Y" value={config.spacingY}                  min={20}   max={2000} unit="px" onChange={(v) => update('spacingY', v)} />
              </>}
              {config.mode === 'single' && <>
                <RangeInput label="Position X" value={config.posX} min={0} max={100} unit="%" onChange={(v) => update('posX', v)} />
                <RangeInput label="Position Y" value={config.posY} min={0} max={100} unit="%" onChange={(v) => update('posY', v)} />
              </>}
              <RangeInput label="Opacity"   value={Math.round(config.opacity * 100)} min={0}    max={100} unit="%" onChange={(v) => update('opacity', v / 100)} />
              <RangeInput label="Rotation"  value={config.rotation}                  min={-180} max={180} unit="°" onChange={(v) => update('rotation', v)} />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionLabel>Options</SectionLabel>
              {config.mode === 'tiled' && (
                <CheckboxRow id="stagger" label="Stagger columns (brick)" checked={config.stagger} onChange={(v) => update('stagger', v)} />
              )}
              <CheckboxRow id="mirrorH"      label="Mirror horizontal"      checked={config.mirrorH}      onChange={(v) => update('mirrorH', v)} />
              <CheckboxRow id="mirrorV"      label="Mirror vertical"        checked={config.mirrorV}      onChange={(v) => update('mirrorV', v)} />
              <CheckboxRow id="transparent" label="Transparent background"  checked={config.transparentBg} onChange={(v) => update('transparentBg', v)} />
            </div>

          </div>

          {/* Export button */}
          <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: `1px solid ${t.border}`, background: t.bgSurface }}>
            <GreenButton onClick={download} fullWidth disabled={downloading}>
              {downloading ? 'Exporting...' : 'Export PNG'}
            </GreenButton>
          </div>
        </div>

      </div>
    </div>
  )
}
