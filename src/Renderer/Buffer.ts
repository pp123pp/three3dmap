import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import IndexDatatype from '@/Core/IndexDatatype';
import WebGLConstants from '@/Core/WebGLConstants';
import { GLBufferAttribute } from 'three';
import Context from './Context';

interface IBuffer {
    context: Context;
    bufferTarget: WebGLConstants;
    usage: number;
    [key: string]: any;
}

export default class Buffer {
    _bufferTarget: any;
    _sizeInBytes: any;
    _usage: any;
    _buffer: WebGLBuffer;
    _typedArray: any;
    vertexArrayDestroyable = true;
    referenceCount = 0;
    _gl: WebGL2RenderingContext;
    constructor(options: IBuffer) {
        const bufferTarget = options.bufferTarget;
        const typedArray = options.typedArray;
        let sizeInBytes = options.sizeInBytes;
        const usage = options.usage;
        const hasArray = defined(typedArray);

        if (hasArray) {
            sizeInBytes = typedArray.byteLength;
        }

        const gl = options.context.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(bufferTarget, buffer);
        gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
        gl.bindBuffer(bufferTarget, null);

        this._gl = gl;

        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._typedArray = typedArray;

        this._buffer = buffer as WebGLBuffer;
    }

    get sizeInBytes(): any {
        return this._sizeInBytes;
    }

    static createVertexBuffer(options: any): Buffer {
        return new Buffer({
            context: options.context,
            bufferTarget: WebGLConstants.ARRAY_BUFFER,
            typedArray: options.typedArray,
            sizeInBytes: options.sizeInBytes,
            usage: options.usage,
        });
    }

    static createIndexBuffer(options: any): Buffer {
        const context = options.context;
        const indexDatatype = options.indexDatatype;

        const bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype) as number;
        const buffer = new Buffer({
            context: context,
            bufferTarget: WebGLConstants.ELEMENT_ARRAY_BUFFER,
            typedArray: options.typedArray,
            sizeInBytes: options.sizeInBytes,
            usage: options.usage,
        });

        const numberOfIndices = buffer.sizeInBytes / bytesPerIndex;

        Object.defineProperties(buffer, {
            indexDatatype: {
                get: function () {
                    return indexDatatype;
                },
            },
            bytesPerIndex: {
                get: function () {
                    return bytesPerIndex;
                },
            },
            numberOfIndices: {
                get: function () {
                    return numberOfIndices;
                },
            },
        });

        return buffer;
    }

    isDestroyed(): boolean {
        return false;
    }

    destroy(): void {
        this._gl.deleteBuffer(this._buffer);
        this._typedArray = null;
        return destroyObject(this);
    }
}
