
import React, { useState, useEffect } from 'react';
import { Script } from '../types';
import { generateScript, checkGeminiApi } from '../services/geminiService';
import { generateScriptWithOpenAI, checkOpenAiApi } from '../services/openaiService';
import { HOOK_STYLES, CTA_PLACEMENTS, LANGUAGES, CTA_OPTIONS } from '../constants';
import Spinner from './Spinner';
import { ApiStatus, ApiStatusIndicator } from './ApiStatusIndicator';

interface Step1ScriptProps {
  onScriptGenerated: (script: Script, language: string) => void;
  openAiApiKey: string;
  onOpenAiApiKeyChange: (key: string) => void;
}

const Step1Script: React.FC<Step1ScriptProps> = ({ onScriptGenerated, openAiApiKey, onOpenAiApiKeyChange }) => {
  const [topic, setTopic] = useState('Um pequeno robô que descobre um jardim mágico gigante.');
  const [hookParagraphs, setHookParagraphs] = useState(1);
  const [hookStyle, setHookStyle] = useState(HOOK_STYLES[0]);
  const [blocks, setBlocks] = useState(3);
  const [wordsPerBlock, setWordsPerBlock] = useState(50);
  const [cta, setCta] = useState(CTA_OPTIONS[0]);
  const [ctaPlacement, setCtaPlacement] = useState(CTA_PLACEMENTS[2]); // Default to end
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [scriptProvider, setScriptProvider] = useState('google');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [googleApiStatus, setGoogleApiStatus] = useState<ApiStatus>('idle');
  const [openaiApiStatus, setOpenaiApiStatus] = useState<ApiStatus>('idle');

  useEffect(() => {
    handleCheckGoogle();
  }, []);

  useEffect(() => {
    setOpenaiApiStatus('idle');
    if (openAiApiKey) {
        handleCheckOpenAI();
    }
  }, [openAiApiKey]);

  const handleCheckGoogle = async () => {
    setGoogleApiStatus('checking');
    const success = await checkGeminiApi();
    setGoogleApiStatus(success ? 'success' : 'error');
  }

  const handleCheckOpenAI = async () => {
    setOpenaiApiStatus('checking');
    if (!openAiApiKey) {
        setOpenaiApiStatus('error');
        return;
    }
    const success = await checkOpenAiApi(openAiApiKey);
    setOpenaiApiStatus(success ? 'success' : 'error');
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let generatedScript: Script;
      if (scriptProvider === 'openai') {
        if (!openAiApiKey) {
            throw new Error("Por favor, insira sua chave de API da OpenAI.");
        }
        generatedScript = await generateScriptWithOpenAI(openAiApiKey, topic, hookParagraphs, hookStyle, blocks, wordsPerBlock, cta, ctaPlacement, language);
      } else {
        generatedScript = await generateScript(topic, hookParagraphs, hookStyle, blocks, wordsPerBlock, cta, ctaPlacement, language);
      }
      onScriptGenerated(generatedScript, language);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4 text-red-400 font-heading">Crie Seu Roteiro Narrativo</h2>
      <p className="text-neutral-400 mb-6">Defina a estrutura e o conteúdo da sua história. A IA irá gerar um roteiro com base nos seus parâmetros.</p>
      
      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* --- Provider Selection --- */}
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
            <div>
              <label htmlFor="scriptProvider" className="block text-sm font-medium text-neutral-300 mb-2">Motor de Geração de Roteiro</label>
              <select id="scriptProvider" value={scriptProvider} onChange={(e) => setScriptProvider(e.target.value)} className="w-full bg-zinc-800 border-zinc-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI GPT-4</option>
              </select>
            </div>
            
            {scriptProvider === 'google' && (
                 <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-md">
                     <ApiStatusIndicator status={googleApiStatus} />
                     <button type="button" onClick={handleCheckGoogle} disabled={googleApiStatus==='checking'} className="text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed">
                        Verificar Conexão
                    </button>
                 </div>
            )}

            {scriptProvider === 'openai' && (
                <div className="space-y-3">
                    <div>
                      <label htmlFor="openai-key" className="block text-sm font-medium text-neutral-300 mb-1">Chave de API da OpenAI</label>
                      <input 
                          id="openai-key" 
                          type="password"
                          value={openAiApiKey}
                          onChange={(e) => onOpenAiApiKeyChange(e.target.value)}
                          placeholder="sk-..."
                          className="w-full bg-zinc-800 border-zinc-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                      />
                       <p className="text-xs text-zinc-500 mt-1">
                          Sua chave é salva no seu navegador. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Obtenha sua chave aqui.</a>
                      </p>
                    </div>
                     <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-md">
                         <ApiStatusIndicator status={openaiApiStatus} />
                         <button type="button" onClick={handleCheckOpenAI} disabled={openaiApiStatus==='checking' || !openAiApiKey} className="text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed">
                            Verificar Conexão
                        </button>
                     </div>
                </div>
            )}
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-neutral-300 mb-1">Ideia</label>
              <textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition" rows={3} required />
            </div>
             <div>
              <label htmlFor="language" className="block text-sm font-medium text-neutral-300 mb-1">Idioma do Roteiro</label>
              <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="hookStyle" className="block text-sm font-medium text-neutral-300 mb-1">Estilo do Gancho</label>
              <select id="hookStyle" value={hookStyle} onChange={(e) => setHookStyle(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                {HOOK_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="hookParagraphs" className="block text-sm font-medium text-neutral-300 mb-1">Parágrafos do Gancho ({hookParagraphs})</label>
              <input type="range" id="hookParagraphs" min="1" max="3" value={hookParagraphs} onChange={(e) => setHookParagraphs(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
             <div>
                <label htmlFor="cta" className="block text-sm font-medium text-neutral-300 mb-1">Chamada para Ação (CTA)</label>
                <select id="cta" value={cta} onChange={(e) => setCta(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                    {CTA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
             <div>
              <label htmlFor="ctaPlacement" className="block text-sm font-medium text-neutral-300 mb-1">Posicionamento do CTA</label>
              <select id="ctaPlacement" value={ctaPlacement} onChange={(e) => setCtaPlacement(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                {CTA_PLACEMENTS.map(place => <option key={place} value={place}>{place}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="blocks" className="block text-sm font-medium text-neutral-300 mb-1">Blocos de Conteúdo ({blocks})</label>
              <input type="range" id="blocks" min="1" max="10" value={blocks} onChange={(e) => setBlocks(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>
             <div>
              <label htmlFor="wordsPerBlock" className="block text-sm font-medium text-neutral-300 mb-1">Palavras por Bloco (~{wordsPerBlock})</label>
              <input type="range" id="wordsPerBlock" min="20" max="1200" step="50" value={wordsPerBlock} onChange={(e) => setWordsPerBlock(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isLoading} className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-red-900/50 disabled:cursor-not-allowed">
            {isLoading && <Spinner />}
            {isLoading ? 'Gerando Roteiro...' : 'Gerar Roteiro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Step1Script;
