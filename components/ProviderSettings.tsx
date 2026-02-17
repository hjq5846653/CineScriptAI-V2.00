import React, { useState, useEffect } from 'react';
import { ProviderType, SingleProviderConfig, APIConfig, BUILTIN_PROVIDERS, POPULAR_CUSTOM_PROVIDERS, CustomProviderInfo, validateCustomProviderUrl, validateApiKey, getTextModels, getImageModels } from '../types/provider';
import { apiRouter, APILogger } from '../services/providerFactory';
import zhCN from '../i18n';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIConfig) => void;
  currentConfig: APIConfig | null;
}

const STORAGE_KEY = 'cinescript_api_config';

const ProviderSettings: React.FC<SettingsProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const t = zhCN;
  
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');
  const [showAddCustom, setShowAddCustom] = useState(false);
  
  const [textProviderType, setTextProviderType] = useState<ProviderType>(currentConfig?.textProvider?.type || 'gemini');
  const [textApiKey, setTextApiKey] = useState(currentConfig?.textProvider?.apiKey || '');
  const [textBaseUrl, setTextBaseUrl] = useState(currentConfig?.textProvider?.baseUrl || '');
  const [textModel, setTextModel] = useState(currentConfig?.textProvider?.model || '');
  
  const [imageProviderType, setImageProviderType] = useState<ProviderType>(currentConfig?.imageProvider?.type || 'gemini');
  const [imageApiKey, setImageApiKey] = useState(currentConfig?.imageProvider?.apiKey || '');
  const [imageBaseUrl, setImageBaseUrl] = useState(currentConfig?.imageProvider?.baseUrl || '');
  const [imageModel, setImageModel] = useState(currentConfig?.imageProvider?.model || '');

  const [isTestingText, setIsTestingText] = useState(false);
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [testResultText, setTestResultText] = useState<{ success: boolean; message: string } | null>(null);
  const [testResultImage, setTestResultImage] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [customProviders, setCustomProviders] = useState<CustomProviderInfo[]>([]);
  const [selectedCustomText, setSelectedCustomText] = useState<string>('');
  const [selectedCustomImage, setSelectedCustomImage] = useState<string>('');
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomBaseUrl, setNewCustomBaseUrl] = useState('');
  const [newCustomApiKey, setNewCustomApiKey] = useState('');
  const [newCustomTextModels, setNewCustomTextModels] = useState('');
  const [newCustomImageModels, setNewCustomImageModels] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    baseUrl: string;
    apiKey: string;
    textModels: string;
    imageModels: string;
  }>({
    name: '',
    baseUrl: '',
    apiKey: '',
    textModels: '',
    imageModels: '',
  });

  useEffect(() => {
    if (currentConfig) {
      setTextProviderType(currentConfig.textProvider?.type || 'gemini');
      setTextApiKey(currentConfig.textProvider?.apiKey || '');
      setTextBaseUrl(currentConfig.textProvider?.baseUrl || '');
      setTextModel(currentConfig.textProvider?.model || '');
      setImageProviderType(currentConfig.imageProvider?.type || 'gemini');
      setImageApiKey(currentConfig.imageProvider?.apiKey || '');
      setImageBaseUrl(currentConfig.imageProvider?.baseUrl || '');
      setImageModel(currentConfig.imageProvider?.model || '');
    }
    
    setCustomProviders(apiRouter.getCustomProviders());
  }, [currentConfig, isOpen]);

  useEffect(() => {
    const info = BUILTIN_PROVIDERS.find(p => p.type === textProviderType);
    if (info && (!textModel || !getTextModels(textProviderType).includes(textModel))) {
      setTextModel(info.defaultTextModel || '');
    }
  }, [textProviderType]);

  useEffect(() => {
    const info = BUILTIN_PROVIDERS.find(p => p.type === imageProviderType);
    if (info && (!imageModel || !getImageModels(imageProviderType).includes(imageModel))) {
      setImageModel(info.defaultImageModel || '');
    }
  }, [imageProviderType]);

  const handleAddCustomProvider = () => {
    setCustomError(null);
    
    if (!newCustomName.trim()) {
      setCustomError('请输入供应商名称');
      return;
    }
    
    if (!validateCustomProviderUrl(newCustomBaseUrl)) {
      setCustomError('请输入有效的API地址（需要https://或localhost开头）');
      return;
    }
    
    if (!validateApiKey(newCustomApiKey)) {
      setCustomError('请输入有效的API密钥（至少8个字符，仅限字母数字和下划线）');
      return;
    }

    const textModels = newCustomTextModels.split(',').map(m => m.trim()).filter(m => m);
    const imageModels = newCustomImageModels.split(',').map(m => m.trim()).filter(m => m);

    const newProvider = apiRouter.addCustomProvider({
      name: newCustomName.trim(),
      baseUrl: newCustomBaseUrl.trim(),
      apiKey: newCustomApiKey.trim(),
      textModels,
      imageModels,
      supportsText: textModels.length > 0,
      supportsImage: imageModels.length > 0,
    });

    setCustomProviders(apiRouter.getCustomProviders());
    
    setNewCustomName('');
    setNewCustomBaseUrl('');
    setNewCustomApiKey('');
    setNewCustomTextModels('');
    setNewCustomImageModels('');
    setShowAddCustom(false);
  };

  const handleDeleteCustomProvider = (id: string) => {
    apiRouter.deleteCustomProvider(id);
    setCustomProviders(apiRouter.getCustomProviders());
  };

  const handleEditCustomProvider = (provider: CustomProviderInfo) => {
    setEditingProviderId(provider.id);
    setEditForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      textModels: provider.textModels.join(', '),
      imageModels: provider.imageModels.join(', '),
    });
  };

  const handleSaveEdit = () => {
    if (!editingProviderId) return;
    
    setCustomError(null);
    
    if (!editForm.name.trim()) {
      setCustomError('请输入供应商名称');
      return;
    }
    
    if (!validateCustomProviderUrl(editForm.baseUrl)) {
      setCustomError('请输入有效的API地址（需要https://或localhost开头）');
      return;
    }
    
    if (!editForm.apiKey.trim() || !validateApiKey(editForm.apiKey)) {
      setCustomError('请输入有效的API密钥（至少8个字符，仅限字母数字和下划线）');
      return;
    }

    const textModels = editForm.textModels.split(',').map(m => m.trim()).filter(m => m);
    const imageModels = editForm.imageModels.split(',').map(m => m.trim()).filter(m => m);

    const success = apiRouter.updateCustomProvider(editingProviderId, {
      name: editForm.name.trim(),
      baseUrl: editForm.baseUrl.trim(),
      apiKey: editForm.apiKey.trim(),
      textModels,
      imageModels,
      supportsText: textModels.length > 0,
      supportsImage: imageModels.length > 0,
    });

    if (success) {
      setCustomProviders(apiRouter.getCustomProviders());
      setEditingProviderId(null);
      setEditForm({ name: '', baseUrl: '', apiKey: '', textModels: '', imageModels: '' });
    } else {
      setCustomError('更新失败，请重试');
    }
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setEditForm({ name: '', baseUrl: '', apiKey: '', textModels: '', imageModels: '' });
    setCustomError(null);
  };

  const handleTestTextConnection = async () => {
    if (!textApiKey.trim() && textProviderType !== 'custom') {
      setTestResultText({ success: false, message: t.settings.apiKeyRequiredMsg });
      return;
    }
    
    setIsTestingText(true);
    setTestResultText(null);

    try {
      let config: APIConfig;
      
      if (textProviderType === 'custom' && selectedCustomText) {
        const custom = customProviders.find(p => p.id === selectedCustomText);
        if (!custom) {
          setTestResultText({ success: false, message: '请选择自定义供应商' });
          return;
        }
        config = {
          textProvider: {
            type: 'custom',
            name: custom.id,
            apiKey: textApiKey || custom.apiKey,
            baseUrl: textBaseUrl || custom.baseUrl,
            model: textModel,
          },
          imageProvider: null,
        };
      } else {
        const info = BUILTIN_PROVIDERS.find(p => p.type === textProviderType);
        config = {
          textProvider: {
            type: textProviderType,
            name: info?.name || textProviderType,
            apiKey: textApiKey,
            baseUrl: textBaseUrl || info?.baseUrl,
            model: textModel,
          },
          imageProvider: null,
        };
      }

      apiRouter.configure(config);
      const success = await apiRouter.testTextConnection();
      
      if (success) {
        setTestResultText({ success: true, message: t.settings.connectionSuccess });
      } else {
        setTestResultText({ success: false, message: t.settings.connectionFailed });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.connectionFailed;
      setTestResultText({ success: false, message });
    } finally {
      setIsTestingText(false);
    }
  };

  const handleTestImageConnection = async () => {
    if (!imageApiKey.trim() && imageProviderType !== 'custom') {
      setTestResultImage({ success: false, message: t.settings.apiKeyRequiredMsg });
      return;
    }
    
    setIsTestingImage(true);
    setTestResultImage(null);

    try {
      let config: APIConfig;
      
      if (imageProviderType === 'custom' && selectedCustomImage) {
        const custom = customProviders.find(p => p.id === selectedCustomImage);
        if (!custom) {
          setTestResultImage({ success: false, message: '请选择自定义供应商' });
          return;
        }
        config = {
          textProvider: null,
          imageProvider: {
            type: 'custom',
            name: custom.id,
            apiKey: imageApiKey || custom.apiKey,
            baseUrl: imageBaseUrl || custom.baseUrl,
            model: imageModel,
          },
        };
      } else {
        const info = BUILTIN_PROVIDERS.find(p => p.type === imageProviderType);
        config = {
          textProvider: null,
          imageProvider: {
            type: imageProviderType,
            name: info?.name || imageProviderType,
            apiKey: imageApiKey,
            baseUrl: imageBaseUrl || info?.baseUrl,
            model: imageModel,
          },
        };
      }

      apiRouter.configure(config);
      const success = await apiRouter.testImageConnection();
      
      if (success) {
        setTestResultImage({ success: true, message: t.settings.connectionSuccess });
      } else {
        setTestResultImage({ success: false, message: t.settings.connectionFailed });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.connectionFailed;
      setTestResultImage({ success: false, message });
    } finally {
      setIsTestingImage(false);
    }
  };

  const handleSave = async () => {
    if (!textApiKey.trim() && textProviderType !== 'custom') {
      setTestResultText({ success: false, message: t.settings.apiKeyRequiredMsg });
      return;
    }

    setIsSaving(true);
    try {
      let textConfig: SingleProviderConfig | null = null;
      let imageConfig: SingleProviderConfig | null = null;
      
      if (textProviderType === 'custom' && selectedCustomText) {
        const custom = customProviders.find(p => p.id === selectedCustomText);
        if (custom) {
          textConfig = {
            type: 'custom',
            name: custom.id,
            apiKey: textApiKey.trim() || custom.apiKey,
            baseUrl: textBaseUrl.trim() || custom.baseUrl,
            model: textModel || custom.textModels[0],
          };
        }
      } else if (textApiKey.trim()) {
        const info = BUILTIN_PROVIDERS.find(p => p.type === textProviderType);
        textConfig = {
          type: textProviderType,
          name: info?.name || textProviderType,
          apiKey: textApiKey.trim(),
          baseUrl: textBaseUrl.trim() || info?.baseUrl,
          model: textModel,
        };
      }
      
      if (imageApiKey.trim()) {
        if (imageProviderType === 'custom' && selectedCustomImage) {
          const custom = customProviders.find(p => p.id === selectedCustomImage);
          if (custom) {
            imageConfig = {
              type: 'custom',
              name: custom.id,
              apiKey: imageApiKey.trim() || custom.apiKey,
              baseUrl: imageBaseUrl.trim() || custom.baseUrl,
              model: imageModel || custom.imageModels[0],
            };
          }
        } else {
          const info = BUILTIN_PROVIDERS.find(p => p.type === imageProviderType);
          imageConfig = {
            type: imageProviderType,
            name: info?.name || imageProviderType,
            apiKey: imageApiKey.trim(),
            baseUrl: imageBaseUrl.trim() || info?.baseUrl,
            model: imageModel,
          };
        }
      }

      const config: APIConfig = {
        textProvider: textConfig,
        imageProvider: imageConfig,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      apiRouter.configure(config);

      onSave(config);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.connectionFailed;
      setTestResultText({ success: false, message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const builtinTextProviders = BUILTIN_PROVIDERS.filter(p => p.supportsText);
  const builtinImageProviders = BUILTIN_PROVIDERS.filter(p => p.supportsImage);
  const customTextProviders = customProviders.filter(p => p.supportsText);
  const customImageProviders = customProviders.filter(p => p.supportsImage);
  const textModels = getTextModels(textProviderType);
  const imageModels = getImageModels(imageProviderType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-3xl w-full bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-neutral-700 flex justify-between items-center sticky top-0 bg-neutral-900 z-10">
          <h2 className="text-xl font-bold text-white">{t.settings.title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex border-b border-neutral-700 mb-6">
            <button
              onClick={() => setActiveTab('builtin')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'builtin'
                  ? 'border-cinematic-accent text-white'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              内置供应商
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'custom'
                  ? 'border-cinematic-accent text-white'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              自定义供应商 ({customProviders.length})
            </button>
          </div>

          {activeTab === 'builtin' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-700">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.settings.textApi}</h3>
                    <p className="text-xs text-neutral-400">{t.settings.textApiDesc}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">{t.settings.provider}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {builtinTextProviders.map((provider) => (
                      <button
                        key={provider.type}
                        onClick={() => setTextProviderType(provider.type)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          textProviderType === provider.type
                            ? 'bg-cinematic-accent border-cinematic-accent text-white'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        {provider.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t.settings.apiKey} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={textApiKey}
                    onChange={(e) => setTextApiKey(e.target.value)}
                    placeholder="输入API密钥"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t.settings.baseUrl} <span className="text-neutral-500">({t.settings.optional})</span>
                  </label>
                  <input
                    type="text"
                    value={textBaseUrl}
                    onChange={(e) => setTextBaseUrl(e.target.value)}
                    placeholder="留空使用默认地址"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">{t.settings.model}</label>
                  <select
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:border-cinematic-accent focus:outline-none"
                  >
                    <optgroup label={t.settings.textModels}>
                      {textModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {testResultText && (
                  <div className={`p-3 rounded-lg text-sm ${
                    testResultText.success ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'
                  }`}>
                    {testResultText.message}
                  </div>
                )}

                <button
                  onClick={handleTestTextConnection}
                  disabled={isTestingText}
                  className="w-full py-3 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 font-medium hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingText ? t.settings.testing : t.settings.testConnection}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-700">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.settings.imageApi}</h3>
                    <p className="text-xs text-neutral-400">{t.settings.imageApiDesc}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">{t.settings.provider}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {builtinImageProviders.map((provider) => (
                      <button
                        key={provider.type}
                        onClick={() => setImageProviderType(provider.type)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          imageProviderType === provider.type
                            ? 'bg-cinematic-accent border-cinematic-accent text-white'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        {provider.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t.settings.apiKey} <span className="text-neutral-500">({t.settings.optional})</span>
                  </label>
                  <input
                    type="password"
                    value={imageApiKey}
                    onChange={(e) => setImageApiKey(e.target.value)}
                    placeholder="留空使用文本API的密钥"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t.settings.baseUrl} <span className="text-neutral-500">({t.settings.optional})</span>
                  </label>
                  <input
                    type="text"
                    value={imageBaseUrl}
                    onChange={(e) => setImageBaseUrl(e.target.value)}
                    placeholder="留空使用默认地址"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">{t.settings.model}</label>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:border-cinematic-accent focus:outline-none"
                  >
                    <optgroup label={t.settings.imageModels}>
                      {imageModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {testResultImage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    testResultImage.success ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'
                  }`}>
                    {testResultImage.message}
                  </div>
                )}

                <button
                  onClick={handleTestImageConnection}
                  disabled={isTestingImage}
                  className="w-full py-3 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 font-medium hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingImage ? t.settings.testing : t.settings.testConnection}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {!showAddCustom ? (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAddCustom(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-cinematic-accent hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      添加自定义供应商
                    </button>
                  </div>

                  {customProviders.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                      <p className="mb-4">暂无自定义供应商</p>
                      <p className="text-sm">您可以添加自定义API供应商，如OpenRouter、硅基流动等</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customProviders.map((provider) => (
                        <div key={provider.id} className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
                          {editingProviderId === provider.id ? (
                            <div className="space-y-3">
                              <h4 className="font-bold text-white">编辑供应商</h4>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">供应商名称</label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">API地址</label>
                                <input
                                  type="text"
                                  value={editForm.baseUrl}
                                  onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                                  className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">API密钥</label>
                                <input
                                  type="password"
                                  value={editForm.apiKey}
                                  onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                                  placeholder="输入新密钥以更新"
                                  className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">文本模型 (逗号分隔)</label>
                                <input
                                  type="text"
                                  value={editForm.textModels}
                                  onChange={(e) => setEditForm({ ...editForm, textModels: e.target.value })}
                                  className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">图像模型 (逗号分隔)</label>
                                <input
                                  type="text"
                                  value={editForm.imageModels}
                                  onChange={(e) => setEditForm({ ...editForm, imageModels: e.target.value })}
                                  className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 text-white text-sm"
                                />
                              </div>
                              {customError && (
                                <div className="p-2 rounded text-xs bg-red-900/50 text-red-300">
                                  {customError}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="flex-1 py-2 bg-cinematic-accent hover:bg-rose-600 text-white rounded text-sm"
                                >
                                  保存
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-white">{provider.name}</h4>
                                  <p className="text-xs text-neutral-400">{provider.baseUrl}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditCustomProvider(provider)}
                                    className="text-blue-400 hover:text-blue-300 p-1"
                                    title="编辑"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomProvider(provider.id)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="删除"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {provider.textModels.slice(0, 3).map((m) => (
                                  <span key={m} className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">{m}</span>
                                ))}
                                {provider.imageModels.slice(0, 2).map((m) => (
                                  <span key={m} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">{m}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {customProviders.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-neutral-700">
                      <h4 className="font-bold text-white">使用自定义供应商</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">文本生成API</label>
                        <select
                          value={selectedCustomText}
                          onChange={(e) => {
                            setSelectedCustomText(e.target.value);
                            setTextProviderType('custom');
                            const custom = customProviders.find(p => p.id === e.target.value);
                            if (custom && custom.textModels[0]) {
                              setTextModel(custom.textModels[0]);
                            }
                          }}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:border-cinematic-accent focus:outline-none"
                        >
                          <option value="">选择自定义供应商...</option>
                          {customTextProviders.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">图像生成API</label>
                        <select
                          value={selectedCustomImage}
                          onChange={(e) => {
                            setSelectedCustomImage(e.target.value);
                            setImageProviderType('custom');
                            const custom = customProviders.find(p => p.id === e.target.value);
                            if (custom && custom.imageModels[0]) {
                              setImageModel(custom.imageModels[0]);
                            }
                          }}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:border-cinematic-accent focus:outline-none"
                        >
                          <option value="">选择自定义供应商...</option>
                          {customImageProviders.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold text-white">添加自定义供应商</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">供应商名称 <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      placeholder="如：我的API供应商"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">API地址 <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={newCustomBaseUrl}
                      onChange={(e) => setNewCustomBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">API密钥 <span className="text-red-400">*</span></label>
                    <input
                      type="password"
                      value={newCustomApiKey}
                      onChange={(e) => setNewCustomApiKey(e.target.value)}
                      placeholder="输入API密钥"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      文本模型 <span className="text-neutral-500">(逗号分隔)</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomTextModels}
                      onChange={(e) => setNewCustomTextModels(e.target.value)}
                      placeholder="gpt-4, gpt-3.5-turbo"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      图像模型 <span className="text-neutral-500">(逗号分隔)</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomImageModels}
                      onChange={(e) => setNewCustomImageModels(e.target.value)}
                      placeholder="dall-e-3, stable-diffusion"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:border-cinematic-accent focus:outline-none"
                    />
                  </div>

                  {customError && (
                    <div className="p-3 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-700">
                      {customError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddCustom(false);
                        setCustomError(null);
                      }}
                      className="flex-1 py-3 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 font-medium hover:bg-neutral-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddCustomProvider}
                      className="flex-1 py-3 px-4 bg-cinematic-accent rounded-lg text-white font-medium hover:bg-rose-600 transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 border-t border-neutral-700">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-cinematic-accent rounded-lg text-white font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? t.settings.saving : t.settings.save}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-700">
            <p className="text-xs text-neutral-500 mb-2">{t.settings.tips}</p>
            <ul className="text-xs text-neutral-500 list-disc list-inside space-y-1">
              <li>{t.settings.tip1}</li>
              <li>{t.settings.tip2}</li>
              <li>{t.settings.tip3}</li>
              <li>{t.settings.tip4}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderSettings;
