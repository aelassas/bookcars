const KARACHI_TIMEZONE = 'Asia/Karachi'

export const formatKarachiDate = (value: Date | string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: KARACHI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))

export const parseLocalDate = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value.trim())
  if (!match) return new Date(NaN)
  const [, year, month, day] = match
  return new Date(`${year}-${month}-${day}T00:00:00+05:00`)
}

export const addKarachiDays = (value: Date, days: number): Date =>
  new Date(value.getTime() + days * 24 * 60 * 60 * 1000)
