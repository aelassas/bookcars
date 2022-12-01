import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Keyboard
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import Master from './Master';
import Switch from '../elements/Switch';
import Button from '../elements/Button';
import LocationSelectList from '../elements/LocationSelectList';
import DateTimePicker from '../elements/DateTimePicker';

const HomeScreen = ({ navigation, route }) => {
  const isFocused = useIsFocused();

  const _fromDate = new Date();
  _fromDate.setDate(_fromDate.getDate() + 1);
  _fromDate.setHours(0);
  _fromDate.setMinutes(0);
  _fromDate.setSeconds(0);
  _fromDate.setMilliseconds(0);

  const _fromTime = new Date(_fromDate);
  _fromTime.setHours(10);

  const _toDate = new Date(_fromDate);
  _toDate.setDate(_toDate.getDate() + 3);

  const _toTime = new Date(_toDate);
  _toTime.setHours(10);

  const [init, setInit] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropOffLocation, setDropOffLocation] = useState(null);
  const [closePickupLocation, setClosePickupLocation] = useState(false);
  const [closeDropOffLocation, setCloseDropOffLocation] = useState(false);
  const [sameLocation, setSameLocation] = useState(true);
  const [fromDate, setFromDate] = useState(_fromDate);
  const [fromTime, setFromTime] = useState(_fromTime);
  const [toTime, setToTime] = useState(_toTime);
  const [toDate, setToDate] = useState(_toDate);
  const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
  const [blur, setBlur] = useState(false);
  const [reload, setReload] = useState(false);

  const _init = async () => {
    const language = await UserService.getLanguage();
    i18n.locale = language;
    setLanguage(language);

    setPickupLocation(null);
    setDropOffLocation(null);
    setSameLocation(true);
    setFromDate(_fromDate);
    setFromTime(_fromTime);
    setToDate(_toDate);
    setToTime(_toTime);

    Keyboard.addListener('keyboardDidHide', () => {
      setBlur(true);
    });

    setInit(true);
    setVisible(true);
  };

  useEffect(() => {
    if (isFocused) {
      _init();
      setReload(true);
    } else {
      setVisible(false);
    }

  }, [route.params, isFocused]);

  const onLoad = (user) => {
    setReload(false);
  };

  const handlePickupLocationSelect = (pickupLocation) => {
    setPickupLocation(pickupLocation);
    if (sameLocation) setDropOffLocation(pickupLocation);
  };

  const handleDropOffLocationSelect = (dropOffLocation) => {
    setDropOffLocation(dropOffLocation)
  };

  const blurLocations = () => {
    setBlur(true);
    setClosePickupLocation(true);
    setCloseDropOffLocation(true);
  };

  const handleTouchableOpacityClick = () => {
    blurLocations();
  };

  const handleSameLocationChange = (checked) => {
    setSameLocation(checked);
    blurLocations();
    if (checked) {
      setDropOffLocation(pickupLocation);
    } else {
      setDropOffLocation(null);
    }
  };

  const handleSearch = () => {
    blurLocations();

    const from = Helper.dateTime(fromDate, fromTime);
    const to = Helper.dateTime(toDate, toTime);

    if (!pickupLocation) {
      return Helper.toast(i18n.t('PICKUP_LOCATION_EMPTY'));
    }

    if (!dropOffLocation) {
      return Helper.toast(i18n.t('DROP_OFF_LOCATION_EMPTY'));
    }

    const params = { pickupLocation, dropOffLocation, from: from.getTime(), to: to.getTime() };
    navigation.navigate('Cars', params);
  };

  return (
    <Master style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} route={route}>
      {init && visible &&
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.contentContainer}>

            <View style={styles.logo}>
              <Text style={styles.logoMain}>BookCars</Text>
              <Text style={styles.logoRegistered}>®</Text>
            </View>

            <TouchableOpacity
              style={{
                position: 'absolute',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                opacity: 0,
                width: '100%',
                height: '100%',
                left: 0,
                top: 0
              }}
              onPress={handleTouchableOpacityClick} />

            <LocationSelectList
              label={i18n.t('PICKUP_LOCATION')}
              style={styles.component}
              onSelectItem={handlePickupLocationSelect}
              selectedItem={pickupLocation}
              onFetch={() => {
                setClosePickupLocation(false);
              }}
              onFocus={() => {
                setBlur(false);
                setCloseDropOffLocation(true);
              }}
              close={closePickupLocation}
              blur={blur}
            />

            <DateTimePicker
              mode='date'
              locale={language}
              style={styles.component}
              label={i18n.t('FROM_DATE')}
              value={fromDate}
              minimumDate={_fromDate}
              onChange={(date) => setFromDate(date)}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode='time'
              locale={language}
              style={styles.component}
              label={i18n.t('FROM_TIME')}
              value={fromTime}
              onChange={(time) => setFromTime(time)}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode='date'
              locale={language}
              style={styles.component}
              label={i18n.t('TO_DATE')}
              value={toDate}
              minimumDate={fromDate}
              onChange={(date) => setToDate(date)}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode='time'
              locale={language}
              style={styles.component}
              label={i18n.t('TO_TIME')}
              value={toTime}
              onChange={(time) => setToTime(time)}
              onPress={blurLocations}
            />

            <Button style={styles.component} label={i18n.t('SEARCH')} onPress={handleSearch} />

            {!sameLocation &&
              <LocationSelectList
                label={i18n.t('DROP_OFF_LOCATION')}
                style={styles.component}
                onSelectItem={handleDropOffLocationSelect}
                selectedItem={dropOffLocation}
                onFetch={() => {
                  setCloseDropOffLocation(false);
                }}
                onFocus={() => {
                  setBlur(false);
                  setClosePickupLocation(true);
                }}
                close={closeDropOffLocation}
                blur={blur}
              />
            }

            <Switch style={styles.component} label={i18n.t('SAME_LOCATION')} value={sameLocation} onValueChange={handleSameLocationChange} />
          </View>
        </ScrollView>
      }
    </Master>
  );
};

const styles = StyleSheet.create({
  master: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center'
  },
  logo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    maxWidth: 480
  },
  logoMain: {
    color: '#f37022',
    fontSize: 70,
    fontWeight: '700',
    lineHeight: 125
  },
  logoRegistered: {
    color: '#f37022',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 40
  },
  component: {
    alignSelf: 'stretch',
    margin: 10
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    alignSelf: 'stretch',
    flexDirection: 'row'
  },
  copyright: {
    fontSize: 12,
    color: '#70757a',
  },
  copyrightRegistered: {
    fontSize: 6,
    color: '#70757a',
    position: 'relative',
    top: -5
  }
});

export default HomeScreen;