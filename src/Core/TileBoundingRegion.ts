import { FrameState } from '@/Scene/FrameState';
import BoundingSphere from './BoundingSphere';
import Cartesian3 from './Cartesian3';
import Cartographic from './Cartographic';
import CesiumPlane from './CesiumPlane';
import CesiumRay from './CesiumRay';
import { defaultValue } from './defaultValue';
import defined from './defined';
import Ellipsoid from './Ellipsoid';
import IntersectionTests from './IntersectionTests';
import OrientedBoundingBox from './OrientedBoundingBox';
import Rectangle from './Rectangle';
import { SceneMode } from './SceneMode';

const Vector3Scratch = new Cartesian3();
const Vector3Scratch2 = new Cartesian3();
const Vector3Scratch3 = new Cartesian3();
const eastWestNormalScratch = new Cartesian3();
const westernMidpointScratch = new Cartesian3();
const easternMidpointScratch = new Cartesian3();
const cartographicScratch = new Cartographic();
const planeScratch = new CesiumPlane(new Cartesian3(1, 0, 0), 0.0);
const rayScratch = new CesiumRay();

const southwestCornerScratch = new Cartesian3();
const northeastCornerScratch = new Cartesian3();
const negativeUnitX = new Cartesian3(-1.0, 0.0, 0.0);
const negativeUnitY = new Cartesian3(0.0, -1.0, 0.0);
const negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
const vectorScratch = new Cartesian3();

const computeBox = function computeBox(tileBB: TileBoundingRegion, rectangle: Rectangle, ellipsoid: Ellipsoid) {
    ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle), tileBB.southwestCornerCartesian);
    ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle), tileBB.northeastCornerCartesian);

    // The middle latitude on the western edge.
    cartographicScratch.longitude = rectangle.west;
    cartographicScratch.latitude = (rectangle.south + rectangle.north) * 0.5;
    cartographicScratch.height = 0.0;
    const westernMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, westernMidpointScratch);

    // Compute the normal of the plane on the western edge of the tile.
    const westNormal = Cartesian3.cross(westernMidpointCartesian, Cartesian3.UNIT_Z, Vector3Scratch);
    Cartesian3.normalize(westNormal, tileBB.westNormal);

    // The middle latitude on the eastern edge.
    cartographicScratch.longitude = rectangle.east;
    const easternMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, easternMidpointScratch);

    // Compute the normal of the plane on the eastern edge of the tile.
    const eastNormal = Cartesian3.cross(Cartesian3.UNIT_Z, easternMidpointCartesian, Vector3Scratch);
    Cartesian3.normalize(eastNormal, tileBB.eastNormal);

    // Compute the normal of the plane bounding the southern edge of the tile.
    const westVector = Cartesian3.subtract(westernMidpointCartesian, easternMidpointCartesian, Vector3Scratch);
    const eastWestNormal = Cartesian3.normalize(westVector, eastWestNormalScratch);

    const south = rectangle.south;
    let southSurfaceNormal: Cartesian3;

    if (south > 0.0) {
        // Compute a plane that doesn't cut through the tile.
        cartographicScratch.longitude = (rectangle.west + rectangle.east) * 0.5;
        cartographicScratch.latitude = south;
        const southCenterCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, rayScratch.origin as any);
        Cartesian3.clone(eastWestNormal, rayScratch.direction as any);
        const westPlane = CesiumPlane.fromPointNormal(tileBB.southwestCornerCartesian, tileBB.westNormal, planeScratch);
        // Find a point that is on the west and the south planes
        IntersectionTests.rayPlane(rayScratch, westPlane, tileBB.southwestCornerCartesian);
        southSurfaceNormal = ellipsoid.geodeticSurfaceNormal(southCenterCartesian, Vector3Scratch2) as Cartesian3;
    } else {
        southSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.southeast(rectangle), Vector3Scratch2);
    }
    const southNormal = Cartesian3.cross(southSurfaceNormal, westVector, Vector3Scratch3);
    Cartesian3.normalize(southNormal, tileBB.southNormal);

    // Compute the normal of the plane bounding the northern edge of the tile.
    const north = rectangle.north;
    let northSurfaceNormal: Cartesian3;
    if (north < 0.0) {
        // Compute a plane that doesn't cut through the tile.
        cartographicScratch.longitude = (rectangle.west + rectangle.east) * 0.5;
        cartographicScratch.latitude = north;
        const northCenterCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, rayScratch.origin);
        Cartesian3.negate(eastWestNormal, rayScratch.direction);
        const eastPlane = CesiumPlane.fromPointNormal(tileBB.northeastCornerCartesian, tileBB.eastNormal, planeScratch);
        // Find a point that is on the east and the north planes
        IntersectionTests.rayPlane(rayScratch, eastPlane, tileBB.northeastCornerCartesian);
        northSurfaceNormal = ellipsoid.geodeticSurfaceNormal(northCenterCartesian, Vector3Scratch2) as Cartesian3;
    } else {
        northSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.northwest(rectangle), Vector3Scratch2);
    }
    const northNormal = Cartesian3.cross(westVector, northSurfaceNormal, Vector3Scratch3);
    Cartesian3.normalize(northNormal, tileBB.northNormal);
};

