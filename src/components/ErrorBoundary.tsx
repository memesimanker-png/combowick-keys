import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

/**
 * App-wide ErrorBoundary — prevents a single broken component from
 * white-screening the entire site. Logs to console (and Sentry if configured).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Hook for Sentry / Lovable Cloud logging — uncomment when DSN is added:
    // (window as any).Sentry?.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border border-destructive/30 bg-card">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Something broke</h1>
          <p className="text-sm text-muted-foreground">
            A glitch tripped the page. Reload usually fixes it. If not, ping us in Discord and we'll patch it fast.
          </p>
          {this.state.error?.message && (
            <pre className="text-[10px] text-left bg-muted/40 p-2 rounded overflow-auto max-h-24 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()} size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Reload
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-1.5" /> Discord
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
