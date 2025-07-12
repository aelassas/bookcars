import React, { useState, useEffect } from 'react'
import { TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import MultipleSelect from './MultipleSelect'

interface UserSelectListProps {
  multiple?: boolean
  value?: bookcarsTypes.Option | bookcarsTypes.Option[]
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  onChange?: (values: bookcarsTypes.Option[]) => void
}

const UserSelectList = ({
  multiple,
  value,
  label,
  required,
  variant,
  onChange
}: UserSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [drivers, setDrivers] = useState<bookcarsTypes.Option[]>([])
  const [fetch, setFetch] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Option[]>([])

  useEffect(() => {
    const _value = multiple ? value as bookcarsTypes.Option[] : [value as bookcarsTypes.Option]
    if (value && !bookcarsHelper.arrayEqual(selectedOptions, _value)) {
      setSelectedOptions(_value)
    }
  }, [multiple, value, selectedOptions])

  const getDrivers = (users: bookcarsTypes.User[]): bookcarsTypes.Option[] =>
    users.map((user) => {
      const { _id, fullName, avatar } = user
      return { _id: _id as string, name: fullName, image: avatar }
    })

  const fetchData = async (_page: number, _keyword: string, onFetch?: bookcarsTypes.DataEvent<bookcarsTypes.User>) => {
    try {
      setLoading(true)

      const data = await UserService.getDrivers(_keyword, _page, env.PAGE_SIZE)

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }

      const driverOptionsList = getDrivers(_data.resultData)
      const _drivers = _page === 1 ? driverOptionsList : [...drivers, ...driverOptionsList]

      setDrivers(_drivers)
      setFetch(driverOptionsList.length > 0)

      if (onFetch) {
        onFetch()
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
      options={drivers}
      selectedOptions={selectedOptions}
      required={required || false}
      multiple={multiple}
      type={bookcarsTypes.RecordType.User}
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
          setPage(p)
          setDrivers([])
          fetchData(p, keyword, () => {
            setInit(true)
          })
        }
      }}
      onInputChange={(event) => {
        const _value = (event && event.target && 'value' in event.target && event.target.value as string) || ''

        // if (event.target.type === 'text' && value !== keyword) {
        if (_value !== keyword) {
          setDrivers([])
          setPage(1)
          setKeyword(_value)
          fetchData(1, _value)
        }
      }}
      onClear={() => {
        setDrivers([])
        setPage(1)
        setKeyword('')
        setFetch(true)
        fetchData(1, '')
      }}
    />
  )
}

export default UserSelectList
