import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import Cartographic from '@/Core/Cartographic';
import CesiumRay from '@/Core/CesiumRay';
import defined from '@/Core/defined';
import Ellipsoid from '@/Core/Ellipsoid';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import IntersectionTests from '@/Core/IntersectionTests';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import QuadtreeTileLoadState from '@/Core/QuadtreeTileLoadState';
import { Request } from '@/Core/Request';
import { RequestState } from '@/Core/RequestState';
import { RequestType } from '@/Core/RequestType';
import { SceneMode } from '@/Core/SceneMode';
import TerrainEncoding from '@/Core/TerrainEncoding';
import TerrainMesh from '@/Core/TerrainMesh';
import TerrainQuantization from '@/Core/TerrainQuantization';
import { TileBoundingRegion } from '@/Core/TileBoundingRegion';
import { TileProviderError } from '@/Core/TileProviderError';
import Context from '@/Renderer/Context';
import { BufferGeometry, Float32BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, StaticDrawUsage, Uint16BufferAttribute } from 'three';
import { FrameState } from './FrameState';
import { Imagery } from './Imagery';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import { ImageryState } from './ImageryState';
import QuadtreePrimitive from './QuadtreePrimitive';
import QuadtreeTile from './QuadtreeTile';
import TerrainState from './TerrainState';
import TileImagery from './TileImagery';

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();

function disposeArray() {
    // this.array = null;
}

function createTileBoundingRegion(tile: any) {
    let minimumHeight;
    let maximumHeight;
    if (defined(tile.parent) && defined(tile.parent.data)) {
        minimumHeight = tile.parent.data.minimumHeight;
        maximumHeight = tile.parent.data.maximumHeight;
    }
    return new TileBoundingRegion({
        rectangle: tile.rectangle,
        ellipsoid: tile.tilingScheme.ellipsoid,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
    });
}

function createPriorityFunction(surfaceTile: any, frameState: FrameState) {
    return function () {
        return surfaceTile.tileBoundingRegion.distanceToCamera(frameState);
    };
}

function upsample(surfaceTile: GlobeSurfaceTile, tile: QuadtreeTile, frameState: FrameState, terrainProvider: EllipsoidTerrainProvider, x: number, y: number, level: number) {
    const parent = tile.parent;
    if (!parent) {
        // Trying to upsample from a root tile. No can do. This tile is a failure.
        tile.state = QuadtreeTileLoadState.FAILED;
        return;
    }

    const sourceData = ((parent as QuadtreeTile).data as GlobeSurfaceTile).terrainData;
    const sourceX = parent.x;
    const sourceY = parent.y;
    const sourceLevel = parent.level;

    if (!defined(sourceData)) {
        // Parent is not available, so we can't upsample this tile yet.
        return;
    }

    const terrainDataPromise = sourceData.upsample(terrainProvider.tilingScheme, sourceX, sourceY, sourceLevel, x, y, level);
    if (!defined(terrainDataPromise)) {
        // The upsample request has been deferred - try again later.
        return;
    }

    surfaceTile.terrainState = TerrainState.RECEIVING;

    Promise.resolve(terrainDataPromise)
        .then(function (terrainData) {
            surfaceTile.terrainData = terrainData;
            surfaceTile.terrainState = TerrainState.RECEIVED;
        })
        .catch(function () {
            surfaceTile.terrainState = TerrainState.FAILED;
        });
}

