import React, { Fragment, useState } from 'react'
import {
  Button,
  useTheme,
  useMediaQuery,
  Popover,
  MenuList,
  MenuItem,
  IconButton,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'
import { WeekDateBtn } from './WeekDateBtn'
import { DayDateBtn } from './DayDateBtn'
import { MonthDateBtn } from './MonthDateBtn'
import useStore from '../../hooks/useStore'
import { NavigationDiv } from '../../styles/styles'
import { getTimeZonedDate } from '../../helpers/generals'

export type View = 'month' | 'week' | 'day';

const Navigation = () => {
  const {
    selectedDate,
    view,
    week,
    handleState,
    getViews,
    translations,
    navigation,
    day,
    month,
    disableViewNavigator,
    onSelectedDateChange,
    onViewChange,
    stickyNavigation,
    timeZone,
    agenda,
    toggleAgenda,
    enableAgenda,
  } = useStore()
  const [anchorEl, setAnchorEl] = useState<Element | null>(null)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'))
  const views = getViews()

  const toggleMoreMenu = (el?: Element) => {
    setAnchorEl(el || null)
  }

  const handleSelectedDateChange = (date: Date) => {
    handleState(date, 'selectedDate')

    if (onSelectedDateChange && typeof onSelectedDateChange === 'function') {
      onSelectedDateChange(date)
    }
  }

  const handleChangeView = (_view: View) => {
    handleState(_view, 'view')
    if (onViewChange && typeof onViewChange === 'function') {
      onViewChange(_view, agenda)
    }
  }

  const renderDateSelector = () => {
    switch (view) {
      case 'month':
        return (
          month?.navigation && (
            <MonthDateBtn selectedDate={selectedDate} onChange={handleSelectedDateChange} />
          )
        )
      case 'week':
        return (
          week?.navigation && (
            <WeekDateBtn
              selectedDate={selectedDate}
              onChange={handleSelectedDateChange}
              weekProps={week!}
            />
          )
        )
      case 'day':
        return (
          day?.navigation && (
            <DayDateBtn selectedDate={selectedDate} onChange={handleSelectedDateChange} />
          )
        )
      default:
        return ''
    }
  }

  if (!navigation && disableViewNavigator) return null

  return (
    <NavigationDiv sticky={stickyNavigation ? '1' : '0'}>
      <div data-testid="date-navigator">{navigation && renderDateSelector()}</div>

      <div
        className="rs__view_navigator"
        data-testid="view-navigator"
        style={{
          visibility: disableViewNavigator ? 'hidden' : 'visible',
        }}
      >
        <Button
          onClick={() => handleSelectedDateChange(getTimeZonedDate(new Date(), timeZone))}
          aria-label={translations.navigation.today}
        >
          {translations.navigation.today}
        </Button>
        {enableAgenda
          && (isDesktop ? (
            <Button
              color={agenda ? 'primary' : 'inherit'}
              onClick={toggleAgenda}
              aria-label={translations.navigation.agenda}
            >
              {translations.navigation.agenda}
            </Button>
          ) : (
            <IconButton
              color={agenda ? 'primary' : 'default'}
              style={{ padding: 5 }}
              onClick={toggleAgenda}
            >
              <ViewAgendaIcon />
            </IconButton>
          ))}

        {views.length > 1
          && (isDesktop ? (
            views.map((v) => (
              <Button
                key={v}
                color={v === view ? 'primary' : 'inherit'}
                onClick={() => handleChangeView(v)}
                onDragOver={(e) => {
                  e.preventDefault()
                  handleChangeView(v)
                }}
              >
                {translations.navigation[v]}
              </Button>
            ))
          ) : (
            <>
              <IconButton
                style={{ padding: 5 }}
                onClick={(e) => {
                  toggleMoreMenu(e.currentTarget)
                }}
              >
                <MoreVertIcon />
              </IconButton>
              <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => {
                  toggleMoreMenu()
                }}
                anchorOrigin={{
                  vertical: 'center',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
              >
                <MenuList autoFocusItem={!!anchorEl} disablePadding>
                  {views.map((v) => (
                    <MenuItem
                      key={v}
                      selected={v === view}
                      onClick={() => {
                        toggleMoreMenu()
                        handleChangeView(v)
                      }}
                    >
                      {translations.navigation[v]}
                    </MenuItem>
                  ))}
                </MenuList>
              </Popover>
            </>
          ))}
      </div>
    </NavigationDiv>
  )
}

export { Navigation }
