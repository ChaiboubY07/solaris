import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  afterNextRender,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { CelestialBodyInfo, PlanetMarker } from '../../models/celestial-body.model';
import { SOLAR_SYSTEM_DATA } from '../../data/solar-system.data';
import { TextureGenerator } from '../../utils/texture-generator';

interface MoonData {
  mesh: THREE.Mesh;
  pivot: THREE.Object3D;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  angle: number;
}

interface PlanetMeshEntry {
  info: CelestialBodyInfo;
  mesh: THREE.Mesh;
  pivot: THREE.Object3D;
  orbitLine: THREE.LineLoop;
  cloudMesh?: THREE.Mesh;
  atmoGlowMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  moons: MoonData[];
  currentAngle: number;
}

@Component({
  selector: 'app-solar-system',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solar-system.html',
  styleUrl: './solar-system.scss',
})
export class SolarSystem implements OnDestroy {
  @ViewChild('canvasContainer', { static: true })
  private canvasContainer!: ElementRef<HTMLDivElement>;

  // Data & State Signals
  readonly celestialData = SOLAR_SYSTEM_DATA;
  readonly selectedBody = signal<CelestialBodyInfo | null>(null);
  readonly focusedBodyId = signal<string | null>(null);

  // Control options
  readonly simulationSpeed = signal<number>(1.0);
  readonly isPaused = signal<boolean>(false);
  readonly showOrbits = signal<boolean>(true);
  readonly showLabels = signal<boolean>(true);
  readonly showAsteroids = signal<boolean>(true);
  readonly isMuted = signal<boolean>(true);

  // 2D floating canvas markers
  readonly planetMarkers = signal<PlanetMarker[]>([]);

  // Three.js Core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  // Scene Objects
  private sunMesh!: THREE.Mesh;
  private sunGlowSprite!: THREE.Sprite;
  private sunLight!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private fillLight!: THREE.DirectionalLight;
  private planetEntries: PlanetMeshEntry[] = [];
  private asteroidInstancedMesh?: THREE.InstancedMesh;
  private starfieldPoints!: THREE.Points;
  private nebulaPoints!: THREE.Points;

  // Web Audio Context for space ambience & sound FX
  private audioCtx?: AudioContext;
  private ambienceOsc?: OscillatorNode;
  private ambienceGain?: GainNode;

  // Interaction & Animation
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationFrameId?: number;

  // Camera lerp targets
  private isCameraLerping = false;
  private targetCameraPos = new THREE.Vector3();
  private targetLookAtPos = new THREE.Vector3();
  private defaultCameraPos = new THREE.Vector3(0, 50, 140);
  private defaultLookAtPos = new THREE.Vector3(0, 0, 0);

  constructor() {
    afterNextRender(() => {
      this.initThreeJS();
    });
  }

