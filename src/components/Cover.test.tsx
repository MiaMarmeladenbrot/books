import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { Cover } from './Cover'

function cover(src: string | null) {
  const { container } = render(<Cover title="Tschick" authors={['Wolfgang Herrndorf']} src={src} />)
  return {
    container,
    image: container.querySelector('img'),
    waiting: () => container.querySelector('.catalogue-sweep'),
    spine: () => container.textContent?.includes('Tschick') ?? false,
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
