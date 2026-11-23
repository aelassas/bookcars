import React from 'react'
import ReactDOM from 'react-dom/client'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'

import { frFR as corefrFR, enUS as coreenUS, esES as coresES, deDE as coredeDE, ptPT as coreptPT, itIT as coreitIT, zhCN as corezhCN, jaJP as corejaJP } from '@mui/material/locale'
import { frFR, enUS, esES, deDE, ptPT, itIT, zhCN, jaJP } from '@mui/x-date-pickers/locales'
import { frFR as dataGridfrFR, enUS as dataGridenUS, esES as dataGridesEs, deDE as dataGriddeDE, ptPT as dataGridptPT, itIT as dataGriditIT, zhCN as dataGridzhCN, jaJP as dataGridjaJP } from '@mui/x-data-grid/locales'
import { disableDevTools } from ':disable-react-devtools'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import App from '@/App'
import { appThemeOptions } from '@/utils/appTheme'
import { getThemeMode, initThemeMode } from '@/utils/themeMode'

initThemeMode()
document.documentElement.dataset.app = 'admin'

document.title = `${env.WEBSITE_NAME} Operations`
const siteIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
if (siteIcon) {
  siteIcon.href = '/safarrent-mark.svg'
  siteIcon.type = 'image/svg+xml'
}

import '@/assets/css/common.css'
import '@/assets/css/index.css'
import '@/assets/css/luxury-theme.css'

import '@/assets/css/admin-theme.css'
import '../../packages/safarrent-ui.css'

if (import.meta.env.VITE_NODE_ENV === 'production') {
  disableDevTools()
}

let language = env.DEFAULT_LANGUAGE
const user = JSON.parse(localStorage.getItem('bc-be-user') ?? 'null')
let lang = UserService.getQueryLanguage()

if (lang) {
  if (!env.LANGUAGES.includes(lang)) {
    lang = localStorage.getItem('bc-be-language')

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
}

language = UserService.getLanguage()

const muiLocales = {
  en: { pickers: enUS, dataGrid: dataGridenUS, core: coreenUS },
  fr: { pickers: frFR, dataGrid: dataGridfrFR, core: corefrFR },
  es: { pickers: esES, dataGrid: dataGridesEs, core: coresES },
  de: { pickers: deDE, dataGrid: dataGriddeDE, core: coredeDE },
  pt: { pickers: ptPT, dataGrid: dataGridptPT, core: coreptPT },
    it: { pickers: itIT, dataGrid: dataGriditIT, core: coreitIT },
    zh: { pickers: zhCN, dataGrid: dataGridzhCN, core: corezhCN },
    ja: { pickers: jaJP, dataGrid: dataGridjaJP, core: corejaJP },
  }
const muiLocale = muiLocales[language as keyof typeof muiLocales] ?? muiLocales.en

const ThemedApp = () => {
  const [mode, setMode] = React.useState(getThemeMode)
  React.useEffect(() => {
    const sync = () => setMode(getThemeMode())
    window.addEventListener('safarrent-theme-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('safarrent-theme-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const theme = React.useMemo(() => createTheme(appThemeOptions(mode), muiLocale.pickers, muiLocale.dataGrid, muiLocale.core), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      <ToastContainer position="bottom-right" autoClose={5000} pauseOnFocusLoss={false} draggable={false} theme={mode} />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<ThemedApp />)
