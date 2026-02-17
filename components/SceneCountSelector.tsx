import React from 'react';
import { SceneCountMode } from '../types';

interface SceneCountSelectorProps {
  value: number;
  mode: SceneCountMode;
  onChange: (count: number) => void;
  onModeChange: (mode: SceneCountMode) => void;
  recommendation?: number;
  disabled?: boolean;
}

const SceneCountSelector: React.FC<SceneCountSelectorProps> = ({
  value,
  mode,
  onChange,
  onModeChange,
  recommendation,
  disabled = false,
}) => {
  const sceneCountOptions = [3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">分镜数量</span>
        <div className="flex gap-1">
          <button
            onClick={() => onModeChange('auto')}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'auto'
                ? 'bg-cinematic-accent text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            自动
          </button>
          <button
            onClick={() => onModeChange('manual')}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'manual'
                ? 'bg-cinematic-accent text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            手动
          </button>
        </div>
      </div>

      {mode === 'manual' ? (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={3}
            max={10}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            disabled={disabled}
            className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cinematic-accent"
          />
          <span className="text-lg font-bold text-white min-w-[2rem] text-center">{value}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">
            {recommendation ? (
              <>
                推荐数量: <span className="text-cinematic-accent font-bold">{recommendation}</span>
              </>
            ) : (
              '输入故事后将自动推荐'
            )}
          </span>
          {recommendation && (
            <button
              onClick={() => onChange(recommendation)}
              disabled={disabled}
              className={`px-2 py-1 text-xs bg-cinematic-accent/20 text-cinematic-accent rounded hover:bg-cinematic-accent/30 transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              采用
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between mt-2 text-[10px] text-neutral-500">
        {sceneCountOptions.map((n) => (
          <span
            key={n}
            className={`${mode === 'manual' && value === n ? 'text-cinematic-accent' : ''}`}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SceneCountSelector;
