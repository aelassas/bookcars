import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    createDrawerNavigator,
    DrawerContentScrollView,
    DrawerItemList,
    DrawerItem,
} from '@react-navigation/drawer';
import {
    CommonActions,
    DrawerActions,
    useLinkBuilder,
    useNavigation,
    useNavigationState
} from '@react-navigation/native';
import { getHeaderTitle } from '@react-navigation/elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import AboutScreen from '../screens/AboutScreen';
import ToSScreen from '../screens/ToSScreen';
import ContactScreen from '../screens/ContactScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CarsScreen from '../screens/CarsScreen';
import Header from './Header';
import UserService from '../services/UserService';
import i18n from '../lang/i18n';
import Env from '../config/env.config';
import Helper from '../common/Helper';

export default function DrawerNavigator(props) {
    const navigation = useNavigation();
    const routes = useNavigationState(state => state && state.routes);
    const index = useNavigationState(state => state && state.index);
    const [loggedIn, setLoggedIn] = useState(false);
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
    const [openLanguageMenu, setOpenLanguageMenu] = useState(false);

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
                name: 'Bookings',
                title: i18n.t('BOOKINGS'),
                iconName: 'event-seat',
                hidden: !loggedIn
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
            }
            ,
            {
                name: 'ForgotPassword',
                title: i18n.t('FORGOT_PASSWORD'),
                iconName: 'login',
                hidden: true
            }
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

    const updateLanguage = async (language) => {
        try {
            const setLang = (language) => {
                i18n.locale = language;
                UserService.setLanguage(language);
                setLanguage(language);
                const route = routes[index];
                navigation.navigate(route.name, { d: new Date().getTime() });
            };

            const currentUser = await UserService.getCurrentUser();

            if (currentUser) {
                const data = {
                    id: currentUser.id,
                    language: language
                };
                const status = await UserService.updateLanguage(data);

                if (status === 200) {
                    setLang(language);
                } else {
                    Helper.error();
                }
            }
            else {
                setLang(language);
            }
        } catch (err) {
            Helper.error(err);
        }
    };

    const buildLink = useLinkBuilder();

    const CustomDrawerContent = (props) => {
        return (
            <DrawerContentScrollView {...props} contentContainerStyle={styles.drawer}>
                <View forceInset={styles.drawerList}>
                    {/* <DrawerItemList {...props} /> */}
                    {props.state.routes.map((route, i) => {
                        const focused = i === props.state.index;
                        const { title, drawerLabel, drawerIcon } = props.descriptors[route.key].options;

                        const hidden = drawerItems.find(item => item.name === route.name).hidden;
                        if (hidden) {
                            return <View key={route.key} />
                        }

                        return (
                            <DrawerItem
                                key={route.key}
                                label={
                                    drawerLabel !== undefined
                                        ? drawerLabel
                                        : title !== undefined
                                            ? title
                                            : route.name
                                }
                                icon={drawerIcon}
                                focused={focused}
                                activeTintColor={props.activeTintColor}
                                inactiveTintColor={props.inactiveTintColor}
                                activeBackgroundColor={props.activeBackgroundColor}
                                inactiveBackgroundColor={props.inactiveBackgroundColor}
                                labelStyle={props.labelStyle}
                                style={props.itemStyle}
                                to={buildLink(route.name, route.params)}
                                onPress={() => {
                                    props.navigation.dispatch({
                                        ...(focused
                                            ? DrawerActions.closeDrawer()
                                            : CommonActions.navigate(route.name)),
                                        target: props.state.key,
                                    })
                                }}
                            />
                        )
                    })
                    }
                    {loggedIn &&
                        <TouchableOpacity style={styles.signout} onPress={() => UserService.signout(navigation)}>
                            <MaterialIcons style={styles.signoutIcon} name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
                            <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
                        </TouchableOpacity>
                    }
                </View>

                <View style={styles.language}>
                    <TouchableOpacity style={styles.languageButton} onPress={() => setOpenLanguageMenu(!openLanguageMenu)}>
                        <MaterialIcons style={styles.languageIcon} name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
                        <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
                    </TouchableOpacity>
                    {openLanguageMenu &&
                        <View style={styles.languageMenu}>
                            <TouchableOpacity style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                                if (language === Env.LANGUAGE.EN) {
                                    await updateLanguage(Env.LANGUAGE.FR);
                                    setOpenLanguageMenu(false);
                                }
                            }}>
                                <Text style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_FR')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                                if (language === Env.LANGUAGE.FR) {
                                    await updateLanguage(Env.LANGUAGE.EN);
                                    setOpenLanguageMenu(false);
                                }
                            }}>
                                <Text style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_EN')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                </View>
            </DrawerContentScrollView>
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            marginTop: insets.top
        },
        drawer: {
            flexGrow: 1,
            flexDirection: 'column',
            justifyContent: 'space-between'
        },
        drawerList: {
            top: 'always',
            horizontal: 'never'
        },
        signout: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            marginLeft: 20,
            marginBottom: 25
        },
        signoutIcon: {
            marginRight: 5
        },
        text: {
            color: 'rgba(0, 0, 0, 0.54)',
            fontWeight: '600',
            marginLeft: 25
        },
        language: {
            justifyContent: 'flex-end',
            marginBottom: 25,
            marginLeft: 20
        },
        languageButton: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        languageIcon: {
            marginRight: 5
        },
        languageMenu: {
            position: 'absolute',
            bottom: 35,
            right: 10,
            width: '100%',
            borderRadius: 7,
        },
        languageMenuItem: {
            width: '100%',
            height: 43,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
        },
        languageMenuText: {
            color: 'rgba(0, 0, 0, 0.54)',
            fontWeight: '600',
            marginLeft: 25
        },
        languageMenuSelectedItem: {
            width: '100%',
            height: 43,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#feeee4',
        },
        languageMenuSelectedText: {
            color: '#f37022',
            fontWeight: '600',
            marginLeft: 25
        }
    });

    return (
        drawerItems.length > 0 &&
        <View style={styles.container}>
            <Drawer.Navigator
                drawerType='front'
                initialRouteName='Home'
                backBehavior='history'
                screenOptions={{
                    drawerActiveTintColor: '#f37022'
                }}
                drawerContent={(props) => <CustomDrawerContent {...props} activeBackgroundColor='#feeee4' activeTintColor="#f37022" />}
                useLegacyImplementation
            >
                {
                    drawerItems.map(drawer => (
                        <Drawer.Screen
                            key={drawer.name}
                            name={drawer.name}
                            component={
                                drawer.name === 'Home' ? HomeScreen :
                                    drawer.name === 'Cars' ? CarsScreen :
                                        drawer.name === 'Bookings' ? BookingsScreen
                                            : drawer.name === 'About' ? AboutScreen
                                                : drawer.name === 'ToS' ? ToSScreen
                                                    : drawer.name === 'Contact' ? ContactScreen
                                                        : drawer.name === 'SignIn' ? SignInScreen
                                                            : drawer.name === 'SignUp' ? SignUpScreen
                                                                : drawer.name === 'ForgotPassword' ? ForgotPasswordScreen
                                                                    : null
                            }
                            options={{
                                title: drawer.title,
                                drawerItemStyle: {
                                    height: (drawer.hidden
                                        || (drawer.name === 'SignIn' && loggedIn)
                                        || (drawer.name === 'Bookings' && !loggedIn)) ? 0 : 'auto'
                                },
                                drawerIcon: ({ focused }) =>
                                    <MaterialIcons
                                        name={drawer.iconName}
                                        size={24}
                                        // color={focused ? 'rgba(0, 0, 0, 0.84)' : 'rgba(0, 0, 0, 0.54)'}
                                        color='rgba(0, 0, 0, 0.54)'
                                    />
                                ,
                                headerShown: true,
                                header: ({ navigation, route, options }) => {
                                    const title = getHeaderTitle(options, route.name);

                                    return (
                                        <Header title={title} hideTitle={drawer.hideTitle} />
                                    );
                                }
                            }}
                        />

                    ))
                }
            </Drawer.Navigator>
        </View>
    );
}