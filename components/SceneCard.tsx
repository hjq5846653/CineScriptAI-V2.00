import React, { useState, useEffect } from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  index: number;
  isLoadingImage: boolean;
  onUpdate: (updatedScene: Scene) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
  onRegenerate: () => void;
  onPreview: () => void;
}

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const SceneCard: React.FC<SceneCardProps> = ({ 
  scene, index, isLoadingImage, onUpdate, onDragStart, onDragOver, onDrop, onRegenerate, onPreview
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Scene>(scene);

  useEffect(() => { setEditForm(scene); }, [scene]);

  const handleSave = () => { onUpdate(editForm); setIsEditing(false); };
  const handleCancel = () => { setEditForm(scene); setIsEditing(false); };
  const handleChange = <K extends keyof Scene>(field: K, value: Scene[K]) => { setEditForm(prev => ({ ...prev, [field]: value })); };

  return (
    <div 
      draggable={!isEditing}
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
      className={`bg-cinematic-800 border border-cinematic-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full transition-all duration-300 group/card relative print:bg-white print:border-none print:text-black print:mb-8 print:break-inside-avoid ${!isEditing ? 'hover:scale-[1.01] cursor-move hover:shadow-cinematic-accent/20' : ''}`}
    >
      {/* Print Header */}
      <div className="hidden print:flex justify-between items-baseline border-b border-black pb-2 mb-4">
         <div>
           <h2 className="text-xl font-bold uppercase">Scene {scene.sceneNumber}</h2>
           <span className="text-sm font-mono font-bold uppercase">{scene.location}</span>
         </div>
         <span className="text-sm text-gray-600">{scene.lighting} | {scene.cameraAngle}</span>
      </div>

      {/* Visual Area */}
      <div 
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden group print:border print:border-gray-300 cursor-pointer 
        ${(!scene.aspectRatio || scene.aspectRatio === '16:9') ? 'aspect-video' : scene.aspectRatio === '4:3' ? 'aspect-[4/3]' : scene.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'}`}
        onClick={() => !isEditing && scene.generatedImageUrl && onPreview()}
      >
        {scene.generatedImageUrl && !isLoadingImage ? (
          <img 
            src={scene.generatedImageUrl} 
            alt={`Scene ${scene.sceneNumber}`} 
            className="w-full h-full object-cover print:object-contain pointer-events-none transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-500 p-4 text-center z-0 absolute inset-0">
            {isLoadingImage ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-cinematic-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-xs uppercase tracking-wider font-medium text-cinematic-accent">Generating...</span>
              </div>
            ) : (
              <span>Waiting for render...</span>
            )}
          </div>
        )}
        
        {/* Scene Number Overlay */}
        <div className="absolute top-0 left-0 z-20 pointer-events-none print:hidden">
           <div className="bg-cinematic-accent text-white shadow-xl rounded-br-lg px-3 py-2 border-r border-b border-white/20">
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-90 leading-none mb-0.5 block">Scene</span>
              <span className="text-2xl font-black leading-none font-mono">{scene.sceneNumber}</span>
           </div>
        </div>

        {/* Error Overlay */}
        {scene.error && !isLoadingImage && !isEditing && (
           <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center p-4 text-center" onClick={(e) => e.stopPropagation()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-red-400 mb-3 font-medium">{scene.error}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
                className="bg-red-900/50 hover:bg-red-800 text-red-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase border border-red-700 transition-all hover:scale-105"
              >
                Retry Generation
              </button>
           </div>
        )}

        {/* Hover Controls */}
        {!isEditing && !isLoadingImage && !scene.error && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 flex flex-col justify-between p-4 pointer-events-none">
             {/* Top Right Controls */}
             <div className="flex justify-end gap-2 pointer-events-auto transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                 className="bg-black/60 hover:bg-white text-white hover:text-black p-2 rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-lg" 
                 title="Edit Details"
               >
                 <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                 </svg>
               </button>
             </div>

             {/* Center - Regenerate (Most Prominent) */}
             <div className="flex items-center justify-center pointer-events-auto transform scale-90 group-hover:scale-100 transition-transform duration-300 delay-75">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
                  className="bg-cinematic-accent hover:bg-rose-500 text-white px-6 py-2.5 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 hover:shadow-rose-500/30" 
                  title="Regenerate Image"
                >
                  <svg className="h-4 w-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
             </div>

             {/* Bottom Right - Zoom Hint */}
             <div className="flex justify-end pointer-events-auto">
                {scene.generatedImageUrl && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onPreview(); }} 
                    className="bg-white/20 hover:bg-white text-white hover:text-black px-3 py-1 rounded-full backdrop-blur-md text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    Enlarge
                  </button>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col gap-3 print:px-0 cursor-default" onMouseDown={(e) => e.stopPropagation()}>
        {isEditing ? (
           <div className="flex flex-col gap-3 animate-fade-in">
             <div className="flex justify-between items-center border-b border-cinematic-700 pb-2 mb-1">
               <span className="text-xs text-neutral-500 uppercase font-bold">Editing Scene #{scene.sceneNumber}</span>
             </div>
             
             {/* Main Inputs */}
             <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Shot Title</label>
                  <input type="text" value={editForm.shotTitle || ''} onChange={(e) => handleChange('shotTitle', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-2 text-sm text-white font-bold focus:ring-1 focus:ring-cinematic-accent outline-none" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Location</label>
                  <input type="text" value={editForm.location} onChange={(e) => handleChange('location', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-2 text-xs text-white font-mono uppercase focus:ring-1 focus:ring-cinematic-accent outline-none" />
                </div>
             </div>

             {/* Details Grid */}
             <div className="grid grid-cols-2 gap-2">
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Characters</label><input type="text" value={editForm.characters || ''} onChange={(e) => handleChange('characters', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Props</label><input type="text" value={editForm.props || ''} onChange={(e) => handleChange('props', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
             </div>

             <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Action</label><textarea value={editForm.action} onChange={(e) => handleChange('action', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-2 text-sm text-white resize-y min-h-[70px] focus:ring-1 focus:ring-cinematic-accent outline-none" /></div>
             <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Directorial Notes</label><textarea value={editForm.shotDescription || ''} onChange={(e) => handleChange('shotDescription', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-2 text-xs text-white resize-y min-h-[40px]" /></div>
             
             <div className="grid grid-cols-2 gap-2 bg-neutral-800/30 p-2 rounded border border-white/5">
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Cam Angle</label><input type="text" value={editForm.cameraAngle} onChange={(e) => handleChange('cameraAngle', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Movement</label><input type="text" value={editForm.cameraMovement || ''} onChange={(e) => handleChange('cameraMovement', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Focus</label><input type="text" value={editForm.cameraFocus || ''} onChange={(e) => handleChange('cameraFocus', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Depth</label><input type="text" value={editForm.depthOfField || ''} onChange={(e) => handleChange('depthOfField', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Ratio</label><select value={editForm.aspectRatio || "16:9"} onChange={(e) => handleChange('aspectRatio', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white"><option>16:9</option><option>4:3</option><option>1:1</option><option>9:16</option></select></div>
               <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Light</label><input type="text" value={editForm.lighting} onChange={(e) => handleChange('lighting', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white" /></div>
             </div>

             <div className="grid grid-cols-3 gap-2 p-2 bg-black/20 rounded border border-white/5">
               <label className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 p-1 rounded"><input type="checkbox" checked={editForm.filmGrain !== false} onChange={(e) => handleChange('filmGrain', e.target.checked)} className="rounded bg-neutral-800 border-neutral-600 text-cinematic-accent focus:ring-0" /><span className="text-[9px] uppercase font-bold text-neutral-400">Grain</span></label>
               <label className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 p-1 rounded"><input type="checkbox" checked={editForm.chromaticAberration !== false} onChange={(e) => handleChange('chromaticAberration', e.target.checked)} className="rounded bg-neutral-800 border-neutral-600 text-cinematic-accent focus:ring-0" /><span className="text-[9px] uppercase font-bold text-neutral-400">Chrom. Ab</span></label>
               <label className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 p-1 rounded"><input type="checkbox" checked={editForm.volumetricLighting !== false} onChange={(e) => handleChange('volumetricLighting', e.target.checked)} className="rounded bg-neutral-800 border-neutral-600 text-cinematic-accent focus:ring-0" /><span className="text-[9px] uppercase font-bold text-neutral-400">Volumetric</span></label>
             </div>

             <div><label className="text-[10px] text-neutral-500 uppercase font-bold">Transition</label><input type="text" value={editForm.transition || ''} onChange={(e) => handleChange('transition', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-1.5 text-xs text-white text-right" placeholder="CUT TO" /></div>
             
             <div>
               <label className="text-[10px] text-neutral-500 uppercase font-bold flex justify-between">Image Prompt <span className="text-neutral-600 font-normal normal-case">English Only</span></label>
               <textarea value={editForm.imagePrompt} onChange={(e) => handleChange('imagePrompt', e.target.value)} className="w-full bg-cinematic-900 border border-cinematic-700 rounded p-2 text-xs text-neutral-400 font-mono resize-y min-h-[50px]" />
             </div>
             <div>
               <label className="text-[10px] text-red-500/70 uppercase font-bold">Negative Prompt</label>
               <textarea value={editForm.negativePrompt || ''} onChange={(e) => handleChange('negativePrompt', e.target.value)} className="w-full bg-cinematic-900 border border-red-900/30 rounded p-2 text-xs text-red-200 font-mono resize-y min-h-[30px]" placeholder="exclude..." />
             </div>

             <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
               <button onClick={handleSave} className="flex-1 bg-cinematic-accent hover:bg-rose-700 text-white py-2 rounded text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-900/20">Save Changes</button>
               <button onClick={handleCancel} className="flex-1 bg-transparent border border-neutral-600 hover:text-white text-neutral-400 py-2 rounded text-xs font-bold uppercase tracking-widest">Cancel</button>
             </div>
           </div>
        ) : (
           /* View Mode */
           <>
             <div className="mb-2 border-b border-cinematic-700/50 pb-3">
                {scene.shotTitle && <h3 className="text-lg font-bold text-white mb-1 leading-tight">{scene.shotTitle}</h3>}
                <h4 className="font-mono font-bold text-neutral-400 text-[10px] uppercase tracking-wide bg-neutral-800/50 inline-block px-1.5 py-0.5 rounded">{scene.location || `SCENE ${scene.sceneNumber}`}</h4>
                {(scene.characters || scene.props) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {toArray(scene.characters).map((c,i) => <span key={i} className="text-[9px] text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 flex items-center gap-1"><span className="w-1 h-1 bg-blue-500 rounded-full"></span>{c.trim()}</span>)}
                    {toArray(scene.props).map((p,i) => <span key={i} className="text-[9px] text-cinematic-accent/80 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 border-l-2 border-l-cinematic-accent">{p.trim()}</span>)}
                  </div>
                )}
             </div>

             <div className="space-y-2">
                <div>
                  <h3 className="text-[10px] font-bold text-cinematic-accent uppercase tracking-wider mb-0.5">Action</h3>
                  <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">{scene.action}</p>
                </div>
                {scene.shotDescription && (
                  <div>
                    <h3 className="text-[9px] font-bold text-neutral-500 uppercase">Director's Note</h3>
                    <p className="text-[11px] text-neutral-400 italic">{scene.shotDescription}</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-2 mt-3 bg-neutral-900/50 p-2 rounded border border-white/5">
                <div><span className="text-[9px] font-bold text-neutral-600 uppercase block">Camera</span><span className="text-[10px] text-neutral-300">{scene.cameraAngle}</span></div>
                <div><span className="text-[9px] font-bold text-neutral-600 uppercase block">Light</span><span className="text-[10px] text-neutral-300">{scene.lighting}</span></div>
                {scene.cameraFocus && <div className="col-span-2"><span className="text-[9px] font-bold text-neutral-600 uppercase inline-block mr-1">Focus:</span><span className="text-[10px] text-neutral-400">{scene.cameraFocus}</span></div>}
             </div>

             {/* Badges */}
             {(scene.filmGrain !== false || scene.chromaticAberration !== false || scene.volumetricLighting !== false) && (
                <div className="flex gap-1 mt-2 flex-wrap opacity-60">
                   {scene.filmGrain !== false && <span className="text-[8px] text-neutral-500 border border-neutral-800 px-1 rounded uppercase">Grain</span>}
                   {scene.chromaticAberration !== false && <span className="text-[8px] text-neutral-500 border border-neutral-800 px-1 rounded uppercase">C.Ab</span>}
                   {scene.volumetricLighting !== false && <span className="text-[8px] text-neutral-500 border border-neutral-800 px-1 rounded uppercase">Vol</span>}
                </div>
             )}

             {scene.dialogue && scene.dialogue !== "N/A" && (
                <div className="mt-auto pt-3 border-t border-cinematic-700">
                   <div className="text-center px-2 py-1 bg-neutral-800/30 rounded relative">
                      <p className="text-xs italic text-neutral-300 font-serif leading-relaxed">"{typeof scene.dialogue === 'string' ? scene.dialogue : JSON.stringify(scene.dialogue)}"</p>
                   </div>
                </div>
             )}
             
             {scene.transition && (
               <div className="mt-2 text-right">
                 <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-600 group-hover:text-neutral-400 transition-colors">{scene.transition}</span>
               </div>
             )}
             
             {/* View Prompt Toggle */}
             <div className="mt-3 pt-1 border-t border-cinematic-700/30 print:hidden">
                <details className="group/prompt">
                    <summary className="text-[9px] text-neutral-600 cursor-pointer hover:text-cinematic-accent uppercase list-none flex items-center justify-between">
                      <span>Visual Prompt</span>
                      <span className="group-open/prompt:rotate-180 transition-transform text-neutral-700">▼</span>
                    </summary>
                    <div className="mt-1.5">
                      <p className="text-[9px] text-neutral-500 font-mono bg-black/30 p-1.5 rounded leading-tight">{scene.imagePrompt}</p>
                      {scene.negativePrompt && <p className="text-[9px] text-red-900/80 mt-1 font-mono border-l-2 border-red-900 pl-1">Ex: {scene.negativePrompt}</p>}
                    </div>
                </details>
             </div>
             
             {/* Print Only Prompt */}
             <div className="hidden print:block mt-2 pt-2 border-t border-gray-300">
               <p className="text-[10px] text-gray-500 font-mono">Prompt: {scene.imagePrompt}</p>
             </div>
           </>
        )}
      </div>
    </div>
  );
};
export default SceneCard;