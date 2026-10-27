# Votacions DAM — Demo de Vue.js, Pinia, Router i WebSockets

Aplicació de demostració del mòdul **DI – Desenvolupament d'Interfícies**.
És una petita aplicació de **votacions en temps real**: un usuari fa login, veu 4 opcions i pot votar. Cada vot s'envia al servidor per **WebSocket** i el servidor retransmet el resultat actualitzat a **tots** els clients connectats, de manera que tothom veu els comptadors canviar en directe.

L'objectiu del repositori **no és l'aplicació en si**, sinó mostrar de manera senzilla i aïllada els conceptes clau del desenvolupament d'interfícies amb Vue 3.

## Què s'hi demostra

| # | Concepte | On es veu |
|---|----------|-----------|
| 1 | Components i comunicació **pare → fill** amb `props` | `VotacionsScreen.vue` → `botoVotar.vue` |
| 2 | Comunicació **fill → pare** amb `emits` | `botoVotar.vue` → `VotacionsScreen.vue` |
| 3 | `slot` per passar contingut a un component | `<botoVotar>{{ actual }}</botoVotar>` |
| 4 | Magatzem central d'estat amb **Pinia** | `src/stores/app.js` |
| 5 | Navegació amb **Vue Router** i protecció de pantalles | `src/router/index.js`, `LoginScreen.vue` |
| 6 | Comunicació en temps real amb **WebSockets** | `src/services/WebSocketService.js` + `backend/server.js` |
| 7 | **Separació de responsabilitats**: comunicacions en una carpeta `services` amb format de **classe** | `src/services/` |
| 8 | Integració WebSocket → Pinia → components (flux de dades reactiu) | tot el recorregut d'un vot |
| 9 | **Gràfics** amb Chart.js: llibreria externa + `ref` de plantilla + `watch` | `ChartComponent.vue` |
| 10 | Execució amb **Docker Compose** (dev i producció) | `docker-compose.dev.yml`, `docker-compose.prod.yml` |

---

## Estructura del projecte

```
votacionsDAM/
├── docker-compose.dev.yml      # Desenvolupament: frontend (8080) i backend (3000) amb hot reload
├── docker-compose.prod.yml     # Producció: nginx (80) + backend intern
├── backend/                    # Servidor WebSocket (Node.js)
│   ├── server.js
│   ├── votos.json              # Persistència dels vots (en local)
│   ├── Dockerfile.dev          # Imatge de desenvolupament
│   ├── Dockerfile.prod         # Imatge de producció (sense devDependencies)
│   └── .dockerignore
└── frontend/                   # Aplicació Vue 3 (Vite + Vuetify)
    ├── Dockerfile.dev          # Servidor de Vite amb hot reload
    ├── Dockerfile.prod         # Multi-stage: build amb Node → nginx
    ├── nginx.conf              # Configuració de nginx (SPA + proxy /ws)
    ├── .env.development        # VITE_WS_URL per a desenvolupament
    ├── .dockerignore
    └── src/
        ├── main.js             # Arrencada: Pinia, Router i Vuetify
        ├── App.vue             # Layout general + <RouterView>
        ├── router/index.js     # Rutes: "/" (login) i "/votacions"
        ├── stores/app.js       # Store de Pinia (login + vots)
        ├── services/
        │   └── WebSocketService.js   # Classe que gestiona el WebSocket
        ├── views/              # Pantalles (una per ruta)
        │   ├── LoginScreen.vue
        │   └── VotacionsScreen.vue
        └── components/         # Components reutilitzables
            ├── botoVotar.vue
            └── ChartComponent.vue    # Gràfic de barres amb Chart.js
```

**Convenció:** les carpetes `views/` contenen pantalles completes associades a una ruta; `components/` conté peces reutilitzables sense coneixement del router ni de la xarxa.

---

## Com executar-ho

