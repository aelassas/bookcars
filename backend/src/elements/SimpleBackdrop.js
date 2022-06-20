import React from 'react';
import {
    Backdrop,
    CircularProgress,
    Typography
} from '@mui/material';

export default function SimpleBackdrop(props) {

    return (
        <div>
            <Backdrop
                open
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                {props.progress && <CircularProgress color='inherit' sx={{ marginRight: 5 }} />}
                <Typography color='inherit' >{props.text}</Typography>
            </Backdrop>
        </div>
    );
}