

const RUNWAY_API_URL = 'https://api.runwayml.com/v1';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const checkRunwayApi = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const response = await fetch(`${RUNWAY_API_URL}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch (error) {
    console.error("Runway API check failed:", error);
    return false;
  }
};

/**
 * Generates an image using the Runway API.
 * This process is asynchronous:
 * 1. An initial POST request is sent to start the generation task.
 * 2. The service then polls a GET endpoint until the image is ready or fails.
 */
export const generateImageWithRunway = async (
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
        startResponse = await fetch(`${RUNWAY_API_URL}/inferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'stable-diffusion-v1-5', // A common public model on Runway
                prompt: prompt,
                width: 1280,
                height: 720,
            }),
        });
    } catch(e) {
        throw new Error("Falha de rede ao contatar a API da Runway. Verifique sua conexão.");
    }

    if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(`Erro da API Runway (iniciar): ${errorData.message || 'Chave de API inválida ou erro no servidor'}`);
    }

    const { id: inferenceId } = await startResponse.json();

    // 2. Poll for the result
    let status = '';
    let result;
    const maxAttempts = 30; // Poll for 2.5 minutes max (30 * 5s)
    let attempts = 0;

    while (status !== 'SUCCEEDED' && status !== 'FAILED' && attempts < maxAttempts) {
        await sleep(5000); // Wait 5 seconds between polls
        
        let pollResponse;
        try {
            pollResponse = await fetch(`${RUNWAY_API_URL}/inferences/${inferenceId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
        } catch (e) {
             throw new Error("Falha de rede ao verificar o status da imagem na Runway.");
        }

        if (!pollResponse.ok) {
            throw new Error(`Erro da API Runway (polling): ${pollResponse.statusText}`);
        }
        
        result = await pollResponse.json();
        status = result.status;
        attempts++;
    }

    if (status === 'SUCCEEDED') {
        const imageUrl = result.output.image_url;
        if (!imageUrl) {
            throw new Error("API Runway bem-sucedida, mas a URL da imagem não foi encontrada.");
        }
        
        // Fetch the image and convert to a base64 data URL.
        // This is crucial because Runway URLs can expire.
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } else if (status === 'FAILED') {
        throw new Error(`Geração da imagem com Runway falhou: ${result.error_message || 'Motivo desconhecido'}`);
    } else {
        throw new Error("Tempo limite excedido esperando pela imagem da Runway.");
    }
};