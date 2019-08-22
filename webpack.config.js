var webpack = require("webpack");

var entryPoints = [
    './js/chat/chat.jsx',
    './js/chat/ui/conversations.jsx',
];

const path = require('path');


var webpackConfigs = {
    dev: {
        cache: false,
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
                {test: /\.less$/, loader: "style!css!less"},
                //{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
                //{ test: /\.jsx$/, loaders: ['react-hot', 'jsx?harmony&stripTypes&insertPragma=React.DOM'], exclude: 'node_modules'},
                //{test: /\.jsx$/, loaders: ['react-hot', 'babel-loader?experimental=true&optional=runtime'], exclude: 'node_modules'},
                {
                    test: /\.(js|jsx)$/,
                    exclude: /(node_modules|bower_components)/,
                    // include: [
                    //     path.join(__dirname, '../js'), // + any other paths that need to be transpiled
                    //     /\/node_modules\/react/,
                    // ],
                    use: [
                        'react-hot-loader/webpack',
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-react', '@babel/preset-env'],
                                // plugins: ['react-hot-loader/babel'],
                            }
                        }
                    ]
                },
                {test: /\.json$/, loader: "json"}
            ]
        },
        plugins: [
            new webpack.BannerPlugin({
                raw: true,
                banner: "React.makeElement = React['createElement'];"
            })
        ]
    },
    dist: {
        entry: {
            app: entryPoints
        },
        output: {
            path: __dirname + "/",
            publicPath: "/",
            filename: "js/chat/bundle.js"
        },
        module: {
            rules: [
                {test: /\.less$/, loader: "style!css!less"},
                // {test: /\.jsx$/, loaders: ['babel-loader', 'stripcomment-loader'], exclude: 'node_modules'},
                {
                    test: /\.(js|jsx)$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        // 'react-hot-loader/webpack',
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-react', '@babel/preset-env'],
                                // plugins: ['react-hot-loader/babel'],
                            }
                        }
                    ]
                },
                {test: /\.json$/, loader: "json"}
            ]
        },
        optimization: {
            // We no not want to minimize our code.
            minimize: false
        },
        externals: {
            "jquery": "jQuery",
            "react": "React",
            "react-dom": "ReactDOM",
        },
        plugins: [
            new webpack.BannerPlugin({
                "banner": "React.makeElement = React['createElement'];",
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
