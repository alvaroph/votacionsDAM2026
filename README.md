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
| 9 | Execució amb **Docker Compose** | `docker-compose.yml` |

---

## Estructura del projecte

```
votacionsDAM/
├── docker-compose.yml          # Aixeca frontend (8080) i backend (3000)
├── backend/                    # Servidor WebSocket (Node.js)
│   ├── server.js
│   ├── votos.json              # Persistència dels vots
│   └── Dockerfile
└── frontend/                   # Aplicació Vue 3 (Vite + Vuetify)
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
            └── botoVotar.vue
```

**Convenció:** les carpetes `views/` contenen pantalles completes associades a una ruta; `components/` conté peces reutilitzables sense coneixement del router ni de la xarxa.

---

## Com executar-ho

### Amb Docker (recomanat)

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend (WebSocket): `ws://localhost:3000`

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
onMounted(()   => { wsService = new WebSocketService('ws://localhost:3000'); wsService.connect() })
onUnmounted(() => { wsService.disconnect() })
```

Així la connexió només existeix mentre l'usuari és a la pantalla de votacions.

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
 └──────────────────────────────────────────────────────────┘        └─────────────────┘
```

1. L'usuari clica **Votar** → el fill fa `emit('votar', id)`.
2. El pare rep l'event a `gestioVot(id)`.
3. `gestioVot` crida `wsService.sendVote(id)`, que envia `{"vote": id}` pel WebSocket.
4. El servidor incrementa el comptador, el desa i envia l'array nou a tots els clients.
5. `onmessage` rep l'array i crida `store.setVotos(data)`.
6. Com que `store.votos` és un `ref` **reactiu**, Vue detecta el canvi.
7. `VotacionsScreen` passa `store.votos[index]` com a prop `voteCount` i cada `botoVotar` es repinta sol.

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

## 7. Docker Compose

`docker-compose.yml` defineix dos serveis, `frontend` (port 8080) i `backend` (port 3000). Els volums munten el codi local dins del contenidor perquè els canvis es vegin en viu (*hot reload*); el volum anònim de `node_modules` evita que el de la màquina local el sobreescrigui.

---

## Idees per ampliar (exercicis)

- Utilitzar una **guarda de navegació** (`router.beforeEach`) en lloc de comprovar el login dins de la vista.
- Evitar el reintent automàtic quan es tanca la connexió **voluntàriament** (ara `onclose` sempre reconnecta, fins i tot després de `disconnect()`).
- Mostrar el nom i la imatge de l'usuari (ja estan al store) a la capçalera.
- Limitar a un vot per usuari.
- Moure la URL del WebSocket a una variable d'entorn de Vite (`import.meta.env`).
- Afegir un gràfic de barres amb els resultats.

## Tecnologies

Vue 3 · Pinia · Vue Router · Vuetify · Vite · Node.js · `ws` · Docker
