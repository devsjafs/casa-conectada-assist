

# Redesign: Interface estilo Echo Show 15

Transformar o dashboard atual em uma interface inspirada no Amazon Echo Show 15, otimizada para tablet fixo na parede em modo paisagem.

## O que muda visualmente

O Echo Show 15 tem um layout com widgets organizados em grid, relógio grande e proeminente, informacoes contextuais (clima, notícias), e controles de casa inteligente acessíveis com um toque. A ideia é trazer essa experiencia para o seu app.

### Layout principal (landscape ~1280x800)

```text
+------------------------------------------------------------------+
|                                                                  |
|  [Relogio grande]     [Data/Saudacao]       [Clima]   [Avatar]   |
|                                                                  |
+------------------------------------------------------------------+
|                                              |                   |
|  +----------+  +----------+  +----------+    |   Noticias /      |
|  | Camera 1 |  | Camera 2 |  | Luz Sala |    |   Feed pessoal   |
|  |          |  |          |  |  ON 80%  |    |                   |
|  +----------+  +----------+  +----------+    |   - Titulo 1...  |
|                                              |   - Titulo 2...  |
|  +----------+  +----------+  +----------+    |   - Titulo 3...  |
|  | AC 24°C  |  | Luz Qto  |  | TV       |    |                   |
|  |  Frio    |  |  OFF     |  |  OFF     |    |   [Reconhec.     |
|  +----------+  +----------+  +----------+    |    Facial]        |
|                                              |                   |
|  [ Sala ] [ Quarto ] [ Cozinha ] [ Todos ]   |                   |
+------------------------------------------------------------------+
```

## Mudancas planejadas

### 1. Header -- estilo "ambient display"
- Relogio digital grande e centralizado (estilo Echo Show)
- Data por extenso e saudacao contextual ("Boa tarde, [nome]")
- Remover logo "Smart Home" e simplificar
- Mover avatar/menu para canto superior direito como icone discreto
- O relogio atualiza em tempo real (setInterval)

### 2. Layout do conteudo principal
- Inverter a posicao: **notificacoes/feed a direita** (mais estreito, ~300px), **dispositivos a esquerda** (area principal)
- Dispositivos em grid de widgets compactos (estilo Echo Show widgets)
- Room selector como pills horizontais na parte inferior da area de dispositivos
- Remover secoes separadas (Cameras, Iluminacao, Controles) -- tudo fica junto no grid de widgets como cards uniformes

### 3. Cards de dispositivos -- estilo widget
- Cards mais compactos e uniformes em tamanho
- Icone + nome + estado visivel de relance
- Interacao com um toque (toggle direto)
- Cores de estado mais evidentes (verde ligado, cinza desligado)
- Cameras aparecem como widgets no mesmo grid (miniatura com overlay de status)

### 4. Painel lateral direito (notificacoes)
- Mover de esquerda para direita
- Banner de reconhecimento facial no topo do painel
- Feed de noticias como cards simples de texto (titulo + resumo curto)
- Visual mais clean, sem bordas pesadas

### 5. Quick Stats
- Remover secao separada; integrar contagem de dispositivos ativos discretamente no header ou como badge

## Detalhes tecnicos

### Arquivos modificados
- **src/pages/Index.tsx** -- Reorganizar layout (sidebar direita, grid de widgets, header ambient)
- **src/components/dashboard/Header.tsx** -- Redesign completo: relogio grande, saudacao, sem logo
- **src/components/dashboard/QuickStats.tsx** -- Remover ou simplificar como badges no header
- **src/components/dashboard/NotificationsPanel.tsx** -- Ajustes visuais para painel direito
- **src/components/dashboard/LightCard.tsx** -- Tornar mais compacto (estilo widget)
- **src/components/dashboard/RemoteCard.tsx** -- Tornar mais compacto (estilo widget)
- **src/components/dashboard/CameraCard.tsx** -- Versao widget (menor, sem hover effects exagerados)
- **src/components/dashboard/RoomSelector.tsx** -- Pills menores, posicionadas abaixo do grid
- **src/index.css** -- Possiveis ajustes nas variaveis de cor e utilitarios

### Abordagem
- Manter toda a logica de dados e integracao existente (SmartThings, face recognition, notificacoes)
- Apenas redesenhar a camada visual/layout
- Manter responsividade: em mobile, painel de noticias fica oculto (como ja esta)
- Relogio com `setInterval` de 1 segundo para atualizar hora em tempo real

