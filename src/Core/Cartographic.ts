import Cartesian3 from './Cartesian3';
import CesiumMath from './CesiumMath';
import defaultValue from './defaultValue';
import defined from './defined';
import Ellipsoid from './Ellipsoid';
import scaleToGeodeticSurface from './scaleToGeodeticSurface';

const cartesianToCartographicN = new Cartesian3();
const cartesianToCartographicP = new Cartesian3();
const cartesianToCartographicH = new Cartesian3();
const wgs84OneOverRadii = new Cartesian3(1.0 / 6378137.0, 1.0 / 6378137.0, 1.0 / 6356752.3142451793);
const wgs84OneOverRadiiSquared = new Cartesian3(1.0 / (6378137.0 * 6378137.0), 1.0 / (6378137.0 * 6378137.0), 1.0 / (6356752.3142451793 * 6356752.3142451793));
const wgs84CenterToleranceSquared = CesiumMath.EPSILON1;

export default class Cartographic {
    longitude: number;
    latitude: number;
    height: number;
    constructor(longitude = 0.0, latitude = 0.0, height = 0.0) {
        /**
         * The longitude, in radians.
         * @type {Number}
         * @default 0.0
         */
        this.longitude = defaultValue(longitude, 0.0);

        /**
         * The latitude, in radians.
         * @type {Number}
         * @default 0.0
         */
        this.latitude = defaultValue(latitude, 0.0);

        /**
         * The height, in meters, above the ellipsoid.
         * @type {Number}
         * @default 0.0
         */
        this.height = defaultValue(height, 0.0);
    }

    /**
     * Duplicates a Cartographic instance.
     *
     * @param {Cartographic} cartographic The cartographic to duplicate.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided. (Returns undefined if cartographic is undefined)
     */
    static clone(cartographic: Cartographic, result?: Cartographic): Cartographic | undefined {
        if (!defined(cartographic)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Cartographic(cartographic.longitude, cartographic.latitude, cartographic.height);
        }
        (result as Cartographic).longitude = cartographic.longitude;
        (result as Cartographic).latitude = cartographic.latitude;
        (result as Cartographic).height = cartographic.height;
        return result;
    }

    /**
     * Creates a new Cartographic instance from longitude and latitude
     * specified in radians.
     *
     * @param {Number} longitude The longitude, in radians.
     * @param {Number} latitude The latitude, in radians.
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
     */
    static fromRadians(longitude: number, latitude: number, height = 0.0, result?: Cartographic): Cartographic {
        height = defaultValue(height, 0.0);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        (result as Cartographic).longitude = longitude;
        (result as Cartographic).latitude = latitude;
        (result as Cartographic).height = height;
        return result as Cartographic;
    }

    /**
     * Creates a new Cartographic instance from a Cartesian position. The values in the
     * resulting object will be in radians.
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
     */
    static fromCartesian(cartesian: Cartesian3, ellipsoid = Ellipsoid.WGS84, result = new Cartographic()): Cartographic | undefined {
        const oneOverRadii = defined(ellipsoid) ? ellipsoid.oneOverRadii : wgs84OneOverRadii;
        const oneOverRadiiSquared = defined(ellipsoid) ? ellipsoid.oneOverRadiiSquared : wgs84OneOverRadiiSquared;
        const centerToleranceSquared = defined(ellipsoid) ? ellipsoid._centerToleranceSquared : wgs84CenterToleranceSquared;

        //`cartesian is required.` is thrown from scaleToGeodeticSurface
        const p = scaleToGeodeticSurface(cartesian, oneOverRadii, oneOverRadiiSquared, centerToleranceSquared, cartesianToCartographicP);

        if (!defined(p)) {
            return undefined;
        }

        let n = Cartesian3.multiplyComponents(p, oneOverRadiiSquared, cartesianToCartographicN);
        n = Cartesian3.normalize(n, n);

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
}
