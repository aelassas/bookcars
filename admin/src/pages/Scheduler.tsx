import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import VehicleScheduler from '@/components/VehicleScheduler'
import Layout from '@/components/Layout'

import '@/assets/css/scheduler.css'

const Scheduler = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = _admin ? bookcarsHelper.flattenSuppliers(_allSuppliers) : [_user._id ?? '']
      setSuppliers(_suppliers)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && suppliers && (
        <div className="scheduler">
          <VehicleScheduler
            suppliers={suppliers}
            statuses={statuses}
            filter={filter!}
            language={user.language!}
          />
        </div>
      )}
    </Layout>
  )
}

export default Scheduler
