export default class BoundingRectangle {
    /**
     * The x coordinate of the rectangle.
     * @type {Number}
     * @default 0.0
     */
    x: number;
    /**
     * The y coordinate of the rectangle.
     * @type {Number}
     * @default 0.0
     */
    y: number;
    /**
     * The width of the rectangle.
     * @type {Number}
     * @default 0.0
     */
    width: number;
    /**
     * The height of the rectangle.
     * @type {Number}
     * @default 0.0
     */
    height: number;
    constructor(x = 0.0, y = 0.0, width = 0.0, heigh = 0.0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = heigh;
    }
}
