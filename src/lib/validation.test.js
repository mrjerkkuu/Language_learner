import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateForm,
  PASSWORD_MIN_LENGTH,
} from './validation'

describe('validateEmail', () => {
  it('rejects empty input', () => {
    expect(validateEmail('')).toBeTruthy()
    expect(validateEmail('   ')).toBeTruthy()
  })
  it('rejects a malformed address', () => {
    expect(validateEmail('foo')).toBeTruthy()
    expect(validateEmail('foo@bar')).toBeTruthy() // no TLD
    expect(validateEmail('foo bar@baz.fi')).toBeTruthy() // space
  })
  it('accepts a normal address (returns null)', () => {
    expect(validateEmail('jeremia@example.fi')).toBeNull()
    expect(validateEmail('  jeremia@example.fi  ')).toBeNull() // trimmed
  })
})

describe('validatePassword', () => {
  it('rejects empty', () => {
    expect(validatePassword('')).toBeTruthy()
  })
  it(`rejects shorter than ${PASSWORD_MIN_LENGTH}`, () => {
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBeTruthy()
  })
  it('accepts exactly the minimum length', () => {
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBeNull()
  })
})

describe('validateDisplayName', () => {
  it('rejects empty', () => {
    expect(validateDisplayName('   ')).toBeTruthy()
  })
  it('rejects over the max length', () => {
    expect(validateDisplayName('x'.repeat(41))).toBeTruthy()
  })
  it('accepts a normal name', () => {
    expect(validateDisplayName('Jeremia')).toBeNull()
  })
})

describe('validateForm', () => {
  it('only runs the requested fields (login = email + password)', () => {
    const errors = validateForm({ email: '', password: '' }, ['email', 'password'])
    expect(Object.keys(errors).sort()).toEqual(['email', 'password'])
    expect(errors).not.toHaveProperty('displayName')
  })

  it('returns an empty object when the whole register form is valid', () => {
    const errors = validateForm(
      { displayName: 'Jeremia', email: 'j@example.fi', password: 'salasana123' },
      ['displayName', 'email', 'password'],
    )
    expect(errors).toEqual({})
  })

  it('flags each invalid register field independently', () => {
    const errors = validateForm(
      { displayName: '', email: 'nope', password: 'x' },
      ['displayName', 'email', 'password'],
    )
    expect(Object.keys(errors).sort()).toEqual(['displayName', 'email', 'password'])
  })
})
