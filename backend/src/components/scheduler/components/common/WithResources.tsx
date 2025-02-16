import React, { useMemo } from 'react'
import { Box, useTheme } from '@mui/material'
import { DefaultResource } from '../../types'
import { ResourceHeader } from './ResourceHeader'
import { ButtonTabProps, ButtonTabs } from './Tabs'
import useStore from '../../hooks/useStore'

interface WithResourcesProps {
  renderChildren(resource: DefaultResource): React.ReactNode;
}

const ResourcesTabTables = ({ renderChildren }: WithResourcesProps) => {
  const { resources, resourceFields, selectedResource, handleState, onResourceChange } = useStore()

  const tabs: ButtonTabProps[] = resources.map((res) => ({
    id: res[resourceFields.idField],
    label: <ResourceHeader resource={res} />,
    component: <>{renderChildren(res)}</>,
  }))

  const setTab = (tab: DefaultResource['assignee']) => {
    handleState(tab, 'selectedResource')
    if (typeof onResourceChange === 'function') {
      const selected = resources.find((re) => re[resourceFields.idField] === tab)
      if (selected) {
        onResourceChange(selected)
      }
    }
  }

  const currentTabSafeId = useMemo(() => {
    const firstId = resources[0][resourceFields.idField]
    if (!selectedResource) {
      return firstId
    }
    // Make sure current selected id is within the resources array
    const idx = resources.findIndex((re) => re[resourceFields.idField] === selectedResource)
    if (idx < 0) {
      return firstId
    }

    return selectedResource
  }, [resources, selectedResource, resourceFields.idField])

  return (
    <ButtonTabs tabs={tabs} tab={currentTabSafeId} setTab={setTab} style={{ display: 'grid' }} />
  )
}

const WithResources = ({ renderChildren }: WithResourcesProps) => {
  const { resources, resourceFields, resourceViewMode } = useStore()
  const theme = useTheme()

  if (resourceViewMode === 'tabs') {
    return <ResourcesTabTables renderChildren={renderChildren} />
  } if (resourceViewMode === 'vertical') {
    return (
      <>
        {resources.map((res: DefaultResource) => (
          <Box key={`${res[resourceFields.idField]}`} sx={{ display: 'flex' }}>
            <Box
              sx={{
                borderColor: theme.palette.grey[300],
                borderStyle: 'solid',
                borderWidth: '1px 1px 0 1px',
                paddingTop: 1,
                flexBasis: 140,
              }}
            >
              <ResourceHeader resource={res} />
            </Box>
            <Box
              //
              sx={{ width: '100%', overflowX: 'auto' }}
            >
              {renderChildren(res)}
            </Box>
          </Box>
        ))}
      </>
    )
  }
  return (
    <>
      {resources.map((res: DefaultResource) => (
        <div key={`${res[resourceFields.idField]}`}>
          <ResourceHeader resource={res} />
          {renderChildren(res)}
        </div>
      ))}
    </>
  )
}

export { WithResources }
