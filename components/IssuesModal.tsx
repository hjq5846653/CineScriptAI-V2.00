
import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
  onClose: () => void;
  onAutoFix: () => void;
}

const IssuesModal: React.FC<Props> = ({ result, onClose, onAutoFix }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="max-w-xl w-full bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-neutral-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Storyboard Audit</h2>
            <div className="flex items-center gap-2 mt-1">
               <div className="h-1.5 w-24 bg-neutral-700 rounded-full overflow-hidden"><div className={`h-full ${result.overallScore > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{width: `${result.overallScore}%`}}></div></div>
               <span className="text-xs text-neutral-400">{result.overallScore}/100</span>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {result.issues.length === 0 ? <p className="text-center text-green-500">No issues found!</p> : result.issues.map((issue, i) => (
            <div key={i} className="bg-neutral-800/50 p-3 rounded border border-neutral-700 flex gap-3">
               <div className={`w-1 rounded-full ${issue.severity === 'high' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
               <div>
                  <div className="flex gap-2 mb-1"><span className="text-[10px] bg-neutral-700 text-white px-1 rounded">{issue.sceneNumber ? `SCENE ${issue.sceneNumber}` : 'GLOBAL'}</span><span className="text-[10px] uppercase font-bold text-neutral-400">{issue.type}</span></div>
                  <p className="text-sm text-white">{issue.description}</p>
                  <p className="text-xs text-neutral-400 mt-1 italic">Try: {issue.suggestion}</p>
               </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-700 flex justify-end gap-2">
           <button onClick={onClose} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">Close</button>
           {result.issues.length > 0 && <button onClick={() => { onAutoFix(); onClose(); }} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-500">Auto-Fix All</button>}
        </div>
      </div>
    </div>
  );
};
export default IssuesModal;
