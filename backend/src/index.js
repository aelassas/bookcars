import React from 'react';
import ReactDOM from "react-dom/client";
import App from './App';
import Env from './config/env.config';
import { strings as commonStrings } from './lang/common';
import * as UserService from './services/UserService';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer, toast } from 'react-toastify';
import { frFR, enUS } from '@mui/material/locale';

import 'react-toastify/dist/ReactToastify.min.css';
import './assets/css/common.css';
import './assets/css/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (process.env.REACT_APP_NODE_ENV === 'production') {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () { };
    }
}

let language = Env.DEFAULT_LANGUAGE;
const user = JSON.parse(localStorage.getItem('bc-user'));
let lang = UserService.getQueryLanguage();

if (lang !== '') {
    if (!Env.LANGUAGES.includes(lang)) {
        lang = localStorage.getItem('bc-language');

        if (!Env.LANGUAGES.includes(lang)) {
            lang = Env.DEFAULT_LANGUAGE;
        }
    }
    if (user) {
        language = user.language;
        if (lang && lang.length === 2 && user.language !== lang) {
            const data = {
                id: user.id,
                language: lang
            }

            UserService.validateAccessToken()
                .then(async status => {
                    if (status === 200) {
                        const status = await UserService.updateLanguage(data);
                        if (status !== 200) {
                            toast(commonStrings.CHANGE_LANGUAGE_ERROR, { type: 'error' });
                        }
                    }
                }).catch(() => {
                    toast(commonStrings.CHANGE_LANGUAGE_ERROR, { type: 'error' });
                });
            language = lang;
        }
    } else if (lang) {
        language = lang;
    }
    UserService.setLanguage(language);
    commonStrings.setLanguage(language);
}

language = UserService.getLanguage();

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
    }
}, language === 'fr' ? frFR : enUS);

root.render(
    <ThemeProvider theme={theme}>
        <CssBaseline>
            <App />
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={true}
                icon={true}
                theme="dark"
            />
        </CssBaseline>
    </ThemeProvider>
);