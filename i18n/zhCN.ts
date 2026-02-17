export const zhCN = {
  app: {
    title: 'CineScriptAI 分镜设计',
    subtitle: 'AI驱动的视觉故事创作',
    ready: '就绪'
  },
  header: {
    startNewProject: '新建项目',
    settings: '设置'
  },
  input: {
    placeholder: '描述您的电影想法...',
    seedPlaceholder: '随机种子（可选）',
    aspectRatio: '宽高比',
    generate: '生成',
    working: '处理中...',
    generating: '生成中...',
    generatingScript: '正在生成分镜脚本...',
    generatingImage: '正在生成图片',
    complete: '生成完成！'
  },
  toolbar: {
    audit: '审计',
    scanning: '扫描中',
    smartFix: '智能修复',
    fixing: '修复中',
    exportJson: 'JSON',
    exportImages: '图片',
    exportList: '列表',
    exportPdf: 'PDF',
    saved: '已保存',
    noImages: '没有可导出的图片'
  },
  settings: {
    title: 'API提供商设置',
    provider: '提供商',
    apiKey: 'API密钥',
    baseUrl: '服务器地址',
    baseUrlOptional: '可选',
    model: '模型',
    testConnection: '测试连接',
    testing: '测试中...',
    save: '保存配置',
    saving: '保存中...',
    connectionSuccess: '连接成功！',
    connectionFailed: '连接失败',
    apiKeyRequiredMsg: '请输入API密钥',
    tips: '使用提示',
    tip1: '您的API密钥仅保存在本地，不会发送到我们的服务器',
    tip2: 'Gemini密钥获取：Google AI Studio',
    tip3: 'OpenAI密钥获取：platform.openai.com',
    tip4: 'Anthropic密钥获取：console.anthropic.com',
    textModels: '文本模型',
    imageModels: '图像模型',
    textApi: '文本生成API',
    imageApi: '图像生成API',
    textApiDesc: '用于生成分镜脚本和内容',
    imageApiDesc: '用于生成场景预览图像',
    optional: '可选'
  },
  errors: {
    pleaseConfigureFirst: '请先配置您的API提供商',
    scriptGenerationFailed: '脚本生成失败',
    imageGenerationFailed: '图片生成失败',
    imageRegenerationFailed: '图片重新生成失败',
    autoFixFailed: '自动修复失败',
    auditFailed: '审计失败',
    regenerationFailed: '重新生成失败',
    storageQuotaExceeded: '存储空间已满，无法保存'
  },
  scene: {
    scene: '场景',
    location: '地点',
    characters: '角色',
    props: '道具',
    action: '动作',
    dialogue: '对白',
    shotDescription: '镜头描述',
    cameraAngle: '摄影角度',
    cameraMovement: '镜头运动',
    cameraFocus: '焦点',
    depthOfField: '景深',
    lighting: '灯光',
    imagePrompt: '图像提示词',
    aspectRatio: '宽高比',
    transition: '转场',
    filmGrain: '胶片颗粒',
    chromaticAberration: '色差',
    volumetricLighting: '体积光',
    negativePrompt: '负面提示词',
    edit: '编辑',
    save: '保存',
    cancel: '取消',
    regenerate: '重新生成',
    preview: '预览'
  },
  metadata: {
    title: '标题',
    synopsis: '概要',
    visualStyle: '视觉风格',
    primarySetting: '主要场景',
    characters: '角色',
    consistencySeed: '一致性种子'
  },
  issues: {
    title: '问题报告',
    issuesFound: '发现问题',
    noIssues: '未发现问题',
    close: '关闭',
    applyFix: '应用修复',
    category: '类别',
    description: '描述',
    location: '位置',
    suggestion: '建议'
  },
  preview: {
    title: '图像预览',
    close: '关闭'
  },
  providers: {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic Claude',
    notConfigured: '未配置'
  }
};

export type Locale = typeof zhCN;
export default zhCN;
