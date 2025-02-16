import React from 'react'
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material'
import { DefaultResource } from '../../types'
import useStore from '../../hooks/useStore'

interface ResourceHeaderProps {
  resource: DefaultResource;
}
const ResourceHeader = ({ resource }: ResourceHeaderProps) => {
  const { resourceHeaderComponent, resourceFields, direction, resourceViewMode } = useStore()
  const theme = useTheme()

  const text = resource[resourceFields.textField]
  const subtext = resource[resourceFields.subTextField || '']
  const avatar = resource[resourceFields.avatarField || '']
  const color = resource[resourceFields.colorField || '']

  if (resourceHeaderComponent instanceof Function) {
    return resourceHeaderComponent(resource)
  }

  return (
    <ListItem
      sx={{
        padding: '2px 10px',
        textAlign: direction === 'rtl' ? 'right' : 'left',
        ...(resourceViewMode === 'tabs'
          ? {}
          : resourceViewMode === 'vertical'
          ? {
              display: 'block',
              textAlign: 'center',
              position: 'sticky',
              top: 4,
            }
          : {
              borderColor: theme.palette.grey[300],
              borderStyle: 'solid',
              borderWidth: 1,
            }),
      }}
      component="div"
    >
      <ListItemAvatar>
        <Avatar sx={{ background: color, margin: 'auto' }} alt={text} src={avatar} />
      </ListItemAvatar>
      <ListItemText
        primary={(
          <Typography variant="body2" noWrap={resourceViewMode !== 'vertical'}>
            {text}
          </Typography>
        )}
        secondary={(
          <Typography
            variant="caption"
            color="textSecondary"
            noWrap={resourceViewMode !== 'vertical'}
          >
            {subtext}
          </Typography>
        )}
      />
    </ListItem>
  )
}

export { ResourceHeader }
