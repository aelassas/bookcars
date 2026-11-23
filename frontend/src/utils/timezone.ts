export const formatKarachiDate = (value: Date | string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))

export const parseKarachiDate = (value: string): Date =>
  new Date(`${value}T00:00:00+05:00`)
