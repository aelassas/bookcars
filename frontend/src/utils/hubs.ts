import * as bookcarsTypes from ':bookcars-types'
import * as LocationService from '@/services/LocationService'

/** Value that means "no hub restriction": search across all of Pakistan. */
export const ALL_PAKISTAN_HUBS_ID = ''

/** Hub used when a search opens without a chosen pickup city. */
export const DEFAULT_HUB_NAME = 'Islamabad'

/** Cities offered as one-tap pills under the search bar. */
export const QUICK_HUB_NAMES = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Hunza', 'Skardu', 'Swat', 'Murree']

export const ALL_PAKISTAN_HUBS: bookcarsTypes.Location = {
  _id: ALL_PAKISTAN_HUBS_ID,
  name: 'All Pakistan Hubs',
  values: [],
  country: { _id: '', name: 'Pakistan', values: [] },
}

let hubsCache: bookcarsTypes.Location[] | null = null
let hubsRequest: Promise<bookcarsTypes.Location[]> | null = null

/** Load partner hubs once per session and reuse them across selectors. */
export const loadHubs = (): Promise<bookcarsTypes.Location[]> => {
  if (hubsCache) {
    return Promise.resolve(hubsCache)
  }

  if (!hubsRequest) {
    hubsRequest = LocationService.getLocationsWithPosition()
      .then((locations) => {
        const unique = new Map<string, bookcarsTypes.Location>()
        locations
          .filter((location) => location.name)
          .forEach((location) => {
            const key = (location.name || '').toLowerCase()
            if (!unique.has(key)) {
              unique.set(key, location)
            }
          })
        hubsCache = [...unique.values()]
        return hubsCache
      })
      .catch(() => {
        hubsRequest = null
        return []
      })
  }

  return hubsRequest
}

export const findHubByName = (hubs: bookcarsTypes.Location[], name: string) =>
  hubs.find((hub) => (hub.name || '').toLowerCase() === name.toLowerCase())
