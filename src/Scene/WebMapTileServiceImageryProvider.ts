import Cartesian2 from '@/Core/Cartesian2';
import { combine } from '@/Core/combine';
import Credit from '@/Core/Credit';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import Ellipsoid from '@/Core/Ellipsoid';
import Emit from '@/Core/Emit';
import Rectangle from '@/Core/Rectangle';
import { Resource } from '@/Core/Resource';
import WebMercatorTilingScheme from '@/Core/WebMercatorTilingScheme';
import { ImageryProvider } from './ImageryProvider';

interface IWebMapTileServiceImageryProviderParameter {
    url: string | Resource;
    format?: string;
    layer: string;
    style: string;
    tileMatrixSetID: string;
    tileMatrixLabels?: any[];
    tileDiscardPolicy?: any;
    tilingScheme?: WebMercatorTilingScheme;
    ellipsoid?: Ellipsoid;
    tileWidth?: number;
    tileHeight?: number;
    minimumLevel?: number;
    maximumLevel?: number;
    dimensions?: any;
    rectangle?: Rectangle;
    times?: any;
    credit?: any;
    subdomains?: any;
}

function requestImage(imageryProvider: WebMapTileServiceImageryProvider, col: number, row: number, level: number, request: Request, interval?: any) {
    const labels = imageryProvider._tileMatrixLabels as any[];
    const tileMatrix = defined(labels) ? labels[level] : level.toString();
    const subdomains = imageryProvider._subdomains;
    const staticDimensions = imageryProvider._dimensions;
    const dynamicIntervalData = defined(interval) ? interval.data : undefined;

    let resource;
    let templateValues;
    if (!imageryProvider._useKvp) {
        templateValues = {
            TileMatrix: tileMatrix,
            TileRow: row.toString(),
            TileCol: col.toString(),
            s: subdomains[(col + row + level) % subdomains.length],
        };

        resource = imageryProvider._resource.getDerivedResource({
            request: request,
        });
        resource.setTemplateValues(templateValues);

        if (defined(staticDimensions)) {
            resource.setTemplateValues(staticDimensions);
        }

        if (defined(dynamicIntervalData)) {
            resource.setTemplateValues(dynamicIntervalData);
        }
    } else {
        // build KVP request
        let query: any = {};
        query.tilematrix = tileMatrix;
        query.layer = imageryProvider._layer;
        query.style = imageryProvider._style;
        query.tilerow = row;
        query.tilecol = col;
        query.tilematrixset = imageryProvider._tileMatrixSetID;
        query.format = imageryProvider._format;

        if (defined(staticDimensions)) {
            query = combine(query, staticDimensions);
        }

        if (defined(dynamicIntervalData)) {
            query = combine(query, dynamicIntervalData);
        }

        templateValues = {
            s: subdomains[(col + row + level) % subdomains.length],
        };

        resource = imageryProvider._resource.getDerivedResource({
            queryParameters: query,
            request: request,
        });
        resource.setTemplateValues(templateValues);
    }

    return ImageryProvider.loadImage(imageryProvider, resource);
}

const defaultParameters = {
    service: 'WMTS',
    version: '1.0.0',
    request: 'GetTile',
};

