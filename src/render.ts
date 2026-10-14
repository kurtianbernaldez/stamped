export type ObjectFit = 'fill' | 'contain' | 'cover' | 'none'

/** A rectangle in source-image coordinates, normalized from 0 to 1. */
export type CropRect = { x: number; y: number; width: number; height: number }

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

/** Prevent a dense pattern from locking up the browser's main thread. */
export class RenderTooDenseError extends Error {
  constructor() {
    super('This pattern is too dense to render. Increase tile spacing or reduce the watermark size.')
    this.name = 'RenderTooDenseError'
  }
}

const MAX_STAMPS_PER_RENDER = 10_000
const MAX_CACHED_TILES = 4
const tileCache = new Map<string, HTMLCanvasElement>()
const objectIds = new WeakMap<object, number>()
const observedFontSets = new WeakSet<object>()
let nextObjectId = 1

function objectId(value: object | null): number {
  if (!value) return 0
  let id = objectIds.get(value)
  if (!id) {
    id = nextObjectId++
    objectIds.set(value, id)
  }
  return id
}

function watchFontChanges(): void {
  const fonts = document.fonts
  if (!fonts || observedFontSets.has(fonts)) return
  fonts.addEventListener('loadingdone', () => tileCache.clear())
  fonts.addEventListener('loadingerror', () => tileCache.clear())
  observedFontSets.add(fonts)
}

export interface WatermarkConfig {
  type: 'text' | 'image'
  mode: 'tiled' | 'single'
  text: string
  textColor: string
  fontFamily: string
  fontSize: number
  spacingX: number
  spacingY: number
  posX: number
  posY: number
  tileOffsetX: number
  tileOffsetY: number
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
  wmCrop: CropRect
  bgCrop: CropRect
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Draw a selected source rectangle into a destination rectangle. Fit is applied
 * to the crop, so "cover" and "contain" behave the same after cropping as they
 * do for a full image. The destination is always the clipping boundary.
 */
export function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fit: ObjectFit,
  crop: CropRect = FULL_CROP,
): void {
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height
  if (imageWidth <= 0 || imageHeight <= 0 || dw <= 0 || dh <= 0) return

  const cropX = clamp(finiteOr(crop.x, 0), 0, 1)
  const cropY = clamp(finiteOr(crop.y, 0), 0, 1)
  const cropWidth = clamp(finiteOr(crop.width, 1), 0, 1 - cropX)
  const cropHeight = clamp(finiteOr(crop.height, 1), 0, 1 - cropY)
  if (cropWidth <= 0 || cropHeight <= 0) return

  const sx = cropX * imageWidth
  const sy = cropY * imageHeight
  const sw = cropWidth * imageWidth
  const sh = cropHeight * imageHeight

  let fittedWidth = dw
  let fittedHeight = dh
  if (fit === 'none') {
    fittedWidth = sw
    fittedHeight = sh
  } else if (fit === 'contain' || fit === 'cover') {
    const scale = fit === 'contain'
      ? Math.min(dw / sw, dh / sh)
      : Math.max(dw / sw, dh / sh)
    fittedWidth = sw * scale
    fittedHeight = sh * scale
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, dy, dw, dh)
  ctx.clip()
  ctx.drawImage(
    image,
    sx, sy, sw, sh,
    dx + (dw - fittedWidth) / 2,
    dy + (dh - fittedHeight) / 2,
    fittedWidth, fittedHeight,
  )
  ctx.restore()
}

function stampRadius(ctx: CanvasRenderingContext2D, config: WatermarkConfig): number {
  if (config.type === 'image') {
    return Math.SQRT2 * config.fontSize
  }
  ctx.font = `700 ${config.fontSize}px ${config.fontFamily}`
  const halfWidth = ctx.measureText(config.text).width / 2
  const halfHeight = config.fontSize
  return Math.hypot(halfWidth, halfHeight)
}

