import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import Layout from '@/components/Layout'
import * as HandoverService from '@/services/HandoverService'

const HandoverScreen = () => {
  const { booking } = useLocalSearchParams<{ booking: string }>()
  const [handover, setHandover] = useState<any>(null)
  const [message, setMessage] = useState('Loading handover...')

  useEffect(() => {
    if (!booking) {
      setMessage('Open handover from a booking.')
      return
    }
    HandoverService.getByBooking(booking).then((value) => {
      setHandover(value)
      setMessage(value ? `Status: ${value.status}` : 'No handover checklist is available yet.')
    }).catch(() => setMessage('Unable to load handover.'))
  }, [booking])

  return (
    <Layout style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Digital handover</Text>
        <Text>{message}</Text>
        {handover?.damageNotes ? <Text>Damage notes: {handover.damageNotes}</Text> : null}
        {handover?.odometerAtPickup !== undefined ? <Text>Pickup odometer: {handover.odometerAtPickup}</Text> : null}
        {handover?.fuelLevelAtPickup !== undefined ? <Text>Pickup fuel: {handover.fuelLevelAtPickup}%</Text> : null}
      </ScrollView>
    </Layout>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
})

export default HandoverScreen
