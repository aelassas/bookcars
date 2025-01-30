import React, { MouseEvent } from 'react'
import { Box, IconButton, Popover, Typography, useTheme } from '@mui/material'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded'
import { format } from 'date-fns'
import useStore from '../../hooks/useStore'
import { ProcessedEvent } from '../../types'
import { PopperInner } from '../../styles/styles'
import EventActions from './Actions'
import { differenceInDaysOmitTime, getHourFormat } from '../../helpers/generals'

type Props = {
  event: ProcessedEvent;
  anchorEl: Element | null;
  onTriggerViewer: (el?: MouseEvent<Element>) => void;
};

const EventItemPopover = ({ anchorEl, event, onTriggerViewer }: Props) => {
  const {
    triggerDialog,
    onDelete,
    events,
    handleState,
    triggerLoading,
    customViewer,
    viewerExtraComponent,
    fields,
    resources,
    resourceFields,
    locale,
    viewerTitleComponent,
    viewerSubtitleComponent,
    hourFormat,
    translations,
    onEventEdit,
  } = useStore()
  const theme = useTheme()
  const hideDates = differenceInDaysOmitTime(event.start, event.end) <= 0 && event.allDay
  const hFormat = getHourFormat(hourFormat)
  const idKey = resourceFields.idField
  const hasResource = resources.filter((res) =>
    (Array.isArray(event[idKey]) ? event[idKey].includes(res[idKey]) : res[idKey] === event[idKey]))

  const handleDelete = async () => {
    try {
      triggerLoading(true)
      let deletedId = event.event_id
      // Trigger custom/remote when provided
      if (onDelete) {
        const remoteId = await onDelete(deletedId)
        if (remoteId) {
          deletedId = remoteId
        } else {
          deletedId = ''
        }
      }
      if (deletedId) {
        onTriggerViewer()
        const updatedEvents = events.filter((e) => e.event_id !== deletedId)
        handleState(updatedEvents, 'events')
      }
    } catch (error) {
      console.error(error)
    } finally {
      triggerLoading(false)
    }
  }

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={() => {
        onTriggerViewer()
      }}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      {typeof customViewer === 'function' ? (
        customViewer(event, () => onTriggerViewer())
      ) : (
        <PopperInner>
          <Box
            sx={{
              bgcolor: event.color || theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            <div className="rs__popper_actions">
              <div>
                <IconButton
                  size="small"
                  onClick={() => {
                    onTriggerViewer()
                  }}
                >
                  <ClearRoundedIcon color="disabled" />
                </IconButton>
              </div>
              <EventActions
                event={event}
                onDelete={handleDelete}
                onEdit={() => {
                  onTriggerViewer()
                  triggerDialog(true, event)

                  if (onEventEdit && typeof onEventEdit === 'function') {
                    onEventEdit(event)
                  }
                }}
              />
            </div>
            {viewerTitleComponent instanceof Function ? (
              viewerTitleComponent(event)
            ) : (
              <Typography style={{ padding: '5px 0' }} noWrap>
                {event.title}
              </Typography>
            )}
          </Box>
          <div style={{ padding: '5px 10px' }}>
            <Typography
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              color="textSecondary"
              variant="caption"
              noWrap
            >
              <EventNoteRoundedIcon />
              {hideDates
                ? translations.event.allDay
                : `${format(event.start, `dd MMMM yyyy ${hFormat}`, {
                    locale,
                  })} - ${format(event.end, `dd MMMM yyyy ${hFormat}`, {
                    locale,
                  })}`}
            </Typography>
            {viewerSubtitleComponent instanceof Function ? (
              viewerSubtitleComponent(event)
            ) : (
              <Typography variant="body2" style={{ padding: '5px 0' }}>
                {event.subtitle}
              </Typography>
            )}
            {hasResource.length > 0 && (
              <Typography
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                color="textSecondary"
                variant="caption"
                noWrap
              >
                <SupervisorAccountRoundedIcon />
                {hasResource.map((res) => res[resourceFields.textField]).join(', ')}
              </Typography>
            )}
            {viewerExtraComponent instanceof Function
              ? viewerExtraComponent(fields, event)
              : viewerExtraComponent}
          </div>
        </PopperInner>
      )}
    </Popover>
  )
}

export default EventItemPopover
