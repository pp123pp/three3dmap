import BoundingSphere from '@/Core/BoundingSphere';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import Cartographic from '@/Core/Cartographic';
import { CesiumColor } from '@/Core/CesiumColor';
import { CesiumMath } from '@/Core/CesiumMath';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import EllipsoidTerrainProvider from '@/Core/EllipsoidTerrainProvider';
import Emit from '@/Core/Emit';
import Intersect from '@/Core/Intersect';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import QuadtreeTileLoadState from '@/Core/QuadtreeTileLoadState';
import Rectangle from '@/Core/Rectangle';
import { SceneMode } from '@/Core/SceneMode';
import { TerrainExaggeration } from '@/Core/TerrainExaggeration';
import TerrainQuantization from '@/Core/TerrainQuantization';
import { TileBoundingRegion } from '@/Core/TileBoundingRegion';
import Visibility from '@/Core/Visibility';
import { TileMaterial } from '@/Material/TileMaterial';
import DrawMeshCommand from '@/Renderer/DrawMeshCommand';
import { DoubleSide, MeshNormalMaterial, SphereBufferGeometry } from 'three';
import { FrameState } from './FrameState';
import GlobeSurfaceTile from './GlobeSurfaceTile';
import { ImageryLayer } from './ImageryLayer';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import QuadtreePrimitive from './QuadtreePrimitive';
import QuadtreeTile from './QuadtreeTile';
import TerrainFillMesh from './TerrainFillMesh';
import TileSelectionResult from './TileSelectionResult';

interface IGlobeSurfaceTileProviderParameter {
    terrainProvider: EllipsoidTerrainProvider;
    imageryLayers: ImageryLayerCollection;
    // surfaceShaderSet:
}
const tileDirectionScratch = new Cartesian3();
const tileRectangleScratch = new Cartesian4();
const rtcScratch = new Cartesian3();
const southwestScratch = new Cartesian3();
const northeastScratch = new Cartesian3();
const otherPassesInitialColor = new Cartesian4(0.0, 0.0, 0.0, 0.0);

function sortTileImageryByLayerIndex(a: any, b: any) {
    let aImagery = a.loadingImagery;
    if (!defined(aImagery)) {
        aImagery = a.readyImagery;
    }

    let bImagery = b.loadingImagery;
    if (!defined(bImagery)) {
        bImagery = b.readyImagery;
    }

    return aImagery.imageryLayer._layerIndex - bImagery.imageryLayer._layerIndex;
}

const freeVertexArray = function freeVertexArray(vertexArray: any) {
    const indexBuffer = vertexArray.indexBuffer;
    // vertexArray.destroy();
    vertexArray = undefined;

    if (defined(indexBuffer) && !indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
        --indexBuffer.referenceCount;
        if (indexBuffer.referenceCount === 0) {
            indexBuffer.destroy();
        }
    }
};

function updateCredits(surface: GlobeSurfaceTileProvider, frameState: FrameState) {
    // const creditDisplay = frameState.creditDisplay;
    // if (surface._terrainProvider.ready && defined(surface._terrainProvider.credit)) {
    //     creditDisplay.addCredit(surface._terrainProvider.credit);
    // }
    // const imageryLayers = surface._imageryLayers;
    // for (let i = 0, len = imageryLayers.length; i < len; ++i) {
    //     const imageryProvider = imageryLayers.get(i).imageryProvider;
    //     if (imageryProvider.ready && defined(imageryProvider.credit)) {
    //         creditDisplay.addCredit(imageryProvider.credit);
    //     }
    // }
}

const surfaceShaderSetOptionsScratch: any = {
    frameState: undefined,
    surfaceTile: undefined,
    numberOfDayTextures: undefined,
    applyBrightness: undefined,
    applyContrast: undefined,
    applyHue: undefined,
    applySaturation: undefined,
    applyGamma: undefined,
    applyAlpha: undefined,
    applySplit: undefined,
    showReflectiveOcean: undefined,
    showOceanWaves: undefined,
    enableLighting: undefined,
    showGroundAtmosphere: undefined,
    perFragmentGroundAtmosphere: undefined,
    hasVertexNormals: undefined,
    useWebMercatorProjection: undefined,
    enableFog: undefined,
    enableClippingPlanes: undefined,
    clippingPlanes: undefined,
    clippedByBoundaries: undefined,
};

const createTileUniformMap = (frameState: FrameState, tileProvider: any, surfaceShaderSetOptions: any, quantization: any) => {
    const material = new TileMaterial(
        {
            side: DoubleSide,
            // wireframe: true
            // depthTest: false
        },
        surfaceShaderSetOptions
    );

    if (quantization === TerrainQuantization.NONE) {
        material.defines.INCLUDE_WEB_MERCATOR_Y = '';
        return material;
    }

    material.defines.QUANTIZATION_BITS12 = '';
    material.defines.INCLUDE_WEB_MERCATOR_Y = '';
    return material;
};

let getDebugOrientedBoundingBox;
let getDebugBoundingSphere;
let debugDestroyPrimitive: any;

(function () {
    const geometry = new SphereBufferGeometry(1, 8, 8);
    const material = new MeshNormalMaterial({
        // color: 0xffff00
        // wireframe: true
    });

    let previousVolume: any;
    let primitive: any;

    const createDebugPrimitive = () => {
        return new DrawMeshCommand(geometry, material);
    };

    getDebugBoundingSphere = function (sphere: any, color: any) {
        if (sphere === previousVolume) {
            return primitive;
        }
        debugDestroyPrimitive();

        previousVolume = sphere;

        primitive = createDebugPrimitive();
        primitive.enabledClick = true;
        primitive.position.copy(sphere.center);
        primitive.scale.multiplyScalar(0.3);
        primitive.updateMatrixWorld();
        return primitive;
    };

    debugDestroyPrimitive = function () {
        if (defined(primitive)) {
            primitive.geometry.dispose();
            primitive.material.dispose();

            primitive = undefined;
            previousVolume = undefined;
        }
    };
})();

