import CesiumColor from '@/Core/CesiumColor';
import { incrementWrap } from '@/Core/CesiumMath';
import CesiumTerrainProvider from '@/Core/CesiumTerrainProvider';
import defaultValue from '@/Core/defaultValue';
import defined from '@/Core/defined';
import Ellipsoid from '@/Core/Ellipsoid';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import Emit from '@/Core/Emit';
import GeographicProjection from '@/Core/GeographicProjection';
import { Object3DCollection } from '@/Core/Object3DCollection';
import { PrimitiveCollection } from '@/Core/PrimitiveCollection';
import { RenderCollection } from '@/Core/RenderCollection';
import RequestScheduler from '@/Core/RequestScheduler';
import { SceneMode } from '@/Core/SceneMode';
import { TweenCollection } from '@/Core/TweenCollection';
import { ComputeEngine } from '@/Renderer/ComputeEngine';
import Context from '@/Renderer/Context';
import MapRenderer from '@/Renderer/MapRenderer';
import { Controls } from '@/Type';
import { Scene, Vector2, WebGLRendererParameters, WebGLRenderTarget } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposerCollection } from './EffectComposerCollection';
import FrameState from './FrameState';
import { Globe } from './Globe';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import LightCollection from './LightCollection';
import MapCamera from './MapCamera';
import MapFogExp2 from './MapFogExp2';
import ScreenSpaceCameraController from './ScreenSpaceCameraController';
import Sky from './Sky';

export type Type_TerrainProvider = EllipsoidTerrainProvider | CesiumTerrainProvider;

interface SceneOptions {
    renderState?: WebGLRendererParameters;
    enabledEffect?: false;
    requestRenderMode?: false;
    canvas?: HTMLCanvasElement;
    [name: string]: any;
}

export interface PassesInterface {
    render: boolean;
    pick: boolean;
    depth: boolean;
    postProcess: boolean;
    offscreen: boolean;
}

const requestRenderAfterFrame = function (scene: Scene) {
    return function () {
        // scene.frameState.afterRender.push(function () {
        //     scene.requestRender();
        // });
    };
};

function updateGlobeListeners(scene: MapScene, globe: Globe) {
    for (let i = 0; i < scene._removeGlobeCallbacks.length; ++i) {
        scene._removeGlobeCallbacks[i]();
    }
    scene._removeGlobeCallbacks.length = 0;

    const removeGlobeCallbacks = [];
    if (defined(globe)) {
        removeGlobeCallbacks.push(globe.imageryLayersUpdatedEvent.addEventListener(requestRenderAfterFrame(scene)));
        removeGlobeCallbacks.push(globe.terrainProviderChanged.addEventListener(requestRenderAfterFrame(scene)));
    }
    scene._removeGlobeCallbacks = removeGlobeCallbacks;
}

function updateFrameNumber(scene: MapScene, frameNumber: number) {
    const frameState = scene.frameState;
    frameState.frameNumber = frameNumber;
}

function tryAndCatchError(scene: MapScene, functionToExecute: any) {
    try {
        functionToExecute(scene);
    } catch (error) {
        console.log(error);
        scene.renderError.raiseEvent(scene, error);

        if (scene.rethrowRenderErrors) {
            throw error;
        }
    }
}

function prePassesUpdate(scene: MapScene) {
    // scene._jobScheduler.resetBudgets();

    const frameState = scene.frameState;
    // const primitives = scene.primitives;
    // primitives.prePassesUpdate(frameState);

    if (defined(scene.globe)) {
        scene.globe.update(frameState);
    }

    // scene._picking.update();
    // frameState.creditDisplay.update();
}

function postPassesUpdate(scene: MapScene) {
    const frameState = scene.frameState;
    // const primitives = scene.primitives;
    // primitives.postPassesUpdate(frameState);

    RequestScheduler.update();
}

function render(scene: MapScene) {
    const frameState = scene.frameState;

    scene.updateFrameState();

    frameState.passes.render = true;

    if (defined(scene.globe)) {
        scene.globe.beginFrame(frameState);
    }

    scene.updateEnvironment();
    scene.updateAndExecuteCommands(scene.backgroundColor);

    scene.mapFogExp2.update(frameState);

    if (defined(scene.globe)) {
        scene.globe.endFrame(frameState);

        if (!scene.globe.tilesLoaded) {
            scene._renderRequested = true;
        }
    }
}

function updateAndRenderPrimitives(scene: MapScene) {
    const frameState = scene.frameState;

    // scene._groundPrimitives.update(frameState);
    scene.primitives.update(frameState);

    // updateDebugFrustumPlanes(scene);
    // updateShadowMaps(scene);

    if (scene.globe) {
        scene.globe.render(frameState);
    }

    for (const command of frameState.commandList) {
        scene.renderCollection.add(command);
    }
}

