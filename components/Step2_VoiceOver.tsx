import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Script } from '../types';
import { generateVoiceOver, generateVoiceSample } from '../services/geminiService';
import { AVAILABLE_VOICES } from '../constants';
import Spinner from './Spinner';
import { SpeakerIcon } from './Icons';

interface Step2VoiceOverProps {
  script: Script;
  language: string;
  onVoiceOverGenerated: (audioUrl: string) => void;
  onBack: () => void;
}

const Step2VoiceOver: React.FC<Step2VoiceOverProps> = ({ script, language, onVoiceOverGenerated, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  // FIX: Add progress message state for detailed loading status.
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].id);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const currentPreviewUrl = useRef<string | null>(null);

  const fullScriptText = useMemo(() => {
    const parts: string[] = [];
    parts.push(...script.hook);

    if (script.ctaPlacement === "Depois do hook") {
      parts.push(script.cta);
      parts.push(...script.blocks);
    } else if (script.ctaPlacement === "Meio do roteiro") {
      const midIndex = Math.ceil(script.blocks.length / 2);
      parts.push(...script.blocks.slice(0, midIndex));
      parts.push(script.cta);
      parts.push(...script.blocks.slice(midIndex));
    } else { // "Final do vídeo" or default case
      parts.push(...script.blocks);
      parts.push(script.cta);
    }
    
    return parts.join('\n\n');
  }, [script]);

  useEffect(() => {
    return () => {
      // Revoke all created object URLs on unmount
      if (finalAudioUrl) {
          URL.revokeObjectURL(finalAudioUrl);
      }
      if (currentPreviewUrl.current) {
        URL.revokeObjectURL(currentPreviewUrl.current);
      }
    };
  }, [finalAudioUrl]);

  const handlePreviewVoice = async (voiceId: string) => {
    setIsPreviewLoading(true);
    setError(null);
    try {
      const sampleUrl = await generateVoiceSample(voiceId, language);
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

  const handleGenerateFullVoiceOver = async () => {
    setIsLoading(true);
    setError(null);
    // FIX: Pass a progress handler to generateVoiceOver to provide feedback during generation and resolve argument mismatch.
    setProgressMessage(null);
    try {
        const handleProgress = (message: string) => {
            setProgressMessage(message);
        };
        const generatedUrl = await generateVoiceOver(fullScriptText, selectedVoice, language, handleProgress);
        setFinalAudioUrl(generatedUrl);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao gerar o áudio.');
    } finally {
        setIsLoading(false);
        setProgressMessage(null);
    }
  };
  
  const handleNext = () => {
      if(finalAudioUrl) {
        onVoiceOverGenerated(finalAudioUrl);
      } else {
        setError("Por favor, gere a narração primeiro.");
      }
  }
  
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4 text-red-400 font-heading">Gerar Narração Completa</h2>
      <p className="text-neutral-400 mb-6">Escolha uma voz e a IA irá gerar uma narração unificada para todo o seu roteiro.</p>

      {/* Voice Selection */}
      <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <h3 className="font-semibold text-lg mb-3 text-neutral-300">1. Escolha uma Voz</h3>
        <div className="flex items-center gap-4">
             <select 
                value={selectedVoice} 
                onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
             >
                {AVAILABLE_VOICES.map(voice => <option key={voice.id} value={voice.id}>{voice.name} ({voice.gender})</option>)}
            </select>
            <button
                onClick={() => handlePreviewVoice(selectedVoice)}
                disabled={isPreviewLoading}
                className="flex items-center justify-center text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed flex-shrink-0"
            >
                {isPreviewLoading ? <Spinner /> : <><SpeakerIcon className="w-4 h-4 mr-2" /> Ouvir Amostra</>}
            </button>
        </div>
        <audio ref={previewAudioRef} hidden />
      </div>
      
       {/* Generation Area */}
      <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-center">
        <h3 className="font-semibold text-lg mb-3 text-neutral-300">2. Gere a Narração</h3>
        {finalAudioUrl ? (
            <div className="space-y-4">
                <p className="text-green-400">Narração gerada com sucesso!</p>
                <audio controls src={finalAudioUrl} className="w-full"></audio>
            </div>
        ) : (
             <button 
                onClick={handleGenerateFullVoiceOver}
                disabled={isLoading}
                className="w-full max-w-xs mx-auto flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-red-900/50 disabled:cursor-not-allowed"
            >
                {isLoading && <Spinner />}
                {/* FIX: Display detailed progress message during generation. */}
                {isLoading ? (progressMessage || 'Gerando Narração...') : 'Gerar Narração Completa'}
            </button>
        )}
      </div>

       {/* Script Preview */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3 text-neutral-300">Roteiro para Narração</h3>
         <div className="space-y-3 max-h-40 overflow-y-auto pr-2 rounded-lg bg-zinc-900/50 p-4 border border-zinc-700">
            <p className="text-neutral-300 text-sm whitespace-pre-wrap">{fullScriptText}</p>
         </div>
      </div>
      
      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative my-4" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-8">
        <button onClick={onBack} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Voltar
        </button>
        
        <button onClick={handleNext} disabled={!finalAudioUrl || isLoading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-red-900/50 disabled:cursor-not-allowed flex items-center justify-center">
            Continuar
        </button>
      </div>
    </div>
  );
};

export default Step2VoiceOver;