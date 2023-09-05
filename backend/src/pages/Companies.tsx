import React, { useState } from 'react'
import Master from '../components/Master'
import { strings } from '../lang/companies'
import Search from '../components/Search'
import SupplierList from '../components/SupplierList'
import InfoBox from '../components/InfoBox'
import { Button } from '@mui/material'
import * as Helper from '../common/Helper'
import * as bookcarsTypes from 'bookcars-types'

import '../assets/css/companies.css'

const Companies = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [keyword, setKeyword] = useState('')
  const [reload, setReload] = useState(false)
  const [rowCount, setRowCount] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
    setReload(newKeyword === keyword)
  }

  const handleSupplierListLoad: bookcarsTypes.DataEvent<bookcarsTypes.User> = (data) => {
    if (data) {
      setReload(false)
      setRowCount(data.rowCount)
    }
  }

  const handleCompanyDelete = (rowCount: number) => {
    setRowCount(rowCount)
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    setUser(user)
  }

  const admin = Helper.admin(user)

  return (
    <Master onLoad={onLoad} strict>
      {user && (
        <div className="companies">
          <div className="col-1">
            <div className="col-1-container">
              <Search className="search" onSubmit={handleSearch} />

              {rowCount > -1 && admin && (
                <Button type="submit" variant="contained" className="btn-primary new-company" size="small" href="/create-supplier">
                  {strings.NEW_COMPANY}
                </Button>
              )}

              {rowCount > 0 && <InfoBox value={`${rowCount} ${rowCount > 1 ? strings.COMPANIES : strings.COMPANY}`} className="company-count" />}
            </div>
          </div>
          <div className="col-2">
            <SupplierList
              user={user}
              keyword={keyword}
              reload={reload}
              onLoad={handleSupplierListLoad}
              onDelete={handleCompanyDelete}
            />
          </div>
        </div>
      )}
    </Master>
  )
}

export default Companies
