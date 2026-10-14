import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ImageUploadError,
  MAX_IMAGE_FILE_BYTES,
  loadImageFile,
  releaseImageFile,
} from '../src/imageUpload.ts'

const imageFile = { type: 'image/png', size: 1024 }

async function withImageBrowser(run, { decode } = {}) {
  const previousImage = globalThis.Image
  const previousCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
  const previousRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
  const images = []
  const created = []
  const revoked = []

  class TestImage {
    constructor() {
      this.naturalWidth = 100
      this.naturalHeight = 50
      this.onload = null
      this.onerror = null
      this.src = ''
      images.push(this)
    }

    decode() {
      return decode ? decode(this) : Promise.resolve()
    }

    removeAttribute(name) {
      if (name === 'src') this.src = ''
    }

    load() {
      this.onload?.()
    }

    fail() {
      this.onerror?.()
    }
  }

  globalThis.Image = TestImage
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: file => {
      created.push(file)
      return `blob:test-${created.length}`
    },
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: url => revoked.push(url),
  })

  try {
    await run({ images, created, revoked })
  } finally {
    if (previousImage === undefined) delete globalThis.Image
    else globalThis.Image = previousImage
    if (previousCreate) Object.defineProperty(URL, 'createObjectURL', previousCreate)
    else delete URL.createObjectURL
    if (previousRevoke) Object.defineProperty(URL, 'revokeObjectURL', previousRevoke)
    else delete URL.revokeObjectURL
  }
}

test('invalid files are rejected before allocating an object URL', async () => {
  await withImageBrowser(async ({ created }) => {
    for (const file of [
      { type: 'text/plain', size: 100 },
      { type: 'image/png', size: 0 },
      { type: 'image/png', size: MAX_IMAGE_FILE_BYTES + 1 },
    ]) {
      await assert.rejects(loadImageFile(file), ImageUploadError)
    }
    assert.equal(created.length, 0)
  })
})

test('loaded images keep their URL until released, and release is idempotent', async () => {
  await withImageBrowser(async ({ images, created, revoked }) => {
    const pending = loadImageFile(imageFile)
    assert.equal(images.length, 1)
    assert.equal(images[0].src, 'blob:test-1')
    images[0].load()

    const image = await pending
    assert.equal(image, images[0])
    assert.deepEqual(created, [imageFile])
    assert.deepEqual(revoked, [])

    releaseImageFile(image)
    releaseImageFile(image)
    assert.deepEqual(revoked, ['blob:test-1'])
  })
})

test('aborting during decode rejects and revokes the URL', async () => {
  let finishDecode
  await withImageBrowser(async ({ images, revoked }) => {
    const controller = new AbortController()
    const pending = loadImageFile(imageFile, controller.signal)
    images[0].load()
    controller.abort()

    await assert.rejects(pending, /cancelled/)
    assert.equal(images[0].src, '')
    assert.deepEqual(revoked, ['blob:test-1'])

    finishDecode()
    await Promise.resolve()
    releaseImageFile(images[0])
    assert.deepEqual(revoked, ['blob:test-1'])
  }, { decode: () => new Promise(resolve => { finishDecode = resolve }) })
})

test('an already aborted request does not allocate an object URL', async () => {
  await withImageBrowser(async ({ images, created }) => {
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(loadImageFile(imageFile, controller.signal), /cancelled/)
    assert.equal(images.length, 0)
    assert.equal(created.length, 0)
  })
})

test('a decode error revokes the URL and reports a readable error', async () => {
  await withImageBrowser(async ({ images, revoked }) => {
    const pending = loadImageFile(imageFile)
    images[0].load()
    await assert.rejects(pending, /Could not read this image/)
    assert.equal(images[0].src, '')
    assert.deepEqual(revoked, ['blob:test-1'])
  }, { decode: () => Promise.reject(new Error('decode failed')) })
})
