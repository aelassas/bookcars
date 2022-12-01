import React, { Component } from 'react';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import i18n from '../lang/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, DrawerActions } from '@react-navigation/routers';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import UserService from '../services/UserService';

class DrawerContent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            openLanguageMenu: false,
            language: this.props.language
        };
    }

    updateLanguage = async (language) => {
        try {
            const setLang = async (language) => {
                i18n.locale = language;
                await UserService.setLanguage(language);
                this.setState({ language });
                const route = this.props.state.routes[this.props.index];
                this.props.navigation.navigate(route.name, { d: new Date().getTime(), ...route.params });
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

    static getDerivedStateFromProps(nextProps, prevState) {
        const { language } = prevState;

        if (language !== nextProps.language) {
            return { language: nextProps.language };
        }

        return null;
    }

    render() {
        const { openLanguageMenu, language } = this.state;

        return (
            <DrawerContentScrollView
                ref={ref => this.ref = ref}
                onScroll={event => {
                    this.y = event.nativeEvent.contentOffset.y;
                }}
                onContentSizeChange={() => {
                    this.ref.scrollTo({ x: 0, y: this.yOffset, animated: false })
                }}
                contentContainerStyle={styles.drawer}
                {...this.props}
            >
                <View forceInset={styles.drawerList}>
                    {
                        this.props.state.routes.map((route, i) => {
                            const focused = i === this.props.state.index;
                            const { title, drawerLabel, drawerIcon } = this.props.descriptors[route.key].options;

                            const hidden = this.props.drawerItems.find(item => item.name === route.name).hidden;
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
                                    activeTintColor={this.props.activeTintColor}
                                    inactiveTintColor={this.props.inactiveTintColor}
                                    activeBackgroundColor={this.props.activeBackgroundColor}
                                    inactiveBackgroundColor={this.props.inactiveBackgroundColor}
                                    labelStyle={this.props.labelStyle}
                                    style={this.props.itemStyle}
                                    to={this.props.buildLink(route.name, route.params)}
                                    onPress={() => {
                                        this.props.navigation.dispatch({
                                            ...(focused
                                                ? DrawerActions.closeDrawer()
                                                : CommonActions.navigate(route.name)),
                                            target: this.props.state.key,
                                        })
                                    }}
                                />
                            )
                        })
                    }
                    {this.props.loggedIn &&
                        <Pressable style={styles.signout} hitSlop={15} onPress={async () => await UserService.signout(this.props.navigation)}>
                            <MaterialIcons style={styles.signoutIcon} name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
                            <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
                        </Pressable>
                    }
                </View>

                <View style={styles.language}>
                    <Pressable style={styles.languageButton} hitSlop={15} onPress={() => { this.setState({ openLanguageMenu: !openLanguageMenu }) }}>
                        <MaterialIcons style={styles.languageIcon} name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
                        <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
                    </Pressable>
                    {openLanguageMenu &&
                        <View style={styles.languageMenu}>
                            <Pressable style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                                if (language === Env.LANGUAGE.EN) {
                                    await this.updateLanguage(Env.LANGUAGE.FR);
                                    this.setState({ openLanguageMenu: false });
                                }
                            }}>
                                <Text style={language === Env.LANGUAGE.FR ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_FR')}</Text>
                            </Pressable>
                            <Pressable style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedItem : styles.languageMenuItem} onPress={async () => {
                                if (language === Env.LANGUAGE.FR) {
                                    await this.updateLanguage(Env.LANGUAGE.EN);
                                    this.setState({ openLanguageMenu: false });
                                }
                            }}>
                                <Text style={language === Env.LANGUAGE.EN ? styles.languageMenuSelectedText : styles.languageMenuText}>{i18n.t('LANGUAGE_EN')}</Text>
                            </Pressable>
                        </View>
                    }
                </View>
            </DrawerContentScrollView>
        );
    }
}

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