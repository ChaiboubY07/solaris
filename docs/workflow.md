# M1 — 3D Solar System

Pour l’instant, on construit le terrain de jeu.

## 🎯 Definition of Done

À la fin de M1, un utilisateur doit pouvoir :

```text
Open Solaris
    ↓
See the Solar System
    ↓
Rotate / zoom / move the camera
    ↓
See all 8 planets orbiting the Sun
    ↓
Click a planet
    ↓
Focus the camera on it
    ↓
See its name
    ↓
Return to the full Solar System
```

## 🌞 Le système solaire

On affiche :

- Sun
- Mercury
- Venus
- Earth
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune

Avec :

- Orbital movement
- Planet rotation
- Orbital paths
- Correct relative order
- Approximate relative sizes
- Recognizable colors/textures

> **Important :** on ne cherche pas encore une simulation astronomique parfaite.
>
> Si on respecte les vraies distances à l’échelle, Neptune sera tellement loin que l’utilisateur pensera que l’application est cassée. 😄
>
> On utilisera donc une **visual scale** adaptée à l’expérience.

## 🎥 Camera

La caméra doit permettre de :

- Orbit around the Solar System
- Zoom in/out
- Smooth movement
- Focus on a planet
- Return to overview

### Interaction

| Action | Interaction |
|---|---|
| Rotation | Mouse drag |
| Zoom | Scroll |
| Focus | Click planet |
| Retour à la vue d’ensemble | Escape |

Sur mobile, on adaptera plus tard.

## 🪐 Planet Interaction

Lorsqu’un utilisateur survole une planète :

```text
       Mars
        ●
    ┌─────────┐
    │  Mars   │
    └─────────┘
```

Lorsqu’il clique :

```text
Solar System
      ↓
Camera transition
      ↓
Mars centered
      ↓
Mars information
```

Pour M1, l’information peut simplement être :

```text
MARS

The Red Planet

[ Explore ]
```

Le bouton **Explore** sera réellement utile en M2.

## 🧱 Structure technique

Je partirais sur :

```text
Angular
│
├── App
│
├── SolarSystem
│   ├── Scene
│   ├── Camera
│   ├── Lighting
│   ├── Sun
│   ├── Planet
│   └── Orbit
│
└── UI
    ├── PlanetLabel
    └── PlanetInfo
```

### Structure Three.js

```text
Scene
 ├── Sun
 ├── Mercury
 ├── Venus
 ├── Earth
 ├── Mars
 ├── Jupiter
 ├── Saturn
 ├── Uranus
 └── Neptune
```

Chaque planète devrait être générée à partir de données plutôt que codée individuellement.

Par exemple, conceptuellement :

```js
{
  name: 'Mars',
  radius: ...,
  distance: ...,
  orbitSpeed: ...,
  rotationSpeed: ...,
  texture: ...
}
```

Cela nous évitera d’avoir :

```js
createMars()
createEarth()
createVenus()
// ...
```