const addDrawCommandsForTile = (tileProvider: any, tile: any, frameState: FrameState) => {
    const surfaceTile = tile.data;

    if (!defined(surfaceTile.vertexArray)) {
        if (surfaceTile.fill === undefined) {
            // No fill was created for this tile, probably because this tile is not connected to
            // any renderable tiles. So create a simple tile in the middle of the tile's possible
            // height range.
            surfaceTile.fill = new TerrainFillMesh(tile);
        }
        surfaceTile.fill.update(tileProvider, frameState);
    }

    let rtc = surfaceTile.center;
    // const encoding = surfaceTile.pickTerrain.mesh.encoding;

    // const encoding = surfaceTile.mesh.encoding;
    const encoding = surfaceTile.renderedMesh.encoding;

    // Not used in 3D.
    const tileRectangle = tileRectangleScratch;

    const useWebMercatorProjection = false;

    if (frameState.mode !== SceneMode.SCENE3D) {
        const projection = frameState.mapProjection;
        const southwest = projection.project(Rectangle.southwest(tile.rectangle), southwestScratch);
        const northeast = projection.project(Rectangle.northeast(tile.rectangle), northeastScratch);

        tileRectangle.x = southwest.x;
        tileRectangle.y = southwest.y;
        tileRectangle.z = northeast.x;
        tileRectangle.w = northeast.y;

        // In 2D and Columbus View, use the center of the tile for RTC rendering.
        if (frameState.mode !== SceneMode.MORPHING) {
            rtc = rtcScratch;
            rtc.x = 0.0;
            rtc.y = (tileRectangle.z + tileRectangle.x) * 0.5;
            rtc.z = (tileRectangle.w + tileRectangle.y) * 0.5;
            tileRectangle.x -= rtc.y;
            tileRectangle.y -= rtc.z;
            tileRectangle.z -= rtc.y;
            tileRectangle.w -= rtc.z;
        }
    }

    const surfaceShaderSetOptions = surfaceShaderSetOptionsScratch;
    surfaceShaderSetOptions.frameState = frameState;
    surfaceShaderSetOptions.surfaceTile = surfaceTile;

    // const quantization = surfaceTile.pickTerrain.mesh.encoding.quantization;

    const quantization = encoding.quantization;
    surfaceShaderSetOptions.enableLighting = tileProvider.enableLighting;
    surfaceShaderSetOptions.useWebMercatorProjection = useWebMercatorProjection;

    const tileImageryCollection = surfaceTile.imagery;
    let imageryIndex = 0;
    const imageryLen = tileImageryCollection.length;

    let initialColor = tileProvider._firstPassInitialColor;

    do {
        let numberOfDayTextures = 0;

        let command: any;
        let uniformMap: any;

        const dayTextures = [];
        const dayTextureTranslationAndScale = [];
        const dayTextureTexCoordsRectangle = [];
        while (imageryIndex < imageryLen) {
            const tileImagery = tileImageryCollection[imageryIndex];
            const imagery = tileImagery.readyImagery;
            ++imageryIndex;

            if (!defined(imagery)) {
                continue;
            }

            const texture = tileImagery.useWebMercatorT ? imagery.textureWebMercator : imagery.texture;

            const imageryLayer = imagery.imageryLayer;

            if (!defined(tileImagery.textureTranslationAndScale)) {
                tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, tileImagery);
            }

            dayTextures[numberOfDayTextures] = texture;
            dayTextureTranslationAndScale[numberOfDayTextures] = tileImagery.textureTranslationAndScale;
            dayTextureTexCoordsRectangle[numberOfDayTextures] = tileImagery.textureCoordinateRectangle;

            ++numberOfDayTextures;
        }

        surfaceShaderSetOptions.numberOfDayTextures = dayTextures.length;

        if (tileProvider._drawCommands.length <= tileProvider._usedDrawCommands) {
            command = new DrawMeshCommand();
            command.owner = tile;
            command.frustumCulled = false;
            command.boundingVolume = new BoundingSphere();
            command.orientedBoundingBox = undefined;

            uniformMap = createTileUniformMap(frameState, tileProvider, surfaceShaderSetOptions, quantization);

            tileProvider._drawCommands.push(command);
            tileProvider._uniformMaps.push(uniformMap);
        } else {
            command = tileProvider._drawCommands[tileProvider._usedDrawCommands];
            uniformMap = tileProvider._uniformMaps[tileProvider._usedDrawCommands];
        }

        if (uniformMap.defines.TEXTURE_UNITS !== uniformMap.dayTextures.length || imageryLen !== uniformMap.dayTextures.length || (quantization === TerrainQuantization.BITS12 && !defined(uniformMap.defines.QUANTIZATION_BITS12))) {
            uniformMap.dispose();
            uniformMap = createTileUniformMap(frameState, tileProvider, surfaceShaderSetOptions, quantization);
        }

        ++tileProvider._usedDrawCommands;

        uniformMap.dayTextures = dayTextures;
        uniformMap.dayTextureTranslationAndScale = dayTextureTranslationAndScale;
        uniformMap.dayTextureTexCoordsRectangle = dayTextureTexCoordsRectangle;

        Cartesian4.clone(initialColor, uniformMap.initialColor);

        command.owner = tile;

        if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            command.position.set(rtc.y, rtc.z, rtc.x);
        } else if (frameState.mode === SceneMode.SCENE3D) {
            command.position.set(rtc.x, rtc.y, rtc.z);
        }

        command.updateMatrixWorld();

        uniformMap.tileRectangle = tileRectangle;

        uniformMap.minMaxHeight.x = encoding.minimumHeight;
        uniformMap.minMaxHeight.y = encoding.maximumHeight;

        uniformMap.scaleAndBias = encoding.matrix;

        // debugger;
        command.geometry = surfaceTile.renderedMesh.geometry;
        command.material = uniformMap;

        let boundingVolume = command.boundingVolume;
        const orientedBoundingBox = command.orientedBoundingBox;

        if (frameState.mode !== SceneMode.SCENE3D) {
            BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.mapProjection, surfaceTile.minimumHeight, surfaceTile.maximumHeight, boundingVolume);
            // Vector3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            Cartesian3.fromElements(boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center.z, boundingVolume.center);

            if (frameState.mode === SceneMode.MORPHING) {
                boundingVolume = BoundingSphere.union(surfaceTile.boundingSphere3D, boundingVolume, boundingVolume);
            }
        } else {
            command.boundingVolume = BoundingSphere.clone(surfaceTile.boundingSphere3D, boundingVolume);
            command.orientedBoundingBox = OrientedBoundingBox.clone(surfaceTile.orientedBoundingBox, orientedBoundingBox);
        }

        // if (defined(command.boundingVolume)) {
        //     let sphere = getDebugBoundingSphere(command.boundingVolume, CesiumColor.RED);
        //     sphere._levelId = tile.levelId;
        //     frameState.commandList.push(sphere);
        // }

        frameState.commandList.push(command);

        // if (uniformMap.defines.TEXTURE_UNITS !== uniformMap.dayTextures.length) {
        //     debugger;
        // }

        initialColor = otherPassesInitialColor;
    } while (imageryIndex < imageryLen);
};

