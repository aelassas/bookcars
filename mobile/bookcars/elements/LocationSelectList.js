import React, { Component } from 'react';
import { Text } from 'react-native';
import Env from '../config/env.config';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import Toast from 'react-native-root-toast';
import i18n from '../lang/i18n';
import LocationService from '../services/LocationService';

import Feather from 'react-native-vector-icons/Feather'
Feather.loadFont();

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
            <AutocompleteDropdown
                containerStyle={this.props.style}
                initialValue={(selectedItem && selectedItem.id) || ''}
                loading={loading}
                useFilter={false} // set false to prevent rerender twice
                dataSet={rows}
                onSelectItem={item => {
                    item && this.setSelectedItem(item.id)
                }}
                onChangeText={this.onChangeText}
                onClear={() => {
                    this.setSelectedItem(null);
                }
                }
                textInputProps={{
                    placeholder: this.props.label || '',
                    placeholderTextColor: 'rgba(0, 0, 0, 0.6)',
                    autoCorrect: false,
                    autoCapitalize: 'none',
                    style: {
                        borderRadius: 25,
                        paddingLeft: 18,
                    }
                }}
                rightButtonsContainerStyle={{
                    right: 8,
                    height: 30,
                    alignSelf: 'center',
                }}
                inputContainerStyle={{
                    borderRadius: 25
                }}
                suggestionsListContainerStyle={{
                    display: this.props.close ? 'none' : undefined
                }}
                renderItem={(item, text) => <Text style={{ padding: 15 }}>{item.title}</Text>}
                inputHeight={60}
                showChevron={false}
                showClear={selectedItem !== null}
                closeOnBlur={true}
                clearOnFocus={true}
                closeOnSubmit={true}
                EmptyResultComponent={<></>}
            />
        );
    }
}

export default LocationSelectList;