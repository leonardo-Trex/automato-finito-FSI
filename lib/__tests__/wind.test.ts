import { describe, it, expect } from 'vitest';
import {
  createWindAgent,
  createWindAgents,
  advanceWindAgent,
  getWindGridCoord,
  DEFAULT_WIND_AGENT_COUNT,
  WIND_MARGIN,
  WIND_MAX_ANGLE,
} from '@/lib/wind';
import type { WindAgent } from '@/types/simulation';

describe('wind module', () => {
  const CANVAS_W = 640;
  const CANVAS_H = 480;

  describe('createWindAgent', () => {
    it('cria agente com valores padrão válidos dentro dos limites do canvas', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H);

      expect(agent.x).toBeGreaterThanOrEqual(0);
      expect(agent.x).toBeLessThanOrEqual(CANVAS_W);
      expect(agent.y).toBeGreaterThanOrEqual(0);
      expect(agent.y).toBeLessThanOrEqual(CANVAS_H);

      expect(agent.baseSpeed).toBeGreaterThan(0);
      expect(agent.vx).toBeGreaterThan(0); // Movimenta-se predominantemente para a direita
      expect(Math.abs(agent.angle)).toBeLessThanOrEqual(WIND_MAX_ANGLE);
    });

    it('aceita overrides parciais para posicionamento e velocidade controlada', () => {
      const custom: Partial<WindAgent> = {
        x: 100,
        y: 200,
        vx: 1.5,
        vy: 0,
        baseSpeed: 1.5,
        angle: 0,
        waveOffset: 0,
      };

      const agent = createWindAgent(CANVAS_W, CANVAS_H, custom);

      expect(agent.x).toBe(100);
      expect(agent.y).toBe(200);
      expect(agent.vx).toBe(1.5);
      expect(agent.vy).toBe(0);
      expect(agent.baseSpeed).toBe(1.5);
      expect(agent.angle).toBe(0);
      expect(agent.waveOffset).toBe(0);
    });
  });

  describe('createWindAgents', () => {
    it(`cria coleção com quantidade padrão (${DEFAULT_WIND_AGENT_COUNT}) de agentes`, () => {
      const agents = createWindAgents(DEFAULT_WIND_AGENT_COUNT, CANVAS_W, CANVAS_H);

      expect(agents).toHaveLength(DEFAULT_WIND_AGENT_COUNT);
      agents.forEach((agent) => {
        expect(agent.x).toBeGreaterThanOrEqual(0);
        expect(agent.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('cria coleção customizada com N agentes', () => {
      const agents = createWindAgents(5, CANVAS_W, CANVAS_H);
      expect(agents).toHaveLength(5);
    });
  });

  describe('advanceWindAgent', () => {
    it('avança a posição X continuamente no sentido da velocidade', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: 50,
        y: 100,
        vx: 1.0,
        vy: 0,
        baseSpeed: 1.0,
        angle: 0,
        waveOffset: 0,
      });

      advanceWindAgent(agent, 0, CANVAS_W, CANVAS_H, {
        enableTurbulence: false,
        waveAmplitude: 0,
      });

      expect(agent.x).toBeCloseTo(51.0);
      expect(agent.y).toBeCloseTo(100.0);
    });

    it('aplica oscilação senoidal vertical conforme os frames avançam', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: 50,
        y: 100,
        vx: 0,
        vy: 0,
        baseSpeed: 0,
        angle: 0,
        waveOffset: 0,
      });

      const waveAmp = 2.0;
      const waveFreq = Math.PI / 2; // frame 1 -> sin(pi/2) = 1

      advanceWindAgent(agent, 1, CANVAS_W, CANVAS_H, {
        enableTurbulence: false,
        waveAmplitude: waveAmp,
        waveFrequency: waveFreq,
      });

      expect(agent.y).toBeCloseTo(100 + waveAmp);
    });

    it('aplica wrap-around horizontal ao ultrapassar a borda direita', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: CANVAS_W + WIND_MARGIN + 1,
        y: 150,
        vx: 1.0,
        vy: 0,
        baseSpeed: 1.0,
        angle: 0,
        waveOffset: 0,
      });

      advanceWindAgent(agent, 0, CANVAS_W, CANVAS_H, {
        enableTurbulence: false,
        waveAmplitude: 0,
      });

      // Deve reentrar pela borda esquerda (-WIND_MARGIN)
      expect(agent.x).toBe(-WIND_MARGIN);
    });

    it('aplica wrap-around vertical ao cruzar a borda inferior', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: 200,
        y: CANVAS_H + WIND_MARGIN + 1,
        vx: 0,
        vy: 0,
        baseSpeed: 0,
        angle: 0,
        waveOffset: 0,
      });

      advanceWindAgent(agent, 0, CANVAS_W, CANVAS_H, {
        enableTurbulence: false,
        waveAmplitude: 0,
      });

      expect(agent.y).toBe(-WIND_MARGIN);
    });

    it('aplica turbulência e variação aleatória de direção quando habilitada', () => {
      const initialAngle = 0;
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: 100,
        y: 100,
        vx: 1.0,
        vy: 0,
        baseSpeed: 1.0,
        angle: initialAngle,
        waveOffset: 0,
      });

      // Avança múltiplos quadros com turbulência ativa
      for (let f = 1; f <= 50; f++) {
        advanceWindAgent(agent, f, CANVAS_W, CANVAS_H, {
          enableTurbulence: true,
        });
      }

      // O ângulo deve ter sofrido variação contínua dentro dos limites
      expect(Math.abs(agent.angle)).toBeLessThanOrEqual(WIND_MAX_ANGLE);
      // Posição deve ter progredido
      expect(agent.x).toBeGreaterThan(100);
    });
  });

  describe('getWindGridCoord', () => {
    it('mapeia corretamente a posição do agente em pixels para célula da grade', () => {
      const agent = createWindAgent(CANVAS_W, CANVAS_H, {
        x: 45, // Célula de 20px -> col 2 (45 / 20 = 2.25)
        y: 65, // Célula de 20px -> row 3 (65 / 20 = 3.25)
      });

      const coord = getWindGridCoord(agent, 20);
      expect(coord).toEqual({ col: 2, row: 3 });
    });
  });
});
