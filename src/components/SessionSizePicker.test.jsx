// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SessionSizePicker from './SessionSizePicker'

const renderPicker = (props = {}) => {
  const onStart = vi.fn()
  render(
    <SessionSizePicker
      title="Montako korttia?"
      unit="korttia"
      initialSize={10}
      available={100}
      onStart={onStart}
      {...props}
    />,
  )
  return onStart
}

const pill = (size) => screen.getByRole('button', { name: String(size) })

describe('SessionSizePicker', () => {
  it('offers 5, 10, 15 and 20 with the remembered size preselected', () => {
    renderPicker({ initialSize: 15 })
    expect(screen.getByText('Montako korttia?')).toBeInTheDocument()
    for (const size of [5, 10, 20]) expect(pill(size)).toHaveAttribute('aria-pressed', 'false')
    expect(pill(15)).toHaveAttribute('aria-pressed', 'true')
  })

  it('only selects on tap; nothing starts until "Aloita"', () => {
    const onStart = renderPicker()
    fireEvent.click(pill(5))
    expect(pill(5)).toHaveAttribute('aria-pressed', 'true')
    expect(pill(10)).toHaveAttribute('aria-pressed', 'false')
    expect(onStart).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Aloita (5 korttia)' }))
    expect(onStart).toHaveBeenCalledWith(5)
  })

  it('says when fewer items are available than the chosen size', () => {
    renderPicker({ initialSize: 20, available: 7 })
    expect(screen.getByText('Valittavissa 7 – sessiossa kaikki 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aloita (7 korttia)' })).toBeInTheDocument()
  })
})
