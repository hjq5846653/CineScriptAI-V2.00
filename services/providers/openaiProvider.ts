import type {
  ITextProvider,
  IImageProvider,
  SingleProviderConfig,
  TextGenerationOptions,
  ImageGenerationOptions,
  TextGenerationResult,
  ImageGenerationResult,
  ProviderCapabilities,
  ProviderType
} from '../../types/provider';

export class OpenAITextProvider implements ITextProvider {
  private config: SingleProviderConfig | null = null;

  readonly name: string = 'OpenAI';
  readonly type: ProviderType = 'openai';

  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: true,
    supportsImageGeneration: false,
    supportsVision: true,
    maxTokens: 128000,
  };

  initialize(config: SingleProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required for OpenAI provider');
    }
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    };
  }

  private getHeaders(): HeadersInit {
    if (!this.config?.apiKey) {
      throw new Error('API key not configured');
    }
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const model = options?.model || this.config.model || 'gpt-4o';
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
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
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI API');
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
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`OpenAI connection test failed: ${message}`);
    }
  }
}

export class OpenAIImageProvider implements IImageProvider {
  private config: SingleProviderConfig | null = null;

  readonly name: string = 'OpenAI DALL-E';
  readonly type: ProviderType = 'openai';

  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: false,
    supportsImageGeneration: true,
    supportsVision: false,
    maxTokens: 0,
  };

  initialize(config: SingleProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required for OpenAI provider');
    }
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    };
  }

  private getHeaders(): HeadersInit {
    if (!this.config?.apiKey) {
      throw new Error('API key not configured');
    }
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const model = options?.model || 'dall-e-3';
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    const sizeMap: Record<string, string> = {
      '16:9': '1792x1024',
      '4:3': '1024x768',
      '1:1': '1024x1024',
      '9:16': '1024x1792',
    };
    const size = sizeMap[options?.aspectRatio || '16:9'] || '1792x1024';

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0]?.b64_json;

    if (!imageData) {
      throw new Error('No image generated');
    }

    return {
      imageData,
      mimeType: 'image/png',
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
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`OpenAI connection test failed: ${message}`);
    }
  }
}
