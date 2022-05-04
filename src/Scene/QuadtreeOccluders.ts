import Cartesian3 from '@/Core/Cartesian3';
import Ellipsoid from '@/Core/Ellipsoid';
import EllipsoidalOccluder from '@/Core/EllipsoidalOccluder';

class QuadtreeOccluders {
    readonly ellipsoid: EllipsoidalOccluder;
    constructor(options: { ellipsoid: Ellipsoid }) {
        this.ellipsoid = new EllipsoidalOccluder(options.ellipsoid, Cartesian3.ZERO);
    }
}

export { QuadtreeOccluders };
