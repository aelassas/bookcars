import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge } from 'react-native-paper';

export default function Header({ title, hideTitle, loggedIn, notificationCount }) {
    const navigation = useNavigation();

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
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                >
                    {
                        notificationCount > 0 &&
                        <Badge style={styles.badge} size={18}>{notificationCount}</Badge>
                    }
                    <MaterialIcons name="notifications" size={24} color="#fff" style={styles.badgeIcon} />
                </TouchableOpacity>
            }
        </View>
    );
}