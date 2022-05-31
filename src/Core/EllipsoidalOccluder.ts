import Cartesian3 from './Cartesian3';
import defaultValue from './defaultValue';
import defined from './defined';
import Ellipsoid from './Ellipsoid';

const scaledSpaceScratch = new Cartesian3();
const directionScratch = new Cartesian3();
const scratchEllipsoidShrunk = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);

const scratchCameraPositionInScaledSpaceShrunk = new Cartesian3();

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
    _ellipsoid: Ellipsoid;
    _cameraPosition = new Cartesian3();
    _cameraPositionInScaledSpace = new Cartesian3();
    _distanceToLimbInScaledSpaceSquared = 0.0;

    constructor(ellipsoid: Ellipsoid, cameraPosition = new Cartesian3()) {
        this._ellipsoid = ellipsoid;

        // cameraPosition fills in the above values
        if (defined(cameraPosition)) {
            this.cameraPosition = cameraPosition;
        }
    }

    get ellipsoid(): Ellipsoid {
        return this._ellipsoid;
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

    /**
     * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPoint} except computes the culling
     * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
     * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
     * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
     *
     * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
     *                     A reasonable direction to use is the direction from the center of the ellipsoid to
     *                     the center of the bounding sphere computed from the positions.  The direction need not
     *                     be normalized.
     * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
     *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
     *                       ellipsoid's axes.
     * @param {Number} [minimumHeight] The minimum height of all positions. If this value is undefined, all positions are assumed to be above the ellipsoid.
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
     */
    computeHorizonCullingPointPossiblyUnderEllipsoid(directionToPoint: Cartesian3, positions: Cartesian3[], minimumHeight?: number, result?: Cartesian3): Cartesian3 {
        const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(this._ellipsoid, minimumHeight, scratchEllipsoidShrunk);
        return computeHorizonCullingPointFromPositions(possiblyShrunkEllipsoid, directionToPoint, positions, result) as Cartesian3;
    }

    /**
     * Similar to {@link EllipsoidalOccluder#isScaledSpacePointVisible} except tests against an
     * ellipsoid that has been shrunk by the minimum height when the minimum height is below
     * the ellipsoid. This is intended to be used with points generated by
     * {@link EllipsoidalOccluder#computeHorizonCullingPointPossiblyUnderEllipsoid} or
     * {@link EllipsoidalOccluder#computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid}.
     *
     * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space of the possibly-shrunk ellipsoid.
     * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
     */
    isScaledSpacePointVisiblePossiblyUnderEllipsoid(occludeeScaledSpacePosition: Cartesian3, minimumHeight?: number): boolean {
        const ellipsoid = this._ellipsoid;
        let vhMagnitudeSquared;
        let cv;

        if (defined(minimumHeight) && (minimumHeight as number) < 0.0 && ellipsoid.minimumRadius > -(minimumHeight as number)) {
            // This code is similar to the cameraPosition setter, but unrolled for performance because it will be called a lot.
            cv = scratchCameraPositionInScaledSpaceShrunk;
            cv.x = this._cameraPosition.x / (ellipsoid.radii.x + (minimumHeight as number));
            cv.y = this._cameraPosition.y / (ellipsoid.radii.y + (minimumHeight as number));
            cv.z = this._cameraPosition.z / (ellipsoid.radii.z + (minimumHeight as number));
            vhMagnitudeSquared = cv.x * cv.x + cv.y * cv.y + cv.z * cv.z - 1.0;
        } else {
            cv = this._cameraPositionInScaledSpace;
            vhMagnitudeSquared = this._distanceToLimbInScaledSpaceSquared;
        }

        return isScaledSpacePointVisible(occludeeScaledSpacePosition, cv, vhMagnitudeSquared);
    }

    /**
     * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPointFromVertices} except computes the culling
     * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
     * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
     * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
     *
     * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
     *                     A reasonable direction to use is the direction from the center of the ellipsoid to
     *                     the center of the bounding sphere computed from the positions.  The direction need not
     *                     be normalized.
     * @param {Number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
     *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
     *                   ellipsoid's axes.
     * @param {Number} [stride=3]
     * @param {Cartesian3} [center=Cartesian3.ZERO]
     * @param {Number} [minimumHeight] The minimum height of all vertices. If this value is undefined, all vertices are assumed to be above the ellipsoid.
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
     */
    computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(directionToPoint: Cartesian3, vertices: number[], stride = 3, center = Cartesian3.ZERO, minimumHeight?: number, result = new Cartesian3()): Cartesian3 {
        const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(this._ellipsoid, minimumHeight, scratchEllipsoidShrunk);
        return computeHorizonCullingPointFromVertices(possiblyShrunkEllipsoid, directionToPoint, vertices, stride, center, result);
    }
}

