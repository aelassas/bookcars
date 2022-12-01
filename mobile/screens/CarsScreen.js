import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Master from './Master';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import CarList from '../elements/CarList';
import CompanyFilter from '../elements/CompanyFilter';
import FuelFilter from '../elements/FuelFilter';
import Env from '../config/env.config';
import GearboxFilter from '../elements/GearboxFilter';
import MileageFilter from '../elements/MileageFilter';
import DepositFilter from '../elements/DepositFilter';

export default function CarsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [visible, setVisible] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [fuel, setFuel] = useState([Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE]);
    const [gearbox, setGearbox] = useState([Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL]);
    const [mileage, setMileage] = useState([Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED]);
    const [deposit, setDeposit] = useState(-1);

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
        setVisible(true);
    };

    useEffect(() => {
        if (isFocused) {
            _init();
            setReload(true);
        } else {
            setVisible(false);
        }
    }, [route.params, isFocused]);

    const onLoad = (user) => {
        setReload(false);
    };

    const onLoadCompanies = (companies) => {
        setCompanies(companies);
        setLoaded(true);
    };

    const onChangeCompanies = (companies) => {
        setCompanies(companies);
    };

    const onChangeFuel = (fuel) => {
        setFuel(fuel);
    };

    const onChangeGearbox = (gearbox) => {
        setGearbox(gearbox);
    };

    const onChangeMileage = (mileage) => {
        setMileage(mileage);
    };

    const onChangeDeposit = (deposit) => {
        setDeposit(deposit);
    };

    return (
        <Master style={styles.master} onLoad={onLoad} reload={reload} navigation={navigation} route={route}>
            {visible &&
                <CarList
                    navigation={navigation}
                    companies={companies}
                    fuel={fuel}
                    gearbox={gearbox}
                    mileage={mileage}
                    deposit={deposit}
                    pickupLocation={route.params.pickupLocation}
                    dropOffLocation={route.params.dropOffLocation}
                    from={new Date(route.params.from)}
                    to={new Date(route.params.to)}
                    header={
                        <View>
                            <CompanyFilter style={styles.filter} visible onLoad={onLoadCompanies} onChange={onChangeCompanies} />
                            <FuelFilter style={styles.filter} visible={loaded} onChange={onChangeFuel} />
                            <GearboxFilter style={styles.filter} visible={loaded} onChange={onChangeGearbox} />
                            <MileageFilter style={styles.filter} visible={loaded} onChange={onChangeMileage} />
                            <DepositFilter style={styles.filter} visible={loaded} onChange={onChangeDeposit} />
                        </View>
                    }
                />
            }
        </Master>
    );
};

const styles = StyleSheet.create({
    master: {
        flex: 1
    },
    filter: {
        marginRight: 7,
        marginBottom: 10,
        marginLeft: 7
    }
});