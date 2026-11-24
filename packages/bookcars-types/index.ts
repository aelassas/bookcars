export enum UserType {
  Admin = 'admin',
  Supplier = 'supplier',
  User = 'user',
}

export enum AppType {
  Admin = 'admin',
  Frontend = 'frontend',
}

export enum CarType {
  Diesel = 'diesel',
  Gasoline = 'gasoline',
  Electric = 'electric',
  Hybrid = 'hybrid',
  PlugInHybrid = 'plugInHybrid',
  Unknown = 'unknown',
}

export enum CarRange {
  Mini = 'mini', // car
  Midi = 'midi', // suv
  Maxi = 'maxi', // van
  Scooter = 'scooter',
  Bus = 'bus',
  Truck = 'truck',
  Caravan = 'caravan',
}

export enum CarMultimedia {
  Touchscreen = 'touchscreen',
  Bluetooth = 'bluetooth',
  AndroidAuto = 'androidAuto',
  AppleCarPlay = 'appleCarPlay',
}

export enum GearboxType {
  Manual = 'manual',
  Automatic = 'automatic',
}

export enum FuelPolicy {
  LikeForLike = 'likeForlike',
  FreeTank = 'freeTank',
  FullToFull = 'fullToFull',
  FullToEmpty = 'FullToEmpty',
  TankToTank = 'TANK_TO_TANK',
  SameToSame = 'SAME_TO_SAME',
  FuelIncluded = 'FUEL_INCLUDED',
}

export enum TerrainCapability {
  CityOnly = 'CITY_ONLY',
  HighwayIntercity = 'HIGHWAY_INTERCITY',
  NorthernMountains = 'NORTHERN_MOUNTAINS',
}

export enum ListingStatus {
  PendingReview = 'PENDING_REVIEW',
  Approved = 'APPROVED',
  Suspended = 'SUSPENDED',
}

export enum RentalMode {
  SelfDrive = 'SELF_DRIVE',
  WithDriver = 'WITH_DRIVER',
}

export enum TripScope {
  IntraCity = 'INTRA_CITY',
  OutOfCity = 'OUT_OF_CITY',
  NorthernTour = 'NORTHERN_TOUR',
}

export enum KycStatus {
  Unverified = 'UNVERIFIED',
  Pending = 'PENDING',
  Verified = 'VERIFIED',
  Rejected = 'REJECTED',
}

export enum RentalPaymentMethod {
  JazzCash = 'JAZZCASH',
  Easypaisa = 'EASYPAISA',
  Raast = 'RAAST',
  CardDemo = 'CARD_DEMO',
}

export enum RentalPaymentStatus {
  PendingPayment = 'PENDING_PAYMENT',
  Processing = 'PROCESSING',
  Paid = 'PAID',
  Failed = 'FAILED',
  Refunded = 'REFUNDED',
}

export enum BookingStatus {
  Void = 'void',
  Pending = 'pending',
  Deposit = 'deposit',
  Paid = 'paid',
  PaidInFull = 'paidInFull',
  Reserved = 'reserved',
  Cancelled = 'cancelled',
}

export enum Mileage {
  Limited = 'limited',
  Unlimited = 'unlimited',
}

export enum Availablity {
  Available = 'available',
  Unavailable = 'unavailable',
}

export enum RecordType {
  Admin = 'admin',
  Supplier = 'supplier',
  User = 'user',
  Car = 'car',
  Location = 'location',
  Country = 'country',
}

export enum PaymentGateway {
  PayPal = 'payPal',
  Stripe = 'stripe',
}

export type BookingLifecycle = 'PENDING_PAYMENT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Booking {
  lifecycleStatus?: BookingLifecycle
  _id?: string
  supplier: string | User
  car: string | Car
  driver?: string | User
  pickupLocation: string | Location
  dropOffLocation: string | Location
  from: Date
  to: Date
  status: BookingStatus
  cancellation?: boolean
  amendments?: boolean
  theftProtection?: boolean
  collisionDamageWaiver?: boolean
  fullInsurance?: boolean
  additionalDriver?: boolean
  _additionalDriver?: string | AdditionalDriver
  cancelRequest?: boolean
  price?: number
  sessionId?: string
  paymentIntentId?: string
  customerId?: string
  expireAt?: Date
  isDeposit?: boolean
  isPayedInFull?: boolean
  paypalOrderId?: string
  demoPaymentAttempts?: DemoPaymentAttempt[]
  rentalMode?: RentalMode
  tripScope?: TripScope
  destinationRegion?: string
  priceBreakdown?: RentalPriceBreakdown
  paymentMethod?: RentalPaymentMethod
  paymentReference?: string
  paymentProof?: string
  paymentVerificationStatus?: 'pending' | 'verified' | 'rejected'
  paymentStatus?: RentalPaymentStatus
  paymentState?: 'PENDING_PAYMENT' | 'PROCESSING' | 'CONFIRMED' | 'FAILED'
  transactionRef?: string
  handoverChecklist?: HandoverChecklist
}