### Amb Docker — desenvolupament (recomanat)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: <http://localhost:8080>
- Backend (WebSocket): `ws://localhost:3000`

### Amb Docker — producció

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Aplicació: <http://localhost> (nginx serveix el build de Vite i fa de proxy del WebSocket a `/ws`)

### Sense Docker

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # o npm start

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

### Credencials de prova

| Usuari | Contrasenya |
|--------|-------------|
| `user` | `123`       |

> El login és **fals a propòsit** (està escrit directament al codi) perquè l'objectiu és ensenyar com es guarda l'estat i com es navega, no l'autenticació real.

**Truc per veure el temps real:** obre l'aplicació en dues pestanyes (o dos navegadors), fes login a totes dues i vota a una: l'altra s'actualitzarà sola.

---

## 1. Components: comunicació pare ↔ fill

Un component és una peça d'interfície reutilitzable. Aquí tenim un **pare** (`VotacionsScreen.vue`) que pinta quatre **fills** (`botoVotar.vue`), un per opció.

La regla d'or de Vue és:

```
        props (dades cap avall)
 PARE ─────────────────────────▶ FILL
      ◀─────────────────────────
        emits (esdeveniments cap amunt)
```

### Pare → fill amb `props`

El pare passa dades al fill com si fossin atributs HTML (`VotacionsScreen.vue`):

```vue
<botoVotar
  :voteCount="store.votos[index]"
  :idOption="index"
  @votar="gestioVot"
>
  {{ actual }}
</botoVotar>
```

El fill les declara amb `defineProps` (`botoVotar.vue`):

```js
const props = defineProps(['voteCount', 'idOption'])
```

Les props són **de només lectura** per al fill: no les pot modificar, només mostrar-les.

### Fill → pare amb `emits`

El fill **no sap** què passa quan es vota (no coneix el WebSocket ni Pinia). Només avisa que ha passat alguna cosa emetent un esdeveniment:

```js
const emit = defineEmits(['votar'])

function vote() {
  emit('votar', props.idOption)   // "Pare, m'han clicat; sóc l'opció X"
}
```

I el pare l'escolta amb `@votar="gestioVot"`:

```js
function gestioVot(id) {
  wsService.sendVote(id)
}
```

**Per què és útil?** El component `botoVotar` és completament reutilitzable: el mateix botó serviria per a una altra votació amb un altre pare diferent, perquè no té cap dependència externa.

### Slots

El text del botó ("Opció 1", "Opció 2"…) es passa pel **slot**: el contingut entre les etiquetes `<botoVotar>…</botoVotar>` apareix on el fill posa `<slot></slot>`.

---

## 2. Pinia: el magatzem central

Si dos components que no són pare-fill necessiten compartir dades (per exemple, el login i la pantalla de votacions), passar props de component en component es torna inviable. Per això s'usa un **store** global: `src/stores/app.js`.

```js
export const useAppStore = defineStore('app', () => {
  // State
  const loginInfo = ref({ loggedIn: false, username: '', image: '' })
  const votos = ref([0, 0, 0, 0])

  // Getters
  const isLoggedIn = computed(() => loginInfo.value.loggedIn)

  // Actions
  function setLoginInfo({ loggedIn, username, image }) { ... }
  function setVotos(nousVots) { votos.value = nousVots }

  return { loginInfo, votos, isLoggedIn, setLoginInfo, setVotos }
})
```

S'usa l'estil **Setup Store** (com un `<script setup>`):

| Part de Pinia | Equivalent en el codi |
|---------------|-----------------------|
| **State** | `ref(...)` → `loginInfo`, `votos` |
| **Getters** | `computed(...)` → `isLoggedIn` |
| **Actions** | funcions → `setLoginInfo`, `setVotos` |

Qui l'utilitza:

