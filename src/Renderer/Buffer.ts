import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import IndexDatatype from '@/Core/IndexDatatype';
import WebGLConstants from '@/Core/WebGLConstants';

export default class Buffer {
    _bufferTarget: any;
    _sizeInBytes: any;
    _usage: any;
    _buffer: any;
    _typedArray: any;
    vertexArrayDestroyable = true;
    constructor(options: any) {
        const bufferTarget = options.bufferTarget;
        const typedArray = options.typedArray;
        let sizeInBytes = options.sizeInBytes;
        const usage = options.usage;
        const hasArray = defined(typedArray);

        if (hasArray) {
            sizeInBytes = typedArray.byteLength;
        }

        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._typedArray = typedArray;
        // this._buffer = buffer;
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
        this._typedArray = null;
        return destroyObject(this);
    }
}