export interface RentalPriceBreakdown {
  baseRentPkr: number
  driverAllowancePkr: number
  outOfCitySurchargePkr: number
  securityDepositPkr: number
  totalPayablePkr: number
}

export interface HandoverChecklist {
  completedAt?: Date
  odometerStart?: number
  fuelLevel?: string
  spareTirePresent?: boolean
  exteriorNotes?: string
  verifiedBySupplier?: boolean
}

export type DemoPaymentOutcome = 'success' | 'failed' | 'cancelled'

export interface DemoPaymentAttempt {
  reference: string
  idempotencyKey: string
  outcome: DemoPaymentOutcome
  paymentMethod?: RentalPaymentMethod
  amount: number
  currency: string
  createdAt: Date
}

export type PaymentMethod = 'payLater' | 'stripe' | 'payPal' | 'jazzCash' | 'easypaisa'

export type KycDocumentType = 'cnic' | 'passport' | 'driving_license'

export interface Kyc {
  _id?: string
  user: string | User
  documentType: KycDocumentType
  documentNumber: string
  documentFront?: string
  documentBack?: string
  selfie?: string
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended'
  rejectionReason?: string
  reviewedBy?: string
  reviewedAt?: Date
}

export interface Handover {
  _id?: string
  booking: string | Booking
  vehicle: string | Car
  customer: string | User
  supplier: string | User
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  odometerAtPickup?: number
  odometerAtReturn?: number
  fuelLevelAtPickup?: number
  fuelLevelAtReturn?: number
  checklistAtPickup?: unknown
  checklistAtReturn?: unknown
  pickupPhotos?: string[]
  returnPhotos?: string[]
  customerSignature?: string
  supplierSignature?: string
  damageNotes?: string
  scheduledAt?: Date
  completedAt?: Date
}

export interface CheckoutPayload {
  driver?: User
  booking?: Booking
  additionalDriver?: AdditionalDriver
  payLater: boolean
  sessionId?: string
  paymentIntentId?: string
  customerId?: string
  payPal?: boolean
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paymentProof?: string
  cnicNumber?: string
  drivingLicenseNumber?: string
}

export interface Filter {
  from?: Date
  dateBetween?: Date
  to?: Date
  keyword?: string
  pickupLocation?: string
  pickupLatitude?: number
  pickupLongitude?: number
  pickupLabel?: string
  dropOffLocation?: string
}

export interface GetBookingsPayload {
  suppliers: string[]
  statuses: string[]
  user?: string
  car?: string
  filter?: Filter
}

export interface AdditionalDriver {
  fullName: string
  email: string
  phone: string
  birthDate: Date
}

export interface UpsertBookingPayload {
  booking: Booking
  additionalDriver?: AdditionalDriver
}

export interface LocationName {
  language: string
  name: string
}

export interface CountryName {
  language: string
  name: string
}

export interface UpsertLocationPayload {
  country: string
  longitude?: number
  latitude?: number
  names: LocationName[]
  image?: string | null
  parkingSpots?: ParkingSpot[]
  supplier?: string
  parentLocation?: string
}

export interface UpdateSupplierPayload {
  _id: string
  fullName: string
  phone: string
  location: string
  bio: string
  payLater: boolean
  licenseRequired: boolean
  minimumRentalDays?: number
  priceChangeRate?: number
  supplierCarLimit?: number
  notifyAdminOnNewCar?: boolean
  blacklisted?: boolean
}

export interface CreateCarPayload {
  loggedUser: string
  name: string
  licensePlate?: string
  supplier: string
  minimumAge: number
  locations: string[]

