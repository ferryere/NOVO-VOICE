
/**
 * Generates an image using the Pollinations.AI API.
 * This service is free, open-source, and requires no API key.
 * It works by constructing a URL with the prompt and fetching the resulting image.
 */
export const generateImageWithPollinations = async (
    prompt: string
): Promise<string> => {
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Construct the URL with required parameters
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&nofeed=true&seed=${Math.floor(Math.random() * 1000000)}`;

    try {
        // Fetch the image from the URL
        const imageResponse = await fetch(url);

        if (!imageResponse.ok) {
            throw new Error(`Pollinations API failed with status: ${imageResponse.status}`);
        }

        // Convert the image to a blob and then to a base64 data URL
        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (error) {
        console.error("Error generating image with Pollinations.AI:", error);
        throw new Error("Falha ao gerar imagem com Pollinations.AI. O serviço pode estar offline.");
    }
};
