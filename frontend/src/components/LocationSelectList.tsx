
import React, { useState, useEffect, useRef } from 'react'
import { TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import MultipleSelect from './MultipleSelect'

interface LocationSelectListProps {
  value?: bookcarsTypes.Location | bookcarsTypes.Location[]
  multiple?: boolean
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  hidePopupIcon?: boolean
  customOpen?: boolean
  readOnly?: boolean
  init?: boolean
  onChange?: (values: bookcarsTypes.Option[]) => void
}

const LocationSelectList = ({
  value,
  multiple,
  label,
  required,
  variant,
  hidePopupIcon,
  customOpen,
  readOnly,
  init: listInit,
  onChange
}: LocationSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Location[]>([])
  const [fetch, setFetch] = useState(true)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Location[]>([])

  const searchIdRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keywordRef = useRef('')
  const activeRequestsRef = useRef(0)

  useEffect(() => {
    const selectedValues = multiple
      ? value as bookcarsTypes.Location[]
      : [value as bookcarsTypes.Location]

    if (value && !bookcarsHelper.arrayEqual(selectedOptions, selectedValues)) {
      setSelectedOptions(selectedValues)
    }
  }, [value, multiple, selectedOptions])

  useEffect(() => {
    return () => {
      searchIdRef.current += 1

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const fetchData = async (
    requestedPage: number,
    requestedKeyword: string,
    requestedSearchId: number,
    onFetch?: bookcarsTypes.DataEvent<bookcarsTypes.Location>
  ) => {
    if (requestedPage !== 1 && !fetch) {
      return
    }

    activeRequestsRef.current += 1
    setLoading(true)

    try {
      const data = await LocationService.getLocations(
        requestedKeyword,
        requestedPage,
        env.PAGE_SIZE
      )

      // Ignore responses belonging to an older search.
      if (
        requestedSearchId !== searchIdRef.current ||
        requestedKeyword !== keywordRef.current
      ) {
        return
      }

      const response = data?.[0]
      const resultData: bookcarsTypes.Location[] =
        response?.resultData ?? []

      const pageInfo = response?.pageInfo
      const totalRecords =
        Array.isArray(pageInfo) && pageInfo.length > 0
          ? pageInfo[0].totalRecords
          : 0

      setRows(currentRows => {
        if (requestedPage === 1) {
          return resultData
        }

        // Avoid adding duplicate locations when requests overlap.
        const existingIds = new Set(
          currentRows.map(location => location._id)
        )

        return [
          ...currentRows,
          ...resultData.filter(location => !existingIds.has(location._id))
        ]
      })

      setFetch(resultData.length === env.PAGE_SIZE)

      if (onFetch) {
        onFetch({
          rows: resultData,
          rowCount: totalRecords
        })
      }
    } catch (err) {
      if (
        requestedSearchId === searchIdRef.current &&
        requestedKeyword === keywordRef.current
      ) {
        helper.error(err)
      }
    } finally {
      activeRequestsRef.current -= 1

      if (activeRequestsRef.current === 0) {
        setLoading(false)
      }
    }
  }

  const scheduleSearch = (nextKeyword: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Invalidate requests for the previous keyword immediately.
    searchIdRef.current += 1
    const searchId = searchIdRef.current

    keywordRef.current = nextKeyword

    setKeyword(nextKeyword)
    setRows([])
    setPage(1)
    setFetch(true)
    setLoading(true)

    debounceTimerRef.current = setTimeout(() => {
      fetchData(1, nextKeyword, searchId)
    }, 300)
  }

  const handleChange = (values: bookcarsTypes.Option[]) => {
    onChange?.(values)
  }

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    searchIdRef.current += 1
    const searchId = searchIdRef.current

    keywordRef.current = ''

    setRows([])
    setPage(1)
    setKeyword('')
    setFetch(true)

    fetchData(1, '', searchId)
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
      hidePopupIcon={hidePopupIcon}
      customOpen={customOpen}
      readOnly={readOnly}
      ListboxProps={{
        onScroll: event => {
          const listboxNode = event.currentTarget

          if (
            fetch &&
            !loading &&
            listboxNode.scrollTop + listboxNode.clientHeight >=
            listboxNode.scrollHeight - env.PAGE_OFFSET
          ) {
            const nextPage = page + 1
            setPage(nextPage)

            fetchData(nextPage, keyword, searchIdRef.current)
          }
        }
      }}
      onFocus={() => {
        if (!init && listInit) {
          setRows([])
          setPage(1)

          fetchData(1, keywordRef.current, searchIdRef.current, () => {
            setInit(true)
          })
        }
      }}
      onInputChange={(event, val) => {
        const inputValue =
          (event &&
            event.target &&
            'value' in event.target &&
            typeof event.target.value === 'string'
            ? event.target.value
            : '') || val || ''

        if (inputValue !== keywordRef.current) {
          scheduleSearch(inputValue)
        }
      }}
      onClear={handleClear}
    />
  )
}

export default LocationSelectList
