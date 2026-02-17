
export interface EntityReference {
  entityId: string;
  entityName: string;
  entityType: 'character' | 'prop' | 'location';
  consistencyScore?: number;
}

export interface TrackedEntity {
  id: string;
  name: string;
  type: 'character' | 'prop' | 'location';
  visualDescription: string;
  firstAppearanceScene: number;
  featureVector?: string;
  locked: boolean;
}

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
  filmGrain?: boolean;
  chromaticAberration?: boolean;
  volumetricLighting?: boolean;
  error?: string;
  entityReferences?: EntityReference[];
}

export interface Storyboard {
  title: string;
  synopsis: string;
  genre: string;
  visualStyle: string;
  location?: string;
  scenes: Scene[];
  consistencySeed?: number;
  aspectRatio?: string;
  targetSceneCount?: number;
  trackedEntities?: TrackedEntity[];
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

export type SceneCountMode = 'manual' | 'auto';

export interface SceneCountConfig {
  mode: SceneCountMode;
  count: number;
  recommendation?: number;
}
