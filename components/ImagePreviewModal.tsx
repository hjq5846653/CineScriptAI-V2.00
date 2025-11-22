
import React from 'react';
import { Scene } from '../types';

interface Props {
  scene: Scene;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<Props> = ({ scene, onClose }) => {
  if (!scene.generatedImageUrl) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur p-4 animate-fade-in" onClick={onClose}>
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col md:flex-row bg-cinematic-900 rounded-xl overflow-hidden border border-cinematic-700" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-white/20"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        <div className="flex-1 bg-black flex items-center justify-center"><img src={scene.generatedImageUrl} alt={`Scene ${scene.sceneNumber}`} className="max-w-full max-h-full object-contain" /></div>
        <div className="w-full md:w-80 bg-cinematic-800 p-6 border-l border-cinematic-700 overflow-y-auto">
           <h2 className="text-2xl font-bold text-white mb-1">Scene {scene.sceneNumber}</h2>
           {scene.shotTitle && <h3 className="text-lg text-cinematic-accent font-bold mb-2">{scene.shotTitle}</h3>}
           <p className="text-sm text-neutral-400 font-mono uppercase mb-4">{scene.location}</p>
           <div className="space-y-4">
             <div><h4 className="text-xs font-bold text-neutral-500 uppercase">Action</h4><p className="text-sm text-neutral-200">{scene.action}</p></div>
             <div><h4 className="text-xs font-bold text-neutral-500 uppercase">Tech</h4><div className="flex flex-wrap gap-2 mt-1"><span className="badge">{scene.cameraAngle}</span><span className="badge">{scene.lighting}</span></div></div>
             {scene.dialogue && <div><h4 className="text-xs font-bold text-neutral-500 uppercase">Dialogue</h4><p className="text-sm italic text-neutral-300">"{scene.dialogue}"</p></div>}
           </div>
        </div>
      </div>
      <style>{`.badge { @apply text-xs bg-cinematic-700 text-white px-2 py-1 rounded; }`}</style>
    </div>
  );
};
export default ImagePreviewModal;
