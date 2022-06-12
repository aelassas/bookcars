import React, { Component } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator } from 'react-native';
import Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import CarService from '../services/CarService';
import { MaterialIcons } from '@expo/vector-icons';
import Button from './Button';

class CarList extends Component {

    constructor(props) {
        super(props);

        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            companies: [],
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            page: 1,
            size: Env.CARS_PAGE_SIZE,
            from: props.from,
            to: props.to,
            pickupLocation: props.pickupLocation,
            dropOffLocation: props.dropOffLocation,
            fuel: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
            gearbox: [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL],
            mileage: [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED],
            deposit: -1,
            cars: []
        };
    }

    fetch = () => {
        const { page, size, companies, pickupLocation, rows, fuel, gearbox, mileage, deposit } = this.state;

        if (companies.length > 0) {
            this.setState({ loading: true, fetch: true });

            const payload = { companies, pickupLocation, fuel, gearbox, mileage, deposit };

            CarService.getCars(payload, page, size)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    if (_data.length === 0) _data.resultData = [];
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                    this.setState({ rows: _rows, rowCount: totalRecords, loading: false, fetch: _data.resultData.length > 0 }, () => {
                        if (this.props.onLoad) {
                            this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                        }
                    });
                })
                .catch((err) => Helper.error(err));
        } else {
            this.setState({ rows: [] });
        }
    };

    getExtraIcon = (extra) => (
        extra === -1 ? 'clear' : extra === 0 ? 'check' : 'info'
    )

    getExtraColor = (extra) => (
        extra === 0 ? '#1f9201' : extra === -1 ? '#f44336' : 'rgba(0, 0, 0, 0.35)'
    )

    static getDerivedStateFromProps(nextProps, prevState) {
        const { companies, fuel, gearbox, mileage, deposit } = prevState;

        if (nextProps.companies && !Helper.arrayEqual(companies, nextProps.companies)) {
            return { companies: Helper.clone(nextProps.companies) };
        }

        if (nextProps.fuel && !Helper.arrayEqual(fuel, nextProps.fuel)) {
            return { fuel: Helper.clone(nextProps.fuel) };
        }

        if (nextProps.gearbox && !Helper.arrayEqual(gearbox, nextProps.gearbox)) {
            return { gearbox: Helper.clone(nextProps.gearbox) };
        }

        if (nextProps.mileage && !Helper.arrayEqual(mileage, nextProps.mileage)) {
            return { mileage: nextProps.mileage };
        }

        if (deposit !== nextProps.deposit) {
            return { deposit: nextProps.deposit };
        }

        return null;
    }
    componentDidUpdate(prevProps, prevState) {
        const { companies, fuel, gearbox, mileage, deposit } = this.state;

        if (!Helper.arrayEqual(companies, prevState.companies)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(fuel, prevState.fuel)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(gearbox, prevState.gearbox)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(mileage, prevState.mileage)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (deposit !== prevState.deposit) {
            return this.setState({ page: 1 }, () => this.fetch());
        }
    }

    _init = async () => {
        try {
            const language = await UserService.getLanguage();
            i18n.locale = language;
            this.setState({ language });
        } catch (err) {
            Helper.error(err);
        }
    };

    async componentDidMount() {
        await this._init();
        this.fetch();
    }

    render() {
        const { rows, loading, language, from, to, pickupLocation, dropOffLocation, page, fetch } = this.state;
        const fr = language === Env.LANGUAGE.FR;
        const iconSize = 24;
        const iconColor = '#000';

        return (
            <View style={styles.container}>
                {(from && to) &&
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
                                                name={this.getExtraIcon(car.cancellation)}
                                                color={this.getExtraColor(car.cancellation)}
                                                size={iconSize}
                                                style={styles.infoIcon}
                                            />
                                            <Text style={styles.text}>{Helper.getCancellation(car.cancellation, fr)}</Text>
                                        </View>

                                        <View style={styles.extra}>
                                            <MaterialIcons
                                                name={this.getExtraIcon(car.amendments)}
                                                color={this.getExtraColor(car.amendments)}
                                                size={iconSize}
                                                style={styles.infoIcon}
                                            />
                                            <Text style={styles.text}>{Helper.getAmendments(car.amendments, fr)}</Text>
                                        </View>

                                        <View style={styles.extra}>
                                            <MaterialIcons
                                                name={this.getExtraIcon(car.theftProtection)}
                                                color={this.getExtraColor(car.theftProtection)}
                                                size={iconSize}
                                                style={styles.infoIcon}
                                            />
                                            <Text style={styles.text}>{Helper.getTheftProtection(car.theftProtection, fr)}</Text>
                                        </View>

                                        <View style={styles.extra}>
                                            <MaterialIcons
                                                name={this.getExtraIcon(car.collisionDamageWaiver)}
                                                color={this.getExtraColor(car.collisionDamageWaiver)}
                                                size={iconSize}
                                                style={styles.infoIcon}
                                            />
                                            <Text style={styles.text}>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</Text>
                                        </View>

                                        <View style={styles.extra}>
                                            <MaterialIcons
                                                name={this.getExtraIcon(car.fullInsurance)}
                                                color={this.getExtraColor(car.fullInsurance)}
                                                size={iconSize}
                                                style={styles.infoIcon}
                                            />
                                            <Text style={styles.text}>{Helper.getFullInsurance(car.fullInsurance, fr)}</Text>
                                        </View>

                                        <View style={styles.extra}>
                                            <MaterialIcons
                                                name={this.getExtraIcon(car.additionalDriver)}
                                                color={this.getExtraColor(car.additionalDriver)}
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
                                            <Text style={styles.priceSecondary}>{Helper.getDays(Helper.days(from, to))}</Text>
                                            <Text style={styles.pricePrimary}>{`${Helper.price(car, from, to)} ${i18n.t('CURRENCY')}`}</Text>
                                            <Text style={styles.priceSecondary}>{`${i18n.t('PRICE_PER_DAY')} ${car.price} ${i18n.t('CURRENCY')}`}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.buttonContainer}>
                                        <Button style={styles.button} label={i18n.t('BOOK')} onPress={() => {
                                            const params = { car: car._id, pickupLocation, dropOffLocation, from: from.getTime(), to: to.getTime() };
                                            this.props.navigation.navigate('CreateBooking', params);
                                        }} />
                                    </View>
                                </View>
                            </View>
                        )}
                        keyExtractor={(item, index) => item._id}
                        onEndReached={() => {
                            if (fetch) {
                                this.setState({ page: page + 1 }, () => {
                                    this.fetch();
                                });
                            }
                        }}
                        ListHeaderComponent={this.props.header}
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
    }
}

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