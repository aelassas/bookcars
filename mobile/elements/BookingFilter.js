import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import i18n from "../lang/i18n";
import * as BookingService from "../services/BookingService";
import Accordion from "./Accordion";
import Button from "./Button";
import DateTimePicker from "./DateTimePicker";
import LocationSelectList from "./LocationSelectList";
import TextInput from "./TextInput";

const BookingFilter = (props) => {
    const [init, setInit] = useState(false);
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [blur, setBlur] = useState(false);
    const [closePickupLocation, setClosePickupLocation] = useState(false);
    const [closeDropOffLocation, setCloseDropOffLocation] = useState(false);
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropOffLocation, setDropOffLocation] = useState(null);
    const [keyword, setKeyword] = useState('');
    const searchRef = useRef(null);

    const _init = async () => {
        setInit(false);
        const minDate = await BookingService.minDate(props.driver);
        setFrom(new Date(minDate));
        const maxDate = await BookingService.maxDate(props.driver);
        setTo(new Date(maxDate));
        setKeyword('');
        setPickupLocation(null);
        setDropOffLocation(null);
        if (searchRef.current) searchRef.current.clear();
        setInit(true);
    };

    useEffect(() => {
        _init();
    }, []);

    const blurLocations = () => {
        setBlur(true);
        setClosePickupLocation(true);
        setCloseDropOffLocation(true);
    };

    const handlePickupLocationSelect = (pickupLocation) => {
        setPickupLocation(pickupLocation);
    };

    const handleDropOffLocationSelect = (dropOffLocation) => {
        setDropOffLocation(dropOffLocation)
    };

    const onPressSearch = () => {
        const filter = { from, to, pickupLocation, dropOffLocation, keyword };

        if (props.onSubmit) props.onSubmit(filter);
    };

    return (
        init && props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('SEARCH')}>

                <DateTimePicker
                    mode='date'
                    backgroundColor='#fff'
                    locale={props.language}
                    style={styles.component}
                    size='small'
                    label={i18n.t('FROM')}
                    value={from}
                    onChange={(date) => setFrom(date)}
                    onPress={blurLocations}
                />

                <DateTimePicker
                    mode='date'
                    backgroundColor='#fff'
                    locale={props.language}
                    style={styles.component}
                    size='small'
                    label={i18n.t('TO')}
                    value={to}
                    minimumDate={from}
                    onChange={(date) => setTo(date)}
                    onPress={blurLocations}
                />

                <LocationSelectList
                    backgroundColor='#fff'
                    label={i18n.t('PICKUP_LOCATION')}
                    style={styles.component}
                    size='small'
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

                <LocationSelectList
                    backgroundColor='#fff'
                    label={i18n.t('DROP_OFF_LOCATION')}
                    style={styles.component}
                    size='small'
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

                <TextInput
                    ref={searchRef}
                    backgroundColor='#fff'
                    style={styles.component}
                    size='small'
                    hideLabel
                    label={i18n.t('SEARCH_PLACEHOLDER')}
                    value={keyword}
                    onChangeText={setKeyword}
                />

                <Button
                    style={styles.component}
                    size='small'
                    label={i18n.t('SEARCH')}
                    onPress={onPressSearch}
                />

            </Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    accordion: {
        width: '100%',
        maxWidth: 480
    },
    component: {
        alignSelf: 'stretch',
        margin: 10
    },
});

export default BookingFilter;