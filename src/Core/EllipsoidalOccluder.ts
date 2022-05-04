import Cartesian3 from './Cartesian3';
import defined from './defined';
import Ellipsoid from './Ellipsoid';

const scaledSpaceScratch = new Cartesian3();
const directionScratch = new Cartesian3();

const computeMagnitude = function (ellipsoid: Ellipsoid, position: Cartesian3, scaledSpaceDirectionToPoint: Cartesian3) {
    const scaledSpacePosition = ellipsoid.transformPositionToScaledSpace(position, scaledSpaceScratch);
    let magnitudeSquared = Cartesian3.magnitudeSquared(scaledSpacePosition);
    let magnitude = Math.sqrt(magnitudeSquared);
    const direction = Cartesian3.divideByScalar(scaledSpacePosition, magnitude, directionScratch);

    // For the purpose of this computation, points below the ellipsoid are consider to be on it instead.
    magnitudeSquared = Math.max(1.0, magnitudeSquared);
    magnitude = Math.max(1.0, magnitude);

    const cosAlpha = Cartesian3.dot(direction, scaledSpaceDirectionToPoint);
    const sinAlpha = Cartesian3.magnitude(Cartesian3.cross(direction, scaledSpaceDirectionToPoint, direction));
    const cosBeta = 1.0 / magnitude;
    const sinBeta = Math.sqrt(magnitudeSquared - 1.0) * cosBeta;

    return 1.0 / (cosAlpha * cosBeta - sinAlpha * sinBeta);
};

const magnitudeToPoint = function (scaledSpaceDirectionToPoint: Cartesian3, resultMagnitude: number, result: Cartesian3) {
    // The horizon culling point is undefined if there were no positions from which to compute it,
    // the directionToPoint is pointing opposite all of the positions,  or if we computed NaN or infinity.
    if (resultMagnitude <= 0.0 || resultMagnitude === 1.0 / 0.0 || resultMagnitude !== resultMagnitude) {
        return undefined;
    }

    return Cartesian3.multiplyByScalar(scaledSpaceDirectionToPoint, resultMagnitude, result);
};

const directionToPointScratch = new Cartesian3();

const computeScaledSpaceDirectionToPoint = function (ellipsoid: Ellipsoid, directionToPoint: Cartesian3) {
    if (Cartesian3.equals(directionToPoint, Cartesian3.ZERO)) {
        return directionToPoint;
    }

    ellipsoid.transformPositionToScaledSpace(directionToPoint, directionToPointScratch);
    return Cartesian3.normalize(directionToPointScratch, directionToPointScratch);
};

export default class EllipsoidalOccluder {
    readonly ellipsoid: Ellipsoid;
    _cameraPosition = new Cartesian3();
    _cameraPositionInScaledSpace = new Cartesian3();
    _distanceToLimbInScaledSpaceSquared = 0.0;

    constructor(ellipsoid: Ellipsoid, cameraPosition = new Cartesian3()) {
        this.ellipsoid = ellipsoid;

        // cameraPosition fills in the above values
        if (defined(cameraPosition)) {
            this.cameraPosition = cameraPosition;
        }
    }

    get cameraPosition(): Cartesian3 {
        return this._cameraPosition;
    }

    set cameraPosition(cameraPosition: Cartesian3) {
        // See https://cesiumjs.org/2013/04/25/Horizon-culling/
        const ellipsoid = this.ellipsoid;
        const cv = ellipsoid.transformPositionToScaledSpace(cameraPosition, this._cameraPositionInScaledSpace);
        const vhMagnitudeSquared = Cartesian3.magnitudeSquared(cv) - 1.0;

        Cartesian3.clone(cameraPosition, this._cameraPosition);
        this._cameraPositionInScaledSpace = cv;
        this._distanceToLimbInScaledSpaceSquared = vhMagnitudeSquared;
    }

    /**
     * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
     * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
     * is expressed in the ellipsoid-scaled space and is suitable for use with
     * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
     *
     * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
     *                     A reasonable direction to use is the direction from the center of the ellipsoid to
     *                     the center of the bounding sphere computed from the positions.  The direction need not
     *                     be normalized.
     * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
     *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
     *                       ellipsoid's axes.
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
     */
    computeHorizonCullingPoint(directionToPoint: Cartesian3, positions: Cartesian3[], result = new Cartesian3()): Cartesian3 {
        const ellipsoid = this.ellipsoid;
        const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint);
        let resultMagnitude = 0.0;

        for (let i = 0, len = positions.length; i < len; ++i) {
            const position = positions[i];
            const candidateMagnitude = computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint);
            resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
        }

        return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result) as Cartesian3;
    }
}
