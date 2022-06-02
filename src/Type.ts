import GeographicTilingScheme from './Core/GeographicTilingScheme';
import WebMercatorTilingScheme from './Core/WebMercatorTilingScheme';

export type typeIntArray = Uint8Array | Uint16Array | Uint32Array;

export type TypeFloatArray = Float32Array | Float64Array;

export type TilingScheme = GeographicTilingScheme | WebMercatorTilingScheme;
