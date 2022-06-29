import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

export default function Checkbox({ indeterminate, checked, onChange }) {

    return (
        <Pressable
            onPress={() => {
                if (onChange) {
                    onChange(!checked);
                }
            }}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            style={styles.checkbox}
        >
            <MaterialIcons
                name={
                    indeterminate ? 'indeterminate-check-box'
                        : checked ? 'check-box'
                            : 'check-box-outline-blank'
                }
                size={24}
                color={indeterminate || checked ? '#1976d2' : '#606264'}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    checkbox: {
        paddingTop: 10,
        paddingBottom: 10
    }
})