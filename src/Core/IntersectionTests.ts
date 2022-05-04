import Cartesian3 from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import CesiumPlane from './CesiumPlane';
import CesiumRay from './CesiumRay';

const IntersectionTests = {
    /**
     * Computes the intersection of a ray and a plane.
     *
     * @param {Ray} ray The ray.
     * @param {Plane} plane The plane.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    rayPlane(ray: CesiumRay, plane: CesiumPlane, result = new Cartesian3()): Cartesian3 | undefined {
        const origin = ray.origin;
        const direction = ray.direction;
        const normal = plane.normal;
        const denominator = Cartesian3.dot(normal, direction);

        if (Math.abs(denominator) < CesiumMath.EPSILON15) {
            // Ray is parallel to plane.  The ray may be in the polygon's plane.
            return undefined;
        }

        const t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator;

        if (t < 0) {
            return undefined;
        }

        result = Cartesian3.multiplyByScalar(direction, t, result);
        return Cartesian3.add(origin, result, result);
    },
};

export default IntersectionTests;
