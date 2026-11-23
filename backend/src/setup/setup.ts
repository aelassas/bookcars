import 'dotenv/config'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as databaseHelper from '../utils/databaseHelper'
import User from '../models/User'
import * as logger from '../utils/logger'
import * as authHelper from '../utils/authHelper'

try {
  const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)

  if (!connected) {
    logger.error('Failed to connect to the database')
    process.exit(1)
  }

  // create admin user if it doesn't exist
  if (!env.ADMIN_EMAIL) {
    throw new Error('Set BC_ADMIN_EMAIL before running setup.')
  }
  const adminUser = await User.findOne({ email: env.ADMIN_EMAIL })

  if (!adminUser) {
    const password = process.env.BC_ADMIN_PASSWORD?.trim()
    if (!password || password.length < 12) {
      throw new Error('Set a BC_ADMIN_PASSWORD of at least 12 characters before creating the administrator.')
    }
    const passwordHash = await authHelper.hashPassword(password)

    const newAdmin = new User({
      fullName: 'admin',
      email: env.ADMIN_EMAIL,
      password: passwordHash,
      language: env.DEFAULT_LANGUAGE,
      type: bookcarsTypes.UserType.Admin,
      active: true,
      verified: true,
    })
    await newAdmin.save()
    logger.info('Admin user created successfully')
  } else {
    logger.info('Admin user already exists')
  }
  process.exit(0)
} catch (err) {
  logger.error('Error during setup:', err)
  process.exit(1)
}
