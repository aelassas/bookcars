import { useState, useEffect } from 'react'
import { TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as DressService from '@/services/DressService'
import * as helper from '@/common/helper'
import MultipleSelect from './MultipleSelect'

interface DressSelectListProps {
  value?: bookcarsTypes.Dress | bookcarsTypes.Dress[]
  multiple?: boolean
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  supplier?: string
  onChange?: (values: bookcarsTypes.Option[]) => void
}

const DressSelectList = ({
  value: dressValue,
  multiple,
  label,
  required,
  variant,
  supplier,
  onChange
}: DressSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dresses, setDresses] = useState<bookcarsTypes.Dress[]>([])
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Option[]>([])

  const fetchData = async (p: number, _s: string, d?: () => void) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetDressesPayload = {
        suppliers: supplier ? [supplier] : undefined
      }

      // Note: keyword search is handled by the API endpoint, not in the payload

      const data = await DressService.getDressesWithFilters(payload, p, env.PAGE_SIZE)
      const _dresses: bookcarsTypes.Dress[] = data && data.length > 0 ? data : []
      const _rows = page === 1 ? _dresses : [...dresses, ..._dresses]

      setDresses(_rows)
      setFetch(data.length > 0)
      if (d) d()
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

  useEffect(() => {
    if (dressValue && !Array.isArray(dressValue)) {
      setSelectedOptions([
        {
          _id: dressValue._id || '',
          name: dressValue.name || '',
          image: dressValue.image
        }
      ])
    } else if (dressValue && Array.isArray(dressValue)) {
      setSelectedOptions(
        dressValue.map((dress) => ({
          _id: dress._id || '',
          name: dress.name || '',
          image: dress.image
        }))
      )
    } else {
      setSelectedOptions([])
    }
  }, [dressValue])

  const rows = dresses.map((dress) => ({
    _id: dress._id || '',
    name: dress.name || '',
    image: dress.image
  }))

  return (
    <MultipleSelect
      loading={loading}
      label={label || ''}
      callbackFromMultipleSelect={handleChange}
      options={rows}
      selectedOptions={selectedOptions}
      required={required || false}
      multiple={multiple}
      type={bookcarsTypes.RecordType.Dress}
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
          setDresses([])
          fetchData(p, keyword, () => {
            setInit(true)
          })
        }
      }}
      onInputChange={(event) => {
        const value = (event && event.target && 'value' in event.target && event.target.value as string) || ''

        // if (event.type === 'click') {
        //   setKeyword('')
        //   setPage(1)
        //   setDresses([])
        //   fetchData(1, '')
        // } else 
        if (value !== keyword) {
          setKeyword(value)
          setPage(1)
          setDresses([])
          fetchData(1, value)
        }
      }}
      onClear={() => {
        setKeyword('')
        setPage(1)
        setDresses([])
        fetchData(1, '')
      }}
    />
  )
}

export default DressSelectList
