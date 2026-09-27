/**
 * Нормализует номер телефона к формату GREEN-API: только цифры, с кодом страны.
 * Поддерживает ввод вида "+7 (999) 123-45-67" и "8 999 123 45 67" (8 → 7 для РФ).
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }
  return digits
}

/** MAX принимает номера РФ (7, 11 цифр) и РБ (375, 12 цифр). */
export function validatePhone(input: string): string | null {
  const digits = normalizePhone(input)
  if (!digits) return 'Введите номер телефона'
  if (digits.startsWith('7') && digits.length === 11) return null
  if (digits.startsWith('375') && digits.length === 12) return null
  return 'Номер должен быть в формате +7XXXXXXXXXX или +375XXXXXXXXX'
}

/** chatId по номеру телефона (формат обратной совместимости GREEN-API). */
export function phoneToChatId(phone: string): string {
  return `${normalizePhone(phone)}@c.us`
}

/** Красивое отображение: +7 999 123-45-67 */
export function formatPhone(phone: string): string {
  const d = normalizePhone(phone)
  if (d.startsWith('7') && d.length === 11) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`
  }
  if (d.startsWith('375') && d.length === 12) {
    return `+375 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`
  }
  return d ? `+${d}` : ''
}
