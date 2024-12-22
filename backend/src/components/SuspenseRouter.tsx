/* eslint-disable react-compiler/react-compiler */
import React, { useLayoutEffect, useRef, useState, useTransition } from 'react'
import { Router } from 'react-router-dom'
import { BrowserHistory, createBrowserHistory, Update } from 'history'

export interface BrowserRouterProps {
  basename?: string
  children?: React.ReactNode
  window?: Window
}

export const SuspenseRouter = ({ basename, children, window }: BrowserRouterProps) => {
  const historyRef = useRef<BrowserHistory>(null)
  const [isPending, startTransition] = useTransition()

  if (historyRef.current == null) {
    // const history = createBrowserHistory(startTransition, { window });
    historyRef.current = createBrowserHistory({ window })
  }

  const history = historyRef.current
  const [state, setState] = useState({
    action: history.action,
    location: history.location,
  })

  function setStateAsync(update: Update) {
    startTransition(() => {
      setState(update)
    })
  }

  useLayoutEffect(() => history.listen(setStateAsync), [history])

  return (
    <Router
      basename={basename}
      location={state.location}
      navigationType={state.action}
      navigator={history}
    >
      {children}
    </Router>
  )
}

export default SuspenseRouter
