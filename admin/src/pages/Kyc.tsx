import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, MenuItem, Select, TextField, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as KycService from '@/services/KycService'
import * as helper from '@/utils/helper'

const Kyc = () => {
  const [rows, setRows] = useState<bookcarsTypes.Kyc[]>([])
  const [reason, setReason] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      setRows(await KycService.getPending())
    } catch (error) {
      helper.error(error)
    }
  }

  useEffect(() => { load() }, [])

  const review = async (row: bookcarsTypes.Kyc, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      await KycService.review(row._id!, status, reason[row._id!] )
      await load()
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout admin strict>
      <Typography variant="h4">CNIC & KYC review</Typography>
      {rows.length === 0 && <Alert severity="info">No pending KYC submissions.</Alert>}
      {rows.map((row) => (
        <Card key={row._id} sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">{row.documentType.toUpperCase()} — {row.documentNumber}</Typography>
            <Typography>Status: {row.status}</Typography>
            <TextField
              fullWidth
              label="Rejection reason"
              value={reason[row._id!] || ''}
              onChange={(event) => setReason((current) => ({ ...current, [row._id!]: event.target.value }))}
              sx={{ my: 1 }}
            />
            <Button variant="contained" className="btn-primary" onClick={() => review(row, 'approved')}>Approve</Button>
            <Button variant="outlined" color="error" sx={{ ml: 1 }} onClick={() => review(row, 'rejected')}>Reject</Button>
            <Button variant="outlined" color="warning" sx={{ ml: 1 }} onClick={() => review(row, 'suspended')}>Suspend</Button>
          </CardContent>
        </Card>
      ))}
    </Layout>
  )
}

export default Kyc
