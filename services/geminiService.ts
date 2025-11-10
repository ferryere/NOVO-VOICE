

// FIX: Added Type to import for response schema and Script for new functions.
// FIX: Added GenerateImagesResponse for generateImageForText return type.
import { GoogleGenAI, Modality, GenerateContentResponse, Type, GenerateImagesResponse } from '@google/genai';
import { VOICE_GENERATION_MODEL } from '../constants';
import { Script } from '../types';

// --- API Call Helper with Retry Logic ---
const apiCallWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> => {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
        try {
            // Re-initialize GenAI client on each attempt to ensure the latest API key is used.
            return await apiCall();
        } catch (e: any) {
            attempt++;
            const errorMessage = e.message || '';
            const isRetryable = errorMessage.includes('503') ||
                                errorMessage.includes('UNAVAILABLE') ||
                                errorMessage.includes('overloaded') ||
                                errorMessage.includes('429') ||
                                errorMessage.includes('RESOURCE_EXHAUSTED');
            
            if (isRetryable && attempt < maxRetries) {
                let retryDelay = delay;
                const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);

                if (retryMatch && retryMatch[1]) {
                    retryDelay = Math.ceil(parseFloat(retryMatch[1]) * 1000);
                } else {
                    delay *= 2;
                }

                console.warn(`API call failed with retryable error: ${errorMessage}. Retrying in ${retryDelay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));

            } else {
                console.error(`API call failed after ${attempt} attempts or with a non-retryable error.`, e);
                if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                    throw new Error("Você excedeu sua cota de uso da API. Por favor, verifique seu plano e detalhes de faturamento ou tente novamente mais tarde.");
                }
                 if (errorMessage.includes('API key not valid')) {
                    throw new Error('Chave de API inválida. Por favor, selecione uma chave válida.');
                }
                throw e;
            }
        }
    }
    throw new Error('API call failed after maximum retries.');
};


// --- Audio Utils ---
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const pcmToWavBlob = (pcmData: Int16Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = pcmData.length * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const pcm16 = new Int16Array(buffer, 44);
    pcm16.set(pcmData);

    return new Blob([view], { type: 'audio/wav' });
};

const CHUNK_CHAR_LIMIT = 2500; // Safe character limit for each TTS API call

/**
 * Splits a long text into smaller chunks based on sentence boundaries,
 * without exceeding a specified character limit.
 */
const chunkText = (text: string, limit: number): string[] => {
    if (!text) return [];
    const chunks: string[] = [];
    // Split by common sentence endings, keeping the delimiter in the sentence.
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]; 
    
    let currentChunk = "";
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        // If a single sentence is already over the limit, it becomes its own chunk
        if (trimmedSentence.length > limit) {
            // Push any existing chunk before this long sentence
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            chunks.push(trimmedSentence);
            currentChunk = "";
            continue;
        }

        // If adding the next sentence would exceed the limit, finalize the current chunk
        if (currentChunk.length + trimmedSentence.length + 1 > limit) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        
        currentChunk += trimmedSentence + " ";
    }

    // Add the last remaining chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
};


/**
 * Concatenates multiple Int16Array buffers into a single buffer.
 */
const concatenatePcmArrays = (arrays: Int16Array[]): Int16Array => {
    const totalLength = arrays.reduce((acc, val) => acc + val.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};


// --- End Audio Utils ---

const getGenAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Variável de ambiente API_KEY não definida. Por favor, selecione uma chave.");
    }
    return new GoogleGenAI({ apiKey });
};

// FIX: Add missing functions for API checking, script generation, and image generation.
export const checkGeminiApi = async (): Promise<boolean> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'test',
        });
        return !!response.text;
    } catch (error) {
        console.error("Google Gemini API check failed:", error);
        return false;
    }
};

export const generateScript = async (
  topic: string,
  hookParagraphs: number,
  hookStyle: string,
  blocks: number,
  wordsPerBlock: number,
  cta: string,
  ctaPlacement: string,
  language: string,
): Promise<Script> => {
    const ai = getGenAI();
    const prompt = `Crie um roteiro de storytelling cativante sobre "${topic}" no idioma com o código: ${language}.
    O roteiro deve ser estruturado no formato JSON.
    - O "hook" (gancho) deve ter exatamente ${hookParagraphs} parágrafo(s) e ser no estilo de: "${hookStyle}".
    - Deve haver exatamente ${blocks} "blocks" (blocos) de conteúdo principal.
    - Cada bloco de conteúdo DEVE ter no mínimo ${wordsPerBlock} palavras. É crucial que você siga esta contagem de palavras para cada bloco.
    - A ideia base para o "cta" (Chamada para Ação) é: "${cta}". Sua tarefa é refinar e adaptar este CTA para se encaixar perfeitamente na posição designada: "${ctaPlacement}". Por exemplo, um CTA no final pode começar com "Para concluir...". O CTA final, adaptado, deve ser o valor da chave "cta" no JSON. Não inclua o CTA nos "blocks".

    Responda APENAS com o objeto JSON, sem nenhum texto ou formatação adicional.
    `;

    // FIX: Provide generic type to apiCallWithRetry to ensure 'response' is correctly typed.
    const response = await apiCallWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hook: { type: Type.ARRAY, items: { type: Type.STRING } },
                    blocks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cta: { type: Type.STRING }
                },
                required: ['hook', 'blocks', 'cta']
            }
        }
    }));
    
    try {
        const jsonText = response.text.replace(/```json\n?/, '').replace(/```$/, '');
        const scriptData = JSON.parse(jsonText);
        return {
            ...scriptData,
            ctaPlacement: ctaPlacement,
        } as Script;
    } catch (e) {
        console.error("Falha ao analisar o JSON do roteiro do Gemini:", response.text);
        throw new Error("A Gemini retornou um formato de roteiro inválido. Por favor, tente novamente.");
    }
};

export const generateImageForText = async (text: string, storyContext: string, stylePrompt: string): Promise<string> => {
    const ai = getGenAI();
    const fullPrompt = `
        ${stylePrompt.replace(/\*\*/g, '')}
        Contexto geral da história: ${storyContext}
        Cena específica para gerar: ${text}
    `;

    // FIX: Provide generic type to apiCallWithRetry to ensure 'response' is correctly typed.
    const response = await apiCallWithRetry<GenerateImagesResponse>(() => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg'
        }
    }));

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Nenhuma imagem foi gerada pela API.");
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

/**
 * Calls the Gemini API to generate audio for a single text chunk and returns raw PCM data.
 * Gracefully handles cases where the API returns no audio data (e.g., due to safety filters)
 * by returning an empty audio chunk instead of throwing an error.
 */
const getAudioDataForChunk = async (
    text: string, 
    voiceName: string, 
    languageCode: string
): Promise<{ pcmData: Int16Array, sampleRate: number }> => {
    const defaultSampleRate = 24000;
    if (!text.trim()) {
        return { pcmData: new Int16Array(0), sampleRate: defaultSampleRate };
    }
    const ai = getGenAI();
    const response = await apiCallWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: VOICE_GENERATION_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          languageCode,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }));
  
    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType;
  
    if (!base64Audio || !mimeType) {
      console.warn(`Dados de áudio não encontrados para o trecho: "${text.substring(0, 50)}...". Pode ter sido bloqueado por filtros. Pulando.`);
      return { pcmData: new Int16Array(0), sampleRate: defaultSampleRate };
    }
  
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    if (!sampleRateMatch) {
        console.warn(`Taxa de amostragem não encontrada no mimeType: ${mimeType}. Usando padrão de ${defaultSampleRate}.`);
        const pcmBuffer = base64ToArrayBuffer(base64Audio);
        const pcmData = new Int16Array(pcmBuffer);
        return { pcmData, sampleRate: defaultSampleRate };
    }
    const sampleRate = parseInt(sampleRateMatch[1], 10);
    
    const pcmBuffer = base64ToArrayBuffer(base64Audio);
    const pcmData = new Int16Array(pcmBuffer);
    return { pcmData, sampleRate };
};

/**
 * Generates a complete voice-over for a given text.
 * Handles long texts by splitting them into chunks, generating audio for each in parallel batches,
 * and concatenating the results into a single WAV file.
 */
export const generateVoiceOver = async (
    text: string, 
    voiceName: string, 
    languageCode: string,
    onProgress: (message: string) => void
): Promise<string> => {

    const textChunks = chunkText(text, CHUNK_CHAR_LIMIT);
    
    if (textChunks.length <= 1) {
        onProgress('Gerando áudio...');
        const { pcmData, sampleRate } = await getAudioDataForChunk(textChunks[0] || '', voiceName, languageCode);
        if (pcmData.length === 0) {
            throw new Error("Não foi possível gerar áudio. O texto pode ter sido bloqueado por filtros de conteúdo.");
        }
        const wavBlob = pcmToWavBlob(pcmData, sampleRate);
        return URL.createObjectURL(wavBlob);
    }
    
    onProgress(`Texto dividido em ${textChunks.length} partes. Processando em paralelo...`);
    
    const BATCH_SIZE = 5; // Process up to 5 chunks concurrently
    const allPcmChunks: { pcmData: Int16Array, sampleRate: number }[] = [];
    let audioSampleRate: number | null = null;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
        const batch = textChunks.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(textChunks.length / BATCH_SIZE);

        onProgress(`Processando lote ${batchNumber} de ${totalBatches}... (Partes ${i + 1} a ${i + batch.length})`);

        try {
            const batchPromises = batch.map(chunk => 
                getAudioDataForChunk(chunk, voiceName, languageCode)
            );

            const batchResults = await Promise.all(batchPromises);

            for (const result of batchResults) {
                allPcmChunks.push(result);
                // Set sample rate from the first successful chunk that has audio data
                if (!audioSampleRate && result.sampleRate && result.pcmData.length > 0) {
                    audioSampleRate = result.sampleRate;
                }
            }
        } catch (error) {
            console.error(`Falha ao processar o lote ${batchNumber}:`, error);
            const friendlyError = error instanceof Error ? error.message : String(error);
            throw new Error(`Falha ao processar o lote de áudio ${batchNumber}. O processo foi interrompido. Detalhe: ${friendlyError}`);
        }
    }

    if (!audioSampleRate) {
        throw new Error("Não foi possível gerar áudio para nenhum trecho. O texto pode ter sido totalmente bloqueado por filtros de conteúdo. Verifique o texto do seu arquivo.");
    }

    onProgress('Unificando áudios...');
    const orderedPcmArrays = allPcmChunks.map(chunk => chunk.pcmData);
    const combinedPcmData = concatenatePcmArrays(orderedPcmArrays);

    if (combinedPcmData.length === 0) {
        throw new Error("Não foi possível gerar áudio. O texto pode ter sido totalmente bloqueado por filtros de conteúdo. Verifique o console para mais detalhes.");
    }
    
    const finalWavBlob = pcmToWavBlob(combinedPcmData, audioSampleRate);
    
    return URL.createObjectURL(finalWavBlob);
};


export const generateVoiceSample = async (voiceName: string, languageCode: string): Promise<string> => {
  const sampleText = "Olá, esta é uma amostra da minha voz para você avaliar.";
  const { pcmData, sampleRate } = await getAudioDataForChunk(sampleText, voiceName, languageCode);
  const wavBlob = pcmToWavBlob(pcmData, sampleRate);
  return URL.createObjectURL(wavBlob);
};