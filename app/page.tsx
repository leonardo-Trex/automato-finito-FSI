'use client';

/**
 * Plantae Evolution — Bacia Hidrográfica, Mata Ciliar e Estações
 *
 * Simulador de autômato celular ecológico que demonstra o papel vital
 * da cobertura vegetal ripária (Mata Ciliar) na proteção contra o
 * dessecamento da bacia hidrográfica durante estiagens severas.
 *
 * Referência: TASK.md § 1, 2, 3 e 4
 */

import { useState, useCallback } from 'react';
import {
  Cell,
  CellState,
  GridCoord,
  SimulationMetrics,
  BrushTool,
  ClimateSeason,
} from '@/lib/types';
import SimulationCanvas from '@/components/SimulationCanvas';
import SeasonIndicator from '@/components/SeasonIndicator';
import ControlBar from '@/components/ControlBar';
import StatsCard from '@/components/StatsCard';

export default function Home() {
  // Estados de Execução e Parâmetros da Simulação
  const [running, setRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(12); // Frames por tick
  const [waterRadius, setWaterRadius] = useState<number>(2);
  const [disperserCount, setDisperserCount] = useState<number>(10);
  const [activeBrush, setActiveBrush] = useState<BrushTool>('plant_tree');
  const [activePresetId, setActivePresetId] = useState<string>('balanced');
  const [stepTrigger, setStepTrigger] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Métricas em Tempo Real sincronizadas com throttle do Canvas
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    totalRiverCells: 32,
    activeRiverCells: 32,
    dryRiverCells: 0,
    riverPreservationPct: 100,
    adultTreeCount: 65,
    sproutCount: 0,
    seedCount: 0,
    riparianDensityPct: 100,
    totalSeedsDropped: 0,
    seedsGerminated: 0,
    seedsLost: 0,
    effectiveGerminationRate: 100,
    currentSeason: ClimateSeason.CHUVOSA,
    seasonProgress: 0,
    totalTicks: 0,
    cloudCount: 0,
  });

  // Inspeção da célula sob o cursor
  const [inspectedCell, setInspectedCell] = useState<{
    coord: GridCoord;
    cell: Cell;
    neighborTrees: number;
  } | null>(null);

  // Handlers de Ações
  const handleTogglePlay = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const handleStep = useCallback(() => {
    setStepTrigger((prev) => prev + 1);
  }, []);

  const handleReset = useCallback(() => {
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    setActivePresetId(presetId);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const handleWaterRadiusChange = useCallback((newRadius: number) => {
    setWaterRadius(newRadius);
  }, []);

  const handleDisperserCountChange = useCallback((newCount: number) => {
    setDisperserCount(newCount);
  }, []);

  const handleMetricsUpdate = useCallback((newMetrics: SimulationMetrics) => {
    setMetrics(newMetrics);
  }, []);

  const handleCellHover = useCallback(
    (coord: GridCoord | null, cell: Cell | null, neighborTrees: number) => {
      if (!coord || !cell) {
        setInspectedCell(null);
        return;
      }
      setInspectedCell({ coord, cell, neighborTrees });
    },
    [],
  );

  // Nomes legíveis dos estados celulares
  const getCellStateLabel = (state: CellState) => {
    switch (state) {
      case CellState.LEITO_AGUA:
        return { label: 'Leito de Água Ativo', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: '💧' };
      case CellState.LEITO_SECO:
        return { label: 'Leito Seco (Evaporado)', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: '🏜️' };
      case CellState.SOLO_FERTIL:
        return { label: 'Solo Fértil (Margem Úmida)', badge: 'bg-amber-800/30 text-amber-300 border-amber-600/40', icon: '🟤' };
      case CellState.SOLO_SECO:
        return { label: 'Solo Seco Inerte', badge: 'bg-yellow-700/20 text-yellow-200 border-yellow-500/30', icon: '🟡' };
      case CellState.SEMENTE:
        return { label: 'Semente em Fixação', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '🌰' };
      case CellState.BROTO:
        return { label: 'Broto Jovem', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '🌱' };
      case CellState.ARVORE_ADULTA:
        return { label: 'Árvore Adulta (Mata Ciliar)', badge: 'bg-green-700/30 text-green-300 border-green-500/40', icon: '🌳' };
      default:
        return { label: 'Desconhecido', badge: 'bg-surface-panel text-text-muted', icon: '❓' };
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-5 md:p-8 gap-4 sm:gap-6 bg-background text-foreground max-w-full overflow-x-hidden">
      {/* Header Principal */}
      <header className="w-full max-w-5xl text-center space-y-2 px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-border-subtle text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Autômato Celular Ecológico • Next.js + Canvas 2D</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2 sm:gap-3">
          <span>Bacia Hidrográfica & Mata Ciliar</span>
          <span className="text-2xl sm:text-3xl">🌱💧</span>
        </h1>

        <p className="text-xs sm:text-sm text-text-muted max-w-2xl mx-auto leading-relaxed">
          Simulação interativa da relação vital entre a vegetação ripária e a preservação
          dos recursos hídricos. Observe como árvores adultas protegem o leito do rio contra o
          dessecamento durante estiagens severas e como polinizadores regeneram as margens.
        </p>
      </header>

      <div className="w-full max-w-5xl space-y-4">
        {/* Indicador Sazonal Global */}
        <SeasonIndicator
          season={metrics.currentSeason}
          progress={metrics.seasonProgress}
          totalTicks={metrics.totalTicks}
        />

        {/* Cartões de Métricas Ecológicas */}
        <StatsCard metrics={metrics} />

        {/* Layout Central: Canvas e Painel Lateral de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Coluna Central / Canvas (Lg: 8 colunas) */}
          <div className="lg:col-span-8 flex flex-col items-center gap-3">
            <SimulationCanvas
              activePresetId={activePresetId}
              activeBrush={activeBrush}
              framesPerTick={speed}
              waterRadius={waterRadius}
              disperserCount={disperserCount}
              running={running}
              stepTrigger={stepTrigger}
              resetTrigger={resetTrigger}
              onMetricsUpdate={handleMetricsUpdate}
              onCellHover={handleCellHover}
              className="w-full"
            />

            {/* Barra de Status da Célula sob o Cursor / Toque */}
            <div className="w-full bg-surface-card border border-border-subtle rounded-xl px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm">
              {inspectedCell ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-semibold text-border-active">
                    [{inspectedCell.coord.col}, {inspectedCell.coord.row}]
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1 ${
                      getCellStateLabel(inspectedCell.cell.state).badge
                    }`}
                  >
                    <span>{getCellStateLabel(inspectedCell.cell.state).icon}</span>
                    <span>{getCellStateLabel(inspectedCell.cell.state).label}</span>
                  </span>
                  <span className="text-text-muted text-[11px]">
                    Idade: <strong className="text-foreground">{inspectedCell.cell.age}</strong> ticks
                  </span>
                  {inspectedCell.cell.state === CellState.LEITO_AGUA && (
                    <span
                      className={`text-[11px] font-medium ${
                        inspectedCell.neighborTrees >= 3 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {inspectedCell.neighborTrees >= 3
                        ? '🛡️ Protegido da Seca (≥3 árvores)'
                        : `⚠️ Em Risco (${inspectedCell.neighborTrees}/3 árvores)`}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-text-muted text-xs italic">
                  Passe o cursor ou toque nas células do mapa para inspecionar microclima e cobertura
                </span>
              )}

              <span className="text-[11px] text-text-muted font-mono hidden sm:inline">
                Matriz 32 × 24 (640×480px)
              </span>
            </div>
          </div>

          {/* Coluna Direita / Legenda e Guia Científico (Lg: 4 colunas) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Guia Visual das Entidades */}
            <div className="bg-surface-card border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-2.5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span>Legenda do Ecossistema</span>
                <span className="text-sm">🗺️</span>
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded bg-[#1D4ED8] shrink-0 border border-blue-400/40" />
                  <div className="flex-1">
                    <strong className="text-blue-300">Leito de Água Ativo</strong>
                    <p className="text-[10px] text-text-muted">Emite umidade no raio Chebyshev R_água.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded bg-[#94A3B8] shrink-0 border border-slate-400/40" />
                  <div className="flex-1">
                    <strong className="text-slate-300">Leito Seco / Assoreado</strong>
                    <p className="text-[10px] text-text-muted">Canais evaporados na estiagem sem sombra.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded bg-[#78350F] shrink-0 border border-amber-700/50" />
                  <div className="flex-1">
                    <strong className="text-amber-300">Solo Fértil (Margem)</strong>
                    <p className="text-[10px] text-text-muted">Solo hidratado capaz de germinar sementes.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded bg-[#FDE68A] shrink-0 border border-yellow-600/30" />
                  <div className="flex-1">
                    <strong className="text-yellow-200">Solo Seco Árido</strong>
                    <p className="text-[10px] text-text-muted">Fora da água; sementes aqui perecem.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded bg-[#15803D] shrink-0 border border-green-500/40" />
                  <div className="flex-1">
                    <strong className="text-green-300">Árvore Adulta (Mata Ciliar)</strong>
                    <p className="text-[10px] text-text-muted">≥3 árvores blindam o rio de evaporar na seca.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FACC15] shrink-0 animate-ping" />
                  <div className="flex-1">
                    <strong className="text-yellow-300">Dispersor / Polinizador</strong>
                    <p className="text-[10px] text-text-muted">Colhe sementes no dossel e semeia o mapa.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-panel/60">
                  <div className="w-3.5 h-3.5 flex items-center justify-center text-sm shrink-0">☁️</div>
                  <div className="flex-1">
                    <strong className="text-sky-300">Nuvens (Estação Chuvosa)</strong>
                    <p className="text-[10px] text-text-muted">
                      Surgem em corpos d&apos;água (≥4 canais) ou bordas (5%). Umedecem o solo (70% fértil) e retardam o secamento do rio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Regras Científicas e Ecológicas */}
            <div className="bg-surface-card border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span>Mecânica da Mata Ciliar</span>
                <span className="text-sm">🔬</span>
              </h3>
              <ul className="text-[11px] text-text-muted space-y-1.5 leading-relaxed list-disc list-inside">
                <li>
                  <strong className="text-foreground">Proteção Térmica:</strong> Na seca, rios com menos de 3 árvores vizinhas têm chance de evaporar a cada tick.
                </li>
                <li>
                  <strong className="text-foreground">Germinação Seletiva:</strong> Sementes em solo fértil viram brotos; em solo árido, secam e morrem após 15 ciclos.
                </li>
                <li>
                  <strong className="text-foreground">Regeneração Pluvial:</strong> Na chuva, leitos secos adjacentes à água renascem e se expandem.
                </li>
                <li>
                  <strong className="text-foreground">Precipitação das Nuvens:</strong> Nuvens na estação chuvosa transformam solo inerte em fértil (70%) e sua umidade retarda o secamento dos canais.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Barra de Controles, Pincéis e Parâmetros */}
        <ControlBar
          running={running}
          onTogglePlay={handleTogglePlay}
          onStep={handleStep}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          waterRadius={waterRadius}
          onWaterRadiusChange={handleWaterRadiusChange}
          disperserCount={disperserCount}
          onDisperserCountChange={handleDisperserCountChange}
          activeBrush={activeBrush}
          onSelectBrush={setActiveBrush}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
        />
      </div>
    </main>
  );
}
