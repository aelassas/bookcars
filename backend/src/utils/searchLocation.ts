import mongoose from 'mongoose'
import Location from '../models/Location'
import * as env from '../config/env.config'

const distanceKm = (latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) => {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const dLat = toRadians(latitudeB - latitudeA)
  const dLon = toRadians(longitudeB - longitudeA)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Major delivery hubs used when a requested area has no local inventory. */
const MAJOR_HUBS = ['Islamabad', 'Rawalpindi', 'Lahore']

const locationName = (location: any) => {
  const values = Array.isArray(location?.values) ? location.values : []
  const english = values.find((value: any) => value && typeof value.value === 'string')
  return english ? String(english.value) : ''
}

/**
 * Resolve a pickup hub from a MongoDB id or a case-insensitive city name.
 * Returns null when the value matches no registered location.
 */
const resolveHub = async (pickupLocation: string) => {
  const value = pickupLocation.trim()
  if (!value) {
    return null
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    const hub = await Location.findById(value).select('_id').lean()
    return hub ? { _id: hub._id } : null
  }

  const locations = await Location.find({})
    .populate<{ values: Array<{ value: string }> }>('values')
    .select('_id values')
    .lean()

  const match = locations.find((location) => location.values?.some(({ value: name }) => (
    name && name.trim().toLowerCase() === value.toLowerCase()
  )))

  return match ? { _id: match._id } : null
}

/** Return the hub itself plus its sub-locations (e.g. Islamabad → its areas). */
const getHubHierarchy = async (hubId: mongoose.Types.ObjectId) => {
  const locations = await Location.find({
    $or: [{ _id: hubId }, { parentLocation: hubId }],
  }).select('_id').lean()
  return locations.map((location) => location._id)
}

/** Return registered partner pickup points within 50 km of a searched place. */
export const getPickupLocationIds = async (input: {
  pickupLocation?: string
  pickupLatitude?: number
  pickupLongitude?: number
}) => {
  const latitude = Number(input.pickupLatitude)
  const longitude = Number(input.pickupLongitude)

  if (Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
    if (input.pickupLocation && mongoose.Types.ObjectId.isValid(input.pickupLocation)) {
      const selectedPoint = await Location.findById(input.pickupLocation).select('_id parentLocation latitude longitude').lean()
      if (!selectedPoint
        || distanceKm(latitude, longitude, Number(selectedPoint.latitude), Number(selectedPoint.longitude)) > 50) {
        return []
      }
      const selectedIds = [selectedPoint._id, ...(selectedPoint.parentLocation ? [selectedPoint.parentLocation] : [])]
      const children = await Location.find({ parentLocation: { $in: selectedIds } }).select('_id').lean()
      return [...new Map([...selectedIds, ...children.map((location) => location._id)]
        .map((id) => [id.toString(), id])).values()]
    }

    const locations = await Location.find({
      latitude: { $type: 'number' },
      longitude: { $type: 'number' },
    } as any).select('_id parentLocation latitude longitude').lean() as Array<
      Pick<env.Location, '_id' | 'parentLocation' | 'latitude' | 'longitude'>
    >

    const nearbyIds = locations
      .filter((location) => distanceKm(latitude, longitude, Number(location.latitude), Number(location.longitude)) <= 50)
      .map((location) => location._id)

    if (nearbyIds.length === 0) {
      return []
    }

    const parentIds = locations
      .filter((location) => nearbyIds.some((id) => id.equals(location._id)) && location.parentLocation)
      .map((location) => location.parentLocation!)
    const idsToExpand = [...nearbyIds, ...parentIds]
    const children = await Location.find({ parentLocation: { $in: idsToExpand } }).select('_id').lean()
    return [...new Map([...nearbyIds, ...parentIds, ...children.map((location) => location._id)]
      .map((id) => [id.toString(), id])).values()]
  }

  if (!input.pickupLocation) {
    return []
  }

  const hub = await resolveHub(input.pickupLocation)
  if (!hub) {
    return []
  }

  return getHubHierarchy(hub._id)
}

/** Name of the delivery hub nearest to the requested pickup area. */
export const getHubDeliveryName = async (locationIds: mongoose.Types.ObjectId[]) => {
  if (locationIds.length === 0) {
    return 'Islamabad'
  }

  const locations = await Location.find({ _id: { $in: locationIds } })
    .populate<{ values: Array<{ value: string }> }>('values')
    .select('_id latitude longitude values')
    .lean()

  const requested = locations.filter((location) => Number.isFinite(Number(location.latitude))
    && Number.isFinite(Number(location.longitude)))

  if (requested.length === 0) {
    return 'Islamabad'
  }

  const latitude = requested.reduce((total, location) => total + Number(location.latitude), 0) / requested.length
  const longitude = requested.reduce((total, location) => total + Number(location.longitude), 0) / requested.length

  const hubs = (await Location.find({})
    .populate<{ values: Array<{ value: string }> }>('values')
    .select('_id latitude longitude values')
    .lean())
    .filter((location) => MAJOR_HUBS.includes(locationName(location))
      && Number.isFinite(Number(location.latitude))
      && Number.isFinite(Number(location.longitude)))

  if (hubs.length === 0) {
    return 'Islamabad'
  }

  const nearest = hubs
    .map((hub) => ({ name: locationName(hub), distance: distanceKm(latitude, longitude, Number(hub.latitude), Number(hub.longitude)) }))
    .sort((a, b) => a.distance - b.distance)[0]

  return nearest.name || 'Islamabad'
}

/** True when the requested area is a northern mountain destination. */
export const isNorthernDestination = async (pickupLabel: string, locationIds: mongoose.Types.ObjectId[]) => {
  const locations = locationIds.length > 0
    ? await Location.find({ _id: { $in: locationIds } }).populate<{ values: Array<{ value: string }> }>('values').select('values').lean()
    : []
  const names = locations.flatMap((location) => (location.values || []).map(({ value }) => value)).join(' ')
  return /\b(Hunza|Skardu|Swat|Naran|Gilgit|Murree|Northern)\b/i.test(`${pickupLabel} ${names}`)
}
