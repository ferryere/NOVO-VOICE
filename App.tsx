
import React, { useState, useEffect, useRef } from 'react';
import { generateVoiceOver, generateVoiceSample } from './services/geminiService';
import { LANGUAGES, AVAILABLE_VOICES } from './constants';
import Spinner from './components/Spinner';
import { SpeakerIcon, DownloadIcon, TrashIcon } from './components/Icons';

type ApiKeyStatus = 'checking' | 'needed' | 'ready';
type InputMode = 'text' | 'srt';

type JobStatus = 'pending' | 'processing' | 'completed' | 'error';
interface Job {
    id: string;
    file: File;
    status: JobStatus;
    progressMessage: string | null;
    audioUrl: string | null;
    error: string | null;
}

// Helper function for downloading files
const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const App: React.FC = () => {
    // API Key State
    const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('checking');

    // UI & Logic State
    const [inputText, setInputText] = useState('Olá! Bem-vindo ao gerador de narração com IA. Escreva ou cole seu roteiro aqui para começar.');
    const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].id);
    const [language, setLanguage] = useState(LANGUAGES[0].code);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [progressMessage, setProgressMessage] = useState<string | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);

    // Refs for audio objects
    const previewAudioRef = useRef<HTMLAudioElement>(null);
    const currentPreviewUrl = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const doKeyCheck = async () => {
        if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
            setApiKeyStatus('ready');
        } else {
            setApiKeyStatus('needed');
        }
    };
    
    const handleCheckAccess = () => {
        setApiKeyStatus('checking');
        // A small delay for the UI to update and show the loading spinner screen.
        setTimeout(doKeyCheck, 100); 
    };

    // Check for API key on mount
    useEffect(() => {
        setTimeout(doKeyCheck, 100);
    }, []);

    // Cleanup audio object URLs
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (currentPreviewUrl.current) URL.revokeObjectURL(currentPreviewUrl.current);
            jobs.forEach(job => {
                if (job.audioUrl) URL.revokeObjectURL(job.audioUrl);
            });
        };
    }, [audioUrl, jobs]);
    
    const parseSrt = (srtContent: string): string => {
        return srtContent
            .split('\n')
            .filter(line => !/^\d+$/.test(line.trim()) && !line.includes('-->') && line.trim() !== '')
            .join(' ');
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files).slice(0, 10); // Limit to 10 files
            // FIX: Explicitly type 'file' as 'File' to resolve type inference issues.
            const newJobs: Job[] = newFiles.map((file: File) => ({
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                file,
                status: 'pending',
                progressMessage: 'Aguardando na fila',
                audioUrl: null,
                error: null,
            }));
            setJobs(newJobs);
            setError(null);
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
            }
        }
    };

    const removeJob = (id: string) => {
        setJobs(prev => prev.filter(job => job.id !== id));
    };

    const clearJobs = () => {
        setJobs([]);
    };

    const handlePreviewVoice = async () => {
        setIsPreviewLoading(true);
        setError(null);
        try {
            const sampleUrl = await generateVoiceSample(selectedVoice, language);
            if (currentPreviewUrl.current) {
                URL.revokeObjectURL(currentPreviewUrl.current);
            }
            currentPreviewUrl.current = sampleUrl;

            if (previewAudioRef.current) {
                previewAudioRef.current.src = sampleUrl;
                previewAudioRef.current.play();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro ao gerar a amostra de voz.');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setProgressMessage(null);

        // --- Single Text Mode ---
        if (inputMode === 'text') {
            if (!inputText.trim()) {
                setError('Por favor, insira um texto.');
                setIsLoading(false);
                return;
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
            }
            try {
                const generatedUrl = await generateVoiceOver(inputText, selectedVoice, language, setProgressMessage);
                setAudioUrl(generatedUrl);
                downloadFile(generatedUrl, 'narracao_ia.wav');
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
                setError(errorMessage);
                if (errorMessage.includes('Requested entity was not found') || errorMessage.includes('API key not valid')) {
                    setApiKeyStatus('needed');
                }
            } finally {
                setIsLoading(false);
                setProgressMessage(null);
            }
            return;
        }

        // --- Batch SRT Mode ---
        const pendingJobs = jobs.filter(job => job.status === 'pending' || job.status === 'error');
        if (pendingJobs.length === 0) {
            setIsLoading(false);
            return;
        }

        const promises = pendingJobs.map(job => (async () => {
            try {
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing', progressMessage: 'Lendo arquivo...' } : j));
                const srtContent = await job.file.text();
                const textToNarrate = parseSrt(srtContent);
                const handleProgress = (message: string) => {
                    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progressMessage: message } : j));
                };
                const generatedUrl = await generateVoiceOver(textToNarrate, selectedVoice, language, handleProgress);
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed', audioUrl: generatedUrl, progressMessage: 'Concluído e baixado!' } : j));
                downloadFile(generatedUrl, `${job.file.name.replace('.srt', '')}.wav`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', error: errorMessage, progressMessage: 'Falhou' } : j));
                if (errorMessage.includes('Requested entity was not found') || errorMessage.includes('API key not valid')) {
                    setApiKeyStatus('needed');
                }
            }
        })());

        await Promise.all(promises);
        setIsLoading(false);
    };
    
    const isProcessing = inputMode === 'text' ? isLoading : jobs.some(j => j.status === 'processing');

    const renderApiKeyPrompt = () => (
         <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-2xl text-center p-8 bg-[#1E1B2E]/90 rounded-2xl shadow-2xl border border-violet-700/50 animate-fade-in backdrop-blur-sm">
                <h1 className="text-2xl font-semibold text-violet-400 mb-4 font-heading">Acesso via Google AI Studio</h1>
                <p className="text-neutral-300 mb-6">Para usar esta aplicação, você precisa abri-la através do projeto compartilhado no Google AI Studio. Isso irá configurar sua chave de API automaticamente.</p>
                <div className="flex flex-col items-center space-y-4">
                    <a href="https://ai.studio/apps/drive/1ES-QKpMI12kzeyn28stxoUSDaMMhMrVp" target="_blank" rel="noopener noreferrer" className="inline-block text-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full max-w-xs">
                        Abrir Projeto no AI Studio
                    </a>
                    <p className="text-neutral-400 text-sm pt-4">Depois de abrir o projeto, volte para esta aba e verifique o acesso.</p>
                    <button onClick={handleCheckAccess} className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full max-w-xs">
                        Verificar Acesso
                    </button>
                </div>
            </div>
        </div>
    );
    
    if (apiKeyStatus === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center text-lg text-neutral-300"><Spinner /><span>Verificando configuração...</span></div>
            </div>
        );
    }

    if (apiKeyStatus === 'needed') {
        return renderApiKeyPrompt();
    }
    
    // FIX: Define JobItem props interface and use React.FC to correctly type the component, resolving an issue where the 'key' prop was being incorrectly validated.
    interface JobItemProps {
        job: Job;
    }
    const JobItem: React.FC<JobItemProps> = ({ job }) => (
        <div className="p-3 bg-[#161320]/80 rounded-lg border border-violet-900/60 space-y-3">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-neutral-300 break-all">{job.file.name}</p>
                <button onClick={() => removeJob(job.id)} disabled={job.status === 'processing'} className="text-zinc-500 hover:text-violet-400 disabled:opacity-50 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>

            {job.status === 'pending' && <p className="text-xs text-yellow-400">{job.progressMessage}</p>}
            {job.status === 'processing' && (
                <div className="space-y-1">
                    <div className="w-full bg-violet-900/60 rounded-full h-1.5">
                         <div className="bg-violet-600 h-1.5 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-xs text-violet-400">{job.progressMessage}</p>
                </div>
            )}
            {job.status === 'error' && <p className="text-xs text-red-400 break-words">Erro: {job.error}</p>}
            {job.status === 'completed' && job.audioUrl && (
                <div className="space-y-3">
                    <audio controls src={job.audioUrl} className="w-full h-10"></audio>
                    <div className="w-full flex items-center justify-center gap-2 text-xs bg-green-700/20 text-green-300 font-bold py-1.5 px-3 rounded-md">
                        <DownloadIcon className="w-4 h-4" /> Download iniciado
                    </div>
                </div>
            )}
        </div>
    );


    return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-3xl mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-heading tracking-wide">
                    Gerador de Narração IA
                </h1>
            </header>

            <main className="w-full max-w-3xl bg-[#1E1B2E]/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-violet-900/60 animate-fade-in">
                {/* Input Section */}
                <div className="mb-6">
                    <div className="flex border-b border-violet-900/60 mb-4">
                        <button onClick={() => { setInputMode('text'); setJobs([]) }} className={`py-2 px-4 text-sm font-medium transition-colors ${inputMode === 'text' ? 'border-b-2 border-violet-500 text-violet-300' : 'text-neutral-400 hover:text-white'}`}>Colar Texto</button>
                        <button onClick={() => { setInputMode('srt'); fileInputRef.current?.click(); }} className={`py-2 px-4 text-sm font-medium transition-colors ${inputMode === 'srt' ? 'border-b-2 border-violet-500 text-violet-300' : 'text-neutral-400 hover:text-white'}`}>Carregar .SRT (em lote)</button>
                    </div>
                    {inputMode === 'text' ? (
                        <textarea id="script-input" value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-40 bg-[#161320]/80 border-violet-900/80 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition" placeholder='Digite ou cole seu roteiro aqui...' />
                    ) : (
                        <div className="space-y-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".srt" className="hidden" multiple />
                            {jobs.length > 0 ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-neutral-400">{jobs.length} arquivo(s) na fila.</p>
                                        <button onClick={clearJobs} disabled={isProcessing} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-400 transition-colors disabled:opacity-50">
                                            <TrashIcon className="w-4 h-4"/> Limpar Fila
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1">
                                        {jobs.map(job => <JobItem key={job.id} job={job} />)}
                                    </div>
                                </>

                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center h-40 border-2 border-dashed border-violet-900/60 rounded-lg text-zinc-500 hover:bg-[#161320]/50 hover:border-violet-500 hover:text-violet-400 transition-colors">
                                    <span className="text-lg">Clique para selecionar até 10 arquivos .SRT</span>
                                    <span className="text-sm mt-1">Os arquivos serão processados simultaneamente</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Configuration Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-neutral-300 mb-1">Idioma</label>
                        <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-[#161320]/80 border-violet-900/80 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition">
                            {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-neutral-300 mb-1">Voz</label>
                        <div className="flex items-center gap-2">
                            <select id="voice" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-[#161320]/80 border-violet-900/80 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition">
                                {AVAILABLE_VOICES.map(voice => <option key={voice.id} value={voice.id}>{voice.name} ({voice.gender})</option>)}
                            </select>
                            <button onClick={handlePreviewVoice} disabled={isPreviewLoading} className="p-2 bg-violet-800/60 hover:bg-violet-800/80 rounded-md transition-colors disabled:opacity-50 flex-shrink-0" aria-label="Ouvir amostra da voz">
                                {isPreviewLoading ? <Spinner /> : <SpeakerIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
                 <audio ref={previewAudioRef} hidden />
                
                {/* Action & Result Section */}
                {error && (
                    <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {inputMode === 'text' && audioUrl && (
                    <div className="mb-8 p-4 bg-zinc-800/50 rounded-lg border border-green-700/50 space-y-4 animate-fade-in">
                        <h3 className="font-semibold text-lg text-green-400 text-center">Narração Pronta!</h3>
                        <audio controls src={audioUrl} className="w-full"></audio>
                        <div className="w-full flex items-center justify-center gap-2 bg-green-600/40 text-green-300 font-bold py-2 px-4 rounded-lg">
                            <DownloadIcon className="w-5 h-5" /> Download iniciado automaticamente
                        </div>
                    </div>
                )}

                <div className="flex justify-center pt-4">
                    <button onClick={handleGenerate} disabled={isProcessing || (inputMode === 'srt' && jobs.length === 0)} className="w-full max-w-xs flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg disabled:bg-violet-600/20 disabled:text-neutral-400 disabled:cursor-not-allowed">
                        {isProcessing && <Spinner />}
                        {isProcessing ? (inputMode === 'text' ? (progressMessage || 'Gerando...') : 'Processando em Lote...') : (inputMode === 'srt' ? 'Gerar Narrações em Lote' : 'Gerar Narração')}
                    </button>
                </div>

            </main>
        </div>
    );
};

export default App;
