import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import * as env from '../config/env.config'
import User from '../models/User'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Initialize default admin user for BookDress application
 */
const initAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.DB_URI, { ssl: env.DB_SSL, sslCA: env.DB_SSL_CA, sslCert: env.DB_SSL_CERT })
    console.log('Connected to MongoDB')

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      email: 'admin@bookdress.local',
      type: bookcarsTypes.UserType.Admin 
    })

    if (existingAdmin) {
      console.log('Admin user already exists')
      return
    }

    // Create default admin user
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash('admin123', salt)

    const adminUser = new User({
      email: 'admin@bookdress.local',
      fullName: 'BookDress Admin',
      password: passwordHash,
      language: 'ar',
      type: bookcarsTypes.UserType.Admin,
      active: true,
      verified: true,
      blacklisted: false,
      enableEmailNotifications: false,
      phone: '+972-50-000-0000',
      location: 'Jerusalem, Israel',
      bio: 'Default admin user for BookDress application'
    })

    await adminUser.save()
    console.log('Default admin user created successfully')
    console.log('Email: admin@bookdress.local')
    console.log('Password: admin123')
    console.log('Please change the password after first login')

  } catch (error) {
    console.error('Error initializing admin user:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run the initialization
initAdmin()
