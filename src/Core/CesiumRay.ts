import { Ray } from 'three';
import Cartesian3 from './Cartesian3';
import { defaultValue } from './defaultValue';

export default class CesiumRay extends Ray {
    constructor(origin = new Cartesian3(), direction = new Cartesian3()) {
        if (!Cartesian3.equals(direction, Cartesian3.ZERO)) {
            Cartesian3.normalize(direction, direction);
        }
        /**
         * The origin of the ray.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        origin = Cartesian3.clone(defaultValue(origin, Cartesian3.ZERO));

        super(origin, direction);
    }

    /**
     * Duplicates a Ray instance.
     *
     * @param {Ray} ray The ray to duplicate.
     * @param {Ray} [result] The object onto which to store the result.
     * @returns {Ray} The modified result parameter or a new Ray instance if one was not provided. (Returns undefined if ray is undefined)
     */
    static clone(ray: CesiumRay, result = new CesiumRay()): CesiumRay {
        result.origin = Cartesian3.clone(ray.origin);
        result.direction = Cartesian3.clone(ray.direction);
        return result;
    }

    /**
     * Computes the point along the ray given by r(t) = o + t*d,
     * where o is the origin of the ray and d is the direction.
     *
     * @param {Ray} ray The ray.
     * @param {Number} t A scalar value.
     * @param {Cartesian3} [result] The object in which the result will be stored.
     * @returns {Cartesian3} The modified result parameter, or a new instance if none was provided.
     *
     * @example
     * //Get the first intersection point of a ray and an ellipsoid.
     * const intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);
     * const point = Cesium.Ray.getPoint(ray, intersection.start);
     */
    static getPoint(ray: CesiumRay, t: number, result = new Cartesian3()): Cartesian3 {
        result = Cartesian3.multiplyByScalar(ray.direction, t, result);
        return Cartesian3.add(ray.origin, result, result);
    }
}
