# TASK: Simulador de Autômato Celular - Bacia Hidrográfica, Mata Ciliar e Estações

## 1. Visão Geral
Refatorar a base legada de autômato celular para simular a dinâmica ecossistêmica de uma **Bacia Hidrográfica protegida por Mata Ciliar**, com **Dispersão de Sementes** e **Sazonalidade Climática (Ciclo Global de Estações)**.

A aplicação será construída em **Next.js (App Router, TypeScript)** com renderização em HTML5 Canvas de alto desempenho.

---
agy --conversation=39426956-b1ad-46ed-b21d-4ec3b08c2eff
## 2. Modelo Conceitual e Arquitetura de Dados

O sistema opera combinando:
1. **Grid Celular 2D:** Representa o solo, água e ciclo de vida vegetal.
2. **Camada de Agentes Dispersores (Polinizadores/Vento):** Espalha sementes pelo mapa.
3. **Controlador Climático Global:** Gerencia o ciclo sazonal (`CHEIA` vs `SECA`).

### 2.1 Estados Discretos da Célula (`CellState`)
```typescript
export enum CellState {
  SOLO_SECO = 0,       // Solo inerte fora do raio hídrico
  SOLO_FERTIL = 1,     // Margem dentro do raio de influência do rio
  SEMENTE = 2,         // Semente depositada pelo dispersor
  BROTO = 3,           // Vegetação jovem em fixação
  ARVORE_ADULTA = 4,   // Mata ciliar consolidada (fornece proteção térmica/sombra)
  LEITO_AGUA = 5,      // Célula de rio ativa (emite raio de umidade)
  LEITO_SECO = 6       // Célula de rio evaporada/assoreada
}

2.2 Sazonalidade Global (ClimateSeason)Controlada por um contador de ticks global:ESTAÇÃO CHUVOSA: O rio tem evaporação mínima; o raio hídrico expande; rios secos podem se regenerar.ESTAÇÃO DE SECA: A taxa de evaporação sobe criticamente; trechos de rio sem sombra florestal direta secam rapidamente.3. Regras de Transição e Dinâmica da Simulação3.1 Dinâmica da Água e Mata CiliarDifusão do Raio Hídrico:Células em distância Chebyshev/Manhattan $\le R_{\text{agua}}$ de qualquer LEITO_AGUA ativo tornam-se SOLO_FERTIL.Se o trecho do rio secar (LEITO_SECO), o solo ao redor volta a ser SOLO_SECO.Evaporação do Rio (Proteção pela Mata):Para cada célula de LEITO_AGUA:Conta a quantidade de ARVORE_ADULTA na vizinhança de Moore (8 vizinhos).Durante a SECA:Se arvores_vizinhas >= 3: Leito protegido (taxa de evaporação = 0%).Se arvores_vizinhas < 3: Alta chance $P_{\text{evaporar}}$ de virar LEITO_SECO.Regeneração do Leito:Durante a CHUVA: LEITO_SECO adjacente a LEITO_AGUA ativo tem chance $P_{\text{recupera}}$ de voltar a ser LEITO_AGUA.3.2 Dinâmica Vegetal e Germinação SeletivaRegra de Sobrevivência da Semente:Uma SEMENTE só transita para BROTO se estiver em SOLO_FERTIL (dentro do raio da água).Se cair em SOLO_SECO: a semente não vinga e degrada de volta a SOLO_SECO após $K$ ciclos.Maturação:BROTO em solo com água contínua evolui para ARVORE_ADULTA após tempo de maturação.Se a água ao redor secar durante a fase de broto, ele morre.Senescência:ARVORE_ADULTA possui taxa basal mínima de mortalidade natural por ciclo, reabrindo espaço na margem.3.3 Dinâmica dos Dispersores / PolinizadoresAgentes móveis com posições contínuas ou discretas no grid.Vetor de Movimento: Caminhada aleatória com viés de atração para células com vegetação ativa.Ação: Ao visitar uma ARVORE_ADULTA, o agente adquire pólen/semente.Dispersão: Ao se deslocar, possui probabilidade $P_{\text{dropar}}$ de depositar uma SEMENTE na célula em que se encontra (seja solo seco ou fértil).4. Roteiro de Implementação TécnicaFase 1: Refatoração de Tipos e Modelos (src/lib/types.ts)[ ] Definir enums CellState e ClimateSeason (CHUVOSA, SECA).[ ] Modelar a interface do agente Disperser:TypeScriptexport interface Disperser {
  id: number;
  x: number;
  y: number;
  hasSeed: boolean;
}
[ ] Definir o contrato de configuração (SimConfig): taxas de evaporação, raio de influência da água, duração das estações, número de dispersores.Fase 2: Motor de Simulação (src/lib/engine.ts)[ ] Implementar double-buffering estrito para a matriz do grid celular.[ ] Implementar cálculo de campo de distância/umidade a partir das células de LEITO_AGUA.[ ] Implementar a máquina de estados celular com as regras da Seção 3.[ ] Implementar atualização do array de dispersores (movimento, coleta e drop de sementes).[ ] Implementar transição periódica do relógio de clima sazonal (seasonTickCounter).Fase 3: Renderização Otimizada (src/components/SimulationCanvas.tsx)[ ] Utilizar HTML5 Canvas 2D via requestAnimationFrame rodando em loop desvinculado do ciclo de render do React (usando useRef).[ ] Paleta de Cores:LEITO_AGUA: #1D4ED8 (Azul vivo)LEITO_SECO: #94A3B8 (Cinza leito árido)SOLO_FERTIL: #78350F (Marrom úmido)SOLO_SECO: #FDE68A (Areia/Árido)SEMENTE: #D97706 (Ponto ocre)BROTO: #86EFAC (Verde broto)ARVORE_ADULTA: #15803D (Verde escuro de dossel)DISPERSOR: #FACC15 (Ponto amarelo brilhante / polinizador)[ ] Ferramenta de interação via mouse:Pincel para desmatar (remover árvores).Pincel para plantar árvores manualmente.Pincel para abrir/fechar canais de água.Fase 4: Painel de Controle e Métricas (src/components/Dashboard.tsx)[ ] Indicador visual da Estação Atual (badge visual: Ícone de Sol/Seca vs Chuva com barra de progresso da temporada).[ ] Controles: Play/Pause, Step único, Velocidade da simulação, Slider de raio da água.[ ] Métricas em tempo real:Extensão do rio preservada vs leito seco.Densidade da mata ciliar.Taxa de germinação efetiva (sementes que vingaram vs sementes perdidas no seco).[ ] Botão de Preset de Cenários:Cenário A (Mata Nativa Equilibrada): Rio resiste à transição da estação seca.Cenário B (Bacia Degradada): Margens sem árvores; o rio seca na primeira onda de estiagem.5. Estrutura de Arquivos SugeridaPlaintextsrc/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── SimulationCanvas.tsx
│   ├── ControlBar.tsx
│   ├── SeasonIndicator.tsx
│   └── StatsCard.tsx
└── lib/
    ├── types.ts
    ├── constants.ts
    ├── engine.ts
    ├── presets.ts
    └── utils.ts
6. Critérios de AceitePolinizadores espalham sementes por todo o mapa, mas sementes em solo seco invariavelmente perecem sem virar brotos.Sementes que caem dentro da margem úmida do rio germinam e formam um corredor florestal (mata ciliar contínua).Na virada para a estação de seca, trechos de rio sem cobertura florestal de árvores adultas evaporam progressivamente.Trechos com mata ciliar densa mantêm a água preservada durante todo o período de seca.