
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import SceneCard from './components/SceneCard';
import StoryboardMetadata from './components/StoryboardMetadata';
import ImagePreviewModal from './components/ImagePreviewModal';
import IssuesModal from './components/IssuesModal';
import { Storyboard, Scene, AppState, AnalysisResult } from './types';
import { generateStoryboardScript, generateSceneImage, repairStoryboard, analyzeStoryboardIssues } from './services/geminiService';
import JSZip from 'jszip';

const LOCAL_STORAGE_KEY = 'cinescript_v2';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [userSeed, setUserSeed] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [past, setPast] = useState<Storyboard[]>([]);
  const [future, setFuture] = useState<Storyboard[]>([]);
  
  const [storyboard, setStoryboard] = useState<Storyboard | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (storyboard?.aspectRatio) setAspectRatio(storyboard.aspectRatio);
  }, [storyboard]);

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
        // Quota fallback: save without images
        const minimal = { ...storyboard, scenes: storyboard.scenes.map(s => ({ ...s, generatedImageUrl: undefined })) };
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimal)); setLastSaved(new Date()); } catch {}
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [storyboard]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setAppState(AppState.GENERATING_SCRIPT);
    setError(null);
    
    try {
      const seed = userSeed && !isNaN(Number(userSeed)) ? Number(userSeed) : undefined;
      const script = await generateStoryboardScript(prompt, seed);
      script.aspectRatio = aspectRatio;
      setStoryboard(script);
      setPast([]); setFuture([]);
      
      setAppState(AppState.GENERATING_IMAGES);
      const scenes = [...script.scenes];
      await Promise.all(scenes.map(async (s, i) => {
        try {
          const img = await generateSceneImage(s, script.visualStyle, script.consistencySeed);
          scenes[i] = { ...s, generatedImageUrl: img };
          setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
        } catch (e: any) {
          scenes[i] = { ...s, error: e.message };
          setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
        }
      }));
      setAppState(AppState.COMPLETE);
    } catch (e: any) {
      setError(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const handleAutoFix = async () => {
    if (!storyboard) return;
    setIsRepairing(true);
    setAnalysisResult(null);
    try {
      const repaired = await repairStoryboard(storyboard);
      updateWithHistory(repaired);
      
      // Retry failed/missing images
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
          } catch (e: any) {
            scenes[i] = { ...s, error: e.message };
            setStoryboard(prev => prev ? { ...prev, scenes: [...scenes] } : null);
          } finally {
            setRegeneratingIds(prev => { const n = new Set(prev); n.delete(s.sceneNumber); return n; });
          }
        }));
      }
    } catch (e) { setError("Auto-fix failed"); } finally { setIsRepairing(false); }
  };

  const handleAudit = async () => {
    if (!storyboard) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeStoryboardIssues(storyboard);
      setAnalysisResult(res);
    } catch { setError("Audit failed"); } finally { setIsAnalyzing(false); }
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
    } catch (e: any) {
      const newScenes = [...storyboard.scenes];
      newScenes[idx] = { ...scene, error: e.message };
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
      let txt = `SHOT LIST: ${storyboard.title}\nStyle: ${storyboard.visualStyle}\n\n`;
      storyboard.scenes.forEach(s => txt += `SCENE ${s.sceneNumber}: ${s.location}\nAction: ${s.action}\nCam: ${s.cameraAngle}\n\n`);
      const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
      download(url, `${name}.txt`);
    } else if (type === 'zip') {
      const zip = new JSZip();
      const folder = zip.folder("images");
      let count = 0;
      storyboard.scenes.forEach(s => {
        if (s.generatedImageUrl) {
          const [meta, data] = s.generatedImageUrl.split(',');
          folder?.file(`Scene_${s.sceneNumber}.${meta.includes('jpeg') ? 'jpg' : 'png'}`, data, { base64: true });
          count++;
        }
      });
      if (count) zip.generateAsync({ type: "blob" }).then(b => download(URL.createObjectURL(b), `${name}.zip`));
      else alert("No images");
    }
  };
  const download = (url: string, name: string) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };

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

  return (
    <div className="min-h-screen bg-cinematic-900 text-white font-sans print:bg-white print:text-black">
      <Header />
      {previewScene && <ImagePreviewModal scene={previewScene} onClose={() => setPreviewScene(null)} />}
      {analysisResult && <IssuesModal result={analysisResult} onClose={() => setAnalysisResult(null)} onAutoFix={handleAutoFix} />}

      <main className="max-w-7xl mx-auto px-4 py-10 print:p-0">
        <section className="max-w-3xl mx-auto mb-12 text-center print:hidden">
          <h2 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">Create Your Vision</h2>
          <div className="bg-cinematic-800 rounded-lg p-2 flex flex-col md:flex-row gap-2 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cinematic-accent to-purple-600 rounded-lg opacity-20 group-hover:opacity-40 transition blur"></div>
            <textarea className="flex-1 bg-cinematic-900/80 border-none rounded p-3 focus:ring-1 ring-cinematic-accent resize-none relative z-10" placeholder="Describe your film..." value={prompt} onChange={e => setPrompt(e.target.value)} disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETE && appState !== AppState.ERROR} />
            <div className="flex flex-col gap-2 relative z-10 min-w-[140px]">
              <input type="number" placeholder="Seed (Opt)" value={userSeed} onChange={e => setUserSeed(e.target.value)} className="bg-cinematic-900 border border-cinematic-700 rounded px-2 py-1 text-xs text-center" />
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-cinematic-900 border border-cinematic-700 rounded px-2 py-1 text-xs">
                <option>16:9</option><option>4:3</option><option>1:1</option><option>9:16</option>
              </select>
              <button onClick={handleGenerate} disabled={!prompt.trim() || (appState !== AppState.IDLE && appState !== AppState.COMPLETE && appState !== AppState.ERROR)} className="bg-cinematic-accent hover:bg-rose-700 text-white py-2 rounded font-bold uppercase text-sm transition-colors disabled:opacity-50">
                {appState === AppState.IDLE || appState === AppState.COMPLETE || appState === AppState.ERROR ? 'Generate' : 'Working...'}
              </button>
            </div>
          </div>
          {appState !== AppState.IDLE && appState !== AppState.COMPLETE && appState !== AppState.ERROR && <div className="mt-4 text-cinematic-accent text-sm animate-pulse">Generating...</div>}
          {error && <div className="mt-4 text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}
        </section>

        {storyboard && (
          <div className="animate-fade-in-up">
            <div className="flex flex-wrap justify-between items-end mb-4 gap-4 print:hidden">
               <div className="text-xs text-neutral-500 flex items-center gap-3">
                  {lastSaved && <span className="text-emerald-500">Saved {lastSaved.toLocaleTimeString()}</span>}
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={handleAudit} disabled={isAnalyzing} className="btn-sec bg-blue-600/20 text-blue-400 border-blue-500/50">{isAnalyzing ? 'Scanning' : 'Audit'}</button>
                 <button onClick={handleAutoFix} disabled={isRepairing} className="btn-sec bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500">{isRepairing ? 'Fixing' : 'Smart Fix'}</button>
                 <div className="w-px h-6 bg-neutral-700 mx-1"></div>
                 <button onClick={undo} disabled={!past.length} className="btn-icon"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg></button>
                 <button onClick={redo} disabled={!future.length} className="btn-icon"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11.555 14.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832z"/></svg></button>
                 <div className="w-px h-6 bg-neutral-700 mx-1"></div>
                 <div className="flex bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                   <button onClick={() => handleExport('json')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">JSON</button>
                   <button onClick={() => handleExport('zip')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">Images</button>
                   <button onClick={() => handleExport('txt')} className="px-3 py-1.5 hover:bg-neutral-700 text-xs border-r border-neutral-700">List</button>
                   <button onClick={handlePrint} className="px-3 py-1.5 hover:bg-neutral-700 text-xs">PDF</button>
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
      <style>{`.btn-sec { @apply px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors disabled:opacity-50 border; } .btn-icon { @apply p-1.5 rounded bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 border border-neutral-700; }`}</style>
    </div>
  );
};

export default App;
