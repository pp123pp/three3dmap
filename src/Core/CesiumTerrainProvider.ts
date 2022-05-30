// import Credit from './Credit';
// import defaultValue from './defaultValue';
// import defer, { IDefer } from './defer';
// import defined from './defined';
// import Ellipsoid from './Ellipsoid';
// import Emit from './Emit';
// import Resource from './Resource';

// interface ICesiumTerrainProvider {
//     Resource?: string | Resource;
//     requestVertexNormals?: boolean;
//     requestWaterMask?: boolean;
//     requestMetadata?: boolean;
//     ellipsoid?: Ellipsoid;
//     url?: string;
//     credit?: string | Credit;
// }

// /**
//  * A {@link TerrainProvider} that accesses terrain data in a Cesium terrain format.
//  *
//  * @alias CesiumTerrainProvider
//  * @constructor
//  *
//  * @param {Object} options Object with the following properties:
//  * @param {Resource|String|Promise<Resource>|Promise<String>} options.url The URL of the Cesium terrain server.
//  * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server, in the form of per vertex normals if available.
//  * @param {Boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server,  if available.
//  * @param {Boolean} [options.requestMetadata=true] Flag that indicates if the client should request per tile metadata from the server, if available.
//  * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
//  * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
//  *
//  *
//  * @example
//  * // Create Arctic DEM terrain with normals.
//  * const viewer = new Cesium.Viewer('cesiumContainer', {
//  *     terrainProvider : new Cesium.CesiumTerrainProvider({
//  *         url : Cesium.IonResource.fromAssetId(3956),
//  *         requestVertexNormals : true
//  *     })
//  * });
//  *
//  * @see createWorldTerrain
//  * @see TerrainProvider
//  */

// export default class CesiumTerrainProvider {
//     _heightmapWidth = 65;
//     _heightmapStructure: any = undefined;
//     _hasWaterMask = false;
//     _hasVertexNormals = false;
//     _ellipsoid?: Ellipsoid;

//     /**
//      * Boolean flag that indicates if the client should request vertex normals from the server.
//      * @type {Boolean}
//      * @default false
//      * @private
//      */
//     _requestVertexNormals: boolean;

//     /**
//      * Boolean flag that indicates if the client should request tile watermasks from the server.
//      * @type {Boolean}
//      * @default false
//      * @private
//      */
//     _requestWaterMask: boolean;

//     /**
//      * Boolean flag that indicates if the client should request tile metadata from the server.
//      * @type {Boolean}
//      * @default true
//      * @private
//      */
//     _requestMetadata: boolean;

//     readonly errorEvent = new Emit();

//     _availability: any;

//     _credit: Credit;

//     _ready = false;

//     _readyPromise: IDefer;

//     _tileCredits: any;

//     _layers: any[];

//     constructor(options: ICesiumTerrainProvider) {
//         this._heightmapWidth = 65;
//         this._heightmapStructure = undefined;
//         this._hasWaterMask = false;
//         this._hasVertexNormals = false;
//         this._ellipsoid = options.ellipsoid;

//         this._requestVertexNormals = defaultValue(options.requestVertexNormals, false);

//         this._requestWaterMask = defaultValue(options.requestWaterMask, false);

//         this._requestMetadata = defaultValue(options.requestMetadata, true);

//         let credit = options.credit;
//         if (typeof credit === 'string') {
//             credit = new Credit(credit);
//         }
//         this._credit = credit as Credit;

//         this._availability = undefined;

//         const deferred = defer();

//         this._readyPromise = deferred;
//         this._tileCredits = undefined;

//         const that = this;
//         let lastResource: any;
//         let layerJsonResource: any;
//         let metadataError: any;

//         const layers = (this._layers = []);
//         let attribution = '';
//         const overallAvailability: any[] = [];
//         let overallMaxZoom = 0;
//         Promise.resolve(options.url)
//             .then((url: string | undefined) => {
//                 const resource = Resource.createIfNeeded(url as string) as any;
//                 resource.appendForwardSlash();
//                 lastResource = resource;
//                 layerJsonResource = lastResource.getDerivedResource({
//                     url: 'layer.json',
//                 });

//                 // ion resources have a credits property we can use for additional attribution.
//                 that._tileCredits = resource.credits;

//                 requestLayerJson();
//             })
//             .catch(function (e) {
//                 deferred.reject(e);
//             });

//         function parseMetadataSuccess(data) {
//             let message;

