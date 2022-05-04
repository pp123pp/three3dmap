import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import defined from '@/Core/defined';
import { HeightmapTerrainData } from '@/Core/HeightmapTerrainData';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import { Request } from '@/Core/Request';
import { RequestState } from '@/Core/RequestState';
import { RequestType } from '@/Core/RequestType';
import TerrainQuantization from '@/Core/TerrainQuantization';
import { BufferGeometry, Float32BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, StaticDrawUsage, Uint16BufferAttribute } from 'three';
import { FrameState } from './FrameState';
import TerrainState from './TerrainState';
const requestTileGeometry = function requestTileGeometry(tileTerrain: any, terrainProvider: any, x: any, y: any, level: any, priorityFunction: any) {
    function success(terrainData: any) {
        tileTerrain.data = terrainData;
        tileTerrain.state = TerrainState.RECEIVED;
        tileTerrain.request = undefined;
    }

    function failure() {
        if (tileTerrain.request.state === RequestState.CANCELLED) {
            // Cancelled due to low priority - try again later.
            tileTerrain.data = undefined;
            tileTerrain.state = TerrainState.UNLOADED;
            tileTerrain.request = undefined;
            return;
        }

        // Initially assume failure.  handleError may retry, in which case the state will
        // change to RECEIVING or UNLOADED.
        tileTerrain.state = TerrainState.FAILED;
        tileTerrain.request = undefined;

        const message = 'Failed to obtain terrain tile X: ' + x + ' Y: ' + y + ' Level: ' + level + '.';
        // terrainProvider._requestError = TileProviderError.handleError(
        //     terrainProvider._requestError,
        //     terrainProvider,
        //     terrainProvider.errorEvent,
        //     message,
        //     x, y, level,
        //     doRequest
        // );
    }

    function doRequest() {
        // Request the terrain from the terrain provider.
        const request = new Request({
            throttle: true,
            throttleByServer: true,
            type: RequestType.TERRAIN,
            priorityFunction: priorityFunction,
        });
        tileTerrain.request = request;
        tileTerrain.data = terrainProvider.requestTileGeometry(x, y, level, request);

        // If the request method returns undefined (instead of a promise), the request
        // has been deferred.
        if (defined(tileTerrain.data)) {
            tileTerrain.state = TerrainState.RECEIVING;
            // when(tileTerrain.data, success, failure);

            Promise.resolve(tileTerrain.data).then(success).catch(failure);
        } else {
            // Deferred - try again later.
            tileTerrain.state = TerrainState.UNLOADED;
            tileTerrain.request = undefined;
        }
    }

    doRequest();
};

const scratchCreateMeshOptions = {
    tilingScheme: undefined,
    x: 0,
    y: 0,
    level: 0,
    exaggeration: 1.0,
    exaggerationRelativeHeight: 0.0,
    throttle: true,
};
function transform(tileTerrain: any, frameState: any, terrainProvider: any, x: any, y: any, level: any) {
    const tilingScheme = terrainProvider.tilingScheme;

    const terrainData = tileTerrain.data as HeightmapTerrainData;

    // const createMeshOptions = scratchCreateMeshOptions;
    // createMeshOptions.tilingScheme = tilingScheme;
    // createMeshOptions.x = x;
    // createMeshOptions.y = y;
    // createMeshOptions.level = level;
    // createMeshOptions.exaggeration = frameState.terrainExaggeration;
    // createMeshOptions.exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
    // createMeshOptions.throttle = true;

    //根据行列号 level以及投影方式创建几何数据
    const meshPromise = terrainData.createMesh(tilingScheme, x, y, level, frameState.terrainExaggeration);

    if (!defined(meshPromise)) {
        // Postponed.
        return;
    }

    tileTerrain.state = TerrainState.TRANSFORMING;

    // when(
    //     meshPromise,
    //     function (mesh: any) {
    //         tileTerrain.mesh = mesh;
    //         tileTerrain.state = TerrainState.TRANSFORMED;
    //     },
    //     function () {
    //         tileTerrain.state = TerrainState.FAILED;
    //     }
    // );

    Promise.resolve(meshPromise)
        .then((mesh: any) => {
            tileTerrain.mesh = mesh;
            tileTerrain.state = TerrainState.TRANSFORMED;
        })
        .catch(() => {
            tileTerrain.state = TerrainState.FAILED;
        });
}

function disposeArray() {
    // this.array = null;
}

