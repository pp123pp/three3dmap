import Emit from '@/Core/Emit';
import MapRenderer from '@/Renderer/MapRenderer';
import { Scene, WebGLRendererParameters } from 'three';

interface SceneOptions {
    renderState?: WebGLRendererParameters;
    enabledEffect?: false;
    requestRenderMode?: false;
    [name: string]: any;
}

export default class MapScene extends Scene {
    readonly renderer: MapRenderer;

    readonly renderError = new Emit();
    readonly postUpdate = new Emit();
    readonly preRender = new Emit();

    constructor(options: SceneOptions) {
        super();

        this.renderer = new MapRenderer(this, options.renderState);
    }
}
