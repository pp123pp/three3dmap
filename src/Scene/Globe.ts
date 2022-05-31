import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import CesiumRay from '@/Core/CesiumRay';
import defaultValue from '@/Core/defaultValue';
import defined from '@/Core/defined';
import Ellipsoid from '@/Core/Ellipsoid';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import Emit from '@/Core/Emit';
import IntersectionTests from '@/Core/IntersectionTests';
import { Object3DCollection } from '@/Core/Object3DCollection';
import Rectangle from '@/Core/Rectangle';
import { SceneMode } from '@/Core/SceneMode';
import FrameState from './FrameState';
import GlobeSurfaceTile from './GlobeSurfaceTile';
import GlobeSurfaceTileProvider from './GlobeSurfaceTileProvider';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import MapScene, { Type_TerrainProvider } from './MapScene';
import QuadtreePrimitive from './QuadtreePrimitive';
import QuadtreeTile from './QuadtreeTile';

const scratchArray: any[] = [];
const scratchSphereIntersectionResult = {
    start: 0.0,
    stop: 0.0,
};

const scratchGetHeightCartesian = new Cartesian3();
const scratchGetHeightIntersection = new Cartesian3();
const scratchGetHeightCartographic = new Cartographic();
const scratchGetHeightRay = new CesiumRay();

function tileIfContainsCartographic(tile: QuadtreeTile, cartographic: Cartographic) {
    return defined(tile) && Rectangle.contains(tile.rectangle, cartographic) ? tile : undefined;
}

function createComparePickTileFunction(rayOrigin: Cartesian3) {
    return function (a: GlobeSurfaceTile, b: GlobeSurfaceTile) {
        const aDist = BoundingSphere.distanceSquaredTo(a.pickBoundingSphere, rayOrigin);
        const bDist = BoundingSphere.distanceSquaredTo(b.pickBoundingSphere, rayOrigin);

        return aDist - bDist;
    };
}

class Globe extends Object3DCollection {
    _ellipsoid: Ellipsoid;
    _terrainProvider: Type_TerrainProvider;

    _terrainProviderChanged = new Emit();

    maximumScreenSpaceError = 2;
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

    wiriframe = false;

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

    get terrainProvider(): Type_TerrainProvider {
        return this._terrainProvider;
    }

