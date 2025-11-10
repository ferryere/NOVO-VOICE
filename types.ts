// FIX: Add missing type definitions to resolve import errors.
export enum AppStep {
  SCRIPT = 'SCRIPT',
  VOICE_OVER = 'VOICE_OVER',
  IMAGES = 'IMAGES',
  VIDEO = 'VIDEO',
}

export interface Script {
  hook: string[];
  blocks: string[];
  cta: string;
  ctaPlacement: string;
}

export interface GeneratedImage {
  id: string;
  text: string;
  imageUrl: string;
}
