import { Plane } from 'three';
import Cartesian3 from './Cartesian3';
import Cartesian4 from './Cartesian4';
import { CesiumMath } from './CesiumMath';
import DeveloperError from './DeveloperError';

const scratchNormal = new Cartesian3();

const scratchCartesian = new Cartesian3();
/**
 * Creates a plane from the general equation
 *
 * @param {Cartesian4} coefficients The plane's normal (normalized).
 * @param {Plane} [result] The object onto which to store the result.
 * @returns {Plane} A new plane instance or the modified result parameter.
 *
 * @exception {DeveloperError} Normal must be normalized
 */
export default class CesiumPlane extends Plane {
    constructor(normal = new Cartesian3(1, 0, 0), constant = 0) {
        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        normal = Cartesian3.clone(normal);

        super(normal, constant);
    }

    get distance(): number {
        return this.constant;
    }

    set distance(value: number) {
        this.constant = value;
    }

    /**
     * Creates a plane from the general equation
     *
     * @param {Cartesian4} coefficients The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @exception {DeveloperError} Normal must be normalized
     */
    static fromCartesian4(coefficients: Cartesian4, result = new CesiumPlane()): CesiumPlane {
        const normal = Cartesian3.fromCartesian4(coefficients, scratchNormal);
        const distance = coefficients.w;

        //>>includeStart('debug', pragmas.debug);
        if (!CesiumMath.equalsEpsilon(Cartesian3.magnitude(normal), 1.0, CesiumMath.EPSILON6)) {
            throw new DeveloperError('normal must be normalized.');
        }
        //>>includeEnd('debug');

        Cartesian3.clone(normal, result.normal);
        result.distance = distance;
        return result;
    }

    /**
     * Creates a plane from a normal and a point on the plane.
     *
     * @param {Cartesian3} point The point on the plane.
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @example
     * var point = Cesium.Cartesian3.fromDegrees(-72.0, 40.0);
     * var normal = ellipsoid.geodeticSurfaceNormal(point);
     * var tangentPlane = Cesium.Plane.fromPointNormal(point, normal);
     *
     * @exception {DeveloperError} Normal must be normalized
     */
    static fromPointNormal(point: Cartesian3, normal: Cartesian3, result = new CesiumPlane()): CesiumPlane {
        const distance = -Cartesian3.dot(normal, point);

        Cartesian3.clone(normal, result.normal);
        result.distance = distance;
        return result;
    }

    /**
     * Computes the signed shortest distance of a point to a plane.
     * The sign of the distance determines which side of the plane the point
     * is on.  If the distance is positive, the point is in the half-space
     * in the direction of the normal; if negative, the point is in the half-space
     * opposite to the normal; if zero, the plane passes through the point.
     *
     * @param {Plane} plane The plane.
     * @param {Cartesian3} point The point.
     * @returns {Number} The signed shortest distance of the point to the plane.
     */
    static getPointDistance(plane: CesiumPlane, point: Cartesian3): number {
        return Cartesian3.dot(plane.normal, point) + plane.distance;
    }

    /**
     * Projects a point onto the plane.
     * @param {Plane} plane The plane to project the point onto
     * @param {Cartesian3} point The point to project onto the plane
     * @param {Cartesian3} [result] The result point.  If undefined, a new Cartesian3 will be created.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    static projectPointOntoPlane(plane: CesiumPlane, point: Cartesian3, result = new Cartesian3()): Cartesian3 {
        // projectedPoint = point - (normal.point + scale) * normal
        const pointDistance = CesiumPlane.getPointDistance(plane, point);
        const scaledNormal = Cartesian3.multiplyByScalar(plane.normal, pointDistance, scratchCartesian);

        return Cartesian3.subtract(point, scaledNormal, result);
    }
}
