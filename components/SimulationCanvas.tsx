'use client';

/**
 * SimulationCanvas — Renderizador Canvas 2D de Alto Desempenho
 *
 * Executa o loop gráfico desacoplado via requestAnimationFrame com:
 * 1. Renderização a ~60 FPS via Canvas 2D com a paleta canônica do TASK.md.
 * 2. Animação de água, dossel das árvores e partículas aladas dos dispersores.
 * 3. Suporte completo a mouse e toque (clique e arrasto contínuo com pincéis).
 * 4. Sincronização throttled de métricas com a árvore React.
 *
 * Referência: TASK.md § Fase 3 (SimulationCanvas.tsx)
 */

import { useEffect, useRef, useCallback } from 'react';
import { SimulationEngine, countNeighboringAdultTrees } from '@/lib/engine';
import {
  Cell,
  CellState,
  GridCoord,
  SimulationMetrics,
  BrushTool,
} from '@/lib/types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  CELL_COLORS,
  AGENT_COLOR,
  AGENT_SEED_COLOR,
} from '@/lib/constants';
import { mouseToGridCoord, isCoordValid } from '@/lib/utils';
import { PRESETS } from '@/lib/presets';

export interface SimulationCanvasProps {
  activePresetId: string;
  activeBrush: BrushTool;
  framesPerTick: number;
  waterRadius: number;
  disperserCount?: number;
  running: boolean;
  stepTrigger: number;
  resetTrigger: number;
  onMetricsUpdate?: (metrics: SimulationMetrics) => void;
  onCellHover?: (coord: GridCoord | null, cell: Cell | null, neighborTrees: number) => void;
  className?: string;
}

