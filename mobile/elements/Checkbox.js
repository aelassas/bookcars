import { Pressable } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

export default function Checkbox({ indeterminate, checked, onChange }) {

    return (
        <Pressable onPress={() => {
            if (onChange) {
                onChange(!checked);
            }
        }}>
            <MaterialIcons
                name={
                    indeterminate ? 'indeterminate-check-box'
                        : checked ? 'check-box'
                            : 'check-box-outline-blank'
                }
                size={24}
                color={indeterminate || checked ? '#1976d2' : '#606264'} />
        </Pressable>
    );
}