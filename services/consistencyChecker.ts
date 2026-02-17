import { TrackedEntity } from '../types';
import { APILogger } from './providerFactory';

interface ConsistencyResult {
  score: number;
  passed: boolean;
  warnings: string[];
}

const CONSISTENCY_THRESHOLD = 85;

function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>();
  
  const colorKeywords = ['红', '蓝', '绿', '黄', '白', '黑', '金', '银', '紫', '橙', '粉'];
  const styleKeywords = ['古装', '现代', '西装', '汉服', '旗袍', '军装', '休闲'];
  const featureKeywords = ['长发', '短发', '眼镜', '胡须', '长发', '秃头', '瘦', '胖'];
  
  const allKeywords = [...colorKeywords, ...styleKeywords, ...featureKeywords];
  
  for (const kw of allKeywords) {
    if (text.includes(kw)) {
      keywords.add(kw);
    }
  }
  
  return keywords;
}

function calculateKeywordSimilarity(desc1: string, desc2: string): number {
  const keywords1 = extractKeywords(desc1);
  const keywords2 = extractKeywords(desc2);
  
  if (keywords1.size === 0 && keywords2.size === 0) return 100;
  if (keywords1.size === 0 || keywords2.size === 0) return 50;
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  return Math.round((intersection.size / union.size) * 100);
}

export function checkEntityConsistency(
  entity: TrackedEntity,
  newDescription: string
): ConsistencyResult {
  const warnings: string[] = [];
  
  const similarity = calculateKeywordSimilarity(entity.visualDescription, newDescription);
  
  const passed = similarity >= CONSISTENCY_THRESHOLD;
  
  if (!passed) {
    warnings.push(`实体 "${entity.name}" 一致性分数 ${similarity}% 低于阈值 ${CONSISTENCY_THRESHOLD}%`);
    warnings.push(`原始描述: ${entity.visualDescription}`);
    warnings.push(`新描述: ${newDescription}`);
  }
  
  APILogger.log('debug', `一致性检查: ${entity.name}`, {
    similarity,
    passed,
    originalDesc: entity.visualDescription.substring(0, 50),
    newDesc: newDescription.substring(0, 50),
  });
  
  return {
    score: similarity,
    passed,
    warnings,
  };
}

export function checkSceneConsistency(
  scenePrompt: string,
  trackedEntities: TrackedEntity[]
): { score: number; entityScores: Map<string, number> } {
  const entityScores = new Map<string, number>();
  let totalScore = 0;
  let count = 0;
  
  for (const entity of trackedEntities) {
    if (scenePrompt.includes(entity.name)) {
      const similarity = calculateKeywordSimilarity(entity.visualDescription, scenePrompt);
      entityScores.set(entity.id, similarity);
      totalScore += similarity;
      count++;
    }
  }
  
  const avgScore = count > 0 ? Math.round(totalScore / count) : 100;
  
  return {
    score: avgScore,
    entityScores,
  };
}

export function generateConsistencyPrompt(
  entityNames: string[],
  trackedEntities: TrackedEntity[]
): string {
  const descriptors: string[] = [];
  
  for (const name of entityNames) {
    const entity = trackedEntities.find(e => e.name === name);
    if (entity) {
      descriptors.push(`【${entity.name}】必须保持以下外观特征: ${entity.visualDescription}`);
    }
  }
  
  if (descriptors.length === 0) return '';
  
  return `

【重要】跨分镜视觉一致性要求：
${descriptors.join('\n')}

请确保上述实体在当前分镜中保持与之前分镜一致的外观特征。`;
}

export function getConsistencyThreshold(): number {
  return CONSISTENCY_THRESHOLD;
}

export { CONSISTENCY_THRESHOLD };
