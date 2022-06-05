import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    StatusBar,
    Dimensions
} from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { getHeaderTitle } from '@react-navigation/elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import AboutScreen from '../screens/AboutScreen';
import Header from '../components/Header';

export default function DrawerNavigator(props) {
    const Drawer = createDrawerNavigator();
    const insets = useSafeAreaInsets();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            marginTop: insets.top
        }
    });

    return (
        props.drawerItems.length > 0 &&
        <View style={styles.container}>
            <Drawer.Navigator
                drawerType='front'
                initialRouteName='Home'
                screenOptions={{
                    drawerActiveTintColor: '#f37022'
                }}
            >
                {
                    props.drawerItems.map(drawer => (
                        <Drawer.Screen
                            key={drawer.name}
                            name={drawer.name}
                            component={
                                drawer.name === 'Home' ? HomeScreen
                                    : drawer.name === 'About' ? AboutScreen
                                        : null
                            }
                            options={{
                                title: drawer.title,
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
                                        <Header title={title} showTitle={drawer.showTitle} />
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