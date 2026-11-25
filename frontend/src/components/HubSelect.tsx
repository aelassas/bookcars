import React, { useEffect, useState } from 'react'
import { MenuItem, TextField, TextFieldVariants } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import {
  ALL_PAKISTAN_HUBS_ID,
  QUICK_HUB_NAMES,
  findHubByName,
  loadHubs,
} from '@/utils/hubs'

import '@/assets/css/hub-select.css'

interface HubPickerProps {
  value: string
  onChange: (hubId: string, hub?: bookcarsTypes.Location) => void
}

const useHubs = () => {
  const [hubs, setHubs] = useState<bookcarsTypes.Location[]>([])

  useEffect(() => {
    let active = true
    loadHubs().then((locations) => {
      if (active) {
        setHubs(locations)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return hubs
}

/** One-tap city pills shared by the home search dock and the search page. */
export const HubPills = ({ value, onChange }: HubPickerProps) => {
  const hubs = useHubs()

  return (
    <div className="hub-pills" role="group" aria-label="Quick city selection">
      <button
        type="button"
        className={`hub-pill ${value === ALL_PAKISTAN_HUBS_ID ? 'active' : ''}`}
        aria-pressed={value === ALL_PAKISTAN_HUBS_ID}
        onClick={() => onChange(ALL_PAKISTAN_HUBS_ID)}
      >
        All Pakistan
      </button>
      {QUICK_HUB_NAMES.map((name) => {
        const hub = findHubByName(hubs, name)
        return (
          <button
            key={name}
            type="button"
            className={`hub-pill ${hub && value === hub._id ? 'active' : ''}`}
            aria-pressed={Boolean(hub && value === hub._id)}
            disabled={!hub}
            onClick={() => hub && onChange(hub._id, hub)}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

interface HubSelectProps extends HubPickerProps {
  label?: string
  variant?: TextFieldVariants
}

/** Pakistani hub selector. Defaults to "All Pakistan Hubs" when no hub is chosen. */
const HubSelect = ({ value, onChange, label = 'Pickup hub', variant = 'outlined' }: HubSelectProps) => {
  const hubs = useHubs()

  return (
    <TextField
      select
      fullWidth
      className="hub-select"
      label={label}
      variant={variant}
      value={value}
      onChange={(event) => {
        const hubId = event.target.value
        onChange(hubId, hubs.find((hub) => hub._id === hubId))
      }}
    >
      <MenuItem value={ALL_PAKISTAN_HUBS_ID}>All Pakistan Hubs</MenuItem>
      {hubs.map((hub) => (
        <MenuItem key={hub._id} value={hub._id}>{hub.name}</MenuItem>
      ))}
    </TextField>
  )
}

export default HubSelect
