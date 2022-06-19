import React from 'react';
import {
    Backdrop,
    CircularProgress
} from '@mui/material';

export default function SimpleBackdrop(props) {

    return (
        <div>
            <Backdrop
                open
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                {props.text}
                {props.progress ? <CircularProgress color="inherit" /> : null}
            </Backdrop>
        </div>
    );
}