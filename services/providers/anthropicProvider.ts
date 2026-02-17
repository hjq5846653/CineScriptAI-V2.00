import type {
  ITextProvider,
  SingleProviderConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ProviderCapabilities,
  ProviderType
} from '../../types/provider';

export class AnthropicTextProvider implements ITextProvider {
  private config: SingleProviderConfig | null = null;

  readonly name: string = 'Anthropic Claude';
  readonly type: ProviderType = 'anthropic';

  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: true,
    supportsImageGeneration: false,
    supportsVision: true,
    maxTokens: 200000,
  };

  initialize(config: SingleProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required for Anthropic provider');
    }
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
    };
  }

  private getHeaders(): HeadersInit {
    if (!this.config?.apiKey) {
      throw new Error('API key not configured');
    }
    return {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const model = options?.model || this.config.model || 'claude-sonnet-4-20250514';
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';

    const systemPrompt = options?.systemPrompt || 'You are a world-class film director. Output valid JSON only.';

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No response content from Anthropic API');
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
      const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model || 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return response.ok || response.status === 400;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Anthropic connection test failed: ${message}`);
    }
  }
}
