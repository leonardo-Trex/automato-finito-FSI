/**
 * Plantae Evolution — Paleta de Cores e Tokens Visuais
 *
 * Centraliza as definições de cores para a UI (Tailwind CSS)
 * e para a simulação gráfica em canvas (p5.js).
 */

export const PALETTE = {
  // Cores da Interface (UI)
  ui: {
    background: '#0B130E',       // Deep Biosphere (fundo principal)
    surfacePanel: '#132219',     // Painéis laterais (config e impacto)
    surfaceCard: '#1C3225',      // Cards internos, botões e caixas
    surfaceHover: '#244030',     // Estados de hover em cards/botões
    borderSubtle: '#284B37',     // Divisórias e bordas sutis
    borderActive: '#4ADE80',     // Borda ativa / foco / seleção
    textPrimary: '#F2FBF5',      // Texto principal de alto contraste
    textMuted: '#94A89C',        // Labels secundárias e unidades
  },

  // Grid / Matriz da Simulação
  grid: {
    empty: '#151E17',            // Solo fértil desocupado
    lines: '#1C2920',            // Linhas da grade da matriz
    hover: '#223829',            // Célula destacada ao passar o mouse
  },

  // Ciclo Ontogenético da Planta (Ciclo de Vida)
  stages: {
    seed: '#D4A373',             // Semente recém-plantada (âmbar terroso)
    sprout: '#86EFAC',           // Broto em crescimento (verde claro vivo)
    mature: '#16A34A',           // Planta madura estável (verde esmeralda)
    bloom: '#FB7185',            // Fase reprodutiva / florescência (coral)
  },

  // Bacia Hidrográfica e Mata Ciliar (TASK.md § Fase 3)
  watershed: {
    water: '#1D4ED8',            // LEITO_AGUA (Azul vivo)
    dryRiver: '#94A3B8',         // LEITO_SECO (Cinza leito árido)
    fertileSoil: '#78350F',      // SOLO_FERTIL (Marrom úmido)
    drySoil: '#FDE68A',          // SOLO_SECO (Areia / Árido)
    seed: '#D97706',             // SEMENTE (Ponto ocre)
    sprout: '#86EFAC',           // BROTO (Verde broto)
    tree: '#15803D',             // ARVORE_ADULTA (Verde escuro de dossel)
    disperser: '#FACC15',        // DISPERSOR (Amarelo brilhante)
  },

  // Identidade das Espécies (Fase 2 / Sprint 2)
  species: {
    bryophyte: {
      id: 'bryophyte',
      name: 'Briófita',
      mature: '#15803D',         // Verde floresta denso
      reproductive: '#BEF264',   // Esporo lima luminoso
      agent: 'wind',
    },
    gymnosperm: {
      id: 'gymnosperm',
      name: 'Gimnosperma',
      mature: '#0D9488',         // Conífera / Teal
      reproductive: '#FBBF24',   // Pinha / Semente dourada
      agent: 'bird',
    },
    angiosperm: {
      id: 'angiosperm',
      name: 'Angiosperma',
      mature: '#059669',         // Esmeralda vibrante
      reproductive: '#F43F5E',   // Flor / Fruto magenta vivo
      agent: 'bee',
    },
  },

  // Agentes Polinizadores
  agents: {
    wind: {
      id: 'wind',
      name: 'Vento',
      color: '#67E8F9',          // Ciano etéreo
      symbol: '🍃',
    },
    bee: {
      id: 'bee',
      name: 'Abelha',
      color: '#FACC15',          // Âmbar dourado vibrante
      symbol: '🐝',
    },
    bird: {
      id: 'bird',
      name: 'Pássaro',
      color: '#FB923C',          // Coral alado
      symbol: '🐦',
    },
  },

  // Métricas do Painel de Impacto Ambiental
  metrics: {
    o2: '#38BDF8',               // Oxigênio gerado (Azul celeste)
    co2: '#34D399',              // Carbono capturado (Menta viva)
    warmingHigh: '#EF4444',      // Alerta crítico de aquecimento
    warmingNeutral: '#F59E0B',   // Estado intermediário
    warmingLow: '#10B981',       // Planeta regenerado / equilibrado
  },
} as const;

export type SpeciesKey = keyof typeof PALETTE.species;
export type AgentKey = keyof typeof PALETTE.agents;
export type StageKey = keyof typeof PALETTE.stages;

/**
 * Utilitário para converter cor HEX para tupla RGB [r, g, b].
 * Útil para chamadas p5.js como `p5.fill(...hexToRgb(color))`.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
