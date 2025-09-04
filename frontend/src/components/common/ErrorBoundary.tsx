import { Component, ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: { componentStack: string }) { console.error('ErrorBoundary', error, info); }
  reset = () => this.setState({ hasError: false, error: undefined });
  render() {
    if (this.state.hasError) {
      return <ErrorState title="Beklenmeyen Hata" description={this.state.error?.message || 'Bir hata oluştu'} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
