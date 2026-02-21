import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
                        <p className="text-sm text-gray-600">
                            MIMI ran into an issue. Don't worry — your data is safe.
                        </p>
                        <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-2 break-all">
                            {this.state.error?.message || 'Unknown error'}
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-pink-600 hover:to-purple-700 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Try Again</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
