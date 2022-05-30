import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import Resource from '@/Core/Resource';

class ImageryProvider {
    /**
     * The default alpha blending value of this provider, with 0.0 representing fully transparent and
     * 1.0 representing fully opaque.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultAlpha?: number;

    /**
     * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
     * 1.0 representing fully opaque.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultNightAlpha?: number;

    /**
     * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
     * 1.0 representing fully opaque.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultDayAlpha?: number;

    /**
     * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
     * makes the imagery darker while greater than 1.0 makes it brighter.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultBrightness?: number;

    /**
     * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
     * the contrast while greater than 1.0 increases it.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultContrast?: number;

    /**
     * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultHue?: number;

    /**
     * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
     * saturation while greater than 1.0 increases it.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultSaturation?: number;

    /**
     * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
     *
     * @type {Number|undefined}
     * @default undefined
     */
    defaultGamma?: number;

    /**
     * The default texture minification filter to apply to this provider.
     *
     * @type {TextureMinificationFilter}
     * @default undefined
     */
    defaultMinificationFilter: any;

    /**
     * The default texture magnification filter to apply to this provider.
     *
     * @type {TextureMagnificationFilter}
     * @default undefined
     */
    defaultMagnificationFilter: any;
    constructor() {
        DeveloperError.throwInstantiationError();
    }

    /**
     * Loads an image from a given URL.  If the server referenced by the URL already has
     * too many requests pending, this function will instead return undefined, indicating
     * that the request should be retried later.
     *
     * @param {ImageryProvider} imageryProvider The imagery provider for the URL.
     * @param {Resource|String} url The URL of the image.
     * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    static loadImage(imageryProvider: any, url: any): any {
        const resource = Resource.createIfNeeded(url);
        // resource.proxy = new DefaultProxy('/google/');

        // if (ktx2Regex.test(resource.url)) {
        //     return loadKTX2(resource);
        // } else if (
        //     defined(imageryProvider) &&
        //     defined(imageryProvider.tileDiscardPolicy)
        // ) {
        //     return resource.fetchImage({
        //         preferBlob: true,
        //         preferImageBitmap: true,
        //         flipY: true
        //     });
        // }
        if (defined(imageryProvider) && defined(imageryProvider.tileDiscardPolicy)) {
            return resource.fetchImage({
                preferBlob: true,
                preferImageBitmap: true,
                flipY: true,
            });
        }

        return resource.fetchImage({
            preferImageBitmap: true,
            flipY: true,
        });
    }
}

export { ImageryProvider };
