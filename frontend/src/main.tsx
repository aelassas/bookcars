import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import { frFR as corefrFR, enUS as coreenUS, esES as coresES, deDE as coredeDE, ptPT as coreptPT, itIT as coreitIT, zhCN as corezhCN, jaJP as corejaJP } from '@mui/material/locale'
import { frFR, enUS, esES, deDE, ptPT, itIT, zhCN, jaJP } from '@mui/x-date-pickers/locales'
import { frFR as dataGridfrFR, enUS as dataGridenUS, esES as dataGridesEs, deDE as dataGriddeDE, ptPT as dataGridptPT, itIT as dataGriditIT, zhCN as dataGridzhCN, jaJP as dataGridjaJP } from '@mui/x-data-grid/locales'
import { disableDevTools } from ':disable-react-devtools'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as IpInfoService from '@/services/IpInfoService'
import env from '@/config/env.config'
import App from '@/App'

import { strings as activateStrings } from '@/lang/activate'
import { strings as bookingStrings } from '@/lang/booking'
import { strings as bookingCarListStrings } from '@/lang/booking-car-list'
import { strings as bookingFilterStrings } from '@/lang/booking-filter'
import { strings as bookingListStrings } from '@/lang/booking-list'
import { strings as bookingsStrings } from '@/lang/bookings'
import { strings as carMultimediaFilterStrings } from '@/lang/car-multimedia-filter'
import { strings as carRangeFilterStrings } from '@/lang/car-range-filter'
import { strings as carRatingFilterStrings } from '@/lang/car-rating-filter'
import { strings as carsStrings } from '@/lang/cars'
import { strings as carSeatsFilterStrings } from '@/lang/car-seats-filter'
import { strings as carSpecsStrings } from '@/lang/car-specs'
import { strings as changePasswordStrings } from '@/lang/change-password'
import { strings as checkoutStrings } from '@/lang/checkout'
import { strings as commonStrings } from '@/lang/common'
import { strings as contactFormStrings } from '@/lang/contact-form'
import { strings as footerStrings } from '@/lang/footer'
import { strings as headerStrings } from '@/lang/header'
import { strings as homeStrings } from '@/lang/home'
import { strings as locationCarrouselStrings } from '@/lang/location-carrousel'
import { strings as mapStrings } from '@/lang/map'
import { strings as masterStrings } from '@/lang/master'
import { strings as noMatchStrings } from '@/lang/no-match'
import { strings as notificationsStrings } from '@/lang/notifications'
import { strings as resetPasswordStrings } from '@/lang/reset-password'
import { strings as searchSrings } from '@/lang/search'
import { strings as searchFormStrings } from '@/lang/search-form'
import { strings as settingsStrings } from '@/lang/settings'
import { strings as signInStrings } from '@/lang/sign-in'
import { strings as signUpStrings } from '@/lang/sign-up'
import { strings as tosStrings } from '@/lang/tos'
import { strings as newsletterFormStrings } from '@/lang/newsletter-form'
import { strings as privacyStrings } from '@/lang/privacy'
import { strings as faqListStrings } from '@/lang/faq-list'
import { strings as checkoutStatusStrings } from '@/lang/checkout-status'

import '@/assets/css/common.css'
import '@/assets/css/index.css'

if (env.isProduction) {
  disableDevTools()
}

let language = env.DEFAULT_LANGUAGE
const user = JSON.parse(localStorage.getItem('bc-fe-user') ?? 'null')
let lang = UserService.getQueryLanguage()

