import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import GeographicTilingScheme from '@/Core/GeographicTilingScheme';
import QuadtreeTileLoadState from '@/Core/QuadtreeTileLoadState';
import Rectangle from '@/Core/Rectangle';
import GlobeSurfaceTile from './GlobeSurfaceTile';
import QuadtreeTileProvider from './QuadtreeTileProvider';
import TileSelectionResult from './TileSelectionResult';

interface IQuadtreeTileParameter {
    level: number;
    x: number;
    y: number;
    tilingScheme: GeographicTilingScheme;
    parent?: QuadtreeTile;
}

export default class QuadtreeTile {
    _tilingScheme: GeographicTilingScheme;
    _x: number;
    _y: number;
    _level: number;
    _parent?: QuadtreeTile;
    _rectangle: Rectangle;

    // The distance from the camera to this tile, updated when the tile is selected
    // for rendering.  We can get rid of this if we have a better way to sort by
    // distance - for example, by using the natural ordering of a quadtree.
    // QuadtreePrimitive gets/sets this private property.
    _distance = 0.0;
    _loadPriority = 0.0;

    _southwestChild?: QuadtreeTile;
    _southeastChild?: QuadtreeTile;
    _northwestChild?: QuadtreeTile;
    _northeastChild?: QuadtreeTile;

    // TileReplacementQueue gets/sets these private properties.
    replacementPrevious?: any = undefined;
    replacementNext?: any = undefined;

    _customData: any[] = [];
    _frameUpdated?: number = undefined;
    _lastSelectionResult = TileSelectionResult.NONE;
    _loadedCallbacks: any = {};

    /**
     * Gets or sets the current state of the tile in the tile load pipeline.
     * @type {QuadtreeTileLoadState}
     * @default {@link QuadtreeTileLoadState.START}
     */
    state = QuadtreeTileLoadState.START;

    /**
     * Gets or sets a value indicating whether or not the tile is currently renderable.
     * @type {Boolean}
     * @default false
     */
    renderable = false;

    /**
     * Gets or set a value indicating whether or not the tile was entirely upsampled from its
     * parent tile.  If all four children of a parent tile were upsampled from the parent,
     * we will render the parent instead of the children even if the LOD indicates that
     * the children would be preferable.
     * @type {Boolean}
     * @default false
     */
    upsampledFromParent = false;

    /**
     * Gets or sets the additional data associated with this tile.  The exact content is specific to the
     * {@link QuadtreeTileProvider}.
     * @type {Object}
     * @default undefined
     */
    data: GlobeSurfaceTile = undefined as any;

    _lastSelectionResultFrame?: number;

    constructor(options: IQuadtreeTileParameter) {
        this._tilingScheme = options.tilingScheme;
        this._x = options.x;
        this._y = options.y;
        this._level = options.level;
        this._parent = options.parent;
        this._rectangle = this._tilingScheme.tileXYToRectangle(this.x, this.y, this.level);
    }

    get customData(): any[] {
        return this._customData;
    }

    /**
     * Gets the tile X coordinate.
     * @memberof QuadtreeTile.prototype
     * @type {Number}
     */
    get x(): number {
        return this._x;
    }

    /**
     * Gets the tile Y coordinate.
     * @memberof QuadtreeTile.prototype
     * @type {Number}
     */
    get y(): number {
        return this._y;
    }

    /**
     * Gets the level-of-detail, where zero is the coarsest, least-detailed.
     * @memberof QuadtreeTile.prototype
     * @type {Number}
     */
    get level(): number {
        return this._level;
    }

    /**
     * Gets the parent tile of this tile.
     * @memberof QuadtreeTile.prototype
     * @type {QuadtreeTile}
     */
    get parent(): QuadtreeTile {
        return this._parent as QuadtreeTile;
    }

    /**
     * Gets the cartographic rectangle of the tile, with north, south, east and
     * west properties in radians.
     * @memberof QuadtreeTile.prototype
     * @type {Rectangle}
     */
    get rectangle(): Rectangle {
        return this._rectangle;
    }

    /**
     * Gets a value indicating whether or not this tile needs further loading.
     * This property will return true if the {@link QuadtreeTile#state} is
     * <code>START</code> or <code>LOADING</code>.
     * @memberof QuadtreeTile.prototype
     * @type {Boolean}
     */
    get needsLoading(): boolean {
        return this.state < QuadtreeTileLoadState.DONE;
    }

