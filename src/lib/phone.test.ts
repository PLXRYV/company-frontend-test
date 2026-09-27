import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone, phoneToChatId, validatePhone } from './phone'

describe('phone', () => {
  it('нормализует разные форматы ввода', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567')
    expect(normalizePhone('+375 29 123-45-67')).toBe('375291234567')
  })

  it('валидирует номера РФ и РБ', () => {
    expect(validatePhone('+79991234567')).toBeNull()
    expect(validatePhone('375291234567')).toBeNull()
    expect(validatePhone('')).toBe('Введите номер телефона')
    expect(validatePhone('12345')).not.toBeNull()
    expect(validatePhone('+1 202 555 0123')).not.toBeNull()
  })

  it('строит chatId по номеру', () => {
    expect(phoneToChatId('+7 999 123-45-67')).toBe('79991234567@c.us')
  })

  it('красиво форматирует номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67')
  })
})
