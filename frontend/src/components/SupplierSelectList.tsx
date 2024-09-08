import React, { useState, useEffect } from 'react'
import { TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/common/helper'
import MultipleSelect from './MultipleSelect'

interface SupplierSelectListProps {
  value?: bookcarsTypes.Option | bookcarsTypes.Option[]
  multiple?: boolean
  label?: string
  required?: boolean
  readOnly?: boolean
  variant?: TextFieldVariants
  onChange?: (values: bookcarsTypes.Option[]) => void
}

const SupplierSelectList = ({
  value,
  multiple,
  label,
  required,
  readOnly,
  variant,
  onChange
}: SupplierSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Option[]>([])
  const [fetch, setFetch] = useState(true)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Option[]>([])

  useEffect(() => {
    const _value = multiple ? value : [value]
    if (value && !bookcarsHelper.arrayEqual(selectedOptions, _value)) {
      setSelectedOptions(_value as bookcarsTypes.Option[])
    }
  }, [value, multiple, selectedOptions])

  const getSuppliers = (suppliers: bookcarsTypes.User[]): bookcarsTypes.Option[] =>
    suppliers.map((supplier) => {
      const { _id, fullName, avatar } = supplier
      return { _id: _id as string, name: fullName, image: avatar }
    })

  const fetchData = async (_page: number, _keyword: string, onFetch?: (data: { rows: any[], rowCount: number }) => void) => {
    try {
      setLoading(true)
      const data = await SupplierService.getSuppliers(_keyword, _page, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
      const _rows = _page === 1 ? getSuppliers(_data.resultData) : [...rows, ...getSuppliers(_data.resultData)]

      setRows(_rows)
      setFetch(_data.resultData.length > 0)

      if (onFetch) {
        onFetch({ rows: _data.resultData, rowCount: totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (values: bookcarsTypes.Option[]) => {
    if (onChange) {
      onChange(values)
    }
  }

  return (
    <MultipleSelect
      loading={loading}
      label={label || ''}
      callbackFromMultipleSelect={handleChange}
      options={rows}
      selectedOptions={selectedOptions}
      required={required || false}
      readOnly={readOnly}
      multiple={multiple}
      type={bookcarsTypes.RecordType.Supplier}
      variant={variant || 'standard'}
      ListboxProps={{
        onScroll: (event) => {
          const listboxNode = event.currentTarget
          if (fetch && !loading && listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - env.PAGE_OFFSET) {
            const p = page + 1
            setPage(p)
            fetchData(p, keyword)
          }
        },
      }}
      onFocus={() => {
        if (!init) {
          const p = 1
          setRows([])
          setPage(p)
          fetchData(p, keyword, () => {
            setInit(true)
          })
        }
      }}
      onInputChange={(event) => {
        const _value = (event && event.target && 'value' in event.target && event.target.value as string) || ''

        // if (event.target.type === 'text' && value !== keyword) {
        if (_value !== keyword) {
          setRows([])
          setPage(1)
          setKeyword(_value)
          fetchData(1, _value)
        }
      }}
      onClear={() => {
        setRows([])
        setPage(1)
        setKeyword('')
        setFetch(true)
        fetchData(1, '')
      }}
    />
  )
}

export default SupplierSelectList