    /**
     * Gets the tiling scheme used to tile the surface.
     * @memberof QuadtreeTile.prototype
     * @type {TilingScheme}
     */
    get tilingScheme(): GeographicTilingScheme {
        return this._tilingScheme;
    }

    /**
     * An array of tiles that is at the next level of the tile tree.
     * @memberof QuadtreeTile.prototype
     * @type {QuadtreeTile[]}
     */
    get children(): QuadtreeTile[] {
        return [this.northwestChild, this.northeastChild, this.southwestChild, this.southeastChild];
    }

    /**
     * Gets the southwest child tile.
     * @memberof QuadtreeTile.prototype
     * @type {QuadtreeTile}
     */
    get southwestChild(): QuadtreeTile {
        if (!defined(this._southwestChild)) {
            this._southwestChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2,
                y: this.y * 2 + 1,
                level: this.level + 1,
                parent: this,
            });
        }
        return this._southwestChild as QuadtreeTile;
    }

    /**
     * Gets the southwest child tile.
     * @memberof QuadtreeTile.prototype
     * @type {QuadtreeTile}
     */
    get southeastChild(): QuadtreeTile {
        if (!defined(this._southeastChild)) {
            this._southeastChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2 + 1,
                y: this.y * 2 + 1,
                level: this.level + 1,
                parent: this,
            });
        }
        return this._southeastChild as QuadtreeTile;
    }

    /**
     * Gets the northwest child tile.
     * @memberof QuadtreeTile.prototype
     * @type {QuadtreeTile}
     */
    get northwestChild(): QuadtreeTile {
        if (!defined(this._northwestChild)) {
            this._northwestChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2,
                y: this.y * 2,
                level: this.level + 1,
                parent: this,
            });
        }
        return this._northwestChild as QuadtreeTile;
    }

    get northeastChild(): QuadtreeTile {
        if (!defined(this._northeastChild)) {
            this._northeastChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2 + 1,
                y: this.y * 2,
                level: this.level + 1,
                parent: this,
            });
        }
        return this._northeastChild as QuadtreeTile;
    }

    get eligibleForUnloading(): boolean {
        let result = true;

        if (defined(this.data)) {
            result = (this.data as GlobeSurfaceTile).eligibleForUnloading;
            if (!defined(result)) {
                result = true;
            }
        }

        return result;
    }

    /**
     * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
     *
     * @memberof QuadtreeTile
     *
     * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
     * @returns {QuadtreeTile[]} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner and followed by the tile (if any) to its east.
     */
    static createLevelZeroTiles(tilingScheme: GeographicTilingScheme): QuadtreeTile[] {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        //>>includeEnd('debug');

        const numberOfLevelZeroTilesX = tilingScheme.getNumberOfXTilesAtLevel(0);
        const numberOfLevelZeroTilesY = tilingScheme.getNumberOfYTilesAtLevel(0);

        const result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

        let index = 0;
        for (let y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (let x = 0; x < numberOfLevelZeroTilesX; ++x) {
                result[index++] = new QuadtreeTile({
                    tilingScheme: tilingScheme,
                    x: x,
                    y: y,
                    level: 0,
                });
            }
        }

        return result;
    }

    _updateCustomData(frameNumber: number, added?: any, removed?: any): void {
        let customData = this.customData;

        let i;
        let data;
        let rectangle;

        if (defined(added) && defined(removed)) {
            customData = customData.filter(function (value) {
                return removed.indexOf(value) === -1;
            });
            this._customData = customData;

            rectangle = this.rectangle;
            for (i = 0; i < added.length; ++i) {
                data = added[i];
                if (Rectangle.contains(rectangle, data.positionCartographic)) {
                    customData.push(data);
                }
            }

            this._frameUpdated = frameNumber;
        } else {
            // interior or leaf tile, update from parent
            const parent = this.parent;
            if (defined(parent) && this._frameUpdated !== (parent as QuadtreeTile)._frameUpdated) {
                customData.length = 0;

                rectangle = this.rectangle;
                const parentCustomData = (parent as QuadtreeTile).customData;
                for (i = 0; i < parentCustomData.length; ++i) {
                    data = parentCustomData[i];
                    if (Rectangle.contains(rectangle, data.positionCartographic)) {
                        customData.push(data);
                    }
                }

                this._frameUpdated = (parent as QuadtreeTile)._frameUpdated;
            }
        }
    }

    findLevelZeroTile(levelZeroTiles: QuadtreeTile[], x: number, y: number): QuadtreeTile | undefined {
        const xTiles = this.tilingScheme.getNumberOfXTilesAtLevel(0);
        if (x < 0) {
            x += xTiles;
        } else if (x >= xTiles) {
            x -= xTiles;
        }

        if (y < 0 || y >= this.tilingScheme.getNumberOfYTilesAtLevel(0)) {
            return undefined;
        }

        return levelZeroTiles.filter(function (tile) {
            return tile.x === x && tile.y === y;
        })[0];
    }

    findTileToWest(levelZeroTiles: QuadtreeTile[]): QuadtreeTile | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return this.findLevelZeroTile(levelZeroTiles, this.x - 1, this.y) as QuadtreeTile;
        }

        if (parent.southeastChild === this) {
            return parent.southwestChild;
        } else if (parent.northeastChild === this) {
            return parent.northwestChild;
        }

        const westOfParent = parent.findTileToWest(levelZeroTiles);
        if (westOfParent === undefined) {
            return undefined;
        } else if (parent.southwestChild === this) {
            return westOfParent.southeastChild;
        }
        return westOfParent.northeastChild;
    }

    findTileToEast(levelZeroTiles: QuadtreeTile[]): QuadtreeTile | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return this.findLevelZeroTile(levelZeroTiles, this.x + 1, this.y);
        }

        if (parent.southwestChild === this) {
            return parent.southeastChild;
        } else if (parent.northwestChild === this) {
            return parent.northeastChild;
        }

        const eastOfParent = parent.findTileToEast(levelZeroTiles);
        if (eastOfParent === undefined) {
            return undefined;
        } else if (parent.southeastChild === this) {
            return eastOfParent.southwestChild;
        }
        return eastOfParent.northwestChild;
    }

    findTileToSouth(levelZeroTiles: QuadtreeTile[]): QuadtreeTile | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return this.findLevelZeroTile(levelZeroTiles, this.x, this.y + 1);
        }

        if (parent.northwestChild === this) {
            return parent.southwestChild;
        } else if (parent.northeastChild === this) {
            return parent.southeastChild;
        }

        const southOfParent = parent.findTileToSouth(levelZeroTiles);
        if (southOfParent === undefined) {
            return undefined;
        } else if (parent.southwestChild === this) {
            return southOfParent.northwestChild;
        }
        return southOfParent.northeastChild;
    }

    findTileToNorth(levelZeroTiles: QuadtreeTile[]): QuadtreeTile | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return this.findLevelZeroTile(levelZeroTiles, this.x, this.y - 1);
        }

        if (parent.southwestChild === this) {
            return parent.northwestChild;
        } else if (parent.southeastChild === this) {
            return parent.northeastChild;
        }

        const northOfParent = parent.findTileToNorth(levelZeroTiles);
        if (northOfParent === undefined) {
            return undefined;
        } else if (parent.northwestChild === this) {
            return northOfParent.southwestChild;
        }
        return northOfParent.southeastChild;
    }

    /**
     * Frees the resources associated with this tile and returns it to the <code>START</code>
     * {@link QuadtreeTileLoadState}.  If the {@link QuadtreeTile#data} property is defined and it
     * has a <code>freeResources</code> method, the method will be invoked.
     *
     * @memberof QuadtreeTile
     */
    freeResources(): void {
        this.state = QuadtreeTileLoadState.START;
        this.renderable = false;
        this.upsampledFromParent = false;

        if (defined(this.data) && defined(this.data.freeResources)) {
            this.data.freeResources();
        }

        freeTile(this._southwestChild as QuadtreeTile);
        this._southwestChild = undefined;
        freeTile(this._southeastChild as QuadtreeTile);
        this._southeastChild = undefined;
        freeTile(this._northwestChild as QuadtreeTile);
        this._northwestChild = undefined;
        freeTile(this._northeastChild as QuadtreeTile);
        this._northeastChild = undefined;
    }
}

function freeTile(tile: QuadtreeTile) {
    if (defined(tile)) {
        tile.freeResources();
    }
}
