import type { Request, Response } from 'express'
import Booking from '../models/Booking'
import Car from '../models/Car'
import Maintenance from '../models/Maintenance'
import VehicleDocument from '../models/VehicleDocument'
import BookingIntakeAudit from '../models/BookingIntakeAudit'
import User from '../models/User'
import * as bookcarsTypes from ':bookcars-types'

export const get = async (_req: Request, res: Response) => {
  const now = new Date()
  const soon = new Date(now)
  soon.setUTCDate(soon.getUTCDate() + 30)
  const activeStatuses = [
    bookcarsTypes.BookingStatus.Pending,
    bookcarsTypes.BookingStatus.Deposit,
    bookcarsTypes.BookingStatus.Paid,
    bookcarsTypes.BookingStatus.PaidInFull,
    bookcarsTypes.BookingStatus.Reserved,
  ]

  const verifiedSupplierIds = await User.find({
    type: bookcarsTypes.UserType.Supplier,
    active: true,
    verified: true,
    blacklisted: false,
  }).distinct('_id')
  const verifiedVehicleIds = await Car.find({ supplier: { $in: verifiedSupplierIds } }).distinct('_id')
  const verifiedFleet = { supplier: { $in: verifiedSupplierIds } }
  const verifiedFleetVehicles = { vehicle: { $in: verifiedVehicleIds } }

  const [
    totalVehicles,
    availableVehicles,
    activeBookings,
    chauffeurBookings,
    airportBookings,
    maintenanceVehicles,
    upcomingMaintenance,
    expiredDocuments,
    expiringDocuments,
    pendingAiApprovals,
    approvedAiBookings,
    revenue,
    bookingStatuses,
    rentalTypes,
    maintenanceRows,
    documentRows,
  ] = await Promise.all([
    Car.countDocuments(verifiedFleet),
    Car.countDocuments({ ...verifiedFleet, available: true, fullyBooked: false }),
    Booking.countDocuments({ ...verifiedFleet, status: { $in: activeStatuses } }),
    BookingIntakeAudit.countDocuments({ 'extractedData.rentalType': 'chauffeur', approvalStatus: 'booking_created' }),
    BookingIntakeAudit.countDocuments({ 'extractedData.rentalType': 'airport-transfer', approvalStatus: 'booking_created' }),
    Maintenance.distinct('vehicle', { ...verifiedFleet, status: { $nin: ['completed', 'cancelled'] } }).then((vehicles) => vehicles.length),
    Maintenance.countDocuments({ ...verifiedFleet, startDate: { $gte: now }, status: { $nin: ['completed', 'cancelled'] } }),
    VehicleDocument.countDocuments({ ...verifiedFleetVehicles, expiryDate: { $lt: now } }),
    VehicleDocument.countDocuments({ ...verifiedFleetVehicles, expiryDate: { $gte: now, $lte: soon } }),
    BookingIntakeAudit.countDocuments({ approvalStatus: { $in: ['extracted', 'needs_correction'] } }),
    BookingIntakeAudit.countDocuments({ approvalStatus: 'booking_created' }),
    Booking.aggregate([
      { $match: { ...verifiedFleet, status: { $nin: [bookcarsTypes.BookingStatus.Void, bookcarsTypes.BookingStatus.Cancelled] } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]).then((rows) => rows[0]?.total || 0),
    Booking.aggregate([
      { $match: verifiedFleet },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    BookingIntakeAudit.aggregate([
      { $match: { approvalStatus: 'booking_created' } },
      { $group: { _id: '$extractedData.rentalType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Maintenance.find({ ...verifiedFleet, status: { $nin: ['completed', 'cancelled'] } }).sort({ expectedCompletionDate: 1 }).limit(10).populate('vehicle', 'name licensePlate').lean(),
    VehicleDocument.find({ ...verifiedFleetVehicles, expiryDate: { $lte: soon } }).sort({ expiryDate: 1 }).limit(10).populate('vehicle', 'name licensePlate').lean(),
  ])

  res.json({
    generatedAt: now,
    totals: {
      totalVehicles,
      availableVehicles,
      activeBookings,
      chauffeurBookings,
      airportBookings,
      maintenanceVehicles,
      upcomingMaintenance,
      expiredDocuments,
      expiringDocuments,
      pendingAiApprovals,
      approvedAiBookings,
      revenue,
    },
    bookingStatuses,
    rentalTypes,
    maintenanceRows,
    documentRows,
  })
}
