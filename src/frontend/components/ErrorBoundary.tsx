import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#f87171', marginBottom: 12 }}>
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: 20 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="button"
            onClick={this.handleReload}
            style={{ marginRight: 10 }}
          >
            Reload page
          </button>
          <button
            className="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ background: '#475569' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