function countStamps(
  width: number,
  height: number,
  spacingX: number,
  spacingY: number,
  phaseX: number,
  phaseY: number,
  radius: number,
  stagger: boolean,
): number {
  const firstRow = Math.ceil((-radius - phaseY) / spacingY)
  const lastRow = Math.floor((height + radius - phaseY) / spacingY)
  if (lastRow < firstRow) return 0

  const columns = (rowPhaseX: number) => Math.max(0,
    Math.floor((width + radius - rowPhaseX) / spacingX) -
    Math.ceil((-radius - rowPhaseX) / spacingX) + 1,
  )
  const rows = lastRow - firstRow + 1
  if (!stagger) return rows * columns(phaseX)

  // Only row parity changes the column count, so count both parities directly.
  const evenRows = Math.floor(lastRow / 2) - Math.floor((firstRow - 1) / 2)
  return evenRows * columns(phaseX) + (rows - evenRows) * columns(phaseX + spacingX / 2)
}

function tileKey(
  config: WatermarkConfig,
  watermarkImage: HTMLImageElement | null,
  spacingX: number,
  spacingY: number,
  size: number,
): string {
  watchFontChanges()
  return JSON.stringify([
    objectId(document), objectId(watermarkImage),
    config.type, config.text, config.textColor, config.fontFamily,
    size, spacingX, spacingY, config.stagger,
    clamp(finiteOr(config.opacity, 1), 0, 1), finiteOr(config.rotation, 0),
    config.wmFit,
    config.wmCrop.x, config.wmCrop.y, config.wmCrop.width, config.wmCrop.height,
  ])
}

function cachedTile(key: string): HTMLCanvasElement | undefined {
  const tile = tileCache.get(key)
  if (tile) {
    tileCache.delete(key)
    tileCache.set(key, tile)
  }
  return tile
}

function createTile(
  key: string,
  config: WatermarkConfig,
  watermarkImage: HTMLImageElement | null,
  tileWidth: number,
  tileHeight: number,
): HTMLCanvasElement | null {
  const tile = document.createElement('canvas')
  tile.width = tileWidth
  tile.height = tileHeight
  const tileCtx = tile.getContext('2d')
  if (!tileCtx) return null
  tileCtx.globalAlpha = clamp(finiteOr(config.opacity, 1), 0, 1)
  drawStamps(tileCtx, { ...config, tileOffsetX: 0, tileOffsetY: 0 }, watermarkImage, tileWidth, tileHeight, false)
  tileCache.set(key, tile)
  while (tileCache.size > MAX_CACHED_TILES) {
    const oldest = tileCache.keys().next().value
    if (oldest === undefined) break
    tileCache.delete(oldest)
  }
  return tile
}

function fillRepeatedTile(
  ctx: CanvasRenderingContext2D,
  tile: HTMLCanvasElement,
  phaseX: number,
  phaseY: number,
  width: number,
  height: number,
): boolean {
  const pattern = ctx.createPattern(tile, 'repeat')
  if (!pattern) return false
  ctx.save()
  ctx.globalAlpha = 1 // Opacity was already applied to each stamp in the tile.
  ctx.translate(phaseX, phaseY)
  ctx.fillStyle = pattern
  ctx.fillRect(-phaseX, -phaseY, width, height)
  ctx.restore()
  return true
}

