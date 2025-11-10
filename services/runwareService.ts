

const RUNWARE_API_URL = 'https://api.runware.ai/v1';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const checkRunwareApi = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    // FIX: Changed endpoint to /account/credits for a more reliable and direct API key check.
    const response = await fetch(`${RUNWARE_API_URL}/account/credits`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch (error) {
    console.error("Runware API check failed:", error);
    return false;
  }
};

/**
 * Generates an image using the Runware API.
 * This process is asynchronous:
 * 1. An initial POST request is sent to start the generation task.
 * 2. The service then polls a GET endpoint until the image is ready or fails.
 */
export const generateImageWithRunware = async (
    apiKey: string,
    text: string,
    storyContext: string,
    stylePrompt: string 
): Promise<string> => {
    // Combine all context and style information into a single, cohesive prompt.
    const prompt = `
        ${stylePrompt.replace(/\*\*/g, '')}
        Contexto geral da história: ${storyContext}
        Cena específica para gerar: ${text}
    `;

    // 1. Initiate generation task
    let startResponse;
    try {
        startResponse = await fetch(`${RUNWARE_API_URL}/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                prompt: prompt,
                model: "stable-diffusion-xl-lightning",
                image_width: 1280,
                image_height: 720,
                steps: 8,
                cfg_scale: 1.5,
                style: "cinematic",
            }),
        });
    } catch(e) {
        throw new Error("Falha de rede ao contatar a API da Runware. Verifique sua conexão.");
    }

    if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(`Erro da API Runware (iniciar): ${errorData.detail || 'Chave de API inválida ou erro no servidor'}`);
    }

    const { id: generationId } = await startResponse.json();

    // 2. Poll for the result
    let status = '';
    let result;
    const maxAttempts = 30; // Poll for 2.5 minutes max (30 * 5s)
    let attempts = 0;

    while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < maxAttempts) {
        await sleep(5000); // Wait 5 seconds between polls
        
        let pollResponse;
        try {
            pollResponse = await fetch(`${RUNWARE_API_URL}/generations/${generationId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
        } catch (e) {
             throw new Error("Falha de rede ao verificar o status da imagem na Runware.");
        }

        if (!pollResponse.ok) {
            const errorData = await pollResponse.json();
            throw new Error(`Erro da API Runware (polling): ${errorData.detail || pollResponse.statusText}`);
        }
        
        result = await pollResponse.json();
        status = result.status;
        attempts++;
    }

    if (status === 'COMPLETED') {
        const imageUrl = result?.output?.images?.[0]?.url;
        if (!imageUrl) {
            throw new Error("API Runware bem-sucedida, mas a URL da imagem não foi encontrada.");
        }
        
        // Fetch the image and convert to a base64 data URL.
        // This is crucial because URLs can expire.
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } else if (status === 'FAILED') {
        throw new Error(`Geração da imagem com Runware falhou: ${result?.output?.error || 'Motivo desconhecido'}`);
    } else {
        throw new Error("Tempo limite excedido esperando pela imagem da Runware.");
    }
};
