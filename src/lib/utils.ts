import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

export function sanitizeMoneyInput(input: string) {
  return input.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
}

export function formatMoneyInput(value: string | number) {
  const text = String(value)
  if (text === '') return ''
  const [integer, decimal] = text.split('.')
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted
}

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay = 300,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}