function drawStamps(
  ctx: CanvasRenderingContext2D,
  config: WatermarkConfig,
  watermarkImage: HTMLImageElement | null,
  width: number,
  height: number,
  allowPattern = true,
): void {
  const size = Math.max(1, finiteOr(config.fontSize, 1))
  const radians = (finiteOr(config.rotation, 0) * Math.PI) / 180

  const drawStamp = (x: number, y: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(radians)
    if (config.type === 'text' && config.text) {
      ctx.font = `700 ${size}px ${config.fontFamily}`
      ctx.fillStyle = config.textColor
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(config.text, 0, 0)
    } else if (config.type === 'image' && watermarkImage) {
      const side = size * 2
      drawImageFitted(ctx, watermarkImage, -side / 2, -side / 2, side, side, config.wmFit, config.wmCrop)
    }
    ctx.restore()
  }

  if (config.mode === 'single') {
    drawStamp(
      (finiteOr(config.posX, 50) / 100) * width,
      (finiteOr(config.posY, 50) / 100) * height,
    )
    return
  }

  const spacingX = Math.max(1, finiteOr(config.spacingX, 1))
  const spacingY = Math.max(1, finiteOr(config.spacingY, 1))
  const phaseX = ((finiteOr(config.tileOffsetX, 0) % spacingX) + spacingX) % spacingX
  // A staggered grid repeats every two rows, so retain row parity when its
  // vertical origin moves by exactly one row.
  const verticalPeriod = config.stagger ? spacingY * 2 : spacingY
  const phaseY = ((finiteOr(config.tileOffsetY, 0) % verticalPeriod) + verticalPeriod) % verticalPeriod
  const radius = stampRadius(ctx, { ...config, fontSize: size })
  const directStampCount = countStamps(width, height, spacingX, spacingY, phaseX, phaseY, radius, config.stagger)
  const tileWidth = spacingX
  const tileHeight = verticalPeriod
  // Fractional tile positions stay on the direct path to avoid resampling edges.
  const canPattern = allowPattern &&
    Number.isInteger(tileWidth) && Number.isInteger(tileHeight) &&
    Number.isInteger(phaseX) && Number.isInteger(phaseY) &&
    tileWidth * tileHeight <= 262144 && tileWidth <= 2048 && tileHeight <= 2048 &&
    typeof document !== 'undefined' && typeof ctx.createPattern === 'function'

  if (canPattern) {
    const key = tileKey(config, watermarkImage, spacingX, spacingY, size)
    const existingTile = cachedTile(key)
    const tileStampCount = countStamps(tileWidth, tileHeight, spacingX, spacingY, 0, 0, radius, config.stagger)
    // A cached bitmap needs no stamp draws; otherwise build it only when it is
    // cheaper than drawing the visible canvas directly.
    if (existingTile || (tileStampCount < directStampCount && tileStampCount <= MAX_STAMPS_PER_RENDER)) {
      const tile = existingTile ?? createTile(key, config, watermarkImage, tileWidth, tileHeight)
      if (tile && fillRepeatedTile(ctx, tile, phaseX, phaseY, width, height)) return
    }
  }

  if (!Number.isFinite(directStampCount) || directStampCount > MAX_STAMPS_PER_RENDER) {
    throw new RenderTooDenseError()
  }

  // Start off canvas far enough to draw stamps whose centres are outside it.
  const firstRow = Math.ceil((-radius - phaseY) / spacingY)
  const lastRow = Math.floor((height + radius - phaseY) / spacingY)
  for (let row = firstRow; row <= lastRow; row++) {
    const staggerX = config.stagger && row % 2 !== 0 ? spacingX / 2 : 0
    const rowY = phaseY + row * spacingY
    const rowPhaseX = phaseX + staggerX
    const firstCol = Math.ceil((-radius - rowPhaseX) / spacingX)
    const lastCol = Math.floor((width + radius - rowPhaseX) / spacingX)
    for (let col = firstCol; col <= lastCol; col++) {
      drawStamp(rowPhaseX + col * spacingX, rowY)
    }
  }
}

/** Draw the complete image into the supplied canvas context for preview or PNG export. */
export function renderWatermark(
  ctx: CanvasRenderingContext2D,
  config: WatermarkConfig,
  bgImage: HTMLImageElement | null,
  watermarkImage: HTMLImageElement | null,
): void {
  const width = Math.max(1, Math.floor(finiteOr(config.canvasWidth, 1)))
  const height = Math.max(1, Math.floor(finiteOr(config.canvasHeight, 1)))

  ctx.save()
  try {
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, width, height)
    if (!config.transparentBg) {
      ctx.fillStyle = config.bgColor
      ctx.fillRect(0, 0, width, height)
      if (bgImage) {
        drawImageFitted(ctx, bgImage, 0, 0, width, height, config.bgFit, config.bgCrop)
      }
    }

    ctx.globalAlpha = clamp(finiteOr(config.opacity, 1), 0, 1)
    if (config.mirrorH || config.mirrorV) {
      ctx.translate(config.mirrorH ? width : 0, config.mirrorV ? height : 0)
      ctx.scale(config.mirrorH ? -1 : 1, config.mirrorV ? -1 : 1)
    }
    if (ctx.globalAlpha > 0 &&
        ((config.type === 'text' && config.text) ||
         (config.type === 'image' && watermarkImage))) {
      drawStamps(ctx, config, watermarkImage, width, height)
    }
  } finally {
    ctx.restore()
  }
}
