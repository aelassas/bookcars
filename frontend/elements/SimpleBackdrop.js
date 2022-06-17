import React from 'react';
import {
    Backdrop,
    CircularProgress
} from '@mui/material';

export default function SimpleBackdrop(props) {

    return (
        <div>
            <Backdrop open={true}
                sx={{
                    zIndex: 999,
                    color: '#fff'
                }}
            >
                {props.text}
                {props.progress ? <CircularProgress color="inherit" /> : null}
            </Backdrop>
        </div>
    );
}