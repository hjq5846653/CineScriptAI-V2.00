import type {
  ITextProvider,
  IImageProvider,
  SingleProviderConfig,
  TextGenerationOptions,
  ImageGenerationOptions,
  TextGenerationResult,
  ImageGenerationResult,
  ProviderCapabilities,
  ProviderType,
  CustomProviderInfo,
} from '../../types/provider';

const STORAGE_KEY = 'cinescript_custom_providers';

class CustomProviderService {
  private providers: Map<string, CustomProviderInfo> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as CustomProviderInfo[];
        data.forEach(p => this.providers.set(p.id, p));
      }
    } catch (error) {
      console.error('Failed to load custom providers:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.providers.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save custom providers:', error);
    }
  }

  getAll(): CustomProviderInfo[] {
    return Array.from(this.providers.values());
  }

  getById(id: string): CustomProviderInfo | undefined {
    return this.providers.get(id);
  }

  add(provider: Omit<CustomProviderInfo, 'id' | 'createdAt'>): CustomProviderInfo {
    const newProvider: CustomProviderInfo = {
      ...provider,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now(),
    };
    this.providers.set(newProvider.id, newProvider);
    this.saveToStorage();
    return newProvider;
  }

  update(id: string, updates: Partial<Omit<CustomProviderInfo, 'id' | 'createdAt'>>): boolean {
    const provider = this.providers.get(id);
    if (!provider) return false;

    const updated = { ...provider, ...updates };
    this.providers.set(id, updated);
    this.saveToStorage();
    return true;
  }

  delete(id: string): boolean {
    const deleted = this.providers.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }
}

export const customProviderService = new CustomProviderService();

export class CustomTextProvider implements ITextProvider {
  private config: SingleProviderConfig | null = null;
  private customProvider: CustomProviderInfo | null = null;

