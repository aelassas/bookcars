import React, { Typography } from '@mui/material'
import { AgendaDiv } from '../../styles/styles'
import useStore from '../../hooks/useStore'

const EmptyAgenda = () => {
  const { height, translations } = useStore()
  return (
    <AgendaDiv
      sx={{
        borderWidth: 1,
        padding: 1,
        height: height / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="rs__cell rs__agenda_items">
        <Typography>{translations.noDataToDisplay}</Typography>
      </div>
    </AgendaDiv>
  )
}

export default EmptyAgenda
