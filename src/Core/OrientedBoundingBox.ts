import Cartesian2 from './Cartesian2';
import Cartesian3 from './Cartesian3';
import Cartographic from './Cartographic';
import { CesiumMath } from './CesiumMath';
import CesiumMatrix3 from './CesiumMatrix3';
import CesiumPlane from './CesiumPlane';
import { defaultValue } from './defaultValue';
import defined from './defined';
import DeveloperError from './DeveloperError';
import Ellipsoid from './Ellipsoid';
import { EllipsoidTangentPlane } from './EllipsoidTangentPlane';
import Rectangle from './Rectangle';

const scratchCartesian1 = new Cartesian3();
const scratchVector2 = new Cartesian3();
const scratchCartesian3 = new Cartesian3();
const scratchCartesian4 = new Cartesian3();
const scratchCartesian5 = new Cartesian3();
const scratchCartesian6 = new Cartesian3();
const scratchCovarianceResult = new CesiumMatrix3();
const scratchEigenResult = {
    unitary: new CesiumMatrix3(),
    diagonal: new CesiumMatrix3(),
};

const scratchOffset = new Cartesian3();
const scratchScale = new Cartesian3();
function fromPlaneExtents(planeOrigin: Cartesian3, planeXAxis: Cartesian3, planeYAxis: Cartesian3, planeZAxis: Cartesian3, minimumX: number, maximumX: number, minimumY: number, maximumY: number, minimumZ: number, maximumZ: number, result = new OrientedBoundingBox()) {
    const halfAxes = result.halfAxes;
    CesiumMatrix3.setColumn(halfAxes, 0, planeXAxis, halfAxes);
    CesiumMatrix3.setColumn(halfAxes, 1, planeYAxis, halfAxes);
    CesiumMatrix3.setColumn(halfAxes, 2, planeZAxis, halfAxes);

    let centerOffset = scratchOffset;
    centerOffset.x = (minimumX + maximumX) / 2.0;
    centerOffset.y = (minimumY + maximumY) / 2.0;
    centerOffset.z = (minimumZ + maximumZ) / 2.0;

    const scale = scratchScale;
    scale.x = (maximumX - minimumX) / 2.0;
    scale.y = (maximumY - minimumY) / 2.0;
    scale.z = (maximumZ - minimumZ) / 2.0;

    const center = result.center;
    centerOffset = CesiumMatrix3.multiplyByVector(halfAxes, centerOffset, centerOffset);
    Cartesian3.add(planeOrigin, centerOffset, center);
    CesiumMatrix3.multiplyByScale(halfAxes, scale, halfAxes);

    return result;
}

const scratchRectangleCenterCartographic = new Cartographic();
const scratchRectangleCenter = new Cartesian3();
const scratchPerimeterCartographicNC = new Cartographic();
const scratchPerimeterCartographicNW = new Cartographic();
const scratchPerimeterCartographicCW = new Cartographic();
const scratchPerimeterCartographicSW = new Cartographic();
const scratchPerimeterCartographicSC = new Cartographic();
const scratchPerimeterCartesianNC = new Cartesian3();
const scratchPerimeterCartesianNW = new Cartesian3();
const scratchPerimeterCartesianCW = new Cartesian3();
const scratchPerimeterCartesianSW = new Cartesian3();
const scratchPerimeterCartesianSC = new Cartesian3();
const scratchPerimeterProjectedNC = new Cartesian2();
const scratchPerimeterProjectedNW = new Cartesian2();
const scratchPerimeterProjectedCW = new Cartesian2();
const scratchPerimeterProjectedSW = new Cartesian2();
const scratchPerimeterProjectedSC = new Cartesian2();

const scratchPlaneOrigin = new Cartesian3();
const scratchPlaneNormal = new Cartesian3();
const scratchPlaneXAxis = new Cartesian3();
const scratchHorizonCartesian = new Cartesian3();
const scratchHorizonProjected = new Cartesian2();
const scratchMaxY = new Cartesian3();
const scratchMinY = new Cartesian3();
const scratchZ = new Cartesian3();
const scratchPlane = new CesiumPlane(Cartesian3.UNIT_X, 0.0);

