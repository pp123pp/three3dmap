import MapScene from '@/Scene/MapScene';
import { Texture, WebGLRenderTarget } from 'three';
import Context from './Context';
import MapRenderer from './MapRenderer';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ComputedShaderPass } from './ComputedShaderPass';
import defined from '@/Core/defined';
import GeographicReprojectMaterial from '@/Material/GeographicReprojectMaterial';
import { ComputeCommand } from './ComputeCommand';

class ComputeEngine {
    renderTarget: WebGLRenderTarget;
    _scene: MapScene;
    readonly _context: Context;
    _renderer: MapRenderer;
    effectComposer: EffectComposer | undefined;
    computedShaderPass: ComputedShaderPass | undefined;
    constructor(scene: MapScene, context: Context) {
        this._scene = scene;
        this._renderer = scene.renderer;

        this._context = context;

        // 绘制结果保存对象
        this.renderTarget = new WebGLRenderTarget(256, 256);

        // this._renderer = new WebGLRenderer();

        this.effectComposer = undefined;

        this.computedShaderPass = undefined;
    }

    // 更新要绘制结果的纹理
    updateRenderTarget(texture: Texture): void {
        // texture.needsUpdate = true;
        const { width, height } = texture.image;

        this.renderTarget.setSize(width, height);
        texture.image = {
            width: this.renderTarget.width,
            height: this.renderTarget.height,
            depth: this.renderTarget.depth,
        };

        this.renderTarget.texture = texture;

        // bufferSize.copy(this._scene.drawingBufferSize);

        // this._renderer.setSize(width, height);
        (this.effectComposer as EffectComposer).setSize(width, height);

        this._renderer.clear();
        (this.effectComposer as EffectComposer).reset(this.renderTarget);
    }

    execute(computeCommand: ComputeCommand): void {
        const renderTarget = this.renderTarget;
        // 预执行
        if (defined(computeCommand.preExecute)) {
            computeCommand.preExecute(computeCommand);
        }

        if (!defined(this.effectComposer)) {
            this.effectComposer = new EffectComposer(this._renderer, this.renderTarget);
            this.effectComposer.renderToScreen = false;
            this.computedShaderPass = new ComputedShaderPass(new GeographicReprojectMaterial());
            // this.computedShaderPass.clear = true;
            this.effectComposer.addPass(this.computedShaderPass);
        }

        const computedShaderPass = this.computedShaderPass as ComputedShaderPass;

        const outputTexture = computeCommand.outputTexture;

        // 根据texture更新target尺寸
        this.updateRenderTarget(outputTexture);

        computedShaderPass.fsQuad._mesh.geometry = computeCommand.geometry;
        computedShaderPass.fsQuad._mesh.frustumCulled = false;
        (computedShaderPass.material as GeographicReprojectMaterial).uniforms.u_texture.value = (computeCommand.material as any).texture;
        (computedShaderPass.material as GeographicReprojectMaterial).textureDimensions = (computeCommand.material as any).textureDimensions;

        (this.effectComposer as EffectComposer).render();

        (computedShaderPass.material as GeographicReprojectMaterial).uniforms.u_texture.value.dispose();

        if (defined(computeCommand.postExecute)) {
            computeCommand.postExecute(renderTarget.texture);
        }
    }
}
export { ComputeEngine };
