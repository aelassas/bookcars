import 'dotenv/config'
import * as env from '../src/config/env.config'
import * as logger from '../src/utils/logger'
import * as databaseHelper from '../src/utils/databaseHelper'
import Car from '../src/models/Car'

if (
  await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)
) {
  const cars = await Car.find({})

  for (const car of cars) {
    if (('price' in car) && car.price) {
      car.dailyPrice = Number(car.price)
      car.discountedDailyPrice = null
      car.biWeeklyPrice = null
      car.discountedBiWeeklyPrice = null
      car.weeklyPrice = null
      car.discountedWeeklyPrice = null
      car.monthlyPrice = null
      car.discountedMonthlyPrice = null
      car.price = undefined
      await car.save()
      logger.info(`${car._id.toString()} affected`)
    }
  }

  await databaseHelper.close()
  logger.info('MongoDB connection closed')
  process.exit(0)
}
