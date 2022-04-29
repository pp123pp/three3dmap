import { Object3DCollection } from '@/Core/Object3DCollection';
import { FrameState } from '@/Scene/FrameState';
import { Frustum } from 'three';

class RenderCollection extends Object3DCollection {
    frustum?: Frustum = undefined;
    // 用于做裁剪的视锥体
    // constructor () {
    //     super();
    // }

    addPickCommands(commandList: any): void {
        for (let i = 0, len = commandList.length; i < len; i++) {
            const command = commandList[i];
            // if (command.allowPicking && this.frustum.intersectsSphere(command.boundingSphere)) {
            // // this.addObject(command);
            // }
            if (command.allowPicking) {
                this.addObject(command);
            }
        }
    }
}

export { RenderCollection };
