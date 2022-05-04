/* eslint-disable no-prototype-builtins */
import Cartesian3 from './Cartesian3';
import Cartographic from './Cartographic';
import { CesiumMath } from './CesiumMath';
import CesiumMatrix3 from './CesiumMatrix3';
import CesiumMatrix4 from './CesiumMatrix4';
import { defaultValue } from './defaultValue';
import defined from './defined';
import DeveloperError from './DeveloperError';
import Ellipsoid from './Ellipsoid';

type TLocalFrame = 'north' | 'east' | 'up' | 'south' | 'west' | 'down';

const vectorProductLocalFrame: {
    [name: string]: any;
} = {
    up: {
        south: 'east',
        north: 'west',
        west: 'south',
        east: 'north',
    },
    down: {
        south: 'west',
        north: 'east',
        west: 'north',
        east: 'south',
    },
    south: {
        up: 'west',
        down: 'east',
        west: 'down',
        east: 'up',
    },
    north: {
        up: 'east',
        down: 'west',
        west: 'up',
        east: 'down',
    },
    west: {
        up: 'north',
        down: 'south',
        north: 'down',
        south: 'up',
    },
    east: {
        up: 'south',
        down: 'north',
        north: 'up',
        south: 'down',
    },
};

const degeneratePositionLocalFrame = {
    north: [-1, 0, 0],
    east: [0, 1, 0],
    up: [0, 0, 1],
    south: [1, 0, 0],
    west: [0, -1, 0],
    down: [0, 0, -1],
};

const localFrameToFixedFrameCache: any = {};

const scratchCalculateCartesian = {
    east: new Cartesian3(),
    north: new Cartesian3(),
    up: new Cartesian3(),
    west: new Cartesian3(),
    south: new Cartesian3(),
    down: new Cartesian3(),
};
let scratchFirstCartesian = new Cartesian3();
let scratchSecondCartesian = new Cartesian3();
let scratchThirdCartesian = new Cartesian3();

const swizzleMatrix = new CesiumMatrix4().set(0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);

const scratchCartographic = new Cartographic();
const scratchCartesian3Projection = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchRotation = new CesiumMatrix3();
const scratchFromENU = new CesiumMatrix4();
const scratchToENU = new CesiumMatrix4();

/**
 * Contains functions for transforming positions to various reference frames.
 *
 * @namespace Transforms
 */
export default class Transforms {
    /**
     * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * The local axes are defined as:
     * <ul>
     * <li>The <code>x</code> axis points in the local east direction.</li>
     * <li>The <code>y</code> axis points in the local north direction.</li>
     * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
     * </ul>
     *
     * @function
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @example
     * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
     * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
     */
    static eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator('east', 'north');

    /**
     * Generates a function that computes a 4x4 transformation matrix from a reference frame
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * @param  {String} firstAxis  name of the first axis of the local reference frame. Must be
     *  'east', 'north', 'up', 'west', 'south' or 'down'.
     * @param  {String} secondAxis  name of the second axis of the local reference frame. Must be
     *  'east', 'north', 'up', 'west', 'south' or 'down'.
     * @return {Transforms.LocalFrameToFixedFrame} The function that will computes a
     * 4x4 transformation matrix from a reference frame, with first axis and second axis compliant with the parameters,
     */
    static localFrameToFixedFrameGenerator(firstAxis: TLocalFrame, secondAxis: TLocalFrame): CesiumMatrix4 {
        if (!vectorProductLocalFrame.hasOwnProperty(firstAxis) || !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)) {
            throw new DeveloperError('firstAxis and secondAxis must be east, north, up, west, south or down.');
        }
        const thirdAxis: TLocalFrame = vectorProductLocalFrame[firstAxis][secondAxis];

