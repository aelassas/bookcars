import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LocationSelectList from './elements/LocationSelectList';
import i18n from './lang/i18n';
import UserService from './services/UserService';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      init: false,
      selectedItem: null
    };
  }

  handlePickupLocationSelect = (location) => {
    console.log(location);
  };

  async componentDidMount() {
    const language = await UserService.getLanguage();
    i18n.locale = language;
    this.setState({ init: true });
  }

  render() {
    const { init } = this.state;

    return (
      init &&
      <View style={styles.container}>
        <Text style={styles.logo}>BookCars</Text>
        <LocationSelectList
          label={i18n.t('PICKUP_LOCATION')}
          style={styles.component}
          onSelectItem={this.handlePickupLocationSelect}
        />
        <StatusBar style="auto" />
      </View>
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