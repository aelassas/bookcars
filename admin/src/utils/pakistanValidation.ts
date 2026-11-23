/** Pakistani mobile numbers in international (+923...) or local (03...) format. */
export const isPakistanPhone = (value: string): boolean => /^(?:\+923\d{9}|03\d{9})$/.test(value.trim())
