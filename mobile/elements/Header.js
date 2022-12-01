import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Avatar, Badge } from 'react-native-paper';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';

const Header = ({ title, hideTitle, loggedIn, notificationCount, reload, _avatar }) => {
    const navigation = useNavigation();
    const [avatar, setAvatar] = useState(null);

    useEffect(() => {
        async function init() {
            const currentUser = await UserService.getCurrentUser();
            if (currentUser) {
                const user = await UserService.getUser(currentUser.id);
                if (user.avatar) {
                    setAvatar(Helper.joinURL(Env.CDN_USERS, user.avatar));
                } else {
                    setAvatar(null);
                }
            }
        }

        init();
    }, [reload]);

    useEffect(() => {
        setAvatar(_avatar);
    }, [_avatar]);

    return (
        <View style={styles.container}>
            <Pressable
                hitSlop={15}
                style={styles.menu}
                onPress={() => navigation.toggleDrawer()}
            >
                <MaterialIcons name="menu" size={24} color="#fff" />
            </Pressable>
            {
                !hideTitle &&
                <View>
                    <Text style={styles.text}>{title}</Text>
                </View>
            }
            {
                loggedIn &&
                <View style={styles.actions}>
                    <Pressable
                        style={styles.notifications}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        {
                            notificationCount > 0 &&
                            <Badge style={styles.badge} size={18}>{notificationCount}</Badge>
                        }
                        <MaterialIcons name="notifications" size={24} color="#fff" style={styles.badgeIcon} />
                    </Pressable>
                    <Pressable
                        style={styles.avatar}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        {
                            avatar ?
                                <Avatar.Image size={24} source={{ uri: avatar }} />
                                : <MaterialIcons name='account-circle' size={24} color='#fff' />
                        }
                    </Pressable>
                </View>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f37022',
        elevation: 5,
        height: 50,
        display: 'flex',
        flexDirection: 'row',
        paddingLeft: 15,
        paddingRight: 15,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    text: {
        color: '#fff'
    },
    menu: {
        padding: 5
    },
    actions: {
        flexDirection: 'row'
    },
    notifications: {
        paddingTop: 5,
        paddingRight: 10,
        paddingBottom: 5,
        paddingLeft: 5
    },
    avatar: {
        marginLeft: 2,
        padding: 5
    },
    badge: {
        backgroundColor: '#1976d2',
        position: 'absolute',
        top: -2,
        right: 2,
        zIndex: 2
    },
    badgeIcon: {
        zIndex: 1
    }
});

export default Header;