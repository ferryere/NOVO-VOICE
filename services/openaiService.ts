import { Script } from '../types';
import { OPENAI_SCRIPT_GENERATION_MODEL } from '../constants';

export const checkOpenAiApi = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch (error) {
    console.error("OpenAI API check failed:", error);
    return false;
  }
};

export const generateScriptWithOpenAI = async (
  apiKey: string,
  topic: string,
  hookParagraphs: number,
  hookStyle: string,
  blocks: number,
  wordsPerBlock: number,
  cta: string,
  ctaPlacement: string,
  language: string,
): Promise<Script> => {
  const prompt = `Crie um roteiro de storytelling cativante sobre "${topic}" no idioma com o código: ${language}.
    O roteiro deve ser estruturado no formato JSON.
    - O "hook" (gancho) deve ter exatamente ${hookParagraphs} parágrafo(s) e ser no estilo de: "${hookStyle}".
    - Deve haver exatamente ${blocks} "blocks" (blocos) de conteúdo principal.
    - Cada bloco de conteúdo DEVE ter no mínimo ${wordsPerBlock} palavras. É crucial que você siga esta contagem de palavras para cada bloco.
    - A ideia base para o "cta" (Chamada para Ação) é: "${cta}". Sua tarefa é refinar e adaptar este CTA para se encaixar perfeitamente na posição designada: "${ctaPlacement}". Por exemplo, um CTA no final pode começar com "Para concluir...". O CTA final, adaptado, deve ser o valor da chave "cta" no JSON. Não inclua o CTA nos "blocks".

    Responda APENAS com o objeto JSON, sem nenhum texto ou formatação adicional. O JSON deve ter as chaves "hook" (array de strings), "blocks" (array de strings), e "cta" (string).
    `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_SCRIPT_GENERATION_MODEL,
      messages: [
        { role: 'system', content: 'Você é um roteirista especialista que gera roteiros em formato JSON estruturado.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro da API OpenAI: ${errorData.error.message}`);
  }

  const data = await response.json();
  try {
    const scriptData = JSON.parse(data.choices[0].message.content);
    return {
        ...scriptData,
        ctaPlacement: ctaPlacement,
    } as Script;
  } catch (e) {
    console.error("Falha ao analisar o JSON do roteiro da OpenAI:", data.choices[0].message.content);
    throw new Error("A OpenAI retornou um formato de roteiro inválido. Por favor, tente novamente.");
  }
};