import React, { Component } from 'react';
import { Text } from 'react-native';
import Env from '../config/env.config';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import i18n from '../lang/i18n';
import Helper from '../common/Helper';
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
            fetch: false,
            page: 1,
            keyword: '',
            selectedOptions: [],
            rowCount: 0,
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
                this.setState({ rows: _rows, loading: false, fetch: _data.resultData.length > 0 });
            })
            .catch((err) => {
                console.log(err);
                // TODO
                // toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                // TODO AsyncStorage toast + console.log
            });
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { selectedItem } = prevState;

        if (nextProps.selectedItem != selectedItem) {
            return { selectedItem: nextProps.selectedItem };
        }

        return null;
    }

    componentDidMount() {
        this.fetch();
    }

    render() {
        const { loading, rows, selectedItem } = this.state;

        return (
            <AutocompleteDropdown
                containerStyle={this.props.style}
                initialValue={(selectedItem && selectedItem.id) || ''}
                onSelectItem={item => {
                    item && this.setSelectedItem(item.id)
                }}
                loading={loading}
                useFilter={false} // set false to prevent rerender twice
                dataSet={rows}
                onChangeText={this.onChangeText}
                textInputProps={{
                    placeholder: this.props.label || '',
                    autoCorrect: false,
                    autoCapitalize: 'none',
                    style: {
                        borderRadius: 25,
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
                    borderRadius: 25,
                    height: 60
                }}
                suggestionsListContainerStyle={{
                    marginTop: 15
                }}
                renderItem={(item, text) => <Text style={{ padding: 15 }}>{item.title}</Text>}
                inputHeight={50}
                showChevron={true}
                closeOnBlur={false}
                clearOnFocus={false}
                closeOnSubmit={false}
            />
        );
    }
}

export default LocationSelectList;