const executeComputeCommands = (scene: MapScene) => {
    const commandList = scene.frameState.computeCommandList;
    const length = commandList.length;
    for (let i = 0; i < length; ++i) {
        commandList[i].execute(scene.computeEngine);
    }
};

/**
 * 执行渲染
 * @param firstViewport
 * @param scene
 * @param backgroundColor
 */
function executeCommandsInViewport(firstViewport: boolean, scene: MapScene, backgroundColor: CesiumColor) {
    if (!firstViewport) {
        scene.frameState.commandList.length = 0;
    }

    updateAndRenderPrimitives(scene);

    if (firstViewport) {
        executeComputeCommands(scene);
    }
    scene.renderer.clear();
    scene.sky.render(scene.frameState);
    scene.effectComposerCollection.render();
}

export default class MapScene extends Scene {
    readonly renderer: MapRenderer;

    readonly renderError = new Emit();
    readonly postUpdate = new Emit();
    readonly preRender = new Emit();

    readonly mapCamera: MapCamera;
    readonly context: Context;
    readonly frameState: FrameState;

    readonly canvas: HTMLCanvasElement;

    _renderRequested = true;
    private shaderFrameCount = 0;

    readonly tweens = new TweenCollection();

    _mode: SceneMode = SceneMode.SCENE3D;

    readonly computeEngine: ComputeEngine;

    requestRenderMode: boolean;
    rethrowRenderErrors = false;

    readonly primitives = new PrimitiveCollection();
    readonly renderCollection = new RenderCollection();

    public backgroundColor = new CesiumColor(1.0, 0.0, 0.0, 1.0);
    readonly effectComposerCollection: EffectComposerCollection;

    readonly screenSpaceCameraController: Controls;
    mapProjection = new GeographicProjection();

    _globe?: Globe;

    _removeGlobeCallbacks: any[] = [];

    readonly pickPositionSupported = true;
    _globeHeight?: number;
    _cameraUnderground = false;

    readonly morphStart = new Emit();

    mapFogExp2 = new MapFogExp2(0xffffff, 0.002);

    meshCollection = new Object3DCollection();

    sky: Sky;

    lights = new LightCollection();
    constructor(options: SceneOptions) {
        super();

        this.renderer = new MapRenderer(options.renderState);

        this.context = new Context(this);

        this.canvas = this.renderer.domElement;

        this.mapCamera = new MapCamera(this, {
            aspect: this.canvas.clientWidth / this.canvas.clientHeight,
            near: 0.1,
            far: 10000000000,
        });

        this.computeEngine = new ComputeEngine(this, this.context);

        this.frameState = new FrameState(this);

        this.requestRenderMode = defaultValue(options.requestRenderMode, false) as boolean;

        this.add(this.renderCollection);

        this.effectComposerCollection = new EffectComposerCollection(this);

        this.screenSpaceCameraController = new ScreenSpaceCameraController(this);

        // this.screenSpaceCameraController = new OrbitControls(this.camera.f);

        const ellipsoid = defaultValue(this.mapProjection.ellipsoid, Ellipsoid.WGS84);
        this._globe = new Globe(ellipsoid);

        this.frustumCulled = false;

        this.addObject(this.meshCollection);

        this.sky = new Sky(this);

        this.addObject(this.lights);
    }

    get camera(): MapCamera {
        return this.mapCamera;
    }

    get drawingBufferSize(): Vector2 {
        return this.renderer.drawingBufferSize;
    }

    get colorBuffer(): WebGLRenderTarget {
        return this.context.colorFrameBuffer;
    }

    get pixelRatio(): number {
        return this.frameState.pixelRatio;
    }

    set pixelRatio(value: number) {
        this.frameState.pixelRatio = value;
    }

    get globe(): Globe {
        return this._globe as Globe;
    }

    set globe(globe: Globe) {
        this._globe = globe;

        updateGlobeListeners(this, globe);
    }

    get imageryLayers(): ImageryLayerCollection {
        return this.globe.imageryLayers;
    }

    get globeHeight(): number {
        return this._globeHeight as number;
    }

    get cameraUnderground(): boolean {
        return this._cameraUnderground;
    }

    get mode(): SceneMode {
        return this._mode;
    }

    set mode(value: SceneMode) {
        this._mode = value;
    }

    get terrainProvider(): Type_TerrainProvider | undefined {
        if (!defined(this.globe)) {
            return undefined;
        }

        return this.globe.terrainProvider;
    }

    set terrainProvider(terrainProvider: Type_TerrainProvider | undefined) {
        if (defined(this.globe)) {
            this.globe.terrainProvider = terrainProvider as Type_TerrainProvider;
        }
    }

    get terrainProviderChanged(): Emit {
        return this.globe.terrainProviderChanged;
    }

