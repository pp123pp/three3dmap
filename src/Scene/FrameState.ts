import Cartesian2 from '@/Core/Cartesian2';
import CullingVolume from '@/Core/CullingVolume';
import { SceneMode } from '@/Core/SceneMode';
import { ComputeCommand } from '@/Renderer/ComputeCommand';
import Context from '@/Renderer/Context';
import MapRenderer from '@/Renderer/MapRenderer';
import { Frustum, PerspectiveCamera } from 'three';
import MapCamera from './MapCamera';
import MapScene from './MapScene';

export interface PassesInterface {
    render: boolean;
    pick: boolean;
    depth: boolean;
    postProcess: boolean;
    offscreen: boolean;
}

class FrameState {
    scene: MapScene;
    context: Context;
    readonly commandList: any[];
    readonly shadowMaps: any[];
    // cullingVolume: CullingVolume;
    afterRender: Array<() => void>;
    mapProjection: any;
    computeCommandList: ComputeCommand[] = [];
    cameraUnderground: boolean;

    maximumScreenSpaceError = 2.0;

    /**
     * @typedef FrameState.ShadowState
     * @type {Object}
     * @property {Boolean} shadowsEnabled Whether there are any active shadow maps this frame.
     * @property {Boolean} lightShadowsEnabled Whether there are any active shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes.
     * @property {ShadowMap[]} shadowMaps All shadow maps that are enabled this frame.
     * @property {ShadowMap[]} lightShadowMaps Shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes. Only these shadow maps will be used to generate receive shadows shaders.
     * @property {Number} nearPlane The near plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
     * @property {Number} farPlane The far plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
     * @property {Number} closestObjectSize The size of the bounding volume that is closest to the camera. This is used to place more shadow detail near the object.
     * @property {Number} lastDirtyTime The time when a shadow map was last dirty
     * @property {Boolean} outOfView Whether the shadows maps are out of view this frame
     */

    /**
     * @type {FrameState.ShadowState}
     */

    shadowState = {
        /**
         * @default true
         */
        shadowsEnabled: true,
        shadowMaps: [],
        lightShadowMaps: [],
        /**
         * @default 1.0
         */
        nearPlane: 1.0,
        /**
         * @default 5000.0
         */
        farPlane: 5000.0,
        /**
         * @default 1000.0
         */
        closestObjectSize: 1000.0,
        /**
         * @default 0
         */
        lastDirtyTime: 0,
        /**
         * @default true
         */
        outOfView: true,
    };

    /**
     * @typedef FrameState.Fog
     * @type {Object}
     * @property {Boolean} enabled <code>true</code> if fog is enabled, <code>false</code> otherwise.
     * @property {Number} density A positive number used to mix the color and fog color based on camera distance.
     * @property {Number} sse A scalar used to modify the screen space error of geometry partially in fog.
     * @property {Number} minimumBrightness The minimum brightness of terrain with fog applied.
     */

    /**
     * @type {FrameState.Fog}
     */

    fog = {
        /**
         * @default false
         */
        enabled: false,
        density: 1.8367740081812416e-11,
        sse: 0,
        minimumBrightness: 0,
    };

    cullingVolume = new CullingVolume();
    // globeTranslucencyState?: GlobeTranslucencyState;

    /**
     * <code>true</code> if a new frame has been issued and the frame number has been updated.
     *
     * @type {Boolean}
     * @default false
     */
    newFrame = false;

    /**
     * The current frame number.
     *
     * @type {Number}
     * @default 0
     */
    frameNumber = 0.0;

    pixelRatio = 1.0;

    /**
     * The current mode of the scene.
     *
     * @type {SceneMode}
     * @default {@link SceneMode.SCENE3D}
     */
    mode = SceneMode.SCENE3D;

    /**
     * @typedef FrameState.Passes
     * @type {Object}
     * @property {Boolean} render <code>true</code> if the primitive should update for a render pass, <code>false</code> otherwise.
     * @property {Boolean} pick <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
     * @property {Boolean} depth <code>true</code> if the primitive should update for a depth only pass, <code>false</code> otherwise.
     * @property {Boolean} postProcess <code>true</code> if the primitive should update for a per-feature post-process pass, <code>false</code> otherwise.
     * @property {Boolean} offscreen <code>true</code> if the primitive should update for an offscreen pass, <code>false</code> otherwise.
     */

    /**
     * @type {FrameState.Passes}
     */
    passes = {
        /**
         * @default false
         */
        render: false,
        /**
         * @default false
         */
        pick: false,
        /**
         * @default false
         */
        depth: false,
        /**
         * @default false
         */
        postProcess: false,
        /**
         * @default false
         */
        offscreen: false,
    };

    /**
     * A scalar used to exaggerate the terrain.
     * @type {Number}
     * @default 1.0
     */
    terrainExaggeration = 1.0;

    /**
     * The height relative to which terrain is exaggerated.
     * @type {Number}
     * @default 0.0
     */
    terrainExaggerationRelativeHeight = 0.0;

    /**
     * The minimum terrain height out of all rendered terrain tiles. Used to improve culling for objects underneath the ellipsoid but above terrain.
     *
     * @type {Number}
     * @default 0.0
     */
    minimumTerrainHeight = 0.0;

    constructor(scene: MapScene) {
        this.scene = scene;

        this.context = scene.context;

        this.commandList = [];

        // this.computeCommandList = [];

        this.shadowMaps = [];
        // this.camera = scene.camera;

        this.mapProjection = undefined;

        this.cameraUnderground = false;

        /**
         * An array of functions to be called at the end of the frame.  This array
         * will be cleared after each frame.
         * <p>
         * This allows queueing up events in <code>update</code> functions and
         * firing them at a time when the subscribers are free to change the
         * scene state, e.g., manipulate the camera, instead of firing events
         * directly in <code>update</code> functions.
         * </p>
         *
         * @type {FrameState.AfterRenderCallback[]}
         *
         * @example
         * frameState.afterRender.push(function() {
         *   // take some action, raise an event, etc.
         * });
         */
        this.afterRender = [];
    }

    get camera(): MapCamera {
        return this.scene.mapCamera;
    }
    get bufferSize(): Cartesian2 {
        return this.scene.drawingBufferSize;
    }

    get renderer(): MapRenderer {
        return this.scene.renderer;
    }
}

export default FrameState;
