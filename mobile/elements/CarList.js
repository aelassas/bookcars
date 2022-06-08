import React, { Component } from 'react';
import { StyleSheet, Dimensions, Text, View, Image, FlatList, ActivityIndicator } from 'react-native';
import CompanyService from '../services/CompanyService';
import Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import CarService from '../services/CarService';
import { MaterialIcons } from '@expo/vector-icons';
import Button from './Button';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

Dimensions.addEventListener('change', (e) => {
    const { width } = e.window;
})

class CarList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            companies: [],
            init: false,
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            rowCount: 0,
            page: 1,
            size: Env.CARS_PAGE_SIZE,
            carId: '',
            carIndex: -1,
            from: props.from,
            to: props.to,
            days: 0,
            pickupLocation: props.pickupLocation,
            dropOffLocation: props.dropOffLocation,
            fuel: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
            gearbox: [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL],
            mileage: [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED],
            deposit: -1,
            cars: [],
            windowWidth: Dimensions.get('window').width
        };
    }

    _init = async () => {
        try {
            this.setState({ init: false });
            const language = await UserService.getLanguage();
            i18n.locale = language;
            const allCompanies = await CompanyService.getAllCompanies();
            const companies = allCompanies.map(c => c._id);
            this.setState({ language, allCompanies, companies, init: true });
            Dimensions.addEventListener('change', (e) => {
                const { width: windowWidth } = e.window;
                this.setState({ windowWidth });
            })
        } catch (err) {
            Helper.error(err);
        }
    };

    fetch = () => {
        const { page, size, companies, pickupLocation, rows, fuel, gearbox, mileage, deposit } = this.state;

        this.setState({ loading: true });

        const payload = { companies, pickupLocation, fuel, gearbox, mileage, deposit };

        CarService.getCars(payload, page, size)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, rowCount: totalRecords, loading: false, fetch: _data.resultData.length > 0 }, () => {
                    if (page === 1) {
                        //document.querySelector('div.cars').scrollTo(0, 0);
                    }
                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                });
            })
            .catch((err) => Helper.error(err));
    };

    async componentDidMount() {
        await this._init();
        this.fetch();
    }

    render() {
        const { init, rows, loading, language, from, to, days, pickupLocation, dropOffLocation, page, fetch, windowWidth } = this.state;
        const fr = language === Env.LANGUAGE.FR;
        const iconSize = 24;
        const iconColor = '#000';
        const availableColor = '#1f9201';
        const unavailableColor = '#f44336';

        return (
            init &&
            <View style={styles.container}>
                {rows.length === 0 ?
                    !loading && !this.props.loading &&
                    <View>
                        <Text style={styles.text}>{i18n.t('EMPTY_CAR_LIST')}</Text>
                    </View>
                    :
                    (((from && to) || this.props.hidePrice) &&
                        <FlatList
                            contentContainerStyle={styles.contentContainer}
                            style={styles.flatList}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            data={rows}
                            renderItem={({ item: car, index }) => {
                                return (
                                    <View key={car._id} style={{ ...styles.car, width: windowWidth - 4 }}>
                                        <Text style={styles.name}>{car.name}</Text>

                                        <View style={styles.imgView}>
                                            <View style={styles.imgContainer}>
                                                <Image style={styles.img} source={{ uri: Helper.joinURL(Env.CDN_CARS, car.image) }} />
                                            </View>
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
                                                    name={car.cancellation > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.cancellation > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getCancellation(car.cancellation, fr)}</Text>
                                            </View>

                                            <View style={styles.extra}>
                                                <MaterialIcons
                                                    name={car.amendments > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.amendments > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getAmendments(car.amendments, fr)}</Text>
                                            </View>

                                            <View style={styles.extra}>
                                                <MaterialIcons
                                                    name={car.theftProtection > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.theftProtection > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getTheftProtection(car.theftProtection, fr)}</Text>
                                            </View>

                                            <View style={styles.extra}>
                                                <MaterialIcons
                                                    name={car.collisionDamageWaiver > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.collisionDamageWaiver > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</Text>
                                            </View>

                                            <View style={styles.extra}>
                                                <MaterialIcons
                                                    name={car.fullInsurance > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.fullInsurance > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getFullInsurance(car.fullInsurance, fr)}</Text>
                                            </View>

                                            <View style={styles.extra}>
                                                <MaterialIcons
                                                    name={car.additionalDriver > -1 ? 'check' : 'clear'}
                                                    size={iconSize}
                                                    color={car.additionalDriver > -1 ? availableColor : unavailableColor}
                                                    style={styles.infoIcon} />
                                                <Text style={styles.text}>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.footer}>
                                            <View style={styles.company}>
                                                <View style={styles.companyImgView}>
                                                    <View style={styles.companyImgContainer}>
                                                        <Image style={styles.companyImg} source={{ uri: Helper.joinURL(Env.CDN_USERS, car.company.avatar) }} />
                                                    </View>
                                                </View>
                                                <Text style={styles.companyText}>{car.company.fullName}</Text>
                                            </View>

                                            <View style={styles.price}>
                                                <Text style={styles.priceSecondary}>{Helper.getDays(Helper.days(from, to))}</Text>
                                                <Text style={styles.pricePrimary}>{`${Helper.price(car, from, to)} ${i18n.t('CURRENCY')}`}</Text>
                                                <Text style={styles.priceSecondary}>{`${i18n.t('PRICE_PER_DAY')} ${car.price} ${i18n.t('CURRENCY')}`}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.buttonContainer}>
                                            <Button style={styles.button} label={i18n.t('BOOK')} onPress={() => {
                                                // TODO
                                                const params = { car: car._id, pickupLocation, dropOffLocation, from: from.getTime(), to: to.getTime() };
                                                console.log(params);
                                            }} />
                                        </View>
                                    </View>
                                );
                            }}
                            keyExtractor={(item, index) => item._id.toString()}
                            onEndReached={() => {
                                if (fetch) {
                                    this.setState({ page: page + 1 }, () => {
                                        this.fetch();
                                    });
                                }
                            }}
                            onEndReachedThreshold={0.1}
                            ListHeaderComponent={<></>}
                            ListFooterComponent={fetch && <ActivityIndicator size='large' color='#f37022' style={styles.indicator} />}
                            refreshing={loading}
                        />
                    )
                }
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    contentContainer: {
        alignItems: 'center'
    },
    flatList: {
        paddingTop: 5,
        alignSelf: 'stretch'
    },
    indicator: {
        margin: 10
    },
    car: {
        backgroundColor: '#fff',
        maxWidth: 480,
        height: 750,
        paddingTop: 20,
        paddingRight: 10,
        paddingBottom: 20,
        paddingLeft: 10,
        marginRight: 2,
        marginLeft: 2,
        marginBottom: 10,
        justifyContent: 'center',
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
    imgContainer: {
        width: Env.CAR_IMAGE_WIDTH,
        height: Env.CAR_IMAGE_HEIGHT,
    },
    img: {
        flex: 1,
        width: null,
        height: null,
        maxWidth: Env.CAR_IMAGE_WIDTH,
        maxHeight: Env.CAR_IMAGE_HEIGHT,
        resizeMode: 'contain',
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
    companyImgView: {
        height: Env.COMPANY_IMAGE_HEIGHT,
        width: Env.COMPANY_IMAGE_WIDTH,
        alignItems: 'center',
    },
    companyImgContainer: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT,
    },
    companyImg: {
        flex: 1,
        width: null,
        height: null,
        maxWidth: Env.COMPANY_IMAGE_WIDTH,
        maxHeight: Env.COMPANY_IMAGE_HEIGHT,
        resizeMode: 'contain',
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
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: '100%',
        marginTop: 10,
    },
});

export default CarList;