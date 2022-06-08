import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import MapScene from './MapScene';

class EffectComposerCollection {
    readonly scene: MapScene;
    mainEffectComposer: EffectComposer;
    constructor(scene: MapScene) {
        this.scene = scene;
        const renderer = scene.renderer;
        this.mainEffectComposer = new EffectComposer(renderer, scene.context.colorFrameBuffer);

        const renderPass: RenderPass = new RenderPass(scene, scene.camera.frustum);

        // renderPass.clear = false;
        this.mainEffectComposer.addPass(renderPass);
    }

    setSize(container: Element): void {
        this.mainEffectComposer.setSize(container.clientWidth, container.clientHeight);
    }

    render(): void {
        this.mainEffectComposer.render();
    }
}

export { EffectComposerCollection };
