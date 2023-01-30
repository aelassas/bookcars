import React, { useState, useEffect, useRef } from 'react';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import i18n from '../lang/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, DrawerActions } from '@react-navigation/routers';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import * as UserService from '../services/UserService';

let yOffset = 0;

const DrawerContent = (props) => {
    const [openLanguageMenu, setopenLanguageMenu] = useState(false);
    const [language, setLanguage] = useState(props.language);
    const ref = useRef();

    useEffect(() => {
        setLanguage(props.language);
    }, [props.language]);

    updateLanguage = async (language) => {
        try {
            const setLang = async (language) => {
                i18n.locale = language;
                await UserService.setLanguage(language);
                setLanguage(language);
                const route = props.state.routes[props.index];
                props.navigation.navigate(route.name, { d: new Date().getTime(), ...route.params });
            };

            const currentUser = await UserService.getCurrentUser();
            if (currentUser) {
                const data = {
                    id: currentUser.id,
                    language: language
                };
                const status = await UserService.updateLanguage(data);

                if (status === 200) {
                    await setLang(language);
                } else {
                    Helper.error();
                }
            }
            else {
                await setLang(language);
            }
        } catch (err) {
            Helper.error(err);
        }
    }

    return (
        <DrawerContentScrollView
            ref={ref}
            onScroll={event => {
                yOffset = event.nativeEvent.contentOffset.y;
            }}
            onContentSizeChange={() => {
                if (ref.current) {
                    ref.current.scrollTo({ x: 0, y: yOffset, animated: false })
                }
            }}
            contentContainerStyle={styles.drawer}
            {...props}
        >
            <View forceInset={styles.drawerList}>
                {
                    props.state.routes.map((route, i) => {
                        const focused = i === props.state.index;
                        const { title, drawerLabel, drawerIcon } = props.descriptors[route.key].options;

                        const hidden = props.drawerItems.find(item => item.name === route.name).hidden;
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
                                to={props.buildLink(route.name, route.params)}
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
                {props.loggedIn &&
                    <Pressable style={styles.signout} hitSlop={15} onPress={async () => await UserService.signout(props.navigation)}>
                        <MaterialIcons style={styles.signoutIcon} name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
                        <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
                    </Pressable>
                }
            </View>

            <View style={styles.language}>
                <Pressable style={styles.languageButton} hitSlop={15} onPress={() => { setopenLanguageMenu(!openLanguageMenu) }}>
                    <MaterialIcons style={styles.languageIcon} name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
                    <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
                </Pressable>
                {openLanguageMenu &&
                    <View style={styles.languageMenu}>
                        <Pressable style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                            if (language === Env.LANGUAGE.EN) {
                                await updateLanguage(Env.LANGUAGE.FR);
                                setopenLanguageMenu(false);
                            }
                        }}>
                            <Text style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_FR')}</Text>
                        </Pressable>
                        <Pressable style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                            if (language === Env.LANGUAGE.FR) {
                                await updateLanguage(Env.LANGUAGE.EN);
                                setopenLanguageMenu(false);
                            }
                        }}>
                            <Text style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_EN')}</Text>
                        </Pressable>
                    </View>
                }
            </View>
        </DrawerContentScrollView>
    );
};

const styles = StyleSheet.create({
    drawer: {
        flexGrow: 1,
        flexDirection: 'column',
        justifyContent: 'space-between'
    },
    drawerList: {
        top: 'always',
        horizontal: 'never',
    },
    signout: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 15,
        marginBottom: 25,
        padding: 5
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
        marginBottom: 20,
        marginLeft: 15,
        marginTop: 100
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5
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

export default DrawerContent;