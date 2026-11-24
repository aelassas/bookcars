import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as BookingService from '@/services/BookingService'
import * as helper from '@/utils/helper'

const ManualPayments = () => {
  const [rows, setRows] = useState<bookcarsTypes.Booking[]>([])
  const [message, setMessage] = useState('')

  const load = async () => {
    try {
      setRows(await BookingService.getPendingManualPayments())
    } catch (error) {
      helper.error(error)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const review = async (row: bookcarsTypes.Booking, status: 'verified' | 'rejected') => {
    try {
      await BookingService.reviewManualPayment(row._id!, status)
      setMessage(`Payment ${status}.`)
      await load()
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout admin strict>
      <Typography variant="h4">JazzCash / Easypaisa verification</Typography>
      {message && <Alert sx={{ my: 2 }} severity="info">{message}</Alert>}
      {rows.length === 0 && <Alert severity="info">No manual payments await verification.</Alert>}
      {rows.map((row) => (
        <Card key={row._id} sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">{row.paymentMethod} — {row.paymentReference}</Typography>
            <Typography>Amount: PKR {row.price?.toLocaleString()}</Typography>
            {row.paymentProof && <Typography>Proof: {row.paymentProof}</Typography>}
            <Button variant="contained" className="btn-primary" onClick={() => review(row, 'verified')}>Verify payment</Button>
            <Button variant="outlined" color="error" sx={{ ml: 1 }} onClick={() => review(row, 'rejected')}>Reject payment</Button>
          </CardContent>
        </Card>
      ))}
    </Layout>
  )
}

export default ManualPayments
