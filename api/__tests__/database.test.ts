import 'dotenv/config'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'
import Country from '../src/models/Country'
import ParkingSpot from '../src/models/ParkingSpot'

beforeAll(() => {
  testHelper.initializeLogger()
})

describe('Test database connection', () => {
  it('should connect to database', async () => {
    // test success (connected)
    let res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()
    // test success (already connected)
    res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()
    await databaseHelper.close()
  })
})

describe('Test database connection failure', () => {
  it('should fail connecting to database', async () => {
    // test failure (wrong uri)
    const res = await databaseHelper.connect('wrong-uri', true, false)
    expect(res).toBeFalsy()
  })
})

describe('Test database initialization', () => {
  it('should initialize database', async () => {
    let res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()

    const lv1 = new LocationValue({ language: 'en', value: 'location' })
    await lv1.save()
    const lv2 = new LocationValue({ language: 'pt', value: 'localização' })
    await lv2.save()
    const l1 = new Location({ country: testHelper.GetRandromObjectIdAsString(), values: [lv1.id, lv2.id] })
    await l1.save()
    const l2 = new Location({ country: testHelper.GetRandromObjectIdAsString(), values: [lv2.id] })
    await l2.save()

    // test batch deletion pf unsupported languages
    for (let i = 0; i < 1001; i++) {
      const lv2 = new LocationValue({ language: 'pt', value: 'localização' })
      await lv2.save()
    }

    const cv1 = new LocationValue({ language: 'en', value: 'country' })
    await cv1.save()
    const cv2 = new LocationValue({ language: 'pt', value: 'país' })
    await cv2.save()
    const c1 = new Country({ values: [cv1.id, cv2.id] })
    await c1.save()
    const c2 = new Country({ values: [cv2.id] })
    await c2.save()

    const pv1 = new LocationValue({ language: 'en', value: 'parking' })
    await pv1.save()
    const pv2 = new LocationValue({ language: 'pt', value: 'estacionamento' })
    await pv2.save()
    const ps1 = new ParkingSpot({ latitude: 1, longitude: 1, values: [pv1.id, pv2.id] })
    await ps1.save()
    const ps2 = new ParkingSpot({ latitude: 1, longitude: 1, values: [pv2.id] })
    await ps2.save()

    // test success (initialization)
    await testHelper.delay(5 * 1000)
    res = await databaseHelper.initialize()
    expect(res).toBeTruthy()

    const location1 = await Location.findById(l1.id)
    const location2 = await Location.findById(l2.id)
    await LocationValue.deleteMany({ _id: { $in: [...location1!.values, ...location2!.values] } })
    await location1?.deleteOne()
    await location2?.deleteOne()

    const country1 = await Country.findById(c1.id)
    const country2 = await Country.findById(c2.id)
    await LocationValue.deleteMany({ _id: { $in: [...country1!.values, ...country2!.values] } })
    await country1?.deleteOne()
    await country2?.deleteOne()

    const parkingSpot1 = await ParkingSpot.findById(ps1.id)
    const parkingSpot2 = await ParkingSpot.findById(ps2.id)
    await LocationValue.deleteMany({ _id: { $in: [...parkingSpot1!.values, parkingSpot2!.values] } })
    await parkingSpot1?.deleteOne()
    await parkingSpot2?.deleteOne()

    // test success (initialization again)
    res = await databaseHelper.initialize()
    expect(res).toBeTruthy()

    await databaseHelper.close()
  })
})

describe('Test database initialization failures', () => {
    it('should check database initialization failures', async () => {
    // test failure (lost db connection)
    await databaseHelper.close()
    expect(await databaseHelper.initializeLocations()).toBeFalsy()
    expect(await databaseHelper.initializeCountries()).toBeFalsy()
    expect(await databaseHelper.initializeParkingSpots()).toBeFalsy()
  })
})
