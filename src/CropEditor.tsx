import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './crop-editor.css'

/** Coordinates are fractions of the image's natural width and height. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CropEditorProps {
  image: HTMLImageElement
  crop: CropRect
  onApply: (crop: CropRect) => void
  onClose: () => void
}

type Field = keyof CropRect
type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type Drag = {
  kind: 'move' | 'resize' | 'create'
  handle?: Handle
  pointerId: number
  startX: number
  startY: number
  original: CropRect
  moved: boolean
}

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function imageSize(image: HTMLImageElement) {
  return {
    width: Math.max(1, image.naturalWidth || image.width || 1),
    height: Math.max(1, image.naturalHeight || image.height || 1),
  }
}

function normalizeCrop(crop: CropRect, image: HTMLImageElement): CropRect {
  const size = imageSize(image)
  const minimumWidth = 1 / size.width
  const minimumHeight = 1 / size.height
  const x = clamp(Number.isFinite(crop.x) ? crop.x : 0, 0, 1 - minimumWidth)
  const y = clamp(Number.isFinite(crop.y) ? crop.y : 0, 0, 1 - minimumHeight)
  return {
    x,
    y,
    width: clamp(Number.isFinite(crop.width) ? crop.width : 1, minimumWidth, 1 - x),
    height: clamp(Number.isFinite(crop.height) ? crop.height : 1, minimumHeight, 1 - y),
  }
}

function percentage(value: number) {
  return String(Number((value * 100).toFixed(2)))
}

function fieldsFor(crop: CropRect): Record<Field, string> {
  return {
    x: percentage(crop.x),
    y: percentage(crop.y),
    width: percentage(crop.width),
    height: percentage(crop.height),
  }
}

export function CropEditor({ image, crop, onApply, onClose }: CropEditorProps) {
  const [selection, setSelection] = useState<CropRect>(() => normalizeCrop(crop, image))
  const [fields, setFields] = useState<Record<Field, string>>(() => fieldsFor(normalizeCrop(crop, image)))
  const selectionRef = useRef(selection)
  const stageRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const size = imageSize(image)
  const source = image.currentSrc || image.src

  function updateSelection(next: CropRect) {
    const valid = normalizeCrop(next, image)
    selectionRef.current = valid
    setSelection(valid)
    setFields(fieldsFor(valid))
  }

  useEffect(() => {
    const focusedElement = document.activeElement
    returnFocusRef.current = focusedElement instanceof HTMLElement && focusedElement !== document.body
      ? focusedElement
      : null
    closeRef.current?.focus()
    return () => {
      const previous = returnFocusRef.current
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      ))
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function pointFromEvent(event: ReactPointerEvent): { x: number; y: number } {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds || !bounds.width || !bounds.height) return { x: 0, y: 0 }
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    }
  }

  function startDrag(event: ReactPointerEvent, kind: Drag['kind'], handle?: Handle) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    event.preventDefault()
    event.stopPropagation()
    const point = pointFromEvent(event)
    dragRef.current = {
      kind,
      handle,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      original: selectionRef.current,
      moved: false,
    }
    stageRef.current?.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = pointFromEvent(event)
    const dx = point.x - drag.startX
    const dy = point.y - drag.startY
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) drag.moved = true
    const original = drag.original
    if (drag.kind === 'move') {
      updateSelection({
        ...original,
        x: clamp(original.x + dx, 0, 1 - original.width),
        y: clamp(original.y + dy, 0, 1 - original.height),
      })
      return
    }

    const minWidth = 1 / size.width
    const minHeight = 1 / size.height
    if (drag.kind === 'create') {
      const left = Math.min(drag.startX, point.x)
      const top = Math.min(drag.startY, point.y)
      updateSelection({
        x: clamp(left, 0, 1 - minWidth),
        y: clamp(top, 0, 1 - minHeight),
        width: Math.max(minWidth, Math.abs(point.x - drag.startX)),
        height: Math.max(minHeight, Math.abs(point.y - drag.startY)),
      })
      return
    }

    const handle = drag.handle || 'se'
    let left = original.x
    let right = original.x + original.width
    let top = original.y
    let bottom = original.y + original.height
    if (handle.includes('w')) left = clamp(left + dx, 0, right - minWidth)
    if (handle.includes('e')) right = clamp(right + dx, left + minWidth, 1)
    if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minHeight)
    if (handle.includes('s')) bottom = clamp(bottom + dy, top + minHeight, 1)
    updateSelection({ x: left, y: top, width: right - left, height: bottom - top })
  }

  function endDrag(event: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.kind === 'create' && !drag.moved) updateSelection(drag.original)
    dragRef.current = null
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId)
    }
  }

  function commitField(field: Field) {
    if (fields[field].trim() === '') {
      setFields(fieldsFor(selectionRef.current))
      return
    }
    const parsed = Number(fields[field]) / 100
    if (!Number.isFinite(parsed)) {
      setFields(fieldsFor(selectionRef.current))
      return
    }
    const current = selectionRef.current
    const minWidth = 1 / size.width
    const minHeight = 1 / size.height
    const next = { ...current }
    if (field === 'x') next.x = clamp(parsed, 0, 1 - current.width)
    if (field === 'y') next.y = clamp(parsed, 0, 1 - current.height)
    if (field === 'width') next.width = clamp(parsed, minWidth, 1 - current.x)
    if (field === 'height') next.height = clamp(parsed, minHeight, 1 - current.y)
    updateSelection(next)
  }

  return (
    <div className="crop-overlay" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="crop-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="crop-title">
        <header className="crop-header">
          <div>
            <span className="crop-eyebrow">Image tools</span>
            <h2 id="crop-title">Crop image</h2>
          </div>
          <button className="crop-close" ref={closeRef} type="button" onClick={onClose} aria-label="Close crop editor">×</button>
        </header>

        <div className="crop-preview">
          <div className="crop-preview-topline">
            <span>Drag the crop area or its edges to adjust</span>
            <span>{size.width} × {size.height} px</span>
          </div>
          <div className="crop-stage-outer">
            <div
              className="crop-stage canvas-checkerboard"
              ref={stageRef}
              onPointerDown={(event) => startDrag(event, 'create')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img src={source} alt="Image being cropped" draggable="false" />
              <div
                className="crop-selection"
                style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}
                onPointerDown={(event) => startDrag(event, 'move')}
                aria-hidden="true"
              >
                <div className="crop-grid" />
                {HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className={`crop-handle crop-handle-${handle}`}
                    onPointerDown={(event) => startDrag(event, 'resize', handle)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="crop-controls">
          <div className="crop-controls-heading">
            <div>
              <strong>Crop area</strong>
              <span>Percent of original image</span>
            </div>
            <div className="crop-actions">
              <button className="crop-reset" type="button" onClick={() => updateSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })}>New crop</button>
              <button className="crop-reset" type="button" onClick={() => updateSelection(FULL_CROP)}>Full image</button>
            </div>
          </div>
          <div className="crop-fields">
            {(['x', 'y', 'width', 'height'] as Field[]).map((field) => (
              <label key={field} className="crop-field">
                <span>{field === 'x' ? 'X' : field === 'y' ? 'Y' : field === 'width' ? 'Width' : 'Height'}</span>
                <span className="crop-field-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    value={fields[field]}
                    onChange={(event) => setFields((previous) => ({ ...previous, [field]: event.target.value }))}
                    onBlur={() => commitField(field)}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
                    aria-label={`${field === 'x' ? 'X position' : field === 'y' ? 'Y position' : field} percent`}
                  />
                  <span>%</span>
                </span>
              </label>
            ))}
          </div>
          <div className="crop-result">
            Output: {Math.max(1, Math.round(selection.width * size.width))} × {Math.max(1, Math.round(selection.height * size.height))} px
          </div>
        </div>

        <footer className="crop-footer">
          <button className="crop-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="crop-apply" type="button" onClick={() => onApply(selectionRef.current)}>Apply crop</button>
        </footer>
      </div>
    </div>
  )
}

export default CropEditor
