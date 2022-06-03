import React, { Component } from 'react';
import { View, Text } from 'react-native';
import Env from '../config/env.config';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import Toast from 'react-native-root-toast';

import i18n from '../lang/i18n';
import LocationService from '../services/LocationService';

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
            keyword: '',
            selectedItem: null
        };
    }

    setSelectedItem = (selectedItem) => {
        this.setState({ selectedItem });

        if (this.props.onSelectItem) {
            this.props.onSelectItem(selectedItem);
        }
    };

    onChangeText = (keyword) => {
        this.setState({ keyword }, () => this.fetch());
    };

    fetch = () => {
        const { rows, keyword, page } = this.state;
        this.setState({ loading: true });

        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
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
                Toast.show(i18n.t('GENERIC_ERROR'), {
                    duration: Toast.durations.LONG,
                });
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
            <View style={this.props.style}>
                <Text style={{
                    display: selectedItem !== null ? undefined : 'none',
                    backgroundColor: '#fff',
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: 12,
                    fontWeight: '400',
                    paddingRight: 5,
                    paddingLeft: 5,
                    marginLeft: 15,
                    position: 'absolute',
                    top: -7,
                    zIndex: 1,
                }}>{this.props.label}</Text>
                <AutocompleteDropdown
                    initialValue={(selectedItem && selectedItem.id) || ''}
                    loading={loading}
                    useFilter={false} // set false to prevent rerender twice
                    dataSet={rows}
                    flatListProps={{
                        // scrollEnabled: false,
                        // horizontal: true
                    }}
                    onSelectItem={item => {
                        item && this.setSelectedItem(item.id)
                    }}
                    onChangeText={this.onChangeText}
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
                        backgroundColor: '#fff',
                        color: 'rgba(0, 0, 0, 0.87)',
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                        borderWidth: 1
                    }}
                    suggestionsListContainerStyle={{
                        display: this.props.close ? 'none' : undefined
                    }}
                    renderItem={(item, text) => <Text style={{ padding: 15 }}>{item.title}</Text>}
                    inputHeight={50}
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

export default LocationSelectList;