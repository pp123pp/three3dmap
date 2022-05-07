import Cartesian3 from './Cartesian3';
import Cartographic from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import defined from './defined';
import scaleToGeodeticSurface from './scaleToGeodeticSurface';

const cartesianToCartographicN = new Cartesian3();
const cartesianToCartographicP = new Cartesian3();
const cartesianToCartographicH = new Cartesian3();

const cartographicToCartesianNormal = new Cartesian3();
const cartographicToCartesianK = new Cartesian3();

function initialize(ellipsoid: Ellipsoid, x = 0.0, y = 0.0, z = 0.0) {
    ellipsoid._radii = new Cartesian3(x, y, z);

    ellipsoid._radiiSquared = new Cartesian3(x * x, y * y, z * z);

    ellipsoid._radiiToTheFourth = new Cartesian3(x * x * x * x, y * y * y * y, z * z * z * z);

    ellipsoid._oneOverRadii = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / x, y === 0.0 ? 0.0 : 1.0 / y, z === 0.0 ? 0.0 : 1.0 / z);

    ellipsoid._oneOverRadiiSquared = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / (x * x), y === 0.0 ? 0.0 : 1.0 / (y * y), z === 0.0 ? 0.0 : 1.0 / (z * z));

    ellipsoid._minimumRadius = Math.min(x, y, z);

    ellipsoid._maximumRadius = Math.max(x, y, z);

    ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1;

    if (ellipsoid._radiiSquared.z !== 0) {
        ellipsoid._squaredXOverSquaredZ = ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
    }
}

/**
 * A quadratic surface defined in Cartesian coordinates by the equation
 * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
 * by Cesium to represent the shape of planetary bodies.
 *
 * Rather than constructing this object directly, one of the provided
 * constants is normally used.
 * @alias Ellipsoid
 * @constructor
 *
 * @param {Number} [x=0] The radius in the x direction.
 * @param {Number} [y=0] The radius in the y direction.
 * @param {Number} [z=0] The radius in the z direction.
 *
 * @exception {DeveloperError} All radii components must be greater than or equal to zero.
 *
 * @see Ellipsoid.fromCartesian3
 * @see Ellipsoid.WGS84
 * @see Ellipsoid.UNIT_SPHERE
 */
export default class Ellipsoid {
    _radii: Cartesian3;
    _radiiSquared: Cartesian3;
    _radiiToTheFourth: Cartesian3;
    _oneOverRadii: Cartesian3;
    _oneOverRadiiSquared: Cartesian3;
    _minimumRadius: number;
    _maximumRadius: number;
    _centerToleranceSquared = CesiumMath.EPSILON1;
    _squaredXOverSquaredZ = 0.0;
    constructor(x = 0.0, y = 0.0, z = 0.0) {
        this._radii = new Cartesian3(x, y, z);

        this._radiiSquared = new Cartesian3(x * x, y * y, z * z);

        this._radiiToTheFourth = new Cartesian3(x * x * x * x, y * y * y * y, z * z * z * z);

        this._oneOverRadii = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / x, y === 0.0 ? 0.0 : 1.0 / y, z === 0.0 ? 0.0 : 1.0 / z);

