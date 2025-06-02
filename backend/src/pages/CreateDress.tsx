import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  TextField,
  FormHelperText,
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as DressService from '@/services/DressService'
import * as helper from '@/common/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import DressTypeList from '@/components/DressTypeList'
import DressSizeList from '@/components/DressSizeList'
import DressStyleList from '@/components/DressStyleList'
import DressMaterialList from '@/components/DressMaterialList'
import { UserContextType, useUserContext } from '@/context/UserContext'

import '@/assets/css/create-dress.css'

const CreateDress = () => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [isSupplier, setIsSupplier] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [image, setImage] = useState('')
  const [name, setName] = useState('')
  const [supplier, setSupplier] = useState('')
  const [locations, setLocations] = useState<bookcarsTypes.Option[]>([])
  const [dailyPrice, setDailyPrice] = useState('')
  const [discountedDailyPrice, setDiscountedDailyPrice] = useState('')
  const [biWeeklyPrice, setBiWeeklyPrice] = useState('')
  const [discountedBiWeeklyPrice, setDiscountedBiWeeklyPrice] = useState('')
  const [weeklyPrice, setWeeklyPrice] = useState('')
  const [discountedWeeklyPrice, setDiscountedWeeklyPrice] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [discountedMonthlyPrice, setDiscountedMonthlyPrice] = useState('')
  const [isDateBasedPrice, setIsDateBasedPrice] = useState(false)
  const [dateBasedPrices, setDateBasedPrices] = useState<bookcarsTypes.DateBasedPrice[]>([])
  const [available, setAvailable] = useState(true)
  const [fullyBooked, setFullyBooked] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)
  const [type, setType] = useState('')
  const [size, setSize] = useState('')
  const [style, setStyle] = useState('')
  const [color, setColor] = useState('')
  const [length, setLength] = useState('')
  const [material, setMaterial] = useState('')
  const [customizable, setCustomizable] = useState(false)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [minimumAge, setMinimumAge] = useState(String(env.MINIMUM_AGE))
  const [minimumAgeValid, setMinimumAgeValid] = useState(true)
  const [formError, setFormError] = useState(false)
  const [deposit, setDeposit] = useState('')

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (image: string) => {
    setLoading(false)
    setImage(image)
    setImageError(false)
    setImageSizeError(false)
  }

  const handleImageValidate = (valid: boolean) => {
    if (!valid) {
      setImageSizeError(true)
    }
  }

  const handleSupplierChange = (values: bookcarsTypes.Option[]) => {
    setSupplier(values.length > 0 ? values[0]._id : '')
  }

  const handleLocationsChange = (values: bookcarsTypes.Option[]) => {
    setLocations(values)
  }

  const handleDailyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDailyPrice(e.target.value)
  }

  const handleDiscountedDailyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountedDailyPrice(e.target.value)
  }

  const handleBiWeeklyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBiWeeklyPrice(e.target.value)
  }

  const handleDiscountedBiWeeklyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountedBiWeeklyPrice(e.target.value)
  }

  const handleWeeklyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWeeklyPrice(e.target.value)
  }

  const handleDiscountedWeeklyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountedWeeklyPrice(e.target.value)
  }

  const handleMonthlyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonthlyPrice(e.target.value)
  }

  const handleDiscountedMonthlyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountedMonthlyPrice(e.target.value)
  }

  const handleIsDateBasedPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDateBasedPrice(e.target.checked)
  }

  const handleDateBasedPricesChange = (dateBasedPrices: bookcarsTypes.DateBasedPrice[]) => {
    setDateBasedPrices(dateBasedPrices)
  }

  const handleAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvailable(e.target.checked)
  }

  const handleFullyBookedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullyBooked(e.target.checked)
  }

  const handleComingSoonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComingSoon(e.target.checked)
  }

  const handleTypeChange = (value: string) => {
    setType(value)
  }

  const handleSizeChange = (value: string) => {
    setSize(value)
  }

  const handleStyleChange = (value: string) => {
    setStyle(value)
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value)
  }

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLength(e.target.value)
  }

  const handleMaterialChange = (value: string) => {
    setMaterial(value)
  }

  const handleCustomizableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomizable(e.target.checked)
  }

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCancellation(e.target.value)
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmendments(e.target.value)
  }

  const handleMinimumAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinimumAge(e.target.value)

    const _minimumAgeValid = validateMinimumAge(e.target.value)
    setMinimumAgeValid(_minimumAgeValid)
    if (!_minimumAgeValid) {
      setFormError(true)
    }
  }

  const validateMinimumAge = (age: string) => {
    const _age = Number.parseInt(age, 10)
    return !Number.isNaN(_age) && _age >= env.MINIMUM_AGE
  }

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeposit(e.target.value)
  }

  const extraToNumber = (extra: string) => (extra === '' ? -1 : Number(extra))

  const getPrice = (price: string) => (price && Number(price)) || null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      setLoading(true)

      const _minimumAgeValid = validateMinimumAge(minimumAge)
      if (!_minimumAgeValid) {
        setFormError(true)
        setImageError(false)
        return
      }

      if (!image) {
        setImageError(true)
        setImageSizeError(false)
        return
      }

      const data: bookcarsTypes.CreateDressPayload = {
        loggedUser: user!._id!,
        name,
        supplier,
        minimumAge: Number.parseInt(minimumAge, 10),
        locations: locations.map((l) => l._id),
        dailyPrice: Number(dailyPrice),
        discountedDailyPrice: getPrice(discountedDailyPrice),
        biWeeklyPrice: getPrice(biWeeklyPrice),
        discountedBiWeeklyPrice: getPrice(discountedBiWeeklyPrice),
        weeklyPrice: getPrice(weeklyPrice),
        discountedWeeklyPrice: getPrice(discountedWeeklyPrice),
        monthlyPrice: getPrice(monthlyPrice),
        discountedMonthlyPrice: getPrice(discountedMonthlyPrice),
        deposit: Number(deposit),
        available,
        fullyBooked,
        comingSoon,
        type: type as bookcarsTypes.DressType,
        size: size as bookcarsTypes.DressSize,

        color,
        length: Number(length),
        material: material as bookcarsTypes.DressMaterial,
        customizable,
        image,
        cancellation: extraToNumber(cancellation),
        amendments: extraToNumber(amendments),
        isDateBasedPrice,
        dateBasedPrices,
        range: '',
        accessories: [],
      }

      const dress = await DressService.create(data)

      if (dress && dress._id) {
        navigate('/dresses')
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = async () => {
    setLoading(true)
    setFormError(false)
    setImageError(false)
    setImageSizeError(false)

    try {
      const currentUser = JSON.parse(localStorage.getItem('bc-user') || '{}')
      if (currentUser) {
        const _isSupplier = helper.supplier(currentUser)
        setIsSupplier(_isSupplier)

        if (_isSupplier) {
          setSupplier(currentUser._id)
        }

        setVisible(true)
      } else {
        setFormError(true)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-dress">
        <Paper className="dress-form dress-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="dress-form-title">{strings.NEW_DRESS}</h1>
          <form onSubmit={handleSubmit}>
            <Avatar
              type={bookcarsTypes.RecordType.Dress}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              onValidate={handleImageValidate}
              color="disabled"
              className="avatar-ctn"
            />

            <div className="info">
              <InfoIcon />
              <span>{strings.RECOMMENDED_IMAGE_SIZE}</span>
            </div>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{commonStrings.NAME}</InputLabel>
              <Input
                id="name"
                type="text"
                required
                onChange={(e) => {
                  setName(e.target.value)
                }}
                autoComplete="off"
              />
            </FormControl>

            {!isSupplier && (
              <FormControl fullWidth margin="dense">
                <SupplierSelectList
                  label={commonStrings.SUPPLIER}
                  required
                  onChange={handleSupplierChange}
                />
              </FormControl>
            )}

            <FormControl fullWidth margin="dense">
              <LocationSelectList
                label={strings.LOCATIONS}
                multiple
                required
                onChange={handleLocationsChange}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DressTypeList
                label={strings.DRESS_TYPE}
                required
                onChange={handleTypeChange}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DressSizeList
                label={strings.DRESS_SIZE}
                required
                onChange={handleSizeChange}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DressStyleList
                label={strings.DRESS_STYLE}
                required
                onChange={handleStyleChange}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DressMaterialList
                label={strings.MATERIAL}
                required
                onChange={handleMaterialChange}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{strings.COLOR}</InputLabel>
              <Input
                id="color"
                type="text"
                required
                onChange={handleColorChange}
                autoComplete="off"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{strings.LENGTH} (cm)</InputLabel>
              <Input
                id="length"
                type="number"
                required
                onChange={handleLengthChange}
                autoComplete="off"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{`${strings.PRICE} (${commonStrings.CURRENCY})`}</InputLabel>
              <Input
                id="price"
                type="number"
                required
                onChange={handleDailyPriceChange}
                autoComplete="off"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{`${strings.DEPOSIT} (${commonStrings.CURRENCY})`}</InputLabel>
              <Input
                id="deposit"
                type="number"
                onChange={handleDepositChange}
                autoComplete="off"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{commonStrings.MINIMUM_AGE}</InputLabel>
              <Input
                id="minimum-age"
                type="number"
                required
                error={!minimumAgeValid}
                onChange={handleMinimumAgeChange}
                autoComplete="off"
                value={minimumAge}
              />
              <FormHelperText error={!minimumAgeValid}>{(!minimumAgeValid && commonStrings.MINIMUM_AGE_NOT_VALID) || ''}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.CANCELLATION} (${commonStrings.CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleCancellationChange}
                variant="standard"
                autoComplete="off"
                value={cancellation}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleAmendmentsChange}
                variant="standard"
                autoComplete="off"
                value={amendments}
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={<Switch checked={customizable} onChange={handleCustomizableChange} color="primary" />}
                label={strings.CUSTOMIZABLE}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={<Switch checked={available} onChange={handleAvailableChange} color="primary" />}
                label={strings.AVAILABLE}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={<Switch checked={fullyBooked} onChange={handleFullyBookedChange} color="primary" />}
                label={strings.FULLY_BOOKED}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={<Switch checked={comingSoon} onChange={handleComingSoonChange} color="primary" />}
                label={strings.COMING_SOON}
                className="checkbox-fcl"
              />
            </FormControl>

            <div className="buttons">
              <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={loading}>
                {commonStrings.CREATE}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={async () => {
                  if (image) {
                    await DressService.deleteTempImage(image)
                  }
                  navigate('/dresses')
                }}
              >
                {commonStrings.CANCEL}
              </Button>
            </div>

            <div className="form-error">
              {imageError && <Error message={commonStrings.IMAGE_REQUIRED} />}
              {imageSizeError && <Error message={strings.IMAGE_SIZE_ERROR} />}
              {formError && <Error message={commonStrings.FORM_ERROR} />}
            </div>
          </form>
        </Paper>
      </div>
      {loading && <Backdrop text={commonStrings.LOADING} />}
    </Layout>
  )
}

export default CreateDress
