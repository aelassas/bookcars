import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import {
    createDrawerNavigator
} from '@react-navigation/drawer';
import {
    useLinkBuilder,
    useNavigation,
    useNavigationState
} from '@react-navigation/native';
import { getHeaderTitle } from '@react-navigation/elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import BookingScreen from '../screens/BookingScreen';
import AboutScreen from '../screens/AboutScreen';
import ToSScreen from '../screens/ToSScreen';
import ContactScreen from '../screens/ContactScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CarsScreen from '../screens/CarsScreen';
import * as UserService from '../services/UserService';
import i18n from '../lang/i18n';
import Env from '../config/env.config';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import DrawerContent from './DrawerContent';
import CreateBookingScreen from '../screens/CreateBooking';
import NotificationsScreen from '../screens/NotificationsScreen';

const DrawerNavigator = (props) => {
    const buildLink = useLinkBuilder();
    const navigation = useNavigation();
    const routes = useNavigationState(state => state && state.routes);
    const index = useNavigationState(state => state && state.index);
    const [loggedIn, setLoggedIn] = useState(false);
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);

    const Drawer = createDrawerNavigator();
    const insets = useSafeAreaInsets();

    const drawerItems =
        [
            {
                name: 'Home',
                title: i18n.t('HOME'),
                iconName: 'home',
                hideTitle: true
            },
            {
                name: 'Cars',
                title: i18n.t('CARS'),
                iconName: 'directions-car',
                hidden: true,
                hideTitle: true
            },
            {
                name: 'CreateBooking',
                title: i18n.t('CREATE_BOOKING'),
                iconName: 'event-seat',
                hidden: true
            },
            {
                name: 'Bookings',
                title: i18n.t('BOOKINGS'),
                iconName: 'event-seat',
                hidden: !loggedIn
            },
            {
                name: 'Booking',
                title: '',
                iconName: 'event-seat',
                hidden: true,
                hideTitle: true
            },
            {
                name: 'About',
                title: i18n.t('ABOUT'),
                iconName: 'info'
            },
            {
                name: 'ToS',
                title: i18n.t('TOS'),
                iconName: 'description'
            },
            {
                name: 'Contact',
                title: i18n.t('CONTACT'),
                iconName: 'mail'
            },
            {
                name: 'Settings',
                title: i18n.t('SETTINGS'),
                iconName: 'settings',
                hidden: !loggedIn
            },
            {
                name: 'ChangePassword',
                title: i18n.t('CHANGE_PASSWORD_TITLE'),
                iconName: 'vpn-key',
                hidden: true
            },
            {
                name: 'SignIn',
                title: i18n.t('SIGN_IN_TITLE'),
                iconName: 'login',
                hidden: loggedIn
            },
            {
                name: 'SignUp',
                title: i18n.t('SIGN_UP_TITLE'),
                iconName: 'login',
                hidden: true
            },
            {
                name: 'ForgotPassword',
                title: i18n.t('FORGOT_PASSWORD'),
                iconName: 'login',
                hidden: true
            },
            {
                name: 'Notifications',
                title: '',
                iconName: 'notifications',
                hidden: true,
                hideTitle: true
            },
        ];

    useEffect(() => {
        const init = async () => {
            const loggedIn = await UserService.loggedIn();
            setLoggedIn(loggedIn);
            const language = await UserService.getLanguage();
            setLanguage(language);
        };

        init();
    }, [routes]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            marginTop: insets.top
        }
    });

    return (
        <View style={styles.container}>
            <Drawer.Navigator
                drawerType='front'
                initialRouteName='Home'
                backBehavior='history'
                screenOptions={{
                    drawerActiveTintColor: '#f37022'
                }}
                drawerContent={(props) =>
                    <DrawerContent
                        navigation={navigation}
                        routes={routes}
                        index={index}
                        drawerItems={drawerItems}
                        loggedIn={loggedIn}
                        language={language}
                        activeBackgroundColor='#feeee4'
                        activeTintColor="#f37022"
                        buildLink={buildLink}
                        {...props} />}
                useLegacyImplementation
            >
                {
                    drawerItems.map(drawer => (
                        <Drawer.Screen
                            key={drawer.name}
                            name={drawer.name}
                            component={
                                drawer.name === 'Home' ? HomeScreen
                                    : drawer.name === 'Cars' ? CarsScreen
                                        : drawer.name === 'CreateBooking' ? CreateBookingScreen
                                            : drawer.name === 'Bookings' ? BookingsScreen
                                                : drawer.name === 'Booking' ? BookingScreen
                                                    : drawer.name === 'About' ? AboutScreen
                                                        : drawer.name === 'ToS' ? ToSScreen
                                                            : drawer.name === 'Contact' ? ContactScreen
                                                                : drawer.name === 'Settings' ? SettingsScreen
                                                                    : drawer.name === 'ChangePassword' ? ChangePasswordScreen
                                                                        : drawer.name === 'SignIn' ? SignInScreen
                                                                            : drawer.name === 'SignUp' ? SignUpScreen
                                                                                : drawer.name === 'ForgotPassword' ? ForgotPasswordScreen
                                                                                    : drawer.name === 'Notifications' ? NotificationsScreen
                                                                                        : null
                            }
                            options={{
                                title: drawer.title,
                                drawerItemStyle: {
                                    height: (
                                        drawer.hidden
                                        || (drawer.name === 'SignIn' && loggedIn)
                                        || (drawer.name === 'Bookings' && !loggedIn)
                                        || (drawer.name === 'Settings' && !loggedIn)
                                    )
                                        ? 0 : 'auto'
                                },
                                drawerIcon: ({ focused }) =>
                                    <MaterialIcons
                                        name={drawer.iconName}
                                        size={24}
                                        color='rgba(0, 0, 0, 0.54)'
                                    />
                                ,
                                headerShown: false,
                                // header: ({ navigation, route, options }) => {
                                //     const title = getHeaderTitle(options, route.name);

                                //     return (
                                //         <Header title={title} hideTitle={drawer.hideTitle} loggedIn={loggedIn} />
                                //     );
                                // }
                            }}
                        />

                    ))
                }
            </Drawer.Navigator>
        </View>
    );
};

export default DrawerNavigator;