import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Avatar, Badge } from 'react-native-paper';
import UserService from '../services/UserService';
import Helper from '../common/Helper';
import Env from '../config/env.config';

export default function Header({ title, hideTitle, loggedIn, notificationCount, reload, _avatar }) {
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
            <TouchableOpacity
                onPress={() => navigation.toggleDrawer()}
                hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            >
                <MaterialIcons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            {
                !hideTitle &&
                <View>
                    <Text style={styles.text}>{title}</Text>
                </View>
            }
            {
                loggedIn &&
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        {
                            notificationCount > 0 &&
                            <Badge style={styles.badge} size={18}>{notificationCount}</Badge>
                        }
                        <MaterialIcons name="notifications" size={24} color="#fff" style={styles.badgeIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.avatar}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        {
                            avatar ?
                                <Avatar.Image size={24} source={{ uri: avatar }} />
                                : <MaterialIcons name='account-circle' size={24} color='#fff' />
                        }
                    </TouchableOpacity>
                </View>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f37022',
        elevation: 5,
        height: 50,
        display: 'flex',
        flexDirection: 'row',
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    text: {
        color: '#fff'
    },
    signout: {
        flexDirection: 'row'
    },
    signoutIcon: {
        marginRight: 5
    },
    actions: {
        flexDirection: 'row'
    },
    avatar: {
        marginLeft: 13
    },
    badge: {
        backgroundColor: '#1976d2',
        position: 'absolute',
        top: -10,
        right: -6,
        zIndex: 2
    },
    badgeIcon: {
        zIndex: 1
    }
});