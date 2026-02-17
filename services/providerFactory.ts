import type { 
  ITextProvider, 
  IImageProvider,
  SingleProviderConfig,
  APIConfig,
  TextGenerationOptions,
  ImageGenerationOptions,
  TextGenerationResult,
  ImageGenerationResult,
  ProviderType,
} from '../types/provider';
import { customProviderService, CustomTextProvider, CustomImageProvider } from './providers/customProvider';

class APILogger {
  private static logs: Array<{timestamp: Date; level: string; message: string; data?: unknown}> = [];
  private static maxLogs = 100;

  static log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const entry = { timestamp: new Date(), level, message, data };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    if (level === 'error') {
      console.error(`[API ${level.toUpperCase()}] ${message}`, data);
    } else {
      console.log(`[API ${level.toUpperCase()}] ${message}`, data);
    }
  }

  static getLogs(): Array<{timestamp: Date; level: string; message: string; data?: unknown}> {
    return [...this.logs];
  }

  static clear(): void {
    this.logs = [];
  }

  static getRecentErrors(): Array<{timestamp: Date; message: string; data?: unknown}> {
    return this.logs
      .filter(l => l.level === 'error')
      .slice(-10)
      .map(l => ({ timestamp: l.timestamp, message: l.message, data: l.data }));
  }
}

export { APILogger };

class ProviderRegistry {
  private textProviders: Map<ProviderType, ITextProvider> = new Map();
  private imageProviders: Map<ProviderType, IImageProvider> = new Map();
  private config: APIConfig = { textProvider: null, imageProvider: null };
  private customProviders = customProviderService;

  registerTextProvider(type: ProviderType, provider: ITextProvider): void {
    this.textProviders.set(type, provider);
    APILogger.log('info', `Text provider registered: ${type}`);
  }

  registerImageProvider(type: ProviderType, provider: IImageProvider): void {
    this.imageProviders.set(type, provider);
    APILogger.log('info', `Image provider registered: ${type}`);
  }

  getTextProvider(type: ProviderType): ITextProvider | undefined {
    return this.textProviders.get(type);
  }

  getImageProvider(type: ProviderType): IImageProvider | undefined {
    return this.imageProviders.get(type);
  }

  getCustomTextProvider(customId: string): ITextProvider | undefined {
    const custom = this.customProviders.getById(customId);
    if (!custom) return undefined;
    
    const provider = new CustomTextProvider();
    provider.initialize(
      {
        type: 'custom',
        name: custom.name,
        apiKey: custom.apiKey,
        baseUrl: custom.baseUrl,
        model: custom.textModels[0],
      },
      custom
    );
    return provider;
  }

  getCustomImageProvider(customId: string): IImageProvider | undefined {
    const custom = this.customProviders.getById(customId);
    if (!custom) return undefined;
    
    const provider = new CustomImageProvider();
    provider.initialize(
      {
        type: 'custom',
        name: custom.name,
        apiKey: custom.apiKey,
        baseUrl: custom.baseUrl,
        model: custom.imageModels[0],
      },
      custom
    );
    return provider;
  }

  setConfig(config: APIConfig): void {
    this.config = config;
    
    if (config.textProvider) {
      let provider: ITextProvider | undefined;
      
      if (config.textProvider.type === 'custom') {
        provider = this.getCustomTextProvider(config.textProvider.name);
      } else {
        provider = this.textProviders.get(config.textProvider.type);
      }
      
      if (provider) {
        provider.initialize(config.textProvider);
        APILogger.log('info', `Text provider initialized: ${config.textProvider.type} - ${config.textProvider.model}`);
      }
    }

    if (config.imageProvider) {
      let provider: IImageProvider | undefined;
      
      if (config.imageProvider.type === 'custom') {
        provider = this.getCustomImageProvider(config.imageProvider.name);
      } else {
        provider = this.imageProviders.get(config.imageProvider.type);
      }
      
      if (provider) {
        provider.initialize(config.imageProvider);
        APILogger.log('info', `Image provider initialized: ${config.imageProvider.type} - ${config.imageProvider.model}`);
      }
    } else if (config.textProvider) {
      const textType = config.textProvider.type;
      
      if (textType === 'custom') {
        const providerId = config.textProvider.name;
        let customProvider = this.customProviders.getById(providerId);
        
        if (!customProvider) {
          customProvider = this.customProviders.getAll().find(p => p.id === providerId || p.name === providerId);
        }
        
        APILogger.log('debug', 'ProviderRegistry: Looking for custom provider', { 
          providerId,
          found: !!customProvider,
          supportsImage: customProvider?.supportsImage,
          imageModelsCount: customProvider?.imageModels?.length || 0
        });
        
        if (customProvider && customProvider.supportsImage && customProvider.imageModels.length > 0) {
          const provider = new CustomImageProvider();
          provider.initialize(
            {
              type: 'custom',
              name: customProvider.id,
              apiKey: config.textProvider.apiKey,
              baseUrl: config.textProvider.baseUrl,
              model: customProvider.imageModels[0],
            },
            customProvider
          );
          this.imageProviders.set('custom_fallback', provider);
          this.config.imageProvider = {
            ...config.textProvider,
            name: customProvider.name + ' (图像)'
          };
          APILogger.log('info', `Image provider fallback initialized for custom provider: ${customProvider.name}`);
        } else {
          APILogger.log('warn', 'ProviderRegistry: Custom provider not found or does not support image', {
            providerId,
            found: !!customProvider,
            supportsImage: customProvider?.supportsImage,
            imageModelsCount: customProvider?.imageModels?.length || 0
          });
        }
      } else {
        const imageProvider = this.imageProviders.get(textType);
        if (imageProvider) {
          imageProvider.initialize(config.textProvider);
          this.config.imageProvider = {
            ...config.textProvider,
            name: config.textProvider.name + ' (图像)'
          };
          APILogger.log('info', `Image provider fallback initialized using text provider: ${textType}`);
        }
      }
    }
  }

