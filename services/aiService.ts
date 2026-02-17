import { Storyboard, Scene, AnalysisResult } from '../types';
import { APIConfig } from '../types/provider';
import { apiRouter, APILogger } from './providerFactory';

const STORAGE_KEY = 'cinescript_api_config';

function isValidJSONStructure(text: string): boolean {
  const trimmed = text.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

function extractJSON(text: string): string {
  let content = text.trim();
  
  const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    content = markdownMatch[1].trim();
  }
  
  content = normalizeQuotes(content);
  
  if (isValidJSONStructure(content)) {
    return content;
  }
  
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    content = content.substring(firstBrace, lastBrace + 1);
  }
  
  const firstBracket = content.indexOf('[');
  const lastBracket = content.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const hasBrace = content.indexOf('{') !== -1;
    if (!hasBrace || firstBracket < firstBrace) {
      content = content.substring(firstBracket, lastBracket + 1);
    }
  }
  
  return content;
}

function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u300C\u300D]/g, '"')
    .replace(/[\uFF02\uFF07]/g, '"')
    .replace(/[""„]/g, '"')
    .replace(/['''']/g, '"');
}

function fixMissingQuotes(text: string): string {
  let result = text;
  
  result = result.replace(/[\u2018\u2019]/g, "'");
  result = result.replace(/[\u201C\u201D\u300C\u300D\uFF02]/g, '"');
  
  result = result.replace(/"([a-zA-Z_]+):"/g, '"$1":');
  result = result.replace(/"([a-zA-Z_]+):\s*"/g, '"$1": "');
  
  result = result.replace(/:\s*""([^"]+)""/g, ': "$1"');
  
  result = result.replace(/,\s*([\]}])/g, '$1');
  
  result = result.replace(/:\s*\[([^\]]*)\]/g, (match, content) => {
    if (content.includes('"') || content.includes("'")) {
      return match;
    }
    const items = content.split(',').map((item: string) => `"${item.trim()}"`).join(', ');
    return `: [${items}]`;
  });
  
  return result;
}

function normalizeScene(scene: any): Scene {
  const normalizeField = (value: unknown): string => {
    if (!value) return '';
    if (Array.isArray(value)) {
      return value.flat(Infinity).filter((v): v is string => typeof v === 'string' && v.trim() !== '').join(', ');
    }
    if (typeof value === 'string') {
      let cleaned = value;
      cleaned = cleaned.replace(/\\"/g, '"');
      cleaned = cleaned.replace(/"/g, '');
      cleaned = cleaned.replace(/\s*,\s*/g, ', ');
      return cleaned.trim();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const normalizeDialogue = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string').join('\n');
      }
      const values = Object.values(value).filter((v): v is string => typeof v === 'string');
      return values.join('\n');
    }
    return String(value);
  };

  const normalizedScene: Scene = {
    sceneNumber: typeof scene.sceneNumber === 'number' ? scene.sceneNumber : parseInt(scene.sceneNumber) || 1,
    shotTitle: scene.shotTitle || undefined,
    location: normalizeField(scene.location),
    characters: normalizeField(scene.characters),
    props: normalizeField(scene.props),
    action: normalizeField(scene.action),
    dialogue: normalizeDialogue(scene.dialogue),
    shotDescription: scene.shotDescription || undefined,
    cameraAngle: normalizeField(scene.cameraAngle),
    cameraMovement: scene.cameraMovement || undefined,
    cameraFocus: scene.cameraFocus || undefined,
    depthOfField: scene.depthOfField || undefined,
    lighting: normalizeField(scene.lighting),
    imagePrompt: normalizeField(scene.imagePrompt),
    aspectRatio: scene.aspectRatio || '16:9',
    generatedImageUrl: scene.generatedImageUrl || undefined,
    notes: scene.notes || undefined,
    negativePrompt: scene.negativePrompt || undefined,
    transition: scene.transition || undefined,
    filmGrain: scene.filmGrain,
    chromaticAberration: scene.chromaticAberration,
    volumetricLighting: scene.volumetricLighting,
    error: scene.error || undefined,
  };

  if (!normalizedScene.imagePrompt || normalizedScene.imagePrompt.trim() === '') {
    normalizedScene.imagePrompt = [
      normalizedScene.location ? `场景: ${normalizedScene.location}` : '',
      normalizedScene.characters ? `角色: ${normalizedScene.characters}` : '',
      normalizedScene.action ? `动作: ${normalizedScene.action}` : '',
      normalizedScene.lighting ? `灯光: ${normalizedScene.lighting}` : '',
    ].filter(Boolean).join('; ');
    
    if (normalizedScene.imagePrompt.trim() === '') {
      normalizedScene.imagePrompt = `场景 ${normalizedScene.sceneNumber} 的图像`;
    }
  }

  return normalizedScene;
}

function robustJSONRepair(text: string): string {
  let result = text;
  
  result = result.replace(/[\u2018\u2019]/g, "'");
  result = result.replace(/[\u201C\u201D\u300C\u300D\uFF02]/g, '"');
  
  result = result.replace(/：/g, ':');
  result = result.replace(/，/g, ',');
  
  result = result.replace(/"([^"]+)"\s*:/g, '"$1":');
  result = result.replace(/"([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
  
  result = result.replace(/:\s*""([^"]*?)""/g, ': "$1"');
  
  result = result.replace(/:\s*'([^']*)'/g, ': "$1"');
  
  result = result.replace(/:\s*"([^"]*?)",/g, (match, content) => {
    const fixed = content.replace(/"/g, '\\"');
    return `: "${fixed}",`;
  });
  
  result = result.replace(/:\s*"([^"]*?)"([,\]}])/g, (match, content, end) => {
    const fixed = content.replace(/"/g, '\\"');
    return `: "${fixed}"${end}`;
  });
  
  result = result.replace(/,\s*([\]}])/g, '$1');
  
  result = result.replace(/\[\s*([^\]"']+)\s*\]/g, (match, content) => {
    if (content.includes('"') || content.includes("'")) {
      return match;
    }
    const items = content.split(',').map((item: string) => `"${item.trim()}"`).join(', ');
    return `[${items}]`;
  });
  
  result = result.replace(/"[^"]*_\w+_[^"]*":\s*"[^"]*"/g, '');
  
  return result;
}

function deepCleanJSON(text: string): string {
  let result = text;
  const errorLogs: string[] = [];
  
  result = result.replace(/[\u2018\u2019]/g, "'");
  result = result.replace(/[\u201C\u201D\u300C\u300D\uFF02]/g, '"');
  
  result = result.replace(/：/g, ':');
  result = result.replace(/，/g, ',');
  
  result = result.replace(/\\\"([a-zA-Z_][a-zA-Z0-9_]*)\\\"\s*:/g, '"$1":');
  
  result = result.replace(/\\\"([a-zA-Z_][a-zA-Z0-9_]*)\\\":/g, '"$1":');
  
  result = result.replace(/"[^"]*_comment[^"]*"\s*:\s*"[^"]*"\s*,?/gi, '');
  result = result.replace(/"[^"]*_comment[^"]*"\s*:\s*\{[^}]*\}\s*,?/gi, '');
  result = result.replace(/"[^"]*_\w+"\s*:\s*"[^"]*"\s*,?/g, '');
  result = result.replace(/"[^"]*_\w+"\s*:\s*\{[^}]*\}\s*,?/g, '');
  result = result.replace(/"[^"]*_\w+"\s*:\s*\[[^\]]*\]\s*,?/g, '');
  
  result = result.replace(/\{\s*"[^"]*"\s*:\s*"[^"]*"\s*,?\s*\}[\s,]*/g, '');
  result = result.replace(/\{\s*\}[\s,]*/g, '');
  result = result.replace(/\[\s*\][\s,]*/g, '');
  
  result = fixUnescapedQuotes(result, errorLogs);
  
  result = fixNewlinesInStrings(result, errorLogs);
  
  

  result = result.replace(/,\s*([\]}])/g, '$1');
  result = result.replace(/([\[{])\s*,/g, '$1');
  
  result = result.replace(/"sceneNumber"\s*:\s*(\d+)/g, '"sceneNumber": $1');
  result = result.replace(/"sceneNumber"\s*:\s*"(\d+)"/g, '"sceneNumber": $1');
  
  result = result.replace(/:\s*'([^']{1,500})'/g, ': "$1"');
  
  result = result.replace(/"([^"]+)"\s*:\s*"([^"]*)"([^":,}\]]*)"([^"]*)"/g, '"$1": "$2$3$4"');
  
  if (errorLogs.length > 0) {
    APILogger.log('debug', 'deepCleanJSON修复记录', { 
      fixCount: errorLogs.length,
      fixes: errorLogs.slice(0, 10)
    });
  }
  
  return result;
}

function fixUnescapedQuotes(text: string, errorLogs: string[]): string {
  let result = text;
  
  result = result.replace(/:\s*"([^"]*)"([^"]*)"([^"]*)"([^",}\]]*)([",}\]])/g, (match, before, quote, middle, after, end, offset) => {
    const fixedMiddle = middle.replace(/"/g, '\\"');
    return `: "${before}\\"${fixedMiddle}\\"${after}${end}`;
  });
  
  result = result.replace(/:\s*"([^"]+)"/g, (match, content, offset) => {
    const quoteCount = (content.match(/"/g) || []).length;
    if (quoteCount === 0) return match;
    
    if (quoteCount % 2 === 0) {
      const fixed = content.replace(/"/g, '\\"');
      return `: "${fixed}"`;
    }
    
    return match;
  });
  
  return result;
}

function fixNewlinesInStrings(text: string, errorLogs: string[]): string {
  let result = text;
  let newlineCount = 0;
  
  result = result.replace(/:\s*"([^"]*[\n\r]+[^"]*)"/g, (match, content, offset) => {
    newlineCount++;
    const position = `位置${offset}`;
    errorLogs.push(`${position}: 修复字符串内换行符`);
    const fixed = content
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `: "${fixed}"`;
  });
  
  result = result.replace(/"([^"]+)"\s*:\s*"([^"]*[\n\r]+[^"]*)"/g, (match, key, content, offset) => {
    newlineCount++;
    const position = `位置${offset}`;
    errorLogs.push(`${position}: 修复字段"${key}"中的换行符`);
    const fixed = content
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `"${key}": "${fixed}"`;
  });
  
  return result;
}

function tryParseJSON(text: string): object | null {
  try {
    return JSON.parse(text);
  } catch (e) {
    const error = e as Error;
    const sample = text.substring(0, 100);
    APILogger.log('debug', 'JSON.parse失败', { error: error.message, sample });
    return null;
  }
}

function parseJSONWithFallback<T>(text: unknown, fallback: T): T {
  if (text === null || text === undefined) {
    APILogger.log('warn', 'parseJSONWithFallback received null/undefined input');
    return fallback;
  }
  
  if (typeof text !== 'string') {
    APILogger.log('warn', 'parseJSONWithFallback received non-string input', { 
      type: typeof text,
      isNull: text === null,
      isUndefined: text === undefined,
      sample: String(text).substring(0, 100)
    });
    try {
      const strValue = normalizeQuotes(String(text));
      if (isValidJSONStructure(strValue)) {
        const parsed = JSON.parse(strValue);
        if (parsed && typeof parsed === 'object' && 'scenes' in parsed) {
          APILogger.log('debug', '成功解析非字符串输入');
          return parsed as T;
        }
      }
    } catch {
    }
    return fallback;
  }
  
  try {
    APILogger.log('debug', '开始解析JSON字符串', { length: text.length });
    const cleaned = extractJSON(text);
    APILogger.log('debug', 'extractJSON结果', { cleaned: cleaned.substring(0, 200) });
    
    const directParse = tryParseJSON(cleaned);
    APILogger.log('debug', '直接解析结果', { success: directParse !== null, type: directParse ? typeof directParse : null });
    if (directParse !== null) {
      if (typeof directParse === 'object' && directParse !== null) {
        const obj = directParse as Record<string, unknown>;
        if ('scenes' in obj && Array.isArray(obj.scenes)) {
          APILogger.log('debug', '直接解析成功', { scenesCount: obj.scenes.length });
          return directParse as T;
        }
      }
    }
    
    const fixed = fixMissingQuotes(cleaned);
    APILogger.log('debug', 'fixMissingQuotes结果', { fixed: fixed.substring(0, 200) });
    
    const repaired = robustJSONRepair(fixed);
    APILogger.log('debug', 'robustJSONRepair结果', { repaired: repaired.substring(0, 200) });
    
    const thirdParse = tryParseJSON(repaired);
    APILogger.log('debug', 'robustRepair解析结果', { success: thirdParse !== null });
    if (thirdParse !== null) {
      if (typeof thirdParse === 'object' && thirdParse !== null) {
        const obj = thirdParse as Record<string, unknown>;
        if ('scenes' in obj && Array.isArray(obj.scenes)) {
          APILogger.log('debug', 'robustRepair解析成功', { scenesCount: obj.scenes.length });
          return thirdParse as T;
        }
      }
    }
    
    const deepCleaned = deepCleanJSON(repaired);
    APILogger.log('debug', 'deepCleanJSON结果', { deepCleaned: deepCleaned.substring(0, 200) });
    
    const fourthParse = tryParseJSON(deepCleaned);
    APILogger.log('debug', 'deepClean解析结果', { success: fourthParse !== null });
    if (fourthParse !== null) {
      if (typeof fourthParse === 'object' && fourthParse !== null) {
        const obj = fourthParse as Record<string, unknown>;
        if ('scenes' in obj && Array.isArray(obj.scenes)) {
          APILogger.log('debug', 'deepClean解析成功', { scenesCount: obj.scenes.length });
          return fourthParse as T;
        }
      }
    }
    
    const simplified = fixed
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
    
    const secondParse = tryParseJSON(simplified);
    APILogger.log('debug', '简化解析结果', { success: secondParse !== null });
    if (secondParse !== null) {
      if (typeof secondParse === 'object' && secondParse !== null) {
        const obj = secondParse as Record<string, unknown>;
        if ('scenes' in obj && Array.isArray(obj.scenes)) {
          APILogger.log('debug', '简化解析成功', { scenesCount: obj.scenes.length });
          return secondParse as T;
        }
      }
    }
    
    const isValid = isValidJSONStructure(cleaned);
    APILogger.log('debug', 'isValidJSONStructure', { isValid });
    if (!isValid) {
      const extracted = extractJSONFromText(cleaned);
      if (extracted && typeof extracted === 'object' && 'scenes' in extracted) {
        APILogger.log('debug', '从文本中提取JSON成功');
        return extracted as T;
      }
    }
    
    APILogger.log('warn', '所有JSON解析方法均失败，尝试增量式场景提取');
    const extractedScenes = extractValidScenes(cleaned);
    
    if (extractedScenes.length > 0) {
      APILogger.log('info', '增量式提取成功，返回部分数据', { scenesCount: extractedScenes.length });
      const partialResult: Storyboard = {
        title: '部分解析结果',
        synopsis: '由于JSON格式问题，仅部分场景数据被成功提取',
        visualStyle: '',
        primarySetting: '',
        characters: '',
        consistencySeed: 0,
        scenes: extractedScenes,
        aspectRatio: '16:9'
      };
      return partialResult as T;
    }
  } catch (error) {
    APILogger.log('error', 'Error in parseJSONWithFallback', { error: String(error) });
    
    if (typeof text === 'string') {
      APILogger.log('warn', '异常处理中尝试增量式场景提取');
      const extractedScenes = extractValidScenes(text);
      
      if (extractedScenes.length > 0) {
        APILogger.log('info', '异常处理中增量式提取成功', { scenesCount: extractedScenes.length });
        const partialResult: Storyboard = {
          title: '部分解析结果',
          synopsis: '由于解析异常，仅部分场景数据被成功提取',
          visualStyle: '',
          primarySetting: '',
          characters: '',
          consistencySeed: 0,
          scenes: extractedScenes,
          aspectRatio: '16:9'
        };
        return partialResult as T;
      }
    }
  }
  
  APILogger.log('warn', '所有JSON解析方法均失败，使用fallback');
  return fallback;
}

function extractJSONFromText(text: unknown): object | null {
  if (typeof text !== 'string') {
    APILogger.log('warn', 'extractJSONFromText received non-string input', { type: typeof text });
    return null;
  }
  const lines = text.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentValue = '';
  let inObject = false;
  let inArray = false;
  let arrayValues: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes(':') && !trimmed.startsWith('#')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim().replace(/["']/g, '');
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (value && value !== '' && !value.startsWith('#')) {
        let cleanValue = value.replace(/^["']|["']$/g, '').trim();
        
        if (cleanValue === '{') {
          currentKey = key;
          inObject = true;
          result[key] = {};
        } else if (cleanValue === '[') {
          currentKey = key;
          inArray = true;
          arrayValues = [];
        } else if (inArray) {
          if (cleanValue === ']') {
            result[key] = arrayValues;
            inArray = false;
            arrayValues = [];
          } else {
            arrayValues.push(cleanValue);
          }
        } else if (cleanValue === '}') {
          inObject = false;
        } else {
          result[key] = cleanValue;
        }
      }
    }
  }
  
  if (Object.keys(result).length > 0) {
    return result;
  }
  return null;
}

function extractValidScenes(text: string): Scene[] {
  const scenes: Scene[] = [];
  
  APILogger.log('debug', '开始增量式场景提取', { textLength: text.length });
  
  const sceneNumberPattern = /(?:"sceneNumber"\s*:\s*(\d+)|sceneNumber\s*:\s*(\d+))/gi;
  const scenePositions: Array<{ number: number; start: number }> = [];
  let match;
  
  while ((match = sceneNumberPattern.exec(text)) !== null) {
    const number = parseInt(match[1] || match[2], 10);
    scenePositions.push({
      number,
      start: match.index
    });
  }
  
  APILogger.log('debug', '找到场景位置标记', { count: scenePositions.length });
  
  if (scenePositions.length === 0) {
    APILogger.log('warn', '未找到任何 sceneNumber 标记');
    return scenes;
  }
  
  for (let i = 0; i < scenePositions.length; i++) {
    const current = scenePositions[i];
    const next = scenePositions[i + 1];
    
    const sceneStart = text.lastIndexOf('{', current.start);
    let sceneEnd: number;
    
    if (next) {
      const searchStart = current.start;
      const textBetween = text.substring(searchStart, next.start);
      const lastBrace = textBetween.lastIndexOf('}');
      if (lastBrace !== -1) {
        sceneEnd = searchStart + lastBrace + 1;
      } else {
        sceneEnd = next.start - 1;
      }
    } else {
      sceneEnd = text.lastIndexOf('}') + 1;
    }
    
    if (sceneStart === -1 || sceneEnd <= sceneStart) {
      APILogger.log('debug', `场景 ${current.number} 边界无效，跳过`);
      continue;
    }
    
    let sceneText = text.substring(sceneStart, sceneEnd);
    
    sceneText = sceneText
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D\u300C\u300D\uFF02]/g, '"')
      .replace(/：/g, ':')
      .replace(/，/g, ',')
      .replace(/\\\"([a-zA-Z_][a-zA-Z0-9_]*)\\\"\s*:/g, '"$1":')
      .replace(/\\\"([a-zA-Z_][a-zA-Z0-9_]*)\\\":/g, '"$1":');
    
    if (!sceneText.endsWith('}')) {
      sceneText += '}';
    }
    
    try {
      const sceneObj = JSON.parse(sceneText) as Scene;
      if (sceneObj && typeof sceneObj === 'object' && 'sceneNumber' in sceneObj) {
        const validScene: Scene = {
          sceneNumber: sceneObj.sceneNumber,
          location: sceneObj.location || '',
          characters: sceneObj.characters || '',
          action: sceneObj.action || '',
          dialogue: sceneObj.dialogue || '',
          cameraAngle: sceneObj.cameraAngle || '',
          lighting: sceneObj.lighting || '',
          imagePrompt: sceneObj.imagePrompt || '',
          aspectRatio: sceneObj.aspectRatio || '16:9',
          ...sceneObj
        };
        scenes.push(validScene);
        APILogger.log('debug', `成功提取场景 ${current.number}`);
      }
    } catch (e) {
      APILogger.log('debug', `场景 ${current.number} 解析失败，尝试修复`, { 
        error: (e as Error).message,
        sceneText: sceneText.substring(0, 100)
      });
      
      const fixedScene = tryFixSceneObject(sceneText, current.number);
      if (fixedScene) {
        scenes.push(fixedScene);
        APILogger.log('debug', `场景 ${current.number} 修复成功`);
      }
    }
  }
  
  APILogger.log('info', '增量式场景提取完成', { 
    found: scenePositions.length, 
    extracted: scenes.length 
  });
  
  return scenes;
}

function tryFixSceneObject(sceneText: string, sceneNumber: number): Scene | null {
  const extractField = (text: string, fieldName: string): string => {
    const patterns = [
      new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i'),
      new RegExp(`"${fieldName}"\\s*:\\s*'([^']*)'`, 'i'),
      new RegExp(`"${fieldName}"\\s*:\\s*([^,\\]}]+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
    return '';
  };
  
  const extractArrayField = (text: string, fieldName: string): string => {
    const pattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  };
  
  const scene: Scene = {
    sceneNumber: sceneNumber,
    location: extractField(sceneText, 'location'),
    characters: extractArrayField(sceneText, 'characters') || extractField(sceneText, 'characters'),
    action: extractField(sceneText, 'action'),
    dialogue: extractField(sceneText, 'dialogue'),
    cameraAngle: extractField(sceneText, 'cameraAngle') || extractField(sceneText, 'camera angle'),
    lighting: extractField(sceneText, 'lighting'),
    imagePrompt: extractField(sceneText, 'imagePrompt') || extractField(sceneText, 'image prompt'),
    aspectRatio: extractField(sceneText, 'aspectRatio') || '16:9'
  };
  
  if (scene.imagePrompt || scene.action || scene.location) {
    return scene;
  }
  
  return null;
}

export function initializeProvider(): boolean {
  const savedConfig = localStorage.getItem(STORAGE_KEY);
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig) as APIConfig;
      apiRouter.configure(config);
      APILogger.log('info', 'API providers initialized from storage');
      return true;
    } catch (error) {
      APILogger.log('error', 'Failed to load API config from storage', error);
      return false;
    }
  }
  return false;
}

export function saveProviderConfig(config: APIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  apiRouter.configure(config);
  APILogger.log('info', 'API config saved to storage');
}

export function getProviderConfig(): APIConfig | null {
  const savedConfig = localStorage.getItem(STORAGE_KEY);
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig) as APIConfig;
    } catch {
      return null;
    }
  }
  return null;
}

export function isProviderConfigured(): boolean {
  return apiRouter.isConfigured();
}

function buildStoryboardPrompt(userIdea: string, targetSceneCount?: number): string {
  const sceneCountInstruction = targetSceneCount 
    ? `5. 分解为恰好 ${targetSceneCount} 个关键场景（scenes数组长度必须为${targetSceneCount}）`
    : '5. 分解为4-6个关键场景';
    
  return `Role: 世界级电影导演和编剧
任务：根据用户想法创作分镜脚本

要求：
1. 使用简体中文输出所有文本内容
2. 分析用户想法并撰写故事概要
3. 定义主要场景设定以减少场景转换
4. 定义核心角色，保持角色名称和描述一致
${sceneCountInstruction}
6. 创建详细的图像提示词，包含角色外貌描述

用户想法：${userIdea}

请以严格规范的JSON格式输出，所有字段名和字符串值必须使用英文双引号包裹。

重要规则：
1. 禁止在字符串值内使用英文双引号（"），如需引用请使用中文引号「」或《》
2. 禁止使用中文弯引号（"" ''），必须使用英文直引号（"）
3. 所有字符串值必须用英文双引号包裹
4. 字符串内的英文双引号必须转义为 \" 或替换为「」

正确的JSON示例：
{
  "title": "诗仙奇遇记",
  "lighting": "霓虹蓝紫光从广告牌倾泻而下，雾气泛着珍珠白微光。",
  "synopsis": "重新诠释了「存在」的意义"
}

错误的格式（缺少引号）会导致解析失败：
{
  "lighting": 霓虹蓝紫光
}

必须输出的JSON字段：title（标题）、synopsis（概要）、visualStyle（视觉风格）、primarySetting（主要场景）、characters（角色数组）、scenes（场景数组）。每个场景包含：sceneNumber（场景号）、location（地点）、characters（角色数组）、action（动作）、dialogue（对白）、cameraAngle（摄影角度）、lighting（灯光）、imagePrompt（图像提示词）、aspectRatio（宽高比）。`;
}

function buildImagePrompt(scene: Scene, visualStyle: string): string {
  const neg = scene.negativePrompt ? `\n**EXCLUDE**: ${scene.negativePrompt}` : '';

  let optics = "Arri Alexa sensor";
  if (scene.filmGrain !== false) optics += ", 35mm grain";
  if (scene.chromaticAberration !== false) optics += ", chromatic aberration";
  if (scene.volumetricLighting !== false) optics += ", volumetric lighting";

  return `
    # VISUAL SPEC
    **STYLE**: ${visualStyle}
    **ANGLE**: ${scene.cameraAngle}
    ---
    **CONTEXT**:
    LOC: ${scene.location || 'N/A'}
    CHARS: ${scene.characters || 'N/A'}
    PROPS: ${scene.props || 'N/A'}
    DESC: ${scene.imagePrompt}
    ---
    **TECH**:
    Lens: 35mm Anamorphic.
    Focus: ${scene.cameraFocus || 'Sharp on subject'}.
    Depth: ${scene.depthOfField || 'Shallow bokeh'}.
    Light: ${scene.lighting}.
    Move: ${scene.cameraMovement || 'Static'}.
    Optics: ${optics}.
    Quality: 8k photorealistic.
    ${neg}

    **CMD**: Create high-fidelity movie still adhering to style/composition.
  `.trim();
}

export async function generateStoryboardScript(userIdea: string, seed?: number, targetSceneCount?: number): Promise<Storyboard> {
  APILogger.log('info', '========== 阶段1: 故事生成 ==========');
  APILogger.log('info', '使用文本模型生成分镜脚本', { userIdea: userIdea.substring(0, 50) + '...', targetSceneCount });
  
  const prompt = buildStoryboardPrompt(userIdea, targetSceneCount);
  console.log('[DEBUG] 发送的提示词:', prompt);
  const result = await apiRouter.generateText(prompt, { seed, responseFormat: 'json' });
  console.log('[DEBUG] API响应内容:', result.content);

  APILogger.log('info', '文本模型响应成功，开始解析JSON');
  APILogger.log('debug', 'API响应内容预览', { content: result.content?.substring(0, 500) });
  
  const fallback: Storyboard = { 
    title: '未命名项目', 
    synopsis: '', 
    visualStyle: '', 
    primarySetting: '', 
    characters: '', 
    consistencySeed: 0, 
    scenes: [], 
    aspectRatio: '16:9' 
  };
  const storyboard = parseJSONWithFallback<Storyboard>(result.content, fallback);
  console.log('[DEBUG] 解析后的storyboard:', JSON.stringify(storyboard, null, 2));
  
  if (!storyboard.scenes || !Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    APILogger.log('error', '生成的脚本缺少有效的场景数组', { scenes: storyboard.scenes });
    throw new Error('生成的脚本缺少有效的场景数据');
  }
  
  storyboard.scenes = storyboard.scenes.map(normalizeScene);
  
  if (targetSceneCount && storyboard.scenes.length !== targetSceneCount) {
    APILogger.log('warn', '场景数量与目标不符，进行调整', { 
      actual: storyboard.scenes.length, 
      target: targetSceneCount 
    });
    
    if (storyboard.scenes.length < targetSceneCount) {
      const lastScene = storyboard.scenes[storyboard.scenes.length - 1];
      const additionalScenesNeeded = targetSceneCount - storyboard.scenes.length;
      
      for (let i = 0; i < additionalScenesNeeded; i++) {
        const newScene: Scene = {
          ...lastScene,
          sceneNumber: storyboard.scenes.length + 1,
          action: `场景 ${storyboard.scenes.length + 1} 的动作描述`,
          imagePrompt: `${storyboard.visualStyle} 风格的补充场景`,
          location: storyboard.primarySetting || lastScene.location,
          characters: lastScene.characters,
          props: lastScene.props,
          cameraAngle: lastScene.cameraAngle,
          lighting: lastScene.lighting,
        };
        storyboard.scenes.push(normalizeScene(newScene));
      }
      APILogger.log('info', '已补全场景数量', { newCount: storyboard.scenes.length });
    } else if (storyboard.scenes.length > targetSceneCount) {
      storyboard.scenes = storyboard.scenes.slice(0, targetSceneCount);
      storyboard.scenes.forEach((scene, index) => {
        scene.sceneNumber = index + 1;
      });
      APILogger.log('info', '已截断多余场景', { newCount: storyboard.scenes.length });
    }
  }
  
  storyboard.consistencySeed = seed !== undefined ? seed : Math.floor(Math.random() * 2000000000);
  
  APILogger.log('info', '========== 阶段1完成 ==========', { 
    title: storyboard.title, 
    sceneCount: storyboard.scenes.length,
    targetSceneCount 
  });
  
  return storyboard;
}

export async function generateSceneImage(scene: Scene, visualStyle: string, seed?: number): Promise<string> {
  if (!scene.imagePrompt || scene.imagePrompt.trim() === '') {
    APILogger.log('warn', '场景缺少图像提示词，跳过图像生成', { 
      sceneNumber: scene.sceneNumber,
      location: scene.location 
    });
    throw new Error(`场景 ${scene.sceneNumber} 缺少图像提示词，无法生成图像`);
  }
  
  const prompt = buildImagePrompt(scene, visualStyle);
  
  APILogger.log('info', '切换到图像生成模型', { 
    sceneNumber: scene.sceneNumber,
    location: scene.location 
  });
  
  const result = await apiRouter.generateImage(prompt, {
    seed,
    aspectRatio: scene.aspectRatio || '16:9'
  });

  APILogger.log('info', '图像生成完成', { 
    sceneNumber: scene.sceneNumber,
    mimeType: result.mimeType 
  });

  return `data:${result.mimeType};base64,${result.imageData}`;
}

export async function repairStoryboard(current: Storyboard): Promise<Storyboard> {
  const prompt = `Role: 剧本医生
任务：修复分镜脚本JSON中的数据问题

要求：
1. 使用简体中文修复所有文本内容
2. 修复拼写和语法错误
3. 填写缺失的字段（根据上下文推断）
4. 确保角色名称和描述的连贯性
5. 确保地点名称的一致性
6. 不要更改 'consistencySeed'、'imagePrompt'、'generatedImageUrl' 字段
7. 输出有效的JSON格式
8. 确保返回包含 scenes 数组，每个场景包含 sceneNumber

当前分镜脚本JSON：${JSON.stringify(current)}`;

  const result = await apiRouter.generateText(prompt, { responseFormat: 'json' });
  
  const fallback: Storyboard = { 
    title: current.title || '未命名项目', 
    synopsis: current.synopsis || '', 
    visualStyle: current.visualStyle || '', 
    primarySetting: current.location || '', 
    characters: '', 
    consistencySeed: current.consistencySeed || 0, 
    scenes: current.scenes || [], 
    aspectRatio: current.aspectRatio || '16:9',
    location: current.location
  };
  const repaired = parseJSONWithFallback<Storyboard>(result.content, fallback);
  
  if (!repaired.scenes || !Array.isArray(repaired.scenes) || repaired.scenes.length === 0) {
    APILogger.log('error', '修复后的脚本缺少有效的场景数组，使用原始数据');
    return current;
  }

  repaired.scenes = repaired.scenes.map((scene, i) => {
    const original = current.scenes.find(s => s.sceneNumber === scene.sceneNumber) || current.scenes[i];
    return {
      ...scene,
      generatedImageUrl: original?.generatedImageUrl,
      error: undefined
    };
  });
  repaired.consistencySeed = current.consistencySeed;
  return repaired;
}

export async function analyzeStoryboardIssues(storyboard: Storyboard): Promise<AnalysisResult> {
  const prompt = `Role: 连贯性监督员
任务：分析分镜脚本的问题

检查项目：
1. 连贯性（角色名称/地点）
2. 缺失数据
3. 故事逻辑

请使用简体中文输出分析结果，以JSON格式返回，包含issues（问题数组）和overallScore（总体评分）。

分镜脚本：${JSON.stringify(storyboard)}`;

  const result = await apiRouter.generateText(prompt, { responseFormat: 'json' });
  return parseJSONWithFallback<AnalysisResult>(result.content, { issues: [], overallScore: 100 });
}

export function getCurrentTextProviderName(): string {
  return apiRouter.getTextProviderName();
}

export function getCurrentImageProviderName(): string {
  return apiRouter.getImageProviderName();
}

export function getAPILogs(): Array<{timestamp: Date; level: string; message: string; data?: unknown}> {
  return APILogger.getLogs();
}

export function getAPIErrors(): Array<{timestamp: Date; message: string; data?: unknown}> {
  return APILogger.getRecentErrors();
}