function requestTileGeometry(surfaceTile: GlobeSurfaceTile, terrainProvider: any, x: number, y: number, level: number) {
    function success(terrainData: any) {
        surfaceTile.terrainData = terrainData;
        surfaceTile.terrainState = TerrainState.RECEIVED;
        surfaceTile.request = undefined;
    }

    function failure(error: Error) {
        if ((surfaceTile.request as Request).state === RequestState.CANCELLED) {
            // Cancelled due to low priority - try again later.
            surfaceTile.terrainData = undefined;
            surfaceTile.terrainState = TerrainState.UNLOADED;
            surfaceTile.request = undefined;
            return;
        }

        // Initially assume failure.  handleError may retry, in which case the state will
        // change to RECEIVING or UNLOADED.
        surfaceTile.terrainState = TerrainState.FAILED;
        surfaceTile.request = undefined;

        const message = `Failed to obtain terrain tile X: ${x} Y: ${y} Level: ${level}. Error message: "${error}"`;
        terrainProvider._requestError = TileProviderError.handleError(terrainProvider._requestError, terrainProvider, terrainProvider.errorEvent, message, x, y, level, doRequest);
    }

    function doRequest() {
        // Request the terrain from the terrain provider.
        const request = new Request({
            throttle: false,
            throttleByServer: true,
            type: RequestType.TERRAIN,
        });
        surfaceTile.request = request;

        const requestPromise = terrainProvider.requestTileGeometry(x, y, level, request);

        // If the request method returns undefined (instead of a promise), the request
        // has been deferred.
        if (defined(requestPromise)) {
            surfaceTile.terrainState = TerrainState.RECEIVING;
            Promise.resolve(requestPromise)
                .then(function (terrainData) {
                    success(terrainData);
                })
                .catch(function (e) {
                    failure(e);
                });
        } else {
            // Deferred - try again later.
            surfaceTile.terrainState = TerrainState.UNLOADED;
            surfaceTile.request = undefined;
        }
    }

    doRequest();
}

const scratchCreateMeshOptions: any = {
    tilingScheme: undefined,
    x: 0,
    y: 0,
    level: 0,
    exaggeration: 1.0,
    exaggerationRelativeHeight: 0.0,
    throttle: true,
};

function transform(surfaceTile: GlobeSurfaceTile, frameState: FrameState, terrainProvider: EllipsoidTerrainProvider, x: number, y: number, level: number) {
    const tilingScheme = terrainProvider.tilingScheme;

    const createMeshOptions = scratchCreateMeshOptions;
    createMeshOptions.tilingScheme = tilingScheme;
    createMeshOptions.x = x;
    createMeshOptions.y = y;
    createMeshOptions.level = level;
    createMeshOptions.exaggeration = frameState.terrainExaggeration;
    createMeshOptions.exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
    createMeshOptions.throttle = true;

    const terrainData = surfaceTile.terrainData;
    const meshPromise = terrainData.createMesh(createMeshOptions);

    if (!defined(meshPromise)) {
        // Postponed.
        return;
    }

    surfaceTile.terrainState = TerrainState.TRANSFORMING;

    Promise.resolve(meshPromise)
        .then(function (mesh) {
            (surfaceTile as any).mesh = mesh;
            surfaceTile.terrainState = TerrainState.TRANSFORMED;
        })
        .catch(function () {
            surfaceTile.terrainState = TerrainState.FAILED;
        });
}

function createResources(surfaceTile: GlobeSurfaceTile, context: Context, terrainProvider: EllipsoidTerrainProvider, x: number, yx: number, levelx: number, vertexArraysToDestroy: any[]) {
    surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(context, (surfaceTile as any).mesh);
    surfaceTile.terrainState = TerrainState.READY;
    surfaceTile.fill = surfaceTile.fill && surfaceTile.fill.destroy(vertexArraysToDestroy);
}

function prepareNewTile(tile: any, terrainProvider: any, imageryLayerCollection: any) {
    let available = terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level);

    if (!defined(available) && defined(tile.parent)) {
        // Provider doesn't know if this tile is available. Does the parent tile know?
        const parent = tile.parent;
        const parentSurfaceTile = parent.data;
        if (defined(parentSurfaceTile) && defined(parentSurfaceTile.terrainData)) {
            available = parentSurfaceTile.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
        }
    }

    if (available === false) {
        // This tile is not available, so mark it failed so we start upsampling right away.
        tile.data.terrainState = TerrainState.FAILED;
    }

    // Map imagery tiles to this terrain tile
    for (let i = 0, len = imageryLayerCollection.length; i < len; ++i) {
        const layer = imageryLayerCollection.get(i);
        if (layer.show) {
            layer._createTileImagerySkeletons(tile, terrainProvider);
        }
    }
}

