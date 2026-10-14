import test from 'node:test'
import assert from 'node:assert/strict'
import { drawImageFitted, renderWatermark, FULL_CROP, RenderTooDenseError } from '../src/render.ts'

const image = { naturalWidth: 400, naturalHeight: 200, width: 400, height: 200 }

function recordingContext() {
  const calls = []
  const ctx = {
    canvas: { width: 100, height: 100 },
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    beginPath: () => calls.push(['beginPath']),
    rect: (...args) => calls.push(['rect', ...args]),
    clip: () => calls.push(['clip']),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    measureText: () => ({ width: 40 }),
    translate: (...args) => calls.push(['translate', ...args]),
    rotate: (...args) => calls.push(['rotate', ...args]),
    scale: (...args) => calls.push(['scale', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
  }
  return { ctx, calls }
}

function config(overrides = {}) {
  return {
    type: 'image', mode: 'tiled', text: '', textColor: '#000000',
    fontFamily: 'Arial', fontSize: 5, spacingX: 100, spacingY: 100,
    posX: 50, posY: 50, tileOffsetX: 0, tileOffsetY: 0,
    opacity: 1, rotation: 0, canvasWidth: 100, canvasHeight: 100,
    transparentBg: true, bgColor: '#ffffff', stagger: false,
    mirrorH: false, mirrorV: false, wmFit: 'contain', bgFit: 'contain',
    wmCrop: FULL_CROP, bgCrop: FULL_CROP,
    ...overrides,
  }
}

test('crop is applied before contain and cover fitting', () => {
  const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }
  const contain = recordingContext()
  drawImageFitted(contain.ctx, image, 0, 0, 100, 100, 'contain', crop)
  assert.deepEqual(contain.calls.find(call => call[0] === 'drawImage'),
    ['drawImage', image, 100, 50, 200, 100, 0, 25, 100, 50])

  const cover = recordingContext()
  drawImageFitted(cover.ctx, image, 0, 0, 100, 100, 'cover', crop)
  assert.deepEqual(cover.calls.find(call => call[0] === 'drawImage'),
    ['drawImage', image, 100, 50, 200, 100, -50, 0, 200, 100])
})

test('invalid crop dimensions never reach drawImage', () => {
  const { ctx, calls } = recordingContext()
  drawImageFitted(ctx, image, 0, 0, 100, 100, 'fill',
    { x: 1, y: 0, width: 0.5, height: 1 })
  assert.equal(calls.some(call => call[0] === 'drawImage'), false)
})

test('tile offset moves the origin stamp on both axes', () => {
  const first = recordingContext()
  renderWatermark(first.ctx, config(), null, image)
  assert.ok(first.calls.some(call => call[0] === 'translate' && call[1] === 0 && call[2] === 0))

  const moved = recordingContext()
  renderWatermark(moved.ctx, config({ tileOffsetX: 30, tileOffsetY: 40 }), null, image)
  assert.ok(moved.calls.some(call => call[0] === 'translate' && call[1] === 30 && call[2] === 40))
  assert.equal(moved.calls.some(call => call[0] === 'translate' && call[1] === 0 && call[2] === 0), false)
})

test('staggered row parity follows a full-row vertical move', () => {
  const moved = recordingContext()
  renderWatermark(moved.ctx, config({ stagger: true, tileOffsetY: 100 }), null, image)
  assert.ok(moved.calls.some(call => call[0] === 'translate' && call[1] === 50 && call[2] === 0))
})

test('transparent mode omits background; opaque mode fills under image gaps', () => {
  const transparent = recordingContext()
  renderWatermark(transparent.ctx, config(), image, null)
  assert.equal(transparent.calls.some(call => call[0] === 'fillRect'), false)
  assert.equal(transparent.calls.some(call => call[0] === 'drawImage'), false)

  const opaque = recordingContext()
  renderWatermark(opaque.ctx, config({ transparentBg: false }), image, null)
  const fillIndex = opaque.calls.findIndex(call => call[0] === 'fillRect')
  const imageIndex = opaque.calls.findIndex(call => call[0] === 'drawImage')
  assert.ok(fillIndex >= 0 && imageIndex > fillIndex)
  assert.deepEqual(opaque.calls[fillIndex], ['fillRect', 0, 0, 100, 100])
})

test('dense pixel-aligned grid uses one repeated tile instead of every stamp', () => {
  const previousDocument = globalThis.document
  const tile = recordingContext()
  let tileCanvas
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas')
      tileCanvas = { width: 0, height: 0, getContext: () => tile.ctx }
      return tileCanvas
    },
  }
  try {
    const output = recordingContext()
    output.ctx.createPattern = (canvas, repetition) => {
      output.calls.push(['createPattern', canvas, repetition])
      return { repeat: true }
    }
    renderWatermark(output.ctx, config({
      canvasWidth: 8000, canvasHeight: 8000,
      spacingX: 20, spacingY: 20,
      tileOffsetX: 13, tileOffsetY: 17,
    }), null, image)

    assert.equal(tileCanvas.width, 20)
    assert.equal(tileCanvas.height, 20)
    assert.equal(output.calls.filter(call => call[0] === 'createPattern').length, 1)
    assert.deepEqual(output.calls.find(call => call[0] === 'translate'), ['translate', 13, 17])
    assert.deepEqual(output.calls.find(call => call[0] === 'fillRect'), ['fillRect', -13, -17, 8000, 8000])
    assert.ok(tile.calls.filter(call => call[0] === 'translate').length < 20)
    assert.equal(output.calls.some(call => call[0] === 'drawImage'), false)
  } finally {
    globalThis.document = previousDocument
  }
})

