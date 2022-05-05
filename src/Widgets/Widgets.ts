import { combine } from '@/Core/combine';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import { FeatureDetection } from '@/Core/FeatureDetection';
import { ScreenSpaceEventHandler } from '@/Core/ScreenSpaceEventHandler';
import MapScene from '@/Scene/MapScene';
import PerspectiveFrustumCamera from '@/Scene/PerspectiveFrustumCamera';
import { Clock, WebGLRendererParameters } from 'three';
import getElement from './getElement';
import './../Extension/Object3DExtension';
import MapCamera from '@/Scene/MapCamera';

function startRenderLoop(widget: Widgets) {
    widget._renderLoopRunning = true;

    let lastFrameTime = 0;
    function render(frameTime: number) {
        if (widget.isDestroyed()) {
            return;
        }

        if (widget._useDefaultRenderLoop) {
            try {
                const targetFrameRate = 60;
                if (!defined(targetFrameRate)) {
                    widget.resize();
                    widget.render();
                    requestAnimationFrame(render);
                } else {
                    const interval = 1000.0 / (targetFrameRate as number);
                    const delta = frameTime - lastFrameTime;

                    if (delta > interval) {
                        widget.resize();
                        widget.render();
                        lastFrameTime = frameTime - (delta % interval);
                    }
                    requestAnimationFrame(render);
                }
            } catch (error) {
                console.log(error);
                widget._useDefaultRenderLoop = false;
                widget._renderLoopRunning = false;
                //     if (widget._showRenderLoopErrors) {
                //         const title =
                //   'An error occurred while rendering.  Rendering has stopped.';
                //         widget.showErrorPanel(title, undefined, error);
                //     }
            }
        } else {
            widget._renderLoopRunning = false;
        }
    }

    requestAnimationFrame(render);
}

export default class Widgets {
    readonly scene: MapScene;
    readonly canvas: HTMLCanvasElement;
    readonly element: Element;
    readonly container: Element;
    protected canvasClientWidth = 0;
    protected canvasClientHeight = 0;
    protected lastDevicePixelRatio = 0;
    protected forceResize = true;
    protected canRender = false;
    protected renderLoopRunning = false;
    protected resolutionScale = 1.0;
    protected useBrowserRecommendedResolution = true;
    protected clock = new Clock();
    readonly screenSpaceEventHandler: ScreenSpaceEventHandler;

    _useDefaultRenderLoop = false;
    _renderLoopRunning = false;

    constructor(
        container: Element | string,
        options: {
            renderState?: WebGLRendererParameters;
            requestRenderMode?: false;
            enabledEffect?: false;
            useBrowserRecommendedResolution?: true;
            useDefaultRenderLoop?: true;
            targetFrameRate?: number;
            // globe?: Globe;
        }
    ) {
        container = getElement(container);

        const element = document.createElement('div');
        element.className = 'cesium-widget';
        container.appendChild(element);

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const supportsImageRenderingPixelated = FeatureDetection.supportsImageRenderingPixelated();

        if (supportsImageRenderingPixelated) {
            canvas.style.imageRendering = FeatureDetection.imageRenderingValue() as string;
        }

        canvas.oncontextmenu = function () {
            return false;
        };
        canvas.onselectstart = function () {
            return false;
        };

        function blurActiveElement() {
            if (canvas !== canvas.ownerDocument.activeElement) {
                (canvas.ownerDocument.activeElement as HTMLBodyElement).blur();
            }
        }
        canvas.addEventListener('mousedown', blurActiveElement);
        canvas.addEventListener('pointerdown', blurActiveElement);

        element.appendChild(canvas);

        this.element = element;
        this.container = container;
        this.canvas = canvas;
        this.useBrowserRecommendedResolution = defaultValue(options.useBrowserRecommendedResolution, true) as boolean;

        const combineRenderState = combine(
            {
                canvas: canvas,
                antialias: true,
                logarithmicDepthBuffer: true,
            },
            options.renderState
        );

        this.scene = new MapScene({
            renderState: combineRenderState,
            enabledEffect: options?.enabledEffect,
            requestRenderMode: options?.requestRenderMode,
        });

        this.screenSpaceEventHandler = new ScreenSpaceEventHandler(canvas);

        this.useDefaultRenderLoop = defaultValue(options.useDefaultRenderLoop, true) as boolean;
    }

    get useDefaultRenderLoop(): boolean {
        return this._useDefaultRenderLoop;
    }

    set useDefaultRenderLoop(value: boolean) {
        if (this._useDefaultRenderLoop !== value) {
            this._useDefaultRenderLoop = value;
            if (value && !this._renderLoopRunning) {
                startRenderLoop(this);
            }
        }
    }

    configurePixelRatio(): number {
        let pixelRatio = this.useBrowserRecommendedResolution ? 1.0 : window.devicePixelRatio;
        pixelRatio *= this.resolutionScale;
        if (defined(this.scene)) {
            this.scene.pixelRatio = pixelRatio;
        }

        return pixelRatio;
    }

    get camera(): MapCamera {
        return this.scene.mapCamera;
    }

    configureCanvasSize(): void {
        const canvas = this.element;
        let width = this.canvas.clientWidth;
        let height = canvas.clientHeight;
        const pixelRatio = this.configurePixelRatio();

        this.canvasClientWidth = width;
        this.canvasClientHeight = height;

        width *= pixelRatio;
        height *= pixelRatio;

        // this.canvas.width = width;
        // this.canvas.height = height;

        this.canRender = width !== 0 && height !== 0;
        this.lastDevicePixelRatio = window.devicePixelRatio;
    }

    resize(): void {
        const canvas = this.element;
        if (!this.forceResize && this.canvasClientWidth === canvas.clientWidth && this.canvasClientHeight === canvas.clientHeight && this.lastDevicePixelRatio === window.devicePixelRatio) {
            return;
        }
        this.forceResize = false;

        this.configureCanvasSize();
        this.scene.setSize(this.container);

        this.scene.requestRender();
    }

    render(): void {
        if (this.canRender) {
            // this._renderer.render(this._scene, this._camera);
            this.scene.initializeFrame();

            const currentTime = this.clock.getDelta();

            this.scene.render(currentTime);
        }
    }

    isDestroyed(): boolean {
        return false;
    }
}
