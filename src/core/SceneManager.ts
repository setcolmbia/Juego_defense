import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  SSAOEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
  SMAAEffect,
  SMAAPreset,
  BrightnessContrastEffect,
  NoiseEffect,
  BlendFunction,
} from 'postprocessing';
import type { GraphicsSettings } from './Settings';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly canvas: HTMLCanvasElement;

  private bloomEffect!: BloomEffect;
  private ssaoEffect!: SSAOEffect;
  private effectPass!: EffectPass;
  private renderPass!: RenderPass;
  private noiseEffect!: NoiseEffect;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xaa5a6e, 0.012);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(-3, 13, 15);
    this.camera.lookAt(9, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // handled by postprocessing ToneMappingEffect
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    container.appendChild(this.canvas);

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.buildEffects();

    window.addEventListener('resize', () => this.onResize());
  }

  private buildEffects() {
    this.bloomEffect = new BloomEffect({
      intensity: 1.1,
      luminanceThreshold: 0.55,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
    });

    this.ssaoEffect = new SSAOEffect(this.camera, undefined, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: 16,
      rings: 4,
      distanceThreshold: 0.4,
      distanceFalloff: 0.5,
      rangeThreshold: 0.0015,
      rangeFalloff: 0.001,
      luminanceInfluence: 0.4,
      radius: 0.08,
      intensity: 1.6,
      bias: 0.03,
    });

    const vignette = new VignetteEffect({ darkness: 0.55, offset: 0.35 });
    const tonemap = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const contrast = new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.06 });
    this.noiseEffect = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    this.noiseEffect.blendMode.opacity.value = 0.035;
    const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });

    this.effectPass = new EffectPass(
      this.camera,
      this.ssaoEffect,
      this.bloomEffect,
      contrast,
      vignette,
      tonemap,
      this.noiseEffect,
      smaa,
    );
    this.composer.addPass(this.effectPass);
  }

  applyGraphicsSettings(settings: GraphicsSettings) {
    this.renderer.shadowMap.enabled = settings.shadows;
    this.bloomEffect.intensity = settings.bloom ? 1.1 : 0;
    this.ssaoEffect.blendMode.setOpacity(settings.ssao ? 1 : 0);
    const pr = settings.quality === 'low' ? 1 : settings.quality === 'medium' ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr);
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  render() {
    this.composer.render();
  }
}
