import Cartesian3 from '@/Core/Cartesian3';
import CesiumMath from '@/Core/CesiumMath';
import { FogExp2 } from 'three';
import FrameState from './FrameState';

// These values were found by sampling the density at certain views and finding at what point culled tiles impacted the view at the horizon.
const heightsTable = [359.393, 800.749, 1275.6501, 2151.1192, 3141.7763, 4777.5198, 6281.2493, 12364.307, 15900.765, 49889.0549, 78026.8259, 99260.7344, 120036.3873, 151011.0158, 156091.1953, 203849.3112, 274866.9803, 319916.3149, 493552.0528, 628733.5874];
const densityTable = [2.0e-5, 2.0e-4, 1.0e-4, 7.0e-5, 5.0e-5, 4.0e-5, 3.0e-5, 1.9e-5, 1.0e-5, 8.5e-6, 6.2e-6, 5.8e-6, 5.3e-6, 5.2e-6, 5.1e-6, 4.2e-6, 4.0e-6, 3.4e-6, 2.6e-6, 2.2e-6];

// Scale densities by 1e6 to bring lowest value to ~1. Prevents divide by zero.
for (let i = 0; i < densityTable.length; ++i) {
    densityTable[i] *= 1.0e6;
}
// Change range to [0, 1].
const tableStartDensity = densityTable[1];
const tableEndDensity = densityTable[densityTable.length - 1];
for (let j = 0; j < densityTable.length; ++j) {
    densityTable[j] = (densityTable[j] - tableEndDensity) / (tableStartDensity - tableEndDensity);
}

let tableLastIndex = 0;

function findInterval(height: number) {
    const heights = heightsTable;
    const length = heights.length;

    if (height < heights[0]) {
        tableLastIndex = 0;
        return tableLastIndex;
    } else if (height > heights[length - 1]) {
        tableLastIndex = length - 2;
        return tableLastIndex;
    }

    // Take advantage of temporal coherence by checking current, next and previous intervals
    // for containment of time.
    if (height >= heights[tableLastIndex]) {
        if (tableLastIndex + 1 < length && height < heights[tableLastIndex + 1]) {
            return tableLastIndex;
        } else if (tableLastIndex + 2 < length && height < heights[tableLastIndex + 2]) {
            ++tableLastIndex;
            return tableLastIndex;
        }
    } else if (tableLastIndex - 1 >= 0 && height >= heights[tableLastIndex - 1]) {
        --tableLastIndex;
        return tableLastIndex;
    }

    // The above failed so do a linear search.
    let i;
    for (i = 0; i < length - 2; ++i) {
        if (height >= heights[i] && height < heights[i + 1]) {
            break;
        }
    }

    tableLastIndex = i;
    return tableLastIndex;
}

const scratchPositionNormal = new Cartesian3();

export default class MapFogExp2 extends FogExp2 {
    enabled = true;

    /**
     * A scalar that determines the density of the fog. Terrain that is in full fog are culled.
     * The density of the fog increases as this number approaches 1.0 and becomes less dense as it approaches zero.
     * The more dense the fog is, the more aggressively the terrain is culled. For example, if the camera is a height of
     * 1000.0m above the ellipsoid, increasing the value to 3.0e-3 will cause many tiles close to the viewer be culled.
     * Decreasing the value will push the fog further from the viewer, but decrease performance as more of the terrain is rendered.
     * @type {Number}
     * @default 2.0e-4
     */
    density = 2.0e-4;
    /**
     * A factor used to increase the screen space error of terrain tiles when they are partially in fog. The effect is to reduce
     * the number of terrain tiles requested for rendering. If set to zero, the feature will be disabled. If the value is increased
     * for mountainous regions, less tiles will need to be requested, but the terrain meshes near the horizon may be a noticeably
     * lower resolution. If the value is increased in a relatively flat area, there will be little noticeable change on the horizon.
     * @type {Number}
     * @default 2.0
     */
    screenSpaceErrorFactor = 2.0;
    /**
     * The minimum brightness of the fog color from lighting. A value of 0.0 can cause the fog to be completely black. A value of 1.0 will not affect
     * the brightness at all.
     * @type {Number}
     * @default 0.03
     */
    minimumBrightness = 0.03;
    constructor(hex: number | string, density?: number) {
        super(hex, density);
    }

    update(frameState: FrameState): void {
        const enabled = frameState.fog.enabled === this.enabled;

        if (!enabled) {
            frameState.scene.fog = null;
            return;
        }

        frameState.scene.fog = this;

        const camera = frameState.camera;
        const positionCartographic = camera.positionCartographic;

        const height = positionCartographic.height;
        const i = findInterval(height);
        const t = CesiumMath.clamp((height - heightsTable[i]) / (heightsTable[i + 1] - heightsTable[i]), 0.0, 1.0);
        let density = CesiumMath.lerp(densityTable[i], densityTable[i + 1], t);

        // Again, scale value to be in the range of densityTable (prevents divide by zero) and change to new range.
        const startDensity = this.density * 1.0e6;
        const endDensity = (startDensity / tableStartDensity) * tableEndDensity;
        density = density * (startDensity - endDensity) * 1.0e-6;

        // Fade fog in as the camera tilts toward the horizon.
        const positionNormal = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
        const dot = Math.abs(Cartesian3.dot(camera.directionWC, positionNormal));
        density *= 1.0 - dot;

        frameState.fog.density = density;
        frameState.fog.sse = this.screenSpaceErrorFactor;
        frameState.fog.minimumBrightness = this.minimumBrightness;
    }
}
