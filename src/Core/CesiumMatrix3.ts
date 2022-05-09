import { Matrix3 } from 'three';
import Cartesian3 from './Cartesian3';
import CesiumQuaternion from './CesiumQuaternion';
import { defaultValue } from './defaultValue';
import defined from './defined';

export default class CesiumMatrix3 extends Matrix3 {
    /**
     * An immutable Matrix3 instance initialized to the identity matrix.
     *
     * @type {Matrix3}
     * @constant
     */
    static IDENTITY = Object.freeze(new Matrix3().set(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0));

    /**
     * An immutable Matrix3 instance initialized to the zero matrix.
     *
     * @type {Matrix3}
     * @constant
     */
    static ZERO = Object.freeze(new Matrix3().set(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0));

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    static packedLength = 9;

    /**
     * The index into Matrix3 for column 0, row 0.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN0ROW0 = 0;

    /**
     * The index into Matrix3 for column 0, row 1.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN0ROW1 = 1;

    /**
     * The index into Matrix3 for column 0, row 2.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN0ROW2 = 2;

    /**
     * The index into Matrix3 for column 1, row 0.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN1ROW0 = 3;

    /**
     * The index into Matrix3 for column 1, row 1.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN1ROW1 = 4;

    /**
     * The index into Matrix3 for column 1, row 2.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN1ROW2 = 5;

    /**
     * The index into Matrix3 for column 2, row 0.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN2ROW0 = 6;

    /**
     * The index into Matrix3 for column 2, row 1.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN2ROW1 = 7;

    /**
     * The index into Matrix3 for column 2, row 2.
     *
     * @type {Number}
     * @constant
     */
    static COLUMN2ROW2 = 8;

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    static setColumn(matrix: CesiumMatrix3, index: number, cartesian: Cartesian3, result: CesiumMatrix3): CesiumMatrix3 {
        result = CesiumMatrix3.clone(matrix, result);
        const startIndex = index * 3;
        result.elements[startIndex] = cartesian.x;
        result.elements[startIndex + 1] = cartesian.y;
        result.elements[startIndex + 2] = cartesian.z;
        return result;
    }

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    static getColumn(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3 {
        const elements = matrix.elements;

        const startIndex = index * 3;
        const x = elements[startIndex];
        const y = elements[startIndex + 1];
        const z = elements[startIndex + 2];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Duplicates a Matrix3 instance.
     *
     * @param {CesiumMatrix3} matrix The matrix to duplicate.
     * @param {CesiumMatrix3} [result] The object onto which to store the result.
     * @returns {CesiumMatrix3} The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
     */
    static clone(matrix: CesiumMatrix3, result = new CesiumMatrix3()): CesiumMatrix3 {
        if (!defined(result)) {
            return new Matrix3().set(matrix.elements[0], matrix.elements[3], matrix.elements[6], matrix.elements[1], matrix.elements[4], matrix.elements[7], matrix.elements[2], matrix.elements[5], matrix.elements[8]);
        }
        result.elements[0] = matrix.elements[0];
        result.elements[1] = matrix.elements[1];
        result.elements[2] = matrix.elements[2];
        result.elements[3] = matrix.elements[3];
        result.elements[4] = matrix.elements[4];
        result.elements[5] = matrix.elements[5];
        result.elements[6] = matrix.elements[6];
        result.elements[7] = matrix.elements[7];
        result.elements[8] = matrix.elements[8];
        return result;
    }

    /**
     * Computes the product of a matrix and a column vector.
     *
     * @param {Matrix3} matrix The matrix.
     * @param {Cartesian3} cartesian The column.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static multiplyByVector(matrix: CesiumMatrix3, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix.elements[0] * vX + matrix.elements[3] * vY + matrix.elements[6] * vZ;
        const y = matrix.elements[1] * vX + matrix.elements[4] * vY + matrix.elements[7] * vZ;
        const z = matrix.elements[2] * vX + matrix.elements[5] * vY + matrix.elements[8] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
     *
     * @param {Matrix3} matrix The matrix on the left-hand side.
     * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     *
     * @example
     * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromScale(scale), m);
     * Cesium.Matrix3.multiplyByScale(m, scale, m);
     *
     * @see Matrix3.fromScale
     * @see Matrix3.multiplyByUniformScale
     */
    static multiplyByScale(matrix: CesiumMatrix3, scale: Cartesian3, result: CesiumMatrix3): CesiumMatrix3 {
        result.elements[0] = matrix.elements[0] * scale.x;
        result.elements[1] = matrix.elements[1] * scale.x;
        result.elements[2] = matrix.elements[2] * scale.x;
        result.elements[3] = matrix.elements[3] * scale.y;
        result.elements[4] = matrix.elements[4] * scale.y;
        result.elements[5] = matrix.elements[5] * scale.y;
        result.elements[6] = matrix.elements[6] * scale.z;
        result.elements[7] = matrix.elements[7] * scale.z;
        result.elements[8] = matrix.elements[8] * scale.z;
        return result;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Matrix3} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    static pack(value: CesiumMatrix3, array: number[], startingIndex = 0): number[] {
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.elements[0];
        array[startingIndex++] = value.elements[1];
        array[startingIndex++] = value.elements[2];
        array[startingIndex++] = value.elements[3];
        array[startingIndex++] = value.elements[4];
        array[startingIndex++] = value.elements[5];
        array[startingIndex++] = value.elements[6];
        array[startingIndex++] = value.elements[7];
        array[startingIndex++] = value.elements[8];

        return array;
    }

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Matrix3} [result] The object into which to store the result.
     * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
     */
    static unpack(array: number[], startingIndex = 0, result = new CesiumMatrix3()): CesiumMatrix3 {
        result.elements[0] = array[startingIndex++];
        result.elements[1] = array[startingIndex++];
        result.elements[2] = array[startingIndex++];
        result.elements[3] = array[startingIndex++];
        result.elements[4] = array[startingIndex++];
        result.elements[5] = array[startingIndex++];
        result.elements[6] = array[startingIndex++];
        result.elements[7] = array[startingIndex++];
        result.elements[8] = array[startingIndex++];
        return result;
    }

    /**
     * Computes a 3x3 rotation matrix from the provided quaternion.
     *
     * @param {Quaternion} quaternion the quaternion to use.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix3} The 3x3 rotation matrix from this quaternion.
     */
    static fromQuaternion(quaternion: CesiumQuaternion, result = new CesiumMatrix3()): CesiumMatrix3 {
        const x2 = quaternion.x * quaternion.x;
        const xy = quaternion.x * quaternion.y;
        const xz = quaternion.x * quaternion.z;
        const xw = quaternion.x * quaternion.w;
        const y2 = quaternion.y * quaternion.y;
        const yz = quaternion.y * quaternion.z;
        const yw = quaternion.y * quaternion.w;
        const z2 = quaternion.z * quaternion.z;
        const zw = quaternion.z * quaternion.w;
        const w2 = quaternion.w * quaternion.w;

        const m00 = x2 - y2 - z2 + w2;
        const m01 = 2.0 * (xy - zw);
        const m02 = 2.0 * (xz + yw);

        const m10 = 2.0 * (xy + zw);
        const m11 = -x2 + y2 - z2 + w2;
        const m12 = 2.0 * (yz - xw);

        const m20 = 2.0 * (xz - yw);
        const m21 = 2.0 * (yz + xw);
        const m22 = -x2 - y2 + z2 + w2;

        result.elements[0] = m00;
        result.elements[1] = m10;
        result.elements[2] = m20;
        result.elements[3] = m01;
        result.elements[4] = m11;
        result.elements[5] = m21;
        result.elements[6] = m02;
        result.elements[7] = m12;
        result.elements[8] = m22;
        return result;
    }

    /**
     * Computes a Matrix3 instance representing a non-uniform scale.
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0]
     * //   [0.0, 0.0, 9.0]
     * const m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    static fromScale(scale: Cartesian3, result = new CesiumMatrix3()): CesiumMatrix3 {
        const elements = result.elements;
        elements[0] = scale.x;
        elements[1] = 0.0;
        elements[2] = 0.0;
        elements[3] = 0.0;
        elements[4] = scale.y;
        elements[5] = 0.0;
        elements[6] = 0.0;
        elements[7] = 0.0;
        elements[8] = scale.z;
        return result;
    }

    /**
     * Computes the product of two matrices.
     *
     * @param {Matrix3} left The first matrix.
     * @param {Matrix3} right The second matrix.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    static multiply(left: CesiumMatrix3, right: CesiumMatrix3, result: CesiumMatrix3): CesiumMatrix3 {
        const leftElements = left.elements;
        const rightElements = right.elements;
        const column0Row0 = leftElements[0] * rightElements[0] + leftElements[3] * rightElements[1] + leftElements[6] * rightElements[2];
        const column0Row1 = leftElements[1] * rightElements[0] + leftElements[4] * rightElements[1] + leftElements[7] * rightElements[2];
        const column0Row2 = leftElements[2] * rightElements[0] + leftElements[5] * rightElements[1] + leftElements[8] * rightElements[2];

        const column1Row0 = leftElements[0] * rightElements[3] + leftElements[3] * rightElements[4] + leftElements[6] * rightElements[5];
        const column1Row1 = leftElements[1] * rightElements[3] + leftElements[4] * rightElements[4] + leftElements[7] * rightElements[5];
        const column1Row2 = leftElements[2] * rightElements[3] + leftElements[5] * rightElements[4] + leftElements[8] * rightElements[5];

        const column2Row0 = leftElements[0] * rightElements[6] + leftElements[3] * rightElements[7] + leftElements[6] * rightElements[8];
        const column2Row1 = leftElements[1] * rightElements[6] + leftElements[4] * rightElements[7] + leftElements[7] * rightElements[8];
        const column2Row2 = leftElements[2] * rightElements[6] + leftElements[5] * rightElements[7] + leftElements[8] * rightElements[8];

        const elements = result.elements;

        elements[0] = column0Row0;
        elements[1] = column0Row1;
        elements[2] = column0Row2;
        elements[3] = column1Row0;
        elements[4] = column1Row1;
        elements[5] = column1Row2;
        elements[6] = column2Row0;
        elements[7] = column2Row1;
        elements[8] = column2Row2;
        return result;
    }

    /**
     * Computes the transpose of the provided matrix.
     *
     * @param {Matrix3} matrix The matrix to transpose.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    static transpose(matrix: CesiumMatrix3, result: CesiumMatrix3): CesiumMatrix3 {
        const matElements = matrix.elements;
        const column0Row0 = matElements[0];
        const column0Row1 = matElements[3];
        const column0Row2 = matElements[6];
        const column1Row0 = matElements[1];
        const column1Row1 = matElements[4];
        const column1Row2 = matElements[7];
        const column2Row0 = matElements[2];
        const column2Row1 = matElements[5];
        const column2Row2 = matElements[8];

        const elements = result.elements;

        elements[0] = column0Row0;
        elements[1] = column0Row1;
        elements[2] = column0Row2;
        elements[3] = column1Row0;
        elements[4] = column1Row1;
        elements[5] = column1Row2;
        elements[6] = column2Row0;
        elements[7] = column2Row1;
        elements[8] = column2Row2;
        return result;
    }
}
