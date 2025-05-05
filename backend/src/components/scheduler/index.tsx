import React, { forwardRef } from 'react'
import SchedulerComponent from './SchedulerComponent'
import { SchedulerProps, SchedulerRef } from './types'
import { StoreProvider } from './store/provider'

const Scheduler = forwardRef<SchedulerRef, Partial<SchedulerProps>>((props, ref) => (
  <StoreProvider initial={props}>
    <SchedulerComponent ref={ref} />
  </StoreProvider>
  ))

export { Scheduler }
