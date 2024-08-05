import React, { ComponentPropsWithoutRef } from 'react'
import { Input } from '@mui/material'

const PositionInput = (props: ComponentPropsWithoutRef<typeof Input>) => (
  <Input
    type="text"
    inputProps={{ pattern: '(-)?[0-9]+(\\.[0-9]+)?' }}
    {...props}
  />
)

export default PositionInput
