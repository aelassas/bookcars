import 'dotenv/config'
// import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import * as logger from '../src/utils/logger'
import * as databaseHelper from '../src/utils/databaseHelper'
// import User from '../src/models/User'
// import Car from '../src/models/Car'

if (await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)) {
  // await User.updateMany({ type: bookcarsTypes.UserType.Supplier }, { payLater: true })

  // await Car.updateMany({}, { isDateBasedPrice: false, dateBasedPrices: [] })

  await databaseHelper.close()
  logger.info('Database connection closed')
  process.exit(0)
}
