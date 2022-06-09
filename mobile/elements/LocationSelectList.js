import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Env from '../config/env.config';
import { AutocompleteDropdown } from './AutocompleteDropdown/AutocompleteDropdown'
import { MaterialIcons } from '@expo/vector-icons';

import i18n from '../lang/i18n';
import LocationService from '../services/LocationService';
import Helper from '../common/Helper';

class LocationSelectList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            init: false,
            loading: false,
            rows: [],
            rowCount: 0,
            fetch: false,
            page: 1,
            text: '',
            selectedItem: null
        };
    }

    setSelectedItem = (selectedItem) => {
        this.setState({ selectedItem });

        if (this.props.onSelectItem) {
            this.props.onSelectItem(selectedItem);
        }
    };

    onChangeText = (text) => {
        this.setState({ text }, () => this.fetch());
    };

    fetch = () => {
        const { rows, text, page } = this.state;
        this.setState({ loading: true });

        LocationService.getLocations(text, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const _rows = page === 1 ? _data.resultData.map(location => ({
                    id: location._id,
                    title: location.name
                })) : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, loading: false, fetch: _data.resultData.length > 0 }, () => {
                    if (this.props.onFetch) {
                        this.props.onFetch();
                    }
                });
            })
            .catch((err) => {
                console.log(err);
                Helper.toast(i18n.t('GENERIC_ERROR'));
            });
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { selectedItem } = prevState;

        if (nextProps.selectedItem != selectedItem) {
            return { selectedItem: nextProps.selectedItem };
        }

        return null;
    }

    render() {
        const { loading, rows, selectedItem } = this.state;

        return (
            <View style={{ ...this.props.style, ...styles.container }}>
                <Text style={{
                    display: selectedItem !== null ? undefined : 'none',
                    backgroundColor: this.props.backgroundColor ?? '#fafafa',
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: 12,
                    fontWeight: '400',
                    paddingRight: 5,
                    paddingLeft: 5,
                    marginLeft: 15,
                    position: 'absolute',
                    top: -8,
                    zIndex: 1,
                }}>{this.props.label}</Text>
                <AutocompleteDropdown
                    blur={this.props.blur}
                    initialValue={(selectedItem && selectedItem.id) || ''}
                    loading={loading}
                    useFilter={false} // set false to prevent rerender twice
                    dataSet={rows}
                    onSelectItem={item => {
                        item && this.setSelectedItem(item.id)
                    }}
                    onChangeText={(text) => {
                        this.onChangeText(text);
                        if (this.props.onChangeText) this.props.onChangeText(text);
                    }}
                    onClear={() => {
                        this.setSelectedItem(null);
                    }}
                    onFocus={() => {
                        if (this.props.onFocus) this.props.onFocus();
                    }}
                    textInputProps={{
                        placeholder: this.props.label || '',
                        placeholderTextColor: 'rgba(0, 0, 0, 0.6)',
                        autoCorrect: false,
                        autoCapitalize: 'none',
                        style: {
                            borderRadius: 10,
                            paddingLeft: 18,
                        }
                    }}
                    rightButtonsContainerStyle={{
                        right: 8,
                        height: 30,
                        alignSelf: 'center',
                    }}
                    inputContainerStyle={{
                        borderRadius: 10,
                        backgroundColor: this.props.backgroundColor ?? '#fafafa',
                        color: 'rgba(0, 0, 0, 0.87)',
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                        borderWidth: 1
                    }}
                    suggestionsListContainerStyle={{
                        display: this.props.close ? 'none' : undefined
                    }}
                    renderItem={(item, text) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="location-on" size={23} style={{ marginLeft: 5 }} />
                            <Text style={{ paddingTop: 15, paddingRight: 5, paddingBottom: 15, paddingLeft: 5 }}>{item.title}</Text>
                        </View>
                    )}
                    inputHeight={55}
                    showChevron={false}
                    showClear={selectedItem !== null}
                    closeOnBlur={true}
                    clearOnFocus={false}
                    closeOnSubmit={true}
                    EmptyResultComponent={<></>}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        maxWidth: 480
    }
});

export default LocationSelectList;