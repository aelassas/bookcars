import fs from 'fs'
import path from 'path'
import * as env from '../config/env.config'

/**
 * Generate a unique filename for a dress image.
 *
 * @param {string} originalname
 * @returns {string}
 */
export const generateUniqueFilename = (originalname: string): string => {
  const timestamp = new Date().getTime()
  const ext = path.extname(originalname)
  return `dress_${timestamp}${ext}`
}

/**
 * Move a dress image from temp to permanent storage.
 *
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const moveDressImage = async (filename: string): Promise<void> => {
  const tempPath = path.join(env.CDN_TEMP_DRESSES, filename)
  const destPath = path.join(env.CDN_DRESSES, filename)
  
  if (fs.existsSync(tempPath)) {
    await fs.promises.copyFile(tempPath, destPath)
    await fs.promises.unlink(tempPath)
  }
}

/**
 * Delete a dress image.
 *
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const deleteDressImage = async (filename: string): Promise<void> => {
  const imagePath = path.join(env.CDN_DRESSES, filename)
  
  if (fs.existsSync(imagePath)) {
    await fs.promises.unlink(imagePath)
  }
}
