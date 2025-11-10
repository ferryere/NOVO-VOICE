
import React, { useState, useEffect, useRef } from 'react';
import { Script, GeneratedImage } from '../types';
import { VIDEO_EFFECTS } from '../constants';
import Spinner from './Spinner';
import { DownloadIcon } from './Icons';

interface Step4VideoProps {
  script: Script;
  audioUrl: string;
  images: GeneratedImage[];
  videoUrl: string | null;
  onVideoGenerated: (url: string) => void;
  onRestart: () => void;
  onApiKeyError: () => void; // This prop is kept but won't be called by this component anymore
}

const Step4Video: React.FC<Step4VideoProps> = ({ script, audioUrl, images, videoUrl, onVideoGenerated, onRestart }) => {
  const [effects, setEffects] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const ffmpegRef = useRef<any>(null);

  useEffect(() => {
    // Initialize effects for images
    const initialEffects = images.reduce((acc, img) => ({...acc, [img.id]: VIDEO_EFFECTS[2].id}), {}); // Default to zoom in
    setEffects(initialEffects);
  }, [images]);

  useEffect(() => {
    // Load FFmpeg
    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return;
        
        setProgressMessage('Carregando editor de vídeo...');
        const { createFFmpeg } = (window as any).FFmpeg;
        const ffmpeg = createFFmpeg({
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        });
        
        try {
            await ffmpeg.load();
            ffmpegRef.current = ffmpeg;
            setIsFFmpegLoaded(true);
            setProgressMessage('');
        } catch (e) {
            setError("Não foi possível carregar o editor de vídeo. Tente recarregar a página.");
            console.error(e);
        }
    };
    
    // Poll to check if FFmpeg script is loaded, then initialize
    if (!ffmpegRef.current) {
        const intervalId = setInterval(() => {
            if ((window as any).FFmpeg) {
                clearInterval(intervalId);
                loadFFmpeg();
            }
        }, 200); // Check every 200ms

        return () => clearInterval(intervalId); // Cleanup on unmount
    }

  }, []);

  const handleGenerateVideo = async () => {
    if (!ffmpegRef.current) {
        setError("O editor de vídeo ainda não está pronto.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setProgressMessage('Iniciando montagem...');

    const ffmpeg = ffmpegRef.current;
    const { fetchFile } = (window as any).FFmpeg;

    try {
        // 1. Fetch all files and write to FFmpeg's virtual file system
        setProgressMessage(`Baixando ${images.length + 1} arquivos...`);
        
        // Write images
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            ffmpeg.FS('writeFile', `img${i}.jpg`, await fetchFile(img.imageUrl));
        }

        // Write audio
        ffmpeg.FS('writeFile', 'audio.wav', await fetchFile(audioUrl));

        // 2. Create a video clip from each image with effects
        const sceneDuration = 4; // 4 seconds per scene
        const fileList: string[] = [];
        for (let i = 0; i < images.length; i++) {
            setProgressMessage(`Processando cena ${i + 1}/${images.length}...`);
            const effectId = effects[images[i].id] || 'none';
            let filterComplex = `scale=1280:720,setsar=1`;
            
            switch (effectId) {
                case 'pan':
                    // Slow pan from left to right
                    filterComplex += `,crop=w=iw*0.8:h=ih:x='(iw-ow)*t/${sceneDuration}',scale=1280:720`;
                    break;
                case 'zoom_in':
                    filterComplex += `,zoompan=z='min(zoom+0.001,1.2)':d=${sceneDuration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
                    break;
                case 'zoom_out':
                    filterComplex += `,zoompan=z='max(1.0,zoom-0.001)':d=${sceneDuration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
                    break;
                case 'fade':
                    filterComplex += `,fade=t=in:st=0:d=1`;
                    break;
            }

            await ffmpeg.run(
                '-framerate', '1/4',
                '-i', `img${i}.jpg`,
                '-vf', filterComplex,
                '-c:v', 'libx264',
                '-t', String(sceneDuration),
                '-pix_fmt', 'yuv420p',
                `clip${i}.mp4`
            );
            fileList.push(`file 'clip${i}.mp4'`);
        }
        
        // 3. Concatenate all video clips
        setProgressMessage('Juntando as cenas...');
        ffmpeg.FS('writeFile', 'concat.txt', fileList.join('\n'));
        await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'combined.mp4');

        // 4. Add audio track
        setProgressMessage('Adicionando narração...');
        await ffmpeg.run('-i', 'combined.mp4', '-i', 'audio.wav', '-c:v', 'copy', '-c:a', 'aac', '-shortest', 'final_video.mp4');

        // 5. Read the result and create a URL
        setProgressMessage('Finalizando...');
        const data = ffmpeg.FS('readFile', 'final_video.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const finalUrl = URL.createObjectURL(videoBlob);
        onVideoGenerated(finalUrl);

    } catch (e: any) {
        console.error(e);
        setError(`Ocorreu um erro durante a montagem do vídeo: ${e.message}`);
    } finally {
        setIsLoading(false);
        setProgressMessage('');
    }
  };

  if (videoUrl) {
    return (
      <div className="text-center animate-fade-in">
        <h2 className="text-2xl font-semibold mb-4 text-red-400 font-heading">Seu Vídeo está Pronto!</h2>
        <p className="text-neutral-400 mb-6">Seu vídeo foi montado com sucesso no seu navegador. Baixe os arquivos abaixo.</p>
        <div className="flex justify-center mb-8">
            <video controls src={videoUrl} className="max-w-full md:max-w-lg rounded-lg shadow-2xl border-2 border-red-600" />
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <a href={videoUrl} download="youfaceless_video.mp4" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                <DownloadIcon className="w-5 h-5" /> Baixar Vídeo (.mp4)
            </a>
             <a href={audioUrl} download="youfaceless_voiceover.wav" className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                <DownloadIcon className="w-5 h-5" /> Baixar Narração (.wav)
            </a>
        </div>
        <button onClick={onRestart} className="mt-12 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Criar Outro Vídeo
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4 text-red-400 font-heading">Monte seu Vídeo</h2>
      <p className="text-neutral-400 mb-6">Revise suas cenas, adicione efeitos e junte tudo em um vídeo final com a narração.</p>
      
      <div className="space-y-2 max-h-[40vh] overflow-y-auto p-2 rounded-lg bg-zinc-800/50">
        {images.map(image => (
          <div key={image.id} className="flex items-center gap-4 bg-zinc-800/60 p-3 rounded-lg">
            <img src={image.imageUrl} alt={image.text} className="w-32 h-20 object-cover rounded-md flex-shrink-0" />
            <div className="flex-grow">
                <p className="text-sm text-neutral-400 italic">"{image.text}"</p>
            </div>
            <select value={effects[image.id] || 'none'} onChange={e => setEffects(prev => ({...prev, [image.id]: e.target.value}))} className="bg-zinc-800 border-zinc-700 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition">
                {VIDEO_EFFECTS.map(effect => (
                    <option key={effect.id} value={effect.id}>{effect.name}</option>
                ))}
            </select>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative mt-4" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex justify-center items-center mt-8">
        <button onClick={handleGenerateVideo} disabled={isLoading || !isFFmpegLoaded} className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg disabled:bg-red-900/50 disabled:cursor-not-allowed">
            {isLoading || !isFFmpegLoaded ? <Spinner /> : null}
            {isLoading ? progressMessage : !isFFmpegLoaded ? 'Carregando Editor...' : 'Montar Vídeo Final'}
        </button>
      </div>
    </div>
  );
};

export default Step4Video;
