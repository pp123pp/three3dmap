import { AxisAlignedBoundingBox } from './AxisAlignedBoundingBox';
import BoundingSphere from './BoundingSphere';
import Cartesian2 from './Cartesian2';
import Cartesian3 from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import CesiumMatrix4 from './CesiumMatrix4';
import { defaultValue } from './defaultValue';
import defined from './defined';
import Ellipsoid from './Ellipsoid';
import EllipsoidalOccluder from './EllipsoidalOccluder';
import OrientedBoundingBox from './OrientedBoundingBox';
import Rectangle from './Rectangle';
import TerrainEncoding from './TerrainEncoding';
import Transforms from './Transforms';
import { WebMercatorProjection } from './WebMercatorProjection';

const cartesian3Scratch = new Cartesian3();
const matrix4Scratch = new CesiumMatrix4();
const minimumScratch = new Cartesian3();
const maximumScratch = new Cartesian3();

const HeightmapTessellator = {
    DEFAULT_STRUCTURE: Object.freeze({
        heightScale: 1.0,
        heightOffset: 0.0,
        elementsPerHeight: 1,
        stride: 1,
        elementMultiplier: 256.0,
        isBigEndian: false,
    }),

    /**
     * Fills an array of vertices from a heightmap image.
     *
     * @param {Object} options Object with the following properties:
     * @param {TypedArray} options.heightmap The heightmap to tessellate.
     * @param {Number} options.width The width of the heightmap, in height samples.
     * @param {Number} options.height The height of the heightmap, in height samples.
     * @param {Number} options.skirtHeight The height of skirts to drape at the edges of the heightmap.
     * @param {Rectangle} options.nativeRectangle A rectangle in the native coordinates of the heightmap's projection.  For
     *                 a heightmap with a geographic projection, this is degrees.  For the web mercator
     *                 projection, this is meters.
     * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
     * @param {Rectangle} [options.rectangle] The rectangle covered by the heightmap, in geodetic coordinates with north, south, east and
     *                 west properties in radians.  Either rectangle or nativeRectangle must be provided.  If both
     *                 are provided, they're assumed to be consistent.
     * @param {Boolean} [options.isGeographic=true] True if the heightmap uses a {@link GeographicProjection}, or false if it uses
     *                  a {@link WebMercatorProjection}.
     * @param {Cartesian3} [options.relativeToCenter=Cartesian3.ZERO] The positions will be computed as <code>Cartesian3.subtract(worldPosition, relativeToCenter)</code>.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to which the heightmap applies.
     * @param {Object} [options.structure] An object describing the structure of the height data.
     * @param {Number} [options.structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
     *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
     *                 height after multiplying by the scale.
     * @param {Number} [options.structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
     *                 height in meters.  The offset is added after the height sample is multiplied by the
     *                 heightScale.
     * @param {Number} [options.structure.elementsPerHeight=1] The number of elements in the buffer that make up a single height
     *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
     *                 it is greater than 1, that number of elements together form the height sample, which is
     *                 computed according to the structure.elementMultiplier and structure.isBigEndian properties.
     * @param {Number} [options.structure.stride=1] The number of elements to skip to get from the first element of
     *                 one height to the first element of the next height.
     * @param {Number} [options.structure.elementMultiplier=256.0] The multiplier used to compute the height value when the
     *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
     *                 is 256, the height is computed as follows:
     *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
     *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
     *                 elements is reversed.
     * @param {Number} [options.structure.lowestEncodedHeight] The lowest value that can be stored in the height buffer.  Any heights that are lower
     *                 than this value after encoding with the `heightScale` and `heightOffset` are clamped to this value.  For example, if the height
     *                 buffer is a `Uint16Array`, this value should be 0 because a `Uint16Array` cannot store negative numbers.  If this parameter is
     *                 not specified, no minimum value is enforced.
     * @param {Number} [options.structure.highestEncodedHeight] The highest value that can be stored in the height buffer.  Any heights that are higher
     *                 than this value after encoding with the `heightScale` and `heightOffset` are clamped to this value.  For example, if the height
     *                 buffer is a `Uint16Array`, this value should be `256 * 256 - 1` or 65535 because a `Uint16Array` cannot store numbers larger
     *                 than 65535.  If this parameter is not specified, no maximum value is enforced.
     * @param {Boolean} [options.structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
     *                  stride property is greater than 1.  If this property is false, the first element is the
     *                  low-order element.  If it is true, the first element is the high-order element.
     *
     * @example
     * let width = 5;
     * let height = 5;
     * let statistics = Cesium.HeightmapTessellator.computeVertices({
     *     heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
     *     width : width,
     *     height : height,
     *     skirtHeight : 0.0,
     *     nativeRectangle : {
     *         west : 10.0,
     *         east : 20.0,
     *         south : 30.0,
     *         north : 40.0
     *     }
     * });
     *
     * let encoding = statistics.encoding;
     * let position = encoding.decodePosition(statistics.vertices, index * encoding.getStride());
     */
    computeVertices(options: {
        heightmap: any;
        width: number;
        height: number;
        skirtHeight: number;
        nativeRectangle: Rectangle;
        exaggeration: number;
        rectangle: Rectangle;
        isGeographic: boolean;
        relativeToCenter: Cartesian3;
        includeWebMercatorT: boolean;
        ellipsoid: Ellipsoid;
        structure: {
            heightScale: number;
            heightOffset: number;
            elementsPerHeight: number;
            stride: number;
            elementMultiplier: number;
            lowestEncodedHeight: number;
            highestEncodedHeight: number;
            isBigEndian: boolean;
        };
    }) {
        // This function tends to be a performance hotspot for terrain rendering,
        // so it employs a lot of inlining and unrolling as an optimization.
        // In particular, the functionality of Ellipsoid.cartographicToCartesian
        // is inlined.

        const cos = Math.cos;
        const sin = Math.sin;
        const sqrt = Math.sqrt;
        const atan = Math.atan;
        const exp = Math.exp;
        const piOverTwo = CesiumMath.PI_OVER_TWO;
        const toRadians = CesiumMath.toRadians;

        const heightmap = options.heightmap;
        const width = options.width;
        const height = options.height;
        const skirtHeight = options.skirtHeight;

        const isGeographic = defaultValue(options.isGeographic, true);
        const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        const oneOverGlobeSemimajorAxis = 1.0 / ellipsoid.maximumRadius;

        const nativeRectangle = options.nativeRectangle;

        let geographicWest;
        let geographicSouth;
        let geographicEast;
        let geographicNorth;

        const rectangle = options.rectangle;
        if (!defined(rectangle)) {
            if (isGeographic) {
                geographicWest = toRadians(nativeRectangle.west);
                geographicSouth = toRadians(nativeRectangle.south);
                geographicEast = toRadians(nativeRectangle.east);
                geographicNorth = toRadians(nativeRectangle.north);
            } else {
                geographicWest = nativeRectangle.west * oneOverGlobeSemimajorAxis;
                geographicSouth = piOverTwo - 2.0 * atan(exp(-nativeRectangle.south * oneOverGlobeSemimajorAxis));
                geographicEast = nativeRectangle.east * oneOverGlobeSemimajorAxis;
                geographicNorth = piOverTwo - 2.0 * atan(exp(-nativeRectangle.north * oneOverGlobeSemimajorAxis));
            }
        } else {
            geographicWest = rectangle.west;
            geographicSouth = rectangle.south;
            geographicEast = rectangle.east;
            geographicNorth = rectangle.north;
        }

        let relativeToCenter = options.relativeToCenter;
        const hasRelativeToCenter = defined(relativeToCenter);
        relativeToCenter = hasRelativeToCenter ? relativeToCenter : Cartesian3.ZERO;
        const exaggeration = defaultValue(options.exaggeration, 1.0);
        const includeWebMercatorT = defaultValue(options.includeWebMercatorT, false);

        const structure = defaultValue(options.structure, HeightmapTessellator.DEFAULT_STRUCTURE);
        const heightScale = defaultValue(structure.heightScale, HeightmapTessellator.DEFAULT_STRUCTURE.heightScale);
        const heightOffset = defaultValue(structure.heightOffset, HeightmapTessellator.DEFAULT_STRUCTURE.heightOffset);
        const elementsPerHeight = defaultValue(structure.elementsPerHeight, HeightmapTessellator.DEFAULT_STRUCTURE.elementsPerHeight);
        const stride = defaultValue(structure.stride, HeightmapTessellator.DEFAULT_STRUCTURE.stride);
        const elementMultiplier = defaultValue(structure.elementMultiplier, HeightmapTessellator.DEFAULT_STRUCTURE.elementMultiplier);
        const isBigEndian = defaultValue(structure.isBigEndian, HeightmapTessellator.DEFAULT_STRUCTURE.isBigEndian);

        let rectangleWidth = Rectangle.computeWidth(nativeRectangle);
        let rectangleHeight = Rectangle.computeHeight(nativeRectangle);

        const granularityX = rectangleWidth / (width - 1);
        const granularityY = rectangleHeight / (height - 1);

        if (!isGeographic) {
            rectangleWidth *= oneOverGlobeSemimajorAxis;
            rectangleHeight *= oneOverGlobeSemimajorAxis;
        }

        const radiiSquared = ellipsoid.radiiSquared;
        const radiiSquaredX = radiiSquared.x;
        const radiiSquaredY = radiiSquared.y;
        const radiiSquaredZ = radiiSquared.z;

        let minimumHeight = 65536.0;
        let maximumHeight = -65536.0;

        const fromENU = (Transforms as any).eastNorthUpToFixedFrame(relativeToCenter, ellipsoid);
        const toENU = CesiumMatrix4.inverseTransformation(fromENU, matrix4Scratch);

        let southMercatorY = 0.0;
        let oneOverMercatorHeight = 0.0;
        if (includeWebMercatorT) {
            southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(geographicSouth);
            oneOverMercatorHeight = 1.0 / (WebMercatorProjection.geodeticLatitudeToMercatorAngle(geographicNorth) - southMercatorY);
        }

        const minimum = minimumScratch;
        minimum.x = Number.POSITIVE_INFINITY;
        minimum.y = Number.POSITIVE_INFINITY;
        minimum.z = Number.POSITIVE_INFINITY;

        const maximum = maximumScratch;
        maximum.x = Number.NEGATIVE_INFINITY;
        maximum.y = Number.NEGATIVE_INFINITY;
        maximum.z = Number.NEGATIVE_INFINITY;

        let hMin = Number.POSITIVE_INFINITY;

        const arrayWidth = width + (skirtHeight > 0.0 ? 2.0 : 0.0);
        const arrayHeight = height + (skirtHeight > 0.0 ? 2.0 : 0.0);
        const size = arrayWidth * arrayHeight;
        const positions = new Array(size);
        const heights = new Array(size);
        const uvs = new Array(size);
        const webMercatorTs = includeWebMercatorT ? new Array(size) : [];

        let startRow = 0;
        let endRow = height;
        let startCol = 0;
        let endCol = width;

        if (skirtHeight > 0) {
            --startRow;
            ++endRow;
            --startCol;
            ++endCol;
        }

        let index = 0;

        for (let rowIndex = startRow; rowIndex < endRow; ++rowIndex) {
            let row = rowIndex;
            if (row < 0) {
                row = 0;
            }
            if (row >= height) {
                row = height - 1;
            }

            let latitude = nativeRectangle.north - granularityY * row;

            if (!isGeographic) {
                latitude = piOverTwo - 2.0 * atan(exp(-latitude * oneOverGlobeSemimajorAxis));
            } else {
                latitude = toRadians(latitude);
            }

            let cosLatitude = cos(latitude);
            let nZ = sin(latitude);
            let kZ = radiiSquaredZ * nZ;

            let v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);
            v = CesiumMath.clamp(v, 0.0, 1.0);

            let webMercatorT;
            if (includeWebMercatorT) {
                webMercatorT = (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) - southMercatorY) * oneOverMercatorHeight;
            }

            for (let colIndex = startCol; colIndex < endCol; ++colIndex) {
                let col = colIndex;
                if (col < 0) {
                    col = 0;
                }
                if (col >= width) {
                    col = width - 1;
                }

                let longitude = nativeRectangle.west + granularityX * col;

                if (!isGeographic) {
                    longitude *= oneOverGlobeSemimajorAxis;
                } else {
                    longitude = toRadians(longitude);
                }

                const terrainOffset = row * (width * stride) + col * stride;

                let heightSample;
                if (elementsPerHeight === 1) {
                    heightSample = heightmap[terrainOffset];
                } else {
                    heightSample = 0;

                    let elementOffset;
                    if (isBigEndian) {
                        for (elementOffset = 0; elementOffset < elementsPerHeight; ++elementOffset) {
                            heightSample = heightSample * elementMultiplier + heightmap[terrainOffset + elementOffset];
                        }
                    } else {
                        for (elementOffset = elementsPerHeight - 1; elementOffset >= 0; --elementOffset) {
                            heightSample = heightSample * elementMultiplier + heightmap[terrainOffset + elementOffset];
                        }
                    }
                }

                heightSample = (heightSample * heightScale + heightOffset) * exaggeration;

                let u = (longitude - geographicWest) / (geographicEast - geographicWest);
                u = CesiumMath.clamp(u, 0.0, 1.0);
                uvs[index] = new Cartesian2(u, v);

                maximumHeight = Math.max(maximumHeight, heightSample);
                minimumHeight = Math.min(minimumHeight, heightSample);

                if (colIndex !== col || rowIndex !== row) {
                    const percentage = 0.00001;
                    if (colIndex < 0) {
                        longitude -= percentage * rectangleWidth;
                    } else {
                        longitude += percentage * rectangleWidth;
                    }
                    if (rowIndex < 0) {
                        latitude += percentage * rectangleHeight;
                    } else {
                        latitude -= percentage * rectangleHeight;
                    }

                    cosLatitude = cos(latitude);
                    nZ = sin(latitude);
                    kZ = radiiSquaredZ * nZ;
                    heightSample -= skirtHeight;
                }

                const nX = cosLatitude * cos(longitude);
                const nY = cosLatitude * sin(longitude);

                const kX = radiiSquaredX * nX;
                const kY = radiiSquaredY * nY;

                const gamma = sqrt(kX * nX + kY * nY + kZ * nZ);
                const oneOverGamma = 1.0 / gamma;

                const rSurfaceX = kX * oneOverGamma;
                const rSurfaceY = kY * oneOverGamma;
                const rSurfaceZ = kZ * oneOverGamma;

                const position = new Cartesian3();
                position.x = rSurfaceX + nX * heightSample;
                position.y = rSurfaceY + nY * heightSample;
                position.z = rSurfaceZ + nZ * heightSample;

                positions[index] = position;
                heights[index] = heightSample;

                if (includeWebMercatorT) {
                    webMercatorTs[index] = webMercatorT;
                }

                index++;

                CesiumMatrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

                Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
                Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
                hMin = Math.min(hMin, heightSample);
            }
        }

        const boundingSphere3D = BoundingSphere.fromPoints(positions);
        let orientedBoundingBox;
        if (defined(rectangle) && rectangle.width < CesiumMath.PI_OVER_TWO + CesiumMath.EPSILON5) {
            // Here, rectangle.width < pi/2, and rectangle.height < pi
            // (though it would still work with rectangle.width up to pi)
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);
        }

        let occludeePointInScaledSpace;
        if (hasRelativeToCenter) {
            const occluder = new EllipsoidalOccluder(ellipsoid);
            occludeePointInScaledSpace = occluder.computeHorizonCullingPoint(relativeToCenter, positions);
        }

        const aaBox = new AxisAlignedBoundingBox(minimum, maximum, relativeToCenter);
        const encoding = new TerrainEncoding(aaBox, hMin, maximumHeight, fromENU, false, includeWebMercatorT);
        const vertices = new Float32Array(size * encoding.getStride());

        let bufferIndex = 0;
        for (let j = 0; j < size; ++j) {
            bufferIndex = encoding.encode(vertices, bufferIndex, positions[j], uvs[j], heights[j], undefined, webMercatorTs[j]);
        }

        return {
            vertices: vertices,
            maximumHeight: maximumHeight,
            minimumHeight: minimumHeight,
            encoding: encoding,
            boundingSphere3D: boundingSphere3D,
            orientedBoundingBox: orientedBoundingBox,
            occludeePointInScaledSpace: occludeePointInScaledSpace,
        };
    },
};

export default HeightmapTessellator;
