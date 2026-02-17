<div align="center">
<img width="1200" height="475" alt="CineScriptAI Banner" src="https://github.com/hjq5846653/CineScriptAI-V2.00/blob/main/dp/2026217221431324.png" />
</div>

# CineScriptAI 分镜设计工具

AI驱动的电影分镜生成工具，支持多种AI API提供商生成电影分镜脚本和图像预览。

## ✨ 核心特性

### 🎬 分镜生成
- **AI生成电影分镜脚本** - 基于故事想法自动生成专业分镜
- **智能分镜数量推荐** - 基于内容复杂度自动推荐分镜数量
- **手动分镜数量控制** - 支持3-10个分镜精确控制
- **自动生成场景图像** - 支持多种宽高比（16:9, 4:3, 1:1, 9:16, 2.39:1等）

### 🔄 跨分镜一致性
- **实体追踪系统** - 自动追踪角色、道具、场景等实体
- **视觉特征描述符** - 首次出现实体自动生成特征描述
- **一致性校验** - 相似度低于85%时自动警告
- **实体锁定功能** - 防止关键实体被自动修改

### 🛠️ 质量保障
- **故事板质量审计** - 自动检测一致性问题、缺失数据
- **智能修复功能** - 一键修复常见问题
- **JSON解析增强** - 兼容各种AI返回格式
- **场景数据规范化** - 自动处理异常数据格式

### 💾 数据管理
- **本地存储持久化** - 数据安全存储在浏览器
- **多种导出格式** - JSON/图片ZIP/分镜列表/PDF
- **撤销/重做支持** - 完整的编辑历史管理

### 🔌 多供应商支持
- **独立文本/图像API配置** - 可分别选择不同的AI供应商
- **自定义供应商** - 支持任意OpenAI兼容API
- **一键切换供应商** - 无需重启即可切换

## 🚀 快速开始

### 前置要求

- Node.js 18+
- AI Provider API Key

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/CineScriptAI.git

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:3000
```

### 首次配置

1. 点击右上角 **设置** 按钮
2. 在 **文本生成API** 部分选择供应商并输入API Key
3. 在 **图像生成API** 部分选择供应商并输入API Key（可选）
4. 分别点击 **测试连接** 验证配置
5. 点击 **保存配置**

## 📋 可用脚本

| 命令 | 说明 |
|-----|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm run lint` | 运行ESLint检查 |
| `npm run format` | 使用Prettier格式化代码 |
| `npm run test` | 运行测试 |
| `npm run test:watch` | 监听模式运行测试 |

## 🔌 API配置系统

### 双API架构

本系统支持**文本生成API**和**图像生成API**分别独立配置，让您可以灵活选择最佳的AI供应商组合。

| 功能 | 文本生成API | 图像生成API |
|-----|------------|------------|
| 用途 | 生成分镜脚本和内容 | 生成场景预览图像 |
| 支持供应商 | Gemini / OpenAI / Claude + 自定义 | Gemini / OpenAI + 自定义 |
| 默认推荐 | Gemini | Gemini |

### 内置供应商

| 供应商 | 文本模型 | 图像模型 |
|--------|---------|---------|
| Google Gemini | gemini-2.5-flash, gemini-2.5-pro | gemini-2.5-flash-preview |
| OpenAI | gpt-4o, gpt-4-turbo | dall-e-3, dall-e-2 |
| Anthropic Claude | claude-sonnet-4, claude-opus-4 | ❌ 不支持 |

### 自定义供应商

系统支持添加**自定义API供应商**，兼容任何OpenAI格式的API服务：

| 服务商 | 说明 |
|--------|------|
| OpenRouter | 聚合多种开源模型 |
| 硅基流动 (SiliconFlow) | 国产大模型服务 |
| together.ai | 高性能推理服务 |
| Replicate | 开源模型平台 |
| DeepSeek | 国产大模型 |
| Qwen | 通义千问 |

### 获取API Key

