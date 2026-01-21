import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-900 text-white p-8 flex flex-col items-center justify-center font-mono">
                    <h1 className="text-3xl font-bold mb-4">💥 Algo salió mal</h1>
                    <div className="bg-black/50 p-6 rounded-lg max-w-2xl overflow-auto">
                        <p className="text-xl mb-2 text-yellow-500">{this.state.error?.toString()}</p>
                        <pre className="text-xs text-gray-400">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
