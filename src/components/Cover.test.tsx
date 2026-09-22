import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { Cover } from './Cover'

function cover(src: string | null | (string | null)[]) {
  const { container, rerender } = render(
    <Cover title="Tschick" authors={['Wolfgang Herrndorf']} src={src} />,
  )
  return {
    container,
    rerender,
    image: container.querySelector('img'),
    shown: () => container.querySelector('img')?.getAttribute('src') ?? null,
    waiting: () => container.querySelector('.catalogue-sweep'),
    spine: () => container.textContent?.includes('Tschick') ?? false,
    fail: () => {
      const image = container.querySelector('img')
      if (!image) throw new Error('kein Bild da, das scheitern könnte')
      fireEvent.error(image)
    },
  }
}

describe('the cover of a book that is still on its way', () => {
  it('waits behind a placeholder instead of an empty square', () => {
    const { waiting, spine } = cover('/api/cover?isbn=9783499256356')

    expect(waiting()).not.toBeNull()
    expect(spine()).toBe(false)
  })

  it('drops the placeholder once the picture is there', () => {
    const { image, waiting } = cover('/api/cover?isbn=9783499256356')

    fireEvent.load(image!)

    expect(waiting()).toBeNull()
    expect(image).toBeInTheDocument()
  })

  it('falls back to the spine when the picture never arrives', () => {
    const { image, waiting, spine, container } = cover('/api/cover?isbn=9783499256356')

    fireEvent.error(image!)

    expect(waiting()).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(spine()).toBe(true)
  })

  it('shows the spine at once when there is nothing to wait for', () => {
    const { waiting, spine } = cover(null)

    expect(waiting()).toBeNull()
    expect(spine()).toBe(true)
  })
})

describe('a cover with more than one place to look', () => {
  it('shows the first source it was given', () => {
    expect(cover(['/a.jpg', '/b.jpg']).shown()).toBe('/a.jpg')
  })

  it('moves on to the next source when one fails', () => {
    const { fail, shown, waiting } = cover(['/a.jpg', '/b.jpg'])

    fail()

    expect(shown()).toBe('/b.jpg')
    expect(waiting()).not.toBeNull()
  })

  it('reaches the spine only once every source has failed', () => {
    const { fail, spine, container } = cover(['/a.jpg', '/b.jpg'])

    fail()
    expect(spine()).toBe(false)

    fail()
    expect(container.querySelector('img')).toBeNull()
    expect(spine()).toBe(true)
  })

  it('passes over the empty places in a chain', () => {
    expect(cover([null, '/b.jpg', null]).shown()).toBe('/b.jpg')
  })

  it('goes straight to the spine when the chain holds nothing', () => {
    const { waiting, spine } = cover([null, null, null])

    expect(waiting()).toBeNull()
    expect(spine()).toBe(true)
  })

  it('tries a source again once it is offered for another book', () => {
    const { fail, shown, rerender } = cover(['/a.jpg', '/b.jpg'])

    fail()
    expect(shown()).toBe('/b.jpg')

    rerender(<Cover title="Der Wisent" authors={['Beth Revis']} src={['/a.jpg', '/c.jpg']} />)

    expect(shown()).toBe('/a.jpg')
  })
})
