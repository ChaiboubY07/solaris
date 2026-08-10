export interface CelestialBodyInfo {
  id: string;
  name: string;
  nameFr: string;
  type: string;
  tagline: string;
  distanceFromSun: string;
  diameter: string;
  rotationPeriod: string;
  orbitalPeriod: string;
  moonsCount: number;
  temperature: string;
  mass: string;
  description: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number; // orbital angular velocity multiplier
  rotationSpeed: number; // self rotation velocity multiplier
  tilt: number; // axial tilt in radians
  eccentricity?: number;
  hasRings?: boolean;
}

export interface PlanetMarker {
  id: string;
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}
