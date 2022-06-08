import { LinearToneMapping, sRGBEncoding, Vector2, WebGLRenderer, WebGLRendererParameters } from 'three';

const drawingBufferSize = new Vector2();

export default class MapRenderer extends WebGLRenderer {
    constructor(options: WebGLRendererParameters = {}) {
        super(options);

        this.toneMapping = LinearToneMapping;
        this.toneMappingExposure = 1.0;
        this.outputEncoding = sRGBEncoding;
        this.autoClear = false;
        this.setClearColor(0x262121);
        // this.setClearColor(0xff0000);
    }

    /**
     * 返回当前绘图缓冲区的尺寸
     *
     * @readonly
     * @type {Vector2}
     * @memberof MapRenderer
     */
    get drawingBufferSize(): Vector2 {
        return this.getDrawingBufferSize(drawingBufferSize);
    }
}