interface ITileBoundingRegionParameter {
    rectangle: Rectangle;
    minimumHeight?: number;
    maximumHeight?: number;
    ellipsoid?: Ellipsoid;
    computeBoundingVolumes?: boolean;
}

/**
 * A tile bounding volume specified as a longitude/latitude/height region.
 * @alias TileBoundingRegion
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Rectangle} options.rectangle The rectangle specifying the longitude and latitude range of the region.
 * @param {Number} [options.minimumHeight=0.0] The minimum height of the region.
 * @param {Number} [options.maximumHeight=0.0] The maximum height of the region.
 * @param {Ellipsoid} [options.ellipsoid=Cesium.Ellipsoid.WGS84] The ellipsoid.
 * @param {Boolean} [options.computeBoundingVolumes=true] True to compute the {@link TileBoundingRegion#boundingVolume} and
 *                  {@link TileBoundingVolume#boundingSphere}. If false, these properties will be undefined.
 *
 * @private
 */
class TileBoundingRegion {
    /**
     * The world coordinates of the southwest corner of the tile's rectangle.
     *
     * @type {Cartesian3}
     * @default Cartesian3()
     */
    southwestCornerCartesian = new Cartesian3();

    /**
     * The world coordinates of the northeast corner of the tile's rectangle.
     *
     * @type {Vector3}
     * @default Vector3()
     */
    northeastCornerCartesian = new Cartesian3();

    /**
     * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
     * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
     *
     * @type {Cartesian3}
     * @default Cartesian3()
     */
    westNormal = new Cartesian3();

    /**
     * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
     * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
     * Because points of constant latitude do not necessary lie in a plane, positions below this
     * plane are not necessarily inside the tile, but they are close.
     *
     * @type {Vector3}
     * @default Vector3()
     */
    southNormal = new Cartesian3();

    /**
     * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
     * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
     *
     * @type {Vector3}
     * @default Vector3()
     */
    eastNormal = new Cartesian3();

    /**
     * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
     * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
     * Because points of constant latitude do not necessary lie in a plane, positions below this
     * plane are not necessarily inside the tile, but they are close.
     *
     * @type {Cartesian3}
     * @default Cartesian3()
     */
    northNormal = new Cartesian3();

    rectangle: Rectangle;
    minimumHeight: number;
    maximumHeight: number;
    _orientedBoundingBox: OrientedBoundingBox;
    _boundingSphere: BoundingSphere;
    constructor(options: ITileBoundingRegionParameter) {
        this.rectangle = Rectangle.clone(options.rectangle) as Rectangle;
        this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
        this.maximumHeight = defaultValue(options.maximumHeight, 0.0);

        const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        computeBox(this, options.rectangle, ellipsoid);

        // An oriented bounding box that encloses this tile's region.  This is used to calculate tile visibility.
        this._orientedBoundingBox = OrientedBoundingBox.fromRectangle(this.rectangle, this.minimumHeight, this.maximumHeight, ellipsoid);

        this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(this._orientedBoundingBox);
    }

    get boundingVolume(): OrientedBoundingBox {
        return this._orientedBoundingBox;
    }

