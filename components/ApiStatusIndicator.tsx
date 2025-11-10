import React from 'react';
import Spinner from './Spinner';

export type ApiStatus = 'idle' | 'checking' | 'success' | 'error';

export const ApiStatusIndicator: React.FC<{ status: ApiStatus }> = ({ status }) => {
    if (status === 'idle') return null;

    if (status === 'checking') {
        return <div className="flex items-center text-xs text-yellow-400"><Spinner /> Verificando...</div>;
    }

    if (status === 'success') {
        return <div className="flex items-center text-xs text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Conexão OK!</div>;
    }

    if (status === 'error') {
        return <div className="flex items-center text-xs text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>Falha na conexão</div>;
    }
    
    return null;
}