  getConfig(): APIConfig {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config.textProvider !== null;
  }

  hasImageProvider(): boolean {
    return this.config.imageProvider !== null;
  }

  getCustomProviders() {
    return this.customProviders;
  }
}

class APIRouter {
  private registry = new ProviderRegistry();
  private textProvider: ITextProvider | null = null;
  private imageProvider: IImageProvider | null = null;
  private currentTextProviderId: string | null = null;
  private currentImageProviderId: string | null = null;

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    const { GoogleGeminiTextProvider, GoogleGeminiImageProvider } = await import('./providers/geminiProvider');
    const { OpenAITextProvider, OpenAIImageProvider } = await import('./providers/openaiProvider');
    const { AnthropicTextProvider } = await import('./providers/anthropicProvider');

    this.registry.registerTextProvider('gemini', new GoogleGeminiTextProvider());
    this.registry.registerImageProvider('gemini', new GoogleGeminiImageProvider());
    
    this.registry.registerTextProvider('openai', new OpenAITextProvider());
    this.registry.registerImageProvider('openai', new OpenAIImageProvider());
    
    this.registry.registerTextProvider('anthropic', new AnthropicTextProvider());
  }

  configure(config: APIConfig): void {
    this.registry.setConfig(config);
    
    if (config.textProvider) {
      if (config.textProvider.type === 'custom') {
        this.textProvider = this.registry.getCustomTextProvider(config.textProvider.name) || null;
      } else {
        this.textProvider = this.registry.getTextProvider(config.textProvider.type) || null;
      }
      this.currentTextProviderId = config.textProvider.type === 'custom' ? config.textProvider.name : null;
    }
    if (config.imageProvider) {
      if (config.imageProvider.type === 'custom') {
        this.imageProvider = this.registry.getCustomImageProvider(config.imageProvider.name) || null;
      } else {
        this.imageProvider = this.registry.getImageProvider(config.imageProvider.type) || null;
      }
      this.currentImageProviderId = config.imageProvider.type === 'custom' ? config.imageProvider.name : null;
    } else if (config.textProvider) {
      const textType = config.textProvider.type;
      
      if (textType === 'custom') {
        const providerId = config.textProvider.name;
        const allCustomProviders = this.registry.getCustomProviders().getAll();
        
        APILogger.log('debug', 'Looking for custom provider for image generation', { 
          providerId,
          allProviders: allCustomProviders.map(p => ({ id: p.id, name: p.name, supportsImage: p.supportsImage, imageModelsCount: p.imageModels?.length || 0 }))
        });
        
        let customProvider = this.registry.getCustomProviders().getById(providerId);
        
        if (!customProvider) {
          customProvider = allCustomProviders.find(p => p.id === providerId || p.name === providerId);
          if (customProvider) {
            APILogger.log('debug', 'Found custom provider by name match', { id: customProvider.id, name: customProvider.name });
          }
        }
        
        APILogger.log('debug', 'Custom provider lookup result', { 
          found: !!customProvider,
          providerId,
          supportsImage: customProvider?.supportsImage,
          imageModels: customProvider?.imageModels
        });
        
        if (customProvider && customProvider.supportsImage && customProvider.imageModels.length > 0) {
          this.imageProvider = this.registry.getCustomImageProvider(customProvider.id);
          if (this.imageProvider) {
            this.imageProvider.initialize({
              type: 'custom',
              name: customProvider.id,
              apiKey: config.textProvider.apiKey,
              baseUrl: config.textProvider.baseUrl,
              model: customProvider.imageModels[0],
            }, customProvider);
            this.currentImageProviderId = customProvider.id;
            APILogger.log('info', `Image provider initialized for custom provider: ${customProvider.name}`);
          } else {
            APILogger.log('warn', 'Failed to get CustomImageProvider', { providerId: customProvider.id });
          }
        } else {
          APILogger.log('warn', 'Custom provider does not support image generation or has no image models', {
            providerId,
            found: !!customProvider,
            supportsImage: customProvider?.supportsImage,
            imageModelsCount: customProvider?.imageModels?.length || 0
          });
        }
      } else {
        this.imageProvider = this.registry.getImageProvider(textType) || null;
        if (this.imageProvider) {
          this.imageProvider.initialize(config.textProvider);
          APILogger.log('info', `Image provider initialized using text provider: ${textType}`);
        }
      }
    }
  }

  getConfig(): APIConfig {
    return this.registry.getConfig();
  }

  isConfigured(): boolean {
    return this.registry.isConfigured();
  }

  hasImageProvider(): boolean {
    return this.registry.hasImageProvider();
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.textProvider) {
      const error = new Error('文本生成未配置。请在设置中配置文本API供应商。');
      APILogger.log('error', 'Text generation not configured', { prompt: prompt.substring(0, 100) });
      throw error;
    }

    try {
      APILogger.log('info', 'Generating text', { 
        provider: this.textProvider.type, 
        model: options?.model || 'default',
        promptLength: prompt.length 
      });
      
      const result = await this.textProvider.generateText(prompt, options);
      
      APILogger.log('info', 'Text generated successfully', { 
        contentLength: result.content.length 
      });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '文本生成失败';
      APILogger.log('error', 'Text generation failed', { error: message, prompt: prompt.substring(0, 100) });
      throw error;
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.imageProvider) {
      let errorMessage = '图像生成未配置。请在设置中配置图像API供应商。';
      
      if (this.textProvider) {
        const textType = this.textProvider.type;
        if (textType === 'custom' && this.currentTextProviderId) {
          const customProvider = this.registry.getCustomProviders().getById(this.currentTextProviderId);
          if (customProvider && !customProvider.supportsImage) {
            errorMessage = `当前自定义供应商 "${customProvider.name}" 不支持图像生成。请配置支持图像的供应商（如 SiliconFlow、Replicate）。`;
          } else if (customProvider && customProvider.imageModels.length === 0) {
            errorMessage = `当前自定义供应商 "${customProvider.name}" 未配置图像模型。请在设置中添加图像模型。`;
          }
        } else if (textType === 'anthropic') {
          errorMessage = 'Anthropic Claude 不支持图像生成。请配置支持图像的供应商（如 Gemini、OpenAI）。';
        }
      }
      
      const error = new Error(errorMessage);
      APILogger.log('error', 'Image generation not configured', { prompt: prompt.substring(0, 100), textProviderType: this.textProvider?.type });
      throw error;
    }

    try {
      const actualModel = this.imageProvider instanceof Object && 'customProvider' in this.imageProvider 
        ? (this.imageProvider as unknown as { customProvider?: { imageModels?: string[] } }).customProvider?.imageModels?.[0] || options?.model || 'default'
        : options?.model || 'default';
      APILogger.log('info', 'Generating image', { 
        provider: this.imageProvider.type, 
        model: actualModel,
        promptLength: prompt.length,
        aspectRatio: options?.aspectRatio 
      });
      
      const result = await this.imageProvider.generateImage(prompt, options);
      
      APILogger.log('info', 'Image generated successfully', { 
        mimeType: result.mimeType,
        dataLength: result.imageData.length 
      });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '图像生成失败';
      APILogger.log('error', 'Image generation failed', { error: message, prompt: prompt.substring(0, 100) });
      throw error;
    }
  }

  async testTextConnection(): Promise<boolean> {
    if (!this.textProvider) {
      return false;
    }
    try {
      await this.textProvider.testConnection();
      APILogger.log('info', 'Text provider connection test passed');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      APILogger.log('error', 'Text provider connection test failed', { error: message });
      return false;
    }
  }

  async testImageConnection(): Promise<boolean> {
    if (!this.imageProvider) {
      return false;
    }
    try {
      await this.imageProvider.testConnection();
      APILogger.log('info', 'Image provider connection test passed');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      APILogger.log('error', 'Image provider connection test failed', { error: message });
      return false;
    }
  }

  getTextProviderName(): string {
    const config = this.registry.getConfig();
    return config.textProvider?.name || '未配置';
  }

  getImageProviderName(): string {
    const config = this.registry.getConfig();
    return config.imageProvider?.name || '未配置';
  }

  getCustomProviders() {
    return customProviderService.getAll();
  }

  addCustomProvider(provider: Omit<import('../types/provider').CustomProviderInfo, 'id' | 'createdAt'>) {
    return customProviderService.add(provider);
  }

  updateCustomProvider(id: string, updates: Partial<Omit<import('../types/provider').CustomProviderInfo, 'id' | 'createdAt'>>) {
    return customProviderService.update(id, updates);
  }

  deleteCustomProvider(id: string) {
    return customProviderService.delete(id);
  }
}

export const apiRouter = new APIRouter();

export type { ITextProvider, IImageProvider, SingleProviderConfig, APIConfig };
export type { TextGenerationOptions, ImageGenerationOptions };
export type { TextGenerationResult, ImageGenerationResult };
