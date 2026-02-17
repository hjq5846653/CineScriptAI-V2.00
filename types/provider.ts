export type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'custom';

export interface SingleProviderConfig {
  type: ProviderType;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface APIConfig {
  textProvider: SingleProviderConfig | null;
  imageProvider: SingleProviderConfig | null;
}

export interface ImageGenerationResult {
  imageData: string;
  mimeType: string;
}

export interface TextGenerationResult {
  content: string;
  rawResponse?: unknown;
}

export interface ProviderCapabilities {
  supportsTextGeneration: boolean;
  supportsImageGeneration: boolean;
  supportsVision: boolean;
  maxTokens?: number;
}

export interface ITextProvider {
  readonly name: string;
  readonly type: ProviderType;
  readonly capabilities: ProviderCapabilities;
  
  initialize(config: SingleProviderConfig): void;
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  validateConfig(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}

export interface IImageProvider {
  readonly name: string;
  readonly type: ProviderType;
  readonly capabilities: ProviderCapabilities;
  
  initialize(config: SingleProviderConfig): void;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  validateConfig(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}

export interface TextGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  enableThinking?: boolean;
  thinkingBudget?: number;
}

export interface ImageGenerationOptions {
  model?: string;
  aspectRatio?: string;
  seed?: number;
  negativePrompt?: string;
}

export interface ProviderInfo {
  type: ProviderType;
  name: string;
  supportsText: boolean;
  supportsImage: boolean;
  defaultTextModel?: string;
  defaultImageModel?: string;
  baseUrl?: string;
  icon?: string;
}

export interface CustomProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  textModels: string[];
  imageModels: string[];
  supportsText: boolean;
  supportsImage: boolean;
  createdAt: number;
}

export const BUILTIN_PROVIDERS: ProviderInfo[] = [
  {
    type: 'gemini',
    name: 'Google Gemini',
    supportsText: true,
    supportsImage: true,
    defaultTextModel: 'gemini-2.5-flash',
    defaultImageModel: 'gemini-2.5-flash-preview-05-20',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  {
    type: 'openai',
    name: 'OpenAI',
    supportsText: true,
    supportsImage: true,
    defaultTextModel: 'gpt-4o',
    defaultImageModel: 'dall-e-3',
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    type: 'anthropic',
    name: 'Anthropic Claude',
    supportsText: true,
    supportsImage: false,
    defaultTextModel: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com/v1',
  },
];

export const POPULAR_CUSTOM_PROVIDERS: Omit<CustomProviderInfo, 'id' | 'createdAt' | 'apiKey'>[] = [
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    textModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
  {
    name: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    textModels: ['Qwen/Qwen2-72B-Instruct', 'THUDM/glm-4-9b-chat'],
    imageModels: ['stabilityai/stable-diffusion-xl-base-1.0'],
    supportsText: true,
    supportsImage: true,
  },
  {
    name: 'together.ai',
    baseUrl: 'https://api.together.xyz/v1',
    textModels: ['togethercomputer/llama-3-70b-chat', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
  {
    name: 'Anyscale',
    baseUrl: 'https://api.endpoints.anyscale.com/v1',
    textModels: ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'meta-llama/Llama-2-70b-chat-hf'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
  {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    textModels: ['accounts/fireworks/models/llama-v3-70b-instruct', 'accounts/fireworks/models/qwen2-72b-instruct'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
  {
    name: 'Replicate',
    baseUrl: 'https://api.replicate.com/v1',
    textModels: ['meta/llama-3-70b-instruct', 'mistralai/mixtral-8x7b-instruct-v0.1'],
    imageModels: ['stability-ai/stable-diffusion-xl'],
    supportsText: true,
    supportsImage: true,
  },
  {
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
    textModels: ['@cf/meta/llama-3-70b-instruct'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
  {
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    textModels: ['meta-llama/Llama-3-70b-Instruct', 'mistralai/Mixtral-8x7B-v0.1'],
    imageModels: [],
    supportsText: true,
    supportsImage: false,
  },
];

export const SUPPORTED_IMAGE_MODELS: Record<ProviderType, string[]> = {
  gemini: ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash-exp'],
  openai: ['dall-e-3', 'dall-e-2'],
  anthropic: [],
  custom: [],
};

export const SUPPORTED_TEXT_MODELS: Record<ProviderType, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-opus-20240229'],
  custom: [],
};

export function getProviderInfo(type: ProviderType): ProviderInfo | undefined {
  return BUILTIN_PROVIDERS.find(p => p.type === type);
}

export function getTextModels(type: ProviderType): string[] {
  return SUPPORTED_TEXT_MODELS[type] || [];
}

export function getImageModels(type: ProviderType): string[] {
  return SUPPORTED_IMAGE_MODELS[type] || [];
}

export function isProviderSupportsImage(type: ProviderType): boolean {
  const info = getProviderInfo(type);
  return info?.supportsImage || false;
}

export function isProviderSupportsText(type: ProviderType): boolean {
  const info = getProviderInfo(type);
  return info?.supportsText || false;
}

export function createCustomProviderId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function validateCustomProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

export function validateApiKey(key: string): boolean {
  return key.length >= 8 && /^[a-zA-Z0-9_\-]+$/.test(key);
}
