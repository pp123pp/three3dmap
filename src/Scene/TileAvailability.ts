import Rectangle from '../Core/Rectangle';
import { TilingScheme } from '../Core/CesiumTerrainProvider';
import binarySearch from '@/Core/binarySearch';
import defined from '@/Core/defined';
import Cartographic from '@/Core/Cartographic';

const rectangleScratch = new Rectangle();

const rectanglesScratch: Rectangle[] = [];
const remainingToCoverByLevelScratch = [];
const westScratch = new Rectangle();
const eastScratch = new Rectangle();

const cartographicScratch = new Cartographic();

function findNode(level: number, x: number, y: number, nodes: any) {
    const count = nodes.length;
    for (let i = 0; i < count; ++i) {
        const node = nodes[i];
        if (node.x === x && node.y === y && node.level === level) {
            return true;
        }
    }

    return false;
}

export default class TileAvailability {
    _tilingScheme: TilingScheme;
    _maximumLevel: number;
    _rootNodes: any[];
    constructor(tilingScheme: TilingScheme, maximumLevel: number) {
        this._tilingScheme = tilingScheme;
        this._maximumLevel = maximumLevel;

        this._rootNodes = [];
    }

    /**
     * Marks a rectangular range of tiles in a particular level as being available.  For best performance,
     * add your ranges in order of increasing level.
     *
     * @param {Number} level The level.
     * @param {Number} startX The X coordinate of the first available tiles at the level.
     * @param {Number} startY The Y coordinate of the first available tiles at the level.
     * @param {Number} endX The X coordinate of the last available tiles at the level.
     * @param {Number} endY The Y coordinate of the last available tiles at the level.
     */
    addAvailableTileRange(level: number, startX: number, startY: number, endX: number, endY: number): void {
        const tilingScheme = this._tilingScheme;

        const rootNodes = this._rootNodes;
        if (level === 0) {
            for (let y = startY; y <= endY; ++y) {
                for (let x = startX; x <= endX; ++x) {
                    if (!findNode(level, x, y, rootNodes)) {
                        rootNodes.push(new QuadtreeNode(tilingScheme, undefined, 0, x, y));
                    }
                }
            }
        }

        tilingScheme.tileXYToRectangle(startX, startY, level, rectangleScratch);
        const west = rectangleScratch.west;
        const north = rectangleScratch.north;

        tilingScheme.tileXYToRectangle(endX, endY, level, rectangleScratch);
        const east = rectangleScratch.east;
        const south = rectangleScratch.south;

        const rectangleWithLevel = new RectangleWithLevel(level, west, south, east, north);

        for (let i = 0; i < rootNodes.length; ++i) {
            const rootNode = rootNodes[i];
            if (rectanglesOverlap(rootNode.extent, rectangleWithLevel)) {
                putRectangleInQuadtree(this._maximumLevel, rootNode, rectangleWithLevel);
            }
        }
    }

    /**
     * Determines the level of the most detailed tile covering the position.  This function
     * usually completes in time logarithmic to the number of rectangles added with
     * {@link TileAvailability#addAvailableTileRange}.
     *
     * @param {Cartographic} position The position for which to determine the maximum available level.  The height component is ignored.
     * @return {Number} The level of the most detailed tile covering the position.
     * @throws {DeveloperError} If position is outside any tile according to the tiling scheme.
     */
    computeMaximumLevelAtPosition(position: Cartographic): number {
        // Find the root node that contains this position.
        let node;
        for (let nodeIndex = 0; nodeIndex < this._rootNodes.length; ++nodeIndex) {
            const rootNode = this._rootNodes[nodeIndex];
            if (rectangleContainsPosition(rootNode.extent, position)) {
                node = rootNode;
                break;
            }
        }

        if (!defined(node)) {
            return -1;
        }

        return findMaxLevelFromNode(undefined, node, position);
    }

    /**
     * Determines if a particular tile is available.
     * @param {Number} level The tile level to check.
     * @param {Number} x The X coordinate of the tile to check.
     * @param {Number} y The Y coordinate of the tile to check.
     * @return {Boolean} True if the tile is available; otherwise, false.
     */
    isTileAvailable(level: number, x: number, y: number): boolean {
        // Get the center of the tile and find the maximum level at that position.
        // Because availability is by tile, if the level is available at that point, it
        // is sure to be available for the whole tile.  We assume that if a tile at level n exists,
        // then all its parent tiles back to level 0 exist too.  This isn't really enforced
        // anywhere, but Cesium would never load a tile for which this is not true.
        const rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        Rectangle.center(rectangle, cartographicScratch);
        return this.computeMaximumLevelAtPosition(cartographicScratch) >= level;
    }

    /**
     * Computes a bit mask indicating which of a tile's four children exist.
     * If a child's bit is set, a tile is available for that child.  If it is cleared,
     * the tile is not available.  The bit values are as follows:
     * <table>
     *     <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
     *     <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *     <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *     <tr><td>2</td><td>4</td><td>Northwest</td></tr>
     *     <tr><td>3</td><td>8</td><td>Northeast</td></tr>
     * </table>
     *
     * @param {Number} level The level of the parent tile.
     * @param {Number} x The X coordinate of the parent tile.
     * @param {Number} y The Y coordinate of the parent tile.
     * @return {Number} The bit mask indicating child availability.
     */
    computeChildMaskForTile(level: number, x: number, y: number): number {
        const childLevel = level + 1;
        if (childLevel >= this._maximumLevel) {
            return 0;
        }

        let mask = 0;

        mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y + 1) ? 1 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y + 1) ? 2 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y) ? 4 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y) ? 8 : 0;

        return mask;
    }
}

