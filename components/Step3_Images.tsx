
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Script, GeneratedImage } from '../types';
import { generateImageForText } from '../services/geminiService';
import { generateImageWithRunware, checkRunwareApi } from '../services/runwareService';
import { generateImageWithPollinations } from '../services/pollinationsService';
import { IMAGE_STYLES } from '../constants';
import Spinner from './Spinner';
import { ApiStatus, ApiStatusIndicator } from './ApiStatusIndicator';

interface Step3ImagesProps {
  script: Script;
  onImagesGenerated: (images: GeneratedImage[]) => void;
  onBack: () => void;
  runwareApiKey: string;
  onRunwareApiKeyChange: (key: string) => void;
}

const Step3Images: React.FC<Step3ImagesProps> = ({ script, onImagesGenerated, onBack, runwareApiKey, onRunwareApiKeyChange }) => {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(IMAGE_STYLES[0].id);
  const [imageProvider, setImageProvider] = useState('google');
  const [runwareApiStatus, setRunwareApiStatus] = useState<ApiStatus>('idle');

  const { scriptSegments, storyContext } = useMemo(() => {
    const segments: { id: string, text: string }[] = [];
    let counter = 0;

    script.hook.forEach(part => {
        if (part.trim()) segments.push({ id: `segment-${counter++}`, text: part.trim() });
    });
    
    script.blocks.forEach(part => {
        if (part.trim()) segments.push({ id: `segment-${counter++}`, text: part.trim() });
    });
    
    if (script.cta.trim()) segments.push({ id: `segment-${counter++}`, text: script.cta.trim() });
    
    const context = [...script.hook, ...script.blocks, script.cta].join('\n\n');

    return { scriptSegments: segments, storyContext: context };
  }, [script]);

  useEffect(() => {
    setRunwareApiStatus('idle');
    if (runwareApiKey) {
        handleCheckRunware();
    }
  }, [runwareApiKey]);
  
  const handleCheckRunware = async () => {
    setRunwareApiStatus('checking');
    if (!runwareApiKey) {
        setRunwareApiStatus('error');
        return;
    }
    const success = await checkRunwareApi(runwareApiKey);
    setRunwareApiStatus(success ? 'success' : 'error');
  }

  const handleGenerateImage = useCallback(async (id: string, text: string) => {
    setLoadingStates(prev => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const style = IMAGE_STYLES.find(s => s.id === selectedStyleId);
      if (!style) {
        throw new Error("Estilo visual selecionado é inválido.");
      }
      
      let imageUrl: string;
      const fullPrompt = `${style.prompt.replace(/\*\*|Estilo:|Iluminação:|Câmera:|Detalhes:/g, '')}, ${text}`;

      switch(imageProvider) {
        case 'pollinations':
            imageUrl = await generateImageWithPollinations(fullPrompt);
            break;
        case 'runware':
            if (!runwareApiKey) {
              throw new Error("Por favor, insira sua chave de API da Runware.");
            }
            imageUrl = await generateImageWithRunware(runwareApiKey, text, storyContext, style.prompt);
            break;
        default: // 'google'
            imageUrl = await generateImageForText(text, storyContext, style.prompt);
            break;
      }
      
      setGeneratedImages(prev => [...prev.filter(img => img.id !== id), { id, text, imageUrl }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro na geração de imagem.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [id]: false }));
    }
  }, [storyContext, selectedStyleId, imageProvider, runwareApiKey]);

  const handleGenerateAll = async () => {
    for (const segment of scriptSegments) {
        if (!generatedImages.some(img => img.id === segment.id)) {
            await handleGenerateImage(segment.id, segment.text);
        }
    }
  };

  const allImagesGenerated = generatedImages.length === scriptSegments.length;
  const isGenerating = Object.values(loadingStates).some(v => v);

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4 text-red-400 font-heading">Gerar Imagens das Cenas</h2>
      <p className="text-neutral-400 mb-6">Escolha um estilo visual e crie uma imagem para cada parte do seu roteiro. A IA usará o contexto da história para manter a consistência.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="visual-style" className="block text-sm font-medium text-neutral-300 mb-2">Estilo Visual</label>
          <select
            id="visual-style"
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
          >
            {IMAGE_STYLES.map(style => (
              <option key={style.id} value={style.id}>{style.name}</option>
            ))}
          </select>
        </div>
        <div>
           <label htmlFor="imageProvider" className="block text-sm font-medium text-neutral-300 mb-2">Motor de Geração de Imagem</label>
            <select id="imageProvider" value={imageProvider} onChange={(e) => setImageProvider(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                <option value="google">Google Imagen</option>
                <option value="runware">Runware (Stable Diffusion)</option>
                <option value="pollinations">Pollinations.AI (Grátis)</option>
            </select>
            <p className="text-xs text-zinc-400 mt-1">
              {imageProvider === 'google'
                ? "Atingiu seu limite de uso? Tente Runware ou Pollinations."
                : imageProvider === 'pollinations'
                ? "Pollinations.AI é gratuito e não requer chave de API."
                : ""
              }
            </p>
        </div>
      </div>
      
       {imageProvider === 'runware' && (
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
              <div>
                  <label htmlFor="runware-key" className="block text-sm font-medium text-neutral-300 mb-1">Chave de API da Runware</label>
                  <input 
                      id="runware-key" 
                      type="password"
                      value={runwareApiKey}
                      onChange={(e) => onRunwareApiKeyChange(e.target.value)}
                      placeholder="Sua chave de API da Runware"
                      className="w-full bg-zinc-800 border-zinc-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                  />
                    <p className="text-xs text-zinc-500 mt-1">
                      Sua chave é salva no seu navegador. <a href="https://my.runware.ai/keys" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Obtenha sua chave aqui.</a>
                  </p>
              </div>
               <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-md">
                   <ApiStatusIndicator status={runwareApiStatus} />
                   <button type="button" onClick={handleCheckRunware} disabled={runwareApiStatus==='checking' || !runwareApiKey} className="text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed">
                    Verificar Conexão
                </button>
               </div>
          </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-y-auto p-2 rounded-lg bg-zinc-800/50">
        {scriptSegments.map(({ id, text }) => {
          const image = generatedImages.find(img => img.id === id);
          const isLoading = loadingStates[id];
          return (
            <div key={id} className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
              <div className="w-full sm:w-2/3">
                <p className="text-neutral-300 italic">"{text}"</p>
              </div>
              <div className="w-full sm:w-1/3 flex items-center justify-center">
                {isLoading ? (
                  <div className="w-48 h-28 flex flex-col items-center justify-center bg-zinc-900 rounded-md">
                    <Spinner />
                    <span className="text-xs mt-2 text-neutral-400">Gerando...</span>
                  </div>
                ) : image ? (
                  <img src={image.imageUrl} alt={text} className="w-48 h-28 object-cover rounded-md shadow-lg" />
                ) : (
                  <button onClick={() => handleGenerateImage(id, text)} className="w-48 h-28 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded-md text-sm transition-colors">
                    Gerar Imagem
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center mt-8">
        <button onClick={onBack} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Voltar
        </button>
        
        <div className="flex items-center gap-4">
            <button onClick={handleGenerateAll} disabled={isGenerating} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-zinc-800/50 flex items-center justify-center">
              {isGenerating && <Spinner/>}
              Gerar Todas
            </button>
            <button onClick={() => onImagesGenerated(generatedImages.sort((a, b) => parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1])))} disabled={!allImagesGenerated} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-red-900/50 disabled:cursor-not-allowed">
              Próximo: Montar Vídeo
            </button>
        </div>
      </div>
    </div>
  );
};

export default Step3Images;