        this._oneOverRadiiSquared = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / (x * x), y === 0.0 ? 0.0 : 1.0 / (y * y), z === 0.0 ? 0.0 : 1.0 / (z * z));

        this._minimumRadius = Math.min(x, y, z);

        this._maximumRadius = Math.max(x, y, z);

        if (this._radiiSquared.z !== 0) {
            this._squaredXOverSquaredZ = this._radiiSquared.x / this._radiiSquared.z;
        }

        initialize(this, x, y, z);
    }
    /**
     * Gets the radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get radii(): Cartesian3 {
        return this._radii;
    }

    /**
     * Gets the squared radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get radiiSquared(): Cartesian3 {
        return this._radiiSquared;
    }

    /**
     * Gets the radii of the ellipsoid raise to the fourth power.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get radiiToTheFourth(): Cartesian3 {
        return this._radiiToTheFourth;
    }

    /**
     * Gets one over the radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get oneOverRadii(): Cartesian3 {
        return this._oneOverRadii;
    }

    /**
     * Gets one over the squared radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get oneOverRadiiSquared(): Cartesian3 {
        return this._oneOverRadiiSquared;
    }

    /**
     * Gets the minimum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    get minimumRadius(): number {
        return this._minimumRadius;
    }

    /**
     * Gets the maximum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    get maximumRadius(): number {
        return this._maximumRadius;
    }

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided, or undefined if a normal cannot be found.
     */
    geodeticSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
        if (Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, CesiumMath.EPSILON14)) {
            return undefined;
        }
        if (!defined(result)) {
            result = new Cartesian3();
        }
        result = Cartesian3.multiplyComponents(cartesian, this._oneOverRadiiSquared, result as Cartesian3);
        return Cartesian3.normalize(result, result);
    }

    /**
     * Converts the provided cartesian to cartographic representation.
     * The cartesian is undefined at the center of the ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
     *
     * @example
     * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
     * const position = new Cesium.Cartesian3(17832.12, 83234.52, 952313.73);
     * const cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
     */
    cartesianToCartographic(cartesian: Cartesian3, result = new Cartographic()): Cartographic | undefined {
        //`cartesian is required.` is thrown from scaleToGeodeticSurface
        const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

        if (!defined(p)) {
            return undefined;
        }

        const n = this.geodeticSurfaceNormal(p, cartesianToCartographicN) as Cartesian3;
        const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

        const longitude = Math.atan2(n.y, n.x);
        const latitude = Math.asin(n.z);
        const height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }
        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    }

    /**
     * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#oneOverRadii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    transformPositionToScaledSpace(position: Cartesian3, result = new Cartesian3()): Cartesian3 {
        return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
    }

    /**
     * Converts the provided cartographic to Cartesian representation.
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @example
     * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
     * const position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
     * const cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
     */
    cartographicToCartesian(cartographic: Cartographic, result = new Cartesian3()): Cartesian3 {
        //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
        const n = cartographicToCartesianNormal;
        const k = cartographicToCartesianK;
        this.geodeticSurfaceNormalCartographic(cartographic, n);
        Cartesian3.multiplyComponents(this._radiiSquared, n, k);
        const gamma = Math.sqrt(Cartesian3.dot(n, k));
        Cartesian3.divideByScalar(k, gamma, k);
        Cartesian3.multiplyByScalar(n, cartographic.height, n);

        return Cartesian3.add(k, n, result);
    }

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     *
     * @param {Cartographic[]} cartographics An array of cartographic positions.
     * @param {Cartesian3[]} [result] The object onto which to store the result.
     * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
     * const positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)];
     * const cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
     */
    cartographicArrayToCartesianArray(cartographics: Cartographic[], result: Cartesian3[] = []): Cartesian3[] {
        const length = cartographics.length;
        result.length = length;
        for (let i = 0; i < length; i++) {
            result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
        }
        return result;
    }

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    geodeticSurfaceNormalCartographic(cartographic: Cartographic, result = new Cartesian3()): Cartesian3 {
        const longitude = cartographic.longitude;
        const latitude = cartographic.latitude;
        const cosLatitude = Math.cos(latitude);

        const x = cosLatitude * Math.cos(longitude);
        const y = cosLatitude * Math.sin(longitude);
        const z = Math.sin(latitude);

        result.x = x;
        result.y = y;
        result.z = z;
        return Cartesian3.normalize(result, result);
    }

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of this ellipsoid.  If the position is
     * at the center of the ellipsoid, this function returns undefined.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
     */
    scaleToGeodeticSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 {
        return scaleToGeodeticSurface(cartesian, this._oneOverRadii, this._oneOverRadiiSquared, this._centerToleranceSquared, result);
    }

    /**
     * An Ellipsoid instance initialized to the WGS84 standard.
     *
     * @type {Ellipsoid}
     * @constant
     */
    static WGS84 = Object.freeze(new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793));

    /**
     * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     *
     * @type {Ellipsoid}
     * @constant
     */
    static UNIT_SPHERE = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0));

    /**
     * An Ellipsoid instance initialized to a sphere with the lunar radius.
     *
     * @type {Ellipsoid}
     * @constant
     */
    static MOON = Object.freeze(new Ellipsoid(CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS));

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
     */
    static clone(ellipsoid: Ellipsoid, result?: Ellipsoid): Ellipsoid {
        // if (!defined(ellipsoid)) {
        //     return undefined;
        // }
        const radii = ellipsoid._radii;

        if (!defined(result)) {
            return new Ellipsoid(radii.x, radii.y, radii.z);
        }

        Cartesian3.clone(radii, (result as Ellipsoid)._radii);
        Cartesian3.clone(ellipsoid._radiiSquared, (result as Ellipsoid)._radiiSquared);
        Cartesian3.clone(ellipsoid._radiiToTheFourth, (result as Ellipsoid)._radiiToTheFourth);
        Cartesian3.clone(ellipsoid._oneOverRadii, (result as Ellipsoid)._oneOverRadii);
        Cartesian3.clone(ellipsoid._oneOverRadiiSquared, (result as Ellipsoid)._oneOverRadiiSquared);
        (result as Ellipsoid)._minimumRadius = ellipsoid._minimumRadius;
        (result as Ellipsoid)._maximumRadius = ellipsoid._maximumRadius;
        (result as Ellipsoid)._centerToleranceSquared = ellipsoid._centerToleranceSquared;

        return result as Ellipsoid;
    }

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [cartesian=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} A new Ellipsoid instance.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    static fromCartesian3(cartesian = Cartesian3.ZERO, result = new Ellipsoid()): Ellipsoid {
        if (!defined(result)) {
            result = new Ellipsoid();
        }

        if (!defined(cartesian)) {
            return result;
        }

        initialize(result, cartesian.x, cartesian.y, cartesian.z);
        return result;
    }

    /**
     * Computes a point which is the intersection of the surface normal with the z-axis.
     *
     * @param {Cartesian3} position the position. must be on the surface of the ellipsoid.
     * @param {Number} [buffer = 0.0] A buffer to subtract from the ellipsoid size when checking if the point is inside the ellipsoid.
     *                                In earth case, with common earth datums, there is no need for this buffer since the intersection point is always (relatively) very close to the center.
     *                                In WGS84 datum, intersection point is at max z = +-42841.31151331382 (0.673% of z-axis).
     *                                Intersection point could be outside the ellipsoid if the ratio of MajorAxis / AxisOfRotation is bigger than the square root of 2
     * @param {Cartesian3} [result] The cartesian to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3 | undefined} the intersection point if it's inside the ellipsoid, undefined otherwise
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y).
     * @exception {DeveloperError} Ellipsoid.radii.z must be greater than 0.
     */
    getSurfaceNormalIntersectionWithZAxis(position: Cartesian3, buffer = 0.0, result = new Cartesian3()): Cartesian3 | undefined {
        const squaredXOverSquaredZ = this._squaredXOverSquaredZ;

        result.x = 0.0;
        result.y = 0.0;
        result.z = position.z * (1 - squaredXOverSquaredZ);

        if (Math.abs(result.z) >= this._radii.z - buffer) {
            return undefined;
        }

        return result;
    }
}