//             if (!data.format) {
//                 message = 'The tile format is not specified in the layer.json file.';
//                 metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//                 return;
//             }

//             if (!data.tiles || data.tiles.length === 0) {
//                 message = 'The layer.json file does not specify any tile URL templates.';
//                 metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//                 return;
//             }

//             let hasVertexNormals = false;
//             let hasWaterMask = false;
//             let hasMetadata = false;
//             let littleEndianExtensionSize = true;
//             let isHeightmap = false;
//             if (data.format === 'heightmap-1.0') {
//                 isHeightmap = true;
//                 if (!defined(that._heightmapStructure)) {
//                     that._heightmapStructure = {
//                         heightScale: 1.0 / 5.0,
//                         heightOffset: -1000.0,
//                         elementsPerHeight: 1,
//                         stride: 1,
//                         elementMultiplier: 256.0,
//                         isBigEndian: false,
//                         lowestEncodedHeight: 0,
//                         highestEncodedHeight: 256 * 256 - 1,
//                     };
//                 }
//                 hasWaterMask = true;
//                 that._requestWaterMask = true;
//             } else if (data.format.indexOf('quantized-mesh-1.') !== 0) {
//                 message = `The tile format "${data.format}" is invalid or not supported.`;
//                 metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//                 return;
//             }

//             const tileUrlTemplates = data.tiles;

//             const maxZoom = data.maxzoom;
//             overallMaxZoom = Math.max(overallMaxZoom, maxZoom);
//             // Keeps track of which of the availablity containing tiles have been loaded

//             if (!data.projection || data.projection === 'EPSG:4326') {
//                 that._tilingScheme = new GeographicTilingScheme({
//                     numberOfLevelZeroTilesX: 2,
//                     numberOfLevelZeroTilesY: 1,
//                     ellipsoid: that._ellipsoid,
//                 });
//             } else if (data.projection === 'EPSG:3857') {
//                 that._tilingScheme = new WebMercatorTilingScheme({
//                     numberOfLevelZeroTilesX: 1,
//                     numberOfLevelZeroTilesY: 1,
//                     ellipsoid: that._ellipsoid,
//                 });
//             } else {
//                 message = `The projection "${data.projection}" is invalid or not supported.`;
//                 metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//                 return;
//             }

//             that._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(that._tilingScheme.ellipsoid, that._heightmapWidth, that._tilingScheme.getNumberOfXTilesAtLevel(0));
//             if (!data.scheme || data.scheme === 'tms' || data.scheme === 'slippyMap') {
//                 that._scheme = data.scheme;
//             } else {
//                 message = `The scheme "${data.scheme}" is invalid or not supported.`;
//                 metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//                 return;
//             }

//             let availabilityTilesLoaded;

//             // The vertex normals defined in the 'octvertexnormals' extension is identical to the original
//             // contents of the original 'vertexnormals' extension.  'vertexnormals' extension is now
//             // deprecated, as the extensionLength for this extension was incorrectly using big endian.
//             // We maintain backwards compatibility with the legacy 'vertexnormal' implementation
//             // by setting the _littleEndianExtensionSize to false. Always prefer 'octvertexnormals'
//             // over 'vertexnormals' if both extensions are supported by the server.
//             if (defined(data.extensions) && data.extensions.indexOf('octvertexnormals') !== -1) {
//                 hasVertexNormals = true;
//             } else if (defined(data.extensions) && data.extensions.indexOf('vertexnormals') !== -1) {
//                 hasVertexNormals = true;
//                 littleEndianExtensionSize = false;
//             }
//             if (defined(data.extensions) && data.extensions.indexOf('watermask') !== -1) {
//                 hasWaterMask = true;
//             }
//             if (defined(data.extensions) && data.extensions.indexOf('metadata') !== -1) {
//                 hasMetadata = true;
//             }

//             const availabilityLevels = data.metadataAvailability;
//             const availableTiles = data.available;
//             let availability;
//             if (defined(availableTiles) && !defined(availabilityLevels)) {
//                 availability = new TileAvailability(that._tilingScheme, availableTiles.length);
//                 for (let level = 0; level < availableTiles.length; ++level) {
//                     const rangesAtLevel = availableTiles[level];
//                     const yTiles = that._tilingScheme.getNumberOfYTilesAtLevel(level);
//                     if (!defined(overallAvailability[level])) {
//                         overallAvailability[level] = [];
//                     }

