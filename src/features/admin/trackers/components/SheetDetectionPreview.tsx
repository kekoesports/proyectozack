'use client';

import { useState } from 'react';
import type { BlockPreviewItem, SheetDetectionPreview } from '@/app/admin/(dashboard)/entregables/source-actions';

type Props = {
  preview: SheetDetectionPreview;
  onSelectionChange: (selected: BlockPreviewItem[]) => void;
};

const ACTION_LABELS: Record<BlockPreviewItem['action'], string> = {
  create:    'Crear tracker',
  update:    'Actualizar',
  no_change: 'Sin cambios',
};

const ACTION_COLORS: Record<BlockPreviewItem['action'], string> = {
  create:    'bg-blue-100 text-blue-800',
  update:    'bg-amber-100 text-amber-800',
  no_change: 'bg-sp-off text-sp-muted',
};

function blockKey(b: BlockPreviewItem): string {
  return `${b.gid}::${b.blockTitle}`;
}

export function SheetDetectionPreview({ preview, onSelectionChange }: Props) {
  // Build a flat list of block keys
  const allBlocks = preview.tabs.flatMap((t) => t.blocks);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(allBlocks.filter((b) => b.action !== 'no_change').map(blockKey)),
  );
  const [collapsedTabs, setCollapsedTabs] = useState<Set<string>>(new Set());

  function toggle(block: BlockPreviewItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = blockKey(block);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(allBlocks.filter((b) => next.has(blockKey(b))));
      return next;
    });
  }

  function toggleTab(tab: SheetDetectionPreview['tabs'][number]) {
    setCollapsedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab.tabName)) {
        next.delete(tab.tabName);
      } else {
        next.add(tab.tabName);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      const keys = new Set(allBlocks.map(blockKey));
      setSelected(keys);
      onSelectionChange(allBlocks);
    } else {
      setSelected(new Set());
      onSelectionChange([]);
    }
  }

  const selectedCount = selected.size;
  const totalCount = allBlocks.length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-blue-900">{preview.spreadsheetTitle}</p>
          <p className="text-xs text-blue-700 mt-0.5">
            {totalCount} bloque{totalCount !== 1 ? 's' : ''} detectado{totalCount !== 1 ? 's' : ''} en {preview.tabs.length} pestaña{preview.tabs.length !== 1 ? 's' : ''}
            {' · '}Escaneado {new Date(preview.scannedAt).toLocaleString('es-ES')}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-blue-800 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedCount === totalCount}
            onChange={(e) => toggleAll(e.target.checked)}
            className="rounded"
          />
          Seleccionar todo ({selectedCount}/{totalCount})
        </label>
      </div>

      {/* Tabs tree */}
      {preview.tabs.map((tab) => {
        const isCollapsed = collapsedTabs.has(tab.tabName);
        const tabSelected = tab.blocks.filter((b) => selected.has(blockKey(b))).length;

        return (
          <div key={tab.tabName} className="bg-white rounded-2xl border border-sp-border overflow-hidden">
            {/* Tab header */}
            <button
              type="button"
              onClick={() => toggleTab(tab)}
              className="w-full flex items-center justify-between gap-4 px-5 py-3 hover:bg-sp-off transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sp-muted text-sm">{isCollapsed ? '▶' : '▼'}</span>
                <span className="text-sm font-bold text-sp-dark">{tab.tabName}</span>
                <span className="text-xs text-sp-muted">
                  {tab.blocks.length} bloque{tab.blocks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-sp-muted">{tabSelected} seleccionados</span>
            </button>

            {/* Blocks */}
            {!isCollapsed && (
              <div className="divide-y divide-sp-border">
                {tab.blocks.map((block) => {
                  const key = blockKey(block);
                  const isSelected = selected.has(key);

                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-sp-off'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(block)}
                        className="mt-0.5 rounded"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-sp-dark">
                            {block.blockTitle}
                          </span>
                          <span
                            className={`text-xs font-semibold rounded-full px-2 py-0.5 ${ACTION_COLORS[block.action]}`}
                          >
                            {ACTION_LABELS[block.action]}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-sp-muted flex-wrap">
                          <span>
                            {block.specs
                              .map((s) => `${s.count} ${s.rawType}`)
                              .join(' + ')}
                          </span>
                          <span>{block.linkCount} link{block.linkCount !== 1 ? 's' : ''}</span>
                          {block.suggestedTalentName && (
                            <span className="text-emerald-700 font-medium">
                              Talento: {block.suggestedTalentName}
                            </span>
                          )}
                          {!block.suggestedTalentName && (
                            <span className="text-amber-700">Sin talento vinculado</span>
                          )}
                          {block.existingCurrentCount !== null && (
                            <span>
                              Actual: {block.existingCurrentCount}/{block.specs.reduce((s, sp) => s + sp.count, 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
