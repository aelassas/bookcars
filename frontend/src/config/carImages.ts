/**
 * Representative fleet photos shown in search results when a vehicle has no
 * uploaded photo of its own. A photo uploaded from the console (car.image)
 * always wins; this is only the fallback.
 *
 * Sources and licences: see public/cars/CREDITS.md.
 */

type PhotoCar = {
  name?: string
  range?: string
}

const MODEL_PHOTOS: Array<[RegExp, string]> = [
  [/corolla\s*altis/i, 'toyota-corolla-altis'],
  [/corolla/i, 'toyota-corolla'],
  [/yaris/i, 'toyota-yaris'],
  [/alto/i, 'suzuki-alto'],
  [/cultus/i, 'suzuki-cultus'],
  [/wagon\s*r/i, 'suzuki-wagonr'],
  [/br-?v/i, 'honda-brv'],
  [/civic/i, 'honda-civic'],
  [/city/i, 'honda-city'],
  [/sportage/i, 'kia-sportage'],
  [/tucson/i, 'hyundai-tucson'],
  [/fortuner/i, 'toyota-fortuner'],
  [/prado|land\s*cruiser/i, 'toyota-prado'],
  [/hiace/i, 'toyota-hiace'],
]

const RANGE_PHOTOS: Record<string, string> = {
  Mini: 'suzuki-cultus',
  Midi: 'toyota-corolla',
  Maxi: 'toyota-fortuner',
}

export const carPhoto = (car: PhotoCar) => {
  const match = MODEL_PHOTOS.find(([pattern]) => pattern.test(car.name || ''))
  const slug = match ? match[1] : RANGE_PHOTOS[car.range || ''] || 'toyota-corolla'
  return `/cars/${slug}.jpg`
}
