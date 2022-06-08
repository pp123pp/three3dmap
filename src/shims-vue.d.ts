/* eslint-disable @typescript-eslint/ban-types */

declare module '*.vue' {
    import Vue from 'vue';
    export default Vue;
}

declare module '*.glsl' {
    const component: DefineComponent<{}, {}, any>;
    export default component;
}
