import React, { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'

import * as Helper from '../common/Helper'
import Env from '../config/env.config'
import i18n from '../lang/i18n'
import * as SupplierService from '../services/SupplierService'
import Link from './Link'
import Switch from './Switch'
import Accordion from './Accordion'

const CompanyFilter = (props) => {
  const [suppliers, setSuppliers] = useState([])
  const [checkedSuppliers, setCheckedSuppliers] = useState([])
  const [allChecked, setAllChecked] = useState(true)

  const init = async () => {
    try {
      const allSuppliers = await SupplierService.getAllSuppliers()
      const suppliers = allSuppliers.map((supplier) => ({
        ...supplier,
        checked: true,
      }))
      const checkedCompanies = Helper.flattenCompanies(suppliers)
      setSuppliers(suppliers)
      setCheckedSuppliers(checkedCompanies)
      if (props.onLoad) props.onLoad(checkedCompanies)
    } catch (err) {
      Helper.error(err)
    }
  }

  useEffect(() => {
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    suppliers.length > 0 &&
    props.visible && (
      <View style={{ ...styles.container, ...props.style }}>
        <Accordion style={styles.accordion} title={i18n.t('SUPPLIER')}>
          <View style={styles.companies}>
            {suppliers.map((supplier) => (
              <View key={supplier._id} style={styles.company}>
                <Switch
                  value={supplier.checked}
                  onValueChange={(checked) => {
                    if (checked) {
                      supplier.checked = true
                      setSuppliers(Helper.clone(suppliers))
                      checkedSuppliers.push(supplier._id)

                      if (checkedSuppliers.length === suppliers.length) {
                        setAllChecked(true)
                      }
                    } else {
                      supplier.checked = false
                      setSuppliers(Helper.clone(suppliers))
                      const index = checkedSuppliers.indexOf(supplier._id)
                      checkedSuppliers.splice(index, 1)

                      if (checkedSuppliers.length === 0) {
                        setAllChecked(false)
                      }
                    }

                    if (props.onChange) {
                      props.onChange(Helper.clone(checkedSuppliers))
                    }
                  }}
                >
                  <Image
                    style={styles.image}
                    source={{
                      uri: Helper.joinURL(Env.CDN_USERS, supplier.avatar),
                    }}
                  />
                </Switch>
              </View>
            ))}
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              let _checkedSuppliers = []
              if (allChecked) {
                suppliers.forEach((supplier) => {
                  supplier.checked = false
                })
                setAllChecked(false)
                setSuppliers(Helper.clone(suppliers))
                setCheckedSuppliers(_checkedSuppliers)
              } else {
                suppliers.forEach((supplier) => {
                  supplier.checked = true
                })
                setAllChecked(true)
                setSuppliers(Helper.clone(suppliers))
                _checkedSuppliers = Helper.clone(Helper.flattenCompanies(suppliers))
                setCheckedSuppliers(_checkedSuppliers)

                if (props.onChange) {
                  props.onChange(_checkedSuppliers)
                }
              }
            }}
          />
        </Accordion>
      </View>
    )
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  accordion: {
    width: '100%',
    maxWidth: 480,
  },
  companies: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: 300,
  },
  company: {
    width: '50%',
    marginBottom: 7,
  },
  image: {
    width: Env.COMPANY_IMAGE_WIDTH,
    height: Env.COMPANY_IMAGE_HEIGHT,
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    fontSize: 12,
  },
})

export default CompanyFilter