const scratchEllipsoidShrunkRadii = new Cartesian3();

function getPossiblyShrunkEllipsoid(ellipsoid: Ellipsoid, minimumHeight?: number, result?: Ellipsoid) {
    if (defined(minimumHeight) && (minimumHeight as number) < 0.0 && ellipsoid.minimumRadius > -(minimumHeight as number)) {
        const ellipsoidShrunkRadii = Cartesian3.fromElements(ellipsoid.radii.x + (minimumHeight as number), ellipsoid.radii.y + (minimumHeight as number), ellipsoid.radii.z + (minimumHeight as number), scratchEllipsoidShrunkRadii);
        ellipsoid = Ellipsoid.fromCartesian3(ellipsoidShrunkRadii, result);
    }
    return ellipsoid;
}

function computeHorizonCullingPointFromPositions(ellipsoid: Ellipsoid, directionToPoint: Cartesian3, positions: Cartesian3[], result = new Cartesian3()) {
    const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint);
    let resultMagnitude = 0.0;

    for (let i = 0, len = positions.length; i < len; ++i) {
        const position = positions[i];
        const candidateMagnitude = computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint);
        if (candidateMagnitude < 0.0) {
            // all points should face the same direction, but this one doesn't, so return undefined
            return undefined;
        }
        resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
    }

    return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
}

const scratchCartesian = new Cartesian3();
function isScaledSpacePointVisible(occludeeScaledSpacePosition: Cartesian3, cameraPositionInScaledSpace: Cartesian3, distanceToLimbInScaledSpaceSquared: number) {
    // See https://cesium.com/blog/2013/04/25/Horizon-culling/
    const cv = cameraPositionInScaledSpace;
    const vhMagnitudeSquared = distanceToLimbInScaledSpaceSquared;
    const vt = Cartesian3.subtract(occludeeScaledSpacePosition, cv, scratchCartesian);
    const vtDotVc = -Cartesian3.dot(vt, cv);
    // If vhMagnitudeSquared < 0 then we are below the surface of the ellipsoid and
    // in this case, set the culling plane to be on V.
    const isOccluded = vhMagnitudeSquared < 0 ? vtDotVc > 0 : vtDotVc > vhMagnitudeSquared && (vtDotVc * vtDotVc) / Cartesian3.magnitudeSquared(vt) > vhMagnitudeSquared;
    return !isOccluded;
}

const positionScratch = new Cartesian3();

function computeHorizonCullingPointFromVertices(ellipsoid: Ellipsoid, directionToPoint: Cartesian3, vertices: number[], stride = 3, center = Cartesian3.ZERO, result = new Cartesian3()): Cartesian3 {
    if (!defined(result)) {
        result = new Cartesian3();
    }

    stride = defaultValue(stride, 3);
    center = defaultValue(center, Cartesian3.ZERO);
    const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint);
    let resultMagnitude = 0.0;

    for (let i = 0, len = vertices.length; i < len; i += stride) {
        positionScratch.x = vertices[i] + center.x;
        positionScratch.y = vertices[i + 1] + center.y;
        positionScratch.z = vertices[i + 2] + center.z;

        const candidateMagnitude = computeMagnitude(ellipsoid, positionScratch, scaledSpaceDirectionToPoint);
        if (candidateMagnitude < 0.0) {
            // all points should face the same direction, but this one doesn't, so return undefined
            return undefined as any;
        }
        resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
    }

    return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result) as Cartesian3;
}
