import React, { useState } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'
import Master from '../components/Master'
import { strings } from '../lang/companies'
import Search from '../components/Search'
import SupplierList from '../components/SupplierList'
import InfoBox from '../components/InfoBox'
import * as helper from '../common/helper'

import '../assets/css/companies.css'

const Companies = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleSupplierListLoad: bookcarsTypes.DataEvent<bookcarsTypes.User> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCompanyDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const admin = helper.admin(user)

  return (
    <Master onLoad={onLoad} strict>
      {user && (
        <div className="companies">
          <div className="col-1">
            <div className="col-1-container">
              <Search className="search" onSubmit={handleSearch} />

              {rowCount > -1 && admin && (
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary new-company"
                  size="small"
                  href="/create-supplier"
                >
                  {strings.NEW_COMPANY}
                </Button>
              )}

              {rowCount > 0 && (
              <InfoBox
                value={`${rowCount} ${rowCount > 1 ? strings.COMPANIES : strings.COMPANY}`}
                className="company-count"
              />
)}
            </div>
          </div>
          <div className="col-2">
            <SupplierList
              user={user}
              keyword={keyword}
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
