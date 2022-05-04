import { Frustum } from 'three';
import { AxisAlignedBoundingBox } from './AxisAlignedBoundingBox';
import BoundingSphere from './BoundingSphere';
import CesiumPlane from './CesiumPlane';
import defined from './defined';
import DeveloperError from './DeveloperError';
import Intersect from './Intersect';

export default class CullingVolume extends Frustum {
    planes: CesiumPlane[];
    constructor(p0 = new CesiumPlane(), p1 = new CesiumPlane(), p2 = new CesiumPlane(), p3 = new CesiumPlane(), p4 = new CesiumPlane(), p5 = new CesiumPlane()) {
        super();
        this.planes = [p0, p1, p2, p3, p4, p5];
    }

    /**
     * Determines whether a bounding volume intersects the culling volume.
     *
     * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
     * @returns {Intersect}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
     */
    computeVisibility(boundingVolume: BoundingSphere | AxisAlignedBoundingBox): Intersect {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(boundingVolume)) {
            throw new DeveloperError('boundingVolume is required.');
        }
        //>>includeEnd('debug');

        const planes = this.planes;
        let intersecting = false;
        for (let k = 0, len = planes.length; k < len; ++k) {
            const result = boundingVolume.intersectPlane(planes[k]);
            if (result === Intersect.OUTSIDE) {
                return Intersect.OUTSIDE;
            } else if (result === Intersect.INTERSECTING) {
                intersecting = true;
            }
        }

        return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
    }
}
