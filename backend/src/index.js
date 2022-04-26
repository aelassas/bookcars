import React from 'react';
import ReactDOM from "react-dom/client";
import App from './App';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
    validateAccessToken,
    updateLanguage,
    setLanguage,
    getQueryLanguage
} from './services/user-service';
import {
    LANGUAGES,
    DEFAULT_LANGUAGE
} from './config/env.config';
import { strings } from './config/app.config';
import {
    ToastContainer,
    toast
} from 'react-toastify';

import 'react-toastify/dist/ReactToastify.min.css';
import './assets/css/common.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (process.env.REACT_APP_NODE_ENV === 'production') {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () { };
    }
}

let language = DEFAULT_LANGUAGE;
const user = JSON.parse(localStorage.getItem('bc-user'));
let lang = getQueryLanguage();

if (lang !== '') {
    if (!LANGUAGES.includes(lang)) {
        lang = localStorage.getItem('bc-language');

        if (!LANGUAGES.includes(lang)) {
            lang = DEFAULT_LANGUAGE;
        }
    }
    if (user) {
        language = user.language;
        if (lang && lang.length === 2 && user.language !== lang) {
            const data = {
                id: user.id,
                language: lang
            }

            validateAccessToken().then(async status => {
                if (status === 200) {
                    const status = await updateLanguage(data);
                    if (status !== 200) {
                        toast(strings.CHANGE_LANGUAGE_ERROR, { type: 'error' });
                    }
                }
            });
            language = lang;
        }
    } else if (lang) {
        language = lang;
    }
    setLanguage(language);
    strings.setLanguage(language);
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



