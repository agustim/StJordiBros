# La Llegenda de Sant Jordi — Platformer Game

> **Montblanc 1-1** i més enllà: un joc de plataformes procedural en JavaScript (HTML5 Canvas) basat en la llegenda de Sant Jordi.

Joc funcional al 100% en **navegador d'escriptori i mòbil** (amb controls tàctils). Sense llibreries externes — JavaScript pur + Canvas API + Web Audio API.

---

## 📖 Concepte

Tres personatges jugables (Princesa, Sant Jordi, Drac) que canvien sobre la marxa amb la tecla **C**. Cada un té:
- Sprites i mides únics
- Text de victòria diferent
- Atac ranged propi (desbloquejable)
- Ultimata exclusiva (desbloquejable)

L'objectiu de cada nivell és arribar al **target de rescat** (tile 5) al final del mapa, superant enemics, forats i obstacles. Els llibres (📖) col·leccionables donen punts o power-ups.

---

## 🎮 Controls

| Acció | Teclat | Tàctil |
|-------|--------|--------|
| Moure esquerra/dreta | `← →` / `A D` | ◀ ▶ |
| Saltar (multi-salt: 5) | `Space` / `↑` / `W` | 🦘 |
| Córrer (sprint) | `Shift` | ⚡ |
| Canviar personatge | `C` | C |
| Atac a distància | `X` | ⚔️ |
| Ultimata (1/nivell) | `Z` | ★ |
| Reiniciar nivell | `R` | Tocar pantalla |
| Següent nivell | `Enter` (en victòria) | — |
| Codi de desbloqueig | `O` | — |

**Mòbil:** Els botons tàctils apareixen automàticament en dispositius tàctils. D-pad a l'esquerra, accions a la dreta.

---

## 👤 Personatges

| Personatge | Petit | Gran | Atac ranged | Ultimata |
|-----------|-------|------|-------------|----------|
| **Princesa** | Donzella | Guerrera | Dagues (ràpides) | Congela enemics 3s |
| **Sant Jordi** | Escuder | Cavaller | Llances (llargues) | Es fa gran 5s + invulnerable |
| **Drac** | Drac | Drac | Boles de foc (lentes, àrea) | Cremar tots els enemics visibles |

Canvi de personatge en qualsevol moment amb `C` (cooldown de 20 frames). Quan el personatge és "gran", té més vida (2 hits) i pot trencar parets de pedra.

---

## 🧱 Nivells

7 nivells procedurals (cada un genera un mapa diferent cada vegada):

| # | Nom | Enemics | Temps | Codi desbloqueig | Habil. desbloquejada |
|---|-----|---------|-------|-----------------|---------------------|
| 1 | MONTBLANC 1-1 | 2 dragonets | 300s | `MB11` | — |
| 2 | MONTBLANC 1-2 | 4 dragonets | 280s | `MB12` | Atac ranged |
| 3 | CASTELL 2-1 | dragonet + shooter | 300s | `CS21` | Ultimata |
| 4 | MONTBLANC 1-3 | 3 dragonets + shooter | 260s | `MB13` | — |
| 5 | CASTELL 2-2 | dragonet + 2 shooters | 280s | `CS22` | — |
| 6 | MONTSERRAT 3-1 | 3 dragonets + shooter | 300s | `MS31` | — |
| 7 | MONTSERRAT 3-2 | 3 dragonets + 2 shooters | 250s | `MS32` | — |

Els paràmetres de dificultat (`harder`, `veryHard`) fan que els nivells siguin més llargs, amb menys plataformes, forats més amples, torres més altes i més obstàcles.

Les habilitats desbloquejades són **permanents** per a tota la partida (fins i tot si uses un codi per saltar a un nivell avançat).

---

## 👾 Enemics

| Tipus | Descripció | On apareix |
|-------|-----------|------------|
| **Dragonet** | Patrulla horitzontalment, es pot matar saltant a sobre (stomp) | Tots els nivells |
| **Shooter** | Patrulla + dispara projectils al jugador quan està a rang | CASTELL i MONTSERRAT |

Els enemics congelats (ultimata de princesa) no es mouen ni disparen.

---

## 📦 Items i power-ups

| Item | Tile | Efecte |
|------|------|--------|
| Llibre daurat (?) | 4 | 200 punts + 1 llibre col·leccionat |
| Llibre vermell (♥) | 8 | Power-up: et fas GRAN (mida doble, 1 hit extra, pots trencar parets) |

Els llibres només s'activen **colpejant-los des de sota** (cap per amunt), mai pels costats o per sobre.

El tile 5 és el **target de rescat**: canvia de sprite segons el personatge actual (Princesa rescatant Sant Jordi, etc.)

---

## 🎵 Música

Música procedural generada amb Web Audio API:
- **Estil:** Game of Thrones / medieval, en Do menor
- **Instruments:** Cello (sawtooth + lowpass), pizzicato, baix sine, percussió "heartbeat"
- S'inicia automàticament en el primer moviment o salt

---

## 🗂️ Estructura del projecte

```
index.html        → HTML + CSS + botons tàctils (144 línies)
constants.js      → Constants, personatges, config de nivells (154 línies)
music.js          → Motor d'àudio procedural (198 línies)
levelgen.js       → Generador procedural de mapes (153 línies)
game.js           → Lògica del joc, render, input, sistemes (1653 línies)
README.md         → Aquest fitxer
```

**Total:** ~2158 línies de JavaScript, 0 llibreries externes.

---

## 🛠️ Desenvolupament

### Requisits
- Navegador modern (Chrome, Firefox, Safari, Edge)
- Per desenvolupar: qualsevol editor de text

### Com executar
Obre `index.html` directament al navegador. **No cal servidor.**

### Com afegir un nivell
Edita `constants.js` i afegeix una entrada a l'array `LEVELS`:
```js
{
  id: 'nou-nivell',
  name: 'NOU NIVELL',
  time: 300,
  maxEnemies: 4,
  enemies: ['dragonet', 'shooter'],
  spawnRate: 120,
  unlockCode: 'NN01',
  genParams: { harder: true },
  abilitiesUnlocked: [],
}
```

### Com afegir un enemic nou
1. Afegeix la funció `spawnNewEnemy()` a `game.js`
2. Afegeix la IA al bucle d'enemics a `update()`
3. Afegeix el render a `render()`
4. Afegeix el tipus al `enemies` array del nivell

---

## 📝 Notes tècniques

- **Canvas:** 960×480px, escalat responsive amb `aspect-ratio: 2/1` i `container-type: inline-size`
- **Física:** Gravetat 0.5, salt -10, fricció 0.82, 5 salts consecutius
- **Col·lisions:** AABB iteratiu (5 passos), resolució separada X/Y
- **Generació procedural:** 14 habitacions encadenades amb paràmetres aleatoris, sempre jugable (pits ≤5 tiles, plataformes a distància de salt, llibres amb aire sota)
- **Mòbil:** Botons tàctils amb `cqi` units, auto-hidden en no-tàctil

---

## 📄 Llicència

Codi obert. Fet per a propòsits educatius i de demostració.
Basat en la llegenda de Sant Jordi — Montblanc, Catalunya.