/**
 * Provides tiled imagery served by {@link http://www.opengeospatial.org/standards/wmts|WMTS 1.0.0} compliant servers.
 * This provider supports HTTP KVP-encoded and RESTful GetTile requests, but does not yet support the SOAP encoding.
 *
 * @alias WebMapTileServiceImageryProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The base URL for the WMTS GetTile operation (for KVP-encoded requests) or the tile-URL template (for RESTful requests). The tile-URL template should contain the following variables: &#123;style&#125;, &#123;TileMatrixSet&#125;, &#123;TileMatrix&#125;, &#123;TileRow&#125;, &#123;TileCol&#125;. The first two are optional if actual values are hardcoded or not required by the server. The &#123;s&#125; keyword may be used to specify subdomains.
 * @param {String} [options.format='image/jpeg'] The MIME type for images to retrieve from the server.
 * @param {String} options.layer The layer name for WMTS requests.
 * @param {String} options.style The style name for WMTS requests.
 * @param {String} options.tileMatrixSetID The identifier of the TileMatrixSet to use for WMTS requests.
 * @param {Array} [options.tileMatrixLabels] A list of identifiers in the TileMatrix to use for WMTS requests, one per TileMatrix level.
 * @param {Clock} [options.clock] A Clock instance that is used when determining the value for the time dimension. Required when options.times is specified.
 * @param {TimeIntervalCollection} [options.times] TimeIntervalCollection with its <code>data</code> property being an object containing time dynamic dimension and their values.
 * @param {Object} [options.dimensions] A object containing static dimensions and their values.
 * @param {Number} [options.tileWidth=256] The tile width in pixels.
 * @param {Number} [options.tileHeight=256] The tile height in pixels.
 * @param {TilingScheme} [options.tilingScheme] The tiling scheme corresponding to the organization of the tiles in the TileMatrixSet.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle covered by the layer.
 * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
 * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 * @param {String|String[]} [options.subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
 *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
 *                          an array, each element in the array is a subdomain.
 *
 * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Web%20Map%20Tile%20Service%20with%20Time.html|Cesium Sandcastle Web Map Tile Service with Time Demo}
 *
 * @example
 * // Example 1. USGS shaded relief tiles (KVP)
 * var shadedRelief1 = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS',
 *     layer : 'USGSShadedReliefOnly',
 *     style : 'default',
 *     format : 'image/jpeg',
 *     tileMatrixSetID : 'default028mm',
 *     // tileMatrixLabels : ['default028mm:0', 'default028mm:1', 'default028mm:2' ...],
 *     maximumLevel: 19,
 *     credit : new Cesium.Credit('U. S. Geological Survey')
 * });
 * viewer.imageryLayers.addImageryProvider(shadedRelief1);
 *
 * @example
 * // Example 2. USGS shaded relief tiles (RESTful)
 * var shadedRelief2 = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS/tile/1.0.0/USGSShadedReliefOnly/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
 *     layer : 'USGSShadedReliefOnly',
 *     style : 'default',
 *     format : 'image/jpeg',
 *     tileMatrixSetID : 'default028mm',
 *     maximumLevel: 19,
 *     credit : new Cesium.Credit('U. S. Geological Survey')
 * });
 * viewer.imageryLayers.addImageryProvider(shadedRelief2);
 *
 * @example
 * // Example 3. NASA time dynamic weather data (RESTful)
 * var times = Cesium.TimeIntervalCollection.fromIso8601({
 *     iso8601: '2015-07-30/2017-06-16/P1D',
 *     dataCallback: function dataCallback(interval, index) {
 *         return {
 *             Time: Cesium.JulianDate.toIso8601(interval.start)
 *         };
 *     }
 * });
 * var weather = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/AMSR2_Snow_Water_Equivalent/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
 *     layer : 'AMSR2_Snow_Water_Equivalent',
 *     style : 'default',
 *     tileMatrixSetID : '2km',
 *     maximumLevel : 5,
 *     format : 'image/png',
 *     clock: clock,
 *     times: times,
 *     credit : new Cesium.Credit('NASA Global Imagery Browse Services for EOSDIS')
 * });
 * viewer.imageryLayers.addImageryProvider(weather);
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see createOpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see createTileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see UrlTemplateImageryProvider
 */
export default class WebMapTileServiceImageryProvider {
    _useKvp: boolean;
    _resource: Resource;
    _layer: string;
    _style: string;
    _tileMatrixSetID: string;
    _tileMatrixLabels?: any[];
    _format: string;
    _tilingScheme: WebMercatorTilingScheme;
    _tileDiscardPolicy: any;
    _tileWidth: number;
    _tileHeight: number;
    _minimumLevel: number;
    _maximumLevel?: number;
    _rectangle: Rectangle;
    _dimensions: any;
    _reload: any;
    _readyPromise = Promise.resolve(true);