export default function SimulationCanvas({
  activePresetId,
  activeBrush,
  framesPerTick,
  waterRadius,
  disperserCount,
  running,
  stepTrigger,
  resetTrigger,
  onMetricsUpdate,
  onCellHover,
  className,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Instância do motor mantida internamente na ref do Canvas
  const engineRef = useRef<SimulationEngine | null>(null);

  // Inicializa engine na montagem ou via ref
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      const preset = PRESETS[activePresetId] ?? PRESETS.balanced;
      engineRef.current = new SimulationEngine(preset.createGrid(), {
        waterRadius,
        framesPerTick,
        disperserCount: disperserCount !== undefined ? disperserCount : undefined,
      });
      engineRef.current.season = preset.initialSeason;
    }
    return engineRef.current;
  }, [activePresetId, waterRadius, framesPerTick, disperserCount]);

  // Referências sincronizadas para o loop de requestAnimationFrame
  const activeBrushRef = useRef(activeBrush);
  const framesPerTickRef = useRef(framesPerTick);
  const runningRef = useRef(running);
  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  const onCellHoverRef = useRef(onCellHover);

  // Estado de interação do cursor
  const isMouseDownRef = useRef(false);
  const hoverCoordRef = useRef<GridCoord | null>(null);

  useEffect(() => {
    activeBrushRef.current = activeBrush;
  }, [activeBrush]);

  useEffect(() => {
    framesPerTickRef.current = framesPerTick;
    const eng = engineRef.current;
    if (eng) {
      eng.setSpeed(framesPerTick);
    }
  }, [framesPerTick]);

  useEffect(() => {
    const eng = engineRef.current;
    if (eng) {
      eng.setWaterRadius(waterRadius);
      onMetricsUpdateRef.current?.(eng.getMetrics());
    }
  }, [waterRadius]);

  useEffect(() => {
    if (disperserCount !== undefined) {
      const eng = engineRef.current;
      if (eng) {
        eng.setDisperserCount(disperserCount);
        onMetricsUpdateRef.current?.(eng.getMetrics());
      }
    }
  }, [disperserCount]);

  useEffect(() => {
    runningRef.current = running;
    const eng = engineRef.current;
    if (eng) {
      eng.running = running;
    }
  }, [running]);

  useEffect(() => {
    onMetricsUpdateRef.current = onMetricsUpdate;
  }, [onMetricsUpdate]);

  useEffect(() => {
    onCellHoverRef.current = onCellHover;
  }, [onCellHover]);

  // Carrega Preset quando activePresetId ou resetTrigger mudar
  useEffect(() => {
    const eng = getEngine();
    const preset = PRESETS[activePresetId] ?? PRESETS.balanced;
    eng.loadGrid(preset.createGrid(), preset.initialSeason);
    if (disperserCount !== undefined) {
      eng.setDisperserCount(disperserCount);
    }
    onMetricsUpdateRef.current?.(eng.getMetrics());
  }, [activePresetId, resetTrigger, getEngine, disperserCount]);

  // Passo único manual
  useEffect(() => {
    if (stepTrigger === 0) return;
    const eng = engineRef.current;
    if (eng) {
      eng.step();
      onMetricsUpdateRef.current?.(eng.getMetrics());
    }
  }, [stepTrigger]);

  // Aplica ferramenta de pincel sob o ponto de toque/clique
  const applyBrushAtPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const coord = mouseToGridCoord(canvasX, canvasY, GRID_COLS, GRID_ROWS, CELL_SIZE);
    if (!coord) return;

    eng.applyBrush(coord, activeBrushRef.current);

    const cell = eng.grid[coord.row]?.[coord.col] ?? null;
    const neighborTrees = countNeighboringAdultTrees(eng.grid, coord);
    onCellHoverRef.current?.(coord, cell, neighborTrees);
  }, []);

  // Loop Principal de Renderização e Animação (requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let frameAccumulator = 0;
    let visualFrameCount = 0;
    let lastMetricsSync = 0;

    const render = () => {
      visualFrameCount++;
      const eng = engineRef.current;
      if (!eng) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const isRunning = runningRef.current;
      const targetFramesPerTick = framesPerTickRef.current || 12;

      // 1. Processamento de Ticks Lógicos da Simulação
      if (isRunning) {
        frameAccumulator++;
        if (frameAccumulator >= targetFramesPerTick) {
          eng.step();
          frameAccumulator = 0;
        }

        // Movimentação fluida contínua dos dispersores a 60 FPS
        eng.updateDispersersMotion();
        // Movimentação fluida contínua das nuvens a 60 FPS
        eng.updateCloudsMotion();
      }

      // Sincronização throttled de métricas com o React (~4x por segundo)
      if (visualFrameCount - lastMetricsSync >= 15) {
        lastMetricsSync = visualFrameCount;
        onMetricsUpdateRef.current?.(eng.getMetrics());
      }

      // 2. Renderização Gráfica do Grid Celular
      ctx.fillStyle = '#0B130E';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const rows = eng.grid.length;
      const cols = eng.grid[0]?.length ?? 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = eng.grid[r][c];
          const x = c * CELL_SIZE;
          const y = r * CELL_SIZE;

          ctx.fillStyle = CELL_COLORS[cell.state] || '#151E17';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

          switch (cell.state) {
            case CellState.LEITO_AGUA: {
              const wave = Math.sin(visualFrameCount * 0.08 + (c + r) * 0.6) * 1.5;
              ctx.fillStyle = 'rgba(147, 197, 253, 0.28)';
              ctx.fillRect(x + 2, y + 4 + wave, CELL_SIZE - 4, 3);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
              ctx.fillRect(x + 6, y + 10 - wave, CELL_SIZE - 12, 2);
              break;
            }

            case CellState.LEITO_SECO: {
              ctx.strokeStyle = '#64748B';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x + 4, y + 5);
              ctx.lineTo(x + 10, y + 14);
              ctx.lineTo(x + 16, y + 8);
              ctx.stroke();
              break;
            }

            case CellState.SEMENTE: {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2 + 1, y + CELL_SIZE / 2 + 1, 3.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#F59E0B';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 3.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#FEF3C7';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2 - 1, y + CELL_SIZE / 2 - 1, 1.2, 0, Math.PI * 2);
              ctx.fill();
              break;
            }

            case CellState.BROTO: {
              ctx.strokeStyle = '#15803D';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE - 3);
              ctx.lineTo(x + CELL_SIZE / 2, y + 6);
              ctx.stroke();

              ctx.fillStyle = '#86EFAC';
              ctx.beginPath();
              ctx.ellipse(x + CELL_SIZE / 2 - 3, y + 8, 3.5, 2, -Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(x + CELL_SIZE / 2 + 3, y + 8, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
              break;
            }

            case CellState.ARVORE_ADULTA: {
              ctx.fillStyle = '#451A03';
              ctx.fillRect(x + CELL_SIZE / 2 - 1.5, y + CELL_SIZE / 2, 3, CELL_SIZE / 2 - 1);

              ctx.fillStyle = '#166534';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2 - 1, 7.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#22C55E';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2 - 1.5, y + CELL_SIZE / 2 - 3, 4.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#86EFAC';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2 - 2, y + CELL_SIZE / 2 - 4, 1.5, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
          }
        }
      }

      // Linhas da grade
      ctx.strokeStyle = 'rgba(28, 41, 32, 0.7)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL_SIZE, 0);
        ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
        ctx.stroke();
      }

      // 3. Renderização dos Agentes Dispersores
      for (const d of eng.dispersers) {
        const speed = Math.hypot(d.vx, d.vy) || 1;
        const dirX = d.vx / speed;
        const dirY = d.vy / speed;

        ctx.fillStyle = d.hasSeed ? 'rgba(245, 158, 11, 0.25)' : 'rgba(250, 204, 21, 0.22)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.beginPath();
        ctx.arc(d.x - dirX * 5, d.y - dirY * 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = d.hasSeed ? AGENT_SEED_COLOR : AGENT_COLOR;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
        ctx.fill();

        const wingOffset = Math.sin(visualFrameCount * 0.4 + d.id) * 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - dirY * (4 + wingOffset), d.y + dirX * (4 + wingOffset));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + dirY * (4 + wingOffset), d.y - dirX * (4 + wingOffset));
        ctx.stroke();

        if (d.hasSeed) {
          ctx.fillStyle = '#D97706';
          ctx.beginPath();
          ctx.arc(d.x, d.y + 3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Renderização das Nuvens de Chuva (Sobrepostas à simulação)
      for (const cl of eng.clouds) {
        const r = cl.radius;
        const x = cl.x;
        const y = cl.y;

        // Sombra suave de umidade no solo
        ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.7, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gotas de chuva caindo abaixo da nuvem
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        const dropSpacing = r * 0.42;
        for (let i = -1; i <= 1; i++) {
          const dropX = x + i * dropSpacing;
          const dropOffset = (visualFrameCount * 1.8 + cl.id * 11 + (i + 1) * 7) % 20;
          ctx.beginPath();
          ctx.moveTo(dropX, y + r * 0.35 + dropOffset);
          ctx.lineTo(dropX - 0.5, y + r * 0.35 + dropOffset + 4.5);
          ctx.stroke();
        }

        // Halo atmosférico azul claro
        ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
        ctx.beginPath();
        ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Corpo fofo e volumoso da nuvem (círculos sobrepostos)
        ctx.fillStyle = 'rgba(240, 249, 255, 0.88)';

        // Puf central superior
        ctx.beginPath();
        ctx.arc(x, y - r * 0.15, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Puf lateral esquerdo
        ctx.beginPath();
        ctx.arc(x - r * 0.4, y + r * 0.05, r * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Puf lateral direito
        ctx.beginPath();
        ctx.arc(x + r * 0.4, y + r * 0.05, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Puf base alargada
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.15, r * 0.65, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Destaque branco superior (iluminação solar)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(x - r * 0.12, y - r * 0.26, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Destaque de Célula sob o Cursor
      const hover = hoverCoordRef.current;
      if (hover && isCoordValid(hover, cols, rows)) {
        const hx = hover.col * CELL_SIZE;
        const hy = hover.row * CELL_SIZE;

        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        ctx.fillStyle = 'rgba(74, 222, 128, 0.15)';
        ctx.fillRect(hx, hy, CELL_SIZE, CELL_SIZE);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getEngine]);

  // Handlers de Mouse e Toque
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    applyBrushAtPoint(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const coord = mouseToGridCoord(canvasX, canvasY, GRID_COLS, GRID_ROWS, CELL_SIZE);
    hoverCoordRef.current = coord;

    if (coord) {
      const cell = eng.grid[coord.row]?.[coord.col] ?? null;
      const neighborTrees = countNeighboringAdultTrees(eng.grid, coord);
      onCellHoverRef.current?.(coord, cell, neighborTrees);
    } else {
      onCellHoverRef.current?.(null, null, 0);
    }

    if (isMouseDownRef.current) {
      applyBrushAtPoint(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
    hoverCoordRef.current = null;
    onCellHoverRef.current?.(null, null, 0);
  };

  // Suporte Touch para Dispositivos Móveis
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      isMouseDownRef.current = true;
      applyBrushAtPoint(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0 && isMouseDownRef.current) {
      const touch = e.touches[0];
      applyBrushAtPoint(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    isMouseDownRef.current = false;
    hoverCoordRef.current = null;
    onCellHoverRef.current?.(null, null, 0);
  };

  return (
    <div className={`relative w-full max-w-[640px] aspect-[4/3] rounded-xl overflow-hidden border border-border-subtle bg-[#0B130E] shadow-2xl touch-none select-none flex items-center justify-center ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
}