function createResources(tileTerrain: any, context: any, terrainProvider: any, x: any, y: any, level: any) {
    const geometry: any = new BufferGeometry();
    geometry.levelId = tileTerrain.mesh.levelId;

    const indexBuffers = tileTerrain.mesh.indices.indexBuffers || {};
    let indexBuffer = indexBuffers[context.id];

    if (!defined(indexBuffer)) {
        indexBuffer = new Uint16BufferAttribute(tileTerrain.mesh.indices, 1).onUpload(disposeArray);

        indexBuffers[context.id] = indexBuffer;
        tileTerrain.mesh.indices.indexBuffers = indexBuffers;
    } else {
        ++indexBuffer.referenceCount;
    }

    geometry.setIndex(indexBuffer);

    if (tileTerrain.mesh.encoding.quantization === TerrainQuantization.BITS12) {
        const vertexBuffer = new Float32BufferAttribute(tileTerrain.mesh.vertices, 4).onUpload(disposeArray);
        geometry.setAttribute('compressed0', vertexBuffer);
    } else {
        // tileTerrain.mesh.vertices
        const vertexBuffer = (new InterleavedBuffer(tileTerrain.mesh.vertices, 7) as any).onUpload(disposeArray);
        const position3DAndHeight = new InterleavedBufferAttribute(vertexBuffer, 4, 0, false);
        vertexBuffer.setUsage = StaticDrawUsage;

        const textureCoordAndEncodedNormals = new InterleavedBufferAttribute(vertexBuffer, 2, 4, false);

        geometry.setAttribute('position3DAndHeight', position3DAndHeight);
        geometry.setAttribute('textureCoordAndEncodedNormals', textureCoordAndEncodedNormals);
    }

    tileTerrain.vertexArray = tileTerrain.mesh.vertices;
    tileTerrain.geometry = geometry;
    tileTerrain.state = TerrainState.READY;
}

/**
 * Manages details of the terrain load or upsample process.
 *
 * @alias TileTerrain
 * @constructor
 * @private
 *
 * @param {TerrainData} [upsampleDetails.data] The terrain data being upsampled.
 * @param {Number} [upsampleDetails.x] The X coordinate of the tile being upsampled.
 * @param {Number} [upsampleDetails.y] The Y coordinate of the tile being upsampled.
 * @param {Number} [upsampleDetails.level] The level coordinate of the tile being upsampled.
 */

export default class TileTerrain {
    /**
     * The current state of the terrain in the terrain processing pipeline.
     * @type {TerrainState}
     * @default {@link TerrainState.UNLOADED}
     */
    state = TerrainState.UNLOADED;

    data: any = undefined;
    mesh: any = undefined;
    vertexArray: any = undefined;
    upsampleDetails: any;
    request: any = undefined;
    constructor(upsampleDetails?: any) {
        this.upsampleDetails = upsampleDetails;
    }

    processLoadStateMachine(frameState: FrameState, terrainProvider: any, x: number, y: number, level: number, priorityFunction: any): void {
        if (this.state === TerrainState.UNLOADED) {
            requestTileGeometry(this, terrainProvider, x, y, level, priorityFunction);
        }

        if (this.state === TerrainState.RECEIVED) {
            transform(this, frameState, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.TRANSFORMED) {
            createResources(this, frameState.context, terrainProvider, x, y, level);
        }
    }

    publishToTile(tile: any) {
        const surfaceTile = tile.data;

        const mesh: any = this.mesh;
        Cartesian3.clone(mesh.center, surfaceTile.center);
        surfaceTile.minimumHeight = mesh.minimumHeight;
        surfaceTile.maximumHeight = mesh.maximumHeight;
        surfaceTile.boundingSphere3D = BoundingSphere.clone(mesh.boundingSphere3D, surfaceTile.boundingSphere3D);
        surfaceTile.orientedBoundingBox = OrientedBoundingBox.clone(mesh.orientedBoundingBox, surfaceTile.orientedBoundingBox);
        surfaceTile.tileBoundingRegion.minimumHeight = mesh.minimumHeight;
        surfaceTile.tileBoundingRegion.maximumHeight = mesh.maximumHeight;
        tile.data.occludeePointInScaledSpace = Cartesian3.clone(mesh.occludeePointInScaledSpace, surfaceTile.occludeePointInScaledSpace);
    }

    freeResources() {
        this.state = TerrainState.UNLOADED;
        this.data = undefined;
        this.mesh = undefined;

        if (defined(this.vertexArray)) {
            const indexBuffer = this.vertexArray.indexBuffer;

            this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (defined(indexBuffer) && !indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }
    }
}
