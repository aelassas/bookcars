import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { Save as SaveIcon } from '@mui/icons-material'
import Layout from '../components/Layout'
import * as DressService from '../services/DressService'
import * as LocationService from '../services/LocationService'
import * as helper from '../common/helper'
import { strings } from '../lang/dresses'
import { strings as commonStrings } from '../lang/common'
import { DressType, DressSize, DressStyle, DressMaterial, Location } from ':bookcars-types'
import Avatar from '../components/Avatar'

const UpdateDress: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dress, setDress] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    size: '',
    style: '',
    color: '',
    material: '',
    price: 0,
    deposit: 0,
    available: true,
    locations: [] as string[],
    minimumAge: 18,
    cancellation: false,
    amendments: false,
    customizable: false
  })
  const [locations, setLocations] = useState<Location[]>([])
  const [imageChanged, setImageChanged] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('dr')
    
    if (!id) {
      navigate('/dresses')
      return
    }

    const currentUser = helper.getUser()
    setUser(currentUser)

    const fetchData = async () => {
      try {
        // Fetch dress data
        const dressResult = await DressService.getDress(id)
        const dressData = dressResult.data
        setDress(dressData)
        
        // Fetch locations
        const locationsResult = await LocationService.getLocations()
        setLocations(locationsResult.data)
        
        // Set form data
        setFormData({
          name: dressData.name || '',
          type: dressData.type || '',
          size: dressData.size || '',
          style: dressData.style || '',
          color: dressData.color || '',
          material: dressData.material || '',
          price: dressData.price || 0,
          deposit: dressData.deposit || 0,
          available: dressData.available !== undefined ? dressData.available : true,
          locations: dressData.locations ? dressData.locations.map((loc: any) => 
            typeof loc === 'object' ? loc._id : loc) : [],
          minimumAge: dressData.minimumAge || 18,
          cancellation: dressData.cancellation || false,
          amendments: dressData.amendments || false,
          customizable: dressData.customizable || false
        })
        
        setImage(dressData.image || null)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        navigate('/dresses')
      }
    }

    fetchData()
  }, [location.search, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name as string]: value
    })
    
    // Clear validation error when field is edited
    if (name && validationErrors[name as string]) {
      setValidationErrors({
        ...validationErrors,
        [name]: false
      })
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData({
      ...formData,
      [name]: checked
    })
  }

  const handleLocationChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setFormData({
      ...formData,
      locations: e.target.value as string[]
    })
  }

  const handleImageChange = (image: string) => {
    setImage(image)
    setImageChanged(true)
    setImageError(false)
  }

  const validateForm = () => {
    const errors: Record<string, boolean> = {}
    let isValid = true

    if (!formData.name) {
      errors.name = true
      isValid = false
    }
    
    if (!formData.type) {
      errors.type = true
      isValid = false
    }
    
    if (!formData.size) {
      errors.size = true
      isValid = false
    }
    
    if (!formData.style) {
      errors.style = true
      isValid = false
    }
    
    if (!formData.color) {
      errors.color = true
      isValid = false
    }
    
    if (formData.price <= 0) {
      errors.price = true
      isValid = false
    }
    
    if (formData.deposit < 0) {
      errors.deposit = true
      isValid = false
    }
    
    if (!image) {
      setImageError(true)
      isValid = false
    }
    
    setValidationErrors(errors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        _id: dress._id,
        image: imageChanged ? image : undefined
      }
      
      await DressService.updateDress(dress._id, updateData)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/dress?dr=${dress._id}`)
      }, 1000)
    } catch (error) {
      console.error('Error updating dress:', error)
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Layout><div className="progress-container"><CircularProgress /></div></Layout>
  }

  const isAdmin = helper.admin(user)
  const canEdit = isAdmin || (user && dress && dress.supplier && user._id === dress.supplier._id)
  
  if (!canEdit) {
    navigate('/dresses')
    return null
  }

  return (
    <Layout>
      <Container maxWidth="md">
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {strings.UPDATE_DRESS}
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', maxWidth: 300 }}>
                  <Avatar
                    type="dress"
                    mode="update"
                    record={dress}
                    size="large"
                    readonly={false}
                    onChange={handleImageChange}
                    color="primary"
                    className="avatar-ctn"
                  />
                  {imageError && (
                    <Typography color="error" variant="caption" display="block" gutterBottom>
                      {commonStrings.IMAGE_REQUIRED}
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <TextField
                      name="name"
                      label={commonStrings.NAME}
                      value={formData.name}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={validationErrors.name}
                      helperText={validationErrors.name ? commonStrings.REQUIRED_FIELD : ''}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth required error={validationErrors.type}>
                      <InputLabel>{strings.DRESS_TYPE}</InputLabel>
                      <Select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        label={strings.DRESS_TYPE}
                      >
                        <MenuItem value={DressType.Wedding}>{strings.WEDDING}</MenuItem>
                        <MenuItem value={DressType.Evening}>{strings.EVENING}</MenuItem>
                        <MenuItem value={DressType.Cocktail}>{strings.COCKTAIL}</MenuItem>
                        <MenuItem value={DressType.Prom}>{strings.PROM}</MenuItem>
                        <MenuItem value={DressType.Other}>{strings.OTHER}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth required error={validationErrors.size}>
                      <InputLabel>{strings.DRESS_SIZE}</InputLabel>
                      <Select
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        label={strings.DRESS_SIZE}
                      >
                        <MenuItem value={DressSize.XS}>{strings.SIZE_XS}</MenuItem>
                        <MenuItem value={DressSize.S}>{strings.SIZE_S}</MenuItem>
                        <MenuItem value={DressSize.M}>{strings.SIZE_M}</MenuItem>
                        <MenuItem value={DressSize.L}>{strings.SIZE_L}</MenuItem>
                        <MenuItem value={DressSize.XL}>{strings.SIZE_XL}</MenuItem>
                        <MenuItem value={DressSize.XXL}>{strings.SIZE_XXL}</MenuItem>
                        <MenuItem value={DressSize.Custom}>{strings.SIZE_CUSTOM}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth required error={validationErrors.style}>
                      <InputLabel>{strings.DRESS_STYLE}</InputLabel>
                      <Select
                        name="style"
                        value={formData.style}
                        onChange={handleInputChange}
                        label={strings.DRESS_STYLE}
                      >
                        <MenuItem value={DressStyle.Traditional}>{strings.STYLE_TRADITIONAL}</MenuItem>
                        <MenuItem value={DressStyle.Modern}>{strings.STYLE_MODERN}</MenuItem>
                        <MenuItem value={DressStyle.Vintage}>{strings.STYLE_VINTAGE}</MenuItem>
                        <MenuItem value={DressStyle.Designer}>{strings.STYLE_DESIGNER}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{strings.MATERIAL}</InputLabel>
                      <Select
                        name="material"
                        value={formData.material}
                        onChange={handleInputChange}
                        label={strings.MATERIAL}
                      >
                        <MenuItem value=""><em>{commonStrings.NONE}</em></MenuItem>
                        <MenuItem value={DressMaterial.Silk}>{strings.SILK}</MenuItem>
                        <MenuItem value={DressMaterial.Cotton}>{strings.COTTON}</MenuItem>
                        <MenuItem value={DressMaterial.Lace}>{strings.LACE}</MenuItem>
                        <MenuItem value={DressMaterial.Satin}>{strings.SATIN}</MenuItem>
                        <MenuItem value={DressMaterial.Chiffon}>{strings.CHIFFON}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      name="color"
                      label={strings.COLOR}
                      value={formData.color}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={validationErrors.color}
                      helperText={validationErrors.color ? commonStrings.REQUIRED_FIELD : ''}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      name="price"
                      label={strings.PRICE}
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={validationErrors.price}
                      helperText={validationErrors.price ? commonStrings.REQUIRED_FIELD : ''}
                      InputProps={{
                        startAdornment: <span>$</span>,
                      }}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      name="deposit"
                      label={strings.DEPOSIT}
                      type="number"
                      value={formData.deposit}
                      onChange={handleInputChange}
                      fullWidth
                      error={validationErrors.deposit}
                      helperText={validationErrors.deposit ? commonStrings.REQUIRED_FIELD : ''}
                      InputProps={{
                        startAdornment: <span>$</span>,
                      }}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      name="minimumAge"
                      label={strings.MINIMUM_AGE}
                      type="number"
                      value={formData.minimumAge}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>

                  <Grid xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>{strings.LOCATIONS}</InputLabel>
                      <Select
                        multiple
                        name="locations"
                        value={formData.locations}
                        onChange={handleLocationChange}
                        label={strings.LOCATIONS}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => {
                              const locationName = locations.find(loc => loc._id === value)?.name || value
                              return (
                                <Chip key={value} label={locationName} />
                              )
                            })}
                          </Box>
                        )}
                      >
                        {locations.map((location) => (
                          <MenuItem key={location._id} value={location._id}>
                            {location.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="available"
                          checked={formData.available}
                          onChange={handleCheckboxChange}
                          color="primary"
                        />
                      }
                      label={strings.AVAILABLE}
                    />
                  </Grid>

                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="customizable"
                          checked={formData.customizable}
                          onChange={handleCheckboxChange}
                          color="primary"
                        />
                      }
                      label={strings.CUSTOMIZABLE}
                    />
                  </Grid>

                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="cancellation"
                          checked={formData.cancellation}
                          onChange={handleCheckboxChange}
                          color="primary"
                        />
                      }
                      label={strings.CANCELLATION}
                    />
                  </Grid>

                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="amendments"
                          checked={formData.amendments}
                          onChange={handleCheckboxChange}
                          color="primary"
                        />
                      }
                      label={strings.AMENDMENTS}
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : commonStrings.SAVE}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        
        <Snackbar open={success} autoHideDuration={6000} onClose={() => setSuccess(false)}>
          <Alert onClose={() => setSuccess(false)} severity="success">
            {commonStrings.UPDATED}
          </Alert>
        </Snackbar>
        
        <Snackbar open={error} autoHideDuration={6000} onClose={() => setError(false)}>
          <Alert onClose={() => setError(false)} severity="error">
            {commonStrings.ERROR}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  )
}

export default UpdateDress