    _errorEvent = new Emit();
    _credit: Credit;
    _subdomains: any;
    constructor(options: IWebMapTileServiceImageryProviderParameter) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as any;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.layer)) {
            throw new DeveloperError('options.layer is required.');
        }
        if (!defined(options.style)) {
            throw new DeveloperError('options.style is required.');
        }
        if (!defined(options.tileMatrixSetID)) {
            throw new DeveloperError('options.tileMatrixSetID is required.');
        }
        // if (defined(options.times) && !defined(options.clock)) {
        //     throw new DeveloperError('options.times was specified, so options.clock is required.');
        // }
        //>>includeEnd('debug');

        const resource = Resource.createIfNeeded(options.url);

        const style = options.style;
        const tileMatrixSetID = options.tileMatrixSetID;
        const url = resource.url;
        if (url.indexOf('{') >= 0) {
            const templateValues = {
                style: style,
                Style: style,
                TileMatrixSet: tileMatrixSetID,
            };

            resource.setTemplateValues(templateValues);
            this._useKvp = false;
        } else {
            resource.setQueryParameters(defaultParameters);
            this._useKvp = true;
        }

        this._resource = resource;
        this._layer = options.layer;
        this._style = style;
        this._tileMatrixSetID = tileMatrixSetID;
        this._tileMatrixLabels = options.tileMatrixLabels;
        this._format = defaultValue(options.format, 'image/jpeg');
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tilingScheme = defaultValue(options.tilingScheme, new WebMercatorTilingScheme({ ellipsoid: options.ellipsoid }));
        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);

        this._minimumLevel = defaultValue(options.minimumLevel, 0);
        this._maximumLevel = options.maximumLevel;

        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
        this._dimensions = options.dimensions;

        const that = this;
        this._reload = undefined;
        if (defined(options.times)) {
            // this._timeDynamicImagery = new TimeDynamicImagery({
            //     clock: options.clock,
            //     times: options.times,
            //     requestImageFunction: function (x, y, level, request, interval) {
            //         return requestImage(that, x, y, level, request, interval);
            //     },
            //     reloadFunction: function () {
            //         if (defined(that._reload)) {
            //             that._reload();
            //         }
            //     }
            // });
        }

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        const swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel) as Cartesian2;
        const neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel) as Cartesian2;
        const tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        //>>includeStart('debug', pragmas.debug);
        if (tileCount > 4) {
            throw new DeveloperError("The imagery provider's rectangle and minimumLevel indicate that there are " + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
        }
        //>>includeEnd('debug');

        const credit = options.credit;
        this._credit = typeof credit === 'string' ? new Credit(credit) : credit;

        this._subdomains = options.subdomains;
        if (Array.isArray(this._subdomains)) {
            this._subdomains = this._subdomains.slice();
        } else if (defined(this._subdomains) && this._subdomains.length > 0) {
            this._subdomains = this._subdomains.split('');
        } else {
            this._subdomains = ['a', 'b', 'c'];
        }
    }

    /**
     * Gets the URL of the service hosting the imagery.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {String}
     * @readonly
     */
    get url(): string {
        return this._resource.url;
    }

    /**
     * Gets the proxy used by this provider.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Proxy}
     * @readonly
     */
    get proxy(): any {
        return this._resource.proxy;
    }

    /**
     * Gets the width of each tile, in pixels. This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get tileWidth(): number {
        return this._tileWidth;
    }

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get tileHeight(): number {
        return this._tileHeight;
    }

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get maximumLevel(): number {
        return this._maximumLevel as number;
    }

    /**
     * Gets the minimum level-of-detail that can be requested.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get minimumLevel(): number {
        return this._minimumLevel;
    }

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {TilingScheme}
     * @readonly
     */
    get tilingScheme(): WebMercatorTilingScheme {
        return this._tilingScheme;
    }

    /**
     * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Rectangle}
     * @readonly
     */
    get rectangle(): Rectangle {
        return this._rectangle;
    }

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Event}
     * @readonly
     */
    get errorEvent(): Emit {
        return this._errorEvent;
    }

    /**
     * Gets the mime type of images returned by this imagery provider.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {String}
     * @readonly
     */
    get format(): string {
        return this._format;
    }

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Boolean}
     * @readonly
     */
    get ready(): boolean {
        return true;
    }

    /**
     * Gets a promise that resolves to true when the provider is ready for use.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Promise.<Boolean>}
     * @readonly
     */
    get readyPromise(): any {
        return this._readyPromise;
    }

    /**
     * Gets or sets an object that contains static dimensions and their values.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Object}
     */
    get dimensions(): Cartesian2 {
        return this._dimensions as Cartesian2;
    }

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    requestImage(x: number, y: number, level: number, request: Request): any {
        let result;
        // const timeDynamicImagery = this._timeDynamicImagery;
        let currentInterval;

        // // Try and load from cache
        // if (defined(timeDynamicImagery)) {
        //     currentInterval = timeDynamicImagery.currentInterval;
        //     result = timeDynamicImagery.getFromCache(x, y, level, request);
        // }

        // Couldn't load from cache
        if (!defined(result)) {
            result = requestImage(this, x, y, level, request, currentInterval);
        }

        // If we are approaching an interval, preload this tile in the next interval
        // if (defined(result) && defined(timeDynamicImagery)) {
        //     timeDynamicImagery.checkApproachingInterval(x, y, level, request);
        // }

        return result;
    }
}
