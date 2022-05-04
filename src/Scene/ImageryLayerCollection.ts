import { ImageryLayer } from './ImageryLayer';
import Emit from '@/Core/Emit';
import { FrameState } from './FrameState';
import DeveloperError from '@/Core/DeveloperError';
import defined from '@/Core/defined';

const getLayerIndex = (layers: any, layer: any): number => {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(layer)) {
        throw new DeveloperError('layer is required.');
    }
    //>>includeEnd('debug');

    const index = layers.indexOf(layer);

    //>>includeStart('debug', pragmas.debug);
    if (index === -1) {
        throw new DeveloperError('layer is not in this collection.');
    }
    //>>includeEnd('debug');

    return index;
};
class ImageryLayerCollection {
    _layers: any[] = [];

    /**
     * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
     * was added and the index at which it was added.
     * @type {Emit}
     * @default Emit()
     */
    layerAdded = new Emit();

    /**
     * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
     * was removed and the index from which it was removed.
     * @type {Emit}
     * @default Emit()
     */
    layerRemoved = new Emit();

    /**
     * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
     * was moved, its new index after the move, and its old index prior to the move.
     * @type {Emit}
     * @default Emit()
     */
    layerMoved = new Emit();

    /**
     * An event that is raised when a layer is shown or hidden by setting the
     * {@link ImageryLayer#show} property.  Event handlers are passed a reference to this layer,
     * the index of the layer in the collection, and a flag that is true if the layer is now
     * shown or false if it is now hidden.
     *
     * @type {Event}
     * @default Event()
     */
    layerShownOrHidden = new Emit();

    get length(): number {
        return this._layers.length;
    }

    add(layer: any, index?: number): void {
        const hasIndex = defined(index);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(layer)) {
            throw new DeveloperError('layer is required.');
        }
        if (hasIndex) {
            if ((index as number) < 0) {
                throw new DeveloperError('index must be greater than or equal to zero.');
            } else if ((index as number) > this._layers.length) {
                throw new DeveloperError('index must be less than or equal to the number of layers.');
            }
        }
        //>>includeEnd('debug');

        if (!hasIndex) {
            index = this._layers.length;
            this._layers.push(layer);
        } else {
            this._layers.splice(index as number, 0, layer);
        }

        this._update();
        this.layerAdded.raiseEvent(layer, index);
    }

    /**
     * Gets a layer by index from the collection.
     *
     * @param {Number} index the index to retrieve.
     *
     * @returns {ImageryLayer} The imagery layer at the given index.
     */
    get(index: number): ImageryLayer {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._layers[index];
    }

    /**
     * Creates a new layer using the given ImageryProvider and adds it to the collection.
     *
     * @param {ImageryProvider} imageryProvider the imagery provider to create a new layer for.
     * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
     *                         added on top of all existing layers.
     * @returns {ImageryLayer} The newly created layer.
     */
    addImageryProvider(imageryProvider: any, index?: number): ImageryLayer {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(imageryProvider)) {
            throw new DeveloperError('imageryProvider is required.');
        }
        //>>includeEnd('debug');

        const layer = new ImageryLayer(imageryProvider);
        this.add(layer, index);
        return layer;
    }

    remove(layer: any, destroy = true): boolean {
        const index = this._layers.indexOf(layer);
        if (index !== -1) {
            this._layers.splice(index, 1);

            this._update();

            this.layerRemoved.raiseEvent(layer, index);

            if (destroy) {
                layer.destroy();
            }

            return true;
        }

        return false;
    }

    /**
     * Raises a layer to the top of the collection.
     *
     * @param {ImageryLayer} layer the layer to move.
     *
     * @exception {DeveloperError} layer is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     * @returns {undefined}
     */
    raiseToTop(layer: any): void {
        const index = getLayerIndex(this._layers, layer);
        if (index === this._layers.length - 1) {
            return;
        }
        this._layers.splice(index, 1);
        this._layers.push(layer);

        this._update();

        this.layerMoved.raiseEvent(layer, this._layers.length - 1, index);
    }

    /**
     * Updates frame state to execute any queued texture re-projections.
     *
     * @private
     *
     * @param {FrameState} frameState The frameState.
     * @returns {undefined}
     */
    queueReprojectionCommands(frameState: FrameState): void {
        const layers = this._layers;
        for (let i = 0, len = layers.length; i < len; ++i) {
            layers[i].queueReprojectionCommands(frameState);
        }
    }

    _update() {
        let isBaseLayer = true;
        const layers = this._layers;
        let layersShownOrHidden: any;
        let layer: any;
        let i;
        let len: number;
        for (i = 0, len = layers.length; i < len; ++i) {
            layer = layers[i];

            layer._layerIndex = i;

            if (layer.show) {
                layer._isBaseLayer = isBaseLayer;
                isBaseLayer = false;
            } else {
                layer._isBaseLayer = false;
            }

            if (layer.show !== layer._show) {
                if (defined(layer._show)) {
                    if (!defined(layersShownOrHidden)) {
                        layersShownOrHidden = [];
                    }
                    layersShownOrHidden.push(layer);
                }
                layer._show = layer.show;
            }
        }

        if (defined(layersShownOrHidden)) {
            for (i = 0, len = layersShownOrHidden.length; i < len; ++i) {
                layer = layersShownOrHidden[i];
                this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
            }
        }
    }

    /**
     * Cancels re-projection commands queued for the next frame.
     *
     * @private
     * @returns {undefined}
     */
    cancelReprojections(): void {
        const layers = this._layers;
        for (let i = 0, len = layers.length; i < len; ++i) {
            layers[i].cancelReprojections();
        }
    }
}

export { ImageryLayerCollection };
