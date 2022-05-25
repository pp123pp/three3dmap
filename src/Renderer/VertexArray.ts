import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import Buffer from './Buffer';
import Context from './Context';

interface IVertexArray {
    context: Context;
    attributes: any[];
    indexBuffer: Buffer;
}

export default class VertexArray {
    _context: Context;
    _attributes: any;
    _indexBuffer: Buffer;
    constructor(options: IVertexArray) {
        const context = options.context;
        const gl = context.gl;
        const attributes = options.attributes;
        const indexBuffer = options.indexBuffer;

        this._context = options.context;
        this._attributes = options.attributes;
        this._indexBuffer = options.indexBuffer;
    }

    get indexBuffer(): Buffer {
        return this._indexBuffer;
    }

    isDestroyed(): boolean {
        return false;
    }

    destroy(): void {
        const attributes = this._attributes;
        for (let i = 0; i < attributes.length; ++i) {
            const vertexBuffer = attributes[i].vertexBuffer;
            if (defined(vertexBuffer) && !vertexBuffer.isDestroyed()) {
                vertexBuffer.destroy();
            }
        }

        const indexBuffer = this._indexBuffer;
        if (defined(indexBuffer)) {
            indexBuffer._typedArray = null;
        }

        return destroyObject(this);
    }
}
