import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import Context from './Context';

export default class VertexArray {
    _context: Context;
    _attributes: any;
    _indexBuffer: any;
    constructor(options: any) {
        this._context = options.context;
        this._attributes = options.attributes;
        this._indexBuffer = options.indexBuffer;
    }

    get indexBuffer(): any {
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
            indexBuffer.array = null;
        }

        return destroyObject(this);
    }
}
