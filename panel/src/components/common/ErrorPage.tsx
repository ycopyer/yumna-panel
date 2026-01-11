import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, FileQuestion, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
    code: 403 | 404 | 500;
    title?: string;
    message?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ code, title, message }) => {
    const navigate = useNavigate();

    const config = {
        403: {
            icon: <AlertTriangle size={64} className="text-yellow-500" />,
            defaultTitle: 'Access Denied',
            defaultMessage: 'You do not have permission to access this page directly. Please ensure you are logged in or accessing this resource through the proper application link.',
            color: 'from-yellow-500/20 to-orange-500/20'
        },
        404: {
            icon: <FileQuestion size={64} className="text-blue-500" />,
            defaultTitle: 'Page Not Found',
            defaultMessage: 'The page or resource you are looking for does not exist or has been moved.',
            color: 'from-blue-500/20 to-purple-500/20'
        },
        500: {
            icon: <AlertTriangle size={64} className="text-red-500" />,
            defaultTitle: 'Server Error',
            defaultMessage: 'Something went wrong on our end. Please try again later.',
            color: 'from-red-500/20 to-pink-500/20'
        }
    };

    const currentConfig = config[code] || config[404];

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
            <div className={`w-full max-w-md bg-gradient-to-br ${currentConfig.color} backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-fade-in`}>
                <div className="mb-6 p-4 bg-white/5 rounded-full ring-1 ring-white/10 shadow-lg">
                    {currentConfig.icon}
                </div>

                <h1 className="text-6xl font-black mb-2 opacity-20 select-none">{code}</h1>
                <h2 className="text-2xl font-bold mb-4">{title || currentConfig.defaultTitle}</h2>
                <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
                    {message || currentConfig.defaultMessage}
                </p>

                <div className="flex gap-4 w-full">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 px-6 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Home size={18} />
                        Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
