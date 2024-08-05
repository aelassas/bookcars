import React, { useEffect, useRef, useState } from 'react'
import { Rating } from '@mui/material'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/car-rating-filter'
import Accordion from './Accordion'

import '../assets/css/car-rating-filter.css'

interface CarRatingFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: number[]) => void
}

const allRatings = bookcarsHelper.getAllRatings()

const CarRatingFilter = ({
  className,
  collapse,
  onChange
}: CarRatingFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<number[]>([])

  const rating0Ref = useRef<HTMLInputElement>(null)
  const rating1Ref = useRef<HTMLInputElement>(null)
  const rating2Ref = useRef<HTMLInputElement>(null)
  const rating3Ref = useRef<HTMLInputElement>(null)
  const rating4Ref = useRef<HTMLInputElement>(null)
  const rating5Ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && rating0Ref.current && rating1Ref.current && rating2Ref.current && rating3Ref.current && rating4Ref.current && rating5Ref.current) {
      rating0Ref.current.checked = true
      rating1Ref.current.checked = true
      rating2Ref.current.checked = true
      rating3Ref.current.checked = true
      rating4Ref.current.checked = true
      rating5Ref.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: number[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allRatings : _values))
    }
  }

  const handleCheckRating0Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(0)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 0),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating0Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating0Change(event)
  }

  const handleCheckRating1Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(1)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 1),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating1Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating1Change(event)
  }

  const handleCheckRating2Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(2)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 2),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating2Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating2Change(event)
  }

  const handleCheckRating3Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(3)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 3),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating3Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating3Change(event)
  }

  const handleCheckRating4Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(4)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 4),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating4Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating4Change(event)
  }

  const handleCheckRating5Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(5)

      if (values.length === allRatings.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === 5),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleRating5Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckRating5Change(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (rating0Ref.current) {
        rating0Ref.current.checked = false
      }
      if (rating1Ref.current) {
        rating1Ref.current.checked = false
      }
      if (rating2Ref.current) {
        rating2Ref.current.checked = false
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = false
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = false
      }
      if (rating5Ref.current) {
        rating5Ref.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (rating0Ref.current) {
        rating0Ref.current.checked = true
      }
      if (rating1Ref.current) {
        rating1Ref.current.checked = true
      }
      if (rating2Ref.current) {
        rating2Ref.current.checked = true
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = true
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = true
      }
      if (rating5Ref.current) {
        rating5Ref.current.checked = true
      }

      setAllChecked(true)
      setValues(allRatings)

      if (onChange) {
        onChange(bookcarsHelper.clone(allRatings))
      }
    }
  }

  return (
    <Accordion title={strings.RATING} collapse={collapse} className={`${className ? `${className} ` : ''}rating-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={rating0Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating0Change} />
          <span onClick={handleRating0Click} role="presentation" className="ratings">
            <Rating value={0} className="rating" readOnly />
          </span>
        </div>
        <div className="filter-element">
          <input ref={rating1Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating1Change} />
          <span onClick={handleRating1Click} role="presentation" className="ratings">
            <Rating value={1} className="rating" readOnly />
          </span>
        </div>
        <div className="filter-element">
          <input ref={rating2Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating2Change} />
          <span onClick={handleRating2Click} role="presentation" className="ratings">
            <Rating value={2} className="rating" readOnly />
          </span>
        </div>
        <div className="filter-element" role="presentation">
          <input ref={rating3Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating3Change} />
          <span onClick={handleRating3Click} role="presentation" className="ratings">
            <Rating value={3} className="rating" readOnly />
          </span>
        </div>
        <div className="filter-element" role="presentation">
          <input ref={rating4Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating4Change} />
          <span onClick={handleRating4Click} role="presentation" className="ratings">
            <Rating value={4} className="rating" readOnly />
          </span>
        </div>
        <div className="filter-element" role="presentation">
          <input ref={rating5Ref} type="checkbox" className="rating-checkbox" onChange={handleCheckRating5Change} />
          <span onClick={handleRating5Click} role="presentation" className="ratings">
            <Rating value={5} className="rating" readOnly />
          </span>
        </div>
      </div>
      <div className="filter-actions">
        <span
          onClick={handleUncheckAllChange}
          className="uncheckall"
          role="button"
          tabIndex={0}
        >
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </span>
      </div>
    </Accordion>
  )
}

export default CarRatingFilter
