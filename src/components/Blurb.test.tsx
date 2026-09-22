import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Blurb } from './Blurb'

const TEXT = 'Claire Zachanassian kehrt als steinreiche Frau in ihr Heimatdorf Güllen zurück.'

const THREE = ['Ein Satz aus der Presse, vorneweg.', 'Der eigentliche Text.', 'Und ein Nachsatz.']

function tallerThanItsBox(taller: boolean) {
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return taller ? 200 : 60
    },
  })
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 60
    },
  })
}

beforeEach(() => {
  tallerThanItsBox(true)
})

describe('Blurb', () => {
  it('shows the blurb it is handed', () => {
    render(<Blurb text={TEXT} />)

    expect(screen.getByText(TEXT)).toBeInTheDocument()
    expect(screen.getByText('Klappentext')).toBeInTheDocument()
  })

  it('stays out of the way when there is no text', () => {
    const { container } = render(<Blurb text={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('holds the space while the catalogue is still being asked', () => {
    render(<Blurb text={null} asking />)

    expect(screen.getByText('Klappentext')).toBeInTheDocument()
  })

  it('shows a clipped opening first and opens up on Weiterlesen', () => {
    render(<Blurb text={TEXT} />)

    expect(screen.getByText(TEXT)).toHaveClass('line-clamp-4')

    fireEvent.click(screen.getByRole('button', { name: 'Weiterlesen' }))

    expect(screen.getByText(TEXT)).not.toHaveClass('line-clamp-4')
    expect(screen.getByRole('button', { name: 'Weniger' })).toBeInTheDocument()
  })

  it('runs the paragraphs together in the preview and separates them when open', () => {
    render(<Blurb text={THREE.join('\n')} />)

    expect(screen.getByText(THREE.join(' '))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Weiterlesen' }))

    for (const paragraph of THREE) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    expect(screen.queryByText(THREE.join(' '))).not.toBeInTheDocument()
  })

  it('keeps a press quote out of the preview but not out of the text', () => {
    const praise = '»Eine meisterhafte Erzählerin.« Delia Owens'
    const blurb = 'Am Abend ihres 41. Geburtstages sitzt Jolene allein am Esstisch.'

    render(<Blurb text={`${praise}\n${blurb}`} />)

    expect(screen.getByText(blurb)).toBeInTheDocument()
    expect(screen.queryByText(`${praise} ${blurb}`)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Weiterlesen' }))

    expect(screen.getByText(praise)).toBeInTheDocument()
  })

  it('offers no Weiterlesen when the text already fits', () => {
    tallerThanItsBox(false)

    render(<Blurb text={TEXT} />)

    expect(screen.getByText(TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
