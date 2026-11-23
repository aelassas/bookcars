import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Layout from '@/components/Layout'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import * as KycService from '@/services/KycService'

const KycScreen = () => {
  const [documentNumber, setDocumentNumber] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    KycService.getMine().then((kyc) => {
      if (kyc) {
        setDocumentNumber(kyc.documentNumber || '')
        setStatus(kyc.status || '')
      }
    }).catch(() => setStatus(''))
  }, [])

  const submit = async () => {
    if (!/^\d{5}-\d{7}-\d{1}$/.test(documentNumber.trim())) {
      setMessage('CNIC must use XXXXX-XXXXXXX-X')
      return
    }
    try {
      const kyc = await KycService.submit('cnic', documentNumber.trim())
      setStatus(kyc.status)
      setMessage('KYC submitted for review.')
    } catch {
      setMessage('Unable to submit KYC.')
    }
  }

  return (
    <Layout style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>CNIC / KYC verification</Text>
        {status ? <Text style={styles.status}>Status: {status}</Text> : null}
        <TextInput value={documentNumber} label="CNIC XXXXX-XXXXXXX-X" onChangeText={setDocumentNumber} />
        <View style={styles.button}><Button label="Submit for review" onPress={submit} /></View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </Layout>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  status: { marginBottom: 12 },
  button: { marginTop: 16 },
  message: { marginTop: 12 },
})

export default KycScreen
