export const LANGUAGES = [
    { code: 'de-DE', name: 'Alemão (Alemanha)' },
    { code: 'ar-XA', name: 'Árabe (Padrão)' },
    { code: 'zh-CN', name: 'Chinês (Mandarim, Simplificado)' },
    { code: 'ko-KR', name: 'Coreano (Coreia do Sul)' },
    { code: 'hr-HR', name: 'Croata (Croácia)' },
    { code: 'da-DK', name: 'Dinamarquês (Dinamarca)' },
    { code: 'es-ES', name: 'Espanhol (Espanha)' },
    { code: 'fi-FI', name: 'Finlandês (Finlândia)' },
    { code: 'fr-FR', name: 'Francês (França)' },
    { code: 'el-GR', name: 'Grego (Grécia)' },
    { code: 'hi-IN', name: 'Hindi (Índia)' },
    { code: 'nl-NL', name: 'Holandês (Holanda)' },
    { code: 'hu-HU', name: 'Húngaro (Hungria)' },
    { code: 'id-ID', name: 'Indonésio (Indonésia)' },
    { code: 'en-US', name: 'Inglês (EUA)' },
    { code: 'it-IT', name: 'Italiano (Itália)' },
    { code: 'ja-JP', name: 'Japonês (Japão)' },
    { code: 'ms-MY', name: 'Malaio (Malásia)' },
    { code: 'no-NO', name: 'Norueguês (Noruega)' },
    { code: 'pl-PL', name: 'Polonês (Polônia)' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'pt-PT', name: 'Português (Portugal)' },
    { code: 'ro-RO', name: 'Romeno (Romênia)' },
    { code: 'ru-RU', name: 'Russo (Rússia)' },
    { code: 'sv-SE', name: 'Sueco (Suécia)' },
    { code: 'th-TH', name: 'Tailandês (Tailândia)' },
    { code: 'cs-CZ', name: 'Tcheco (República Tcheca)' },
    { code: 'tr-TR', name: 'Turco (Turquia)' },
    { code: 'uk-UA', name: 'Ucraniano (Ucrânia)' },
    { code: 'vi-VN', name: 'Vietnamita (Vietnã)' },
].sort((a, b) => a.name.localeCompare(b.name));

export const AVAILABLE_VOICES = [
  { id: "Zephyr", name: "Zephyr", gender: "Feminino" },
  { id: "Kore", name: "Kore", gender: "Feminino" },
  { id: "Leda", name: "Leda", gender: "Feminino" },
  { id: "Aoede", name: "Aoede", gender: "Feminino" },
  { id: "Callirrhoe", name: "Callirrhoe", gender: "Feminino" },
  { id: "Autonoe", name: "Autonoe", gender: "Feminino" },
  { id: "Algieba", name: "Algieba", gender: "Feminino" },
  { id: "Despina", name: "Despina", gender: "Feminino" },
  { id: "Erinome", name: "Erinome", gender: "Feminino" },
  { id: "Laomedeia", name: "Laomedeia", gender: "Feminino" },
  { id: "Achernar", name: "Achernar", gender: "Feminino" },
  { id: "Pulcherrima", name: "Pulcherrima", gender: "Feminino" },
  { id: "Achird", name: "Achird", gender: "Feminino" },
  { id: "Vindemiatrix", name: "Vindemiatrix", gender: "Feminino" },
  { id: "Sulafat", name: "Sulafat", gender: "Feminino" },
  { id: "Puck", name: "Puck", gender: "Masculino" },
  { id: "Charon", name: "Charon", gender: "Masculino" },
  { id: "Fenrir", name: "Fenrir", gender: "Masculino" },
  { id: "Orus", name: "Orus", gender: "Masculino" },
  { id: "Enceladus", name: "Enceladus", gender: "Masculino" },
  { id: "Iapetus", name: "Iapetus", gender: "Masculino" },
  { id: "Umbriel", name: "Umbriel", gender: "Masculino" },
  { id: "Algenib", name: "Algenib", gender: "Masculino" },
  { id: "Rasalgethi", name: "Rasalgethi", gender: "Masculino" },
  { id: "Alnilam", name: "Alnilam", gender: "Masculino" },
  { id: "Schedar", name: "Schedar", gender: "Masculino" },
  { id: "Gacrux", name: "Gacrux", gender: "Masculino" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", gender: "Masculino" },
  { id: "Sadachbia", name: "Sadachbia", gender: "Masculino" },
  { id: "Sadaltager", name: "Sadaltager", gender: "Masculino" },
];

export const VOICE_GENERATION_MODEL = 'gemini-2.5-flash-preview-tts';

// FIX: Add missing constants for script, image, and video generation.
// --- Script Generation ---
export const OPENAI_SCRIPT_GENERATION_MODEL = 'gpt-4-turbo';
export const HOOK_STYLES = ['Curiosidade', 'Controvérsia', 'Fato Chocante', 'Pergunta Direta'];
export const CTA_PLACEMENTS = ["Depois do hook", "Meio do roteiro", "Final do vídeo"];
export const CTA_OPTIONS = ['Curta e siga', 'Comente sua opinião', 'Confira o link na bio', 'Compartilhe com um amigo'];

// --- Image Generation ---
export const IMAGE_STYLES = [
  { id: 'cinematic', name: 'Cinematográfico', prompt: '**Estilo:** Cinematográfico, iluminação dramática, profundidade de campo rasa. **Câmera:** Lente 35mm, close-up. **Detalhes:** Hiper-realista, fotorrealista, 8k.' },
  { id: 'anime', name: 'Anime', prompt: '**Estilo:** Anime, estético, vibrante, arte digital de alta qualidade, de Makoto Shinkai. **Câmera:** Ângulo baixo. **Detalhes:** Cores vivas, linhas nítidas.' },
  { id: 'pixel', name: 'Pixel Art', prompt: '**Estilo:** Pixel art, 16-bit, nostálgico, videogame retrô. **Câmera:** Visão isométrica. **Detalhes:** Paleta de cores limitada, blocos visíveis.' },
  { id: 'watercolor', name: 'Aquarela', prompt: '**Estilo:** Pintura em aquarela, suave, etéreo, cores pastéis. **Câmera:** Ângulo amplo. **Detalhes:** Bordas suaves, pinceladas visíveis.' },
];


// --- Video Generation ---
export const VIDEO_EFFECTS = [
  { id: 'none', name: 'Nenhum' },
  { id: 'fade', name: 'Fade In' },
  { id: 'zoom_in', name: 'Zoom In Lento' },
  { id: 'zoom_out', name: 'Zoom Out Lento' },
  { id: 'pan', name: 'Pan Lento' },
];