import Cartesian3 from './Cartesian3';
import createVerticesFromQuantizedTerrainMesh from './createVerticesFromQuantizedTerrainMesh';
import defaultValue from './defaultValue';
import defined from './defined';
import IndexDatatype from './IndexDatatype';
import TerrainEncoding from './TerrainEncoding';
import TerrainMesh from './TerrainMesh';

export default class QuantizedMeshTerrainData {
    _quantizedVertices: any;
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

    _westIndices: any;
    _southIndices: any;
    _eastIndices: any;
    _northIndices: any;

    _westSkirtHeight: any;
    _southSkirtHeight: any;
    _eastSkirtHeight: any;
    _northSkirtHeight: any;

    _childTileMask: any;
    _createdByUpsampling: any;
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
        function sortByV(a: any, b: any) {
            return vValues[a] - vValues[b];
        }

        function sortByU(a: any, b: any) {
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
    createMesh(options: any) {
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
            that._mesh = new TerrainMesh(rtc, vertices, indicesTypedArray as any, result.indexCountWithoutSkirts, vertexCountWithoutSkirts, minimumHeight, maximumHeight, boundingSphere, occludeePointInScaledSpace, stride, obb, terrainEncoding, result.westIndicesSouthToNorth, result.southIndicesEastToWest, result.eastIndicesNorthToSouth, result.northIndicesWestToEast);

            // Free memory received from server after mesh is created.
            that._quantizedVertices = undefined;
            that._encodedNormals = undefined;
            that._indices = undefined;

            that._uValues = undefined;
            that._vValues = undefined;
            that._heightValues = undefined;

            that._westIndices = undefined;
            that._southIndices = undefined;
            that._eastIndices = undefined;
            that._northIndices = undefined;

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