- `LoginScreen.vue` **escriu** l'usuari quan el login és correcte (`store.setLoginInfo(...)`).
- `VotacionsScreen.vue` **llegeix** `store.isLoggedIn` per protegir la pantalla i `store.votos` per pintar els comptadors.
- `WebSocketService.js` **escriu** els vots rebuts del servidor (`store.setVotos(data)`).

Pinia s'instal·la una sola vegada a `main.js` amb `app.use(createPinia())`.

---

## 3. Vue Router: navegació entre pantalles

`src/router/index.js` associa cada URL a una vista:

| Ruta | Vista |
|------|-------|
| `/` | `LoginScreen` |
| `/votacions` | `VotacionsScreen` |

- A `App.vue`, `<RouterView />` és el "forat" on es dibuixa la vista de la ruta actual, i els `<v-btn to="/...">` fan de menú de navegació.
- La navegació **programàtica** es fa amb `useRouter()`: després d'un login correcte, `router.push('/votacions')`.
- **Guarda senzilla de login:** en muntar `VotacionsScreen`, si `store.isLoggedIn` és `false`, es mostra un avís i es redirigeix a `/`. Això connecta Router + Pinia: el router navega, el store recorda qui ets.

---

## 4. WebSockets: comunicació en temps real

HTTP clàssic és **petició → resposta**: el client sempre pregunta primer. Un WebSocket obre una connexió **bidireccional i persistent**: el servidor pot enviar dades al client en qualsevol moment, sense que aquest les hagi demanat. Ideal per a xats, jocs o... votacions en directe.

### Separació en una classe de servei

En lloc de posar el codi de xarxa dins del component, s'ha aïllat a `src/services/WebSocketService.js` com una **classe**:

```js
class WebSocketService {
  constructor(url) { ... }   // guarda la URL i obté el store
  connect()    { ... }       // obre el WebSocket i registra els esdeveniments
  sendVote(i)  { ... }       // envia {"vote": i}
  disconnect() { ... }       // tanca la connexió
}
```

**Per què una carpeta `services`?** Cada capa fa una sola cosa:

| Capa | Responsabilitat | Sap de... |
|------|-----------------|-----------|
| Component (`botoVotar`) | Mostrar i avisar del clic | només props/emits |
| Vista (`VotacionsScreen`) | Orquestrar: crear el servei i connectar els events | servei + store |
| **Servei** (`WebSocketService`) | Parlar amb el servidor | WebSocket + store |
| Store (Pinia) | Guardar l'estat compartit | res de la xarxa |

Si demà canviem WebSocket per una API REST, només toquem el servei; els components no es toquen.

### Esdeveniments del WebSocket

El navegador ofereix quatre esdeveniments, tots gestionats a `connect()`:

| Esdeveniment | Quan salta | Què fem |
|--------------|-----------|---------|
| `onopen` | Connexió establerta | Log |
| `onmessage` | El servidor envia dades | `JSON.parse` + `store.setVotos(data)` |
| `onclose` | Es tanca la connexió | Log + reintent als 5 s |
| `onerror` | Hi ha un error | Log |

### Cicle de vida amb Vue

`VotacionsScreen.vue` connecta i desconnecta amb els *hooks* del cicle de vida:

```js
onMounted(() => {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}://${location.host}/ws`
  wsService = new WebSocketService(wsUrl)
  wsService.connect()
})
onUnmounted(() => { wsService.disconnect() })
```

Així la connexió només existeix mentre l'usuari és a la pantalla de votacions.

**D'on surt la URL?** No està escrita al codi, perquè canvia segons l'entorn:

| Entorn | URL | Per què |
|--------|-----|---------|
| Desenvolupament | `ws://localhost:3000` | Vite llegeix `frontend/.env.development` i exposa `import.meta.env.VITE_WS_URL` |
| Producció | `ws(s)://<host>/ws` | No hi ha `VITE_WS_URL`; es fa servir el mateix host i nginx redirigeix `/ws` al backend |

