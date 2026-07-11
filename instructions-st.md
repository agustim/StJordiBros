# Especificació Tècnica: La Llegenda de Sant Jordi — Nivell 1-1

## Visió General del Projecte

**Objectiu:** Crear una recreació funcional, per a navegador, del primer nivell d'un joc de plataformes ambientat en la llegenda de Sant Jordi.

**Llenguatge:** JavaScript (HTML5 Canvas).

**Art:** Rectangles de colors (placeholders) o sprite sheets senzills si n'hi ha.

---

## 1. Mecàniques Bàsiques i Física

### Moviment
Implementar acceleració horitzontal, fricció i gravetat.

- **Gravetat:** `0.5 píxels/frame²`
- **Força de salt:** `-10 píxels/frame`
- **Multi-salt:** 5 nivells

### Detecció de Col·lisions
Implementar col·lisions AABB (Axis-Aligned Bounding Box) per a:

- **Blocs sòlids:** Terra, torres de castell i murs de pedra.
- **De baix cap amunt:** Sant Jordi colpeja un mur de pedra (rebota o es trenca).
- **De dalt cap avall:** Sant Jordi aterra sobre un enemic (l'enemic mor).
- **Lateral:** Sant Jordi toca un enemic (rep dany o mor).

---

## 2. Requisits de les Entitats

### Jugador (Sant Jordi)
- **Estats:** Escuder (petit), Cavaller amb armadura (després de la Rosa), Mort.
- **Accions:** Caminar, Córrer (tecla Shift), Saltar, Ajupir-se.

### Enemics
- **Dragonet:** Es mou cap a l'esquerra a velocitat constant. Si toca una paret, inverteix la direcció. S'aixafa si li saltes a sobre.
- **Drac cuirassat (opcional):** Es mou cap a l'esquerra; s'amaga dins la closca d'escates quan li saltes a sobre.

### Objectes Interactius
- **Llibres màgics (blocs ?):** Contenen o bé una Rosa d'or (suma punts) o bé una Rosa vermella (es mou i converteix Sant Jordi en Cavaller amb armadura).
- **Murs de pedra:** Es poden colpejar (Escuder) o destruir (Cavaller amb armadura).
- **Torres de castell:** Obstacles sòlids estàtics.

---

## 3. Disseny del Nivell (El Camí de Montblanc)

El nivell ha de seguir la seqüència clàssica d'introducció:

1. **Inici:** Camí lliure durant 10 unitats.
2. **Primer encontre:** Un únic Dragonet que s'apropa.
3. **Els murs:** Una filera de quatre blocs: `[Mur] [Llibre ?] [Mur] [Llibre ?]`.
4. **La torre:** Una torre de castell que cal saltar.
5. **El poder amagat:** Un llibre màgic que conté una Rosa vermella.
6. **La cova del drac:** Un forat al terra que provoca un "Game Over" immediat si hi caus.

---

## 4. Condicions de Victòria i Derrota

### Mort
- Tocar un enemic sent Escuder.
- Caure a la cova del drac.
- Que el temporitzador arribi a 0.

### Victòria
- Alliberar la Princesa lligada a l'estaca al final del nivell (tocar-la).
- La puntuació es calcula segons el temps restant.

---

## 5. Interfície (UI)

- **HUD:** Mostrar Puntuació, Roses recollides, Món (Montblanc 1-1) i Temps.

---

## Instruccions d'Implementació per a la IA

1. **Fase 1:** Configurar el game loop i la física bàsica (gravetat/col·lisió amb el terra).
2. **Fase 2:** Implementar el moviment de Sant Jordi i la càmera que el segueix.
3. **Fase 3:** Generar el mapa del nivell amb un array 2D o sistema de tilemap.
4. **Fase 4:** Afegir la IA del Dragonet i la lògica d'aixafar-lo per col·lisió.
5. **Fase 5:** Afegir la Princesa i l'estat de victòria.
