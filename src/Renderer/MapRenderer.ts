import { LinearToneMapping, sRGBEncoding, WebGLRenderer, WebGLRendererParameters } from 'three';

export default class MapRenderer extends WebGLRenderer {
    constructor(container: HTMLElement, options: WebGLRendererParameters) {
        super(options);

        const { clientWidth, clientHeight } = container;

        this.setSize(clientWidth, clientHeight);
        this.setViewport(0, 0, clientWidth, clientHeight);
        this.toneMapping = LinearToneMapping;
        this.toneMappingExposure = 1.0;
        this.outputEncoding = sRGBEncoding;
        this.autoClear = false;

        container.appendChild(this.domElement);
    }
}
