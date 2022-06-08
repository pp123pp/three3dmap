import GUI from 'lil-gui';

import { AxesHelper, Mesh, MeshNormalMaterial, ShaderLib, SphereBufferGeometry } from 'three';
import BoundingSphere from './Core/BoundingSphere';
import Cartesian2 from './Core/Cartesian2';
import Cartesian3 from './Core/Cartesian3';
import CesiumMatrix4 from './Core/CesiumMatrix4';
import CesiumTerrainProvider from './Core/CesiumTerrainProvider';
import defaultValue from './Core/defaultValue';
import IonResource from './Core/IonResource';
import { SceneMode } from './Core/SceneMode';
import DrawMeshCommand from './Renderer/DrawMeshCommand';
import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import WebMapTileServiceImageryProvider from './Scene/WebMapTileServiceImageryProvider';
import './Widgets/CesiumWidget.css';
import Viewer from './Widgets/Viewer/Viewer';

const gui = new GUI();

const widget = new Viewer('app', {
    // terrainProvider: new CesiumTerrainProvider({
    //     url: IonResource.fromAssetId(1),
    //     requestVertexNormals: false,
    //     requestWaterMask: false,
    // }),
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

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
scene.globe.visible = false;

// scene.sky.visible = false;

//创建影像服务对象
scene.imageryLayers.addImageryProvider(
    new WebMapTileServiceImageryProvider({
        //调用影响中文注记服务
        url: 'http://{s}.tianditu.gov.cn/cva_w/wmts?service=wmts&request=GetTile&version=1.0.0' + '&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}' + '&style=default.jpg&tk=' + mapToken,
        layer: 'cia_w',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'GoogleMapsCompatible',
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'], //天地图8个服务器
        minimumLevel: 0,
        maximumLevel: 18,
    })
);

const axesHelper = new AxesHelper(500000000);
scene.addObject(axesHelper);

const cameraCV = {
    // position: new Cartesian3(-9183857.990445074, 3914472.0508939545, 25972529.261725195),
    // direction: new Cartesian3(3.72216724667275e-14, -0.0003113250666032521, -0.9999999515383503),
    // up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),

    position: new Cartesian3(10, 10, 10),
    direction: new Cartesian3(1, 1, 1),
    // up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),
};

const params = {
    setView: true,
    moveUp: true,
    moveRight: false,
    azimuth: 90,
    cloud_covr: 0.3,
    hour: 12,
};

const bsp = new BoundingSphere(new Cartesian3(0, 0, 0), 10);
camera.flyToBoundingSphere(bsp);
gui.add(params, 'setView').onChange(() => {
    camera.flyToBoundingSphere(bsp);
});

gui.add(params, 'moveUp').onChange(() => {
    camera.flyTo({
        destination: new Cartesian3(12957714.524789115, 3484578.2582445266, 8731.080157084989),
        orientation: {
            direction: new Cartesian3(0.007893114053294072, 0.4873697273695402, -0.87316003549995469),
            up: new Cartesian3(0.014139261626368416, 0.8730455479956032, 0.48743363897634123),
        },
    });
    console.log(camera);
});

gui.add(params, 'moveRight').onChange((value: boolean) => {
    // camera.position.set(0, 0, 55972529.261725195);
    // console.log(camera);

    scene.sky.visible = value;
});

gui.add(params, 'azimuth', 0, 360).onChange((value: number) => {
    scene.sky.setting.azimuth = value;
    scene.sky.update();
});

gui.add(params, 'cloud_covr', 0, 1).onChange((value: number) => {
    scene.sky.setting.cloud_covr = value;
    scene.sky.update();
});

gui.add(params, 'hour', 0, 24, 0.1).onChange((value: number) => {
    // scene.sky.setData({
    //     azimuth: 90,
    //     cloud_covr: 0.3,
    //     cloud_dens: 40,
    //     cloud_size: 0.45,
    //     fog: 0,
    //     hour: 12.1,
    //     inclination: 91.95000000000002,
    //     t: 0,
    // });
    scene.sky.setting.hour = value;
    scene.sky.update();
});

console.log(ShaderLib.basic);

const geometry = new SphereBufferGeometry(5, 32, 32);
const mat = new MeshNormalMaterial({ wireframe: true });
const mesh = new DrawMeshCommand(geometry, mat);
mesh.rotateX(Math.PI / 2);
scene.meshCollection.addObject(mesh);
