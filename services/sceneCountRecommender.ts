import { APILogger } from './providerFactory';

interface ComplexityFactors {
  wordCount: number;
  sceneKeywords: number;
  characterKeywords: number;
  timeSpanIndicators: number;
  actionKeywords: number;
}

const SCENE_KEYWORDS = [
  '场景', '地点', '转场', '切换', '移动到', '来到', '进入', '离开',
  '室内', '室外', '街道', '房间', '办公室', '家', '学校', '公司',
  '城市', '乡村', '森林', '海边', '山顶', '沙漠', '太空'
];

const CHARACTER_KEYWORDS = [
  '角色', '人物', '主角', '配角', '朋友', '敌人', '家人', '恋人',
  '同事', '老板', '老师', '学生', '医生', '警察', '士兵'
];

const TIME_SPAN_INDICATORS = [
  '年', '月', '周', '天', '小时', '分钟', '秒',
  '童年', '青年', '中年', '老年', '一生', '十年', '百年',
  '春天', '夏天', '秋天', '冬天', '早晨', '中午', '傍晚', '深夜'
];

const ACTION_KEYWORDS = [
  '战斗', '追逐', '逃亡', '冒险', '旅行', '探索', '发现', '创造',
  '爱情', '友情', '背叛', '复仇', '救赎', '成长', '蜕变'
];

function analyzeComplexity(prompt: string): ComplexityFactors {
  const wordCount = prompt.length;
  
  const sceneKeywords = SCENE_KEYWORDS.filter(kw => prompt.includes(kw)).length;
  const characterKeywords = CHARACTER_KEYWORDS.filter(kw => prompt.includes(kw)).length;
  const timeSpanIndicators = TIME_SPAN_INDICATORS.filter(kw => prompt.includes(kw)).length;
  const actionKeywords = ACTION_KEYWORDS.filter(kw => prompt.includes(kw)).length;

  return {
    wordCount,
    sceneKeywords,
    characterKeywords,
    timeSpanIndicators,
    actionKeywords,
  };
}

export function recommendSceneCount(prompt: string): number {
  const factors = analyzeComplexity(prompt);
  
  APILogger.log('debug', '分析分镜数量因素', factors);
  
  let baseCount = 4;
  
  if (factors.wordCount < 50) {
    baseCount = 3;
  } else if (factors.wordCount > 200) {
    baseCount = 5;
  }
  
  const sceneBonus = Math.min(factors.sceneKeywords, 3);
  const characterBonus = Math.min(Math.floor(factors.characterKeywords / 2), 2);
  const timeBonus = Math.min(Math.floor(factors.timeSpanIndicators / 2), 2);
  const actionBonus = Math.min(Math.floor(factors.actionKeywords / 2), 1);
  
  const totalBonus = sceneBonus + characterBonus + timeBonus + actionBonus;
  
  const recommendedCount = Math.min(Math.max(baseCount + totalBonus, 3), 10);
  
  APILogger.log('info', '推荐分镜数量', {
    baseCount,
    sceneBonus,
    characterBonus,
    timeBonus,
    actionBonus,
    recommendedCount,
  });
  
  return recommendedCount;
}

export function generateSceneCountPrompt(count: number): string {
  return `

【重要】分镜数量要求：必须生成恰好 ${count} 个场景（scenes数组长度必须为${count}）。`;
}
