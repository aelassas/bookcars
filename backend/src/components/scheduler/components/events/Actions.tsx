import React, { useState } from 'react'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import { Button, Grow, IconButton, Slide } from '@mui/material'
import { EventActions as Actions } from '../../styles/styles'
import { ProcessedEvent } from '../../types'
import useStore from '../../hooks/useStore'
import useEventPermissions from '../../hooks/useEventPermissions'

interface Props {
  event: ProcessedEvent;
  onDelete(): void;
  onEdit(): void;
}

const EventActions = ({ event, onDelete, onEdit }: Props) => {
  const { translations, direction } = useStore()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    onDelete()
  }

  const { canEdit, canDelete } = useEventPermissions(event)

  return (
    <Actions>
      <Grow in={!deleteConfirm} exit={false} timeout={400} unmountOnExit>
        <div>
          {canEdit && (
            <IconButton size="small" onClick={onEdit}>
              <EditRounded />
            </IconButton>
          )}
          {canDelete && (
            <IconButton size="small" onClick={handleDelete}>
              <DeleteRounded />
            </IconButton>
          )}
        </div>
      </Grow>
      <Slide
        in={deleteConfirm}
        direction={direction === 'rtl' ? 'right' : 'left'}
        unmountOnExit
        timeout={400}
        exit={false}
      >
        <div>
          <Button className="delete" size="small" onClick={handleDelete}>
            {translations.form.delete.toUpperCase()}
          </Button>
          <Button className="cancel" size="small" onClick={() => setDeleteConfirm(false)}>
            {translations.form.cancel.toUpperCase()}
          </Button>
        </div>
      </Slide>
    </Actions>
  )
}

export default EventActions
