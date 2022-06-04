import React, { Component } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import ReactDateTimePicker from '@react-native-community/datetimepicker';

import Helper from '../common/Helper';
import moment from 'moment';
import 'moment/locale/fr';

class DateTimePicker extends Component {

    constructor(props) {
        super(props);

        this.state = {
            show: false,
            value: this.props.value
        }
    }

    componentDidMount() {
        moment.locale(this.props.language);
    }

    render() {
        const { show, value } = this.state;
        const format = this.props.mode === 'date' ? 'dddd, D MMMM YYYY' : 'HH:mm';

        return (
            <View style={this.props.style}>
                <Text style={styles.label}>{this.props.label}</Text>
                <View style={styles.dateContainer}>
                    <Pressable
                        style={styles.dateButton}
                        onPress={() => {
                            this.setState({ show: true });

                            if (this.props.onPress) this.props.onPress();
                        }} >
                        <Text style={styles.dateText}>{Helper.capitalize(moment(value).format(format))}</Text>
                    </Pressable>
                    {show &&
                        <ReactDateTimePicker mode={this.props.mode} value={value} onChange={(event, date) => {
                            this.setState({ show: false, value: date });
                            if (this.props.onChange) this.props.onChange(date);
                        }} />
                    }
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    label: {
        backgroundColor: '#fff',
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 12,
        fontWeight: '400',
        paddingRight: 5,
        paddingLeft: 5,
        marginLeft: 15,
        position: 'absolute',
        top: -7,
        zIndex: 1
    },
    dateContainer: {
        alignSelf: 'stretch',
        height: 55,
        borderWidth: 0,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderColor: 'rgba(0, 0, 0, 0.23)',
        borderWidth: 1,
    },
    dateButton: {
        height: 55,
        alignSelf: 'stretch',
        flexDirection: 'row',
        display: 'flex',
        alignItems: 'center',
    },
    dateText: {
        color: 'rgba(0, 0, 0, 0.87)',
        fontSize: 15,
        paddingLeft: 15
    },
});

export default DateTimePicker;