if (lang) {
  if (!env.LANGUAGES.includes(lang)) {
    lang = localStorage.getItem('bc-fe-language')

    if (lang && !env.LANGUAGES.includes(lang)) {
      lang = env.DEFAULT_LANGUAGE
    }
  }

  try {
    if (user) {
      language = user.language
      if (lang && lang.length === 2 && user.language !== lang) {
        const data = {
          id: user._id,
          language: lang,
        }

        const status = await UserService.validateAccessToken()

        if (status === 200) {
          const _status = await UserService.updateLanguage(data)
          if (_status !== 200) {
            helper.error(null, commonStrings.CHANGE_LANGUAGE_ERROR)
          }
        }

        language = lang
      }
    } else if (lang) {
      language = lang
    }
    UserService.setLanguage(language)
    commonStrings.setLanguage(language)
  } catch (err) {
    helper.error(err, commonStrings.CHANGE_LANGUAGE_ERROR)
  }
} else {
  //
  // If language not set, set language by IP
  //
  let storedLang

  if (user && user.language) {
    storedLang = user.language
  } else {
    const slang = localStorage.getItem('bc-fe-language')
    if (slang && slang.length === 2) {
      storedLang = slang
    }
  }

  const updateLang = (_lang: string) => {
    UserService.setLanguage(_lang)

    activateStrings.setLanguage(_lang)
    bookingStrings.setLanguage(_lang)
    bookingCarListStrings.setLanguage(_lang)
    bookingFilterStrings.setLanguage(_lang)
    bookingListStrings.setLanguage(_lang)
    bookingsStrings.setLanguage(_lang)
    carMultimediaFilterStrings.setLanguage(_lang)
    carRangeFilterStrings.setLanguage(_lang)
    carRatingFilterStrings.setLanguage(_lang)
    carsStrings.setLanguage(_lang)
    carSeatsFilterStrings.setLanguage(_lang)
    changePasswordStrings.setLanguage(_lang)
    checkoutStrings.setLanguage(_lang)
    commonStrings.setLanguage(_lang)
    contactFormStrings.setLanguage(_lang)
    footerStrings.setLanguage(_lang)
    headerStrings.setLanguage(_lang)
    homeStrings.setLanguage(_lang)
    locationCarrouselStrings.setLanguage(_lang)
    mapStrings.setLanguage(_lang)
    masterStrings.setLanguage(_lang)
    noMatchStrings.setLanguage(_lang)
    notificationsStrings.setLanguage(_lang)
    resetPasswordStrings.setLanguage(_lang)
    searchSrings.setLanguage(_lang)
    searchFormStrings.setLanguage(_lang)
    settingsStrings.setLanguage(_lang)
    signInStrings.setLanguage(_lang)
    signUpStrings.setLanguage(_lang)
    tosStrings.setLanguage(_lang)
    carSpecsStrings.setLanguage(_lang)
    newsletterFormStrings.setLanguage(_lang)
    privacyStrings.setLanguage(_lang)
    faqListStrings.setLanguage(_lang)
    checkoutStatusStrings.setLanguage(_lang)
  }

  if (env.SET_LANGUAGE_FROM_IP && !storedLang) {
    const country = await IpInfoService.getCountryCode()

    if (['FR', 'MA'].includes(country)) {
      updateLang('fr')
    } else if (['US', 'GB', 'AU'].includes(country)) {
      updateLang('en')
    } else if (['DE', 'AT', 'CH'].includes(country)) {
      updateLang('de')
    } else if (['PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'].includes(country)) {
      updateLang('pt')
    } else if (['IT', 'SM', 'VA'].includes(country)) {
      updateLang('it')
    } else if (['CN', 'SG'].includes(country)) {
      updateLang('zh')
    } else if (['JP'].includes(country)) {
      updateLang('ja')
    } else {
      updateLang(env.DEFAULT_LANGUAGE)
    }
  }
}

language = UserService.getLanguage()

const muiLocales: Record<string, any> = { fr: frFR, es: esES, de: deDE, pt: ptPT, it: itIT, zh: zhCN, ja: jaJP }
const dataGridLocales: Record<string, any> = { fr: dataGridfrFR, es: dataGridesEs, de: dataGriddeDE, pt: dataGridptPT, it: dataGriditIT, zh: dataGridzhCN, ja: dataGridjaJP }
const coreLocales: Record<string, any> = { fr: corefrFR, es: coresES, de: coredeDE, pt: coreptPT, it: coreitIT, zh: corezhCN, ja: corejaJP }

const theme = createTheme(
  {
    palette: {
      primary: {
        main: '#1a1a1a',
        // contrastText: '#003B95',
        // dark: '#003B95',
      },
    },
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
            backgroundColor: '#FAFAFA',
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            '& .Mui-disabled': {
              color: '#333 !important',
            },
          },
        },
      },
      // MuiSwitch: {
      //   styleOverrides: {
      //     root: {
      //       '& .Mui-checked': {
      //         color: '#1976D2 !important',
      //       },
      //       '& .Mui-checked+.MuiSwitch-track': {
      //         opacity: 0.7,
      //         backgroundColor: '#1976D2 !important',
      //       },
      //     },
      //   },
      // },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiAutocomplete-inputRoot': {
              paddingRight: '20px !important',
            },
          },
          listbox: {
            '& .Mui-focused': {
              backgroundColor: '#eee !important',
            },
          },
          option: {
            // Hover
            // '&[data-focus="true"]': {
            //     backgroundColor: '#eee !important',
            //     borderColor: 'transparent',
            // },
            // Selected
            '&[aria-selected="true"]': {
              // backgroundColor: '#faad43 !important',
              backgroundColor: '#F7B644 !important',
            },
          },
        },
      },
    },
  },
  muiLocales[language] || enUS,
  dataGridLocales[language] || dataGridenUS,
  coreLocales[language] || coreenUS,
)

ReactDOM.createRoot(document.getElementById('root')!).render(
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
        pauseOnHover
        theme="dark"
      />
    </CssBaseline>
  </ThemeProvider>,
)
