import { CesiumColor } from '@/Core/CesiumColor';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import Emit from '@/Core/Emit';
import GeographicTilingScheme from '@/Core/GeographicTilingScheme';
import Rectangle from '@/Core/Rectangle';

export default class TileCoordinatesImageryProvider {
    readonly tilingScheme: GeographicTilingScheme;
    readonly errorEvent = new Emit();
    readonly tileWidth: number;
    readonly tileHeight: number;
    readonly readyPromise: Promise<boolean>;
    _color: CesiumColor;
    defaultAlpha: any;
    defaultNightAlpha: any;
    defaultDayAlpha: any;
    defaultBrightness: any;
    defaultContrast: any;
    defaultHue: any;
    defaultSaturation: any;
    defaultGamma: any;
    defaultMinificationFilter: any;
    defaultMagnificationFilter: any;
    constructor(options?: any) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this.tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new GeographicTilingScheme({ ellipsoid: options.ellipsoid });
        this._color = defaultValue(options.color, CesiumColor.YELLOW) as CesiumColor;

        this.tileWidth = defaultValue(options.tileWidth, 256);
        this.tileHeight = defaultValue(options.tileHeight, 256);
        this.readyPromise = Promise.resolve(true);

        /**
         * The default alpha blending value of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultAlpha = undefined;

        /**
         * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultNightAlpha = undefined;

        /**
         * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultDayAlpha = undefined;

        /**
         * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultBrightness = undefined;

        /**
         * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultContrast = undefined;

        /**
         * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultHue = undefined;

        /**
         * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultSaturation = undefined;

        /**
         * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultGamma = undefined;

        /**
         * The default texture minification filter to apply to this provider.
         *
         * @type {TextureMinificationFilter}
         * @default undefined
         */
        this.defaultMinificationFilter = undefined;

        /**
         * The default texture magnification filter to apply to this provider.
         *
         * @type {TextureMagnificationFilter}
         * @default undefined
         */
        this.defaultMagnificationFilter = undefined;
    }

    get ready(): boolean {
        return true;
    }

    get rectangle(): Rectangle {
        return this, this.tilingScheme.rectangle;
    }

    get hasAlphaChannel(): boolean {
        return true;
    }

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    getTileCredits(x: number, y: number, level: number): any {
        return undefined;
    }

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link TileCoordinatesImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    requestImage(x: number, y: number, level: number, request: any): any {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;

        const cssColor = this._color.toCssColorString();

        context.strokeStyle = cssColor;
        context.lineWidth = 2;
        context.strokeRect(1, 1, 255, 255);

        context.font = 'bold 25px Arial';
        context.textAlign = 'center';
        context.fillStyle = cssColor;
        context.fillText(`L: ${level}`, 124, 86);
        context.fillText(`X: ${x}`, 124, 136);
        context.fillText(`Y: ${y}`, 124, 186);

        return Promise.resolve(canvas);
    }

    /**
     * Picking features is not currently supported by this imagery provider, so this function simply returns
     * undefined.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    pickFeatures(x: any, y: any, level: any, longitude: any, latitude: any) {
        return undefined;
    }
}