/**
 * Creates an instance of an OrientedBoundingBox.
 * An OrientedBoundingBox of some object is a closed and convex cuboid. It can provide a tighter bounding volume than {@link BoundingSphere} or {@link AxisAlignedBoundingBox} in many cases.
 * @alias OrientedBoundingBox
 * @constructor
 *
 * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
 * @param {Matrix3} [halfAxes=CesiumMatrix3.ZERO] The three orthogonal half-axes of the bounding box.
 *                                          Equivalently, the transformation matrix, to rotate and scale a 0x0x0
 *                                          cube centered at the origin.
 *
 *
 * @example
 * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
 * var center = new Cesium.Cartesian3(1.0, 0.0, 0.0);
 * var halfAxes = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(1.0, 3.0, 2.0), new Cesium.Matrix3());
 *
 * var obb = new Cesium.OrientedBoundingBox(center, halfAxes);
 *
 * @see BoundingSphere
 * @see BoundingRectangle
 */
export default class OrientedBoundingBox {
    /**
     * The center of the box.
     * @type {Cartesian3}
     * @default {@link Cartesian3.ZERO}
     */
    center: Cartesian3;

    /**
     * The transformation matrix, to rotate the box to the right position.
     * @type {CesiumMatrix3}
     * @default {@link Matrix3.ZERO}
     */
    halfAxes: CesiumMatrix3;
    constructor(center = Cartesian3.ZERO, halfAxes = CesiumMatrix3.ZERO) {
        // this.center = center;
        // this.halfAxes = halfAxes;

        /**
         * The center of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));
        /**
         * The transformation matrix, to rotate the box to the right position.
         * @type {Matrix3}
         * @default {@link Matrix3.ZERO}
         */
        this.halfAxes = CesiumMatrix3.clone(defaultValue(halfAxes, CesiumMatrix3.ZERO));
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    static packedLength = Cartesian3.packedLength + CesiumMatrix3.packedLength;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {OrientedBoundingBox} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    static pack(value: OrientedBoundingBox, array: number[], startingIndex = 0): number[] {
        Cartesian3.pack(value.center, array, startingIndex);
        CesiumMatrix3.pack(value.halfAxes, array, startingIndex + Cartesian3.packedLength);

        return array;
    }

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {OrientedBoundingBox} [result] The object into which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
     */
    static unpack(array: number[], startingIndex = 0, result = new OrientedBoundingBox()): OrientedBoundingBox {
        Cartesian3.unpack(array, startingIndex, result.center);
        CesiumMatrix3.unpack(array, startingIndex + Cartesian3.packedLength, result.halfAxes);
        return result;
    }

    /**
     * Duplicates a OrientedBoundingBox instance.
     *
     * @param {OrientedBoundingBox} box The bounding box to duplicate.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
     */
    static clone(box: OrientedBoundingBox, result = new OrientedBoundingBox()): OrientedBoundingBox | undefined {
        if (!defined(box)) {
            return undefined;
        }

        Cartesian3.clone(box.center, result.center);
        CesiumMatrix3.clone(box.halfAxes, result.halfAxes);

        return result;
    }

    /**
     * Computes an OrientedBoundingBox that bounds a {@link Rectangle} on the surface of an {@link Ellipsoid}.
     * There are no guarantees about the orientation of the bounding box.
     *
     * @param {Rectangle} rectangle The cartographic rectangle on the surface of the ellipsoid.
     * @param {Number} [minimumHeight=0.0] The minimum height (elevation) within the tile.
     * @param {Number} [maximumHeight=0.0] The maximum height (elevation) within the tile.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle is defined.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
     *
     * @exception {DeveloperError} rectangle.width must be between 0 and pi.
     * @exception {DeveloperError} rectangle.height must be between 0 and pi.
     * @exception {DeveloperError} ellipsoid must be an ellipsoid of revolution (<code>radii.x == radii.y</code>)
     */
    static fromRectangle(rectangle: Rectangle, minimumHeight = 0.0, maximumHeight = 0.0, ellipsoid = Ellipsoid.WGS84, result = new OrientedBoundingBox()): OrientedBoundingBox {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        if (rectangle.width < 0.0 || rectangle.width > CesiumMath.TWO_PI) {
            throw new DeveloperError('Rectangle width must be between 0 and 2*pi');
        }
        if (rectangle.height < 0.0 || rectangle.height > CesiumMath.PI) {
            throw new DeveloperError('Rectangle height must be between 0 and pi');
        }
        if (defined(ellipsoid) && !CesiumMath.equalsEpsilon(ellipsoid.radii.x, ellipsoid.radii.y, CesiumMath.EPSILON15)) {
            throw new DeveloperError('Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)');
        }
        //>>includeEnd('debug');

        minimumHeight = defaultValue(minimumHeight, 0.0);
        maximumHeight = defaultValue(maximumHeight, 0.0);
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        let minX, maxX, minY, maxY, minZ, maxZ, plane;

        if (rectangle.width <= CesiumMath.PI) {
            // The bounding box will be aligned with the tangent plane at the center of the rectangle.
            const tangentPointCartographic = Rectangle.center(rectangle, scratchRectangleCenterCartographic);
            const tangentPoint = ellipsoid.cartographicToCartesian(tangentPointCartographic, scratchRectangleCenter);
            const tangentPlane = new EllipsoidTangentPlane(tangentPoint, ellipsoid);
            plane = tangentPlane.plane;

            // If the rectangle spans the equator, CW is instead aligned with the equator (because it sticks out the farthest at the equator).
            const lonCenter = tangentPointCartographic.longitude;
            const latCenter = rectangle.south < 0.0 && rectangle.north > 0.0 ? 0.0 : tangentPointCartographic.latitude;

            // Compute XY extents using the rectangle at maximum height
            const perimeterCartographicNC = Cartographic.fromRadians(lonCenter, rectangle.north, maximumHeight, scratchPerimeterCartographicNC);
            const perimeterCartographicNW = Cartographic.fromRadians(rectangle.west, rectangle.north, maximumHeight, scratchPerimeterCartographicNW);
            const perimeterCartographicCW = Cartographic.fromRadians(rectangle.west, latCenter, maximumHeight, scratchPerimeterCartographicCW);
            const perimeterCartographicSW = Cartographic.fromRadians(rectangle.west, rectangle.south, maximumHeight, scratchPerimeterCartographicSW);
            const perimeterCartographicSC = Cartographic.fromRadians(lonCenter, rectangle.south, maximumHeight, scratchPerimeterCartographicSC);

            const perimeterCartesianNC = ellipsoid.cartographicToCartesian(perimeterCartographicNC, scratchPerimeterCartesianNC);
            let perimeterCartesianNW = ellipsoid.cartographicToCartesian(perimeterCartographicNW, scratchPerimeterCartesianNW);
            const perimeterCartesianCW = ellipsoid.cartographicToCartesian(perimeterCartographicCW, scratchPerimeterCartesianCW);
            let perimeterCartesianSW = ellipsoid.cartographicToCartesian(perimeterCartographicSW, scratchPerimeterCartesianSW);
            const perimeterCartesianSC = ellipsoid.cartographicToCartesian(perimeterCartographicSC, scratchPerimeterCartesianSC);

            const perimeterProjectedNC = tangentPlane.projectPointToNearestOnPlane(perimeterCartesianNC, scratchPerimeterProjectedNC);
            const perimeterProjectedNW = tangentPlane.projectPointToNearestOnPlane(perimeterCartesianNW, scratchPerimeterProjectedNW);
            const perimeterProjectedCW = tangentPlane.projectPointToNearestOnPlane(perimeterCartesianCW, scratchPerimeterProjectedCW);
            const perimeterProjectedSW = tangentPlane.projectPointToNearestOnPlane(perimeterCartesianSW, scratchPerimeterProjectedSW);
            const perimeterProjectedSC = tangentPlane.projectPointToNearestOnPlane(perimeterCartesianSC, scratchPerimeterProjectedSC);

            minX = Math.min(perimeterProjectedNW.x, perimeterProjectedCW.x, perimeterProjectedSW.x);
            maxX = -minX; // symmetrical

            maxY = Math.max(perimeterProjectedNW.y, perimeterProjectedNC.y);
            minY = Math.min(perimeterProjectedSW.y, perimeterProjectedSC.y);

            // Compute minimum Z using the rectangle at minimum height, since it will be deeper than the maximum height
            perimeterCartographicNW.height = perimeterCartographicSW.height = minimumHeight;
            perimeterCartesianNW = ellipsoid.cartographicToCartesian(perimeterCartographicNW, scratchPerimeterCartesianNW);
            perimeterCartesianSW = ellipsoid.cartographicToCartesian(perimeterCartographicSW, scratchPerimeterCartesianSW);

            minZ = Math.min(CesiumPlane.getPointDistance(plane, perimeterCartesianNW), CesiumPlane.getPointDistance(plane, perimeterCartesianSW));
            maxZ = maximumHeight; // Since the tangent plane touches the surface at height = 0, this is okay

            return fromPlaneExtents(tangentPlane.origin, tangentPlane.xAxis, tangentPlane.yAxis, tangentPlane.zAxis, minX, maxX, minY, maxY, minZ, maxZ, result);
        }

        // Handle the case where rectangle width is greater than PI (wraps around more than half the ellipsoid).
        const fullyAboveEquator = rectangle.south > 0.0;
        const fullyBelowEquator = rectangle.north < 0.0;
        const latitudeNearestToEquator = fullyAboveEquator ? rectangle.south : fullyBelowEquator ? rectangle.north : 0.0;
        const centerLongitude = Rectangle.center(rectangle, scratchRectangleCenterCartographic).longitude;

        // Plane is located at the rectangle's center longitude and the rectangle's latitude that is closest to the equator. It rotates around the Z axis.
        // This results in a better fit than the obb approach for smaller rectangles, which orients with the rectangle's center normal.
        const planeOrigin = Cartesian3.fromRadians(centerLongitude, latitudeNearestToEquator, maximumHeight, ellipsoid, scratchPlaneOrigin);
        planeOrigin.z = 0.0; // center the plane on the equator to simpify plane normal calculation
        const isPole = Math.abs(planeOrigin.x) < CesiumMath.EPSILON10 && Math.abs(planeOrigin.y) < CesiumMath.EPSILON10;
        const planeNormal = !isPole ? Cartesian3.normalize(planeOrigin, scratchPlaneNormal) : Cartesian3.UNIT_X;
        const planeYAxis = Cartesian3.UNIT_Z;
        const planeXAxis = Cartesian3.cross(planeNormal, planeYAxis, scratchPlaneXAxis);
        plane = CesiumPlane.fromPointNormal(planeOrigin, planeNormal, scratchPlane);

        // Get the horizon point relative to the center. This will be the farthest extent in the plane's X dimension.
        const horizonCartesian = Cartesian3.fromRadians(centerLongitude + CesiumMath.PI_OVER_TWO, latitudeNearestToEquator, maximumHeight, ellipsoid, scratchHorizonCartesian);
        maxX = Cartesian3.dot(CesiumPlane.projectPointOntoPlane(plane, horizonCartesian, scratchHorizonProjected as unknown as Cartesian3), planeXAxis);
        minX = -maxX; // symmetrical

        // Get the min and max Y, using the height that will give the largest extent
        maxY = Cartesian3.fromRadians(0.0, rectangle.north, fullyBelowEquator ? minimumHeight : maximumHeight, ellipsoid, scratchMaxY).z;
        minY = Cartesian3.fromRadians(0.0, rectangle.south, fullyAboveEquator ? minimumHeight : maximumHeight, ellipsoid, scratchMinY).z;

        const farZ = Cartesian3.fromRadians(rectangle.east, latitudeNearestToEquator, maximumHeight, ellipsoid, scratchZ);
        minZ = CesiumPlane.getPointDistance(plane, farZ);
        maxZ = 0.0; // plane origin starts at maxZ already

        // min and max are local to the plane axes
        return fromPlaneExtents(planeOrigin, planeXAxis, planeYAxis, planeNormal, minX, maxX, minY, maxY, minZ, maxZ, result);
    }
}
