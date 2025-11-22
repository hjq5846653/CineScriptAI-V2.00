
import React, { useState, useEffect } from 'react';
import { Storyboard } from '../types';

interface Props {
  storyboard: Storyboard;
  onUpdate: (fields: Partial<Storyboard>) => void;
}

const STYLES = ["Cinematic Realism", "Film Noir", "Cyberpunk", "Wes Anderson", "Studio Ghibli", "Oil Painting", "3D Pixar", "Vintage 70s", "Gritty Doc", "Minimalist"];

const StoryboardMetadata: React.FC<Props> = ({ storyboard, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', synopsis: '', genre: '', visualStyle: '', location: '' });

  useEffect(() => {
    setForm({
      title: storyboard.title,
      synopsis: storyboard.synopsis,
      genre: storyboard.genre,
      visualStyle: storyboard.visualStyle,
      location: storyboard.location || ''
    });
  }, [storyboard]);

  const handleSave = () => { onUpdate(form); setIsEditing(false); };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 text-center relative overflow-hidden print:bg-white print:text-black print:shadow-none group transition-all hover:border-neutral-700">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cinematic-accent to-transparent opacity-50 print:hidden"></div>
      <div className="hidden print:block text-xs text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-200 pb-2">CineScript AI Storyboard</div>
      
      {!isEditing && (
        <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-neutral-800 hover:bg-cinematic-accent text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all print:hidden border border-neutral-700 z-10">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
        </button>
      )}

      {isEditing ? (
        <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-fade-in text-left">
          <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full text-3xl font-serif bg-neutral-800 border border-neutral-700 rounded p-2 text-center text-white focus:border-cinematic-accent focus:outline-none" placeholder="Title" />
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-neutral-500 uppercase">Genre</label><input type="text" value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white" /></div>
             <div className="relative group/style">
                <label className="text-xs font-bold text-neutral-500 uppercase">Style</label>
                <input type="text" value={form.visualStyle} onChange={e => setForm({...form, visualStyle: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white" />
                <div className="absolute top-full left-0 w-full mt-1 z-20 bg-neutral-900 border border-neutral-700 rounded shadow-xl hidden group-hover/style:grid grid-cols-2 gap-1 p-1">
                   {STYLES.map(s => <button key={s} onClick={() => setForm({...form, visualStyle: s})} className="text-xs text-left px-2 py-1 hover:bg-cinematic-accent/20 text-neutral-300">{s}</button>)}
                </div>
             </div>
          </div>
          <div><label className="text-xs font-bold text-neutral-500 uppercase">Primary Setting</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white" placeholder="Global location context" /></div>
          <div><label className="text-xs font-bold text-neutral-500 uppercase">Synopsis</label><textarea value={form.synopsis} onChange={e => setForm({...form, synopsis: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white resize-y min-h-[80px]" /></div>
          <div className="flex gap-2 justify-center border-t border-neutral-800 pt-2">
            <button onClick={handleSave} className="bg-cinematic-accent text-white px-6 py-1.5 rounded text-sm font-bold uppercase">Save</button>
            <button onClick={() => setIsEditing(false)} className="border border-neutral-600 text-neutral-400 hover:text-white px-6 py-1.5 rounded text-sm font-bold uppercase">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] mb-1 block print:text-gray-600">Project</span>
          <h1 className="text-3xl md:text-4xl font-serif text-white mb-4 print:text-black">{storyboard.title}</h1>
          <div className="flex flex-wrap justify-center gap-3 mb-4 print:gap-2">
              <div className="badge"><span className="lbl">Genre</span><span className="val">{storyboard.genre}</span></div>
              <div className="badge"><span className="lbl">Style</span><span className="val text-cinematic-accent">{storyboard.visualStyle}</span></div>
              {storyboard.location && <div className="badge"><span className="lbl">Loc</span><span className="val">{storyboard.location}</span></div>}
              {storyboard.aspectRatio && <div className="badge"><span className="lbl">Ratio</span><span className="val">{storyboard.aspectRatio}</span></div>}
          </div>
          <p className="max-w-3xl mx-auto text-lg text-neutral-300 font-light border-l-4 border-cinematic-accent pl-4 text-left bg-neutral-900/50 py-2 rounded-r print:text-black print:bg-transparent">{storyboard.synopsis}</p>
        </div>
      )}
      <style>{`.badge { @apply px-3 py-1 bg-neutral-800/50 rounded-full border border-neutral-700 flex items-center gap-2 print:bg-transparent print:border-black; } .lbl { @apply text-[10px] font-bold text-neutral-500 uppercase print:text-gray-500; } .val { @apply text-xs text-white font-medium uppercase print:text-black; }`}</style>
    </div>
  );
};
export default StoryboardMetadata;
