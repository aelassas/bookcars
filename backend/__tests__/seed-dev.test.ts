import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import Car from '../src/models/Car'
import Country from '../src/models/Country'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import User from '../src/models/User'

const SEED_ID = 'bookcars-dev-seed-v1'
const SEED_COLLECTION = 'BookCarsDevSeed'
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

type CommandResult = {
  code: number
  output: string
}

type SeedManifest = {
  _id: string
  supplierId?: mongoose.Types.ObjectId
  locationId?: mongoose.Types.ObjectId
  countryId?: mongoose.Types.ObjectId
  locationValueIds?: mongoose.Types.ObjectId[]
  countryValueIds?: mongoose.Types.ObjectId[]
  carIds?: mongoose.Types.ObjectId[]
  ownsSupplier?: boolean
  ownsLocation?: boolean
  ownsCountry?: boolean
}

const testDatabaseUri = (() => {
  const uri = new URL(env.DB_URI)
  uri.pathname = `/bookcars_seed_test_${Date.now()}_${Math.random().toString(16).slice(2)}`
  return uri.toString()
})()

const runScript = (script: 'seed-dev' | 'clean-dev', nodeEnv = 'development'): Promise<CommandResult> => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [`dist/scripts/${script}.js`], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      BC_DB_URI: testDatabaseUri,
      NODE_ENV: nodeEnv,
    },
  })
  let output = ''

  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString()
  })
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString()
  })
  child.on('error', reject)
  child.on('close', (code) => resolve({ code: code ?? -1, output }))
})

const connectTestDatabase = async () => {
  await mongoose.connect(testDatabaseUri)
}

const getManifestCollection = () => mongoose.connection.collection<SeedManifest>(SEED_COLLECTION)

const createSupplier = async (active = true) => {
  const supplier = await User.create({
    email: `seed-supplier-${new mongoose.Types.ObjectId()}@test.bookcars.ma`,
    fullName: 'Seed supplier',
    password: 'password',
    language: 'en',
    type: bookcarsTypes.UserType.Supplier,
    active,
  })
  return supplier
}

const createLocation = async () => {
  const values = await LocationValue.create([
    { language: 'en', value: 'Seed location' },
    { language: 'fr', value: 'Seed location' },
  ])
  return Location.create({
    country: new mongoose.Types.ObjectId(),
    values: values.map((value) => value._id),
  })
}

const createUnrelatedCar = async (supplierId: mongoose.Types.ObjectId, locationId: mongoose.Types.ObjectId) => Car.create({
  name: 'Existing development car',
  supplier: supplierId,
  locations: [locationId],
  minimumAge: 21,
  dailyPrice: 99,
  deposit: 500,
  available: true,
  type: bookcarsTypes.CarType.Hybrid,
  gearbox: bookcarsTypes.GearboxType.Automatic,
  aircon: true,
  seats: 5,
  doors: 4,
  fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
  mileage: 100,
  cancellation: 0,
  amendments: 0,
  theftProtection: 10,
  collisionDamageWaiver: 10,
  fullInsurance: 10,
  additionalDriver: 5,
  range: bookcarsTypes.CarRange.Midi,
  multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
})

