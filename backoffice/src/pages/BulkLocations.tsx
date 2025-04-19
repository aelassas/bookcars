import React, { useState, useRef } from 'react'
import {
  Button,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/common/helper'
import Backdrop from '@/components/SimpleBackdrop'

import '@/assets/css/bulk-locations.css'

interface UploadResult {
  successCount: number
  errors: string[]
}

const BulkLocations = () => {
  const [visible, setVisible] = useState(false)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [locationData, setLocationData] = useState<bookcarsTypes.UpsertLocationPayload[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const file = e.target.files[0]
    setFileName(file.name)
    setError(null)
    setResult(null)
    setLocationData([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string)
        
        if (!Array.isArray(jsonData)) {
          setError('Invalid format: JSON must be an array of locations')
          return
        }

        // Validate structure of each location
        for (const location of jsonData) {
          if (!location.country || !location.names || !Array.isArray(location.names)) {
            setError('Invalid location data: Each location must have country and names array')
            return
          }
          
          // Ensure names has entries for each language
          if (!location.names.every((name: any) => 
            name.language && name.name && 
            ['en', 'fr', 'es'].includes(name.language)
          )) {
            setError('Invalid location names: Each name must have language and name properties')
            return
          }
        }

        setLocationData(jsonData)
      } catch (err) {
        setError('Invalid JSON format')
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  const resetForm = () => {
    setFileName('')
    setLocationData([])
    setError(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (locationData.length === 0) {
      setError('No location data to upload')
      return
    }

    try {
      setUploading(true)
      const response = await LocationService.bulkCreate(locationData)
      
      if (response.status === 200) {
        setResult({
          successCount: response.successCount,
          errors: response.errors
        })
        resetForm()
      } else {
        setError('Failed to upload locations')
      }
      setUploading(false)
    } catch (err) {
      setUploading(false)
      setError(helper.getErrorMessage(err))
    }
  }

  const onLoad = () => {
    setLoading(true)
    setVisible(true)
    setLoading(false)
  }

  return (
    <Layout onLoad={onLoad} strict admin>
      <div className="bulk-locations">
        <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="location-form-title">{commonStrings.BULK_LOCATIONS}</h1>
          <form onSubmit={handleSubmit}>
            <div className="file-upload-container">
              <Typography variant="body1" className="upload-instructions">
                Upload a JSON file containing multiple locations. Each location should include country, names in different languages, and optional coordinates.
              </Typography>

              <div className="upload-box">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="location-file"
                  accept=".json"
                  onChange={handleFileSelect}
                  hidden
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-button"
                >
                  {commonStrings.CHOOSE_FILE}
                </Button>
                <span className="file-name">{fileName || commonStrings.NO_FILE_SELECTED}</span>
              </div>
            </div>

            {error && (
              <Alert severity="error" className="upload-alert">
                <AlertTitle>{commonStrings.ERROR}</AlertTitle>
                {error}
              </Alert>
            )}

            {locationData.length > 0 && (
              <Alert severity="info" className="upload-alert">
                <AlertTitle>{commonStrings.READY_TO_UPLOAD}</AlertTitle>
                {`${locationData.length} ${locationData.length === 1 ? 'location' : 'locations'} ready to be uploaded.`}
              </Alert>
            )}

            {result && (
              <Alert severity={result.errors.length > 0 ? 'warning' : 'success'} className="upload-alert">
                <AlertTitle>{result.errors.length > 0 ? commonStrings.PARTIAL_SUCCESS : commonStrings.SUCCESS}</AlertTitle>
                <p>{`Successfully uploaded ${result.successCount} ${result.successCount === 1 ? 'location' : 'locations'}.`}</p>
                {result.errors.length > 0 && (
                  <div>
                    <p>{`Failed to upload ${result.errors.length} ${result.errors.length === 1 ? 'location' : 'locations'}:`}</p>
                    <ul>
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Alert>
            )}

            <div className="buttons">
              <Button 
                type="submit" 
                variant="contained" 
                className="btn-primary btn-margin-bottom" 
                size="small" 
                disabled={uploading || locationData.length === 0}
              >
                {uploading ? <CircularProgress size={24} color="inherit" /> : commonStrings.UPLOAD}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={() => {
                  window.location.href = '/locations'
                }}
              >
                {commonStrings.CANCEL}
              </Button>
            </div>
          </form>
        </Paper>
      </div>

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default BulkLocations

/**
 * Extract an error message from various error types
 * @param err The error to process
 * @returns A user-friendly error message string
 */
export function getErrorMessage(err: unknown): string {
  if (!err) {
    return 'An unknown error occurred'
  }
  
  if (typeof err === 'string') {
    return err
  }
  
  if (err instanceof Error) {
    return err.message
  }
  
  if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message
  }
  
  if (typeof err === 'object' && 'error' in err && typeof (err as any).error === 'string') {
    return (err as any).error
  }

  return 'An unexpected error occurred'
}