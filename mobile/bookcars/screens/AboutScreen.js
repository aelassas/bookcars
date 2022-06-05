import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';

class About extends Component {
    render() {
        return (
            <View style={styles.container}>
                <Text style={{ fontSize: 16 }}>About!</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    }
});

export default About;