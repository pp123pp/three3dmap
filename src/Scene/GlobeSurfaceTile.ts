import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import QuadtreeTileLoadState from '@/Core/QuadtreeTileLoadState';
import { Request } from '@/Core/Request';
import { RequestState } from '@/Core/RequestState';
import { RequestType } from '@/Core/RequestType';
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
import TileTerrain from './TileTerrain';

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

function propagateNewLoadedDataToChildren(tile: any) {
    const surfaceTile = tile.data;

    // Now that there's new data for this tile:
    //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.
    //  - child tiles that were previously deemed unavailable may now be available.

    propagateNewLoadedDataToChildTile(tile, surfaceTile, tile.southwestChild);
    propagateNewLoadedDataToChildTile(tile, surfaceTile, tile.southeastChild);
    propagateNewLoadedDataToChildTile(tile, surfaceTile, tile.northwestChild);
    propagateNewLoadedDataToChildTile(tile, surfaceTile, tile.northeastChild);
}

function propagateNewLoadedDataToChildTile(tile: any, surfaceTile: any, childTile: any) {
    if (childTile.state !== QuadtreeTileLoadState.START) {
        const childSurfaceTile = childTile.data;
        if (defined(childSurfaceTile.terrainData) && !childSurfaceTile.terrainData.wasCreatedByUpsampling()) {
            // Data for the child tile has already been loaded.
            return;
        }

        // Restart the upsampling process, no matter its current state.
        // We create a new instance rather than just restarting the existing one
        // because there could be an asynchronous operation pending on the existing one.
        if (defined(childSurfaceTile.upsampledTerrain)) {
            childSurfaceTile.upsampledTerrain.freeResources();
        }
        childSurfaceTile.upsampledTerrain = new TileTerrain({
            data: surfaceTile.terrainData,
            x: tile.x,
            y: tile.y,
            level: tile.level,
        });

        if (surfaceTile.terrainData.isChildAvailable(tile.x, tile.y, childTile.x, childTile.y)) {
            // Data is available for the child now.  It might have been before, too.
            if (!defined(childSurfaceTile.loadedTerrain)) {
                // No load process is in progress, so start one.
                childSurfaceTile.loadedTerrain = new TileTerrain();
            }
        }

        childTile.state = QuadtreeTileLoadState.LOADING;
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
        // surfaceTile.updateExaggeration(tile, frameState, quadtree);
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

function propagateNewUpsampledDataToChildren(tile: any) {
    // Now that there's new data for this tile:
    //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.

    // Generally this is only necessary when a child tile is upsampled, and then one
    // of its ancestors receives new (better) data and we want to re-upsample from the
    // new data.

    propagateNewUpsampledDataToChild(tile, tile._southwestChild);
    propagateNewUpsampledDataToChild(tile, tile._southeastChild);
    propagateNewUpsampledDataToChild(tile, tile._northwestChild);
    propagateNewUpsampledDataToChild(tile, tile._northeastChild);
}

function propagateNewUpsampledDataToChild(tile: any, childTile: any) {
    if (defined(childTile) && childTile.state !== QuadtreeTileLoadState.START) {
        const childSurfaceTile = childTile.data;
        if (defined(childSurfaceTile.terrainData) && !childSurfaceTile.terrainData.wasCreatedByUpsampling()) {
            // Data for the child tile has already been loaded.
            return;
        }

        // Restart the upsampling process, no matter its current state.
        // We create a new instance rather than just restarting the existing one
        // because there could be an asynchronous operation pending on the existing one.
        if (defined(childSurfaceTile.upsampledTerrain)) {
            childSurfaceTile.upsampledTerrain.freeResources();
        }
        childSurfaceTile.upsampledTerrain = new TileTerrain({
            data: tile.data.terrainData,
            x: tile.x,
            y: tile.y,
            level: tile.level,
        });

        childTile.state = QuadtreeTileLoadState.LOADING;
    }
}

function isDataAvailable(tile: any, terrainProvider: any) {
    const tileDataAvailable = terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level);
    if (defined(tileDataAvailable)) {
        return tileDataAvailable;
    }

    const parent = tile.parent;
    if (!defined(parent)) {
        // Data is assumed to be available for root tiles.
        return true;
    }

    if (!defined(parent.data) || !defined(parent.data.terrainData)) {
        // Parent tile data is not yet received or upsampled, so assume (for now) that this
        // child tile is not available.
        return false;
    }

    return parent.data.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
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
    tileBoundingRegion: any = undefined;
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

        const attributes = (mesh.encoding as TerrainEncoding).getAttributes([]);

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
        (mesh as any).geometry = geometry;

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
}
