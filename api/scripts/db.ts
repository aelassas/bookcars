import 'dotenv/config'
// import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import * as logger from '../src/common/logger'
import * as databaseHelper from '../src/common/databaseHelper'
// import User from '../src/models/User'

if (
  await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)
) {
  await databaseHelper.close()
  logger.info('Database connection closed')
  process.exit(0)
}
