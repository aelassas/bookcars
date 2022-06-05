import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function Header({ title, showTitle }) {
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
        }
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                <MaterialIcons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            {showTitle &&
                <View>
                    <Text style={styles.text}>{title}</Text>
                </View>
            }
        </View>
    );
}