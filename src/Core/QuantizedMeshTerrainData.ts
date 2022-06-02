import { TilingScheme, typeIntArray } from '@/Type';
import BoundingSphere from './BoundingSphere';
import Cartesian3 from './Cartesian3';
import createVerticesFromQuantizedTerrainMesh from './createVerticesFromQuantizedTerrainMesh';
import defaultValue from './defaultValue';
import defined from './defined';
import DeveloperError from './DeveloperError';
import IndexDatatype from './IndexDatatype';
import OrientedBoundingBox from './OrientedBoundingBox';
import TerrainEncoding from './TerrainEncoding';
import TerrainMesh from './TerrainMesh';
import upsampleQuantizedTerrainMesh from './upsampleQuantizedTerrainMesh';

export default class QuantizedMeshTerrainData {
    _quantizedVertices: typeIntArray;
    _encodedNormals: any;
    _indices: any;
    _minimumHeight: any;
    _maximumHeight: any;
    _boundingSphere: any;
    _orientedBoundingBox: any;
    _horizonOcclusionPoint: any;
    _credits: any;
    _uValues: any;
    _vValues: any;
    _heightValues: any;

    _westIndices: Uint16Array;
    _southIndices: Uint16Array;
    _eastIndices: Uint16Array;
    _northIndices: Uint16Array;

    _westSkirtHeight: number;
    _southSkirtHeight: number;
    _eastSkirtHeight: number;
    _northSkirtHeight: number;

    _childTileMask: number;
    _createdByUpsampling: boolean;
    _waterMask: any;
    _mesh: any;
    constructor(options: any) {
        this._quantizedVertices = options.quantizedVertices;
        this._encodedNormals = options.encodedNormals;
        this._indices = options.indices;
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._boundingSphere = options.boundingSphere;
        this._orientedBoundingBox = options.orientedBoundingBox;
        this._horizonOcclusionPoint = options.horizonOcclusionPoint;
        this._credits = options.credits;

        const vertexCount = this._quantizedVertices.length / 3;
        const uValues = (this._uValues = this._quantizedVertices.subarray(0, vertexCount));
        const vValues = (this._vValues = this._quantizedVertices.subarray(vertexCount, 2 * vertexCount));
        this._heightValues = this._quantizedVertices.subarray(2 * vertexCount, 3 * vertexCount);

        // We don't assume that we can count on the edge vertices being sorted by u or v.
        function sortByV(a: number, b: number) {
            return vValues[a] - vValues[b];
        }

        function sortByU(a: number, b: number) {
            return uValues[a] - uValues[b];
        }

        this._westIndices = sortIndicesIfNecessary(options.westIndices, sortByV, vertexCount);
        this._southIndices = sortIndicesIfNecessary(options.southIndices, sortByU, vertexCount);
        this._eastIndices = sortIndicesIfNecessary(options.eastIndices, sortByV, vertexCount);
        this._northIndices = sortIndicesIfNecessary(options.northIndices, sortByU, vertexCount);

        this._westSkirtHeight = options.westSkirtHeight;
        this._southSkirtHeight = options.southSkirtHeight;
        this._eastSkirtHeight = options.eastSkirtHeight;
        this._northSkirtHeight = options.northSkirtHeight;

        this._childTileMask = defaultValue(options.childTileMask, 15);

        this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);
        this._waterMask = options.waterMask;