        /**
         * Computes a 4x4 transformation matrix from a reference frame
         * centered at the provided origin to the provided ellipsoid's fixed reference frame.
         * @callback Transforms~LocalFrameToFixedFrame
         * @param {Vector3} origin The center point of the local reference frame.
         * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
         * @param {Matrix4} [result] The object onto which to store the result.
         * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
         */
        let resultat;
        const hashAxis = firstAxis + secondAxis;
        if (defined(localFrameToFixedFrameCache[hashAxis])) {
            resultat = localFrameToFixedFrameCache[hashAxis];
        } else {
            resultat = function (origin: Cartesian3, ellipsoid = Ellipsoid.WGS84, result = new CesiumMatrix4()) {
                // If x and y are zero, assume origin is at a pole, which is a special case.
                if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) && CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
                    const sign = CesiumMath.sign(origin.z);

                    Cartesian3.unpack(degeneratePositionLocalFrame[firstAxis], 0, scratchFirstCartesian);
                    if (firstAxis !== 'east' && firstAxis !== 'west') {
                        Cartesian3.multiplyByScalar(scratchFirstCartesian, sign, scratchFirstCartesian);
                    }

                    Cartesian3.unpack(degeneratePositionLocalFrame[secondAxis], 0, scratchSecondCartesian);
                    if (secondAxis !== 'east' && secondAxis !== 'west') {
                        Cartesian3.multiplyByScalar(scratchSecondCartesian, sign, scratchSecondCartesian);
                    }

                    Cartesian3.unpack(degeneratePositionLocalFrame[thirdAxis], 0, scratchThirdCartesian);
                    if (thirdAxis !== 'east' && thirdAxis !== 'west') {
                        Cartesian3.multiplyByScalar(scratchThirdCartesian, sign, scratchThirdCartesian);
                    }
                } else {
                    ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);

                    const up = scratchCalculateCartesian.up;
                    const east = scratchCalculateCartesian.east;
                    east.x = -origin.y;
                    east.y = origin.x;
                    east.z = 0.0;
                    Cartesian3.normalize(east, scratchCalculateCartesian.east);
                    Cartesian3.cross(up, east, scratchCalculateCartesian.north);

                    Cartesian3.multiplyByScalar(scratchCalculateCartesian.up, -1, scratchCalculateCartesian.down);
                    Cartesian3.multiplyByScalar(scratchCalculateCartesian.east, -1, scratchCalculateCartesian.west);
                    Cartesian3.multiplyByScalar(scratchCalculateCartesian.north, -1, scratchCalculateCartesian.south);

                    scratchFirstCartesian = scratchCalculateCartesian[firstAxis];
                    scratchSecondCartesian = scratchCalculateCartesian[secondAxis];
                    scratchThirdCartesian = scratchCalculateCartesian[thirdAxis];
                }
                result.elements[0] = scratchFirstCartesian.x;
                result.elements[1] = scratchFirstCartesian.y;
                result.elements[2] = scratchFirstCartesian.z;
                result.elements[3] = 0.0;
                result.elements[4] = scratchSecondCartesian.x;
                result.elements[5] = scratchSecondCartesian.y;
                result.elements[6] = scratchSecondCartesian.z;
                result.elements[7] = 0.0;
                result.elements[8] = scratchThirdCartesian.x;
                result.elements[9] = scratchThirdCartesian.y;
                result.elements[10] = scratchThirdCartesian.z;
                result.elements[11] = 0.0;
                result.elements[12] = origin.x;
                result.elements[13] = origin.y;
                result.elements[14] = origin.z;
                result.elements[15] = 1.0;
                return result;
            };
            localFrameToFixedFrameCache[hashAxis] = resultat;
        }
        return resultat;
    }

    /**
     * @private
     */
    static basisTo2D(projection: any, matrix: CesiumMatrix4, result: CesiumMatrix4): CesiumMatrix4 {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(projection)) {
            throw new DeveloperError('projection is required.');
        }
        if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        const rtcCenter = CesiumMatrix4.getTranslation(matrix, scratchCenter);
        const ellipsoid = projection.ellipsoid;

        // Get the 2D Center
        const cartographic = ellipsoid.cartesianToCartographic(rtcCenter, scratchCartographic);
        const projectedPosition = projection.project(cartographic, scratchCartesian3Projection);
        Cartesian3.fromElements(projectedPosition.z, projectedPosition.x, projectedPosition.y, projectedPosition);

        // Assuming the instance are positioned in WGS84, invert the WGS84 transform to get the local transform and then convert to 2D
        const fromENU = (Transforms as any).eastNorthUpToFixedFrame(rtcCenter, ellipsoid, scratchFromENU);
        const toENU = CesiumMatrix4.inverseTransformation(fromENU, scratchToENU);
        const rotation = CesiumMatrix4.getMatrix3(matrix, scratchRotation);
        const local = CesiumMatrix4.multiplyByMatrix3(toENU, rotation, result);
        CesiumMatrix4.multiply(swizzleMatrix, local, result); // Swap x, y, z for 2D
        CesiumMatrix4.setTranslation(result, projectedPosition, result); // Use the projected center

        return result;
    }
}