  private initThreeJS(): void {
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03060c);
    this.scene.fog = new THREE.FogExp2(0x03060c, 0.0006);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2500);
    this.camera.position.copy(this.defaultCameraPos);

    // 3. Renderer with ACES ToneMapping & soft shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 700;
    this.controls.minDistance = 4;
    this.controls.target.copy(this.defaultLookAtPos);

    // 5. Build Scene Lighting & Objects
    this.buildLighting();
    this.buildStarfieldAndNebula();
    this.buildSun();
    this.buildPlanets();
    this.buildAsteroidBelt();

    // Select Sun by default
    this.selectBody(this.celestialData[0]);

    // 6. Start Loop
    this.animate();
  }

  /**
   * Lighting system overhaul:
   * Sun PointLight + Rich Ambient + Hemisphere Light + Camera Fill Light
   * Ensures the dark side of planets is fully visible and rich in detail!
   */
  private buildLighting(): void {
    // Elevated ambient fill for dark side visibility
    this.ambientLight = new THREE.AmbientLight(0x405575, 1.2);
    this.scene.add(this.ambientLight);

    // Sky/Ground contrast hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xd0e0ff, 0x111625, 0.8);
    this.scene.add(this.hemiLight);

    // Soft camera-side fill light for specular highlights on unlit faces
    this.fillLight = new THREE.DirectionalLight(0x80a0d0, 0.6);
    this.fillLight.position.set(0, 50, 100);
    this.scene.add(this.fillLight);

    // Intense central Sun Light casting real shadows
    this.sunLight = new THREE.PointLight(0xfff5e6, 4.5, 1200, 0.35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 600;
    this.scene.add(this.sunLight);
  }

  /**
   * Deep space multi-colored starfield & nebula cloud
   */
  private buildStarfieldAndNebula(): void {
    const starCount = 10000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = radius * Math.cos(phi);

      const colorType = Math.random();
      if (colorType > 0.85) {
        starCols[i * 3] = 0.6; starCols[i * 3 + 1] = 0.8; starCols[i * 3 + 2] = 1.0; // Blue star
      } else if (colorType > 0.7) {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 0.85; starCols[i * 3 + 2] = 0.5; // Gold star
      } else if (colorType > 0.6) {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 0.6; starCols[i * 3 + 2] = 0.5; // Red star
      } else {
        starCols[i * 3] = 0.95; starCols[i * 3 + 1] = 0.95; starCols[i * 3 + 2] = 1.0; // White star
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.starfieldPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfieldPoints);

    // Deep cosmic nebula particles
    const nebulaCount = 1500;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaCols = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      const r = 400 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.7;

      nebulaPos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      nebulaPos[i * 3 + 1] = r * Math.sin(phi);
      nebulaPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);

      nebulaCols[i * 3] = 0.15 + Math.random() * 0.35;
      nebulaCols[i * 3 + 1] = 0.1 + Math.random() * 0.25;
      nebulaCols[i * 3 + 2] = 0.55 + Math.random() * 0.45;
    }

    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaCols, 3));

    const nebulaMat = new THREE.PointsMaterial({
      size: 7.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    this.nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
    this.scene.add(this.nebulaPoints);
  }

  /**
   * Sun mesh & intense multi-layered flare
   */
  private buildSun(): void {
    const sunData = this.celestialData.find((d) => d.id === 'sun')!;
    const geometry = new THREE.SphereGeometry(sunData.size, 64, 64);

    const sunTexture = TextureGenerator.createSunTexture();
    const material = new THREE.MeshBasicMaterial({
      map: sunTexture,
    });

    this.sunMesh = new THREE.Mesh(geometry, material);
    this.sunMesh.userData = { id: 'sun', info: sunData };
    this.scene.add(this.sunMesh);

    // Sun Corona Glow Sprite
    const glowTexture = TextureGenerator.createSunGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffbb33,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });

    this.sunGlowSprite = new THREE.Sprite(glowMaterial);
    const scale = sunData.size * 3.8;
    this.sunGlowSprite.scale.set(scale, scale, 1);
    this.sunMesh.add(this.sunGlowSprite);
  }

  /**
   * Create atmospheric glow shell around planet
   */
  private createAtmosphereGlow(
    radius: number,
    colorHex: number
  ): THREE.Mesh {
    const glowGeo = new THREE.SphereGeometry(radius * 1.08, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(glowGeo, glowMat);
  }

  /**
   * Build all 8 planets with rich materials & atmospheric glow shells
   */
  private buildPlanets(): void {
    const planetInfos = this.celestialData.filter((d) => d.id !== 'sun');

    planetInfos.forEach((info) => {
      // 1. Pivot for orbital revolution
      const pivot = new THREE.Object3D();
      this.scene.add(pivot);

      // 2. Orbit line
      const orbitGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(theta) * info.orbitRadius,
            0,
            Math.sin(theta) * info.orbitRadius
          )
        );
      }
      orbitGeo.setFromPoints(points);

      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x5a7d9f,
        transparent: true,
        opacity: 0.45,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      this.scene.add(orbitLine);

      // 3. Planet Mesh & Material
      const planetGeo = new THREE.SphereGeometry(info.size, 64, 64);
      let planetMat: THREE.Material;

      if (info.id === 'earth') {
        const earthTex = TextureGenerator.createEarthTexture();
        const specTex = TextureGenerator.createEarthSpecularTexture();
        planetMat = new THREE.MeshPhongMaterial({
          map: earthTex,
          specularMap: specTex,
          specular: new THREE.Color(0x555555),
          shininess: 25,
          emissive: new THREE.Color(0x050d1a),
        });
      } else {
        const texture = this.getTextureForPlanet(info.id);
        planetMat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.55,
          metalness: 0.08,
          emissive: new THREE.Color(0x0a0c14),
        });
      }

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.castShadow = true;
      planetMesh.receiveShadow = true;
      planetMesh.rotation.z = info.tilt;
      planetMesh.userData = { id: info.id, info: info };

      const initialAngle = Math.random() * Math.PI * 2;
      planetMesh.position.set(
        Math.cos(initialAngle) * info.orbitRadius,
        0,
        Math.sin(initialAngle) * info.orbitRadius
      );
      pivot.add(planetMesh);

      // Special attachments & Atmospheric Glows
      let cloudMesh: THREE.Mesh | undefined;
      let atmoGlowMesh: THREE.Mesh | undefined;
      let ringMesh: THREE.Mesh | undefined;
      const moons: MoonData[] = [];

      // Earth clouds, atmosphere glow & Moon
      if (info.id === 'earth') {
        // Clouds
        const cloudGeo = new THREE.SphereGeometry(info.size * 1.025, 64, 64);
        const cloudTex = TextureGenerator.createEarthCloudTexture();
        const cloudMat = new THREE.MeshPhongMaterial({
          map: cloudTex,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        planetMesh.add(cloudMesh);

        // Cyan blue atmosphere glow shell
        atmoGlowMesh = this.createAtmosphereGlow(info.size, 0x38bdf8);
        planetMesh.add(atmoGlowMesh);

        // Moon
        const moonGeo = new THREE.SphereGeometry(0.48, 32, 32);
        const moonTex = TextureGenerator.createMoonTexture();
        const moonMat = new THREE.MeshStandardMaterial({
          map: moonTex,
          roughness: 0.85,
          emissive: new THREE.Color(0x111111),
        });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.castShadow = true;
        moonMesh.receiveShadow = true;

        const moonPivot = new THREE.Object3D();
        planetMesh.add(moonPivot);
        moonMesh.position.set(3.4, 0, 0);
        moonPivot.add(moonMesh);

        moons.push({
          mesh: moonMesh,
          pivot: moonPivot,
          orbitRadius: 3.4,
          orbitSpeed: 0.04,
          rotationSpeed: 0.01,
          angle: 0,
        });
      }

      // Venus atmosphere glow
      if (info.id === 'venus') {
        atmoGlowMesh = this.createAtmosphereGlow(info.size, 0xeab308);
        planetMesh.add(atmoGlowMesh);
      }

      // Mars atmosphere glow
      if (info.id === 'mars') {
        atmoGlowMesh = this.createAtmosphereGlow(info.size, 0xef4444);
        planetMesh.add(atmoGlowMesh);
      }

      // Saturn Rings & Titan Moon
      if (info.id === 'saturn') {
        const ringInner = info.size * 1.35;
        const ringOuter = info.size * 2.6;
        const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);

        const pos = ringGeo.attributes['position'];
        const uv = ringGeo.attributes['uv'];
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const radius = Math.sqrt(x * x + y * y);
          const normU = (radius - ringInner) / (ringOuter - ringInner);
          uv.setXY(i, normU, 0.5);
        }

        const ringTex = TextureGenerator.createSaturnRingTexture();
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          roughness: 0.4,
        });

        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.receiveShadow = true;
        ringMesh.castShadow = true;
        planetMesh.add(ringMesh);

        // Titan Moon
        const titanGeo = new THREE.SphereGeometry(0.52, 32, 32);
        const titanMat = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          roughness: 0.7,
          emissive: new THREE.Color(0x221a00),
        });
        const titanMesh = new THREE.Mesh(titanGeo, titanMat);
        const titanPivot = new THREE.Object3D();
        planetMesh.add(titanPivot);
        titanMesh.position.set(7.8, 0, 0);
        titanPivot.add(titanMesh);

        moons.push({
          mesh: titanMesh,
          pivot: titanPivot,
          orbitRadius: 7.8,
          orbitSpeed: 0.02,
          rotationSpeed: 0.01,
          angle: 0,
        });
      }

      // Uranus vertical rings & cyan glow
      if (info.id === 'uranus') {
        const ringInner = info.size * 1.3;
        const ringOuter = info.size * 1.85;
        const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);
        const ringTex = TextureGenerator.createUranusRingTexture();
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        planetMesh.add(ringMesh);

        atmoGlowMesh = this.createAtmosphereGlow(info.size, 0x06b6d4);
        planetMesh.add(atmoGlowMesh);
      }

      // Neptune atmosphere glow
      if (info.id === 'neptune') {
        atmoGlowMesh = this.createAtmosphereGlow(info.size, 0x3b82f6);
        planetMesh.add(atmoGlowMesh);
      }

      this.planetEntries.push({
        info,
        mesh: planetMesh,
        pivot,
        orbitLine,
        cloudMesh,
        atmoGlowMesh,
        ringMesh,
        moons,
        currentAngle: initialAngle,
      });
    });
  }

  private getTextureForPlanet(id: string): THREE.CanvasTexture {
    switch (id) {
      case 'mercury': return TextureGenerator.createMercuryTexture();
      case 'venus': return TextureGenerator.createVenusTexture();
      case 'mars': return TextureGenerator.createMarsTexture();
      case 'jupiter': return TextureGenerator.createJupiterTexture();
      case 'saturn': return TextureGenerator.createSaturnTexture();
      case 'uranus': return TextureGenerator.createUranusTexture();
      case 'neptune': return TextureGenerator.createNeptuneTexture();
      default: return TextureGenerator.createMercuryTexture();
    }
  }

  /**
   * Instanced Asteroid Belt
   */
  private buildAsteroidBelt(): void {
    const asteroidCount = 2000;
    const geometry = new THREE.DodecahedronGeometry(0.38, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x948e85,
      roughness: 0.85,
      metalness: 0.15,
    });

    this.asteroidInstancedMesh = new THREE.InstancedMesh(geometry, material, asteroidCount);
    const dummy = new THREE.Object3D();

    const minRadius = 52;
    const maxRadius = 59;

    for (let i = 0; i < asteroidCount; i++) {
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 3.8;

      dummy.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      const scale = 0.4 + Math.random() * 1.3;
      dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.5), scale);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      dummy.updateMatrix();
      this.asteroidInstancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.asteroidInstancedMesh.instanceMatrix.needsUpdate = true;
    this.asteroidInstancedMesh.castShadow = true;
    this.scene.add(this.asteroidInstancedMesh);
  }

  /**
   * Main WebGL Animation Loop
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const speed = this.simulationSpeed();
    const paused = this.isPaused();

    // 1. Sun Self-Rotation & Pulsing Glow
    if (this.sunMesh) {
      this.sunMesh.rotation.y += 0.0015;
    }

    // 2. Planets Revolution & Self-Rotation
    this.planetEntries.forEach((entry) => {
      if (!paused) {
        entry.currentAngle += entry.info.orbitSpeed * 0.4 * speed;
        entry.mesh.position.x = Math.cos(entry.currentAngle) * entry.info.orbitRadius;
        entry.mesh.position.z = Math.sin(entry.currentAngle) * entry.info.orbitRadius;

        entry.mesh.rotation.y += entry.info.rotationSpeed * 0.5 * speed;

        if (entry.cloudMesh) {
          entry.cloudMesh.rotation.y += 0.002 * speed;
        }

        entry.moons.forEach((moon) => {
          moon.angle += moon.orbitSpeed * speed;
          moon.mesh.position.x = Math.cos(moon.angle) * moon.orbitRadius;
          moon.mesh.position.z = Math.sin(moon.angle) * moon.orbitRadius;
          moon.mesh.rotation.y += moon.rotationSpeed * speed;
        });
      }

      entry.orbitLine.visible = this.showOrbits();
    });

    // 3. Asteroid belt
    if (this.asteroidInstancedMesh && !paused) {
      this.asteroidInstancedMesh.rotation.y += 0.0003 * speed;
      this.asteroidInstancedMesh.visible = this.showAsteroids();
    }

    // 4. Update Camera Lerp & Directional Fill Light position to match camera view
    this.updateCameraTracking();

    if (this.fillLight) {
      this.fillLight.position.copy(this.camera.position);
    }

    // 5. Update 2D Canvas Markers positions
    if (this.showLabels()) {
      this.updatePlanetMarkers();
    } else {
      this.planetMarkers.set([]);
    }

    // 6. Render
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Smooth Camera Tracking & Smooth Lerp
   */
  private updateCameraTracking(): void {
    const focusedId = this.focusedBodyId();

    if (focusedId) {
      let targetWorldPos = new THREE.Vector3();
      let bodySize = 5;

      if (focusedId === 'sun') {
        targetWorldPos.set(0, 0, 0);
        bodySize = 9;
      } else {
        const entry = this.planetEntries.find((e) => e.info.id === focusedId);
        if (entry) {
          entry.mesh.getWorldPosition(targetWorldPos);
          bodySize = entry.info.size;
        }
      }

      const cameraOffset = new THREE.Vector3(
        bodySize * 3.5,
        bodySize * 1.8,
        bodySize * 4.0
      );

      this.targetLookAtPos.copy(targetWorldPos);
      this.targetCameraPos.copy(targetWorldPos).add(cameraOffset);

      if (this.isCameraLerping) {
        this.camera.position.lerp(this.targetCameraPos, 0.06);
        this.controls.target.lerp(this.targetLookAtPos, 0.06);

        if (
          this.camera.position.distanceTo(this.targetCameraPos) < 0.2 &&
          this.controls.target.distanceTo(this.targetLookAtPos) < 0.1
        ) {
          this.isCameraLerping = false;
        }
      } else {
        this.controls.target.copy(targetWorldPos);
      }
    } else if (this.isCameraLerping) {
      this.camera.position.lerp(this.defaultCameraPos, 0.05);
      this.controls.target.lerp(this.defaultLookAtPos, 0.05);

      if (
        this.camera.position.distanceTo(this.defaultCameraPos) < 0.5 &&
        this.controls.target.distanceTo(this.defaultLookAtPos) < 0.2
      ) {
        this.isCameraLerping = false;
      }
    }
  }

  /**
   * Floating markers calculation
   */
  private updatePlanetMarkers(): void {
    const markers: PlanetMarker[] = [];
    const tempVec = new THREE.Vector3();
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (this.sunMesh) {
      tempVec.set(0, 0, 0);
      tempVec.project(this.camera);
      if (tempVec.z < 1) {
        markers.push({
          id: 'sun',
          name: 'Soleil',
          screenX: ((tempVec.x + 1) * width) / 2,
          screenY: ((-tempVec.y + 1) * height) / 2,
          visible: true,
        });
      }
    }

    this.planetEntries.forEach((entry) => {
      entry.mesh.getWorldPosition(tempVec);
      tempVec.y += entry.info.size + 1.2;
      tempVec.project(this.camera);

      if (tempVec.z < 1) {
        markers.push({
          id: entry.info.id,
          name: entry.info.nameFr,
          screenX: ((tempVec.x + 1) * width) / 2,
          screenY: ((-tempVec.y + 1) * height) / 2,
          visible: true,
        });
      }
    });

    this.planetMarkers.set(markers);
  }

  /**
   * Sound effect trigger using Web Audio API
   */
  private playClickSound(): void {
    if (this.isMuted()) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch {
      // Audio context fallback
    }
  }

  selectBody(body: CelestialBodyInfo): void {
    this.playClickSound();
    this.selectedBody.set(body);
    this.focusedBodyId.set(body.id);
    this.isCameraLerping = true;
  }

  resetCamera(): void {
    this.playClickSound();
    this.focusedBodyId.set(null);
    this.selectedBody.set(this.celestialData[0]);
    this.isCameraLerping = true;
  }

  onCanvasClick(event: MouseEvent): void {
    const container = this.canvasContainer.nativeElement;
    const rect = container.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickableMeshes: THREE.Mesh[] = [this.sunMesh];
    this.planetEntries.forEach((e) => clickableMeshes.push(e.mesh));

    const intersects = this.raycaster.intersectObjects(clickableMeshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      if (clickedMesh.userData && clickedMesh.userData['info']) {
        const info = clickedMesh.userData['info'] as CelestialBodyInfo;
        this.selectBody(info);
      }
    }
  }

  toggleAudio(): void {
    this.isMuted.update((v) => !v);
  }

  togglePause(): void {
    this.playClickSound();
    this.isPaused.update((v) => !v);
  }

  toggleOrbits(): void {
    this.playClickSound();
    this.showOrbits.update((v) => !v);
  }

  toggleLabels(): void {
    this.playClickSound();
    this.showLabels.update((v) => !v);
  }

  toggleAsteroids(): void {
    this.playClickSound();
    this.showAsteroids.update((v) => !v);
  }

  setSpeed(speed: number): void {
    this.simulationSpeed.set(speed);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.canvasContainer || !this.renderer || !this.camera) return;
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer?.dispose();
    this.audioCtx?.close();
  }
}