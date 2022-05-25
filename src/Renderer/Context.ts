import MapScene from '@/Scene/MapScene';
import { FloatType, NearestFilter, RGBFormat, Texture, Vector2, WebGLMultipleRenderTargets, WebGLRenderingContext, WebGLRenderTarget } from 'three';
import { generateUUID } from 'three/src/math/MathUtils';
import { ContextLimits } from './ContextLimits';

export default class Context {
    scene: MapScene;
    cache: {
        [name: string]: any;
    } = {};

    readonly id = generateUUID();
    drawingBufferHeight = new Vector2();
    colorFrameBuffer: WebGLRenderTarget;
    frameBuffer: WebGLMultipleRenderTargets;

    readonly gl: WebGL2RenderingContext;

    constructor(scene: MapScene) {
        this.scene = scene;
        const bufferSize = scene.drawingBufferSize;

        const colorFrameBuffer = new WebGLRenderTarget(bufferSize.width, bufferSize.height, {
            format: RGBFormat,
        });
        colorFrameBuffer.samples = 4;
        this.colorFrameBuffer = colorFrameBuffer;

        ContextLimits._maxAnisotropy = scene.renderer.capabilities.getMaxAnisotropy();
        ContextLimits._maximumTextureImageUnits = scene.renderer.capabilities.maxTextures;

        //用于保存深度和法线数据
        const renderTarget = new WebGLMultipleRenderTargets(bufferSize.width, bufferSize.height, 2);

        for (let i = 0, il = renderTarget.texture.length; i < il; i++) {
            renderTarget.texture[i].minFilter = NearestFilter;
            renderTarget.texture[i].magFilter = NearestFilter;
            renderTarget.texture[i].type = FloatType;
        }

        renderTarget.texture[0].name = 'depth';
        renderTarget.texture[1].name = 'normal';
        this.frameBuffer = renderTarget;

        this.gl = scene.renderer.getContext() as WebGL2RenderingContext;
    }

    get colorTexture(): Texture {
        return this.colorFrameBuffer.texture;
    }

    get depthTexture(): Texture {
        return this.frameBuffer.texture[0];
    }

    get normalTexture(): Texture {
        return this.frameBuffer.texture[2];
    }

    // get shaderCache(): ShaderCache {
    //     return this._shaderCache;
    // }

    get webgl2(): boolean {
        return this.scene.renderer.capabilities.isWebGL2;
        // return false;
    }

    get textureFloatLinear(): boolean {
        return true;
    }

    get floatingPointTexture(): boolean {
        return true;
    }
}
