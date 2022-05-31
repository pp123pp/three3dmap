import AxisAlignedBoundingBox from './AxisAlignedBoundingBox';
import Cartesian2 from './Cartesian2';
import Cartesian3 from './Cartesian3';
import Cartographic from './Cartographic';
import CesiumMath from './CesiumMath';
import CesiumMatrix4 from './CesiumMatrix4';
import defined from './defined';
import Ellipsoid from './Ellipsoid';
import EllipsoidalOccluder from './EllipsoidalOccluder';
import Rectangle from './Rectangle';
import Transforms from './Transforms';
import { WebMercatorProjection } from './WebMercatorProjection';
import TerrainEncoding from './TerrainEncoding';
import IndexDatatype from './IndexDatatype';
import TerrainProvider from './TerrainProvider';

const maxShort = 32767;

const cartesian3Scratch = new Cartesian3();
const scratchMinimum = new Cartesian3();
const scratchMaximum = new Cartesian3();
const cartographicScratch = new Cartographic();
const toPack = new Cartesian2();

function createVerticesFromQuantizedTerrainMesh(parameters: any, transferableObjects?: any) {
    const quantizedVertices = parameters.quantizedVertices;
    const quantizedVertexCount = quantizedVertices.length / 3;
    const octEncodedNormals = parameters.octEncodedNormals;
    const edgeVertexCount = parameters.westIndices.length + parameters.eastIndices.length + parameters.southIndices.length + parameters.northIndices.length;
    const includeWebMercatorT = parameters.includeWebMercatorT;

    const exaggeration = parameters.exaggeration;
    const exaggerationRelativeHeight = parameters.exaggerationRelativeHeight;
    const hasExaggeration = exaggeration !== 1.0;
    const includeGeodeticSurfaceNormals = hasExaggeration;

    const rectangle = Rectangle.clone(parameters.rectangle) as Rectangle;
    const west = rectangle.west;
    const south = rectangle.south;
    const east = rectangle.east;
    const north = rectangle.north;

    const ellipsoid = Ellipsoid.clone(parameters.ellipsoid);

    const minimumHeight = parameters.minimumHeight;
    const maximumHeight = parameters.maximumHeight;

    const center = parameters.relativeToCenter;
    const fromENU = (Transforms as any).eastNorthUpToFixedFrame(center, ellipsoid);
    const toENU = CesiumMatrix4.inverseTransformation(fromENU, new CesiumMatrix4());

    let southMercatorY;
    let oneOverMercatorHeight;
    if (includeWebMercatorT) {
        southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(south);
        oneOverMercatorHeight = 1.0 / (WebMercatorProjection.geodeticLatitudeToMercatorAngle(north) - southMercatorY);
    }

    const uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
    const vBuffer = quantizedVertices.subarray(quantizedVertexCount, 2 * quantizedVertexCount);
    const heightBuffer = quantizedVertices.subarray(quantizedVertexCount * 2, 3 * quantizedVertexCount);
    const hasVertexNormals = defined(octEncodedNormals);

    const uvs = new Array(quantizedVertexCount);
    const heights = new Array(quantizedVertexCount);
    const positions = new Array(quantizedVertexCount);
    const webMercatorTs = includeWebMercatorT ? new Array(quantizedVertexCount) : [];
    const geodeticSurfaceNormals = includeGeodeticSurfaceNormals ? new Array(quantizedVertexCount) : [];

    const minimum = scratchMinimum;
    minimum.x = Number.POSITIVE_INFINITY;
    minimum.y = Number.POSITIVE_INFINITY;
    minimum.z = Number.POSITIVE_INFINITY;

    const maximum = scratchMaximum;
    maximum.x = Number.NEGATIVE_INFINITY;
    maximum.y = Number.NEGATIVE_INFINITY;
    maximum.z = Number.NEGATIVE_INFINITY;

    let minLongitude = Number.POSITIVE_INFINITY;
    let maxLongitude = Number.NEGATIVE_INFINITY;
    let minLatitude = Number.POSITIVE_INFINITY;
    let maxLatitude = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < quantizedVertexCount; ++i) {
        const rawU = uBuffer[i];
        const rawV = vBuffer[i];

        const u = rawU / maxShort;
        const v = rawV / maxShort;
        const height = CesiumMath.lerp(minimumHeight, maximumHeight, heightBuffer[i] / maxShort);

        cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
        cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
        cartographicScratch.height = height;

        minLongitude = Math.min(cartographicScratch.longitude, minLongitude);
        maxLongitude = Math.max(cartographicScratch.longitude, maxLongitude);
        minLatitude = Math.min(cartographicScratch.latitude, minLatitude);
        maxLatitude = Math.max(cartographicScratch.latitude, maxLatitude);

        const position = ellipsoid.cartographicToCartesian(cartographicScratch);

        uvs[i] = new Cartesian2(u, v);
        heights[i] = height;
        positions[i] = position;

        if (includeWebMercatorT) {
            webMercatorTs[i] = (WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographicScratch.latitude) - (southMercatorY as number)) * (oneOverMercatorHeight as number);
        }

        if (includeGeodeticSurfaceNormals) {
            geodeticSurfaceNormals[i] = ellipsoid.geodeticSurfaceNormal(position);
        }

        CesiumMatrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

        Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
        Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
    }

    const westIndicesSouthToNorth = copyAndSort(parameters.westIndices, function (a: any, b: any) {
        return uvs[a].y - uvs[b].y;
    });
    const eastIndicesNorthToSouth = copyAndSort(parameters.eastIndices, function (a: any, b: any) {
        return uvs[b].y - uvs[a].y;
    });
    const southIndicesEastToWest = copyAndSort(parameters.southIndices, function (a: any, b: any) {
        return uvs[b].x - uvs[a].x;
    });
    const northIndicesWestToEast = copyAndSort(parameters.northIndices, function (a: any, b: any) {
        return uvs[a].x - uvs[b].x;
    });

    let occludeePointInScaledSpace;
    if (minimumHeight < 0.0) {
        // Horizon culling point needs to be recomputed since the tile is at least partly under the ellipsoid.
        const occluder = new EllipsoidalOccluder(ellipsoid);
        occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(center, positions, minimumHeight);
    }

    let hMin = minimumHeight;
    hMin = Math.min(hMin, findMinMaxSkirts(parameters.westIndices, parameters.westSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
    hMin = Math.min(hMin, findMinMaxSkirts(parameters.southIndices, parameters.southSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
    hMin = Math.min(hMin, findMinMaxSkirts(parameters.eastIndices, parameters.eastSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
    hMin = Math.min(hMin, findMinMaxSkirts(parameters.northIndices, parameters.northSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));

    const aaBox = new AxisAlignedBoundingBox(minimum, maximum, center);
    const encoding = new TerrainEncoding(center, aaBox, hMin, maximumHeight, fromENU, hasVertexNormals, includeWebMercatorT, includeGeodeticSurfaceNormals, exaggeration, exaggerationRelativeHeight);
    const vertexStride = encoding.stride;
    const size = quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
    const vertexBuffer = new Float32Array(size);

    let bufferIndex = 0;
    for (let j = 0; j < quantizedVertexCount; ++j) {
        if (hasVertexNormals) {
            const n = j * 2.0;
            toPack.x = octEncodedNormals[n];
            toPack.y = octEncodedNormals[n + 1];
        }

        bufferIndex = encoding.encode(vertexBuffer, bufferIndex, positions[j], uvs[j], heights[j], toPack, webMercatorTs[j], geodeticSurfaceNormals[j]);
    }

    const edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
    const indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
    const indexBuffer = IndexDatatype.createTypedArray(quantizedVertexCount + edgeVertexCount, indexBufferLength);
    indexBuffer.set(parameters.indices, 0);

    const percentage = 0.0001;
    const lonOffset = (maxLongitude - minLongitude) * percentage;
    const latOffset = (maxLatitude - minLatitude) * percentage;
    const westLongitudeOffset = -lonOffset;
    const westLatitudeOffset = 0.0;
    const eastLongitudeOffset = lonOffset;
    const eastLatitudeOffset = 0.0;
    const northLongitudeOffset = 0.0;
    const northLatitudeOffset = latOffset;
    const southLongitudeOffset = 0.0;
    const southLatitudeOffset = -latOffset;

    // Add skirts.
    let vertexBufferIndex = quantizedVertexCount * vertexStride;
    addSkirt(vertexBuffer, vertexBufferIndex, westIndicesSouthToNorth, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.westSkirtHeight, southMercatorY, oneOverMercatorHeight, westLongitudeOffset, westLatitudeOffset);
    vertexBufferIndex += parameters.westIndices.length * vertexStride;
    addSkirt(vertexBuffer, vertexBufferIndex, southIndicesEastToWest, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.southSkirtHeight, southMercatorY, oneOverMercatorHeight, southLongitudeOffset, southLatitudeOffset);
    vertexBufferIndex += parameters.southIndices.length * vertexStride;
    addSkirt(vertexBuffer, vertexBufferIndex, eastIndicesNorthToSouth, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.eastSkirtHeight, southMercatorY, oneOverMercatorHeight, eastLongitudeOffset, eastLatitudeOffset);
    vertexBufferIndex += parameters.eastIndices.length * vertexStride;
    addSkirt(vertexBuffer, vertexBufferIndex, northIndicesWestToEast, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.northSkirtHeight, southMercatorY, oneOverMercatorHeight, northLongitudeOffset, northLatitudeOffset);

    TerrainProvider.addSkirtIndices(westIndicesSouthToNorth, southIndicesEastToWest, eastIndicesNorthToSouth, northIndicesWestToEast, quantizedVertexCount, indexBuffer, parameters.indices.length);

    // transferableObjects.push(vertexBuffer.buffer, indexBuffer.buffer);

    return {
        vertices: vertexBuffer.buffer,
        indices: indexBuffer.buffer,
        westIndicesSouthToNorth: westIndicesSouthToNorth,
        southIndicesEastToWest: southIndicesEastToWest,
        eastIndicesNorthToSouth: eastIndicesNorthToSouth,
        northIndicesWestToEast: northIndicesWestToEast,
        vertexStride: vertexStride,
        center: center,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
        occludeePointInScaledSpace: occludeePointInScaledSpace,
        encoding: encoding,
        indexCountWithoutSkirts: parameters.indices.length,
    };
}

function findMinMaxSkirts(edgeIndices: any, edgeHeight: any, heights: any, uvs: any, rectangle: any, ellipsoid: any, toENU: any, minimum: any, maximum: any) {
    let hMin = Number.POSITIVE_INFINITY;

    const north = rectangle.north;
    const south = rectangle.south;
    let east = rectangle.east;
    const west = rectangle.west;

    if (east < west) {
        east += CesiumMath.TWO_PI;
    }

    const length = edgeIndices.length;
    for (let i = 0; i < length; ++i) {
        const index = edgeIndices[i];
        const h = heights[index];
        const uv = uvs[index];

        cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x);
        cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y);
        cartographicScratch.height = h - edgeHeight;

        const position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
        CesiumMatrix4.multiplyByPoint(toENU, position, position);

        Cartesian3.minimumByComponent(position, minimum, minimum);
        Cartesian3.maximumByComponent(position, maximum, maximum);

        hMin = Math.min(hMin, cartographicScratch.height);
    }
    return hMin;
}

function addSkirt(vertexBuffer: any, vertexBufferIndex: any, edgeVertices: any, encoding: any, heights: any, uvs: any, octEncodedNormals: any, ellipsoid: any, rectangle: any, skirtLength: any, southMercatorY: any, oneOverMercatorHeight: any, longitudeOffset: any, latitudeOffset: any) {
    const hasVertexNormals = defined(octEncodedNormals);

    const north = rectangle.north;
    const south = rectangle.south;
    let east = rectangle.east;
    const west = rectangle.west;

    if (east < west) {
        east += CesiumMath.TWO_PI;
    }

    const length = edgeVertices.length;
    for (let i = 0; i < length; ++i) {
        const index = edgeVertices[i];
        const h = heights[index];
        const uv = uvs[index];

        cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x) + longitudeOffset;
        cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y) + latitudeOffset;
        cartographicScratch.height = h - skirtLength;

        const position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);

        if (hasVertexNormals) {
            const n = index * 2.0;
            toPack.x = octEncodedNormals[n];
            toPack.y = octEncodedNormals[n + 1];
        }

        let webMercatorT;
        if (encoding.hasWebMercatorT) {
            webMercatorT = (WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographicScratch.latitude) - southMercatorY) * oneOverMercatorHeight;
        }

        let geodeticSurfaceNormal;
        if (encoding.hasGeodeticSurfaceNormals) {
            geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(position);
        }

        vertexBufferIndex = encoding.encode(vertexBuffer, vertexBufferIndex, position, uv, cartographicScratch.height, toPack, webMercatorT, geodeticSurfaceNormal);
    }
}

function copyAndSort(typedArray: any, comparator: any) {
    let copy;
    if (typeof typedArray.slice === 'function') {
        copy = typedArray.slice();
        if (typeof copy.sort !== 'function') {
            // Sliced typed array isn't sortable, so we can't use it.
            copy = undefined;
        }
    }

    if (!defined(copy)) {
        copy = Array.prototype.slice.call(typedArray);
    }

    copy.sort(comparator);

    return copy;
}
export default createVerticesFromQuantizedTerrainMesh;
