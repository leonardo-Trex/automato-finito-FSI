'use client';

/**
 * ControlBar — Barra de Ferramentas e Controles da Simulação
 *
 * Oferece controles para:
 * 1. Play / Pause / Step único.
 * 2. Velocidade da simulação (frames por tick).
 * 3. Slider de raio de alcance da água (R_agua).
 * 4. Seleção de ferramentas de pincel interativo (plantar, desmatar, água).
 * 5. Seletor de cenários predefinidos (Mata Nativa vs Bacia Degradada).
 * 6. Reiniciar simulação.
 *
 * Referência: TASK.md § Fase 4 (ControlBar.tsx)
 */

import { BrushTool } from '@/lib/types';
import { PRESETS } from '@/lib/presets';

interface ControlBarProps {
  running: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  waterRadius: number;
  onWaterRadiusChange: (radius: number) => void;
  disperserCount?: number;
  onDisperserCountChange?: (count: number) => void;
  activeBrush: BrushTool;
  onSelectBrush: (brush: BrushTool) => void;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
}

const BRUSHES: Array<{ id: BrushTool; label: string; icon: string; desc: string }> = [
  { id: 'plant_tree', label: 'Árvore', icon: '🌳', desc: 'Plantar mata ciliar madura' },
  { id: 'plant_seed', label: 'Semente', icon: '🌱', desc: 'Depositar semente manual' },
  { id: 'deforest', label: 'Desmatar', icon: '🪓', desc: 'Remover vegetação e sombra' },
  { id: 'water_channel', label: 'Canal Água', icon: '💧', desc: 'Escavar leito de rio ativo' },
  { id: 'dry_channel', label: 'Secar Canal', icon: '🏜️', desc: 'Secar leito de rio' },
  { id: 'dry_soil', label: 'Solo Seco', icon: '🟡', desc: 'Colocar solo seco inerte' },
  { id: 'inspect', label: 'Inspecionar', icon: '🔍', desc: 'Apenas consultar célula' },
];

export default function ControlBar({
  running,
  onTogglePlay,
  onStep,
  onReset,
  speed,
  onSpeedChange,
  waterRadius,
  onWaterRadiusChange,
  disperserCount,
  onDisperserCountChange,
  activeBrush,
  onSelectBrush,
  activePresetId,
  onSelectPreset,
}: ControlBarProps) {
  return (
    <div className="w-full bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-4 shadow-sm space-y-3.5">
      {/* Linha Superior: Botões de Execução Principal e Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Controles de Playback */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            suppressHydrationWarning
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              running
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
            }`}
          >
            <span>{running ? '⏸' : '▶'}</span>
            <span>{running ? 'Pausar' : 'Iniciar'}</span>
          </button>

          <button
            type="button"
            onClick={onStep}
            disabled={running}
            suppressHydrationWarning
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-surface-panel border border-border-subtle text-foreground hover:bg-surface-hover hover:border-border-active/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            title="Avançar exatamente 1 tick"
          >
            <span>⏭</span>
            <span className="hidden sm:inline">Passo Único</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-surface-panel border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover hover:border-red-500/40 transition-all cursor-pointer flex items-center gap-1"
            title="Reiniciar Simulação"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>

        {/* Seletor de Cenários Predefinidos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0 hidden md:inline">
            Cenário:
          </span>
          {Object.values(PRESETS).map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-border-active/15 border-border-active text-emerald-300 shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-text-muted hover:text-foreground hover:border-border-active/30'
                }`}
                title={p.description}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha Intermediária: Ferramentas de Pincel Interativo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Ferramenta Interativa de Desenho (Clique ou arraste no grid):
          </span>
          <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
            {BRUSHES.find((b) => b.id === activeBrush)?.desc}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {BRUSHES.map((b) => {
            const isSelected = activeBrush === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBrush(b.id)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-border-active/20 border-border-active text-foreground font-semibold shadow-inner'
                    : 'bg-surface-panel border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <span>{b.icon}</span>
                <span className="truncate">{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha Inferior: Sliders de Parâmetros (Velocidade, Raio Hídrico e Polinizadores) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border-subtle/50">
        {/* Slider de Velocidade */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted font-medium">Cadência de Ticks:</span>
            <span className="font-mono text-foreground font-semibold">
              {speed <= 6 ? '⚡ Rápido' : speed >= 20 ? '🐢 Lento' : '⚖️ Normal'} ({speed} frames/tick)
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={28}
            step={2}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-surface-panel rounded-lg"
          />
        </div>

        {/* Slider de Raio Hídrico */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted font-medium">Raio Hídrico do Rio ($R_{'\\text{água}'}$):</span>
            <span className="font-mono text-blue-400 font-semibold">
              {waterRadius} {waterRadius === 1 ? 'célula' : 'células'}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={waterRadius}
            onChange={(e) => onWaterRadiusChange(Number(e.target.value))}
            className="w-full accent-blue-400 cursor-pointer h-1.5 bg-surface-panel rounded-lg"
          />
        </div>

        {/* Slider de Polinizadores */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted font-medium">Polinizadores:</span>
            <span className="font-mono text-amber-400 font-semibold">
              {disperserCount ?? 10} {(disperserCount ?? 10) === 1 ? 'agente' : 'agentes'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={disperserCount ?? 10}
            onChange={(e) => onDisperserCountChange?.(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-surface-panel rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
