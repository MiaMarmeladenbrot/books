import { describe, expect, it } from 'vitest'
import { coverCrop, type Rect, type Size } from './frame'

const VIDEO: Size = { width: 1280, height: 720 }

describe('coverCrop', () => {
  it('scales the box straight up when the aspect ratios agree', () => {
    const crop = coverCrop({ width: 1000, height: 500 }, { width: 500, height: 250 }, {
      x: 100,
      y: 50,
      width: 200,
      height: 100,
    })

    expect(crop).toEqual({ x: 200, y: 100, width: 400, height: 200 })
  })

  it('counts back what the video loses at its sides', () => {
    const crop = coverCrop(VIDEO, { width: 375, height: 600 }, {
      x: 37,
      y: 100,
      width: 300,
      height: 150,
    })

    expect(crop.x).toBeCloseTo(459.4, 1)
    expect(crop.y).toBeCloseTo(120, 1)
    expect(crop.width).toBeCloseTo(360, 1)
    expect(crop.height).toBeCloseTo(180, 1)
  })

  it('stays inside the video for every box', () => {
    const view: Size = { width: 375, height: 600 }
    const boxes: Rect[] = [
      { x: 0, y: 0, width: 375, height: 600 },
      { x: 20, y: 40, width: 335, height: 200 },
      { x: -50, y: -80, width: 500, height: 400 },
      { x: 300, y: 500, width: 200, height: 300 },
      { x: 1, y: 1, width: 1, height: 1 },
    ]

    for (const box of boxes) {
      const crop = coverCrop(VIDEO, view, box)
      expect(crop.x).toBeGreaterThanOrEqual(0)
      expect(crop.y).toBeGreaterThanOrEqual(0)
      expect(crop.width).toBeGreaterThanOrEqual(1)
      expect(crop.height).toBeGreaterThanOrEqual(1)
      expect(crop.x + crop.width).toBeLessThanOrEqual(VIDEO.width)
      expect(crop.y + crop.height).toBeLessThanOrEqual(VIDEO.height)
    }
  })

  it('collapses to a sliver at the edge when the box lies outside', () => {
    const crop = coverCrop(VIDEO, VIDEO, { x: 1400, y: 0, width: 100, height: 100 })

    expect(crop.x).toBe(VIDEO.width)
    expect(crop.width).toBe(1)
  })

  it('hands back the whole video when a side is missing', () => {
    const box: Rect = { x: 10, y: 10, width: 50, height: 50 }

    expect(coverCrop(VIDEO, { width: 0, height: 600 }, box)).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    })
    expect(coverCrop({ width: 0, height: 0 }, { width: 375, height: 600 }, box)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
  })
})