        this._mesh = undefined;
    }

    get credits(): any {
        return this._credits;
    }

    get waterMask(): any {
        return this._waterMask;
    }

    get childTileMask(): any {
        return this._childTileMask;
    }

    get canUpsample(): boolean {
        return defined(this._mesh);
    }

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @private
     *
     * @param {Object} options Object with the following properties:
     * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} options.x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} options.y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} options.level The level of the tile for which to create the terrain data.
     * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
     * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
     * @param {Boolean} [options.throttle=true] If true, indicates that this operation will need to be retried if too many asynchronous mesh creations are already in progress.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    createMesh(options: { tilingScheme: TilingScheme; x: number; y: number; level: number; exaggeration?: number; exaggerationRelativeHeight?: number; throttle?: boolean }): Promise<TerrainMesh> | undefined {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        const tilingScheme = options.tilingScheme;
        const x = options.x;
        const y = options.y;
        const level = options.level;
        const exaggeration = defaultValue(options.exaggeration, 1.0);
        const exaggerationRelativeHeight = defaultValue(options.exaggerationRelativeHeight, 0.0);
        // const throttle = defaultValue(options.throttle, true);

        const ellipsoid = tilingScheme.ellipsoid;
        const rectangle = tilingScheme.tileXYToRectangle(x, y, level);

        // const createMeshTaskProcessor = throttle
        //     ? createMeshTaskProcessorThrottle
        //     : createMeshTaskProcessorNoThrottle;

        //   const verticesPromise = createMeshTaskProcessor.scheduleTask({
        //     minimumHeight: this._minimumHeight,
        //     maximumHeight: this._maximumHeight,
        //     quantizedVertices: this._quantizedVertices,
        //     octEncodedNormals: this._encodedNormals,
        //     includeWebMercatorT: true,
        //     indices: this._indices,
        //     westIndices: this._westIndices,
        //     southIndices: this._southIndices,
        //     eastIndices: this._eastIndices,
        //     northIndices: this._northIndices,
        //     westSkirtHeight: this._westSkirtHeight,
        //     southSkirtHeight: this._southSkirtHeight,
        //     eastSkirtHeight: this._eastSkirtHeight,
        //     northSkirtHeight: this._northSkirtHeight,
        //     rectangle: rectangle,
        //     relativeToCenter: this._boundingSphere.center,
        //     ellipsoid: ellipsoid,
        //     exaggeration: exaggeration,
        //     exaggerationRelativeHeight: exaggerationRelativeHeight,
        //   });

        const verticesPromise = createVerticesFromQuantizedTerrainMesh({
            minimumHeight: this._minimumHeight,
            maximumHeight: this._maximumHeight,
            quantizedVertices: this._quantizedVertices,
            octEncodedNormals: this._encodedNormals,
            includeWebMercatorT: true,
            indices: this._indices,
            westIndices: this._westIndices,
            southIndices: this._southIndices,
            eastIndices: this._eastIndices,
            northIndices: this._northIndices,
            westSkirtHeight: this._westSkirtHeight,
            southSkirtHeight: this._southSkirtHeight,
            eastSkirtHeight: this._eastSkirtHeight,
            northSkirtHeight: this._northSkirtHeight,
            rectangle: rectangle,
            relativeToCenter: this._boundingSphere.center,
            ellipsoid: ellipsoid,
            exaggeration: exaggeration,
            exaggerationRelativeHeight: exaggerationRelativeHeight,
        });

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        const that = this;
        return Promise.resolve(verticesPromise).then(function (result) {
            const vertexCountWithoutSkirts = that._quantizedVertices.length / 3;
            const vertexCount = vertexCountWithoutSkirts + that._westIndices.length + that._southIndices.length + that._eastIndices.length + that._northIndices.length;
            const indicesTypedArray = IndexDatatype.createTypedArray(vertexCount, result.indices);

            const vertices = new Float32Array(result.vertices);
            const rtc = result.center;
            const minimumHeight = result.minimumHeight;
            const maximumHeight = result.maximumHeight;
            const boundingSphere = that._boundingSphere;
            const obb = that._orientedBoundingBox;
            const occludeePointInScaledSpace = defaultValue(Cartesian3.clone(result.occludeePointInScaledSpace as Cartesian3), that._horizonOcclusionPoint);
            const stride = result.vertexStride;
            const terrainEncoding = TerrainEncoding.clone(result.encoding);

            // Clone complex result objects because the transfer from the web worker
            // has stripped them down to JSON-style objects.
            that._mesh = new TerrainMesh(rtc, vertices, indicesTypedArray, result.indexCountWithoutSkirts, vertexCountWithoutSkirts, minimumHeight, maximumHeight, boundingSphere, occludeePointInScaledSpace, stride, obb, terrainEncoding, result.westIndicesSouthToNorth, result.southIndicesEastToWest, result.eastIndicesNorthToSouth, result.northIndicesWestToEast);

            // Free memory received from server after mesh is created.
            that._quantizedVertices = undefined as any;
            that._encodedNormals = undefined;
            that._indices = undefined;

            that._uValues = undefined;
            that._vValues = undefined;
            that._heightValues = undefined;

            that._westIndices = undefined as any;
            that._southIndices = undefined as any;
            that._eastIndices = undefined as any;
            that._northIndices = undefined as any;

            return that._mesh;
        });
    }

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    wasCreatedByUpsampling(): boolean {
        return this._createdByUpsampling;
    }

    /**
     * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
     * vertices in this instance, interpolated if necessary.
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     * @returns {Promise.<QuantizedMeshTerrainData>|undefined} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    upsample(tilingScheme: TilingScheme, thisX: number, thisY: number, thisLevel: number, descendantX: number, descendantY: number, descendantLevel: number): any {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (!defined(thisX)) {
            throw new DeveloperError('thisX is required.');
        }
        if (!defined(thisY)) {
            throw new DeveloperError('thisY is required.');
        }
        if (!defined(thisLevel)) {
            throw new DeveloperError('thisLevel is required.');
        }
        if (!defined(descendantX)) {
            throw new DeveloperError('descendantX is required.');
        }
        if (!defined(descendantY)) {
            throw new DeveloperError('descendantY is required.');
        }
        if (!defined(descendantLevel)) {
            throw new DeveloperError('descendantLevel is required.');
        }
        const levelDifference = descendantLevel - thisLevel;
        if (levelDifference > 1) {
            throw new DeveloperError('Upsampling through more than one level at a time is not currently supported.');
        }
        //>>includeEnd('debug');

        const mesh = this._mesh;
        if (!defined(this._mesh)) {
            return undefined;
        }

        const isEastChild = thisX * 2 !== descendantX;
        const isNorthChild = thisY * 2 === descendantY;

        const ellipsoid = tilingScheme.ellipsoid;
        const childRectangle = tilingScheme.tileXYToRectangle(descendantX, descendantY, descendantLevel);

        // let upsamplePromise = upsampleTaskProcessor.scheduleTask({
        //     vertices: mesh.vertices,
        //     vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
        //     indices: mesh.indices,
        //     indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
        //     encoding: mesh.encoding,
        //     minimumHeight: this._minimumHeight,
        //     maximumHeight: this._maximumHeight,
        //     isEastChild: isEastChild,
        //     isNorthChild: isNorthChild,
        //     childRectangle: childRectangle,
        //     ellipsoid: ellipsoid,
        // });

        const upsamplePromise = upsampleQuantizedTerrainMesh({
            vertices: mesh.vertices,
            vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
            indices: mesh.indices,
            indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
            encoding: mesh.encoding,
            minimumHeight: this._minimumHeight,
            maximumHeight: this._maximumHeight,
            isEastChild: isEastChild,
            isNorthChild: isNorthChild,
            childRectangle: childRectangle,
            ellipsoid: ellipsoid,
        });

        if (!defined(upsamplePromise)) {
            // Postponed
            return undefined;
        }

        let shortestSkirt = Math.min(this._westSkirtHeight, this._eastSkirtHeight);
        shortestSkirt = Math.min(shortestSkirt, this._southSkirtHeight);
        shortestSkirt = Math.min(shortestSkirt, this._northSkirtHeight);

        const westSkirtHeight = isEastChild ? shortestSkirt * 0.5 : this._westSkirtHeight;
        const southSkirtHeight = isNorthChild ? shortestSkirt * 0.5 : this._southSkirtHeight;
        const eastSkirtHeight = isEastChild ? this._eastSkirtHeight : shortestSkirt * 0.5;
        const northSkirtHeight = isNorthChild ? this._northSkirtHeight : shortestSkirt * 0.5;
        const credits = this._credits;

        return Promise.resolve(upsamplePromise).then(function (result) {
            const quantizedVertices = new Uint16Array(result.vertices);
            const indicesTypedArray = IndexDatatype.createTypedArray(quantizedVertices.length / 3, result.indices);
            let encodedNormals;
            if (defined(result.encodedNormals)) {
                encodedNormals = new Uint8Array(result.encodedNormals as any);
            }

            return new QuantizedMeshTerrainData({
                quantizedVertices: quantizedVertices,
                indices: indicesTypedArray,
                encodedNormals: encodedNormals,
                minimumHeight: result.minimumHeight,
                maximumHeight: result.maximumHeight,
                boundingSphere: BoundingSphere.clone(result.boundingSphere),
                orientedBoundingBox: OrientedBoundingBox.clone(result.orientedBoundingBox),
                horizonOcclusionPoint: Cartesian3.clone(result.horizonOcclusionPoint),
                westIndices: result.westIndices,
                southIndices: result.southIndices,
                eastIndices: result.eastIndices,
                northIndices: result.northIndices,
                westSkirtHeight: westSkirtHeight,
                southSkirtHeight: southSkirtHeight,
                eastSkirtHeight: eastSkirtHeight,
                northSkirtHeight: northSkirtHeight,
                childTileMask: 0,
                credits: credits,
                createdByUpsampling: true,
            });
        });
    }
}

const arrayScratch: any[] = [];

function sortIndicesIfNecessary(indices: any, sortFunction: any, vertexCount: any) {
    arrayScratch.length = indices.length;

    let needsSort = false;
    for (let i = 0, len = indices.length; i < len; ++i) {
        arrayScratch[i] = indices[i];
        needsSort = needsSort || (i > 0 && sortFunction(indices[i - 1], indices[i]) > 0);
    }

    if (needsSort) {
        arrayScratch.sort(sortFunction);
        return IndexDatatype.createTypedArray(vertexCount, arrayScratch);
    }
    return indices;
}
