var webpack = require("webpack");

var entryPoints = [
    './js/chat/chat.jsx',
    './js/chat/ui/conversations.jsx',
];

const path = require('path');

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
    comments: false
};

var webpackConfigs = {
    dev: {
        devServer: {
            port: 8089,
            hot: true,
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
                'webpack-dev-server/client?http://localhost:8089', // WebpackDevServer host and port
                'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
                'react-hot-loader/patch'
            ].concat(entryPoints)
        },
        output: {
            path: __dirname + "/.",
            publicPath: "/",
            filename: "js/chat/bundle.js"
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
            minimize: false
        },
        module: {
            rules: [
                {
                    test: /\.less$/,
                    use: ['style-loader', 'css-loader', 'less-loader']
                },
                {
                    test: /\.(js|jsx)$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        'react-hot-loader/webpack',
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
            filename: "js/chat/bundle.js"
        },
        resolve: {
            extensions: ['.js', '.jsx'],
        },
        module: {
            rules: [
                {
                    test: /\.less$/,
                    use: ['style-loader', 'css-loader', 'less-loader']
                },
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
