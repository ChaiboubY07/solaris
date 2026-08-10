import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Multi-octave pseudo-perlin noise for realistic natural terrain/clouds
   */
  private static noise2D(x: number, y: number): number {
    const sin1 = Math.sin(x * 12.9898 + y * 78.233);
    const sin2 = Math.sin(x * 37.719 + y * 54.311);
    return ((sin1 * 43758.5453) % 1 + (sin2 * 21981.357) % 1) * 0.5;
  }

  private static addPerlinNoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number = 0.02,
    opacity: number = 0.15
  ) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n1 = this.noise2D(x * scale, y * scale);
        const n2 = this.noise2D(x * scale * 2, y * scale * 2) * 0.5;
        const noiseVal = (n1 + n2 - 0.5) * 255 * opacity;

        data[idx] = Math.min(255, Math.max(0, data[idx] + noiseVal));
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + noiseVal));
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + noiseVal));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Sun Surface Texture (Granulation & Sunspots)
   */
  static createSunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Sun base plasma gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#ff6600');
    grad.addColorStop(0.2, '#ffaa00');
    grad.addColorStop(0.5, '#fff066');
    grad.addColorStop(0.8, '#ff9900');
    grad.addColorStop(1, '#ff5500');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Solar Granulation cells
    ctx.fillStyle = 'rgba(255, 255, 220, 0.25)';
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 35 + 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Solar magnetic sunspots (dark cores + reddish penumbra)
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const rx = Math.random() * 22 + 6;
      const ry = Math.random() * 14 + 4;

      // Penumbra
      ctx.fillStyle = 'rgba(180, 40, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.6, ry * 1.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();

      // Umbra core
      ctx.fillStyle = 'rgba(60, 5, 0, 0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.05, 0.2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Sun Glow Sprite
   */
  static createSunGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 220, 100, 0.85)');
    grad.addColorStop(0.45, 'rgba(255, 130, 20, 0.45)');
    grad.addColorStop(0.7, 'rgba(255, 60, 0, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Mercury: Metallic silver-gray cratered surface with bright ejecta rays
   */
  static createMercuryTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#7a7772';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Darker impact basins (Maria)
    ctx.fillStyle = '#524f4a';
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 80 + 15;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Craters with bright rims & ejecta rays
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 14 + 2;

      // Bright ejecta rays for major craters
      if (r > 8) {
        ctx.strokeStyle = 'rgba(210, 205, 195, 0.3)';
        ctx.lineWidth = 1;
        for (let ray = 0; ray < 8; ray++) {
          const angle = (ray / 8) * Math.PI * 2;
          const rayLen = r * (2 + Math.random() * 3);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * rayLen, y + Math.sin(angle) * rayLen);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#45433e';
      ctx.strokeStyle = '#b0ac9f';
      ctx.lineWidth = Math.max(1, r * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.04, 0.25);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Venus: Swirling sulfuric golden atmospheric haze
   */
  static createVenusTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c79d4c');
    grad.addColorStop(0.25, '#ebd08d');
    grad.addColorStop(0.5, '#d9aa55');
    grad.addColorStop(0.75, '#f5dfa2');
    grad.addColorStop(1, '#b8893d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Swirling atmospheric bands
    ctx.fillStyle = 'rgba(255, 248, 225, 0.35)';
    for (let y = 0; y < canvas.height; y += 6) {
      const wave = Math.sin(y * 0.04) * 60;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2 + wave, y, canvas.width * 0.65, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.03, 0.1);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Earth: Photorealistic blue marble surface (Oceans, detailed continents, ice caps, desert tones)
   */
  static createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Deep ocean base gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, '#0a2e4c');
    oceanGrad.addColorStop(0.5, '#134e7a');
    oceanGrad.addColorStop(1, '#08253e');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Shallow continental shelf water around coastlines
    ctx.fillStyle = '#207ca8';
    const drawCoastalShelf = (cx: number, cy: number, rx: number, ry: number) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw detailed organic continents
    const drawLandmass = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      baseColor: string,
      desertColor: string
    ) => {
      // Shelf first
      drawCoastalShelf(cx, cy, rx, ry);

      // Base Land
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.08) {
        const radX = rx + Math.sin(a * 6) * rx * 0.28 + Math.cos(a * 4) * rx * 0.18;
        const radY = ry + Math.cos(a * 5) * ry * 0.28;
        const x = cx + Math.cos(a) * radX;
        const y = cy + Math.sin(a) * radY;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Desert/mountain interior overlay
      ctx.fillStyle = desertColor;
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.1, cy - ry * 0.1, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // North & South America
    drawLandmass(480, 360, 200, 230, '#2d6e3c', '#8a7742'); // North America
    drawLandmass(600, 700, 160, 250, '#236132', '#6b7a3d'); // South America

    // Eurasia & Africa
    drawLandmass(1200, 320, 340, 210, '#36733f', '#968147'); // Eurasia
    drawLandmass(1140, 620, 190, 240, '#667d3b', '#b39542'); // Africa (Sahara)
    drawLandmass(1600, 420, 240, 180, '#286334', '#7d7041'); // Asia

    // Australia & Indonesia
    drawLandmass(1700, 740, 120, 100, '#a67c3b', '#c2964a'); // Australia
    drawLandmass(1480, 600, 75, 50, '#255e31', '#4d6932'); // Indonesia

    // Polar Ice Caps (Arctic & Antarctica)
    const iceGradTop = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.12);
    iceGradTop.addColorStop(0, '#ffffff');
    iceGradTop.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = iceGradTop;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.12);

    const iceGradBottom = ctx.createLinearGradient(0, canvas.height * 0.88, 0, canvas.height);
    iceGradBottom.addColorStop(0, 'rgba(255, 255, 255, 0)');
    iceGradBottom.addColorStop(1, '#ffffff');
    ctx.fillStyle = iceGradBottom;
    ctx.fillRect(0, canvas.height * 0.88, canvas.width, canvas.height * 0.12);

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.03, 0.12);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Earth Specular Map (Oceans shiny white, continents matte dark)
   */
  static createEarthSpecularTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff'; // Oceans reflect sunlight brightly
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#050505'; // Land is matte
    const drawLandMatte = (cx: number, cy: number, rx: number, ry: number) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    drawLandMatte(240, 180, 100, 115);
    drawLandMatte(300, 350, 80, 125);
    drawLandMatte(600, 160, 170, 105);
    drawLandMatte(570, 310, 95, 120);
    drawLandMatte(800, 210, 120, 90);
    drawLandMatte(850, 370, 60, 50);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Earth Clouds Map (Transparent swirling cloud bands)
   */
  static createEarthCloudTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 280; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const rx = Math.random() * 180 + 40;
      const ry = Math.random() * 30 + 6;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Earth's Moon Texture
   */
  static createMoonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lunar Maria
    ctx.fillStyle = '#595959';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 70 + 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Craters
    ctx.strokeStyle = '#e0e0e0';
    ctx.fillStyle = '#7a7a7a';
    for (let i = 0; i < 250; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 12 + 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.04, 0.2);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Mars: Rusty orange-red, Valles Marineris canyon, polar caps, volcanic basalt
   */
  static createMarsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base rusty red-orange
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c44b25');
    grad.addColorStop(0.5, '#d95a32');
    grad.addColorStop(1, '#b03f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dark volcanic regions (Syrtis Major, Acidalia Planitia)
    ctx.fillStyle = '#702d18';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const rx = Math.random() * 180 + 30;
      const ry = Math.random() * 90 + 15;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Valles Marineris Canyon streak
    ctx.fillStyle = '#4a1b0d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.45, canvas.height * 0.55, 260, 25, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Polar Ice Caps
    ctx.fillStyle = '#fcefe8';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
    ctx.fillRect(0, canvas.height * 0.92, canvas.width, canvas.height * 0.08);

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.03, 0.2);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Jupiter: Multi-toned gas giant bands, swirling waves & Great Red Spot
   */
  static createJupiterTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const bandColors = [
      '#e0c4a4', '#a67246', '#c9a179', '#854e2d', '#ebd5bb',
      '#995f3b', '#dbb38a', '#733e24', '#c29770', '#9c6644'
    ];

    const bandH = canvas.height / bandColors.length;
    for (let i = 0; i < bandColors.length; i++) {
      ctx.fillStyle = bandColors[i];
      ctx.fillRect(0, i * bandH, canvas.width, bandH);
    }

    // Swirling turbulent cloud waves
    ctx.fillStyle = 'rgba(255, 242, 225, 0.3)';
    for (let y = 0; y < canvas.height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 40) {
        const offset = Math.sin(x * 0.015 + y * 0.08) * 16;
        ctx.lineTo(x, y + offset);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();
    }

    // Great Red Spot
    const grsX = canvas.width * 0.68;
    const grsY = canvas.height * 0.66;
    const grsGrad = ctx.createRadialGradient(grsX, grsY, 5, grsX, grsY, 110);
    grsGrad.addColorStop(0, '#bd321a');
    grsGrad.addColorStop(0.65, '#9e2511');
    grsGrad.addColorStop(1, 'rgba(158, 37, 17, 0)');
    ctx.fillStyle = grsGrad;
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, 130, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.02, 0.12);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Saturn Surface: Warm golden tan banding
   */
  static createSaturnTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c7b383');
    grad.addColorStop(0.25, '#ebd8a7');
    grad.addColorStop(0.5, '#bfab78');
    grad.addColorStop(0.75, '#e0cfa0');
    grad.addColorStop(1, '#b5a16f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.03, 0.08);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Saturn Rings Texture: Concentric rings with Cassini division gap & alpha channel
   */
  static createSaturnRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x++) {
      const norm = x / canvas.width; // 0.0 (inner) to 1.0 (outer)

      let alpha = 0.85;
      let r = 225, g = 205, b = 160;

      // Cassini Division gap (space between B ring & A ring)
      if (norm > 0.57 && norm < 0.64) {
        alpha = 0.04;
      } else if (norm < 0.08 || norm > 0.96) {
        alpha = 0.0;
      } else if (norm > 0.32 && norm < 0.36) {
        alpha = 0.25; // Encke gap
      } else {
        const varTone = Math.sin(norm * 140) * 35;
        r = Math.min(255, Math.max(120, r + varTone));
        g = Math.min(255, Math.max(120, g + varTone * 0.85));
        b = Math.min(255, Math.max(100, b + varTone * 0.65));
      }

      ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`;
      ctx.fillRect(x, 0, 1, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Uranus: Cyan-turquoise ice giant atmosphere
   */
  static createUranusTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#a3e8ef');
    grad.addColorStop(0.5, '#5ec7d4');
    grad.addColorStop(1, '#8de0e8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.02, 0.05);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Uranus Ring Texture
   */
  static createUranusRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x++) {
      const norm = x / canvas.width;
      if (norm > 0.42 && norm < 0.48) {
        ctx.fillStyle = 'rgba(190, 240, 250, 0.6)';
      } else if (norm > 0.68 && norm < 0.71) {
        ctx.fillStyle = 'rgba(210, 245, 255, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      }
      ctx.fillRect(x, 0, 1, canvas.height);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Neptune: Deep cobalt azure blue with dark spot & white streaks
   */
  static createNeptuneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#274bbf');
    grad.addColorStop(0.4, '#385ee0');
    grad.addColorStop(0.75, '#1e389e');
    grad.addColorStop(1, '#2c4ec4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bright white cloud streaks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const rx = Math.random() * 160 + 50;
      const ry = Math.random() * 9 + 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Great Dark Spot
    ctx.fillStyle = '#112261';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.42, canvas.height * 0.58, 60, 32, 0.15, 0, Math.PI * 2);
    ctx.fill();

    this.addPerlinNoise(ctx, canvas.width, canvas.height, 0.02, 0.06);
    return new THREE.CanvasTexture(canvas);
  }
}
