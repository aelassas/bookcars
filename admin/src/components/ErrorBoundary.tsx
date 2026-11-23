import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  componentStack?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  // Update state so the next render shows the fallback UI.
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || error?.name || 'Unknown render error' }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the browser console useful during local FYP debugging.
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      errorMessage: `${error?.name || 'Error'}: ${error?.message || 'Unknown render error'}`,
      componentStack: errorInfo.componentStack || undefined,
    })
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <main role="alert" style={{ maxWidth: 720, margin: '64px auto', padding: '32px', borderRadius: 20, background: 'var(--surface, #fff)', color: 'var(--text-primary, #172033)', boxShadow: '0 18px 48px rgba(15, 23, 42, .12)' }}>
          <p style={{ margin: '0 0 8px', color: '#b28713', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>SafarRent Operations</p>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>This operations page couldn’t load</h1>
          <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>Your saved booking data is unchanged. Reload the page or return to the operations dashboard.</p>
          {import.meta.env.DEV && this.state.errorMessage && (
            <details open style={{ margin: '0 0 24px', color: '#7f1d1d' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Development error details</summary>
              <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {this.state.errorMessage}
                {this.state.componentStack ? `\n${this.state.componentStack}` : ''}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 20px', border: 0, borderRadius: 10, background: '#c5a32d', color: '#151515', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Reload page</button>
            <a href="/operations-dashboard" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', border: '1px solid #c5a32d', borderRadius: 10, color: 'inherit', fontWeight: 700, textDecoration: 'none' }}>Operations dashboard</a>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
