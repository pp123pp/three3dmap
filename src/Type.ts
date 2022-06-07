import CesiumMatrix4 from './Core/CesiumMatrix4';
import GeographicTilingScheme from './Core/GeographicTilingScheme';
import HeadingPitchRange from './Core/HeadingPitchRange';
import WebMercatorTilingScheme from './Core/WebMercatorTilingScheme';

export type typeIntArray = Uint8Array | Uint16Array | Uint32Array;

export type TypeFloatArray = Float32Array | Float64Array;

export type TilingScheme = GeographicTilingScheme | WebMercatorTilingScheme;

export interface IFlyToBoundingSphere {
    duration?: number;
    offset?: HeadingPitchRange;
    complete?: () => void;
    cancel?: () => void;
    endTransform?: CesiumMatrix4;
    maximumHeight?: number;
    pitchAdjustHeight?: number;
    flyOverLongitude?: number;
    flyOverLongitudeWeight?: number;
    easingFunction?: any;
}
