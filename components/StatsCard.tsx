'use client';

/**
 * StatsCard — Painel de Métricas Ecológicas da Bacia Hidrográfica
 *
 * Apresenta indicadores em tempo real:
 * 1. Extensão do Rio Preservada vs Leito Seco.
 * 2. Densidade da Mata Ciliar e Cobertura Arbórea.
 * 3. Taxa de Germinação Efetiva (sementes vingadas vs perdidas no seco).
 * 4. Atividade dos Polinizadores / Dispersores.
 *
 * Referência: TASK.md § Fase 4 (StatsCard.tsx)
 */

import { SimulationMetrics } from '@/lib/types';

interface StatsCardProps {
  metrics: SimulationMetrics;
}

export default function StatsCard({ metrics }: StatsCardProps) {
  // Cores de status para a integridade do rio
  const riverStatusColor =
    metrics.riverPreservationPct > 70
      ? 'text-emerald-400'
      : metrics.riverPreservationPct > 35
      ? 'text-amber-400'
      : 'text-red-400';

  const riverBarBg =
    metrics.riverPreservationPct > 70
      ? 'bg-emerald-500'
      : metrics.riverPreservationPct > 35
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* Card 1: Preservação do Rio */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-3.5 shadow-sm hover:border-border-active/50 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Integridade do Rio
          </span>
          <span className={`text-sm font-bold font-mono ${riverStatusColor}`}>
            {metrics.riverPreservationPct}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="w-full bg-surface-panel rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${riverBarBg}`}
              style={{ width: `${metrics.riverPreservationPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
            <span>Água ativa: <strong className="text-foreground">{metrics.activeRiverCells}</strong></span>
            <span>Seco: <strong className="text-foreground">{metrics.dryRiverCells}</strong></span>
          </div>
        </div>
      </div>

      {/* Card 2: Densidade da Mata Ciliar */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-3.5 shadow-sm hover:border-border-active/50 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Mata Ciliar (Sombra)
          </span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            {metrics.riparianDensityPct}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="w-full bg-surface-panel rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-300 rounded-full"
              style={{ width: `${metrics.riparianDensityPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
            <span>Árvores adultas: <strong className="text-foreground">{metrics.adultTreeCount}</strong></span>
            <span>Brotos: <strong className="text-foreground">{metrics.sproutCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Card 3: Germinação Efetiva */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-3.5 shadow-sm hover:border-border-active/50 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Germinação Efetiva
          </span>
          <span className="text-sm font-bold font-mono text-amber-300">
            {metrics.effectiveGerminationRate}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="w-full bg-surface-panel rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300 rounded-full"
              style={{ width: `${metrics.effectiveGerminationRate}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
            <span>Vingaram: <strong className="text-emerald-400">{metrics.seedsGerminated}</strong></span>
            <span>Perdidas no seco: <strong className="text-red-400">{metrics.seedsLost}</strong></span>
          </div>
        </div>
      </div>

      {/* Card 4: Dispersão e Sementes */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-3.5 shadow-sm hover:border-border-active/50 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block animate-pulse" />
            Polinização & Dispersão
          </span>
          <span className="text-sm font-bold font-mono text-yellow-300">
            {metrics.totalSeedsDropped} 🌰
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="w-full bg-surface-panel rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (metrics.seedCount / 20) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
            <span>Sementes ativas no mapa: <strong className="text-foreground">{metrics.seedCount}</strong></span>
            <span>Dispersores: <strong className="text-foreground">10</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
