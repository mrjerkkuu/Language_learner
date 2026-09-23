// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionSize } from './useSessionSize'
import { STORAGE_KEYS } from '../lib/storageKeys'

beforeEach(() => localStorage.clear())

describe('useSessionSize', () => {
  it('starts from the fallback when nothing is stored', () => {
    const { result } = renderHook(() => useSessionSize(STORAGE_KEYS.formsSessionSize, 10))
    expect(result.current[0]).toBe(10)
  })

  it('remembers a chosen size across mounts', () => {
    const first = renderHook(() => useSessionSize(STORAGE_KEYS.flashcardSessionSize, 20))
    act(() => first.result.current[1](5))
    first.unmount()

    const second = renderHook(() => useSessionSize(STORAGE_KEYS.flashcardSessionSize, 20))
    expect(second.result.current[0]).toBe(5)
  })

  it('keeps the two modules\' choices separate', () => {
    const cards = renderHook(() => useSessionSize(STORAGE_KEYS.flashcardSessionSize, 20))
    act(() => cards.result.current[1](5))
    const forms = renderHook(() => useSessionSize(STORAGE_KEYS.formsSessionSize, 10))
    expect(forms.result.current[0]).toBe(10)
  })

  it('falls back when the stored value is not an allowed size', () => {
    localStorage.setItem(STORAGE_KEYS.formsSessionSize, JSON.stringify(7))
    const { result } = renderHook(() => useSessionSize(STORAGE_KEYS.formsSessionSize, 10))
    expect(result.current[0]).toBe(10)
  })
})
