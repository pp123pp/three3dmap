import DeveloperError from '@/Core/DeveloperError';
import WebMercatorTilingScheme from '@/Core/WebMercatorTilingScheme';

/**
 * Provides general quadtree tiles to be displayed on or near the surface of an ellipsoid.  It is intended to be
 * used with the {@link QuadtreePrimitive}.  This type describes an interface and is not intended to be
 * instantiated directly.
 *
 * @alias QuadtreeTileProvider
 * @constructor
 * @private
 */
export default class QuadtreeTileProvider {
    constructor() {
        DeveloperError.throwInstantiationError();
    }

    /**
     * Computes the default geometric error for level zero of the quadtree.
     *
     * @memberof QuadtreeTileProvider
     *
     * @param {TilingScheme} tilingScheme The tiling scheme for which to compute the geometric error.
     * @returns {Number} The maximum geometric error at level zero, in meters.
     */
    static computeDefaultLevelZeroMaximumGeometricError(tilingScheme: WebMercatorTilingScheme): number {
        return (tilingScheme.ellipsoid.maximumRadius * 2 * Math.PI * 0.25) / (65 * tilingScheme.getNumberOfXTilesAtLevel(0));
    }

    get quadtree(): any {
        return DeveloperError.throwInstantiationError();
    }

    set quadtree(value: any) {
        DeveloperError.throwInstantiationError();
    }

    get ready(): never {
        return DeveloperError.throwInstantiationError();
    }

    get tilingScheme(): never {
        return DeveloperError.throwInstantiationError();
    }

    get errorEvent(): never {
        return DeveloperError.throwInstantiationError();
    }

    /**
     * Called at the beginning of the update cycle, regardless of id a new frame is being rendered, before {@link QuadtreeTileProvider#beginUpdate}
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The frame state.
     */
    update = DeveloperError.throwInstantiationError;

    /**
     * Called at the beginning of the update cycle for each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
     * or any other functions.
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The frame state.
     * @param {DrawCommand[]} commandList An array of rendering commands.  This method may push
     *        commands into this array.
     */
    beginUpdate = DeveloperError.throwInstantiationError;

    /**
     * Called at the end of the update cycle for each render frame, after {@link QuadtreeTileProvider#showTileThisFrame}
     * and any other functions.
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The frame state.
     * @param {DrawCommand[]} commandList An array of rendering commands.  This method may push
     *        commands into this array.
     */
    endUpdate = DeveloperError.throwInstantiationError;

    /**
     * Gets the maximum geometric error allowed in a tile at a given level, in meters.  This function should not be
     * called before {@link QuadtreeTileProvider#ready} returns true.
     *
     * @see QuadtreeTileProvider#computeDefaultLevelZeroMaximumGeometricError
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error in meters.
     */
    getLevelMaximumGeometricError = DeveloperError.throwInstantiationError;

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.  This function should
     * not be called before {@link QuadtreeTileProvider#ready} returns true.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The frame state.
     * @param {QuadtreeTile} tile The tile to load.
     *
     * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
     */
    loadTile = DeveloperError.throwInstantiationError;

    /**
     * Determines the visibility of a given tile.  The tile may be fully visible, partially visible, or not
     * visible at all.  Tiles that are renderable and are at least partially visible will be shown by a call
     * to {@link QuadtreeTileProvider#showTileThisFrame}.
     *
     * @memberof QuadtreeTileProvider
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information about the current frame.
     * @param {QuadtreeOccluders} occluders The objects that may occlude this tile.
     *
     * @returns {Visibility} The visibility of the tile.
     */
    computeTileVisibility = DeveloperError.throwInstantiationError;

    /**
     * Shows a specified tile in this frame.  The provider can cause the tile to be shown by adding
     * render commands to the commandList, or use any other method as appropriate.  The tile is not
     * expected to be visible next frame as well, unless this method is call next frame, too.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @param {DrawCommand[]} commandList The list of rendering commands.  This method may add additional commands to this list.
     */
    showTileThisFrame = DeveloperError.throwInstantiationError;

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    computeDistanceToTile = DeveloperError.throwInstantiationError;

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof QuadtreeTileProvider
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see QuadtreeTileProvider#destroy
     */
    isDestroyed = DeveloperError.throwInstantiationError;

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof QuadtreeTileProvider
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * provider = provider && provider();
     *
     * @see QuadtreeTileProvider#isDestroyed
     */
    destroy = DeveloperError.throwInstantiationError;
}
