import React from 'react';
import zhCN from '../i18n';

interface HeaderProps {
  onReset?: () => void;
  onSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onSettings }) => {
  const t = zhCN;
  return (
    <header className="w-full py-6 px-8 border-b border-cinematic-700 bg-cinematic-900/50 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onReset ? onReset : undefined}>
          <div className="w-10 h-10 bg-cinematic-accent rounded-lg flex items-center justify-center shadow-lg shadow-rose-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-wide text-white leading-none">
              {t.app.title}
            </h1>
            <span className="text-[10px] text-neutral-500 font-mono tracking-widest mt-1">{t.app.subtitle}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           {onReset && (
             <button 
               onClick={onReset} 
               className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-2 transition-colors uppercase tracking-widest group"
             >
               <div className="w-6 h-6 rounded-full border border-neutral-700 flex items-center justify-center group-hover:border-white group-hover:bg-white/10 transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                 </svg>
               </div>
               {t.header.startNewProject}
             </button>
           )}
           {onSettings && (
             <button 
               onClick={onSettings} 
               className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-2 transition-colors uppercase tracking-widest group"
             >
               <div className="w-6 h-6 rounded-full border border-neutral-700 flex items-center justify-center group-hover:border-white group-hover:bg-white/10 transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
               </div>
               {t.header.settings}
             </button>
           )}
           <div className="hidden sm:block h-8 w-px bg-cinematic-700/50"></div>
           <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-neutral-500">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             {t.app.ready.toUpperCase()}
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