class QuadtreeNode {
    tilingScheme: TilingScheme;
    parent?: QuadtreeNode;
    level: number;
    x: number;
    y: number;
    extent: Rectangle;
    rectangles: RectangleWithLevel[];
    _sw?: QuadtreeNode;
    _se?: QuadtreeNode;
    _nw?: QuadtreeNode;
    _ne?: QuadtreeNode;
    constructor(tilingScheme: TilingScheme, parent: any, level: number, x: number, y: number) {
        this.tilingScheme = tilingScheme;
        this.parent = parent;
        this.level = level;
        this.x = x;
        this.y = y;
        this.extent = tilingScheme.tileXYToRectangle(x, y, level);

        this.rectangles = [];
        this._sw = undefined;
        this._se = undefined;
        this._nw = undefined;
        this._ne = undefined;
    }

    get nw(): QuadtreeNode {
        if (!this._nw) {
            this._nw = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2);
        }
        return this._nw;
    }

    get ne(): QuadtreeNode {
        if (!this._ne) {
            this._ne = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2);
        }
        return this._ne;
    }

    get sw(): QuadtreeNode {
        if (!this._sw) {
            this._sw = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2 + 1);
        }
        return this._sw;
    }

    get se(): QuadtreeNode {
        if (!this._se) {
            this._se = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2 + 1);
        }
        return this._se;
    }
}

class RectangleWithLevel {
    level: number;
    west: number;
    south: number;
    east: number;
    north: number;
    constructor(level: number, west: number, south: number, east: number, north: number) {
        this.level = level;
        this.west = west;
        this.south = south;
        this.east = east;
        this.north = north;
    }
}

function rectanglesOverlap(rectangle1: RectangleWithLevel, rectangle2: RectangleWithLevel) {
    const west = Math.max(rectangle1.west, rectangle2.west);
    const south = Math.max(rectangle1.south, rectangle2.south);
    const east = Math.min(rectangle1.east, rectangle2.east);
    const north = Math.min(rectangle1.north, rectangle2.north);
    return south < north && west < east;
}

function putRectangleInQuadtree(maxDepth: number, node: QuadtreeNode, rectangle: any) {
    while (node.level < maxDepth) {
        if (rectangleFullyContainsRectangle(node.nw.extent, rectangle)) {
            node = node.nw;
        } else if (rectangleFullyContainsRectangle(node.ne.extent, rectangle)) {
            node = node.ne;
        } else if (rectangleFullyContainsRectangle(node.sw.extent, rectangle)) {
            node = node.sw;
        } else if (rectangleFullyContainsRectangle(node.se.extent, rectangle)) {
            node = node.se;
        } else {
            break;
        }
    }

    if (node.rectangles.length === 0 || node.rectangles[node.rectangles.length - 1].level <= rectangle.level) {
        node.rectangles.push(rectangle);
    } else {
        // Maintain ordering by level when inserting.
        let index = binarySearch(node.rectangles, rectangle.level, rectangleLevelComparator);
        if (index < 0) {
            index = ~index;
        }
        node.rectangles.splice(index, 0, rectangle);
    }
}

function rectangleLevelComparator(a: RectangleWithLevel, b: number) {
    return a.level - b;
}

function rectangleFullyContainsRectangle(potentialContainer: Rectangle, rectangleToTest: Rectangle) {
    return rectangleToTest.west >= potentialContainer.west && rectangleToTest.east <= potentialContainer.east && rectangleToTest.south >= potentialContainer.south && rectangleToTest.north <= potentialContainer.north;
}

function rectangleContainsPosition(potentialContainer: Rectangle | RectangleWithLevel, positionToTest: Cartographic) {
    return positionToTest.longitude >= potentialContainer.west && positionToTest.longitude <= potentialContainer.east && positionToTest.latitude >= potentialContainer.south && positionToTest.latitude <= potentialContainer.north;
}

function findMaxLevelFromNode(stopNode: QuadtreeNode | undefined, node: QuadtreeNode, position: Cartographic) {
    let maxLevel = 0;

    // Find the deepest quadtree node containing this point.
    let found = false;
    while (!found) {
        const nw: any = node._nw && rectangleContainsPosition(node._nw.extent, position);
        const ne = node._ne && rectangleContainsPosition(node._ne.extent, position);
        const sw = node._sw && rectangleContainsPosition(node._sw.extent, position);
        const se = node._se && rectangleContainsPosition(node._se.extent, position);

        // The common scenario is that the point is in only one quadrant and we can simply
        // iterate down the tree.  But if the point is on a boundary between tiles, it is
        // in multiple tiles and we need to check all of them, so use recursion.
        if (nw + ne + sw + se > 1) {
            if (nw) {
                maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._nw as QuadtreeNode, position));
            }
            if (ne) {
                maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._ne as QuadtreeNode, position));
            }
            if (sw) {
                maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._sw as QuadtreeNode, position));
            }
            if (se) {
                maxLevel = Math.max(maxLevel, findMaxLevelFromNode(node, node._se as QuadtreeNode, position));
            }
            break;
        } else if (nw) {
            node = node._nw as QuadtreeNode;
        } else if (ne) {
            node = node._ne as QuadtreeNode;
        } else if (sw) {
            node = node._sw as QuadtreeNode;
        } else if (se) {
            node = node._se as QuadtreeNode;
        } else {
            found = true;
        }
    }

    // Work up the tree until we find a rectangle that contains this point.
    while (node !== stopNode) {
        const rectangles = node.rectangles;

        // Rectangles are sorted by level, lowest first.
        for (let i = rectangles.length - 1; i >= 0 && rectangles[i].level > maxLevel; --i) {
            const rectangle = rectangles[i];
            if (rectangleContainsPosition(rectangle, position)) {
                maxLevel = rectangle.level;
            }
        }

        node = node.parent as QuadtreeNode;
    }

    return maxLevel;
}
