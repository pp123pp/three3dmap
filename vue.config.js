module.exports = {
    devServer: {
        // hot: false,
        // liveReload: false,
    },
    chainWebpack: (config) => {
        config.module
            .rule('raw')
            .test(/\.glsl$/)
            .use('raw-loader')
            .loader('raw-loader')
            .end();
    },
    pluginOptions: {
        'raw-loader': {
            preProcessor: 'glsl', // 声明类型
            patterns: [],
            // injector: 'append'
        },
    },
};
