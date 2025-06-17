import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/suppliers'
import Search from '@/components/Search'
import SupplierList from '@/components/SupplierList'
import InfoBox from '@/components/InfoBox'
import * as helper from '@/common/helper'

import '@/assets/css/suppliers.css'

const Suppliers = () => {
  const navigate = useNavigate()

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

  const handleSupplierDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const admin = helper.admin(user)

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="suppliers">
          <div className="col-1">
            <div className="col-1-container">
              <Search className="search" onSubmit={handleSearch} />

              {rowCount > -1 && admin && (
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary new-supplier"
                  size="small"
                  onClick={() => navigate('/create-supplier')}
                >
                  {strings.NEW_SUPPLIER}
                </Button>
              )}

              {rowCount > 0 && (
              <InfoBox
                value={`${rowCount} ${rowCount > 1 ? strings.SUPPLIERS : strings.SUPPLIER}`}
                className="supplier-count"
              />
)}
            </div>
          </div>
          <div className="col-2">
            <SupplierList
              user={user}
              keyword={keyword}
              onLoad={handleSupplierListLoad}
              onDelete={handleSupplierDelete}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Suppliers
