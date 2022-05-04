import Ellipsoid from './Ellipsoid';
import HeightmapTessellator from './HeightmapTessellator';
import Rectangle from './Rectangle';

export default function createVerticesFromHeightmap(parameters: any) {
    let arrayWidth = parameters.width;
    let arrayHeight = parameters.height;

    if (parameters.skirtHeight > 0.0) {
        arrayWidth += 2;
        arrayHeight += 2;
    }

    parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
    parameters.rectangle = Rectangle.clone(parameters.rectangle);

    const statistics = HeightmapTessellator.computeVertices(parameters);
    const vertices = statistics.vertices;
    // transferableObjects.push(vertices.buffer);

    return {
        vertices: vertices.buffer,
        numberOfAttributes: statistics.encoding.getStride(),
        minimumHeight: statistics.minimumHeight,
        maximumHeight: statistics.maximumHeight,
        gridWidth: arrayWidth,
        gridHeight: arrayHeight,
        boundingSphere3D: statistics.boundingSphere3D,
        orientedBoundingBox: statistics.orientedBoundingBox,
        occludeePointInScaledSpace: statistics.occludeePointInScaledSpace,
        encoding: statistics.encoding,
    };
}

export { createVerticesFromHeightmap };