  // price fields
  hourlyPrice: number | null
  discountedHourlyPrice: number | null
  dailyPrice: number
  discountedDailyPrice: number | null
  biWeeklyPrice: number | null
  discountedBiWeeklyPrice: number | null
  weeklyPrice: number | null
  discountedWeeklyPrice: number | null
  monthlyPrice: number | null
  discountedMonthlyPrice: number | null
  // date based price
  isDateBasedPrice: boolean
  dateBasedPrices: DateBasedPrice[]

  deposit: number
  available: boolean
  fullyBooked?: boolean
  comingSoon?: boolean
  type: string
  gearbox: string
  aircon: boolean
  image?: string
  seats: number
  doors: number
  fuelPolicy: string
  mileage: number
  cancellation: number
  amendments: number
  theftProtection: number
  collisionDamageWaiver: number
  fullInsurance: number
  additionalDriver: number
  range: string
  multimedia: string[]
  rating?: number
  co2?: number
  blockOnPay?: boolean
}

export interface UpdateCarPayload extends CreateCarPayload {
  _id: string
}

export interface CarSpecs {
  aircon?: boolean,
  moreThanFourDoors?: boolean,
  moreThanFiveSeats?: boolean,
}

export interface GetCarsPayload {
  rentalMode?: RentalMode
  suppliers?: string[]
  carSpecs?: CarSpecs
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[]
  deposit?: number
  availability?: string[]
  pickupLocation?: string
  pickupLatitude?: number
  pickupLongitude?: number
  pickupLabel?: string
  ranges?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
  includeAlreadyBookedCars?: boolean
  includeComingSoonCars?: boolean
  from?: Date
  to?: Date
}

export interface SignUpPayload {
  email: string
  password: string
  fullName: string
  phone?: string
  language: string
  active?: boolean
  verified?: boolean
  blacklisted?: boolean
  type?: string
  avatar?: string
  birthDate?: number | Date
  cnicNumber?: string
  drivingLicenseNumber?: string
}

export type Contract = { language: string, file: string | null }

export interface CreateUserPayload {
  email?: string
  phone: string
  location: string
  bio: string
  fullName: string
  type?: string
  avatar?: string
  birthDate?: number | Date
  language?: string
  password?: string
  verified?: boolean
  blacklisted?: boolean
  payLater?: boolean
  supplier?: string
  contracts?: Contract[]
  licenseRequired?: boolean
  minimumRentalDays?: number
  license?: string
  priceChangeRate?: number
  supplierCarLimit?: number
  notifyAdminOnNewCar?: boolean
}

export interface UpdateUserPayload extends CreateUserPayload {
  _id: string
  enableEmailNotifications?: boolean
  cnicNumber?: string
  drivingLicenseNumber?: string
}

export interface CheckPasswordPayload {
  _id: string
  password: string
}

export interface ChangePasswordPayload {
  _id: string
  password: string
  newPassword: string
  strict: boolean
}

export interface ActivatePayload {
  userId: string
  token: string
  password: string
}

export interface ValidateEmailPayload {
  email: string
  appType?: AppType
}

export enum SocialSignInType {
  Facebook = 'facebook',
  Apple = 'apple',
  Google = 'google'
}

export interface SignInPayload {
  email?: string
  password?: string
  stayConnected?: boolean
  mobile?: boolean
  fullName?: string
  avatar?: string
  accessToken?: string
  socialSignInType?: SocialSignInType
}

export interface ResendLinkPayload {
  email?: string
}

export interface UpdateEmailNotificationsPayload {
  _id: string
  enableEmailNotifications: boolean
}

export interface UpdateLanguagePayload {
  id: string
  language: string
}

export interface ValidateSupplierPayload {
  fullName: string
}

export interface ValidateLocationPayload {
  language: string
  name: string
}

export interface ValidateCountryPayload {
  language: string
  name: string
}

export interface UpdateStatusPayload {
  ids: string[]
  status: string
}