const getTileReadyCallback = (tileImageriesToFree: any, layer: any, terrainProvider: any) => {
    return function (tile: any) {
        let tileImagery;
        let imagery;
        let startIndex = -1;
        const tileImageryCollection = tile.data.imagery;
        const length = tileImageryCollection.length;
        let i;
        for (i = 0; i < length; ++i) {
            tileImagery = tileImageryCollection[i];
            imagery = defaultValue(tileImagery.readyImagery, tileImagery.loadingImagery);
            if (imagery.imageryLayer === layer) {
                startIndex = i;
                break;
            }
        }

        if (startIndex !== -1) {
            const endIndex = startIndex + tileImageriesToFree;
            tileImagery = tileImageryCollection[endIndex];
            imagery = defined(tileImagery) ? defaultValue(tileImagery.readyImagery, tileImagery.loadingImagery) : undefined;
            if (!defined(imagery) || imagery.imageryLayer !== layer) {
                // Return false to keep the callback if we have to wait on the skeletons
                // Return true to remove the callback if something went wrong
                return !layer._createTileImagerySkeletons(tile, terrainProvider, endIndex);
            }

            for (i = startIndex; i < endIndex; ++i) {
                tileImageryCollection[i].freeResources();
            }

            tileImageryCollection.splice(startIndex, tileImageriesToFree);
        }

        return true; // Everything is done, so remove the callback
    };
};

const boundingSphereScratch = new BoundingSphere();
const rectangleIntersectionScratch = new Rectangle();
const splitCartographicLimitRectangleScratch = new Rectangle();
const rectangleCenterScratch = new Cartographic();

// cartographicLimitRectangle may span the IDL, but tiles never will.
const clipRectangleAntimeridian = (tileRectangle: Rectangle, cartographicLimitRectangle: Rectangle) => {
    if (cartographicLimitRectangle.west < cartographicLimitRectangle.east) {
        return cartographicLimitRectangle;
    }
    const splitRectangle = Rectangle.clone(cartographicLimitRectangle, splitCartographicLimitRectangleScratch) as Rectangle;
    const tileCenter = Rectangle.center(tileRectangle, rectangleCenterScratch);
    if (tileCenter.longitude > 0.0) {
        splitRectangle.east = CesiumMath.PI;
    } else {
        splitRectangle.west = -CesiumMath.PI;
    }
    return splitRectangle;
};

/**
 * Provides quadtree tiles representing the surface of the globe.  This type is intended to be used
 * with {@link QuadtreePrimitive}.
 *
 * @alias GlobeSurfaceTileProvider
 * @constructor
 *
 * @param {TerrainProvider} options.terrainProvider The terrain provider that describes the surface geometry.
 * @param {ImageryLayerCollection} option.imageryLayers The collection of imagery layers describing the shading of the surface.
 * @param {GlobeSurfaceShaderSet} options.surfaceShaderSet The set of shaders used to render the surface.
 *
 * @private
 */
export default class GlobeSurfaceTileProvider {
    _quadtree: any;
    _imageryLayers: ImageryLayerCollection;
    _terrainProvider: EllipsoidTerrainProvider;

    readonly errorEvent = new Emit();
    readonly imageryLayersUpdatedEvent = new Emit();
    readonly tileLoadedEvent = new Emit();

    _baseColor = new CesiumColor(0.0, 0.0, 0.5, 1.0);

    _imageryLayersUpdatedEvent = new Emit();

    _layerOrderChanged = false;
    _tilesToRenderByTextureCount: any[] = [];
    _drawCommands: any[] = [];
    _compressCommands: any[] = [];
    _uniformMaps: any[] = [];
    _compressUniformMaps: any[] = [];

