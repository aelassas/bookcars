import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Env from '../config/env.config';
import { AutocompleteDropdown } from './AutocompleteDropdown/AutocompleteDropdown'
import { MaterialIcons } from '@expo/vector-icons';
import * as LocationService from '../services/LocationService';
import * as Helper from '../common/Helper';

const LocationSelectList = (props) => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [selectedItem, setSelectedItem] = useState([]);

    useEffect(() => {
        setSelectedItem(props.selectedItem);
    }, [props.selectedItem]);

    const _setSelectedItem = (selectedItem) => {
        setSelectedItem(selectedItem);

        if (props.onSelectItem) {
            props.onSelectItem(selectedItem);
        }
    };

    const onChangeText = (text) => {
        _fetch(text);
    };

    const _fetch = (text) => {
        setLoading(true);

        LocationService.getLocations(text, 1, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const _rows = _data.resultData.map(location => ({
                    id: location._id,
                    title: location.name
                }));
                setRows(_rows);
                if (props.onFetch) {
                    props.onFetch();
                }
                setLoading(false);
            })
            .catch((err) => {
                Helper.error(err);
            });
    };

    const small = props.size === 'small';

    return (
        <View style={{ ...props.style, ...styles.container }}>
            <Text style={{
                display: selectedItem !== null ? 'flex' : 'none',
                backgroundColor: props.backgroundColor ?? '#fafafa',
                color: 'rgba(0, 0, 0, 0.6)',
                fontSize: 12,
                fontWeight: '400',
                paddingRight: 5,
                paddingLeft: 5,
                marginLeft: 15,
                position: 'absolute',
                top: -8,
                zIndex: 1,
            }}>{props.label}</Text>
            <AutocompleteDropdown
                blur={props.blur}
                initialValue={(selectedItem && selectedItem.id) || ''}
                loading={loading}
                useFilter={false} // set false to prevent rerender twice
                dataSet={rows}
                onSelectItem={item => {
                    item && _setSelectedItem(item.id)
                }}
                onChangeText={(text) => {
                    onChangeText(text);
                    if (props.onChangeText) props.onChangeText(text);
                }}
                onClear={() => {
                    _setSelectedItem(null);
                }}
                onFocus={() => {
                    if (props.onFocus) props.onFocus();
                }}
                textInputProps={{
                    placeholder: props.label || '',
                    placeholderTextColor: 'rgba(0, 0, 0, 0.6)',
                    autoCorrect: false,
                    autoCapitalize: 'none',
                    style: {
                        borderRadius: 10,
                        paddingLeft: 15,
                        fontSize: small ? 14 : 16,
                    }
                }}
                rightButtonsContainerStyle={{
                    right: 8,
                    height: 30,
                    alignSelf: 'center',
                }}
                inputContainerStyle={{
                    backgroundColor: props.backgroundColor ?? '#fafafa',
                    color: 'rgba(0, 0, 0, 0.87)',
                    borderColor: 'rgba(0, 0, 0, 0.23)',
                    borderWidth: 1,
                    borderRadius: 10,
                }}
                suggestionsListContainerStyle={{
                    display: props.close ? 'none' : 'flex'
                }}
                renderItem={(item, text) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="location-on" size={23} style={{ marginLeft: 5 }} />
                        <Text style={{ paddingTop: 15, paddingRight: 5, paddingBottom: 15, paddingLeft: 5 }}>{item.title}</Text>
                    </View>
                )}
                inputHeight={small ? 37 : 55}
                showChevron={false}
                showClear={selectedItem !== null}
                closeOnBlur={true}
                clearOnFocus={false}
                closeOnSubmit={true}
                EmptyResultComponent={<></>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        maxWidth: 480
    }
});

export default LocationSelectList;