function processTerrainStateMachine(tile: any, frameState: any, terrainProvider: any, imageryLayerCollection: any, quadtree: any, vertexArraysToDestroy: any) {
    // const surfaceTile = tile.data;
    // const loaded = surfaceTile.loadedTerrain;
    // const upsampled = surfaceTile.upsampledTerrain;
    // let suspendUpsampling = false;
    // if (defined(loaded)) {
    //     loaded.processLoadStateMachine(frameState, terrainProvider, tile.x, tile.y, tile.level, tile._priorityFunction);
    //     // Publish the terrain data on the tile as soon as it is available.
    //     // We'll potentially need it to upsample child tiles.
    //     if (loaded.state >= TerrainState.RECEIVED) {
    //         if (surfaceTile.terrainData !== loaded.data) {
    //             surfaceTile.terrainData = loaded.data;
    //             surfaceTile.geometry = loaded.geometry;
    //             // If there's a water mask included in the terrain data, create a
    //             // texture for it.
    //             // createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);
    //             propagateNewLoadedDataToChildren(tile);
    //         }
    //         suspendUpsampling = true;
    //     }
    //     if (loaded.state === TerrainState.READY) {
    //         loaded.publishToTile(tile);
    //         if (defined(tile.data.vertexArray)) {
    //             // Free the tiles existing vertex array on next render.
    //             vertexArraysToDestroy.push(tile.data.vertexArray);
    //         }
    //         // Transfer ownership of the vertex array to the tile itself.
    //         tile.data.vertexArray = loaded.vertexArray;
    //         loaded.vertexArray = undefined;
    //         // No further loading or upsampling is necessary.
    //         surfaceTile.pickTerrain = defaultValue(surfaceTile.loadedTerrain, surfaceTile.upsampledTerrain);
    //         surfaceTile.loadedTerrain = undefined;
    //         surfaceTile.upsampledTerrain = undefined;
    //     } else if (loaded.state === TerrainState.FAILED) {
    //         // Loading failed for some reason, or data is simply not available,
    //         // so no need to continue trying to load.  Any retrying will happen before we
    //         // reach this point.
    //         surfaceTile.loadedTerrain = undefined;
    //     }
    // }
    // if (!suspendUpsampling && defined(upsampled)) {
    //     upsampled.processUpsampleStateMachine(frameState, terrainProvider, tile.x, tile.y, tile.level);
    //     // Publish the terrain data on the tile as soon as it is available.
    //     // We'll potentially need it to upsample child tiles.
    //     // It's safe to overwrite terrainData because we won't get here after
    //     // loaded terrain data has been received.
    //     if (upsampled.state >= TerrainState.RECEIVED) {
    //         if (surfaceTile.terrainData !== upsampled.data) {
    //             surfaceTile.terrainData = upsampled.data;
    //             propagateNewUpsampledDataToChildren(tile);
    //         }
    //     }
    //     if (upsampled.state === TerrainState.READY) {
    //         upsampled.publishToTile(tile);
    //         if (defined(tile.data.vertexArray)) {
    //             // Free the tiles existing vertex array on next render.
    //             vertexArraysToDestroy.push(tile.data.vertexArray);
    //         }
    //         // Transfer ownership of the vertex array to the tile itself.
    //         tile.data.vertexArray = upsampled.vertexArray;
    //         upsampled.vertexArray = undefined;
    //         // No further upsampling is necessary.  We need to continue loading, though.
    //         surfaceTile.pickTerrain = surfaceTile.upsampledTerrain;
    //         surfaceTile.upsampledTerrain = undefined;
    //     } else if (upsampled.state === TerrainState.FAILED) {
    //         // Upsampling failed for some reason.  This is pretty much a catastrophic failure,
    //         // but maybe we'll be saved by loading.
    //         surfaceTile.upsampledTerrain = undefined;
    //     }
    // }

    const surfaceTile = tile.data;

    // If this tile is FAILED, we'll need to upsample from the parent. If the parent isn't
    // ready for that, let's push it along.
    const parent = tile.parent;
    if (surfaceTile.terrainState === TerrainState.FAILED && parent !== undefined) {
        const parentReady = parent.data !== undefined && parent.data.terrainData !== undefined && parent.data.terrainData.canUpsample !== false;
        if (!parentReady) {
            GlobeSurfaceTile.processStateMachine(parent, frameState, terrainProvider, imageryLayerCollection, quadtree, vertexArraysToDestroy, true);
        }
    }

    if (surfaceTile.terrainState === TerrainState.FAILED) {
        upsample(surfaceTile, tile, frameState, terrainProvider, tile.x, tile.y, tile.level);
    }

    if (surfaceTile.terrainState === TerrainState.UNLOADED) {
        requestTileGeometry(surfaceTile, terrainProvider, tile.x, tile.y, tile.level);
    }

    if (surfaceTile.terrainState === TerrainState.RECEIVED) {
        transform(surfaceTile, frameState, terrainProvider, tile.x, tile.y, tile.level);
    }

    if (surfaceTile.terrainState === TerrainState.TRANSFORMED) {
        createResources(surfaceTile, frameState.context, terrainProvider, tile.x, tile.y, tile.level, vertexArraysToDestroy);

        // Update the tile's exaggeration in case the globe's exaggeration changed while the tile was being processed
        surfaceTile.updateExaggeration(tile, frameState, quadtree);
    }

    if (surfaceTile.terrainState >= TerrainState.RECEIVED && surfaceTile.waterMaskTexture === undefined && terrainProvider.hasWaterMask) {
        const terrainData = surfaceTile.terrainData;
        if (terrainData.waterMask !== undefined) {
            // createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);
        } else {
            const sourceTile = surfaceTile._findAncestorTileWithTerrainData(tile);
            if (defined(sourceTile) && defined(sourceTile.data.waterMaskTexture)) {
                surfaceTile.waterMaskTexture = sourceTile.data.waterMaskTexture;
                ++surfaceTile.waterMaskTexture.referenceCount;
                surfaceTile._computeWaterMaskTranslationAndScale(tile, sourceTile, surfaceTile.waterMaskTranslationAndScale);
            }
        }
    }
}

