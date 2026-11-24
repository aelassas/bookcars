import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, MenuItem, Select, TextField, Typography } from '@mui/material'
import Layout from '@/components/Layout'
import * as KycService from '@/services/KycService'
import * as helper from '@/utils/helper'

const Kyc = () => {
  const [documentType, setDocumentType] = useState<'cnic' | 'passport' | 'driving_license'>('cnic')
  const [documentNumber, setDocumentNumber] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [documentFront, setDocumentFront] = useState<File>()
  const [documentBack, setDocumentBack] = useState<File>()
  const [selfie, setSelfie] = useState<File>()

  const load = async () => {
    try {
      const kyc = await KycService.getMine()
      if (kyc) {
        setDocumentType(kyc.documentType)
        setDocumentNumber(kyc.documentNumber)
        setStatus(kyc.status)
      }
    } catch (error) {
      helper.error(error)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    try {
      const uploads = await KycService.uploadDocuments({ documentFront, documentBack, selfie })
      const kyc = await KycService.submit({ documentType, documentNumber, ...uploads })
      setStatus(kyc.status)
      setMessage('KYC submitted for review.')
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout strict>
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}><CardContent>
        <Typography variant="h4">CNIC / identity verification</Typography>
        {status && <Alert sx={{ my: 2 }} severity={status === 'approved' ? 'success' : status === 'rejected' || status === 'suspended' ? 'error' : 'warning'}>KYC status: {status}</Alert>}
        <Select fullWidth value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)}>
          <MenuItem value="cnic">CNIC</MenuItem>
          <MenuItem value="passport">Passport</MenuItem>
          <MenuItem value="driving_license">Driving license</MenuItem>
        </Select>
        <TextField fullWidth sx={{ mt: 2 }} label={documentType === 'cnic' ? 'CNIC (XXXXX-XXXXXXX-X)' : 'Document number'} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} />
        {documentType === 'cnic' && (
          <>
            <TextField fullWidth sx={{ mt: 2 }} type="file" label="CNIC front" InputLabelProps={{ shrink: true }} inputProps={{ accept: 'image/jpeg,image/png,image/webp' }} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDocumentFront(event.target.files?.[0])} />
            <TextField fullWidth sx={{ mt: 2 }} type="file" label="CNIC back" InputLabelProps={{ shrink: true }} inputProps={{ accept: 'image/jpeg,image/png,image/webp' }} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDocumentBack(event.target.files?.[0])} />
            <TextField fullWidth sx={{ mt: 2 }} type="file" label="Selfie" InputLabelProps={{ shrink: true }} inputProps={{ accept: 'image/jpeg,image/png,image/webp' }} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSelfie(event.target.files?.[0])} />
          </>
        )}
        <Button sx={{ mt: 2 }} variant="contained" className="btn-primary" onClick={submit}>Submit for review</Button>
        {message && <Alert sx={{ mt: 2 }} severity="info">{message}</Alert>}
      </CardContent></Card>
    </Layout>
  )
}

export default Kyc