| 供应商 | 获取地址 |
|--------|----------|
| Google Gemini | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| OpenAI | [OpenAI Platform](https://platform.openai.com/api-keys) |
| Anthropic Claude | [Anthropic Console](https://console.anthropic.com/) |
| OpenRouter | [OpenRouter](https://openrouter.ai/keys) |
| 硅基流动 | [硅基流动](https://cloud.siliconflow.cn/) |
| DeepSeek | [DeepSeek](https://platform.deepseek.com/) |

## 📁 项目结构

```
CineScriptAI/
├── components/                        # React组件
│   ├── Header.tsx                    # 顶部导航栏
│   ├── SceneCard.tsx                 # 场景卡片组件
│   ├── SceneCountSelector.tsx        # 分镜数量选择器
│   ├── EntityManager.tsx             # 实体管理组件
│   ├── StoryboardMetadata.tsx        # 分镜元数据组件
│   ├── ImagePreviewModal.tsx         # 图像预览弹窗
│   ├── IssuesModal.tsx               # 问题审计弹窗
│   ├── ProviderSettings.tsx          # API设置弹窗
│   └── ErrorBoundary.tsx             # 错误边界组件
├── services/                         # 业务逻辑服务
│   ├── aiService.ts                  # AI服务抽象层
│   ├── providerFactory.ts            # Provider工厂(双API路由)
│   ├── sceneCountRecommender.ts      # 分镜数量推荐算法
│   ├── entityTracker.ts              # 实体追踪系统
│   ├── consistencyChecker.ts         # 一致性校验模块
│   └── providers/                    # AI Provider适配器
│       ├── geminiProvider.ts         # Gemini (文本+图像)
│       ├── openaiProvider.ts         # OpenAI (文本+图像)
│       ├── anthropicProvider.ts      # Anthropic (仅文本)
│       └── customProvider.ts         # 自定义供应商
├── types/                            # 类型定义
│   ├── types.ts                      # 应用核心类型
│   └── provider.ts                   # Provider类型定义
├── i18n/                             # 国际化
│   ├── zhCN.ts                       # 简体中文
│   └── index.ts                      # 导出
├── App.tsx                           # 主应用组件
├── index.tsx                         # 入口文件
├── vite.config.ts                    # Vite配置
├── tsconfig.json                     # TypeScript配置
└── README.md                         # 项目文档
```

## 🏗️ 架构设计

### 核心类型定义

```typescript
// 场景数据结构
interface Scene {
  sceneNumber: number;
  location: string;
  characters?: string;
  props?: string;
  action: string;
  dialogue?: string;
  cameraAngle: string;
  lighting: string;
  imagePrompt: string;
  aspectRatio?: string;
  generatedImageUrl?: string;
  entityReferences?: EntityReference[];
}

// 追踪实体
interface TrackedEntity {
  id: string;
  name: string;
  type: 'character' | 'prop' | 'location';
  visualDescription: string;
  firstAppearanceScene: number;
  locked: boolean;
}

// 分镜数量配置
interface SceneCountConfig {
  mode: 'manual' | 'auto';
  count: number;
  recommendation?: number;
}
```

### Provider接口

```typescript
// 文本Provider接口
interface ITextProvider {
  readonly name: string;
  readonly type: ProviderType;
  initialize(config: SingleProviderConfig): void;
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  validateConfig(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}

// 图像Provider接口
interface IImageProvider {
  readonly name: string;
  readonly type: ProviderType;
  initialize(config: SingleProviderConfig): void;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  validateConfig(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}
```

### 日志系统

系统内置完整的API调用日志记录，支持调试和错误追踪：

```typescript
import { APILogger } from './services/providerFactory';

// 获取所有日志
const logs = APILogger.getLogs();

// 获取最近错误
const errors = APILogger.getRecentErrors();
```

## 📖 使用指南

### 生成分镜

1. 在输入框中输入故事想法或场景描述
2. 选择分镜数量模式：
   - **自动**：系统根据内容复杂度推荐数量
   - **手动**：通过滑块选择3-10个分镜
3. 选择宽高比（16:9, 4:3, 1:1, 9:16等）
4. 点击 **生成** 按钮
5. 等待AI生成分镜脚本和图像

### 管理实体

生成分镜后，系统自动追踪场景中的角色、道具和场景：

1. 查看实体列表显示所有追踪实体
2. 点击 **编辑** 修改实体特征描述
3. 点击 **锁定** 防止实体被自动修改
4. 锁定的实体在后续生成中保持一致

### 导出项目

支持多种导出格式：

- **JSON** - 完整的项目数据
- **图片ZIP** - 所有场景图像打包
- **分镜列表** - 文本格式分镜描述
- **PDF** - 打印友好格式

## 🔒 安全特性

- 生产环境启用Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- API密钥仅存储在用户浏览器localStorage中
- 密钥不上传服务器

## 🧪 测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 |
| 语言 | TypeScript (严格模式) |
| 构建工具 | Vite 6 |
| 测试框架 | Vitest |
| 代码质量 | ESLint + Prettier |
| AI服务 | Gemini / OpenAI / Anthropic / 自定义 |

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试覆盖新功能
- 更新相关文档

## 📝 更新日志

### v0.0.2 (最新)
- ✨ 新增分镜数量控制功能（手动/自动模式）
- ✨ 新增智能分镜数量推荐算法
- ✨ 新增跨分镜实体追踪系统
- ✨ 新增视觉一致性校验功能
- ✨ 新增实体特征管理UI
- 🔧 增强JSON解析兼容性
- 🔧 增强自定义供应商支持
- 🐛 修复场景数据类型兼容性问题
- 🐛 修复图像生成API兼容性问题

### v0.0.1
- 🎉 初始版本发布
- ✨ 基础分镜生成功能
- ✨ 多供应商支持
- ✨ 图像生成功能

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📧 联系方式

- 项目主页: [GitHub](https://github.com/your-repo/CineScriptAI)
- 问题反馈: [Issues](https://github.com/your-repo/CineScriptAI/issues)

---

<div align="center">
Made with ❤️ by CineScriptAI Team
</div>
