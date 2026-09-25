'use client';

/**
 * SeasonIndicator — Indicador Visual do Ciclo Climático Sazonal
 *
 * Exibe a estação atual (CHUVOSA vs SECA), barra de progresso da temporada
 * e explicações dinâmicas sobre o comportamento ecológico do rio.
 *
 * Referência: TASK.md § Fase 4 (SeasonIndicator.tsx)
 */

import { ClimateSeason } from '@/lib/types';

interface SeasonIndicatorProps {
  season: ClimateSeason;
  progress: number; // 0 a 100
  totalTicks: number;
}

export default function SeasonIndicator({
  season,
  progress,
  totalTicks,
}: SeasonIndicatorProps) {
  const isRain = season === ClimateSeason.CHUVOSA;

  return (
    <div className="w-full bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-4 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-inner transition-colors duration-500 ${
              isRain
                ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400'
                : 'bg-amber-950/70 border border-amber-500/40 text-amber-400'
            }`}
          >
            {isRain ? '🌧️' : '☀️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-text-muted">
                Ciclo Climático Global
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isRain
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {isRain ? 'Estação Chuvosa (Cheia)' : 'Estação Seca (Estiagem)'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isRain ? 'Temporada das Águas' : 'Temporada da Seca Crítica'}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-text-muted block">
            Tick #{totalTicks}
          </span>
          <span className="text-xs font-semibold text-foreground font-mono">
            {progress}%
          </span>
        </div>
      </div>

      {/* Barra de Progresso da Estação */}
      <div className="w-full bg-surface-panel rounded-full h-2 overflow-hidden border border-border-subtle/50 mb-2.5">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isRain
              ? 'bg-gradient-to-r from-blue-600 to-cyan-400'
              : 'bg-gradient-to-r from-amber-600 to-yellow-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Feedback e Regras Ecológicas da Estação */}
      <p className="text-[11px] sm:text-xs text-text-muted leading-relaxed">
        {isRain ? (
          <span>
            <strong className="text-blue-400 font-medium">Águas Abundantes: </strong>
            Raio hídrico expandido. A evaporação do rio é nula e canais secos
            adjacentes à água regeneram-se naturalmente.
          </span>
        ) : (
          <span>
            <strong className="text-amber-400 font-medium">Estiagem Severa: </strong>
            Trechos de rio com menos de 3 árvores vizinhas sofrem alta evaporação e
            secam. <span className="text-emerald-400">A mata ciliar preserva a água.</span>
          </span>
        )}
      </p>
    </div>
  );
}
