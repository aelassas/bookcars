import React, { useState, useEffect } from 'react'
import { TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/common/helper'
import MultipleSelect from './MultipleSelect'

interface LocationSelectListProps {
  value?: bookcarsTypes.Option | bookcarsTypes.Option[]
  multiple?: boolean
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  onChange?: (values: bookcarsTypes.Option[]) => void
}

const LocationSelectList = ({
  value,
  multiple,
  label,
  required,
  variant,
  onChange
}: LocationSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Location[]>([])
  const [fetch, setFetch] = useState(true)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Location[]>([])

  useEffect(() => {
    const _value = multiple ? value as bookcarsTypes.Location[] : [value as bookcarsTypes.Location]

    if (value && !bookcarsHelper.arrayEqual(selectedOptions, _value)) {
      setSelectedOptions(_value)
    }
  }, [value, multiple, selectedOptions])

  const fetchData = async (_page: number, _keyword: string, onFetch?: bookcarsTypes.DataEvent<bookcarsTypes.Location>) => {
    try {
      if (fetch || _page === 1) {
        setLoading(true)

        const data = await LocationService.getLocations(_keyword, _page, env.PAGE_SIZE)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          return
        }
        const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
        const _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]

        setRows(_rows)
        setFetch(_data.resultData.length > 0)

        if (onFetch) {
          onFetch({ rows: _data.resultData, rowCount: totalRecords })
        }
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
      multiple={multiple}
      type={bookcarsTypes.RecordType.Location}
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

export default LocationSelectList