function getUpsampleTileDetails(tile: any) {
    // Find the nearest ancestor with loaded terrain.
    let sourceTile = tile.parent;
    while (defined(sourceTile) && defined(sourceTile.data) && !defined(sourceTile.data.terrainData)) {
        sourceTile = sourceTile.parent;
    }

    if (!defined(sourceTile) || !defined(sourceTile.data)) {
        // No ancestors have loaded terrain - try again later.
        return undefined;
    }

    return {
        data: sourceTile.data.terrainData,
        x: sourceTile.x,
        y: sourceTile.y,
        level: sourceTile.level,
    };
}

export default class GlobeSurfaceTile {
    /**
     * The {@link TileImagery} attached to this tile.
     * @type {TileImagery[]}
     * @default []
     */
    imagery: TileImagery[] = [];

    waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

    terrainData: any = undefined;
    center = new Cartesian3();
    vertexArray: any = undefined;
    minimumHeight = 0.0;
    maximumHeight = 0.0;
    boundingSphere3D = new BoundingSphere();
    boundingSphere2D = new BoundingSphere();
    orientedBoundingBox?: OrientedBoundingBox = undefined;
    tileBoundingRegion: TileBoundingRegion = undefined as any;
    occludeePointInScaledSpace = new Cartesian3();

    loadedTerrain: any = undefined;
    upsampledTerrain: any = undefined;

    pickBoundingSphere = new BoundingSphere();
    pickTerrain: any = undefined;

    surfaceShader = undefined;
    isClipped: any = true;

    clippedByBoundaries = false;

    terrainState = TerrainState.UNLOADED;

    request?: Request;
    boundingVolumeSourceTile?: any;
    fill: any;
    mesh: any;
    boundingVolumeIsFromMesh = false;

    get renderedMesh(): any {
        if (defined(this.vertexArray)) {
            return this.mesh;
        } else if (defined(this.fill)) {
            return this.fill.mesh;
        }
        return undefined;
    }

