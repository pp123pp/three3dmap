import CesiumMath from './CesiumMath';
import defined from './defined';
import DeveloperError from './DeveloperError';
import WebGLConstants from './WebGLConstants';

/**
 * Constants for WebGL index datatypes.  These corresponds to the
 * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
 *
 * @enum {Number}
 */
const IndexDatatype = {
    /**
     * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
     * of an element in <code>Uint8Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

    /**
     * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
     * of an element in <code>Uint16Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

    /**
     * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
     * of an element in <code>Uint32Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,

    /**
     * Creates a typed array that will store indices, using either <code><Uint16Array</code>
     * or <code>Uint32Array</code> depending on the number of vertices.
     *
     * @param {Number} numberOfVertices Number of vertices that the indices will reference.
     * @param {Number|Array} indicesLengthOrArray Passed through to the typed array constructor.
     * @returns {Uint16Array|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>indicesLengthOrArray</code>.
     *
     * @example
     * this.indices = Cesium.IndexDatatype.createTypedArray(positions.length / 3, numberOfIndices);
     */
    createTypedArray(numberOfVertices: number, indicesLengthOrArray: any): Uint16Array | Uint32Array {
        if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(indicesLengthOrArray);
        }

        return new Uint16Array(indicesLengthOrArray);
    },

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {IndexDatatype} indexDatatype The index datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @example
     * // Returns 2
     * const size = Cesium.IndexDatatype.getSizeInBytes(Cesium.IndexDatatype.UNSIGNED_SHORT);
     */
    getSizeInBytes(indexDatatype: any) {
        switch (indexDatatype) {
            case IndexDatatype.UNSIGNED_BYTE:
                return Uint8Array.BYTES_PER_ELEMENT;
            case IndexDatatype.UNSIGNED_SHORT:
                return Uint16Array.BYTES_PER_ELEMENT;
            case IndexDatatype.UNSIGNED_INT:
                return Uint32Array.BYTES_PER_ELEMENT;
        }
    },

    /**
     * Gets the datatype with a given size in bytes.
     *
     * @param {Number} sizeInBytes The size of a single index in bytes.
     * @returns {IndexDatatype} The index datatype with the given size.
     */
    fromSizeInBytes(sizeInBytes: number): number {
        switch (sizeInBytes) {
            case 2:
                return IndexDatatype.UNSIGNED_SHORT;
            case 4:
                return IndexDatatype.UNSIGNED_INT;
            case 1:
                return IndexDatatype.UNSIGNED_BYTE;
            //>>includeStart('debug', pragmas.debug);
            default:
                throw new DeveloperError('Size in bytes cannot be mapped to an IndexDatatype');
            //>>includeEnd('debug');
        }
    },

    /**
     * Creates a typed array from a source array buffer.  The resulting typed array will store indices, using either <code><Uint16Array</code>
     * or <code>Uint32Array</code> depending on the number of vertices.
     *
     * @param {Number} numberOfVertices Number of vertices that the indices will reference.
     * @param {ArrayBuffer} sourceArray Passed through to the typed array constructor.
     * @param {Number} byteOffset Passed through to the typed array constructor.
     * @param {Number} length Passed through to the typed array constructor.
     * @returns {Uint16Array|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>sourceArray</code>, <code>byteOffset</code>, and <code>length</code>.
     *
     */
    createTypedArrayFromArrayBuffer(numberOfVertices: number, sourceArray: any, byteOffset: number, length: number): Uint16Array | Uint32Array {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(numberOfVertices)) {
            throw new DeveloperError('numberOfVertices is required.');
        }
        if (!defined(sourceArray)) {
            throw new DeveloperError('sourceArray is required.');
        }
        if (!defined(byteOffset)) {
            throw new DeveloperError('byteOffset is required.');
        }
        //>>includeEnd('debug');

        if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(sourceArray, byteOffset, length);
        }

        return new Uint16Array(sourceArray, byteOffset, length);
    },
};
export default IndexDatatype;
