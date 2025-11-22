
export interface Scene {
  sceneNumber: number;
  shotTitle?: string;
  location: string;
  characters?: string;
  props?: string;
  action: string;
  dialogue?: string;
  shotDescription?: string;
  cameraAngle: string;
  cameraMovement?: string;
  cameraFocus?: string;
  depthOfField?: string;
  lighting: string;
  imagePrompt: string;
  aspectRatio?: string;
  generatedImageUrl?: string;
  notes?: string;
  negativePrompt?: string;
  transition?: string;
  // Cinematic Effects
  filmGrain?: boolean;
  chromaticAberration?: boolean;
  volumetricLighting?: boolean;
  // State
  error?: string;
}

export interface Storyboard {
  title: string;
  synopsis: string;
  genre: string;
  visualStyle: string;
  location?: string; // Primary setting
  scenes: Scene[];
  consistencySeed?: number;
  aspectRatio?: string;
}

export interface StoryboardIssue {
  type: 'consistency' | 'missing_data' | 'logic' | 'visual';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  sceneNumber?: number;
}

export interface AnalysisResult {
  issues: StoryboardIssue[];
  overallScore: number;
}

export enum AppState {
  IDLE,
  GENERATING_SCRIPT,
  GENERATING_IMAGES,
  COMPLETE,
  ERROR
}
