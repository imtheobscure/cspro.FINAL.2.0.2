import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Crash resilience for the whole app.
 *
 * Previously a single thrown render error (e.g. a malformed transcript entry,
 * a missing device property, a translation race) would leave the user on a
 * permanent white screen — requiring a manual reload and losing any in-flight
 * transcript that hadn't flushed to storage yet.
 *
 * This boundary catches render errors and shows a minimal recovery card.
 * On recovery we clear the transient (interim) store text so a bad interim
 * string can't immediately re-trigger the same crash.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log so the user/developer can see what went wrong in DevTools.
    console.error('[ErrorBoundary] Render error caught:', error, info);
  }

  handleReload = () => {
    try {
      import('../store/appStore').then(({ useAppStore }) => {
        try {
          const { setInterimText } = useAppStore.getState();
          if (setInterimText) {
            setInterimText('tutor', '');
            setInterimText('learner', '');
          }
        } catch {}
      }).catch(() => {});
    } catch {}
    window.location.reload();
  };

  handleDismiss = () => {
    // Try to recover in-place (keeps recognition running if it was).
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1120',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 500,
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px' }}>
            The app hit an unexpected error. Your transcript is safely saved.
            Reload to continue.
          </p>
          <p style={{ fontSize: 12, color: '#f59e0b', margin: '0 0 16px', background: '#0f172a', padding: '8px 12px', borderRadius: 8, textAlign: 'left', wordBreak: 'break-word' }}>
            {this.state.message || 'Unknown error'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={this.handleDismiss}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: 'transparent',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Try to continue
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
