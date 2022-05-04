import defined from '@/Core/defined';
import Ellipsoid from '@/Core/Ellipsoid';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import Emit from '@/Core/Emit';
import { Object3DCollection } from '@/Core/Object3DCollection';
import { FrameState } from './FrameState';
import GlobeSurfaceTileProvider from './GlobeSurfaceTileProvider';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import QuadtreePrimitive from './QuadtreePrimitive';

class Globe extends Object3DCollection {
    _ellipsoid: Ellipsoid;
    _terrainProvider: EllipsoidTerrainProvider;

    _terrainProviderChanged = new Emit();

    maximumScreenSpaceError = 4;
    _imageryLayerCollection: ImageryLayerCollection;

    /**
     * The size of the terrain tile cache, expressed as a number of tiles.  Any additional
     * tiles beyond this number will be freed, as long as they aren't needed for rendering
     * this frame.  A larger number will consume more memory but will show detail faster
     * when, for example, zooming out and then back in.
     *
     * @type {Number}
     * @default 100
     */
    tileCacheSize = 100;
    _surface: QuadtreePrimitive;

    showGroundAtmosphere = false;
    _zoomedOutOceanSpecularIntensity = 0.4;

    /**
     * A scalar used to exaggerate the terrain. Defaults to <code>1.0</code> (no exaggeration).
     * A value of <code>2.0</code> scales the terrain by 2x.
     * A value of <code>0.0</code> makes the terrain completely flat.
     * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * @type {Number}
     * @default 1.0
     */
    terrainExaggeration = 1.0;

    /**
     * The height from which terrain is exaggerated. Defaults to <code>0.0</code> (scaled relative to ellipsoid surface).
     * Terrain that is above this height will scale upwards and terrain that is below this height will scale downwards.
     * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * If {@link Globe#terrainExaggeration} is <code>1.0</code> this value will have no effect.
     * @type {Number}
     * @default 0.0
     */
    terrainExaggerationRelativeHeight = 0.0;

    /**
     * Gets or sets the number of loading descendant tiles that is considered "too many".
     * If a tile has too many loading descendants, that tile will be loaded and rendered before any of
     * its descendants are loaded and rendered. This means more feedback for the user that something
     * is happening at the cost of a longer overall load time. Setting this to 0 will cause each
     * tile level to be loaded successively, significantly increasing load time. Setting it to a large
     * number (e.g. 1000) will minimize the number of tiles that are loaded but tend to make
     * detail appear all at once after a long wait.
     * @type {Number}
     * @default 20
     */
    loadingDescendantLimit = 20;

    /**
     * Gets or sets a value indicating whether the ancestors of rendered tiles should be preloaded.
     * Setting this to true optimizes the zoom-out experience and provides more detail in
     * newly-exposed areas when panning. The down side is that it requires loading more tiles.
     * @type {Boolean}
     * @default true
     */
    preloadAncestors = true;

    /**
     * Gets or sets a value indicating whether the siblings of rendered tiles should be preloaded.
     * Setting this to true causes tiles with the same parent as a rendered tile to be loaded, even
     * if they are culled. Setting this to true may provide a better panning experience at the
     * cost of loading more tiles.
     * @type {Boolean}
     * @default false
     */
    preloadSiblings = false;

    constructor(ellipsoid = Ellipsoid.WGS84) {
        super();

        const terrainProvider = new EllipsoidTerrainProvider({
            ellipsoid: ellipsoid,
        });

        this._ellipsoid = ellipsoid;

        const imageryLayerCollection = new ImageryLayerCollection();

        this._imageryLayerCollection = imageryLayerCollection;

        this._surface = new QuadtreePrimitive({
            tileProvider: new GlobeSurfaceTileProvider({
                terrainProvider: terrainProvider,
                imageryLayers: imageryLayerCollection,
                // surfaceShaderSet: this._surfaceShaderSet
            }),
        });

        this._terrainProvider = terrainProvider;

        this.terrainProvider = new EllipsoidTerrainProvider();
    }

    get terrainProvider(): EllipsoidTerrainProvider {
        return this._terrainProvider;
    }

    set terrainProvider(value: EllipsoidTerrainProvider) {
        if (value !== this._terrainProvider) {
            this._terrainProvider = value;
            this._terrainProviderChanged.raiseEvent(value);
        }
    }

    get imageryLayers(): ImageryLayerCollection {
        return this._imageryLayerCollection;
    }

    get imageryLayersUpdatedEvent(): Emit {
        return this._surface.tileProvider.imageryLayersUpdatedEvent;
    }

    get tilesLoaded(): boolean {
        if (!defined(this._surface)) {
            return true;
        }
        return this._surface.tileProvider.ready && this._surface._tileLoadQueueHigh.length === 0 && this._surface._tileLoadQueueMedium.length === 0 && this._surface._tileLoadQueueLow.length === 0;
    }

    get terrainProviderChanged(): Emit {
        return this._terrainProviderChanged;
    }

    render(frameState: FrameState): void {
        if (!this.visible || frameState.camera.position.z < 0) {
            return;
        }

        const surface = this._surface;
        const pass = frameState.passes;

        if (pass.render) {
            surface.render(frameState);
        }
    }

    beginFrame(frameState: FrameState): void {
        const surface = this._surface;
        const tileProvider = surface.tileProvider;
        const terrainProvider = this.terrainProvider;

        const pass = frameState.passes;
        const mode = frameState.mode;

        if (pass.render) {
            if (this.showGroundAtmosphere) {
                this._zoomedOutOceanSpecularIntensity = 0.4;
            } else {
                this._zoomedOutOceanSpecularIntensity = 0.5;
            }

            surface.maximumScreenSpaceError = this.maximumScreenSpaceError;
            surface.tileCacheSize = this.tileCacheSize;
            surface.loadingDescendantLimit = this.loadingDescendantLimit;
            surface.preloadAncestors = this.preloadAncestors;
            surface.preloadSiblings = this.preloadSiblings;
            tileProvider.terrainProvider = this.terrainProvider;

            surface.beginFrame(frameState);
        }
    }

    endFrame(frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        if (frameState.passes.render) {
            this._surface.endFrame(frameState);
        }
    }

    update(frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        if (frameState.passes.render) {
            this._surface.update(frameState);
        }
    }
}

export { Globe };
