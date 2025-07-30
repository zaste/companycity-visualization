/**
 * Scene Manager - Core Three.js scene setup and management
 */

import * as THREE from 'three';
import { ThemeConfig, PerformanceConfig } from '@/types';

export interface SceneConfig {
  theme: ThemeConfig;
  performance: PerformanceConfig;
  enableShadows?: boolean;
  enableFog?: boolean;
}

export class Scene {
  public readonly scene: THREE.Scene;
  public readonly clock: THREE.Clock;
  
  private config: SceneConfig;
  private lights: Map<string, THREE.Light> = new Map();
  private ambientEffects: THREE.Object3D[] = [];
  private fog?: THREE.Fog;

  constructor(config: SceneConfig) {
    this.config = config;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    
    this.initialize();
  }

  private initialize(): void {
    this.setupBackground();
    this.setupFog();
    this.setupLighting();
    this.setupAmbientEffects();
  }

  private setupBackground(): void {
    const bgColor = new THREE.Color(this.config.theme.backgroundColor);
    this.scene.background = bgColor;
  }

  private setupFog(): void {
    if (!this.config.enableFog) return;

    const fogColor = new THREE.Color(this.config.theme.backgroundColor);
    this.fog = new THREE.Fog(fogColor, 100, 400);
    this.scene.fog = this.fog;
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(ambientLight);
    this.lights.set('ambient', ambientLight);

    // Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(80, 120, 60);
    
    if (this.config.enableShadows && this.config.performance.shadowQuality !== 'low') {
      directionalLight.castShadow = true;
      this.setupShadows(directionalLight);
    }
    
    this.scene.add(directionalLight);
    this.lights.set('directional', directionalLight);

    // Accent light from opposite direction
    const accentColor = new THREE.Color(this.config.theme.primaryColor);
    const accentLight = new THREE.DirectionalLight(accentColor, 0.2);
    accentLight.position.set(-50, 80, -40);
    this.scene.add(accentLight);
    this.lights.set('accent', accentLight);

    // Central point light for glow effect
    const centerLight = new THREE.PointLight(accentColor, 0.5, 100);
    centerLight.position.set(0, 30, 0);
    this.scene.add(centerLight);
    this.lights.set('center', centerLight);

    // Hemisphere light for ambient variation
    const hemiLight = new THREE.HemisphereLight(0x0a0a1a, 0x1a1a2e, 0.3);
    this.scene.add(hemiLight);
    this.lights.set('hemisphere', hemiLight);
  }

  private setupShadows(light: THREE.DirectionalLight): void {
    const shadowQuality = this.config.performance.shadowQuality || 'medium';
    
    const mapSize = {
      low: 1024,
      medium: 2048,
      high: 4096,
    }[shadowQuality];

    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -150;
    light.shadow.camera.right = 150;
    light.shadow.camera.top = 150;
    light.shadow.camera.bottom = -150;
    light.shadow.mapSize.width = mapSize;
    light.shadow.mapSize.height = mapSize;
    light.shadow.bias = -0.001;
  }