export interface User {
  _id?: string
  supplier?: User | string
  fullName: string
  email?: string
  phone?: string
  password?: string
  birthDate?: Date
  verified?: boolean
  verifiedAt?: Date
  active?: boolean
  language?: string
  enableEmailNotifications?: boolean
  avatar?: string
  bio?: string
  location?: string
  type?: string
  blacklisted?: boolean
  payLater?: boolean
  accessToken?: string
  checked?: boolean
  customerId?: string
  carCount?: number
  contracts?: Contract[]
  licenseRequired?: boolean
  license?: string | null
  minimumRentalDays?: number
  priceChangeRate?: number
  supplierCarLimit?: number
  notifyAdminOnNewCar?: boolean
  isSocial?: boolean
  cnicNumber?: string
  drivingLicenseNumber?: string
  kycStatus?: KycStatus
  cnicFrontImage?: string
  licenseFrontImage?: string
}

export interface Option {
  _id: string
  name?: string
  image?: string
}

export interface LocationValue {
  _id?: string
  language: string
  value?: string
}

export interface ParkingSpot {
  _id?: string
  longitude: number | string
  latitude: number | string
  name?: string
  values?: LocationValue[]
}

export interface Location {
  _id: string
  country?: Country
  longitude?: number
  latitude?: number
  name?: string
  values?: LocationValue[]
  image?: string
  parkingSpots?: ParkingSpot[]
  supplier?: User
  parentLocation?: Location
}

export interface Country {
  _id: string
  name?: string
  values?: LocationValue[]
  supplier?: User
}

export interface CountryInfo extends Country {
  locations?: Location[]
}

export interface UpsertCountryPayload {
  names: CountryName[]
  supplier?: string
}

export interface DateBasedPrice {
  _id?: string
  startDate: Date | null
  endDate: Date | null
  dailyPrice: number | string
}

export interface Car {
  deliveryLocations?: string[]
  interCityDeliveryBadge?: string
  _id: string
  name: string
  licensePlate?: string
  registrationPlate?: string
  engineCc?: number
  terrainCapability?: TerrainCapability
  selfDriveAvailable?: boolean
  withDriverAvailable?: boolean
  driverDailyAllowancePkr?: number
  outOfCitySurchargePkr?: number
  securityDepositPkr?: number
  listingStatus?: ListingStatus
  complianceNotes?: string
  reviewedBy?: string | User
  reviewedAt?: Date | string
  supplier: User
  minimumAge: number
  locations: Location[]

  // price fields
  dailyPrice: number
  discountedDailyPrice: number | null
  hourlyPrice: number | null
  discountedHourlyPrice: number | null
  biWeeklyPrice: number | null
  discountedBiWeeklyPrice: number | null
  weeklyPrice: number | null
  discountedWeeklyPrice: number | null
  monthlyPrice: number | null
  discountedMonthlyPrice: number | null

  // date based price fields
  isDateBasedPrice: boolean
  dateBasedPrices: DateBasedPrice[]

  deposit: number
  available: boolean
  fullyBooked?: boolean
  comingSoon?: boolean
  type: CarType
  gearbox: GearboxType
  aircon: boolean
  image?: string
  seats: number
  doors: number
  fuelPolicy: FuelPolicy
  mileage: number
  cancellation: number
  amendments: number
  theftProtection: number
  collisionDamageWaiver: number
  fullInsurance: number
  additionalDriver: number
  range: string
  multimedia: CarMultimedia[] | undefined
  rating?: number
  trips: number
  co2?: number
  blockOnPay?: boolean
  [propKey: string]: any
}

export interface Data<T> {
  rows: T[]
  rowCount: number
}

export interface GetBookingCarsPayload {
  supplier: string
  pickupLocation: string
}

export interface Notification {
  _id: string
  user: string
  message: string
  booking?: string
  car?: string
  isRead?: boolean
  checked?: boolean
  createdAt?: Date
}

export interface NotificationCounter {
  _id: string
  user: string
  count: number
}

export interface ResultData<T> {
  pageInfo: { totalRecords: number }
  resultData: T[]
}

export type Result<T> = [ResultData<T>] | [] | undefined | null

export interface GetUsersBody {
  user: string
  types: UserType[]
}

export interface CreatePaymentPayload {
  amount: number
  /**
   * Three-letter ISO currency code, in lowercase.
   * Must be a supported currency: https://docs.stripe.com/currencies
   *
   * @type {string}
   */
  currency: string
  /**
   * The IETF language tag of the locale Checkout is displayed in. If blank or auto, the browser's locale is used.
   *
   * @type {string}
   */
  locale: string
  receiptEmail: string
  customerName: string
  name: string
  description?: string
}

