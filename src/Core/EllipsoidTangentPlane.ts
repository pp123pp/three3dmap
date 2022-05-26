import Cartesian2 from './Cartesian2';
import Cartesian3 from './Cartesian3';
import Cartesian4 from './Cartesian4';
import CesiumMatrix4 from './CesiumMatrix4';
import CesiumPlane from './CesiumPlane';
import CesiumRay from './CesiumRay';
import defaultValue from './defaultValue';
import defined from './defined';
import Ellipsoid from './Ellipsoid';
import IntersectionTests from './IntersectionTests';
import Transforms from './Transforms';

const scratchCart4 = new Cartesian4();

const scratchProjectPointOntoPlaneRay = new CesiumRay();
const scratchProjectPointOntoPlaneCartesian3 = new Cartesian3();

/**
 * A plane tangent to the provided ellipsoid at the provided origin.
 * If origin is not on the surface of the ellipsoid, it's surface projection will be used.
 * If origin is at the center of the ellipsoid, an exception will be thrown.
 * @alias EllipsoidTangentPlane
 * @constructor
 *
 * @param {Cartesian3} origin The point on the surface of the ellipsoid where the tangent plane touches.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use.
 *
 * @exception {DeveloperError} origin must not be at the center of the ellipsoid.
 */
class EllipsoidTangentPlane {
    _ellipsoid: Ellipsoid;
    _origin: Cartesian3;
    _xAxis: Cartesian3;
    _yAxis: Cartesian3;

    _plane: CesiumPlane;

    constructor(origin: Cartesian3, ellipsoid = Ellipsoid.WGS84) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        origin = ellipsoid.scaleToGeodeticSurface(origin);

        const eastNorthUp = (Transforms as any).eastNorthUpToFixedFrame(origin, ellipsoid);
        this._ellipsoid = ellipsoid;
        this._origin = origin;
        this._xAxis = Cartesian3.fromCartesian4(CesiumMatrix4.getColumn(eastNorthUp, 0, scratchCart4));
        this._yAxis = Cartesian3.fromCartesian4(CesiumMatrix4.getColumn(eastNorthUp, 1, scratchCart4));

        const normal = Cartesian3.fromCartesian4(CesiumMatrix4.getColumn(eastNorthUp, 2, scratchCart4));
        this._plane = CesiumPlane.fromPointNormal(origin, normal);
    }

    get ellipsoid(): Ellipsoid {
        return this._ellipsoid;
    }

    get origin(): Cartesian3 {
        return this._origin;
    }

    get plane(): CesiumPlane {
        return this._plane;
    }

    get xAxis(): Cartesian3 {
        return this._xAxis;
    }

    get yAxis(): Cartesian3 {
        return this._yAxis;
    }

    get zAxis(): Cartesian3 {
        return this._plane.normal;
    }

    /**
     * Computes the projection of the provided 3D position onto the 2D plane, along the plane normal.
     *
     * @param {Cartesian3} cartesian The point to project.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     */
    projectPointToNearestOnPlane(cartesian: Cartesian3, result = new Cartesian2()): Cartesian2 {
        const ray = scratchProjectPointOntoPlaneRay;
        ray.origin = cartesian;
        Cartesian3.clone(this._plane.normal, ray.direction);

        let intersectionPoint = IntersectionTests.rayPlane(ray, this._plane, scratchProjectPointOntoPlaneCartesian3) as Cartesian3;
        if (!defined(intersectionPoint)) {
            Cartesian3.negate(ray.direction, ray.direction);
            intersectionPoint = IntersectionTests.rayPlane(ray, this._plane, scratchProjectPointOntoPlaneCartesian3) as Cartesian3;
        }

        const v = Cartesian3.subtract(intersectionPoint, this._origin, intersectionPoint);
        const x = Cartesian3.dot(this._xAxis, v);
        const y = Cartesian3.dot(this._yAxis, v);

        result.x = x;
        result.y = y;
        return result;
    }

    /**
     * Computes the projection of the provided 3D positions onto the 2D plane, along the plane normal.
     *
     * @see EllipsoidTangentPlane.projectPointToNearestOnPlane
     *
     * @param {Cartesian3[]} cartesians The array of points to project.
     * @param {Cartesian2[]} [result] The array of Cartesian2 instances onto which to store results.
     * @returns {Cartesian2[]} The modified result parameter or a new array of Cartesian2 instances if none was provided. This will have the same length as <code>cartesians</code>.
     */
    projectPointsToNearestOnPlane(cartesians: Cartesian3[], result: Cartesian2[]): Cartesian2[] {
        if (!defined(result)) {
            result = [];
        }

        const length = cartesians.length;
        result.length = length;
        for (let i = 0; i < length; i++) {
            result[i] = this.projectPointToNearestOnPlane(cartesians[i], result[i]);
        }
        return result;
    }
}

export { EllipsoidTangentPlane };
