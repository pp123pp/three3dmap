import { ComponentDatatype } from '@/Core/ComponentDatatype';
import defaultValue from '@/Core/defaultValue';
import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import DeveloperError from '@/Core/DeveloperError';
import IAttribute from '@/Core/TerrainEncoding';
import Buffer from './Buffer';
import Context from './Context';

interface IVertexArray {
    context: Context;
    attributes: any[];
    indexBuffer: Buffer;
}

// function addAttribute(attributes: any[], attribute: IAttribute, index: number, context: Context) {
//     const hasVertexBuffer = defined(attribute.vertexBuffer);
//     const hasValue = defined(attribute.value);
//     const componentsPerAttribute = attribute.value ? attribute.value.length : attribute.componentsPerAttribute;

//     //>>includeStart('debug', pragmas.debug);
//     if (!hasVertexBuffer && !hasValue) {
//         throw new DeveloperError('attribute must have a vertexBuffer or a value.');
//     }
//     if (hasVertexBuffer && hasValue) {
//         throw new DeveloperError('attribute cannot have both a vertexBuffer and a value.  It must have either a vertexBuffer property defining per-vertex data or a value property defining data for all vertices.');
//     }
//     if (componentsPerAttribute !== 1 && componentsPerAttribute !== 2 && componentsPerAttribute !== 3 && componentsPerAttribute !== 4) {
//         if (hasValue) {
//             throw new DeveloperError('attribute.value.length must be in the range [1, 4].');
//         }

//         throw new DeveloperError('attribute.componentsPerAttribute must be in the range [1, 4].');
//     }
//     if (defined(attribute.componentDatatype) && !ComponentDatatype.validate(attribute.componentDatatype)) {
//         throw new DeveloperError('attribute must have a valid componentDatatype or not specify it.');
//     }
//     if (defined(attribute.strideInBytes) && attribute.strideInBytes > 255) {
//         // WebGL limit.  Not in GL ES.
//         throw new DeveloperError('attribute must have a strideInBytes less than or equal to 255 or not specify it.');
//     }

//     //>>includeEnd('debug');

//     // Shallow copy the attribute; we do not want to copy the vertex buffer.
//     const attr: any = {
//         index: defaultValue(attribute.index, index),
//         enabled: defaultValue(attribute.enabled, true),
//         vertexBuffer: attribute.vertexBuffer,
//         value: hasValue ? attribute.value.slice(0) : undefined,
//         componentsPerAttribute: componentsPerAttribute,
//         componentDatatype: defaultValue(attribute.componentDatatype, ComponentDatatype.FLOAT),
//         normalize: defaultValue(attribute.normalize, false),
//         offsetInBytes: defaultValue(attribute.offsetInBytes, 0),
//         strideInBytes: defaultValue(attribute.strideInBytes, 0),
//         instanceDivisor: defaultValue(attribute.instanceDivisor, 0),
//     };

//     if (hasVertexBuffer) {
//         // Common case: vertex buffer for per-vertex data
//         attr.vertexAttrib = function (gl) {
//             const index = this.index;
//             gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer._getBuffer());
//             gl.vertexAttribPointer(index, this.componentsPerAttribute, this.componentDatatype, this.normalize, this.strideInBytes, this.offsetInBytes);
//             gl.enableVertexAttribArray(index);
//         };

//         attr.disableVertexAttribArray = function (gl) {
//             gl.disableVertexAttribArray(this.index);
//         };
//     } else {
//         // Less common case: value array for the same data for each vertex
//         switch (attr.componentsPerAttribute) {
//             case 1:
//                 attr.vertexAttrib = function (gl) {
//                     gl.vertexAttrib1fv(this.index, this.value);
//                 };
//                 break;
//             case 2:
//                 attr.vertexAttrib = function (gl) {
//                     gl.vertexAttrib2fv(this.index, this.value);
//                 };
//                 break;
//             case 3:
//                 attr.vertexAttrib = function (gl) {
//                     gl.vertexAttrib3fv(this.index, this.value);
//                 };
//                 break;
//             case 4:
//                 attr.vertexAttrib = function (gl) {
//                     gl.vertexAttrib4fv(this.index, this.value);
//                 };
//                 break;
//         }

//         attr.disableVertexAttribArray = function (gl) {};
//     }

//     attributes.push(attr);
// }

export default class VertexArray {
    _context: Context;
    _attributes: any;
    _indexBuffer: Buffer;
    constructor(options: IVertexArray) {
        const context = options.context;
        const gl = context.gl;
        const attributes = options.attributes;
        const indexBuffer = options.indexBuffer;

        let i;
        const vaAttributes: any[] = [];
        const numberOfVertices = 1; // if every attribute is backed by a single value
        const hasInstancedAttributes = false;
        const hasConstantAttributes = false;

        // const length = attributes.length;
        // for (i = 0; i < length; ++i) {
        //     addAttribute(vaAttributes, attributes[i], i, context);
        // }

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
