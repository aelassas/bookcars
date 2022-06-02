import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import i18n from './i18n';

import UserService from './services/UserService';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      init: false,
      selectedItem: null
    };
  }

  setSelectedItem = (selectedItem) => {
    this.setState({ selectedItem })
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
        <AutocompleteDropdown
          containerStyle={styles.component}
          clearOnFocus={false}
          closeOnBlur={true}
          closeOnSubmit={false}
          // initialValue={{ id: '2' }} // or just '2'
          onSelectItem={this.setSelectedItem}
          dataSet={[
            { id: '1', title: 'Alpha' },
            { id: '2', title: 'Beta' },
            { id: '3', title: 'Gamma' },
          ]}
          textInputProps={{
            placeholder: i18n.t('PICKUP_LOCATION'),
            autoCorrect: false,
            autoCapitalize: 'none',
            style: {
              borderRadius: 25,
              // backgroundColor: '#383b42',
              // color: '#fff',
              paddingLeft: 18,
              height: 60,
            },
          }}
          rightButtonsContainerStyle={{
            right: 8,
            height: 60,
            alignSelf: 'center',
          }}
          inputContainerStyle={{
            // backgroundColor: '#383b42',
            borderRadius: 25,
            height: 60
          }}
          suggestionsListContainerStyle={{
            // backgroundColor: '#383b42',
            marginTop: 15
          }}
          suggestionsListTextStyle={{
            // color: '#fff'
          }}
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