    initializeFrame(): void {
        if (this.shaderFrameCount++ === 120) {
            this.shaderFrameCount = 0;
        }
        this.tweens.update();

        // this.camera.update(this._mode);

        this._globeHeight = getGlobeHeight(this);
        this._cameraUnderground = isCameraUnderground(this);

        this.screenSpaceCameraController.update();
        this.mapCamera.update(this.mode);
        this.mapCamera._updateCameraChanged();
        this.sky.updateRotation(this.camera);

        this.sky.rotateX(0.001);
    }

    requestRender(): void {
        this._renderRequested = true;
    }

    setSize(container: Element): void {
        this.mapCamera.setSize(container);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.effectComposerCollection.setSize(container);
    }

    render(time: number): void {
        const frameState = this.frameState;
        frameState.newFrame = false;

        const cameraChanged = true;

        const shouldRender = !this.requestRenderMode || this._renderRequested || cameraChanged;

        if (shouldRender) {
            this._renderRequested = false;

            const frameNumber = incrementWrap(frameState.frameNumber, 15000000.0, 1.0);
            updateFrameNumber(this, frameNumber);
            frameState.newFrame = true;
        }

        tryAndCatchError(this, prePassesUpdate);

        /**
         *
         * Passes update. Add any passes here
         *
         */
        // if (this.primitives.show) {
        //     tryAndCatchError(this, updateMostDetailedRayPicks);
        //     tryAndCatchError(this, updatePreloadPass);
        //     tryAndCatchError(this, updatePreloadFlightPass);
        //     if (!shouldRender) {
        //         tryAndCatchError(this, updateRequestRenderModeDeferCheckPass);
        //     }
        // }

        this.postUpdate.raiseEvent(this, time);

        if (shouldRender) {
            this.preRender.raiseEvent(this, time);
            // frameState.creditDisplay.beginFrame();
            tryAndCatchError(this, render);
        }

        tryAndCatchError(this, postPassesUpdate);
    }

    clearPasses(passes: PassesInterface): void {
        passes.render = false;
        passes.pick = false;
        passes.depth = false;
        passes.postProcess = false;
        passes.offscreen = false;
    }

    updateFrameState(): void {
        const camera = this.mapCamera;

        const frameState = this.frameState;
        frameState.commandList.length = 0;
        frameState.computeCommandList.length = 0;
        frameState.shadowMaps.length = 0;
        frameState.mapProjection = this.mapProjection;
        frameState.mode = this.mode;
        // frameState.cameraUnderground = this._cameraUnderground;
        this.renderCollection.children = [];
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);

        // frameState.globeTranslucencyState = this._globeTranslucencyState;
        // frameState.cullingVolume = camera.cullingVolume;

        if (defined(this.globe)) {
            frameState.maximumScreenSpaceError = this.globe.maximumScreenSpaceError;
        } else {
            frameState.maximumScreenSpaceError = 2;
        }

        this.clearPasses(frameState.passes);
    }

    updateAndExecuteCommands(backgroundColor: CesiumColor): void {
        const frameState = this.frameState;
        // const mode = frameState.mode;

        executeCommandsInViewport(true, this, backgroundColor);
    }

    updateEnvironment() {
        const frameState = this.frameState;
        const globe = this.globe;
    }

    /**
     * Asynchronously transitions the scene to Columbus View.
     * @param {Number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
     */
    morphToColumbusView(duration = 0): void {
        let ellipsoid;
        const globe = this.globe;
        if (defined(globe)) {
            ellipsoid = globe.ellipsoid;
        } else {
            ellipsoid = this.mapProjection.ellipsoid;
        }
        duration = defaultValue(duration, 2.0);
        // this._transitioner.morphToColumbusView(duration, ellipsoid);

        this.mode = SceneMode.COLUMBUS_VIEW;
    }
}
function getGlobeHeight(scene: MapScene) {
    const globe = scene._globe as Globe;
    const camera = scene.camera;
    const cartographic = camera.positionCartographic;
    if (defined(globe) && globe.visible && defined(cartographic)) {
        return globe.getHeight(cartographic);
    }
    return undefined;
}

function isCameraUnderground(scene: MapScene) {
    const camera = scene.camera;
    const mode = scene._mode;
    const globe = scene.globe;
    const cameraController = scene.screenSpaceCameraController;
    const cartographic = camera.positionCartographic;

    if (!defined(cartographic)) {
        return false;
    }

    if (!cameraController.onMap() && cartographic.height < 0.0) {
        // The camera can go off the map while in Columbus View.
        // Make a best guess as to whether it's underground by checking if its height is less than zero.
        return true;
    }

    if (!defined(globe) || !globe.visible || mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
        return false;
    }

    const globeHeight = scene._globeHeight as number;
    return defined(globeHeight) && cartographic.height < globeHeight;
}