> Només les variables que comencen per `VITE_` arriben al codi del navegador, i s'incrusten en **temps de compilació** (`npm run build`), no en temps d'execució.

---

## 5. El recorregut complet d'un vot

Això és el que ho lliga tot. Segueix els números:

```
 ┌─────────────────────── FRONTEND ────────────────────────┐        ┌──── BACKEND ────┐
 │                                                          │        │                 │
 │ ① botoVotar         ② VotacionsScreen    ③ WebSocketService       │                 │
 │  clic "Votar" ──emit──▶ gestioVot(id) ──▶ sendVote(id) ──────────────▶ ④ server.js   │
 │                                                          │        │  votos[id]++    │
 │                                                          │        │  desa votos.json│
 │ ⑦ botoVotar        ⑥ Pinia (store.votos)  ⑤ onmessage ◀──────────────  broadcast a   │
 │  repinta el nombre ◀── props ◀── reactivitat ◀─ setVotos()│        │  TOTS els clients│
 │ ⑧ ChartComponent ◀── watch ◀──┘                          │        │                 │
 │  chart.update()                                          │        │                 │
 └──────────────────────────────────────────────────────────┘        └─────────────────┘
```

1. L'usuari clica **Votar** → el fill fa `emit('votar', id)`.
2. El pare rep l'event a `gestioVot(id)`.
3. `gestioVot` crida `wsService.sendVote(id)`, que envia `{"vote": id}` pel WebSocket.
4. El servidor incrementa el comptador, el desa i envia l'array nou a tots els clients.
5. `onmessage` rep l'array i crida `store.setVotos(data)`.
6. Com que `store.votos` és un `ref` **reactiu**, Vue detecta el canvi.
7. `VotacionsScreen` passa `store.votos[index]` com a prop `voteCount` i cada `botoVotar` es repinta sol.
8. En paral·lel, el `watch` de `ChartComponent` detecta el canvi a `store.votos` i actualitza el gràfic (veure [apartat 7](#7-gràfics-amb-chartjs)).

> Fixa't que **cap component no actualitza el comptador directament** quan es vota: el vot va al servidor i el resultat torna pel store. El servidor és la font de la veritat; així tots els clients sempre veuen el mateix.

---

## 6. Backend (`backend/server.js`)

El backend té menys importància pedagògica; és un servidor Node.js mínim amb la llibreria [`ws`](https://github.com/websockets/ws). Tot el codi és a **`server.js`**.

Què fa, pas a pas:

1. **Carrega els vots** des de `votos.json` en arrencar (si no existeix, el crea amb `[0,0,0,0]`). Així els vots sobreviuen a un reinici.
2. **Crea el servidor WebSocket** al port 3000: `new WebSocketServer({ port })`.
3. **Quan un client es connecta** (`connection`), li envia immediatament l'estat actual dels vots perquè la pantalla no comenci a zero.
4. **Quan arriba un missatge** (`message`):
   - fa `JSON.parse` i comprova que tingui la propietat `vote`;
   - valida que l'índex estigui dins del rang;
   - incrementa `votos[index]` i desa el fitxer;
   - fa un **broadcast**: recorre `wss.clients` i envia l'array nou a tots els que tinguin la connexió oberta (`readyState === OPEN`).
5. Gestiona `close` i `error` per fer log.

El **protocol** entre client i servidor és minúscul:

| Direcció | Missatge | Exemple |
|----------|----------|---------|
| Client → Servidor | Vot | `{"vote": 2}` |
| Servidor → Client | Estat de tots els vots | `[16,17,7,4]` |

---

## 7. Gràfics amb Chart.js

Damunt dels botons es mostra un **gràfic de barres** amb els vots de cada opció, que s'actualitza en directe com els comptadors. Està fet amb [Chart.js](https://www.chartjs.org/) dins del component `src/components/ChartComponent.vue`.

### Instal·lació

Chart.js és una llibreria normal de JavaScript (no és específica de Vue):

```bash
npm install chart.js
```

### Integració a la vista

`VotacionsScreen.vue` només ha d'importar el component i posar-lo a la plantilla, en una fila de Vuetify per sobre dels botons:

```vue
<script setup>
import ChartComponent from '@/components/ChartComponent.vue'
</script>

<template>
  <v-row>
    <v-col cols="12">
      <ChartComponent />
    </v-col>
  </v-row>
  <!-- ...a sota, la fila amb els 4 botoVotar... -->
</template>
```

Fixa't que **no li passa cap prop**: el gràfic llegeix els vots directament del **store de Pinia**. És un exemple de per què serveix un magatzem central: la vista no ha de fer d'intermediària.

| | `botoVotar` | `ChartComponent` |
|---|---|---|
| D'on treu les dades | `props` que li passa el pare | directament de Pinia (`useAppStore()`) |
| Reutilitzable en un altre context? | Sí, no depèn de res | Només on existeixi aquest store |

Cap de les dues opcions és "la bona": les props fan el component més independent; el store evita passar dades per molts nivells.

### Com funciona el component

Chart.js **no és reactiu**: no sap res de Vue. Funciona de manera **imperativa**: li dones un `<canvas>`, crea el gràfic, i quan les dades canvien li has de dir explícitament que es torni a dibuixar. El component fa de "pont" entre els dos mons en tres passos:

**① Un `ref` de plantilla per accedir al `<canvas>` real**

```vue
<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
const chartCanvas = ref(null)   // s'omplirà amb l'element <canvas> del DOM
</script>
```

Fins ara els `ref` guardaven dades; aquí `ref="chartCanvas"` fa que Vue hi posi l'**element HTML** quan el component es munta.

**② Crear el gràfic a `onMounted`**

```js
import Chart from 'chart.js/auto'

let chartInstance = null

onMounted(() => {
  const ctx = chartCanvas.value.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: chartData.value,          // etiquetes, colors i valors inicials (store.votos)
    options: {
      responsive: true,
      maintainAspectRatio: false,   // agafa l'alçada del contenidor (50vh)
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }  // vots enters
    }
  })
})
```

- S'ha de fer a `onMounted` perquè abans el `<canvas>` encara no existeix al DOM (`chartCanvas.value` seria `null`).
- `chart.js/auto` registra automàticament tots els tipus de gràfic i escales. És còmode per aprendre; en un projecte gran es poden importar només les peces necessàries per reduir la mida del bundle.
- `chartInstance` és una variable normal (`let`), **no** un `ref`: és un objecte intern de la llibreria i no volem que Vue el faci reactiu (seria més lent i pot provocar errors).

**③ Un `watch` per redibuixar quan canvien els vots**

```js
watch(() => store.votos, (newVotos) => {
  if (chartInstance) {
    chartInstance.data.datasets[0].data = newVotos
    chartInstance.update()
  }
}, { deep: true })
```

`watch` executa una funció cada vegada que una dada reactiva canvia. Aquí és imprescindible:

- Quan arriba un missatge pel WebSocket, `setVotos()` fa `votos.value = nousVots`: **substitueix l'array sencer**. El gràfic s'havia creat amb una referència a l'array **antic**, així que no s'assabentaria del canvi per si sol.
- El `watch` vigila `store.votos` (amb una funció *getter*, `() => store.votos`), i quan canvia posa l'array nou al *dataset* i crida `chartInstance.update()`, que és la manera de dir-li a Chart.js "torna't a dibuixar".
- `deep: true` fa que també es detectin canvis **dins** de l'array (per exemple `votos[2]++`), no només la substitució.

> **Idea clau:** amb components de Vue, la reactivitat repinta la interfície sola. Amb llibreries externes (gràfics, mapes, editors…) cal **crear-les a `onMounted`** i **sincronitzar-les amb `watch`**. És un patró que es repeteix molt.

---

## 8. Docker Compose

Hi ha dues configuracions, cadascuna amb el seu compose i els seus Dockerfiles:

| | Desenvolupament | Producció |
|---|---|---|
| Compose | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Dockerfiles | `frontend/Dockerfile.dev`, `backend/Dockerfile.dev` | `frontend/Dockerfile.prod`, `backend/Dockerfile.prod` |
| Frontend | Servidor de Vite (`npm run dev`), port 8080 | Build estàtic servit per **nginx**, port 80 |
| Backend | Port 3000 exposat | Només accessible des de nginx (xarxa interna) |
| Codi | Muntat com a volum → *hot reload* | Copiat dins la imatge |
| URL del WebSocket | `ws://localhost:3000` (`.env.development`) | `ws(s)://<host>/ws` (proxy de nginx) |
| Vots | `backend/votos.json` local | Volum `votos-data` |

```bash
docker compose -f docker-compose.dev.yml up --build          # desenvolupament
docker compose -f docker-compose.prod.yml up --build -d      # producció
```

### Desenvolupament

Dos serveis, `frontend` (port 8080) i `backend` (port 3000). Els volums munten el codi local dins del contenidor perquè els canvis es vegin en viu (*hot reload*); el volum anònim de `node_modules` evita que el de la màquina local el sobreescrigui.

### Producció

- **`frontend/Dockerfile.prod`** és un *multi-stage build*:
  ```dockerfile
  FROM node:22-alpine AS build       # Etapa 1: compilar
  RUN npm ci && npm run build        #   → genera dist/
  FROM nginx:1.27-alpine             # Etapa 2: servir
  COPY --from=build /usr/src/app/dist /usr/share/nginx/html
  ```
  La imatge final només conté nginx i els fitxers estàtics: ni Node, ni `node_modules`, ni el codi font.
- **`frontend/nginx.conf`**:
  - serveix la SPA: qualsevol ruta desconeguda (per exemple `/votacions` en recarregar la pàgina) torna `index.html`, perquè Vue Router amb `createWebHistory` pugui gestionar-la;
  - fa de **proxy** de `/ws` cap al servei `backend` (amb les capçaleres `Upgrade`/`Connection` que necessita un WebSocket). Així només s'exposa un port i no hi ha problemes de CORS ni de ports diferents.
- **`backend/Dockerfile.prod`** instal·la només dependències de producció (`npm ci --omit=dev`, sense nodemon) i s'executa amb l'usuari `node`, sense privilegis de root.
- Els vots es guarden en un **volum** (`votos-data`, ruta indicada amb la variable `VOTOS_FILE`) perquè no es perdin en recrear el contenidor.
- Els fitxers **`.dockerignore`** eviten copiar `node_modules` i altres fitxers locals dins de la imatge.

---

## Idees per ampliar (exercicis)

- Utilitzar una **guarda de navegació** (`router.beforeEach`) en lloc de comprovar el login dins de la vista.
- Evitar el reintent automàtic quan es tanca la connexió **voluntàriament** (ara `onclose` sempre reconnecta, fins i tot després de `disconnect()`).
- Mostrar el nom i la imatge de l'usuari (ja estan al store) a la capçalera.
- Limitar a un vot per usuari.
- Destruir el gràfic quan es desmunta el component (`onUnmounted(() => chartInstance.destroy())`) per alliberar memòria.
- Les etiquetes `'Opció 1'…'Opció 4'` estan repetides a `VotacionsScreen` i `ChartComponent`: moure-les al store o passar-les com a **prop** al gràfic.
- Fer que `ChartComponent` rebi les dades per **props** en lloc de llegir el store, i comparar els dos enfocaments.
- Afegir un selector per canviar el tipus de gràfic (`bar`, `pie`, `doughnut`).

## Tecnologies

Vue 3 · Pinia · Vue Router · Vuetify · Chart.js · Vite · Node.js · `ws` · Docker · nginx
