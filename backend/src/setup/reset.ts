import 'dotenv/config'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as databaseHelper from '../common/databaseHelper'
import User from '../models/User'
import * as logger from '../common/logger'
import NotificationCounter from '../models/NotificationCounter'
import Notification from '../models/Notification'

try {
  const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)

  if (!connected) {
    logger.error('Failed to connect to the database')
    process.exit(1)
  }

  // delete admin user if it exists
  const adminUser = await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin })

  if (adminUser) {
    await NotificationCounter.deleteMany({ user: adminUser._id })
    await Notification.deleteMany({ user: adminUser._id })
    await adminUser.deleteOne()
    logger.success('Admin user deleted successfully')
  } else {
    logger.info('Admin user does not exist')
  }
  process.exit(0)
} catch (err) {
  logger.error('Error during reset:', err)
  process.exit(1)
}