    freeVertexArray(): void {
        let indexBuffer;

        if (defined(this.vertexArray)) {
            indexBuffer = this.vertexArray.indexBuffer;

            // this.vertexArray = this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (defined(indexBuffer) && !indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }
    }

    static initialize(tile: QuadtreeTile, terrainProvider: EllipsoidTerrainProvider, imageryLayerCollection: ImageryLayerCollection): void {
        let surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
        }

        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }
    }

    static _createVertexArrayForMesh(context: Context, mesh: TerrainMesh): any {
        const typedArray = mesh.vertices;
        const geometry = new BufferGeometry();

        const attributes = mesh.encoding.getAttributes([]);

        const indexBuffers = (mesh.indices as any).indexBuffers || {};
        let indexBuffer = indexBuffers[context.id];

        if (!defined(indexBuffer)) {
            indexBuffer = new Uint16BufferAttribute(mesh.indices, 1).onUpload(disposeArray);

            indexBuffers[context.id] = indexBuffer;
            (mesh.indices as any).indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        geometry.setIndex(indexBuffer);

        if ((mesh.encoding as TerrainEncoding).quantization === TerrainQuantization.BITS12) {
            const vertexBuffer = new Float32BufferAttribute(typedArray, attributes[0].componentsPerAttribute).onUpload(disposeArray);
            geometry.setAttribute('compressed0', vertexBuffer);
        } else {
            const vertexBuffer = new InterleavedBuffer(typedArray, attributes[0].componentsPerAttribute + attributes[1].componentsPerAttribute);

            vertexBuffer.setUsage(StaticDrawUsage);

            const position3DAndHeight = new InterleavedBufferAttribute(vertexBuffer, attributes[0].componentsPerAttribute, 0, false);
            const textureCoordAndEncodedNormals = new InterleavedBufferAttribute(vertexBuffer, attributes[1].componentsPerAttribute, attributes[0].componentsPerAttribute, false);

            geometry.setAttribute('position3DAndHeight', position3DAndHeight);
            geometry.setAttribute('textureCoordAndEncodedNormals', textureCoordAndEncodedNormals);
        }

        // tileTerrain.vertexArray = mesh.vertices;
        mesh.geometry = geometry;

        return geometry;
    }

    static processStateMachine(tile: QuadtreeTile, frameState: FrameState, terrainProvider: EllipsoidTerrainProvider, imageryLayerCollection: ImageryLayerCollection, quadtree: QuadtreePrimitive, vertexArraysToDestroy: any[], terrainOnly: boolean): void {
        GlobeSurfaceTile.initialize(tile, terrainProvider, imageryLayerCollection);

        const surfaceTile = tile.data as GlobeSurfaceTile;

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(tile, frameState, terrainProvider, imageryLayerCollection, quadtree, vertexArraysToDestroy);
        }

        // From here down we're loading imagery, not terrain. We don't want to load imagery until
        // we're certain that the terrain tiles are actually visible, though. We'll load terrainOnly
        // in these scenarios:
        //   * our bounding volume isn't accurate so we're not certain this tile is really visible (see GlobeSurfaceTileProvider#loadTile).
        //   * we want to upsample from this tile but don't plan to render it (see processTerrainStateMachine).
        if (terrainOnly) {
            return;
        }

        const wasAlreadyRenderable = tile.renderable;

        // The terrain is renderable as soon as we have a valid vertex array.
        tile.renderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until it's in the READY state.
        const isTerrainDoneLoading = surfaceTile.terrainState === TerrainState.READY;

        // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
        // upsampled only.  We won't refine a tile if its four children are upsampled only.
        tile.upsampledFromParent = defined(surfaceTile.terrainData) && surfaceTile.terrainData.wasCreatedByUpsampling();

        const isImageryDoneLoading = surfaceTile.processImagery(tile, terrainProvider, frameState);

        if (isTerrainDoneLoading && isImageryDoneLoading) {
            const callbacks = tile._loadedCallbacks;
            const newCallbacks: any = {};
            for (const layerId in callbacks) {
                if (layerId in callbacks) {
                    if (!callbacks[layerId](tile)) {
                        newCallbacks[layerId] = callbacks[layerId];
                    }
                }
            }
            tile._loadedCallbacks = newCallbacks;

            tile.state = QuadtreeTileLoadState.DONE;
        }

        // Once a tile is renderable, it stays renderable, because doing otherwise would
        // cause detail (or maybe even the entire globe) to vanish when adding a new
        // imagery layer. `GlobeSurfaceTileProvider._onLayerAdded` sets renderable to
        // false for all affected tiles that are not currently being rendered.
        if (wasAlreadyRenderable) {
            tile.renderable = true;
        }
    }

    processImagery(tile: QuadtreeTile, terrainProvider: EllipsoidTerrainProvider, frameState: FrameState, skipLoading?: any): boolean {
        const surfaceTile = tile.data as GlobeSurfaceTile;
        let isUpsampledOnly = tile.upsampledFromParent;
        let isAnyTileLoaded = false;
        let isDoneLoading = true;

        // Transition imagery states
        const tileImageryCollection = surfaceTile.imagery;
        let i, len;
        for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
            const tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                isUpsampledOnly = false;
                continue;
            }

            if ((tileImagery.loadingImagery as Imagery).state === ImageryState.PLACEHOLDER) {
                const imageryLayer = (tileImagery.loadingImagery as Imagery).imageryLayer;
                if (imageryLayer.imageryProvider.ready) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(tile, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                } else {
                    isUpsampledOnly = false;
                }
            }

            const thisTileDoneLoading = tileImagery.processStateMachine(tile, frameState, skipLoading);
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isAnyTileLoaded = isAnyTileLoaded || thisTileDoneLoading || defined(tileImagery.readyImagery);

            isUpsampledOnly = isUpsampledOnly && defined(tileImagery.loadingImagery) && ((tileImagery.loadingImagery as Imagery).state === ImageryState.FAILED || (tileImagery.loadingImagery as Imagery).state === ImageryState.INVALID);
        }

        tile.upsampledFromParent = isUpsampledOnly;

        // Allow rendering if any available layers are loaded
        tile.renderable = tile.renderable && (isAnyTileLoaded || isDoneLoading);

        return isDoneLoading;
    }

    freeResources(): void {
        if (defined(this.terrainData)) {
            this.terrainData._mesh.indices = null;
            this.terrainData._mesh.vertices = null;

            this.terrainData = undefined;
        }

        if (defined(this.loadedTerrain)) {
            this.loadedTerrain.freeResources();
            this.loadedTerrain = undefined;
        }

        if (defined(this.upsampledTerrain)) {
            this.upsampledTerrain.freeResources();
            this.upsampledTerrain = undefined;
        }

        if (defined(this.pickTerrain)) {
            this.pickTerrain.freeResources();
            this.pickTerrain = undefined;
        }

        let i;
        let len;

        const imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        this.freeVertexArray();
    }

    pick(ray: any, mode: any, projection: any, cullBackFaces: any, result: any): any {
        const mesh = this.renderedMesh;
        if (!defined(mesh)) {
            return undefined;
        }

        const vertices = mesh.vertices;
        const indices = mesh.indices;
        const encoding = mesh.encoding;
        const indicesLength = indices.length;

        let minT = Number.MAX_VALUE;

        for (let i = 0; i < indicesLength; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            const v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
            const v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
            const v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

            const t = IntersectionTests.rayTriangleParametric(ray, v0, v1, v2, cullBackFaces) as number;
            if (defined(t) && t < minT && t >= 0.0) {
                minT = t;
            }
        }

        return minT !== Number.MAX_VALUE ? CesiumRay.getPoint(ray, minT, result) : undefined;
    }

    removeGeodeticSurfaceNormals(frameState: FrameState): void {
        toggleGeodeticSurfaceNormals(this, false, undefined, frameState);
    }

    updateExaggeration(tile: any, frameState: any, quadtree: any) {
        const surfaceTile = this;
        const mesh = surfaceTile.renderedMesh;
        if (mesh === undefined) {
            return;
        }

        // Check the tile's terrain encoding to see if it has been exaggerated yet
        const exaggeration = frameState.terrainExaggeration;
        const exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
        const hasExaggerationScale = exaggeration !== 1.0;

        const encoding = mesh.encoding;
        const encodingExaggerationScaleChanged = encoding.exaggeration !== exaggeration;
        const encodingRelativeHeightChanged = encoding.exaggerationRelativeHeight !== exaggerationRelativeHeight;

        if (encodingExaggerationScaleChanged || encodingRelativeHeightChanged) {
            // Turning exaggeration scale on/off requires adding or removing geodetic surface normals
            // Relative height only translates, so it has no effect on normals
            if (encodingExaggerationScaleChanged) {
                if (hasExaggerationScale && !encoding.hasGeodeticSurfaceNormals) {
                    const ellipsoid = tile.tilingScheme.ellipsoid;
                    surfaceTile.addGeodeticSurfaceNormals(ellipsoid, frameState);
                } else if (!hasExaggerationScale && encoding.hasGeodeticSurfaceNormals) {
                    surfaceTile.removeGeodeticSurfaceNormals(frameState);
                }
            }

            encoding.exaggeration = exaggeration;
            encoding.exaggerationRelativeHeight = exaggerationRelativeHeight;

            // Notify the quadtree that this tile's height has changed
            if (quadtree !== undefined) {
                quadtree._tileToUpdateHeights.push(tile);
                const customData = tile.customData;
                const customDataLength = customData.length;
                for (let i = 0; i < customDataLength; i++) {
                    // Restart the level so that a height update is triggered
                    const data = customData[i];
                    data.level = -1;
                }
            }
        }
    }

    addGeodeticSurfaceNormals(ellipsoid: Ellipsoid, frameState: FrameState): void {
        toggleGeodeticSurfaceNormals(this, true, ellipsoid, frameState);
    }

    static _freeVertexArray(vertexArray: BufferGeometry): void {
        if (defined(vertexArray)) {
            const indexBuffer = vertexArray.index;

            // if (!vertexArray.isDestroyed()) {
            //     vertexArray.destroy();
            // }

            // if (
            //     defined(indexBuffer) &&
            // !indexBuffer.isDestroyed() &&
            // defined(indexBuffer.referenceCount)
            // ) {
            //     --indexBuffer.referenceCount;
            //     if (indexBuffer.referenceCount === 0) {
            //         indexBuffer.destroy();
            //     }
            // }

            // let attributes = vertexArray.attributes;

            // for (const key in attributes) {
            //     // (attributes[key] as BufferAttribute).array = [];
            //     // (attributes[key] as any) = null;

            //     if (attributes[key] instanceof InterleavedBufferAttribute) {
            //         (attributes[key] as InterleavedBufferAttribute).data.array = [];
            //     } else if (attributes[key] instanceof BufferAttribute) {
            //         (attributes[key] as BufferAttribute).array = [];
            //     }
            // }
            // attributes = {};
            // if (defined(indexBuffer)) {
            //     (indexBuffer as BufferAttribute).array = [];
            //     indexBuffer = null;
            // }

            vertexArray.dispose();
        }
    }
}

