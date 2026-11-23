export interface PakistanPlace {
  name: string
  latitude: number
  longitude: number
  aliases: string[]
}

// Offline-first city and travel-destination centers. A live GPS pin or the
// geocoder gives more precise coordinates; these centers let city searches work
// in a local FYP/demo setup without depending on an external geocoding service.
export const pakistanPlaces: PakistanPlace[] = [
  { name: 'Karachi', latitude: 24.8607, longitude: 67.0011, aliases: ['khi', 'clifton', 'jinnah airport'] },
  { name: 'Lahore', latitude: 31.5204, longitude: 74.3587, aliases: ['lhe', 'gulberg', 'dha lahore', 'allama iqbal airport'] },
  { name: 'Islamabad', latitude: 33.6844, longitude: 73.0479, aliases: ['isb', 'blue area', 'islamabad airport'] },
  { name: 'Rawalpindi', latitude: 33.5651, longitude: 73.0169, aliases: ['pindi', 'saddar rawalpindi'] },
  { name: 'Faisalabad', latitude: 31.4504, longitude: 73.1350, aliases: ['lyallpur', 'd ground'] },
  { name: 'Multan', latitude: 30.1575, longitude: 71.5249, aliases: ['mtn', 'multan airport'] },
  { name: 'Sahiwal', latitude: 30.6682, longitude: 73.1114, aliases: ['sahiwal city', 'sahiwal railway station'] },
  { name: 'Peshawar', latitude: 34.0151, longitude: 71.5249, aliases: ['pew', 'peshawar airport'] },
  { name: 'Quetta', latitude: 30.1798, longitude: 66.9750, aliases: ['quetta airport'] },
  { name: 'Hyderabad', latitude: 25.3960, longitude: 68.3578, aliases: ['sindh hyderabad'] },
  { name: 'Gujranwala', latitude: 32.1877, longitude: 74.1945, aliases: [] },
  { name: 'Sialkot', latitude: 32.4945, longitude: 74.5229, aliases: ['sk airport'] },
  { name: 'Gujrat', latitude: 32.5742, longitude: 74.0789, aliases: [] },
  { name: 'Sargodha', latitude: 32.0836, longitude: 72.6711, aliases: [] },
  { name: 'Bahawalpur', latitude: 29.3956, longitude: 71.6836, aliases: ['bhv', 'bahawalpur airport'] },
  { name: 'Rahim Yar Khan', latitude: 28.4212, longitude: 70.2989, aliases: ['ryk'] },
  { name: 'Sukkur', latitude: 27.7052, longitude: 68.8574, aliases: ['sukkur airport'] },
  { name: 'Larkana', latitude: 27.5580, longitude: 68.2123, aliases: [] },
  { name: 'Gwadar', latitude: 25.1264, longitude: 62.3225, aliases: ['gwadar airport'] },
  { name: 'Murree', latitude: 33.9073, longitude: 73.3943, aliases: ['mall road murree'] },
  { name: 'Abbottabad', latitude: 34.1688, longitude: 73.2215, aliases: ['abbottabad city'] },
  { name: 'Mansehra', latitude: 34.3330, longitude: 73.2000, aliases: [] },
  { name: 'Mingora', latitude: 34.7717, longitude: 72.3602, aliases: ['swat', 'mingora swat'] },
  { name: 'Chitral', latitude: 35.8510, longitude: 71.7864, aliases: ['chitral airport'] },
  { name: 'Gilgit', latitude: 35.9208, longitude: 74.3144, aliases: ['gilgit airport'] },
  { name: 'Skardu', latitude: 35.2971, longitude: 75.6333, aliases: ['skardu airport'] },
  { name: 'Hunza', latitude: 36.3167, longitude: 74.6500, aliases: ['karimabad', 'hunza valley'] },
  { name: 'Naran', latitude: 34.9092, longitude: 73.6500, aliases: ['naran valley'] },
  { name: 'Kaghan', latitude: 34.7794, longitude: 73.5361, aliases: ['kaghan valley'] },
  { name: 'Mardan', latitude: 34.1989, longitude: 72.0231, aliases: [] },
  { name: 'Dera Ismail Khan', latitude: 31.8320, longitude: 70.9024, aliases: ['d i khan', 'dikhan'] },
  { name: 'Jhelum', latitude: 32.9425, longitude: 73.7257, aliases: [] },
  { name: 'Kasur', latitude: 31.1157, longitude: 74.4467, aliases: [] },
  { name: 'Okara', latitude: 30.8138, longitude: 73.4534, aliases: [] },
  { name: 'Vehari', latitude: 30.0452, longitude: 72.3489, aliases: [] },
  { name: 'Sheikhupura', latitude: 31.7131, longitude: 73.9783, aliases: [] },
  { name: 'Nawabshah', latitude: 26.2442, longitude: 68.4100, aliases: ['shaheed benazirabad'] },
]

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export const findPakistanPlace = (query: string): PakistanPlace | undefined => {
  const normalized = normalize(query.replace(/,\s*pakistan$/i, ''))
  if (!normalized) {
    return undefined
  }

  return pakistanPlaces.find((place) => {
    const names = [place.name, ...place.aliases].map(normalize)
    return names.some((name) => normalized === name || normalized.includes(` ${name}`) || normalized.startsWith(`${name} `))
  })
}