test('a repeated tile is chosen whenever it draws fewer stamps', () => {
  const previousDocument = globalThis.document
  let tileDraws = 0
  globalThis.document = {
    createElement() {
      const tile = recordingContext()
      const drawImage = tile.ctx.drawImage
      tile.ctx.drawImage = (...args) => { tileDraws++; drawImage(...args) }
      return { width: 0, height: 0, getContext: () => tile.ctx }
    },
  }
  try {
    const output = recordingContext()
    output.ctx.createPattern = () => ({ repeat: true })
    renderWatermark(output.ctx, config({
      canvasWidth: 200, canvasHeight: 200, fontSize: 100,
      spacingX: 20, spacingY: 20,
    }), null, image)

    assert.equal(output.calls.filter(call => call[0] === 'fillRect').length, 1)
    assert.equal(output.calls.some(call => call[0] === 'drawImage'), false)
    assert.ok(tileDraws > 0 && tileDraws < 600)
  } finally {
    globalThis.document = previousDocument
  }
})

test('tile cache survives phase, background, and canvas changes and is bounded', () => {
  const previousDocument = globalThis.document
  let tileCreations = 0
  globalThis.document = {
    createElement() {
      tileCreations++
      return { width: 0, height: 0, getContext: () => recordingContext().ctx }
    },
  }
  const base = {
    canvasWidth: 200, canvasHeight: 200, fontSize: 100,
    spacingX: 20, spacingY: 20, transparentBg: false,
  }
  const render = (overrides = {}) => {
    const output = recordingContext()
    output.ctx.createPattern = () => ({ repeat: true })
    renderWatermark(output.ctx, config({ ...base, ...overrides }), null, image)
    return output
  }
  try {
    render()
    render({ tileOffsetX: 7, tileOffsetY: 9, bgColor: '#000000', canvasWidth: 220, mirrorH: true })
    assert.equal(tileCreations, 1)

    const fallback = recordingContext()
    fallback.ctx.createPattern = () => null
    renderWatermark(fallback.ctx, config(base), null, image)
    assert.equal(tileCreations, 1)
    assert.ok(fallback.calls.some(call => call[0] === 'drawImage'))

    for (const opacity of [0.9, 0.8, 0.7, 0.6]) render({ opacity })
    assert.equal(tileCreations, 5)
    render()
    assert.equal(tileCreations, 6)
  } finally {
    globalThis.document = previousDocument
  }
})

test('a pathological pattern fails before drawing stamps and restores context', () => {
  const { ctx, calls } = recordingContext()
  assert.throws(() => renderWatermark(ctx, config({
    canvasWidth: 800, canvasHeight: 600, fontSize: 1000,
    spacingX: 20, spacingY: 20,
  }), null, image), RenderTooDenseError)
  assert.equal(calls.filter(call => call[0] === 'save').length,
    calls.filter(call => call[0] === 'restore').length)
  assert.equal(calls.some(call => call[0] === 'drawImage'), false)
})