  private setupAmbientEffects(): void {
    // Base platform with gradient
    const platformGeometry = new THREE.PlaneGeometry(400, 400, 40, 40);
    this.addHeightVariation(platformGeometry);
    
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a0a0a,
      emissive: 0x1a1a2e,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.rotation.x = -Math.PI / 2;
    platform.position.y = -2;
    platform.receiveShadow = this.config.enableShadows;
    
    this.scene.add(platform);
    this.ambientEffects.push(platform);

    // Central glow effect
    const centralGlowGeometry = new THREE.CircleGeometry(50, 32);
    const centralGlowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.theme.primaryColor,
      transparent: true,
      opacity: 0.08,
    });
    
    const centralGlow = new THREE.Mesh(centralGlowGeometry, centralGlowMaterial);
    centralGlow.rotation.x = -Math.PI / 2;
    centralGlow.position.y = 0.2;
    
    this.scene.add(centralGlow);
    this.ambientEffects.push(centralGlow);

    // Pulsing ring around central core
    const pulseRingGeometry = new THREE.RingGeometry(38, 42, 64);
    const pulseRingMaterial = new THREE.MeshBasicMaterial({
      color: this.config.theme.primaryColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    
    const pulseRing = new THREE.Mesh(pulseRingGeometry, pulseRingMaterial);
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.5;
    pulseRing.userData.isPulseRing = true;
    
    this.scene.add(pulseRing);
    this.ambientEffects.push(pulseRing);
  }

  private addHeightVariation(geometry: THREE.PlaneGeometry): void {
    const positionAttribute = geometry.attributes.position;
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);
      const distance = Math.sqrt(x * x + z * z);
      const height = Math.sin(distance * 0.02) * 0.5;
      positionAttribute.setY(i, height);
    }
    
    geometry.computeVertexNormals();
  }

  public updateTheme(theme: ThemeConfig): void {
    this.config.theme = theme;
    
    // Update background
    this.scene.background = new THREE.Color(theme.backgroundColor);
    
    // Update fog
    if (this.fog) {
      this.fog.color.setHex(parseInt(theme.backgroundColor.replace('#', ''), 16));
    }
    
    // Update lights
    const accentColor = new THREE.Color(theme.primaryColor);
    const accentLight = this.lights.get('accent') as THREE.DirectionalLight;
    const centerLight = this.lights.get('center') as THREE.PointLight;
    
    if (accentLight) accentLight.color.copy(accentColor);
    if (centerLight) centerLight.color.copy(accentColor);
    
    // Update ambient effects
    this.ambientEffects.forEach((effect) => {
      if (effect.userData.isPulseRing) {
        (effect as THREE.Mesh).material.color.copy(accentColor);
      }
    });
  }

  public updateFog(near: number, far: number): void {
    if (this.fog) {
      this.fog.near = near;
      this.fog.far = far;
    }
  }

  public setFogVisibility(visible: boolean): void {
    this.scene.fog = visible ? this.fog : null;
  }

  public updatePerformance(config: PerformanceConfig): void {
    this.config.performance = config;
    
    // Update shadow quality
    const directionalLight = this.lights.get('directional') as THREE.DirectionalLight;
    if (directionalLight?.shadow) {
      const mapSize = {
        low: 1024,
        medium: 2048,
        high: 4096,
      }[config.shadowQuality || 'medium'];
      
      directionalLight.shadow.mapSize.setScalar(mapSize);
      directionalLight.shadow.map?.dispose();
      directionalLight.shadow.map = null;
    }
  }

  public animate(deltaTime: number, elapsedTime: number): void {
    // Animate pulse ring
    this.ambientEffects.forEach((effect) => {
      if (effect.userData.isPulseRing) {
        const pulseScale = 1 + Math.sin(elapsedTime * 1.5) * 0.08;
        effect.scale.setScalar(pulseScale);
        
        const material = (effect as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = 0.25 + Math.sin(elapsedTime * 1.5) * 0.1;
      }
    });

    // Animate central glow
    const centerLight = this.lights.get('center') as THREE.PointLight;
    if (centerLight) {
      centerLight.intensity = 0.5 + Math.sin(elapsedTime * 0.5) * 0.1;
    }
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public getElapsedTime(): number {
    return this.clock.getElapsedTime();
  }

  public getDeltaTime(): number {
    return this.clock.getDelta();
  }

  public dispose(): void {
    // Dispose of all materials and geometries
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // Dispose of lights
    this.lights.forEach((light) => {
      if (light.shadow?.map) {
        light.shadow.map.dispose();
      }
    });

    this.lights.clear();
    this.ambientEffects.length = 0;
  }

  // Getters
  public get threeScene(): THREE.Scene {
    return this.scene;
  }

  public getLight(name: string): THREE.Light | undefined {
    return this.lights.get(name);
  }

  public getAllLights(): THREE.Light[] {
    return Array.from(this.lights.values());
  }
}
