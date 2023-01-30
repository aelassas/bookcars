import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator } from 'react-native';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import * as CarService from '../services/CarService';
import { MaterialIcons } from '@expo/vector-icons';
import Button from './Button';

const CarList = (props) => {
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);

    _init = async () => {
        try {
            const language = await UserService.getLanguage();
            i18n.locale = language;
            setLanguage(language);
        } catch (err) {
            Helper.error(err);
        }
    };

    useEffect(() => {
        (async function () {
            await _init();
        })();
    }, []);

    const _fetch = (page, companies, pickupLocation, fuel, gearbox, mileage, deposit) => {
        if (companies.length > 0) {
            setLoading(true);
            setFetch(true);

            const payload = { companies, pickupLocation, fuel, gearbox, mileage, deposit };

            CarService.getCars(payload, page, Env.CARS_PAGE_SIZE)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    if (_data.length === 0) _data.resultData = [];
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                    setRows(_rows);
                    setFetch(_data.resultData.length > 0);
                    if (props.onLoad) {
                        props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    Helper.error(err);
                });
        } else {
            setRows([]);
            setFetch(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (props.companies) {
            if (props.companies.length > 0) {
                _fetch(page, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit);
            } else {
                setRows([]);
                setFetch(false);
                if (props.onLoad) {
                    props.onLoad({ rows: [], rowCount: 0 });
                }
            }
        }
    }, [page, props.companies, props.pickupLocatio, props.fuel, props.gearbox, props.mileage, props.deposit]);

    useEffect(() => {
        setPage(1);
    }, [props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit]);

    const getExtraIcon = (extra) => (
        extra === -1 ? 'clear' : extra === 0 ? 'check' : 'info'
    );

    const getExtraColor = (extra) => (
        extra === 0 ? '#1f9201' : extra === -1 ? '#f44336' : 'rgba(0, 0, 0, 0.35)'
    );

    const fr = language === Env.LANGUAGE.FR;
    const iconSize = 24;
    const iconColor = '#000';

    return (
        <View style={styles.container}>
            {(props.from && props.to) &&
                <FlatList
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    contentContainerStyle={styles.contentContainer}
                    style={styles.flatList}
                    data={rows}
                    renderItem={({ item: car, index }) => (
                        <View key={car._id} style={styles.carContainer}>
                            <View style={styles.car}>
                                <Text style={styles.name}>{car.name}</Text>

                                <View style={styles.imgView}>
                                    <Image style={styles.img} source={{ uri: Helper.joinURL(Env.CDN_CARS, car.image) }} />
                                </View>

                                <View style={styles.infos}>
                                    <View style={styles.info}>
                                        <MaterialIcons name='local-gas-station' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                        <Text style={styles.text}>{Helper.getCarTypeShort(car.type)}</Text>
                                    </View>
                                    <View style={styles.info}>
                                        <MaterialIcons name='account-tree' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                        <Text style={styles.text}>{Helper.getGearboxTypeShort(car.gearbox)}</Text>
                                    </View>
                                    <View style={styles.info}>
                                        <MaterialIcons name='person' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                        <Text style={styles.text}>{car.seats}</Text>
                                    </View>
                                    <View style={styles.info}>
                                        <Image source={require('../assets/car-door.png')} style={{ ...styles.infoIcon, width: 20, height: 20 }} />
                                        <Text style={styles.text}>{car.doors}</Text>
                                    </View>
                                    {car.aircon &&
                                        <View style={styles.info}>
                                            <MaterialIcons name='ac-unit' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                        </View>
                                    }
                                </View>

                                <View style={styles.infos}>
                                    <MaterialIcons name='directions-car' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                    <Text style={styles.text}>{`${i18n.t('MILEAGE')}${fr ? ' : ' : ': '}${Helper.getMileage(car.mileage)}`}</Text>
                                </View>

                                <View style={styles.infos}>
                                    <MaterialIcons name='local-gas-station' size={iconSize} color={iconColor} style={styles.infoIcon} />
                                    <Text style={styles.text}>{`${i18n.t('FUEL_POLICY')}${fr ? ' : ' : ': '}${Helper.getFuelPolicy(car.fuelPolicy)}`}</Text>
                                </View>

                                <View style={styles.extras}>
                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.cancellation)}
                                            color={getExtraColor(car.cancellation)}
                                            size={iconSize}
                                            style={styles.infoIcon}
                                        />
                                        <Text style={styles.text}>{Helper.getCancellation(car.cancellation, fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.amendments)}
                                            color={getExtraColor(car.amendments)}
                                            size={iconSize}
                                            style={styles.infoIcon}
                                        />
                                        <Text style={styles.text}>{Helper.getAmendments(car.amendments, fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.theftProtection)}
                                            color={getExtraColor(car.theftProtection)}
                                            size={iconSize}
                                            style={styles.infoIcon}
                                        />
                                        <Text style={styles.text}>{Helper.getTheftProtection(car.theftProtection, fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.collisionDamageWaiver)}
                                            color={getExtraColor(car.collisionDamageWaiver)}
                                            size={iconSize}
                                            style={styles.infoIcon}
                                        />
                                        <Text style={styles.text}>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.fullInsurance)}
                                            color={getExtraColor(car.fullInsurance)}
                                            size={iconSize}
                                            style={styles.infoIcon}
                                        />
                                        <Text style={styles.text}>{Helper.getFullInsurance(car.fullInsurance, fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <MaterialIcons
                                            name={getExtraIcon(car.additionalDriver)}
                                            color={getExtraColor(car.additionalDriver)}
                                            size={iconSize}
                                            style={styles.infoIcon} />
                                        <Text style={styles.text}>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</Text>
                                    </View>
                                </View>

                                <View style={styles.footer}>
                                    <View style={styles.company}>
                                        <Image style={styles.companyImg} source={{ uri: Helper.joinURL(Env.CDN_USERS, car.company.avatar) }} />
                                        <Text style={styles.companyText}>{car.company.fullName}</Text>
                                    </View>

                                    <View style={styles.price}>
                                        <Text style={styles.priceSecondary}>{Helper.getDays(Helper.days(props.from, props.to))}</Text>
                                        <Text style={styles.pricePrimary}>{`${Helper.price(car, props.from, props.to)} ${i18n.t('CURRENCY')}`}</Text>
                                        <Text style={styles.priceSecondary}>{`${i18n.t('PRICE_PER_DAY')} ${car.price} ${i18n.t('CURRENCY')}`}</Text>
                                    </View>
                                </View>

                                <View style={styles.buttonContainer}>
                                    <Button style={styles.button} label={i18n.t('BOOK')} onPress={() => {
                                        const params = { car: car._id, pickupLocation: props.pickupLocation, dropOffLocation: props.dropOffLocation, from: props.from.getTime(), to: props.to.getTime() };
                                        props.navigation.navigate('CreateBooking', params);
                                    }} />
                                </View>
                            </View>
                        </View>
                    )}
                    keyExtractor={(item, index) => item._id}
                    onEndReachedThreshold={0.5}
                    onEndReached={({ distanceFromEnd }) => {
                        if (distanceFromEnd >= 0 && fetch) {
                            setPage(page + 1);
                        }
                    }}
                    ListHeaderComponent={props.header}
                    ListFooterComponent={fetch && <ActivityIndicator size='large' color='#f37022' style={styles.indicator} />}
                    ListEmptyComponent={
                        !loading &&
                        <View style={styles.container}>
                            <Text style={styles.text}>{i18n.t('EMPTY_CAR_LIST')}</Text>
                        </View>
                    }
                    refreshing={loading}
                />
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    contentContainer: {
        alignSelf: 'stretch',
        paddingTop: 10,
        paddingBottom: 10,
    },
    flatList: {
        alignSelf: 'stretch',
    },
    indicator: {
        margin: 10
    },
    carContainer: {
        marginRight: 7,
        marginLeft: 7,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    car: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#fff',
        paddingTop: 20,
        paddingRight: 10,
        paddingBottom: 20,
        paddingLeft: 10,
        borderWidth: 1,
        borderColor: '#d9d8d9',
        borderRadius: 5,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center'
    },
    imgView: {
        width: '100%',
        height: Env.CAR_IMAGE_HEIGHT,
        alignItems: 'center'
    },
    img: {
        width: Env.CAR_IMAGE_WIDTH,
        height: Env.CAR_IMAGE_HEIGHT,
    },
    infos: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        width: 60,
        padding: 2,
        marginLeft: 5
    },
    infoIcon: {
        marginRight: 4
    },
    text: {
        color: '#333',
        fontSize: 12
    },
    extras: {
        alignSelf: 'stretch',
        marginTop: 10
    },
    extra: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    footer: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        alignItems: 'flex-end',
        marginBottom: 10
    },
    company: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    },
    companyImg: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT,
    },
    companyText: {
        color: '#a1a1a1',
        fontSize: 12,
        marginLeft: 5
    },
    price: {
        flex: 2,
        alignSelf: 'stretch',
        alignItems: 'flex-end',
        marginTop: 20
    },
    pricePrimary: {
        fontSize: 22,
        fontWeight: '700',
        color: '#383838',
        lineHeight: 28
    },
    priceSecondary: {
        fontSize: 13,
        color: '#a1a1a1',
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: '100%',
        marginTop: 10,
    },
});

export default CarList;