    get boundingSphere(): BoundingSphere {
        return this._boundingSphere;
    }

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level of detail selection.
     *
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    distanceToCamera(frameState: FrameState): number {
        const regionResult = distanceToCameraRegion(this, frameState);
        if (frameState.mode === SceneMode.SCENE3D && defined(this._orientedBoundingBox)) {
            const obbResult = Math.sqrt(this._orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC));
            return Math.max(regionResult, obbResult);
        }
        return regionResult;
    }

    computeBoundingVolumes(ellipsoid: Ellipsoid): void {
        // An oriented bounding box that encloses this tile's region.  This is used to calculate tile visibility.
        this._orientedBoundingBox = OrientedBoundingBox.fromRectangle(this.rectangle, this.minimumHeight, this.maximumHeight, ellipsoid);

        this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(this._orientedBoundingBox);
    }
}

function distanceToCameraRegion(tileBB: TileBoundingRegion, frameState: FrameState) {
    const camera = frameState.camera;
    const cameraCartesianPosition = camera.positionWC;
    const cameraCartographicPosition = camera.positionCartographic;

    let result = 0.0;
    if (!Rectangle.contains(tileBB.rectangle, cameraCartographicPosition)) {
        let southwestCornerCartesian = tileBB.southwestCornerCartesian;
        let northeastCornerCartesian = tileBB.northeastCornerCartesian;
        let westNormal = tileBB.westNormal;
        let southNormal = tileBB.southNormal;
        let eastNormal = tileBB.eastNormal;
        let northNormal = tileBB.northNormal;

        if (frameState.mode !== SceneMode.SCENE3D) {
            southwestCornerCartesian = frameState.mapProjection.project(Rectangle.southwest(tileBB.rectangle), southwestCornerScratch);
            southwestCornerCartesian.z = southwestCornerCartesian.y;
            southwestCornerCartesian.y = southwestCornerCartesian.x;
            southwestCornerCartesian.x = 0.0;
            northeastCornerCartesian = frameState.mapProjection.project(Rectangle.northeast(tileBB.rectangle), northeastCornerScratch);
            northeastCornerCartesian.z = northeastCornerCartesian.y;
            northeastCornerCartesian.y = northeastCornerCartesian.x;
            northeastCornerCartesian.x = 0.0;
            westNormal = negativeUnitY;
            eastNormal = Cartesian3.UNIT_Y;
            southNormal = negativeUnitZ;
            northNormal = Cartesian3.UNIT_Z;
        }

        const vectorFromSouthwestCorner = Cartesian3.subtract(cameraCartesianPosition, southwestCornerCartesian, vectorScratch);
        const distanceToWestPlane = Cartesian3.dot(vectorFromSouthwestCorner, westNormal);
        const distanceToSouthPlane = Cartesian3.dot(vectorFromSouthwestCorner, southNormal);

        const vectorFromNortheastCorner = Cartesian3.subtract(cameraCartesianPosition, northeastCornerCartesian, vectorScratch);
        const distanceToEastPlane = Cartesian3.dot(vectorFromNortheastCorner, eastNormal);
        const distanceToNorthPlane = Cartesian3.dot(vectorFromNortheastCorner, northNormal);

        if (distanceToWestPlane > 0.0) {
            result += distanceToWestPlane * distanceToWestPlane;
        } else if (distanceToEastPlane > 0.0) {
            result += distanceToEastPlane * distanceToEastPlane;
        }

        if (distanceToSouthPlane > 0.0) {
            result += distanceToSouthPlane * distanceToSouthPlane;
        } else if (distanceToNorthPlane > 0.0) {
            result += distanceToNorthPlane * distanceToNorthPlane;
        }
    }

    let cameraHeight;
    let minimumHeight;
    let maximumHeight;
    if (frameState.mode === SceneMode.SCENE3D) {
        cameraHeight = cameraCartographicPosition.height;
        minimumHeight = tileBB.minimumHeight;
        maximumHeight = tileBB.maximumHeight;
    } else {
        cameraHeight = cameraCartesianPosition.x;
        minimumHeight = 0.0;
        maximumHeight = 0.0;
    }

    if (cameraHeight > maximumHeight) {
        const distanceAboveTop = cameraHeight - maximumHeight;
        result += distanceAboveTop * distanceAboveTop;
    } else if (cameraHeight < minimumHeight) {
        const distanceBelowBottom = minimumHeight - cameraHeight;
        result += distanceBelowBottom * distanceBelowBottom;
    }

    return Math.sqrt(result);
}

export { TileBoundingRegion };
