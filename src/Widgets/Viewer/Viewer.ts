import CesiumTerrainProvider from '@/Core/CesiumTerrainProvider';
import defaultValue from '@/Core/defaultValue';
import defined from '@/Core/defined';
import { SceneMode } from '@/Core/SceneMode';
import MapCamera from '@/Scene/MapCamera';
import MapScene, { Type_TerrainProvider } from '@/Scene/MapScene';
import Widgets, { IWidgets } from '../Widgets';

interface IViewer extends IWidgets {
    terrainProvider?: CesiumTerrainProvider;
}

export default class Viewer {
    readonly widget: Widgets;

    readonly scene: MapScene;

    readonly camera: MapCamera;
    constructor(container: Element | string, options: IViewer) {
        options.sceneMode = defaultValue(options.sceneMode, SceneMode.COLUMBUS_VIEW);

        this.widget = new Widgets(container, options);

        this.scene = this.widget.scene;

        this.camera = this.widget.camera;

        if (defined(options.terrainProvider)) {
            this.scene.terrainProvider = options.terrainProvider as Type_TerrainProvider;
        }
    }
}
