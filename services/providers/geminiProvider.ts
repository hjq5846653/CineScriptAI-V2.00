import { GoogleGenAI, Type, Schema } from "@google/genai";
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

export class GoogleGeminiTextProvider implements ITextProvider {
  private config: SingleProviderConfig | null = null;
  private client: GoogleGenAI | null = null;

  readonly name: string = 'Google Gemini';
  readonly type: ProviderType = 'gemini';
  
  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: true,
    supportsImageGeneration: false,
    supportsVision: true,
    maxTokens: 100000,
  };

  private getSchema(): Schema {
    return {
      type: Type.OBJECT,
      properties: {
        sceneNumber: { type: Type.INTEGER },
        shotTitle: { type: Type.STRING },
        location: { type: Type.STRING },
        characters: { type: Type.STRING },
        props: { type: Type.STRING },
        action: { type: Type.STRING },
        dialogue: { type: Type.STRING },
        shotDescription: { type: Type.STRING },
        cameraAngle: { type: Type.STRING },
        cameraMovement: { type: Type.STRING },
        cameraFocus: { type: Type.STRING },
        depthOfField: { type: Type.STRING },
        lighting: { type: Type.STRING },
        imagePrompt: { type: Type.STRING },
        aspectRatio: { type: Type.STRING },
        transition: { type: Type.STRING },
        filmGrain: { type: Type.BOOLEAN },
        chromaticAberration: { type: Type.BOOLEAN },
        volumetricLighting: { type: Type.BOOLEAN },
      },
      required: ["sceneNumber", "location", "action", "cameraAngle", "lighting", "imagePrompt"]
    };
  }

  initialize(config: SingleProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required for Google Gemini provider');
    }
    this.config = config;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.client) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    const model = options?.model || this.config?.model || 'gemini-2.5-flash';
    const schema = this.getSchema();

    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        seed: options?.seed,
        systemInstruction: options?.systemPrompt,
      }
    });

    if (!response.text) {
      throw new Error('No response from Gemini API');
    }

    return {
      content: response.text,
      rawResponse: response,
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
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.config?.model || 'gemini-2.5-flash',
        contents: 'test',
        config: { maxOutputTokens: 1 }
      });
      return !!response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Gemini connection test failed: ${message}`);
    }
  }
}

export class GoogleGeminiImageProvider implements IImageProvider {
  private config: SingleProviderConfig | null = null;
  private client: GoogleGenAI | null = null;

  readonly name: string = 'Google Gemini Image';
  readonly type: ProviderType = 'gemini';
  
  readonly capabilities: ProviderCapabilities = {
    supportsTextGeneration: false,
    supportsImageGeneration: true,
    supportsVision: false,
    maxTokens: 0,
  };

  initialize(config: SingleProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required for Google Gemini provider');
    }
    this.config = config;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    const model = options?.model || 'gemini-2.5-flash-preview-05-20';
    const aspectRatio = options?.aspectRatio || '16:9';

    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
      config: {
        seed: options?.seed,
        imageConfig: { aspectRatio }
      }
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
      }
      throw new Error('No image generated');
    }

    return {
      imageData: data,
      mimeType: 'image/jpeg',
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
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.config?.model || 'gemini-2.5-flash-preview-05-20',
        contents: 'test image',
        config: { imageConfig: { aspectRatio: '16:9' } }
      });
      return !!response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Gemini image connection test failed: ${message}`);
    }
  }
}
