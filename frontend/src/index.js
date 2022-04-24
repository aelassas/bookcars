import React from 'react';
import ReactDOM from "react-dom/client";
import App from './App';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from 'react-toastify';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (process.env.REACT_APP_NODE_ENV === 'production') {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () { };
    }
}

const theme = createTheme({
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: "#fafafa",
                }
            },
        },
    },
});

root.render(
        <ThemeProvider theme={theme}>
            <CssBaseline>
                <App />
                <ToastContainer
                    position="bottom-left"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    pauseOnFocusLoss={false}
                    draggable={false}
                    pauseOnHover={false}
                    toastStyle={{ backgroundColor: "#131519", color: "#DDDDDD" }}
                />
            </CssBaseline>
        </ThemeProvider>
);



