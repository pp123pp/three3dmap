import BoundingSphere from './BoundingSphere';
import Cartesian3 from './Cartesian3';
import { defaultValue } from './defaultValue';
import OrientedBoundingBox from './OrientedBoundingBox';
import TerrainEncoding from './TerrainEncoding';

export default class TerrainMesh {
    /**
     * The center of the tile.  Vertex positions are specified relative to this center.
     * @type {Cartesian3}
     */
    center: Cartesian3;

    /**
     * The vertex data, including positions, texture coordinates, and heights.
     * The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
     * the Cartesian position of the vertex, H is the height above the ellipsoid, and
     * U and V are the texture coordinates.  The vertex data may have additional attributes after those
     * mentioned above when the {@link TerrainMesh#stride} is greater than 6.
     * @type {Float32Array}
     */
    vertices: Float32Array;

    /**
     * The number of components in each vertex.  Typically this is 6 for the 6 components
     * [X, Y, Z, H, U, V], but if each vertex has additional data (such as a vertex normal), this value
     * may be higher.
     * @type {Number}
     */
    stride: number;

    /**
     * The indices describing how the vertices are connected to form triangles.
     * @type {Uint8Array|Uint16Array|Uint32Array}
     */
    indices: Uint8Array | Uint16Array | Uint32Array;

    // /**
    //  * The index count of the mesh not including skirts.
    //  * @type {Number}
    //  */
    // indexCountWithoutSkirts: number;

    // /**
    //  * The vertex count of the mesh not including skirts.
    //  * @type {Number}
    //  */
    // vertexCountWithoutSkirts: number;

    /**
     * The lowest height in the tile, in meters above the ellipsoid.
     * @type {Number}
     */
    minimumHeight: number;

    /**
     * The highest height in the tile, in meters above the ellipsoid.
     * @type {Number}
     */
    maximumHeight: number;

    /**
     * A bounding sphere that completely contains the tile.
     * @type {BoundingSphere}
     */
    boundingSphere3D: BoundingSphere;

    /**
     * The occludee point of the tile, represented in ellipsoid-
     * scaled space, and used for horizon culling.  If this point is below the horizon,
     * the tile is considered to be entirely below the horizon.
     * @type {Cartesian3}
     */
    occludeePointInScaledSpace: Cartesian3;

    /**
     * A bounding box that completely contains the tile.
     * @type {OrientedBoundingBox}
     */
    orientedBoundingBox: OrientedBoundingBox;

    /**
     * Information for decoding the mesh vertices.
     * @type {TerrainEncoding}
     */
    encoding: TerrainEncoding;

    /**
     * The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
     * @type {Number[]}
     */
    westIndicesSouthToNorth: number[];

    /**
     * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
     * @type {Number[]}
     */
    southIndicesEastToWest: number[];

    /**
     * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
     * @type {Number[]}
     */
    eastIndicesNorthToSouth: number[];

    /**
     * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
     * @type {Number[]}
     */
    northIndicesWestToEast: number[];

    indexCountWithoutSkirts: any;

    vertexCountWithoutSkirts: any;

    constructor(center: any, vertices: any, indices: any, indexCountWithoutSkirts: any, vertexCountWithoutSkirts: any, minimumHeight: any, maximumHeight: any, boundingSphere3D: any, occludeePointInScaledSpace: any, vertexStride: any, orientedBoundingBox: any, encoding: any, westIndicesSouthToNorth: any, southIndicesEastToWest: any, eastIndicesNorthToSouth: any, northIndicesWestToEast: any) {
        /**
         * The center of the tile.  Vertex positions are specified relative to this center.
         * @type {Cartesian3}
         */
        this.center = center;

        /**
         * The vertex data, including positions, texture coordinates, and heights.
         * The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
         * the Cartesian position of the vertex, H is the height above the ellipsoid, and
         * U and V are the texture coordinates.  The vertex data may have additional attributes after those
         * mentioned above when the {@link TerrainMesh#stride} is greater than 6.
         * @type {Float32Array}
         */
        this.vertices = vertices;

        /**
         * The number of components in each vertex.  Typically this is 6 for the 6 components
         * [X, Y, Z, H, U, V], but if each vertex has additional data (such as a vertex normal), this value
         * may be higher.
         * @type {Number}
         */
        this.stride = defaultValue(vertexStride, 6);

        /**
         * The indices describing how the vertices are connected to form triangles.
         * @type {Uint8Array|Uint16Array|Uint32Array}
         */
        this.indices = indices;

        /**
         * The index count of the mesh not including skirts.
         * @type {Number}
         */
        this.indexCountWithoutSkirts = indexCountWithoutSkirts;

        /**
         * The vertex count of the mesh not including skirts.
         * @type {Number}
         */
        this.vertexCountWithoutSkirts = vertexCountWithoutSkirts;

        /**
         * The lowest height in the tile, in meters above the ellipsoid.
         * @type {Number}
         */
        this.minimumHeight = minimumHeight;

        /**
         * The highest height in the tile, in meters above the ellipsoid.
         * @type {Number}
         */
        this.maximumHeight = maximumHeight;

        /**
         * A bounding sphere that completely contains the tile.
         * @type {BoundingSphere}
         */
        this.boundingSphere3D = boundingSphere3D;

        /**
         * The occludee point of the tile, represented in ellipsoid-
         * scaled space, and used for horizon culling.  If this point is below the horizon,
         * the tile is considered to be entirely below the horizon.
         * @type {Cartesian3}
         */
        this.occludeePointInScaledSpace = occludeePointInScaledSpace;

        /**
         * A bounding box that completely contains the tile.
         * @type {OrientedBoundingBox}
         */
        this.orientedBoundingBox = orientedBoundingBox;

        /**
         * Information for decoding the mesh vertices.
         * @type {TerrainEncoding}
         */
        this.encoding = encoding;

        /**
         * The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
         * @type {Number[]}
         */
        this.westIndicesSouthToNorth = westIndicesSouthToNorth;

        /**
         * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
         * @type {Number[]}
         */
        this.southIndicesEastToWest = southIndicesEastToWest;

        /**
         * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
         * @type {Number[]}
         */
        this.eastIndicesNorthToSouth = eastIndicesNorthToSouth;

        /**
         * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
         * @type {Number[]}
         */
        this.northIndicesWestToEast = northIndicesWestToEast;
    }
}
