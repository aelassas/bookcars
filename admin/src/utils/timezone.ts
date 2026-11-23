export const parseKarachiDate = (value: string): Date =>
  new Date(`${value}T00:00:00+05:00`)
