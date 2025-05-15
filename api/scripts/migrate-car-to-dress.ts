import 'dotenv/config'
import * as env from '../src/config/env.config'
import * as logger from '../src/common/logger'
import * as databaseHelper from '../src/common/databaseHelper'
import mongoose from 'mongoose'

async function migrateCarToDress() {
  try {
    logger.info('Starting migration: Car to Dress')
    
    if (await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)) {
      const db = mongoose.connection
      
      // Create a checkpoint before migration
      logger.info('Creating database checkpoint...')
      await db.admin().command({ fsync: 1 })
      
      // Step 1: Rename collection
      logger.info('Renaming collection Car to Dress')
      try {
        await db.collection('Car').rename('Dress')
        logger.info('Collection renamed successfully')
      } catch (error) {
        logger.error(`Failed to rename collection: ${error}`)
        throw error
      }
      
      // Step 2: Update references in Booking collection
      logger.info('Updating references in Booking collection')
      try {
        const result = await db.collection('Booking').updateMany(
          { 'car': { $exists: true } },
          { $rename: { 'car': 'dress' } }
        )
        logger.info(`Updated ${result.modifiedCount} booking documents`)
      } catch (error) {
        logger.error(`Failed to update booking references: ${error}`)
        throw error
      }
      
      // Step 3: Add new fields to Dress collection
      logger.info('Adding new fields to Dress collection')
      try {
        await db.collection('Dress').updateMany(
          {},
          { 
            $set: { 
              type: 'Wedding',
              size: 'M',
              style: 'Modern',
              color: 'White'
            } 
          }
        )
        logger.info('Added new fields to all dress documents')
      } catch (error) {
        logger.error(`Failed to add new fields: ${error}`)
        throw error
      }
      
      // Step 4: Update any other collections with car references
      // Add more collection updates as needed
      
      logger.info('Migration completed successfully')
    }
  } catch (error) {
    logger.error(`Migration failed: ${error}`)
    process.exit(1)
  } finally {
    await databaseHelper.close()
    logger.info('Database connection closed')
    process.exit(0)
  }
}

migrateCarToDress()
