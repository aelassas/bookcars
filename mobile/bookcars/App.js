import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Switch
} from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import LocationSelectList from './elements/LocationSelectList';
import DateTimePicker from './elements/DateTimePicker';

import Env from './config/env.config';
import i18n from './lang/i18n';
import UserService from './services/UserService';
import Helper from './common/Helper';

const SCREEN_HEIGHT = Dimensions.get('screen').height; // device height
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 24;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;

class App extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 1);
    fromDate.setHours(0);
    fromDate.setMinutes(0);
    fromDate.setSeconds(0);
    fromDate.setMilliseconds(0);

    const fromTime = new Date(fromDate);
    fromTime.setHours(10);

    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 3);

    const toTime = new Date(toDate);
    toTime.setHours(10);

    this.state = {
      init: false,
      pickupLocation: null,
      dropOffLocation: null,
      close: false,
      sameLocation: true,
      fromDate,
      fromTime,
      toTime,
      toDate,
      pickupLocationFocus: false,
      keyboardDidShow: false,
      language: Env.DEFAULT_LANGUAGE,
      keyboardHeight: 0
    };
  }

  handlePickupLocationSelect = (pickupLocation) => {
    this.setState({ pickupLocation, pickupLocationFocus: false })
  };

  handleDropOffLocationSelect = (dropOffLocation) => {
    this.setState({ dropOffLocation })
  };

  handleTouchableOpacityClick = () => {
    this.setState({ close: true });
  };

  dateTime = (date, time) => {
    const dateTime = new Date(date);
    dateTime.setHours(time.getHours());
    dateTime.setMinutes(time.getMinutes());
    dateTime.setSeconds(time.getSeconds());
    dateTime.setMilliseconds(time.getMilliseconds());
    return dateTime;
  };

  handleSameLocationChange = (checked) => {
    this.setState({ sameLocation: checked });
  };

  handleSameLocationPress = () => {
    const { sameLocation } = this.state;

    this.setState({ sameLocation: !sameLocation });
  };

  handleSearch = () => {
    const { pickupLocation, sameLocation, fromDate, fromTime, toDate, toTime } = this.state;
    let { dropOffLocation } = this.state;
    if (sameLocation) dropOffLocation = pickupLocation;
    const from = this.dateTime(fromDate, fromTime);
    const to = this.dateTime(toDate, toTime);

    if (!pickupLocation) {
      // TODO toast
      return;
    }

    if (!dropOffLocation) {
      // TODO toast
      return;
    }

    console.log('pickupLocation', pickupLocation);
    console.log('dropOffLocation', dropOffLocation);
    console.log('from', from);
    console.log('to', to);

    // TODO cars
  };

  async componentDidMount() {
    this._isMounted = true;

    const language = await UserService.getLanguage();
    i18n.locale = language;
    this.setState({ init: true, language });

    Keyboard.addListener('keyboardDidShow', (e) => {
      if (this._isMounted) this.setState({ keyboardDidShow: true, keyboardHeight: e.endCoordinates.height });
    });

    Keyboard.addListener('keyboardDidHide', () => {
      if (this._isMounted) this.setState({ keyboardDidShow: false, close: true, keyboardHeight: 0 });
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const { init, close, sameLocation, fromDate, fromTime,
      toDate, toTime, pickupLocationFocus,
      keyboardDidShow, language, keyboardHeight } = this.state;

    return (
      init &&
      <RootSiblingParent>
        <View style={styles.statusBar}>
          <SafeAreaView>
            <StatusBar
              backgroundColor="#f37022"
              barStyle='light-content'
            />
          </SafeAreaView>
        </View>

        <KeyboardAvoidingView
          behavior={pickupLocationFocus ? undefined : 'padding'}
          style={styles.container}
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
                width: WINDOW_WIDTH,
                height: WINDOW_HEIGHT,
                left: 0,
                top: 0
              }}
              onPress={this.handleTouchableOpacityClick} />

            <LocationSelectList
              label={i18n.t('PICKUP_LOCATION')}
              style={styles.component}
              onSelectItem={this.handlePickupLocationSelect}
              onFetch={() => {
                this.setState({ close: false });
              }}
              onFocus={() => {
                this.setState({ pickupLocationFocus: true });
              }}
              close={close}
            />


            <DateTimePicker mode='date' language={language} style={styles.date} label={i18n.t('FROM_DATE')} value={fromDate} onChange={(date) => this.setState({ fromDate: date })} />

            <DateTimePicker mode='time' language={language} style={styles.date} label={i18n.t('FROM_TIME')} value={fromTime} onChange={(date) => this.setState({ fromTime: date })} />

            <DateTimePicker mode='date' language={language} style={styles.date} label={i18n.t('TO_DATE')} value={toDate} onChange={(date) => this.setState({ toDate: date })} />

            <DateTimePicker mode='time' language={language} style={styles.date} label={i18n.t('TO_TIME')} value={toTime} onChange={(date) => this.setState({ toTime: date })} />

            <Pressable style={styles.search} onPress={this.handleSearch} >
              <Text style={styles.searchText}>{i18n.t('SEARCH')}</Text>
            </Pressable>

            {!sameLocation &&
              <LocationSelectList
                label={i18n.t('DROP_OFF_LOCATION')}
                style={styles.component}
                onSelectItem={this.handleDropOffLocationSelect}
                onFetch={() => {
                  this.setState({ close: false });
                }}
                onFocus={() => {
                  this.setState({ pickupLocationFocus: false });
                }}
                close={close}
              />
            }

            <View style={styles.sameLocation}>
              <Switch trackColor={{ true: '#f7b68f', false: '#9d9d9d' }} thumbColor='#f37022' value={sameLocation} onValueChange={this.handleSameLocationChange} />
              <Text style={styles.sameLocationText} onPress={this.handleSameLocationPress}>{i18n.t('SAME_LOCATION')}</Text>
            </View>
          </View>

          {!keyboardDidShow &&
            <View style={styles.footer}>
              <Text style={styles.copyright}>{i18n.t('COPYRIGHT_PART1')}</Text>
              <Text style={styles.copyrightRegistered}>{i18n.t('COPYRIGHT_PART2')}</Text>
              <Text style={styles.copyright}>{i18n.t('COPYRIGHT_PART3')}</Text>
            </View>
          }

          <ExpoStatusBar style='auto' />
        </KeyboardAvoidingView>
      </RootSiblingParent>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    zIndex: 1,
    elevation: Helper.android() ? 1 : 0,
  },
  statusBar: {
    backgroundColor: '#f37022',
    height: STATUS_BAR_HEIGHT,
    zIndex: 2,
    elevation: Helper.android() ? 2 : 0
  },
  contentContainer: {
    alignItems: 'center'
  },
  logo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10
  },
  logoMain: {
    color: '#f37022',
    fontSize: 60,
    fontWeight: '700'
  },
  logoRegistered: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f37022',
    marginTop: 20
  },
  component: {
    alignSelf: 'stretch',
    marginTop: 7,
    marginRight: 10,
    marginBottom: 7,
    marginLeft: 10
  },
  date: {
    alignSelf: 'stretch',
    marginTop: 7,
    marginRight: 10,
    marginBottom: 7,
    marginLeft: 10
  },
  search: {
    borderWidth: 0,
    borderRadius: 10,
    height: 50,
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: '#f37022',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10
  },
  searchText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    textTransform: 'uppercase'
  },
  sameLocation: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    // margin: 10,
    paddingBottom: 10,
    display: 'flex',
    alignItems: 'center'
  },
  sameLocationText: {
    color: 'rgba(0, 0, 0, .7)',
    fontSize: 13,
    fontWeight: '400',
    padding: 5
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 50,
    display: 'none',
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
    fontSize: 10,
    color: '#70757a',
    position: 'relative',
    top: -5
  }
});

export default App;