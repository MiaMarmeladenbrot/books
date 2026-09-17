import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PasswordField } from './PasswordField'

function field(value = 'geheimnis') {
  const onChange = vi.fn()
  render(<PasswordField label="Neues Passwort" value={value} onChange={onChange} />)
  return { onChange, input: screen.getByLabelText('Neues Passwort') }
}

function eye() {
  return screen.getByRole('button')
}

describe('a field for a password somebody is inventing', () => {
  it('ties its label to its input, so it can be found by name', () => {
    const { input } = field()

    expect(input).toHaveValue('geheimnis')
  })

  it('starts covered', () => {
    const { input } = field()

    expect(input).toHaveAttribute('type', 'password')
    expect(eye()).toHaveAccessibleName('Passwort zeigen')
    expect(eye()).toHaveAttribute('aria-pressed', 'false')
  })

  it('uncovers on request and covers again', () => {
    const { input } = field()

    fireEvent.click(eye())
    expect(input).toHaveAttribute('type', 'text')
    expect(eye()).toHaveAccessibleName('Passwort verbergen')
    expect(eye()).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(eye())
    expect(input).toHaveAttribute('type', 'password')
  })

  it('does not submit the form it sits in', () => {
    field()

    expect(eye()).toHaveAttribute('type', 'button')
  })

  it('reports what was typed', () => {
    const { onChange, input } = field('')

    fireEvent.change(input, { target: { value: 'neu' } })

    expect(onChange).toHaveBeenCalledWith('neu')
  })
})
