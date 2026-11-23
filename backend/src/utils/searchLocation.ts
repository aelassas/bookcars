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

  if (!input.pickupLocation || !mongoose.Types.ObjectId.isValid(input.pickupLocation)) {
    return []
  }

  const pickupLocation = new mongoose.Types.ObjectId(input.pickupLocation)
  const locations = await Location.find({
    $or: [{ _id: pickupLocation }, { parentLocation: pickupLocation }],
  }).select('_id').lean()
  return locations.map((location) => location._id)
}