    _usedDrawCommands = 0;

    _vertexArraysToDestroy: any[] = [];

    cartographicLimitRectangle = Rectangle.clone(Rectangle.MAX_VALUE);

    _debug = {
        wireframe: false,
        boundingSphereTile: undefined,
    };

    _firstPassInitialColor?: Cartesian4;

    _hasLoadedTilesThisFrame = false;
    _hasFillTilesThisFrame = false;

    _oldTerrainExaggeration?: number;
    _oldTerrainExaggerationRelativeHeight?: number;
    constructor(options: IGlobeSurfaceTileProviderParameter) {
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }

        this._quadtree = undefined;
        this._imageryLayers = options.imageryLayers;
        this._terrainProvider = options.terrainProvider;

        this._imageryLayers.layerAdded.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerAdded, this);
        this._imageryLayers.layerRemoved.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerRemoved, this);
        this._imageryLayers.layerMoved.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerMoved, this);
        this._imageryLayers.layerShownOrHidden.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerShownOrHidden, this);

        this.baseColor = new CesiumColor(0.0, 0.0, 0.5, 1.0);
    }

    get tilingScheme() {
        return this._terrainProvider.tilingScheme;
    }

    get ready(): boolean {
        return this._imageryLayers.length === 0 || this._imageryLayers.get(0).imageryProvider.ready;
    }

    /**
     * Gets or sets the terrain provider that describes the surface geometry.
     * @memberof GlobeSurfaceTileProvider.prototype
     * @type {TerrainProvider}
     */

    get terrainProvider(): EllipsoidTerrainProvider {
        return this._terrainProvider;
    }

    set terrainProvider(terrainProvider) {
        if (this._terrainProvider === terrainProvider) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(terrainProvider)) {
            throw new DeveloperError('terrainProvider is required.');
        }
        //>>includeEnd('debug');

        this._terrainProvider = terrainProvider;

        if (defined(this._quadtree)) {
            this._quadtree.invalidateAllTiles();
        }
    }

    get quadtree(): QuadtreePrimitive {
        return this._quadtree;
    }

    set quadtree(value: QuadtreePrimitive) {
        this._quadtree = value;
    }

    get baseColor() {
        return this._baseColor;
    }

    set baseColor(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        this._baseColor = value;
        this._firstPassInitialColor = Cartesian4.fromColor(value, this._firstPassInitialColor);
    }

    _onLayerAdded(layer: any, index: any) {
        if (layer.show) {
            const terrainProvider = this._terrainProvider;

            const that = this;
            const imageryProvider = layer.imageryProvider;
            const tileImageryUpdatedEvent = this._imageryLayersUpdatedEvent;
            imageryProvider._reload = function () {
                // Clear the layer's cache
                layer._imageryCache = {};

                that._quadtree.forEachLoadedTile(function (tile: any) {
                    // If this layer is still waiting to for the loaded callback, just return
                    if (defined(tile._loadedCallbacks[layer._layerIndex])) {
                        return;
                    }

                    let i;

                    // Figure out how many TileImageries we will need to remove and where to insert new ones
                    const tileImageryCollection = tile.data.imagery;
                    const length = tileImageryCollection.length;
                    let startIndex = -1;
                    let tileImageriesToFree = 0;
                    for (i = 0; i < length; ++i) {
                        const tileImagery = tileImageryCollection[i];
                        const imagery = defaultValue(tileImagery.readyImagery, tileImagery.loadingImagery);
                        if (imagery.imageryLayer === layer) {
                            if (startIndex === -1) {
                                startIndex = i;
                            }

                            ++tileImageriesToFree;
                        } else if (startIndex !== -1) {
                            // iterated past the section of TileImageries belonging to this layer, no need to continue.
                            break;
                        }
                    }

                    if (startIndex === -1) {
                        return;
                    }

                    // Insert immediately after existing TileImageries
                    const insertionPoint = startIndex + tileImageriesToFree;

                    // Create new TileImageries for all loaded tiles
                    if (layer._createTileImagerySkeletons(tile, terrainProvider, insertionPoint)) {
                        // Add callback to remove old TileImageries when the new TileImageries are ready
                        tile._loadedCallbacks[layer._layerIndex] = getTileReadyCallback(tileImageriesToFree, layer, terrainProvider);

                        tile.state = QuadtreeTileLoadState.LOADING;
                    }
                });
            };

            // create TileImageries for this layer for all previously loaded tiles
            this._quadtree.forEachLoadedTile(function (tile: any) {
                if (layer._createTileImagerySkeletons(tile, terrainProvider)) {
                    tile.state = QuadtreeTileLoadState.LOADING;
                }
            });

            this._layerOrderChanged = true;
            tileImageryUpdatedEvent.raiseEvent();
        }
    }

    _onLayerRemoved(layer: any, index: any) {
        // destroy TileImagerys for this layer for all previously loaded tiles
        this._quadtree.forEachLoadedTile(function (tile: any) {
            const tileImageryCollection = tile.data.imagery;

            let startIndex = -1;
            let numDestroyed = 0;
            for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
                const tileImagery = tileImageryCollection[i];
                let imagery = tileImagery.loadingImagery;
                if (!defined(imagery)) {
                    imagery = tileImagery.readyImagery;
                }
                if (imagery.imageryLayer === layer) {
                    if (startIndex === -1) {
                        startIndex = i;
                    }

                    tileImagery.freeResources();
                    ++numDestroyed;
                } else if (startIndex !== -1) {
                    // iterated past the section of TileImagerys belonging to this layer, no need to continue.
                    break;
                }
            }

            if (startIndex !== -1) {
                tileImageryCollection.splice(startIndex, numDestroyed);
            }
        });

        if (defined(layer.imageryProvider)) {
            layer.imageryProvider._reload = undefined;
        }

        this._imageryLayersUpdatedEvent.raiseEvent();
    }

    _onLayerMoved(layer: ImageryLayer, newIndex: any, oldIndex: any) {
        this._layerOrderChanged = true;
        this._imageryLayersUpdatedEvent.raiseEvent();
    }

    _onLayerShownOrHidden(layer: any, index: any, show: any) {
        if (show) {
            this._onLayerAdded(layer, index);
        } else {
            this._onLayerRemoved(layer, index);
        }
    }

    /**
     * Called at the beginning of each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
     * @param {FrameState} frameState The frame state.
     */
    initialize(frameState: FrameState): void {
        // update each layer for texture reprojection.
        this._imageryLayers.queueReprojectionCommands(frameState);

        if (this._layerOrderChanged) {
            this._layerOrderChanged = false;

            // Sort the TileImagery instances in each tile by the layer index.
            this._quadtree.forEachLoadedTile(function (tile: any) {
                tile.data.imagery.sort(sortTileImageryByLayerIndex);
            });
        }

        // Add credits for terrain and imagery providers.
        updateCredits(this, frameState);

        const vertexArraysToDestroy = this._vertexArraysToDestroy;
        const length = vertexArraysToDestroy.length;
        for (let j = 0; j < length; ++j) {
            freeVertexArray(vertexArraysToDestroy[j]);
        }
        vertexArraysToDestroy.length = 0;
    }

    /**
     * Called at the beginning of the update cycle for each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
     * or any other functions.
     *
     * @param {FrameState} frameState The frame state.
     */
    beginUpdate(frameState: FrameState): void {
        const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        for (let i = 0, len = tilesToRenderByTextureCount.length; i < len; ++i) {
            const tiles = tilesToRenderByTextureCount[i];
            if (defined(tiles)) {
                tiles.length = 0;
            }
        }
        // update clipping planes
        // var clippingPlanes = this._clippingPlanes;
        // if (defined(clippingPlanes) && clippingPlanes.enabled) {
        //     clippingPlanes.update(frameState);
        // }
        this._usedDrawCommands = 0;
        this._hasLoadedTilesThisFrame = false;
        this._hasFillTilesThisFrame = false;
    }

    /**
     * Called at the end of the update cycle for each render frame, after {@link QuadtreeTileProvider#showTileThisFrame}
     * and any other functions.
     *
     * @param {FrameState} frameState The frame state.
     */
    endUpdate(frameState: FrameState): void {
        // const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        // for (let textureCountIndex = 0, textureCountLength = tilesToRenderByTextureCount.length; textureCountIndex < textureCountLength; ++textureCountIndex) {
        //     const tilesToRender = tilesToRenderByTextureCount[textureCountIndex];
        //     if (!defined(tilesToRender)) {
        //         continue;
        //     }
        //     for (let tileIndex = 0, tileLength = tilesToRender.length; tileIndex < tileLength; ++tileIndex) {
        //         addDrawCommandsForTile(this, tilesToRender[tileIndex], frameState);
        //     }
        // }

        // const quadtree = this.quadtree;
        // const exaggeration = frameState.terrainExaggeration;
        // const exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
        // const exaggerationChanged = this._oldTerrainExaggeration !== exaggeration || this._oldTerrainExaggerationRelativeHeight !== exaggerationRelativeHeight;

        // // Keep track of the next time there is a change in exaggeration
        // this._oldTerrainExaggeration = exaggeration;
        // this._oldTerrainExaggerationRelativeHeight = exaggerationRelativeHeight;

        // if (exaggerationChanged) {
        //     quadtree.forEachLoadedTile(function (tile: QuadtreeTile) {
        //         const surfaceTile = tile.data as GlobeSurfaceTile;
        //         surfaceTile.updateExaggeration(tile, frameState, quadtree);
        //     });
        // }

        // Add the tile render commands to the command list, sorted by texture count.
        const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        for (let textureCountIndex = 0, textureCountLength = tilesToRenderByTextureCount.length; textureCountIndex < textureCountLength; ++textureCountIndex) {
            const tilesToRender = tilesToRenderByTextureCount[textureCountIndex];
            if (!defined(tilesToRender)) {
                continue;
            }

            for (let tileIndex = 0, tileLength = tilesToRender.length; tileIndex < tileLength; ++tileIndex) {
                const tile = tilesToRender[tileIndex];
                const tileBoundingRegion = tile.data.tileBoundingRegion;
                addDrawCommandsForTile(this, tile, frameState);
                frameState.minimumTerrainHeight = Math.min(frameState.minimumTerrainHeight, tileBoundingRegion.minimumHeight);
            }
        }
    }

    update(frameState: FrameState): void {
        // update collection: imagery indices, base layers, raise layer show/hide event
        this._imageryLayers._update();
    }

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.  This function should
     * not be called before {@link GlobeSurfaceTileProvider#ready} returns true.
     *
     * @param {FrameState} frameState The frame state.
     * @param {QuadtreeTile} tile The tile to load.
     *
     * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
     */
    loadTile(frameState: FrameState, tile: QuadtreeTile): void {
        // GlobeSurfaceTile.processStateMachine(tile, frameState, this._terrainProvider, this._imageryLayers, this._vertexArraysToDestroy);
        // const tileLoadedEvent = this.tileLoadedEvent;
        // tile._loadedCallbacks['tileLoadedEvent'] = function () {
        //     tileLoadedEvent.raiseEvent();
        //     return true;
        // };

        // We don't want to load imagery until we're certain that the terrain tiles are actually visible.
        // So if our bounding volume isn't accurate because it came from another tile, load terrain only
        // initially. If we load some terrain and suddenly have a more accurate bounding volume and the
        // tile is _still_ visible, give the tile a chance to load imagery immediately rather than
        // waiting for next frame.

        let surfaceTile = tile.data as GlobeSurfaceTile;
        let terrainOnly = true;
        let terrainStateBefore;
        // if (defined(surfaceTile)) {
        //     terrainOnly = surfaceTile.boundingVolumeSourceTile !== tile || tile._lastSelectionResult === TileSelectionResult.CULLED_BUT_NEEDED;
        //     terrainStateBefore = surfaceTile.terrainState;
        // }

        GlobeSurfaceTile.processStateMachine(tile, frameState, this.terrainProvider, this._imageryLayers, this.quadtree, this._vertexArraysToDestroy, terrainOnly);

        surfaceTile = tile.data as GlobeSurfaceTile;
        if (terrainOnly && terrainStateBefore !== surfaceTile.terrainState) {
            // Terrain state changed. If:
            // a) The tile is visible, and
            // b) The bounding volume is accurate (updated as a side effect of computing visibility)
            // Then we'll load imagery, too.
            if (this.computeTileVisibility(tile, frameState, this.quadtree.occluders) !== Visibility.NONE && surfaceTile.boundingVolumeSourceTile === tile) {
                terrainOnly = false;
                GlobeSurfaceTile.processStateMachine(tile, frameState, this.terrainProvider, this._imageryLayers, this.quadtree, this._vertexArraysToDestroy, terrainOnly);
            }
        }
    }

    /**
     * Shows a specified tile in this frame.  The provider can cause the tile to be shown by adding
     * render commands to the commandList, or use any other method as appropriate.  The tile is not
     * expected to be visible next frame as well, unless this method is called next frame, too.
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     */
    showTileThisFrame(tile: QuadtreeTile, frameState: FrameState): void {
        let readyTextureCount = 0;
        const tileImageryCollection = (tile.data as GlobeSurfaceTile).imagery;
        for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
            const tileImagery = tileImageryCollection[i];
            if (defined(tileImagery.readyImagery) && tileImagery.readyImagery.imageryLayer.alpha !== 0.0) {
                ++readyTextureCount;
            }
        }

        let tileSet = this._tilesToRenderByTextureCount[readyTextureCount];
        if (!defined(tileSet)) {
            tileSet = [];
            this._tilesToRenderByTextureCount[readyTextureCount] = tileSet;
        }

        tileSet.push(tile);

        // const debug = this._debug;
        // ++debug.tilesRendered;
        // debug.texturesRendered += readyTextureCount;
    }

    /**
     * Cancels any imagery re-projections in the queue.
     */
    cancelReprojections(): void {
        this._imageryLayers.cancelReprojections();
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level, in meters.  This function should not be
     * called before {@link GlobeSurfaceTileProvider#ready} returns true.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error in meters.
     */
    getLevelMaximumGeometricError(level: number): number {
        return this._terrainProvider.getLevelMaximumGeometricError(level);
    }

    computeTileVisibility(tile: any, frameState: any, occluders: any): any {
        const distance = this.computeDistanceToTile(tile, frameState);
        tile._distance = distance;

        // if (frameState.fog.enabled) {
        //     if (CesiumMath.fog(distance, frameState.fog.density) >= 1.0) {
        //         // Tile is completely in fog so return that it is not visible.
        //         return Visibility.NONE;
        //     }
        // }

        const surfaceTile = tile.data;
        const cullingVolume = frameState.cullingVolume;
        let boundingVolume = defaultValue(surfaceTile.orientedBoundingBox, surfaceTile.boundingSphere3D);

        // Check if the tile is outside the limit area in cartographic space
        surfaceTile.clippedByBoundaries = false;
        const clippedCartographicLimitRectangle = clipRectangleAntimeridian(tile.rectangle, this.cartographicLimitRectangle as Rectangle);
        const areaLimitIntersection = Rectangle.simpleIntersection(clippedCartographicLimitRectangle, tile.rectangle, rectangleIntersectionScratch);
        if (!defined(areaLimitIntersection)) {
            return Visibility.NONE;
        }
        if (!Rectangle.equals(areaLimitIntersection, tile.rectangle)) {
            surfaceTile.clippedByBoundaries = true;
        }

        if (frameState.mode !== SceneMode.SCENE3D) {
            boundingVolume = boundingSphereScratch;
            BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.mapProjection, surfaceTile.minimumHeight, surfaceTile.maximumHeight, boundingVolume);
            // Vector3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            Cartesian3.fromElements(boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center.z, boundingVolume.center);

            if (frameState.mode === SceneMode.MORPHING) {
                boundingVolume = BoundingSphere.union(surfaceTile.boundingSphere3D, boundingVolume, boundingVolume);
            }
        }

        const intersection = cullingVolume.computeVisibility(boundingVolume);
        if (intersection === Intersect.OUTSIDE) {
            return Visibility.NONE;
        }

        return intersection;
    }

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    computeDistanceToTile(tile: QuadtreeTile, frameState: FrameState): number {
        // The distance should be:
        // 1. the actual distance to the tight-fitting bounding volume, or
        // 2. a distance that is equal to or greater than the actual distance to the tight-fitting bounding volume.
        //
        // When we don't know the min/max heights for a tile, but we do know the min/max of an ancestor tile, we can
        // build a tight-fitting bounding volume horizontally, but not vertically. The min/max heights from the
        // ancestor will likely form a volume that is much bigger than it needs to be. This means that the volume may
        // be deemed to be much closer to the camera than it really is, causing us to select tiles that are too detailed.
        // Loading too-detailed tiles is super expensive, so we don't want to do that. We don't know where the child
        // tile really lies within the parent range of heights, but we _do_ know the child tile can't be any closer than
        // the ancestor height surface (min or max) that is _farthest away_ from the camera. So if we compute distance
        // based on that conservative metric, we may end up loading tiles that are not detailed enough, but that's much
        // better (faster) than loading tiles that are too detailed.

        updateTileBoundingRegion(tile, this, frameState);

        const surfaceTile = tile.data as GlobeSurfaceTile;
        const boundingVolumeSourceTile = surfaceTile.boundingVolumeSourceTile;
        if (boundingVolumeSourceTile === undefined) {
            // Can't find any min/max heights anywhere? Ok, let's just say the
            // tile is really far away so we'll load and render it rather than
            // refining.
            return 9999999999.0;
        }

        const tileBoundingRegion = surfaceTile.tileBoundingRegion;
        const min = tileBoundingRegion.minimumHeight;
        const max = tileBoundingRegion.maximumHeight;

        if (surfaceTile.boundingVolumeSourceTile !== tile) {
            const cameraHeight = frameState.camera.positionCartographic.height;
            const distanceToMin = Math.abs(cameraHeight - min);
            const distanceToMax = Math.abs(cameraHeight - max);
            if (distanceToMin > distanceToMax) {
                tileBoundingRegion.minimumHeight = min;
                tileBoundingRegion.maximumHeight = min;
            } else {
                tileBoundingRegion.minimumHeight = max;
                tileBoundingRegion.maximumHeight = max;
            }
        }

        const result = tileBoundingRegion.distanceToCamera(frameState);

        tileBoundingRegion.minimumHeight = min;
        tileBoundingRegion.maximumHeight = max;

        return result;
    }

    /**
     * Determines if the given tile can be refined
     * @param {QuadtreeTile} tile The tile to check.
     * @returns {boolean} True if the tile can be refined, false if it cannot.
     */
    canRefine(tile: QuadtreeTile): boolean {
        // Only allow refinement it we know whether or not the children of this tile exist.
        // For a tileset with `availability`, we'll always be able to refine.
        // We can ask for availability of _any_ child tile because we only need to confirm
        // that we get a yes or no answer, it doesn't matter what the answer is.
        if (defined((tile.data as GlobeSurfaceTile).terrainData)) {
            return true;
        }
        const childAvailable = this.terrainProvider.getTileDataAvailable(tile.x * 2, tile.y * 2, tile.level + 1);
        return childAvailable !== undefined;
    }

    /**
     * Determines the priority for loading this tile. Lower priority values load sooner.
     * @param {QuadtreeTile} tile The tile.
     * @param {FrameState} frameState The frame state.
     * @returns {Number} The load priority value.
     */
    computeTileLoadPriority(tile: QuadtreeTile, frameState: FrameState): number {
        const surfaceTile = tile.data;
        if (surfaceTile === undefined) {
            return 0.0;
        }

        const obb = surfaceTile.tileBoundingRegion.boundingVolume;
        if (obb === undefined) {
            return 0.0;
        }

        const cameraPosition = frameState.camera.positionWC;
        const cameraDirection = frameState.camera.directionWC;
        const tileDirection = Cartesian3.subtract(obb.center, cameraPosition, tileDirectionScratch);
        const magnitude = Cartesian3.magnitude(tileDirection);
        if (magnitude < CesiumMath.EPSILON5) {
            return 0.0;
        }
        Cartesian3.divideByScalar(tileDirection, magnitude, tileDirection);
        return (1.0 - Cartesian3.dot(tileDirection, cameraDirection)) * tile._distance;
    }
}
function updateTileBoundingRegion(tile: QuadtreeTile, tileProvider: GlobeSurfaceTileProvider, frameState: FrameState) {
    let surfaceTile = tile.data;
    if (surfaceTile === undefined) {
        surfaceTile = tile.data = new GlobeSurfaceTile();
    }

    const ellipsoid = tile.tilingScheme.ellipsoid;
    if (surfaceTile.tileBoundingRegion === undefined) {
        surfaceTile.tileBoundingRegion = new TileBoundingRegion({
            computeBoundingVolumes: false,
            rectangle: tile.rectangle,
            ellipsoid: ellipsoid,
            minimumHeight: 0.0,
            maximumHeight: 0.0,
        });
    }

    const tileBoundingRegion = surfaceTile.tileBoundingRegion;
    const oldMinimumHeight = tileBoundingRegion.minimumHeight;
    const oldMaximumHeight = tileBoundingRegion.maximumHeight;
    let hasBoundingVolumesFromMesh = false;
    let sourceTile = tile;

    // Get min and max heights from the mesh.
    // If the mesh is not available, get them from the terrain data.
    // If the terrain data is not available either, get them from an ancestor.
    // If none of the ancestors are available, then there are no min and max heights for this tile at this time.
    const mesh = surfaceTile.mesh;
    const terrainData = surfaceTile.terrainData;
    if (mesh !== undefined && mesh.minimumHeight !== undefined && mesh.maximumHeight !== undefined) {
        tileBoundingRegion.minimumHeight = mesh.minimumHeight;
        tileBoundingRegion.maximumHeight = mesh.maximumHeight;
        hasBoundingVolumesFromMesh = true;
    } else if (terrainData !== undefined && terrainData._minimumHeight !== undefined && terrainData._maximumHeight !== undefined) {
        tileBoundingRegion.minimumHeight = terrainData._minimumHeight;
        tileBoundingRegion.maximumHeight = terrainData._maximumHeight;
    } else {
        // No accurate min/max heights available, so we're stuck with min/max heights from an ancestor tile.
        tileBoundingRegion.minimumHeight = Number.NaN;
        tileBoundingRegion.maximumHeight = Number.NaN;

        let ancestorTile = tile.parent;
        while (ancestorTile !== undefined) {
            const ancestorSurfaceTile = ancestorTile.data;
            if (ancestorSurfaceTile !== undefined) {
                const ancestorMesh = ancestorSurfaceTile.mesh;
                const ancestorTerrainData = ancestorSurfaceTile.terrainData;
                if (ancestorMesh !== undefined && ancestorMesh.minimumHeight !== undefined && ancestorMesh.maximumHeight !== undefined) {
                    tileBoundingRegion.minimumHeight = ancestorMesh.minimumHeight;
                    tileBoundingRegion.maximumHeight = ancestorMesh.maximumHeight;
                    break;
                } else if (ancestorTerrainData !== undefined && ancestorTerrainData._minimumHeight !== undefined && ancestorTerrainData._maximumHeight !== undefined) {
                    tileBoundingRegion.minimumHeight = ancestorTerrainData._minimumHeight;
                    tileBoundingRegion.maximumHeight = ancestorTerrainData._maximumHeight;
                    break;
                }
            }
            ancestorTile = ancestorTile.parent;
        }
        sourceTile = ancestorTile;
    }

    // Update bounding regions from the min and max heights
    if (sourceTile !== undefined) {
        const exaggeration = frameState.terrainExaggeration;
        const exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
        const hasExaggeration = exaggeration !== 1.0;
        if (hasExaggeration) {
            hasBoundingVolumesFromMesh = false;
            tileBoundingRegion.minimumHeight = TerrainExaggeration.getHeight(tileBoundingRegion.minimumHeight, exaggeration, exaggerationRelativeHeight);
            tileBoundingRegion.maximumHeight = TerrainExaggeration.getHeight(tileBoundingRegion.maximumHeight, exaggeration, exaggerationRelativeHeight);
        }

        if (hasBoundingVolumesFromMesh) {
            if (!surfaceTile.boundingVolumeIsFromMesh) {
                tileBoundingRegion._orientedBoundingBox = OrientedBoundingBox.clone(mesh.orientedBoundingBox, tileBoundingRegion._orientedBoundingBox);
                tileBoundingRegion._boundingSphere = BoundingSphere.clone(mesh.boundingSphere3D, tileBoundingRegion._boundingSphere);
                surfaceTile.occludeePointInScaledSpace = Cartesian3.clone(mesh.occludeePointInScaledSpace, surfaceTile.occludeePointInScaledSpace);

                // If the occludee point is not defined, fallback to calculating it from the OBB
                if (!defined(surfaceTile.occludeePointInScaledSpace)) {
                    surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(tileProvider, tileBoundingRegion._orientedBoundingBox.center, tile.rectangle, tileBoundingRegion.minimumHeight, tileBoundingRegion.maximumHeight, surfaceTile.occludeePointInScaledSpace);
                }
            }
        } else {
            const needsBounds = tileBoundingRegion._orientedBoundingBox === undefined || tileBoundingRegion._boundingSphere === undefined;
            const heightChanged = tileBoundingRegion.minimumHeight !== oldMinimumHeight || tileBoundingRegion.maximumHeight !== oldMaximumHeight;
            if (heightChanged || needsBounds) {
                // Bounding volumes need to be recomputed in some circumstances
                tileBoundingRegion.computeBoundingVolumes(ellipsoid);
                surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(tileProvider, tileBoundingRegion._orientedBoundingBox.center, tile.rectangle, tileBoundingRegion.minimumHeight, tileBoundingRegion.maximumHeight, surfaceTile.occludeePointInScaledSpace);
            }
        }
        surfaceTile.boundingVolumeSourceTile = sourceTile;
        surfaceTile.boundingVolumeIsFromMesh = hasBoundingVolumesFromMesh;
    } else {
        surfaceTile.boundingVolumeSourceTile = undefined;
        surfaceTile.boundingVolumeIsFromMesh = false;
    }
}

const cornerPositionsScratch = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];

function computeOccludeePoint(tileProvider: GlobeSurfaceTileProvider, center: Cartesian3, rectangle: Rectangle, minimumHeight: number, maximumHeight: number, result: Cartesian3): any {
    // const ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
    // const ellipsoid = ellipsoidalOccluder.ellipsoid;
    // const cornerPositions = cornerPositionsScratch;
    // Cartesian3.fromRadians(rectangle.west, rectangle.south, maximumHeight, ellipsoid, cornerPositions[0]);
    // Cartesian3.fromRadians(rectangle.east, rectangle.south, maximumHeight, ellipsoid, cornerPositions[1]);
    // Cartesian3.fromRadians(rectangle.west, rectangle.north, maximumHeight, ellipsoid, cornerPositions[2]);
    // Cartesian3.fromRadians(rectangle.east, rectangle.north, maximumHeight, ellipsoid, cornerPositions[3]);
    // return ellipsoidalOccluder.computeHorizonCullingPointPossiblyUnderEllipsoid(center, cornerPositions, minimumHeight, result);
}
