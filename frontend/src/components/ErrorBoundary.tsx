import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  // Update state so the next render shows the fallback UI.
  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an external service here (like Sentry)
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <main role="alert" style={{ maxWidth: 720, margin: '64px auto', padding: '32px', borderRadius: 20, background: 'var(--surface, #fff)', color: 'var(--text-primary, #172033)', boxShadow: '0 18px 48px rgba(15, 23, 42, .12)' }}>
          <p style={{ margin: '0 0 8px', color: '#b28713', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>SafarRent</p>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>This page couldn’t load</h1>
          <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>Your account and bookings are safe. Reload this page, or return to the search page and try again.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 20px', border: 0, borderRadius: 10, background: '#c5a32d', color: '#151515', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Reload page</button>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', border: '1px solid #c5a32d', borderRadius: 10, color: 'inherit', fontWeight: 700, textDecoration: 'none' }}>Back to SafarRent</a>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