export interface CreatePayPalOrderPayload {
  bookingId: string
  amount: number
  currency: string
  name: string
  description: string
}

export interface PaymentResult {
  sessionId?: string
  paymentIntentId?: string
  customerId: string
  clientSecret: string | null
}

export interface SendEmailPayload {
  from: string
  subject: string
  message: string
  isContactForm: boolean
  recaptchaToken?: string
}

export interface Response<T> {
  status: number
  data: T
}

export interface BankDetails {
  _id: string
  accountHolder: string
  bankName: string
  iban: string
  swiftBic: string
  showBankDetailsPage: boolean
}

export interface UpsertBankDetailsPayload {
  _id?: string
  accountHolder: string
  bankName: string
  iban: string
  swiftBic: string
  showBankDetailsPage: boolean
}

export interface Setting {
  _id: string
  minPickupHours: number
  minRentalHours: number
  minPickupDropoffHour: number
  maxPickupDropoffHour: number
}

export interface UpdateSettingsPayload {
  minPickupHours: number
  minRentalHours: number
  minPickupDropoffHour: number
  maxPickupDropoffHour: number
}

export type BookingIntakeAuditStatus = 'extracted' | 'needs_correction' | 'approved' | 'rejected' | 'booking_created' | 'failed'

export interface BookingIntakeData {
  rentalType: string | null
  vehicleCategory: string | null
  chauffeurRequired: boolean
  pickupLocation: string | null
  dropoffLocation: string | null
  startDate: string | null
  endDate: string | null
  passengerCount: number | null
  extras: string[]
  paymentMethod: string | null
  rentalMode?: RentalMode | null
  missingFields: string[]
  ambiguities: string[]
  confidence: number
  requiresApproval: true
}

export interface BookingIntakeAudit {
  _id: string
  userId: string
  originalRequest: string
  extractedData: BookingIntakeData
  correctedData?: BookingIntakeData
  confidence: number
  missingFields: string[]
  ambiguities: string[]
  approvalStatus: BookingIntakeAuditStatus
  approvedBy?: string
  createdBookingId?: string
  provider: string
  failureReason?: string
  createdAt: Date
  updatedAt: Date
}

export type MaintenanceStatus = 'reported' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type MaintenanceType = 'oil_change' | 'tire_service' | 'engine_service' | 'registration_renewal' | 'insurance_renewal' | 'fitness_renewal' | 'accident_repair' | 'general_inspection'

export interface Maintenance {
  _id?: string
  vehicle: string
  reportedBy: string
  supplier?: string
  type: MaintenanceType
  description?: string
  status: MaintenanceStatus
  startDate: Date
  expectedCompletionDate: Date
  completedDate?: Date
  mileage?: number
  cost?: number
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export type VehicleDocumentType = 'registration' | 'insurance' | 'token_tax' | 'fitness_certificate' | 'driver_license'
export type VehicleDocumentStatus = 'pending' | 'verified' | 'expired'

export interface VehicleDocument {
  _id?: string
  vehicle?: string
  driver?: string
  type: VehicleDocumentType
  expiryDate: Date
  status: VehicleDocumentStatus
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface OperationsDashboard {
  generatedAt: Date
  totals: {
    totalVehicles: number
    availableVehicles: number
    activeBookings: number
    chauffeurBookings: number
    airportBookings: number
    maintenanceVehicles: number
    upcomingMaintenance: number
    expiredDocuments: number
    expiringDocuments: number
    pendingAiApprovals: number
    approvedAiBookings: number
    revenue: number
  }
  bookingStatuses: Array<{ _id: string, count: number }>
  rentalTypes: Array<{ _id?: string, count: number }>
  maintenanceRows: Array<Record<string, unknown>>
  documentRows: Array<Record<string, unknown>>
}

// 
// React types
//
export type DataEvent<T> = (data?: Data<T>) => void

export interface StatusFilterItem {
  label: string
  value: BookingStatus
  checked?: boolean
}

export interface CarFilter {
  pickupLocation: Location
  dropOffLocation: Location
  from: Date
  to: Date
}

export type CarFilterSubmitEvent = (filter: CarFilter) => void

export interface CarOptions {
  cancellation?: boolean
  amendments?: boolean
  theftProtection?: boolean
  collisionDamageWaiver?: boolean
  fullInsurance?: boolean
  additionalDriver?: boolean
}