  readonly name: string = 'Custom Provider';
  readonly type: ProviderType = 'custom';
  
  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: true,
    supportsImageGeneration: false,
    supportsVision: false,
    maxTokens: 32000,
  };

  initialize(config: SingleProviderConfig, customProvider?: CustomProviderInfo): void {
    if (!config.apiKey) {
      throw new Error('API key is required for custom provider');
    }
    this.config = config;
    this.customProvider = customProvider || null;
  }

  private getHeaders(): HeadersInit {
    if (!this.config?.apiKey) {
      throw new Error('API key not configured');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.config || !this.customProvider) {
      throw new Error('Custom provider not initialized');
    }

    const model = options?.model || this.customProvider.textModels[0] || 'gpt-3.5-turbo';
    const baseUrl = this.config.baseUrl || this.customProvider.baseUrl;

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'system',
          content: options?.systemPrompt || 'You are a world-class film director.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 4096,
      top_p: options?.topP ?? 0.7,
      top_k: options?.topK ?? 50,
      frequency_penalty: options?.frequencyPenalty ?? 0.5,
      presence_penalty: options?.presencePenalty ?? 0.0,
      n: 1,
      response_format: options?.responseFormat === 'json' 
        ? { type: 'json_object' } 
        : { type: 'text' },
    };

    if (options?.stop && options.stop.length > 0) {
      requestBody.stop = options.stop;
    }

    if (options?.enableThinking === true) {
      requestBody.enable_thinking = true;
      if (options?.thinkingBudget !== undefined) {
        requestBody.thinking_budget = options.thinkingBudget;
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from custom API');
    }

    return {
      content,
      rawResponse: data,
    };
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false;
    }
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config || !this.customProvider) {
      throw new Error('Custom provider not initialized');
    }

    try {
      const baseUrl = this.config.baseUrl || this.customProvider.baseUrl;
      const model = this.customProvider.textModels[0] || 'gpt-3.5-turbo';
      
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Custom provider connection test failed: ${message}`);
    }
  }
}

export class CustomImageProvider implements IImageProvider {
  private config: SingleProviderConfig | null = null;
  private customProvider: CustomProviderInfo | null = null;

  readonly name: string = 'Custom Image Provider';
  readonly type: ProviderType = 'custom';
  
  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: false,
    supportsImageGeneration: true,
    supportsVision: false,
    maxTokens: 0,
  };

  private isImageModel(model: string): boolean {
    const imageModelKeywords = [
      'image', 'vision', 'dalle', 'dall-e', 'stable-diffusion', 
      'sd', 'flux', 'sdxl', 'pixart', 'kling', 'wan', 'cogview',
      'qwen-vl', 'qwen2-vl', 'qwen2.5-vl', 'qwen-image', 'minimax'
    ];
    const lowerModel = model.toLowerCase();
    return imageModelKeywords.some(k => lowerModel.includes(k));
  }

  initialize(config: SingleProviderConfig, customProvider?: CustomProviderInfo): void {
    if (!config.apiKey) {
      throw new Error('API key is required for custom provider');
    }
    this.config = config;
    this.customProvider = customProvider || null;
  }

  private getHeaders(): HeadersInit {
    if (!this.config?.apiKey) {
      throw new Error('API key not configured');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.config || !this.customProvider) {
      throw new Error('Custom provider not initialized');
    }

    const model = options?.model || this.customProvider.imageModels[0];
    const baseUrl = this.config.baseUrl || this.customProvider.baseUrl;

    if (!model) {
      throw new Error('No image model configured. Please add an image model to your custom provider.');
    }

    if (this.isImageModel(model)) {
      return this.generateWithImageAPI(model, baseUrl, prompt, options);
    } else {
      return this.generateWithVisionAPI(model, baseUrl, prompt, options);
    }
  }

  private async generateWithImageAPI(model: string, baseUrl: string, prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const sizeMap: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1792, height: 1024 },
      '4:3': { width: 1024, height: 768 },
      '1:1': { width: 1024, height: 1024 },
      '9:16': { width: 1024, height: 1792 },
      '2.39:1': { width: 1792, height: 768 },
      '2.35:1': { width: 1792, height: 768 },
      '1.85:1': { width: 1792, height: 960 },
      '21:9': { width: 1792, height: 768 },
    };
    
    const isFluxModel = model.toLowerCase().includes('flux');
    const isSDModel = model.toLowerCase().includes('sd') || model.toLowerCase().includes('stable-diffusion');
    const isSiliconFlow = baseUrl.includes('siliconflow');
    const sizeConfig = sizeMap[options?.aspectRatio || '16:9'] || { width: 1024, height: 1024 };

    const requestBody: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
    };

    if (isSiliconFlow) {
      requestBody.image_size = `${sizeConfig.width}x${sizeConfig.height}`;
      if (options?.seed !== undefined) {
        requestBody.seed = options.seed;
      }
      if (isFluxModel) {
        requestBody.guidance_scale = 7.5;
        requestBody.num_inference_steps = 25;
      }
    } else if (isFluxModel) {
      requestBody.image_size = {
        width: sizeConfig.width,
        height: sizeConfig.height,
      };
      requestBody.response_format = 'b64_json';
      if (options?.negativePrompt) {
        requestBody.negative_prompt = options.negativePrompt;
      }
      if (options?.seed !== undefined) {
        requestBody.seed = options.seed;
      }
      requestBody.guidance_scale = 7.5;
      requestBody.num_inference_steps = 25;
    } else if (isSDModel) {
      requestBody.image_size = `${sizeConfig.width}x${sizeConfig.height}`;
      requestBody.response_format = 'b64_json';
      if (options?.seed !== undefined) {
        requestBody.seed = options.seed;
      }
    } else {
      requestBody.size = `${sizeConfig.width}x${sizeConfig.height}`;
      requestBody.response_format = 'b64_json';
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Image API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0]?.b64_json || data.data?.[0]?.url;

    if (!imageData) {
      throw new Error('No image generated');
    }

    if (imageData.startsWith('http')) {
      const imgResponse = await fetch(imageData);
      const imgBlob = await imgResponse.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imgBlob);
      });
      const base64Data = base64.split(',')[1];
      return {
        imageData: base64Data,
        mimeType: imgBlob.type || 'image/png',
      };
    }

    return {
      imageData,
      mimeType: 'image/png',
    };
  }

  private async generateWithVisionAPI(model: string, baseUrl: string, prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const visionPrompt = `You are an expert AI image generator. Generate a detailed image prompt for: ${prompt}

Create a high-quality, cinematic image with:
- Professional film quality
- Cinematic lighting and composition
- Detailed visual elements
- No text, watermarks, or signatures`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating detailed image generation prompts. Output ONLY the image prompt description, no additional text or explanations.'
          },
          {
            role: 'user',
            content: visionPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No prompt generated from vision model');
    }

    throw new Error(`模型 "${model}" 是视觉理解模型，不能生成图像。请使用图像生成模型（如包含 "image"、"dalle"、"sd"、"flux" 等关键词的模型），或配置支持 /images/generations 接口的API供应商。`);
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false;
    }
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config || !this.customProvider) {
      throw new Error('Custom provider not initialized');
    }

    try {
      const baseUrl = this.config.baseUrl || this.customProvider.baseUrl;
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Custom provider connection test failed: ${message}`);
    }
  }
}