//                     for (let rangeIndex = 0; rangeIndex < rangesAtLevel.length; ++rangeIndex) {
//                         const range = rangesAtLevel[rangeIndex];
//                         const yStart = yTiles - range.endY - 1;
//                         const yEnd = yTiles - range.startY - 1;
//                         overallAvailability[level].push([range.startX, yStart, range.endX, yEnd]);
//                         availability.addAvailableTileRange(level, range.startX, yStart, range.endX, yEnd);
//                     }
//                 }
//             } else if (defined(availabilityLevels)) {
//                 availabilityTilesLoaded = new TileAvailability(that._tilingScheme, maxZoom);
//                 availability = new TileAvailability(that._tilingScheme, maxZoom);
//                 overallAvailability[0] = [[0, 0, 1, 0]];
//                 availability.addAvailableTileRange(0, 0, 0, 1, 0);
//             }

//             that._hasWaterMask = that._hasWaterMask || hasWaterMask;
//             that._hasVertexNormals = that._hasVertexNormals || hasVertexNormals;
//             that._hasMetadata = that._hasMetadata || hasMetadata;
//             if (defined(data.attribution)) {
//                 if (attribution.length > 0) {
//                     attribution += ' ';
//                 }
//                 attribution += data.attribution;
//             }

//             layers.push(
//                 new LayerInformation({
//                     resource: lastResource,
//                     version: data.version,
//                     isHeightmap: isHeightmap,
//                     tileUrlTemplates: tileUrlTemplates,
//                     availability: availability,
//                     hasVertexNormals: hasVertexNormals,
//                     hasWaterMask: hasWaterMask,
//                     hasMetadata: hasMetadata,
//                     availabilityLevels: availabilityLevels,
//                     availabilityTilesLoaded: availabilityTilesLoaded,
//                     littleEndianExtensionSize: littleEndianExtensionSize,
//                 })
//             );

//             const parentUrl = data.parentUrl;
//             if (defined(parentUrl)) {
//                 if (!defined(availability)) {
//                     console.log("A layer.json can't have a parentUrl if it does't have an available array.");
//                     return Promise.resolve();
//                 }
//                 lastResource = lastResource.getDerivedResource({
//                     url: parentUrl,
//                 });
//                 lastResource.appendForwardSlash(); // Terrain always expects a directory
//                 layerJsonResource = lastResource.getDerivedResource({
//                     url: 'layer.json',
//                 });
//                 const parentMetadata = layerJsonResource.fetchJson();
//                 return Promise.resolve(parentMetadata).then(parseMetadataSuccess).catch(parseMetadataFailure);
//             }

//             return Promise.resolve();
//         }

//         function parseMetadataFailure(data) {
//             const message = `An error occurred while accessing ${layerJsonResource.url}.`;
//             metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestLayerJson);
//         }

//         function metadataSuccess(data) {
//             parseMetadataSuccess(data).then(function () {
//                 if (defined(metadataError)) {
//                     return;
//                 }

//                 const length = overallAvailability.length;
//                 if (length > 0) {
//                     const availability = (that._availability = new TileAvailability(that._tilingScheme, overallMaxZoom));
//                     for (let level = 0; level < length; ++level) {
//                         const levelRanges = overallAvailability[level];
//                         for (let i = 0; i < levelRanges.length; ++i) {
//                             const range = levelRanges[i];
//                             availability.addAvailableTileRange(level, range[0], range[1], range[2], range[3]);
//                         }
//                     }
//                 }

//                 if (attribution.length > 0) {
//                     const layerJsonCredit = new Credit(attribution);

//                     if (defined(that._tileCredits)) {
//                         that._tileCredits.push(layerJsonCredit);
//                     } else {
//                         that._tileCredits = [layerJsonCredit];
//                     }
//                 }

//                 that._ready = true;
//                 that._readyPromise.resolve(true);
//             });
//         }

//         function metadataFailure(data) {
//             // If the metadata is not found, assume this is a pre-metadata heightmap tileset.
//             if (defined(data) && data.statusCode === 404) {
//                 metadataSuccess({
//                     tilejson: '2.1.0',
//                     format: 'heightmap-1.0',
//                     version: '1.0.0',
//                     scheme: 'tms',
//                     tiles: ['{z}/{x}/{y}.terrain?v={version}'],
//                 });
//                 return;
//             }
//             parseMetadataFailure(data);
//         }

//         function requestLayerJson() {
//             Promise.resolve(layerJsonResource.fetchJson()).then(metadataSuccess).catch(metadataFailure);
//         }
//     }
// }
