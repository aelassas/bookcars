import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, ScrollView, View, Pressable, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Dialog, Portal, Button as NativeButton, Paragraph } from 'react-native-paper'
import { Locale, format } from 'date-fns'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as NotificationService from '@/services/NotificationService'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import Checkbox from '@/components/Checkbox'
import { useGlobalContext, GlobalContextType } from '@/context/GlobalContext'

interface NotificationListProps {
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
  user?: bookcarsTypes.User
  locale: Locale
}

const NotificationList = ({ user, locale, navigation }: NotificationListProps) => {
  const { setNotificationCount } = useGlobalContext() as GlobalContextType

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<bookcarsTypes.Notification[]>([])
  const [totalRecords, setTotalRecords] = useState(-1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedRows, setSelectedRows] = useState<bookcarsTypes.Notification[]>([])
  const [rowCount, setRowCount] = useState(-1)

  const notificationsListRef = useRef<ScrollView>(null)

  const fetch = useCallback(async () => {
    if (user?._id) {
      try {
        setRows([])
        setLoading(true)
        const data = await NotificationService.getNotifications(user._id, page)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const _rows = _data.resultData.map((row) => ({
          checked: false,
          ...row,
        }))
        const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
        setRows(_rows)
        setTotalRecords(_totalRecords)
        setRowCount((page - 1) * env.PAGE_SIZE + _rows.length)
        if (notificationsListRef.current) {
          notificationsListRef.current.scrollTo({ x: 0, y: 0, animated: false })
        }
        setLoading(false)
      } catch (err) {
        helper.error(err)
      }
    }
  }, [user, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  const _format = 'eee d LLLL, kk:mm'
  const iconColor = 'rgba(0, 0, 0, 0.54)'
  const disabledIconColor = '#c6c6c6'

  const checkedRows = rows.filter((row) => row.checked)
  const allChecked = rows.length > 0 && checkedRows.length === rows.length
  const indeterminate = checkedRows.length > 0 && checkedRows.length < rows.length
  const previousPageDisabled = page === 1
  const nextPageDisabled = (page - 1) * env.PAGE_SIZE + rows.length >= totalRecords

  return (
    <>
      {totalRecords === 0 && (
        <View style={styles.emptyList}>
          <Text>{i18n.t('EMPTY_NOTIFICATION_LIST')}</Text>
        </View>
      )}

      {totalRecords > 0 && (
        <>
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <Checkbox
                checked={allChecked}
                indeterminate={indeterminate}
                onChange={(checked: boolean) => {
                  if (indeterminate) {
                    rows.forEach((row) => {
                      row.checked = false
                    })
                  } else {
                    rows.forEach((row) => {
                      row.checked = checked
                    })
                  }
                  setRows(bookcarsHelper.clone(rows))
                }}
              />
              {checkedRows.length > 0 && (
                <View style={styles.headerActions}>
                  {checkedRows.some((row) => !row.isRead) && (
                    <Pressable
                      style={styles.action}
                      onPress={async () => {
                        try {
                          if (user?._id) {
                            const _rows = checkedRows.filter((row) => !row.isRead)
                            const ids = _rows.map((row) => row._id)
                            const status = await NotificationService.markAsRead(user._id, ids)

                            if (status === 200) {
                              _rows.forEach((row) => {
                                row.isRead = true
                              })
                              setRows(bookcarsHelper.clone(rows))
                              setNotificationCount((prev) => prev - _rows.length)
                            } else {
                              helper.error()
                            }
                          } else {
                            helper.error()
                          }
                        } catch {
                          await UserService.signout(navigation)
                        }
                      }}
                    >
                      <MaterialIcons name="drafts" size={24} color={iconColor} />
                    </Pressable>
                  )}
                  {checkedRows.some((row) => row.isRead) && (
                    <Pressable
                      style={styles.action}
                      onPress={async () => {
                        try {
                          if (user?._id) {
                            const _rows = checkedRows.filter((row) => row.isRead)
                            const ids = _rows.map((row) => row._id)
                            const status = await NotificationService.markAsUnread(user._id, ids)

                            if (status === 200) {
                              _rows.forEach((row) => {
                                row.isRead = false
                              })
                              setRows(bookcarsHelper.clone(rows))
                              setNotificationCount((prev) => prev + _rows.length)
                            } else {
                              helper.error()
                            }
                          } else {
                            helper.error()
                          }
                        } catch (err) {
                          helper.error(err)
                        }
                      }}
                    >
                      <MaterialIcons name="markunread" size={24} color={iconColor} />
                    </Pressable>
                  )}
                  {/* <Pressable
                    style={styles.action}
                    onPress={() => {
                      setSelectedRows(checkedRows)
                      setOpenDeleteDialog(true)
                    }}
                  >
                    <MaterialIcons name="delete" size={24} color={iconColor} />
                  </Pressable> */}
                </View>
              )}
            </View>
          </View>
          <ScrollView
            ref={notificationsListRef}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
          >
            {loading && <ActivityIndicator size="large" color="#f37022" />}
            {rows.map((row) => (
              <View key={row._id} style={styles.notificationContainer}>
                <View style={styles.notificationCheckbox}>
                  <Checkbox
                    checked={row.checked}
                    onChange={(checked: boolean) => {
                      row.checked = checked
                      setRows(bookcarsHelper.clone(rows))
                    }}
                  />
                </View>
                <View style={styles.notification}>
                  <Text
                    style={{
                      ...styles.date,
                      fontWeight: !row.isRead ? '700' : '400',
                    }}
                  >
                    {bookcarsHelper.capitalize(format(new Date(row.createdAt as Date), _format, { locale }))}
                  </Text>
                  <View style={styles.messageContainer}>
                    <Text
                      style={{
                        ...styles.message,
                        fontWeight: !row.isRead ? '700' : '400',
                      }}
                    >
                      {row.message}
                    </Text>
                    <View style={styles.notificationActions}>
                      {row.booking && (
                        <Pressable
                          style={styles.action}
                          onPress={async () => {
                            try {
                              const navigate = () =>
                                navigation.navigate('Booking', {
                                  id: row.booking || '',
                                })

                              if (!row.isRead) {
                                const status = await NotificationService.markAsRead(user?._id as string, [row._id])

                                if (status === 200) {
                                  row.isRead = true
                                  setRows(bookcarsHelper.clone(rows))
                                  setNotificationCount((prev) => prev - 1)
                                  navigate()
                                } else {
                                  helper.error()
                                }
                              } else {
                                navigate()
                              }
                            } catch {
                              await UserService.signout(navigation)
                            }
                          }}
                        >
                          <MaterialIcons name="visibility" size={24} color={iconColor} />
                        </Pressable>
                      )}
                      {!row.isRead ? (
                        <Pressable
                          style={styles.action}
                          onPress={async () => {
                            try {
                              const status = await NotificationService.markAsRead(user?._id as string, [row._id])

                              if (status === 200) {
                                row.isRead = true
                                setRows(bookcarsHelper.clone(rows))
                                setNotificationCount((prev) => prev - 1)
                              } else {
                                helper.error()
                              }
                            } catch (err) {
                              helper.error(err)
                            }
                          }}
                        >
                          <MaterialIcons name="drafts" size={24} color={iconColor} />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.action}
                          onPress={async () => {
                            try {
                              const status = await NotificationService.markAsUnread(user?._id as string, [row._id])

                              if (status === 200) {
                                row.isRead = false
                                setRows(bookcarsHelper.clone(rows))
                                setNotificationCount((prev) => prev + 1)
                              } else {
                                helper.error()
                              }
                            } catch {
                              await UserService.signout(navigation)
                            }
                          }}
                        >
                          <MaterialIcons name="markunread" size={24} color={iconColor} />
                        </Pressable>
                      )}
                      {/* <Pressable
                        style={styles.action}
                        onPress={() => {
                          setSelectedRows([row])
                          setOpenDeleteDialog(true)
                        }}
                      >
                        <MaterialIcons name="delete" size={24} color={iconColor} />
                      </Pressable> */}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Text style={styles.rowCount}>{`${(page - 1) * env.PAGE_SIZE + 1}-${rowCount} ${i18n.t('OF')} ${totalRecords}`}</Text>
            <View style={styles.footerActions}>
              <Pressable
                style={styles.action}
                disabled={previousPageDisabled}
                onPress={() => {
                  const _page = page - 1
                  setRowCount(_page < Math.ceil(totalRecords / env.PAGE_SIZE) ? (_page - 1) * env.PAGE_SIZE + env.PAGE_SIZE : totalRecords)
                  setPage(_page)
                }}
              >
                <MaterialIcons name="arrow-back-ios" size={24} color={previousPageDisabled ? disabledIconColor : iconColor} />
              </Pressable>
              <Pressable
                style={styles.action}
                disabled={nextPageDisabled}
                onPress={() => {
                  const _page = page + 1
                  setRowCount(_page < Math.ceil(totalRecords / env.PAGE_SIZE) ? (_page - 1) * env.PAGE_SIZE + env.PAGE_SIZE : totalRecords)
                  setPage(_page)
                }}
              >
                <MaterialIcons name="arrow-forward-ios" size={24} color={nextPageDisabled ? disabledIconColor : iconColor} />
              </Pressable>
            </View>
          </View>

          <Portal>
            <Dialog visible={openDeleteDialog} dismissable={false}>
              <Dialog.Title style={styles.dialogTitleContent}>{i18n.t('CONFIRM_TITLE')}</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <Paragraph>{selectedRows.length === 1 ? i18n.t('DELETE_NOTIFICATION') : i18n.t('DELETE_NOTIFICATIONS')}</Paragraph>
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <NativeButton
                  // color='#f37022'
                  onPress={() => {
                    setOpenDeleteDialog(false)
                  }}
                >
                  {i18n.t('CANCEL')}
                </NativeButton>
                <NativeButton
                  // color='#f37022'
                  onPress={async () => {
                    try {
                      if (user?._id) {
                        const ids = selectedRows.map((row) => row._id)
                        const status = await NotificationService.deleteNotifications(user._id, ids)

                        if (status === 200) {
                          if (selectedRows.length === rows.length) {
                            const _page = 1
                            const _totalRecords = totalRecords - selectedRows.length
                            setRowCount(_page < Math.ceil(_totalRecords / env.PAGE_SIZE) ? (_page - 1) * env.PAGE_SIZE + env.PAGE_SIZE : _totalRecords)

                            if (page > 1) {
                              setPage(1)
                            } else {
                              fetch()
                            }
                          } else {
                            selectedRows.forEach((row) => {
                              rows.splice(
                                rows.findIndex((_row) => _row._id === row._id),
                                1,
                              )
                            })
                            setRows(bookcarsHelper.clone(rows))
                            setRowCount(rowCount - selectedRows.length)
                            setTotalRecords(totalRecords - selectedRows.length)
                          }
                          setNotificationCount((prev) => prev - selectedRows.length)
                          setOpenDeleteDialog(false)
                        } else {
                          helper.error()
                        }
                      } else {
                        helper.error()
                      }
                    } catch (err) {
                      helper.error(err)
                    }
                  }}
                >
                  {i18n.t('DELETE')}
                </NativeButton>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  emptyList: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 15,
  },
  headerContainer: {
    position: 'relative',
    top: 0,
    right: 0,
    left: 0,
    height: 50,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 480,
    paddingLeft: 10,
  },
  headerActions: {
    flexDirection: 'row',
    marginRight: 10,
  },
  list: {
    position: 'relative',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 15,
  },
  notificationContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    paddingRight: 10,
    paddingLeft: 10,
  },
  notificationCheckbox: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  notification: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    color: '#333',
    marginBottom: 10,
    minHeight: 75,
    padding: 10,
    fontSize: 15,
    flexDirection: 'column',
    marginLeft: 10,
  },
  date: {
    color: '#878787',
    marginBottom: 5,
  },
  messageContainer: {
    flexDirection: 'column',
  },
  message: {
    flex: 1,
    flexWrap: 'wrap',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  action: {
    marginLeft: 10,
  },
  dialogTitleContent: {
    textAlign: 'center',
  },
  dialogContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActions: {
    height: 75,
  },
  footer: {
    position: 'relative',
    right: 0,
    bottom: 0,
    left: 0,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 5,
    paddingRight: 10,
    paddingBottom: 5,
  },
  rowCount: {
    marginRight: 5,
  },
  footerActions: {
    flexDirection: 'row',
  },
})

export default NotificationList
