import { useEffect, useState } from 'react';
import Head from 'next/head';
import { ToastContainer, toast } from 'react-toastify';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { frFR, enUS } from '@mui/material/locale';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import UserService from '../services/UserService';

import 'react-toastify/dist/ReactToastify.min.css';
import '../styles/globals.css';

function App({ Component, pageProps }) {
  const [theme, setTheme] = useState();

  useEffect(() => {
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
          "'Segoe UI'",
          'Roboto',
          "'Helvetica Neue'",
          'Arial',
          'sans-serif',
          "'Apple Color Emoji'",
          "'Segoe UI Emoji'",
          "'Segoe UI Symbol'",
        ].join(','),
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: '#fafafa',
            }
          },
        },
        MuiFormControl: {
          styleOverrides: {
            root: {
              '& .Mui-disabled': {
                color: '#333 !important'
              }
            }
          },
        },
        MuiSwitch: {
          styleOverrides: {
            root: {
              '& .Mui-checked': {
                color: '#f37022 !important'
              },
              '& .Mui-checked+.MuiSwitch-track': {
                opacity: 0.7,
                backgroundColor: '#f37022 !important'
              }
            }
          },
        },
        MuiAutocomplete: {
          styleOverrides: {
            root: {
              '& .MuiAutocomplete-inputRoot': {
                paddingRight: '20px !important'
              }
            },
            listbox: {
              '& .Mui-focused': {
                backgroundColor: '#eee !important',
              }
            },
            option: {
              '&[aria-selected="true"]': {
                backgroundColor: '#faad43 !important'
              },
            },
          },
        },
      },
    }, language === 'fr' ? frFR : enUS);

    setTheme(theme);
  }, []);

  if (!theme) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Book Cars Rental Service</title>
        <meta charset='utf-8' />
        <meta name='description' content='Book Cars Rental Service' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline>
          <Component {...pageProps} />
          <ToastContainer
            position='bottom-right'
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnFocusLoss={false}
            draggable={false}
            pauseOnHover={true}
            icon={true}
            theme='dark'
          />
        </CssBaseline>
      </ThemeProvider>
    </>
  );
}

export default App;