const scratchCartographic = new Cartographic();

function getPosition(encoding: any, mode: any, projection: any, vertices: any, index: any, result: any) {
    let position = encoding.getExaggeratedPosition(vertices, index, result);

    if (defined(mode) && mode !== SceneMode.SCENE3D) {
        const ellipsoid = projection.ellipsoid;
        const positionCartographic = ellipsoid.cartesianToCartographic(position, scratchCartographic);
        position = projection.project(positionCartographic, result);
        position = Cartesian3.fromElements(position.z, position.x, position.y, result);
    }

    return position;
}

function toggleGeodeticSurfaceNormals(surfaceTile: any, enabled: any, ellipsoid: any, frameState: any) {
    const renderedMesh = surfaceTile.renderedMesh;
    const vertexBuffer = renderedMesh.vertices;
    const encoding = renderedMesh.encoding;
    const vertexCount = vertexBuffer.length / encoding.stride;

    // Calculate the new stride and generate a new buffer
    // Clone the other encoding, toggle geodetic surface normals, then clone again to get updated stride
    let newEncoding = TerrainEncoding.clone(encoding) as TerrainEncoding;
    newEncoding.hasGeodeticSurfaceNormals = enabled;
    newEncoding = TerrainEncoding.clone(newEncoding) as TerrainEncoding;
    const newStride = newEncoding.stride;
    const newVertexBuffer = new Float32Array(vertexCount * newStride);

    if (enabled) {
        encoding.addGeodeticSurfaceNormals(vertexBuffer, newVertexBuffer, ellipsoid);
    } else {
        encoding.removeGeodeticSurfaceNormals(vertexBuffer, newVertexBuffer);
    }

    renderedMesh.vertices = newVertexBuffer;
    renderedMesh.stride = newStride;

    // delete the old vertex array (which deletes the vertex buffer attached to it), and create a new vertex array with the new vertex buffer
    const isFill = renderedMesh !== surfaceTile.mesh;
    if (isFill) {
        GlobeSurfaceTile._freeVertexArray(surfaceTile.fill.vertexArray);
        surfaceTile.fill.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(frameState.context, renderedMesh);
    } else {
        GlobeSurfaceTile._freeVertexArray(surfaceTile.vertexArray);
        surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(frameState.context, renderedMesh);
    }
    GlobeSurfaceTile._freeVertexArray(surfaceTile.wireframeVertexArray);
    surfaceTile.wireframeVertexArray = undefined;
}
