import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import SceneCard from './components/SceneCard';
import StoryboardMetadata from './components/StoryboardMetadata';
import ImagePreviewModal from './components/ImagePreviewModal';
import IssuesModal from './components/IssuesModal';
import ProviderSettings from './components/ProviderSettings';
import ErrorBoundary from './components/ErrorBoundary';
import SceneCountSelector from './components/SceneCountSelector';
import EntityManager from './components/EntityManager';
import { useCustomContextMenu, CustomContextMenu, FeedbackToast } from './components/useCustomContextMenu';
import { Storyboard, Scene, AppState, AnalysisResult, SceneCountMode, TrackedEntity } from './types';
import { APIConfig } from './types/provider';
import JSZip from 'jszip';
import zhCN from './i18n';
import {
  initializeProvider,
  saveProviderConfig,
  getProviderConfig,
  generateStoryboardScript,
  generateSceneImage,
  repairStoryboard,
  analyzeStoryboardIssues,
  getCurrentTextProviderName,
  getCurrentImageProviderName,
} from './services/aiService';
import { recommendSceneCount } from './services/sceneCountRecommender';
import entityTracker from './services/entityTracker';

const LOCAL_STORAGE_KEY = 'cinescript_v2';
const t = zhCN;

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [userSeed, setUserSeed] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<{ show: boolean; success: boolean }>({ show: false, success: false });
  
  const [sceneCountMode, setSceneCountMode] = useState<SceneCountMode>('auto');
  const [targetSceneCount, setTargetSceneCount] = useState(5);
  const [recommendedSceneCount, setRecommendedSceneCount] = useState<number | undefined>();
  const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    contextMenuPosition,
    showContextMenu,
    hideContextMenu,
    handlePaste: contextMenuPaste,
    feedbackMessage,
    feedbackType,
  } = useCustomContextMenu(textareaRef, {
    onPaste: (text) => {
      setPrompt(prev => {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          return prev.substring(0, start) + text + prev.substring(end);
        }
        return prev + text;
      });
      showPasteFeedback(true);
    },
  });

  const [past, setPast] = useState<Storyboard[]>([]);
  const [future, setFuture] = useState<Storyboard[]>([]);

  const [storyboard, setStoryboard] = useState<Storyboard | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [providerConfig, setProviderConfig] = useState<APIConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialized = initializeProvider();
    setProviderConfig(getProviderConfig());
    if (!initialized) {
      setShowSettings(true);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (storyboard?.aspectRatio) setAspectRatio(storyboard.aspectRatio);
    if (storyboard?.trackedEntities) {
      setTrackedEntities(storyboard.trackedEntities);
      entityTracker.importEntities(storyboard.trackedEntities);
    }
  }, [storyboard]);

  useEffect(() => {
    if (sceneCountMode === 'auto' && prompt.trim()) {
      const recommendation = recommendSceneCount(prompt);
      setRecommendedSceneCount(recommendation);
    }
  }, [prompt, sceneCountMode]);

  const handleUpdateEntity = useCallback((id: string, description: string) => {
    entityTracker.updateEntityDescription(id, description);
    setTrackedEntities(entityTracker.getAllEntities());
  }, []);

  const handleLockEntity = useCallback((id: string, locked: boolean) => {
    if (locked) {
      entityTracker.lockEntity(id);
    } else {
      entityTracker.unlockEntity(id);
    }
    setTrackedEntities(entityTracker.getAllEntities());
  }, []);

  const updateWithHistory = useCallback((newBoard: Storyboard) => {
    if (storyboard) setPast(p => [...p, storyboard]);
    setFuture([]);
    setStoryboard(newBoard);
  }, [storyboard]);

  const undo = useCallback(() => {
    if (past.length === 0 || !storyboard) return;
    const prev = past[past.length - 1];
    setFuture(f => [storyboard, ...f]);
    setStoryboard(prev);
    setPast(p => p.slice(0, -1));
  }, [past, storyboard]);

  const redo = useCallback(() => {
    if (future.length === 0 || !storyboard) return;
    const next = future[0];
    setPast(p => [...p, storyboard]);
    setStoryboard(next);
    setFuture(f => f.slice(1));
  }, [future, storyboard]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') { setPreviewScene(null); setAnalysisResult(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!storyboard) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storyboard));
        setLastSaved(new Date());
      } catch {
        const minimal = { ...storyboard, scenes: storyboard.scenes.map(s => ({ ...s, generatedImageUrl: undefined })) };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimal));
          setLastSaved(new Date());
        } catch {
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [storyboard]);

  const showPasteFeedback = (success: boolean) => {
    setPasteFeedback({ show: true, success });
    setTimeout(() => setPasteFeedback({ show: false, success: false }), 2000);
  };

  const resetAppState = useCallback(() => {
    setAppState(AppState.IDLE);
    setError(null);
    setStoryboard(null);
    setGenerationProgress(null);
    setPast([]);
    setFuture([]);
    setRegeneratingIds(new Set());
    setAnalysisResult(null);
    console.log('应用状态已重置');
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!isInitialized || !providerConfig) {
      setShowSettings(true);
      setError(t.errors.pleaseConfigureFirst);
      return;
    }

    setAppState(AppState.GENERATING_SCRIPT);
    setError(null);
    setStoryboard(null);
    entityTracker.reset();
    setTrackedEntities([]);
    setGenerationProgress({ current: 0, total: 0, stage: t.input.generatingScript });
    console.log('========== 开始生成流程 ==========');
    console.log('阶段1: 故事生成 - 调用文本模型');

    let generatedScript: typeof storyboard = null;

    try {
      const seed = userSeed && !isNaN(Number(userSeed)) ? Number(userSeed) : undefined;
      const effectiveSceneCount = sceneCountMode === 'manual' ? targetSceneCount : (recommendedSceneCount || 5);
      
      try {
        generatedScript = await generateStoryboardScript(prompt, seed, effectiveSceneCount);
        generatedScript.aspectRatio = aspectRatio;
        generatedScript.targetSceneCount = effectiveSceneCount;
        
        for (const scene of generatedScript.scenes) {
          entityTracker.processScene(scene);
        }
        generatedScript.trackedEntities = entityTracker.getAllEntities();
        setTrackedEntities(generatedScript.trackedEntities);
        
        setStoryboard(generatedScript);
        setPast([]); setFuture([]);
      } catch (scriptError) {
        const errMsg = scriptError instanceof Error ? scriptError.message : t.errors.scriptGenerationFailed;
        setError(errMsg);
        setAppState(AppState.ERROR);
        setGenerationProgress(null);
        return;
      }

      if (!generatedScript) {
        setError(t.errors.scriptGenerationFailed);
        setAppState(AppState.ERROR);
        setGenerationProgress(null);
        return;
      }

      setAppState(AppState.GENERATING_IMAGES);
      console.log('阶段2: 分镜生成 - 调用图像模型');
      const totalScenes = generatedScript.scenes.length;
      console.log(`共 ${totalScenes} 个场景需要生成图片`);
      const scenes = [...generatedScript.scenes];
      
      for (let i = 0; i < scenes.length; i++) {
        setGenerationProgress({ current: i + 1, total: totalScenes, stage: `${t.input.generatingImage} ${i + 1}/${totalScenes}` });
        
        try {
          const s = scenes[i];
          await new Promise(resolve => setTimeout(resolve, 50));
          const img = await generateSceneImage(s, generatedScript.visualStyle, generatedScript.consistencySeed);
          scenes[i] = { ...s, generatedImageUrl: img };
          setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
        } catch (imgError) {
          const message = imgError instanceof Error ? imgError.message : t.errors.imageGenerationFailed;
          scenes[i] = { ...scenes[i], error: message };
          setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setAppState(AppState.COMPLETE);
      console.log('========== 生成流程完成 ==========');
      setGenerationProgress({ current: totalScenes, total: totalScenes, stage: t.input.complete });
      setTimeout(() => setGenerationProgress(null), 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : t.errors.scriptGenerationFailed;
      setError(message);
      setAppState(AppState.ERROR);
      setGenerationProgress(null);
    }
  };

  const handleAutoFix = async () => {
    if (!storyboard) return;
    setIsRepairing(true);
    setAnalysisResult(null);
    try {
      const repaired = await repairStoryboard(storyboard);
      updateWithHistory(repaired);

      const toFix = repaired.scenes.map((s, i) => ({ s, i })).filter(x => !x.s.generatedImageUrl || x.s.error);
      if (toFix.length > 0) {
        setRegeneratingIds(prev => { const n = new Set(prev); toFix.forEach(x => n.add(x.s.sceneNumber)); return n; });
        const scenes = [...repaired.scenes];
        await Promise.all(toFix.map(async ({ s, i }) => {
          try {
            const seed = Math.floor(Math.random() * 2e9);
            const img = await generateSceneImage(s, repaired.visualStyle, seed);
            scenes[i] = { ...s, generatedImageUrl: img, error: undefined };
            setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
          } catch (e) {
            const message = e instanceof Error ? e.message : t.errors.imageRegenerationFailed;
            scenes[i] = { ...s, error: message };
            setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
          } finally {
            setRegeneratingIds(prev => { const n = new Set(prev); n.delete(s.sceneNumber); return n; });
          }
        }));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t.errors.autoFixFailed;
      setError(message);
    } finally { 
      setIsRepairing(false); 
    }
  };

  const handleAudit = async () => {
    if (!storyboard) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeStoryboardIssues(storyboard);
      setAnalysisResult(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : t.errors.auditFailed;
      setError(message);
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleRegenerate = async (idx: number) => {
    if (!storyboard) return;
    const scene = storyboard.scenes[idx];
    setRegeneratingIds(prev => new Set(prev).add(scene.sceneNumber));
    try {
      const seed = Math.floor(Math.random() * 2e9);
      const img = await generateSceneImage(scene, storyboard.visualStyle, seed);
      const newScenes = [...storyboard.scenes];
      newScenes[idx] = { ...scene, generatedImageUrl: img, error: undefined };
      updateWithHistory({ ...storyboard, scenes: newScenes });
    } catch (e) {
      const message = e instanceof Error ? e.message : t.errors.regenerationFailed;
      const newScenes = [...storyboard.scenes];
      newScenes[idx] = { ...scene, error: message };
      setStoryboard(prev => prev ? { ...prev, scenes: newScenes } : null);
    } finally {
      setRegeneratingIds(prev => { const n = new Set(prev); n.delete(scene.sceneNumber); return n; });
    }
  };

  const handleExport = (type: 'json'|'zip'|'txt') => {
    if (!storyboard) return;
    const name = storyboard.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (type === 'json') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(storyboard, null, 2)], { type: 'application/json' }));
      download(url, `${name}.json`);
    } else if (type === 'txt') {
      let txt = `${t.toolbar.exportList}: ${storyboard.title}\n${t.metadata.visualStyle}: ${storyboard.visualStyle}\n\n`;
      storyboard.scenes.forEach(s => txt += `${t.scene.scene} ${s.sceneNumber}: ${s.location || ''}\n${s.action || ''}\n${s.cameraAngle || ''}\n\n`);
      const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
      download(url, `${name}.txt`);
    } else if (type === 'zip') {
      const zip = new JSZip();
      const folder = zip.folder("images");
      let count = 0;
      storyboard.scenes.forEach(s => {
        if (s.generatedImageUrl) {
          const [meta, data] = s.generatedImageUrl.split(',');
          folder?.file(`${t.scene.scene}_${s.sceneNumber}.${meta.includes('jpeg') ? 'jpg' : 'png'}`, data, { base64: true });
          count++;
        }
      });
      if (count) zip.generateAsync({ type: "blob" }).then(b => download(URL.createObjectURL(b), `${name}.zip`));
      else alert(t.toolbar.noImages);
    }
  };

  const download = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIndex === null || !storyboard) return;
    const scenes = [...storyboard.scenes];
    const [item] = scenes.splice(draggedIndex, 1);
    scenes.splice(targetIdx, 0, item);
    updateWithHistory({ ...storyboard, scenes: scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 })) });
    setDraggedIndex(null);
  };

  const handleProviderSave = (config: APIConfig) => {
    saveProviderConfig(config);
    setProviderConfig(config);
    setError(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    try {
      let text = e.clipboardData.getData('text');
      
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, '    ')
        .trim();
      
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = prompt.substring(0, start) + text + prompt.substring(end);
      setPrompt(newValue);
      showPasteFeedback(true);
      
      setTimeout(() => {
        const newPos = start + text.length;
        (e.target as HTMLTextAreaElement).setSelectionRange(newPos, newPos);
      }, 0);
    } catch {
      showPasteFeedback(false);
    }
  };

  const textProviderName = providerConfig?.textProvider?.name || getCurrentTextProviderName();
  const imageProviderName = providerConfig?.imageProvider?.name || getCurrentImageProviderName();

  const isGenerating = appState === AppState.GENERATING_SCRIPT || appState === AppState.GENERATING_IMAGES;
  const canGenerate = prompt.trim() && (appState === AppState.IDLE || appState === AppState.COMPLETE || appState === AppState.ERROR);

  return (
    <ErrorBoundary onReset={resetAppState}>
      <div className="min-h-screen bg-cinematic-900 text-white font-sans print:bg-white print:text-black">
        <Header onSettings={() => setShowSettings(true)} />
        {previewScene && <ImagePreviewModal scene={previewScene} onClose={() => setPreviewScene(null)} />}
        {analysisResult && <IssuesModal result={analysisResult} onClose={() => setAnalysisResult(null)} onAutoFix={handleAutoFix} />}
        <ProviderSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleProviderSave}
          currentConfig={providerConfig}
        />

        <main className="max-w-7xl mx-auto px-4 py-10 print:p-0">
          <section className="max-w-3xl mx-auto mb-12 text-center print:hidden">
            <h2 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">{t.app.title}</h2>
            <div className="bg-cinematic-800 rounded-lg p-2 flex flex-col md:flex-row gap-2 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cinematic-accent to-purple-600 rounded-lg opacity-20 group-hover:opacity-40 transition blur"></div>
              <div className="flex-1 relative">
                <textarea 
                  ref={textareaRef}
                  className="w-full bg-cinematic-900/80 border-none rounded p-3 focus:ring-1 ring-cinematic-accent resize-none relative z-10" 
                  placeholder={t.input.placeholder} 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  onPaste={handlePaste}
                  onContextMenu={showContextMenu}
                  disabled={appState === AppState.GENERATING_SCRIPT || appState === AppState.GENERATING_IMAGES}
                  style={{ minHeight: '80px' }}
                />
                {contextMenuPosition && (
                  <CustomContextMenu
                    position={contextMenuPosition}
                    onPaste={contextMenuPaste}
                    onClose={hideContextMenu}
                  />
                )}
                {feedbackMessage && <FeedbackToast message={feedbackMessage} type={feedbackType} />}
                {pasteFeedback.show && (
                  <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs z-20 ${pasteFeedback.success ? 'bg-green-600' : 'bg-red-600'} text-white animate-fade-in`}>
                    {pasteFeedback.success ? '✓ 粘贴成功' : '✗ 粘贴失败'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 relative z-10 min-w-[140px]">
              <input type="number" placeholder={t.input.seedPlaceholder} value={userSeed} onChange={e => setUserSeed(e.target.value)} className="bg-cinematic-900 border border-cinematic-700 rounded px-2 py-1 text-xs text-center" />
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-cinematic-900 border border-cinematic-700 rounded px-2 py-1 text-xs">
                <option>16:9</option><option>4:3</option><option>1:1</option><option>9:16</option>
              </select>
              <SceneCountSelector
                value={targetSceneCount}
                mode={sceneCountMode}
                onChange={setTargetSceneCount}
                onModeChange={setSceneCountMode}
                recommendation={recommendedSceneCount}
                disabled={isGenerating}
              />
              <button onClick={handleGenerate} disabled={!canGenerate} className="bg-cinematic-accent hover:bg-rose-700 text-white py-2 rounded font-bold uppercase text-sm transition-colors disabled:opacity-50">
                {isGenerating ? t.input.working : t.input.generate}
              </button>
            </div>
          </section>
          {generationProgress && (
            <div className="mt-4">
              <div className="text-cinematic-accent text-sm mb-2">{generationProgress.stage}</div>
              {generationProgress.total > 0 && (
                <div className="w-full bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-cinematic-accent h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {!generationProgress && appState !== AppState.IDLE && appState !== AppState.COMPLETE && appState !== AppState.ERROR && (
            <div className="mt-4 text-cinematic-accent text-sm animate-pulse">{t.input.generating}</div>
          )}
          {error && <div className="mt-4 text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

        {storyboard && (
          <div className="animate-fade-in-up">
            <div className="flex flex-wrap justify-between items-end mb-4 gap-4 print:hidden">
               <div className="text-xs text-neutral-500 flex items-center gap-3">
                  {lastSaved && <span className="text-emerald-500">{t.toolbar.saved} {lastSaved.toLocaleTimeString()}</span>}
                  <span className="text-blue-400">{textProviderName}</span>
                  {imageProviderName && imageProviderName !== '未配置' && <span className="text-purple-400">/ {imageProviderName}</span>}
               </div>
               <div className="flex items-center gap-2">
                 {trackedEntities.length > 0 && (
                   <div className="hidden lg:block">
                     <EntityManager
                       entities={trackedEntities}
                       onUpdateEntity={handleUpdateEntity}
                       onLockEntity={handleLockEntity}
                     />
                   </div>
                 )}
                 <button onClick={handleAudit} disabled={isAnalyzing} className="btn-sec bg-blue-600/20 text-blue-400 border-blue-500/50">{isAnalyzing ? t.toolbar.scanning : t.toolbar.audit}</button>
                 <button onClick={handleAutoFix} disabled={isRepairing} className="btn-sec bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500">{isRepairing ? t.toolbar.fixing : t.toolbar.smartFix}</button>
                 <div className="w-px h-6 bg-neutral-700 mx-1"></div>
                 <button onClick={undo} disabled={!past.length} className="btn-icon"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg></button>
                 <button onClick={redo} disabled={!future.length} className="btn-icon"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11.555 14.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832z"/></svg></button>
                 <div className="w-px h-6 bg-neutral-700 mx-1"></div>
                 <div className="flex bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                   <button onClick={() => handleExport('json')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">{t.toolbar.exportJson}</button>
                   <button onClick={() => handleExport('zip')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">{t.toolbar.exportImages}</button>
                   <button onClick={() => handleExport('txt')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">{t.toolbar.exportList}</button>
                   <button onClick={handlePrint} className="px-3 py-1.5 hover:bg-neutral-700 text-xs">{t.toolbar.exportPdf}</button>
                 </div>
               </div>
            </div>

            <StoryboardMetadata storyboard={storyboard} onUpdate={u => updateWithHistory({ ...storyboard, ...u })} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:block">
              {storyboard.scenes.map((scene, index) => (
                <div key={scene.sceneNumber} className={`${draggedIndex === index ? 'opacity-50' : ''} transition-opacity`}>
                  <SceneCard
                    scene={scene} index={index}
                    isLoadingImage={(appState === AppState.GENERATING_IMAGES && !scene.generatedImageUrl) || regeneratingIds.has(scene.sceneNumber)}
                    onUpdate={u => { const ns = [...storyboard.scenes]; ns[index] = u; updateWithHistory({ ...storyboard, scenes: ns }); }}
                    onDragStart={() => setDraggedIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(index)}
                    onRegenerate={() => handleRegenerate(index)} onPreview={() => setPreviewScene(scene)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <style>{`
        .btn-sec { @apply px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors disabled:opacity-50 border; } 
        .btn-icon { @apply p-1.5 rounded bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 border border-neutral-700; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
    </ErrorBoundary>
  );
};

export default App;
