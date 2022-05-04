import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import QuadtreeTileLoadState from '@/Core/QuadtreeTileLoadState';
import { TileBoundingRegion } from '@/Core/TileBoundingRegion';
import { FrameState } from './FrameState';
import { ImageryState } from './ImageryState';
import TerrainState from './TerrainState';
import TileImagery from './TileImagery';
import TileTerrain from './TileTerrain';

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

function processTerrainStateMachine(tile: any, frameState: any, terrainProvider: any, vertexArraysToDestroy: any) {
    const surfaceTile = tile.data;
    const loaded = surfaceTile.loadedTerrain;
    const upsampled = surfaceTile.upsampledTerrain;
    let suspendUpsampling = false;

    if (defined(loaded)) {
        loaded.processLoadStateMachine(frameState, terrainProvider, tile.x, tile.y, tile.level, tile._priorityFunction);

        // Publish the terrain data on the tile as soon as it is available.
        // We'll potentially need it to upsample child tiles.
        if (loaded.state >= TerrainState.RECEIVED) {
            if (surfaceTile.terrainData !== loaded.data) {
                surfaceTile.terrainData = loaded.data;

                surfaceTile.geometry = loaded.geometry;
                // If there's a water mask included in the terrain data, create a
                // texture for it.
                // createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);

                propagateNewLoadedDataToChildren(tile);
            }
            suspendUpsampling = true;
        }

        if (loaded.state === TerrainState.READY) {
            loaded.publishToTile(tile);

            if (defined(tile.data.vertexArray)) {
                // Free the tiles existing vertex array on next render.
                vertexArraysToDestroy.push(tile.data.vertexArray);
            }

            // Transfer ownership of the vertex array to the tile itself.
            tile.data.vertexArray = loaded.vertexArray;
            loaded.vertexArray = undefined;

            // No further loading or upsampling is necessary.
            surfaceTile.pickTerrain = defaultValue(surfaceTile.loadedTerrain, surfaceTile.upsampledTerrain);
            surfaceTile.loadedTerrain = undefined;
            surfaceTile.upsampledTerrain = undefined;
        } else if (loaded.state === TerrainState.FAILED) {
            // Loading failed for some reason, or data is simply not available,
            // so no need to continue trying to load.  Any retrying will happen before we
            // reach this point.
            surfaceTile.loadedTerrain = undefined;
        }
    }

    if (!suspendUpsampling && defined(upsampled)) {
        upsampled.processUpsampleStateMachine(frameState, terrainProvider, tile.x, tile.y, tile.level);

        // Publish the terrain data on the tile as soon as it is available.
        // We'll potentially need it to upsample child tiles.
        // It's safe to overwrite terrainData because we won't get here after
        // loaded terrain data has been received.
        if (upsampled.state >= TerrainState.RECEIVED) {
            if (surfaceTile.terrainData !== upsampled.data) {
                surfaceTile.terrainData = upsampled.data;

                propagateNewUpsampledDataToChildren(tile);
            }
        }

        if (upsampled.state === TerrainState.READY) {
            upsampled.publishToTile(tile);

            if (defined(tile.data.vertexArray)) {
                // Free the tiles existing vertex array on next render.
                vertexArraysToDestroy.push(tile.data.vertexArray);
            }

            // Transfer ownership of the vertex array to the tile itself.
            tile.data.vertexArray = upsampled.vertexArray;
            upsampled.vertexArray = undefined;

            // No further upsampling is necessary.  We need to continue loading, though.
            surfaceTile.pickTerrain = surfaceTile.upsampledTerrain;
            surfaceTile.upsampledTerrain = undefined;
        } else if (upsampled.state === TerrainState.FAILED) {
            // Upsampling failed for some reason.  This is pretty much a catastrophic failure,
            // but maybe we'll be saved by loading.
            surfaceTile.upsampledTerrain = undefined;
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

    static processStateMachine(tile: any, frameState: FrameState, terrainProvider: any, imageryLayerCollection: any, vertexArraysToDestroy: any) {
        let surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
            // Create the TileBoundingRegion now in order to estimate the distance, which is used to prioritize the request.
            // Since the terrain isn't loaded yet, estimate the heights using its parent's values.
            surfaceTile.tileBoundingRegion = createTileBoundingRegion(tile);
        }

        if (!defined(tile._priorityFunction)) {
            // The priority function is used to prioritize requests among all requested tiles
            tile._priorityFunction = createPriorityFunction(surfaceTile, frameState);
        }

        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(tile, frameState, terrainProvider, vertexArraysToDestroy);
        }

        // The terrain is renderable as soon as we have a valid vertex array.
        let isRenderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until our two state machines are terminated.
        let isDoneLoading = !defined(surfaceTile.loadedTerrain) && !defined(surfaceTile.upsampledTerrain);

        // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
        // upsampled only.  We won't refine a tile if its four children are upsampled only.
        let isUpsampledOnly = defined(surfaceTile.terrainData) && surfaceTile.terrainData.wasCreatedByUpsampling();

        // Transition imagery states
        const tileImageryCollection = surfaceTile.imagery;
        let i;
        let len;
        for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
            const tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                isUpsampledOnly = false;
                continue;
            }

            const a = tileImagery.loadingImagery;
            // console.log([
            //     a.level,
            //     a.x,
            //     a.y
            // ]);

            if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
                const imageryLayer = tileImagery.loadingImagery.imageryLayer;
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

            const thisTileDoneLoading = tileImagery.processStateMachine(tile, frameState);
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isRenderable = isRenderable && (thisTileDoneLoading || defined(tileImagery.readyImagery));

            isUpsampledOnly = isUpsampledOnly && defined(tileImagery.loadingImagery) && (tileImagery.loadingImagery.state === ImageryState.FAILED || tileImagery.loadingImagery.state === ImageryState.INVALID);
        }

        tile.upsampledFromParent = isUpsampledOnly;

        // The tile becomes renderable when the terrain and all imagery data are loaded.
        if (i === len) {
            if (isRenderable) {
                tile.renderable = true;
            }

            if (isDoneLoading) {
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
                tile._priorityFunction = undefined;
            }
        }
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