    set terrainProvider(value: Type_TerrainProvider) {
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

    get ellipsoid(): Ellipsoid {
        return this._ellipsoid;
    }

    render(frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        this._surface.render(frameState);
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

    /**
     * Get the height of the surface at a given cartographic.
     *
     * @param {Cartographic} cartographic The cartographic for which to find the height.
     * @returns {Number|undefined} The height of the cartographic or undefined if it could not be found.
     */
    getHeight(cartographic: Cartographic): number | undefined {
        const levelZeroTiles = this._surface._levelZeroTiles;
        if (!defined(levelZeroTiles)) {
            return;
        }

        let tile;
        let i;

        const length = levelZeroTiles.length;
        for (i = 0; i < length; ++i) {
            tile = levelZeroTiles[i];
            if (Rectangle.contains(tile.rectangle, cartographic)) {
                break;
            }
        }

        if (i >= length) {
            return undefined;
        }

        let tileWithMesh = tile;

        while (defined(tile)) {
            tile = tileIfContainsCartographic(tile._southwestChild, cartographic) || tileIfContainsCartographic(tile._southeastChild, cartographic) || tileIfContainsCartographic(tile._northwestChild, cartographic) || tile._northeastChild;

            if (defined(tile) && defined(tile.data) && defined(tile.data.renderedMesh)) {
                tileWithMesh = tile;
            }
        }

        tile = tileWithMesh;

        // This tile was either rendered or culled.
        // It is sometimes useful to get a height from a culled tile,
        // e.g. when we're getting a height in order to place a billboard
        // on terrain, and the camera is looking at that same billboard.
        // The culled tile must have a valid mesh, though.
        if (!defined(tile) || !defined(tile.data) || !defined(tile.data.renderedMesh)) {
            // Tile was not rendered (culled).
            return undefined;
        }

        const projection = this._surface._tileProvider.tilingScheme.projection;
        const ellipsoid = this._surface._tileProvider.tilingScheme.ellipsoid;

        //cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
        const cartesian = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0, ellipsoid, scratchGetHeightCartesian);

        const ray = scratchGetHeightRay;
        const surfaceNormal = ellipsoid.geodeticSurfaceNormal(cartesian, ray.direction) as Cartesian3;

        // Try to find the intersection point between the surface normal and z-axis.
        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
        const rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(cartesian, 11500.0, ray.origin);

        // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
        if (!defined(rayOrigin)) {
            // intersection point is outside the ellipsoid, try other value
            // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
            let minimumHeight;
            if (defined(tile.data.tileBoundingRegion)) {
                minimumHeight = tile.data.tileBoundingRegion.minimumHeight;
            }
            const magnitude = Math.min(defaultValue(minimumHeight, 0.0), -11500.0);

            // multiply by the *positive* value of the magnitude
            const vectorToMinimumPoint = Cartesian3.multiplyByScalar(surfaceNormal, Math.abs(magnitude) + 1, scratchGetHeightIntersection);
            Cartesian3.subtract(cartesian, vectorToMinimumPoint, ray.origin);
        }

        const intersection = tile.data.pick(ray, undefined, projection, false, scratchGetHeightIntersection) as Cartesian3;
        if (!defined(intersection)) {
            return undefined;
        }

        return (ellipsoid as any).cartesianToCartographic(intersection, scratchGetHeightCartographic).height;
    }

    /**
     * Find an intersection between a ray and the globe surface that was rendered. The ray must be given in world coordinates.
     *
     * @param {Ray} ray The ray to test for intersection.
     * @param {Scene} scene The scene.
     * @param {Boolean} [cullBackFaces=true] Set to true to not pick back faces.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.  The returned position is in projected coordinates for 2D and Columbus View.
     *
     * @private
     */
    pickWorldCoordinates(ray: CesiumRay, scene: MapScene, cullBackFaces = true, result?: Cartesian3): Cartesian3 | undefined {
        cullBackFaces = defaultValue(cullBackFaces, true);

        const mode = scene.mode;
        const projection = scene.mapProjection;

        const sphereIntersections = scratchArray;
        sphereIntersections.length = 0;

        const tilesToRender = this._surface._tilesToRender;
        let length = tilesToRender.length;

        let tile;
        let i;

        for (i = 0; i < length; ++i) {
            tile = tilesToRender[i];
            const surfaceTile = tile.data;

            if (!defined(surfaceTile)) {
                continue;
            }

            let boundingVolume = surfaceTile.pickBoundingSphere;
            if (mode !== SceneMode.SCENE3D) {
                surfaceTile.pickBoundingSphere = boundingVolume = BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, projection, surfaceTile.tileBoundingRegion.minimumHeight, surfaceTile.tileBoundingRegion.maximumHeight, boundingVolume);
                Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);
            } else if (defined(surfaceTile.renderedMesh)) {
                // BoundingSphere.clone(surfaceTile.tileBoundingRegion.boundingSphere, boundingVolume);
            } else {
                // So wait how did we render this thing then? It shouldn't be possible to get here.
                continue;
            }

            const boundingSphereIntersection = IntersectionTests.raySphere(ray, boundingVolume, scratchSphereIntersectionResult);
            if (defined(boundingSphereIntersection)) {
                sphereIntersections.push(surfaceTile);
            }
        }

        sphereIntersections.sort(createComparePickTileFunction(ray.origin));

        let intersection;
        length = sphereIntersections.length;
        for (i = 0; i < length; ++i) {
            intersection = sphereIntersections[i].pick(ray, scene.mode, scene.mapProjection, cullBackFaces, result);
            if (defined(intersection)) {
                break;
            }
        }

        return intersection;
    }
}

export { Globe };
