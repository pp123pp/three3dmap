import { PerspectiveCamera } from 'three';
import { IMapCamera } from './MapCamera';

export default class PerspectiveFrustumCamera extends PerspectiveCamera {
    containerWidth = 0;
    containerHeight = 0;
    _sseDenominator = 0.0;
    constructor(options: IMapCamera) {
        super(options.fov, options.aspect, options.near, options.far);
    }

    setSize(container: Element): void {
        const { clientWidth, clientHeight } = container;

        this.aspect = clientWidth / clientHeight;

        if (this.aspect > 1) {
            this.fov = (Math.atan(Math.tan((60 * Math.PI) / 360) / this.aspect) * 360) / Math.PI;
        } else {
            // this.fov = 2 * Math.atan(Math.tan(CesiumMath.toRadians(60) / 2) * this.aspect) * 180 / Math.PI;
            this.fov = 60;
        }

        this.updateProjectionMatrix();

        this.containerWidth = clientWidth;
        this.containerHeight = clientHeight;
    }

    // get sseDenominator(): number {
    //     updateMembers(this);
    //     return this._sseDenominator;
    //     // this.updateProjectionMatrix();
    //     // return 2.0 * Math.tan(0.5 * this.fov * THREE.MathUtils.DEG2RAD) / this._scene.drawingBufferSize.height;
    // }
}
