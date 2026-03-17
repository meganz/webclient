var webpack = require("webpack");

var entryPoints = [
    './js/chat/megaChunkLoader.jsx',
    './js/chat/chat.jsx'
];

var BABEL_LOADER_OPTIONS = {
    plugins: [
        '@babel/plugin-transform-runtime',
        'babel-plugin-minify-constant-folding',
        'babel-plugin-minify-guarded-expressions',
        ['babel-plugin-minify-dead-code-elimination', {
            'keepFnName': true,
            'keepClassName': true
        }]
    ],
    presets: [
        ['@babel/preset-env',  {
            "debug": true,
            "loose": true,
            "exclude": [
                "@babel/plugin-transform-parameters",
                "@babel/plugin-transform-typeof-symbol",
                "@babel/plugin-transform-template-literals"
            ]
        }],
        '@babel/preset-react'
    ],
    shouldPrintComment: (comment) => /webpackChunkName/.test(comment)
};

var webpackConfigs = {
    dev: {
        devServer: {
            port: 8089,
            // Disable HMR, as to this ensure consistent behavior with the rest of the `webclient`; we don't want
            // dynamically fetched and injected modules that are unverified at runtime, incl. during development.
            hot: false,
            static: __dirname,
            liveReload: false,
            historyApiFallback: true
        },
        cache: {
            type: 'memory'
        },
        mode: 'development',
        entry: {
            app: [
                'webpack-dev-server/client?http://localhost:8089' // WebpackDevServer host and port
            ].concat(entryPoints)
        },
        output: {
            path: __dirname + "/.",
            publicPath: "/",
            filename: "js/chat/bundle.js",
            chunkFilename: "js/chat/bundle.[name].js",
        },
        resolve: {
            extensions: ['.js', '.jsx'],
        },
        devtool: "source-map",
        externals: {
            "jquery": "jQuery",
            "react": "React",
            "react-dom": "ReactDOM",
        },
        optimization: {
            // We no not want to minimize our code.
            minimize: false,
            // Disable automatic chunk splitting to prevent any auto-generated chunks that may bypass `secureboot`; we
            // want deterministically generated chunks (e.g. via `webpackChunkName`) to ensure 1:1 mapping
            // with `secureboot`
            splitChunks: false
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: BABEL_LOADER_OPTIONS
                        }
                    ]
                },
                {test: /\.json$/, loader: "json"}
            ]
        },
        plugins: [
            new webpack.BannerPlugin({
                raw: true,
                banner: "/** @file automatically generated, do not edit it. */"
            })
        ],
    },
    dist: {
        mode: 'production',
        entry: {
            app: entryPoints
        },
        performance: {
            maxAssetSize: 1666999,
            maxEntrypointSize: 1666999
        },
        output: {
            path: __dirname + "/",
            publicPath: "/",
            filename: "js/chat/bundle.js",
            chunkFilename: "js/chat/bundle.[name].js",
        },
        resolve: {
            extensions: ['.js', '.jsx'],
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: BABEL_LOADER_OPTIONS
                        }
                    ]
                },
                {test: /\.json$/, loader: "json"}
            ]
        },
        optimization: {
            // We no not want to minimize our code.
            minimize: false,
            sideEffects: true,
            usedExports: true,
            // Disable automatic chunk splitting to prevent any auto-generated chunks that may bypass `secureboot`; we
            // want deterministically generated chunks (e.g. via `webpackChunkName`) to ensure 1:1 mapping
            // with `secureboot`
            splitChunks: false
        },
        externals: {
            "jquery": "jQuery",
            "react": "React",
            "react-dom": "ReactDOM",
        },
        plugins: [
            new webpack.BannerPlugin({
                "banner": "/** @file automatically generated, do not edit it. */",
                "raw": true
            }),
            new webpack.DefinePlugin({
                "process.env": {
                    NODE_ENV: JSON.stringify("production"),
                    BROWSER: JSON.stringify(true)
                }
            })
        ]
    }
};

module.exports = webpackConfigs[process.env.NODE_ENV == "production" ? "dist" : "dev"];
