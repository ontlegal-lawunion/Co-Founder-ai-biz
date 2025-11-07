import React, { useState, useEffect } from 'react';
import { Tag } from '../utils/supabaseClient';

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagToggle: (tag: Tag) => void;
  onCreateTag?: (name: string, color: string) => void;
}

export function TagSelector({ availableTags, selectedTags, onTagToggle, onCreateTag }: TagSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  const isSelected = (tag: Tag) => selectedTags.some(t => t.id === tag.id);

  const handleCreate = () => {
    if (newTagName.trim() && onCreateTag) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor('#6B7280');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Tags</label>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {showCreateForm ? 'Cancel' : '+ New Tag'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-slate-800 p-3 rounded-lg space-y-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleCreate}
              disabled={!newTagName.trim()}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
            >
              Create Tag
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onTagToggle(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isSelected(tag)
                ? 'ring-2 ring-offset-2 ring-offset-slate-900'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: tag.color,
              color: '#fff',
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {selectedTags.length > 0 && (
        <div className="text-xs text-gray-400">
          Selected: {selectedTags.map(t => t.name).join(', ')}
        </div>
      )}
    </div>
  );
}
