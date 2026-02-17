import React, { useState } from 'react';
import { TrackedEntity } from '../types';
import { APILogger } from '../services/providerFactory';

interface EntityManagerProps {
  entities: TrackedEntity[];
  onUpdateEntity: (id: string, description: string) => void;
  onLockEntity: (id: string, locked: boolean) => void;
}

const EntityManager: React.FC<EntityManagerProps> = ({
  entities,
  onUpdateEntity,
  onLockEntity,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleEdit = (entity: TrackedEntity) => {
    if (entity.locked) {
      return;
    }
    setEditingId(entity.id);
    setEditText(entity.visualDescription);
  };

  const handleSave = (id: string) => {
    onUpdateEntity(id, editText);
    setEditingId(null);
    setEditText('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const getTypeIcon = (type: 'character' | 'prop' | 'location') => {
    switch (type) {
      case 'character':
        return '👤';
      case 'prop':
        return '📦';
      case 'location':
        return '📍';
    }
  };

  const getTypeLabel = (type: 'character' | 'prop' | 'location') => {
    switch (type) {
      case 'character':
        return '角色';
      case 'prop':
        return '道具';
      case 'location':
        return '场景';
    }
  };

  if (entities.length === 0) {
    return (
      <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700 text-center">
        <p className="text-neutral-400 text-sm">暂无追踪的实体</p>
        <p className="text-neutral-500 text-xs mt-1">生成分镜后将自动追踪角色、道具和场景</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 rounded-lg border border-neutral-700">
      <div className="px-3 py-2 border-b border-neutral-700">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          实体追踪 ({entities.length})
        </h3>
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={`p-3 border-b border-neutral-800 last:border-b-0 ${
              entity.locked ? 'bg-neutral-800/30' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{getTypeIcon(entity.type)}</span>
                <span className="text-sm font-medium text-white">{entity.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                  {getTypeLabel(entity.type)}
                </span>
                {entity.locked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400">
                    🔒 已锁定
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(entity)}
                  disabled={entity.locked}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    entity.locked
                      ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  编辑
                </button>
                <button
                  onClick={() => onLockEntity(entity.id, !entity.locked)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    entity.locked
                      ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-900/70'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {entity.locked ? '解锁' : '锁定'}
                </button>
              </div>
            </div>
            
            {editingId === entity.id ? (
              <div className="mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-xs text-neutral-300 resize-none"
                  rows={3}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleCancel}
                    className="text-[10px] px-2 py-1 rounded bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSave(entity.id)}
                    className="text-[10px] px-2 py-1 rounded bg-cinematic-accent text-white hover:bg-rose-600"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 line-clamp-2">
                {entity.visualDescription}
              </p>
            )}
            
            <div className="mt-1 text-[10px] text-neutral-500">
              首次出现: 场景 {entity.firstAppearanceScene}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EntityManager;