beforeEach(async () => {
  await connectTestDatabase()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

afterAll(async () => {
  await connectTestDatabase()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

describe('development seed command', () => {
  it('creates three linked cars and a manifest, then remains idempotent', async () => {
    await connectTestDatabase()
    const supplier = await createSupplier()
    const location = await createLocation()
    await mongoose.disconnect()

    expect((await runScript('seed-dev')).code).toBe(0)
    expect((await runScript('seed-dev')).code).toBe(0)

    await connectTestDatabase()
    const manifest = await getManifestCollection().findOne({ _id: SEED_ID })
    const cars = await Car.find({ _id: { $in: manifest?.carIds } })

    expect(cars).toHaveLength(3)
    expect(new Set(cars.map((car) => car._id.toString())).size).toBe(3)
    expect(cars.map((car) => car.supplier.toString())).toEqual([supplier._id.toString(), supplier._id.toString(), supplier._id.toString()])
    expect(cars.every((car) => car.locations[0].toString() === location._id.toString())).toBe(true)
    expect(cars.map((car) => car.dailyPrice).sort((a, b) => a - b)).toEqual([35, 55, 65])
    expect(manifest?.supplierId?.toString()).toBe(supplier._id.toString())
    expect(manifest?.locationId?.toString()).toBe(location._id.toString())
    expect(manifest?.carIds).toHaveLength(3)
    await mongoose.disconnect()
  })

  it('uses only an active supplier and creates a location when needed', async () => {
    await connectTestDatabase()
    await createSupplier(false)
    const activeSupplier = await createSupplier(true)
    await mongoose.disconnect()

    expect((await runScript('seed-dev')).code).toBe(0)
    await connectTestDatabase()
    const manifest = await getManifestCollection().findOne({ _id: SEED_ID })
    const cars = await Car.find({ _id: { $in: manifest?.carIds } })
    expect(cars).toHaveLength(3)
    expect(cars.every((car) => car.supplier.toString() === activeSupplier._id.toString())).toBe(true)
    const location = await Location.findById(cars[0].locations[0])
    expect(location?.supplier?.toString()).toBe(activeSupplier._id.toString())
    await mongoose.disconnect()
  })

  it('creates all prerequisites in a fresh development database', async () => {
    const result = await runScript('seed-dev')
    expect(result.code).toBe(0)

    await connectTestDatabase()
    const supplier = await User.findOne({ email: 'dev-seed-supplier@bookcars.ma' })
    const location = await Location.findOne({ supplier: supplier?._id })
    const country = await Country.findById(location?.country)
    const manifest = await getManifestCollection().findOne({ _id: SEED_ID })

    expect(supplier?.type).toBe(bookcarsTypes.UserType.Supplier)
    expect(supplier?.active).toBe(true)
    expect(location).toBeTruthy()
    expect(country).toBeTruthy()
    expect(manifest?.ownsSupplier).toBe(true)
    expect(manifest?.ownsLocation).toBe(true)
    expect(manifest?.ownsCountry).toBe(true)
    expect(manifest?.locationValueIds).toHaveLength(2)
    expect(manifest?.countryValueIds).toHaveLength(2)
    await mongoose.disconnect()
  })

  it('does not create a manifest or cars when a seed supplier is invalid', async () => {
    await connectTestDatabase()
    await User.create({
      email: 'dev-seed-supplier@bookcars.ma',
      fullName: 'Invalid seed supplier',
      language: 'en',
      type: bookcarsTypes.UserType.User,
      active: false,
    })
    await mongoose.disconnect()

    const result = await runScript('seed-dev')
    expect(result.code).toBe(1)
    expect(result.output).toContain('not active and valid')

    await connectTestDatabase()
    expect(await Car.countDocuments({})).toBe(0)
    expect(await getManifestCollection().countDocuments({})).toBe(0)
    await mongoose.disconnect()
  })

  it('rejects an incomplete manifest without creating cars', async () => {
    await connectTestDatabase()
    await getManifestCollection().insertOne({ _id: SEED_ID, carIds: [] })
    await mongoose.disconnect()

    const result = await runScript('seed-dev')
    expect(result.code).toBe(1)
    expect(result.output).toContain('missing supplier or location IDs')

    await connectTestDatabase()
    expect(await Car.countDocuments({})).toBe(0)
    await mongoose.disconnect()
  })

  it('refuses to run outside development', async () => {
    const result = await runScript('seed-dev', 'production')
    expect(result.code).toBe(1)
    expect(result.output).toContain('require NODE_ENV=development')
  })
})

describe('development cleanup command', () => {
  it('deletes only manifest cars and preserves shared and unrelated data', async () => {
    await connectTestDatabase()
    const supplier = await createSupplier()
    const location = await createLocation()
    const unrelatedCar = await createUnrelatedCar(supplier._id, location._id)
    await mongoose.disconnect()

    expect((await runScript('seed-dev')).code).toBe(0)
    expect((await runScript('clean-dev')).code).toBe(0)
    expect((await runScript('clean-dev')).code).toBe(0)

    await connectTestDatabase()
    expect(await Car.countDocuments({ _id: { $ne: unrelatedCar._id } })).toBe(0)
    expect(await Car.exists({ _id: unrelatedCar._id })).toBeTruthy()
    expect(await User.exists({ _id: supplier._id })).toBeTruthy()
    expect(await Location.exists({ _id: location._id })).toBeTruthy()
    expect(await getManifestCollection().findOne({ _id: SEED_ID })).toBeNull()
    await mongoose.disconnect()
  })

  it('deletes seed-owned prerequisites when they are no longer referenced', async () => {
    expect((await runScript('seed-dev')).code).toBe(0)
    expect((await runScript('clean-dev')).code).toBe(0)

    await connectTestDatabase()
    expect(await User.exists({ email: 'dev-seed-supplier@bookcars.ma' })).toBeFalsy()
    expect(await Location.exists({ supplier: { $exists: true } })).toBeFalsy()
    expect(await Country.exists({ supplier: { $exists: true } })).toBeFalsy()
    expect(await LocationValue.countDocuments({ value: 'San Francisco Airport (SFO)' })).toBe(0)
    await mongoose.disconnect()
  })

  it('refuses to run outside development', async () => {
    const result = await runScript('clean-dev', 'production')
    expect(result.code).toBe(1)
    expect(result.output).toContain('require NODE_ENV=development')
  })
})