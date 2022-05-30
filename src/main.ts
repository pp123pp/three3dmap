import GUI from 'lil-gui';

import { AxesHelper } from 'three';
import Cartesian2 from './Core/Cartesian2';
import Cartesian3 from './Core/Cartesian3';
import CesiumMatrix4 from './Core/CesiumMatrix4';
import { SceneMode } from './Core/SceneMode';
import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import WebMapTileServiceImageryProvider from './Scene/WebMapTileServiceImageryProvider';
import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

const gui = new GUI();

const widget = new Widgets('app', {
    sceneMode: SceneMode.COLUMBUS_VIEW,
});

const { scene, camera } = widget;

const mapToken = '39d358c825ec7e59142958656c0a6864'; // 盈嘉企业开发者秘钥
// '3669131581c051178afabed885766ac2', //天地图广州---容易出错
// '993470e78cc4324e1023721f57b23640',
// '5f5ced578c88ac399b0691415c56a9d7',
// 'a1da75892570d7add77b51f40a1d72c4'

scene.imageryLayers.addImageryProvider(
    new WebMapTileServiceImageryProvider({
        // 影像底图
        url: 'https://{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&tk=' + mapToken,
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
        // url: 'https://{s}.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/{TileMatrix}/{TileCol}/{TileRow}/512/png8?apikey=J0IJdYzKDYS3nHVDDEWETIqK3nAcxqW42vz7xeSq61M',
        // subdomains: ['1', '2', '3', '4'],
        maximumLevel: 17, // 定义最大缩放级别
        layer: 'tdtImgLayer',
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'GoogleMapsCompatible', // 使用谷歌的瓦片切片方式
    })
);

scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
// scene.globe.visible = false;

const axesHelper = new AxesHelper(500000000);
scene.addObject(axesHelper);

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
// const ps = new Cartesian3(63916973.15163071, 3088494.933613418, 9994134.16404095);
// camera.setView({
//     destination: ps,
// });

console.log(CesiumMatrix4.IDENTITY);

const cameraCV = {
    // position: new Cartesian3(-9183857.990445074, 3914472.0508939545, 25972529.261725195),
    // direction: new Cartesian3(3.72216724667275e-14, -0.0003113250666032521, -0.9999999515383503),
    // up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),

    position: new Cartesian3(0, 0, 55972529.261725195),
    direction: new Cartesian3(0, 0, -1),
    up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),
};

// document.getElementById('btn').onclick = () => {
//     // console.log(camera.getPickRay(new Cartesian2(500, 500)));
//     // camera.moveRight(10000000);
// };

const params = {
    setView: true,
    moveUp: true,
    moveRight: true,
    wiriframe: false,
};

gui.add(params, 'setView').onChange(() => {
    camera.setView({
        destination: cameraCV.position,
        orientation: {
            direction: cameraCV.direction,
            up: cameraCV.up,
        },
    });

    console.log(camera);
});

gui.add(params, 'moveUp').onChange(() => {
    // camera.moveUp(100000);

    // camera.position.set(0, 0, 55972529.261725195);
    // console.log(camera);
    // camera.setView({
    //     destination: new Cartesian3(0, 0, 4972529.261725195),
    //     orientation: {
    //         direction: new Cartesian3(0, 0, -1),
    //         up: new Cartesian3(0, 1, 0),
    //     },
    // });

    camera.setView({
        destination: new Cartesian3(12957714.524789115, 3484578.2582445266, 8731.080157084989),
        orientation: {
            direction: new Cartesian3(0.007893114053294072, 0.4873697273695402, -0.87316003549995469),
            up: new Cartesian3(0.014139261626368416, 0.8730455479956032, 0.48743363897634123),
        },
    });
    console.log(camera);
});

gui.add(params, 'moveRight').onChange(() => {
    // camera.position.set(0, 0, 55972529.261725195);
    console.log(camera);
});

gui.add(params, 'wiriframe').onChange((value: boolean) => {
    scene.globe.wiriframe = value;
});

// camera.changed.addEventListener(() => {
//     console.log(camera.position.z);
// });
