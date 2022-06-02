import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { StatusBar } from 'expo-status-bar';
import LocationSelectList from './elements/LocationSelectList';
import i18n from './lang/i18n';
import UserService from './services/UserService';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      init: false,
      pickupLocation: null,
      close: false
    };
  }

  handlePickupLocationSelect = (pickupLocation) => {
    console.log(pickupLocation);
    this.setState({ pickupLocation })
  };

  handleTouchableOpacityClick = () => {
    this.setState({ close: true });
  };

  async componentDidMount() {
    const language = await UserService.getLanguage();
    i18n.locale = language;
    this.setState({ init: true });
  }

  render() {
    const { init, close } = this.state;

    return (
      init &&
      <RootSiblingParent>
        <View style={styles.container}>
          <Text style={styles.logo}>BookCars</Text>
          <TouchableOpacity
            style={{
              position: "absolute",
              backgroundColor: "rgba(0, 0, 0, 0)",
              opacity: 0,
              width: Dimensions.get('window').width,
              height: Dimensions.get('window').height,
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
            close={close}
          />
          <StatusBar style="auto" />
        </View>
      </RootSiblingParent>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#f37022',
    fontSize: 70,
    fontWeight: '700'
  },
  component: {
    alignSelf: 'stretch',
    margin: 5
  }
});

export default App;