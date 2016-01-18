var webpack = require("webpack");

var entryPoints = [
    './js/chat/chat.jsx',
    './js/chat/ui/conversations.jsx',
];

var webpackConfigs = {
    dev: {
        cache: false,
        entry: {
            app: [
                'webpack-dev-server/client?http://localhost:8089', // WebpackDevServer host and port
                'webpack/hot/only-dev-server',
            ].concat(entryPoints)
        },
        output: {
            path: __dirname + "/.",
            publicPath: "/",
            filename: "js/chat/bundle.js"
        },
        devtool: "source-map",
        module: {
            loaders: [
                {test: /\.less$/, loader: "style!css!less"},
                //{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
                //{ test: /\.jsx$/, loaders: ['react-hot', 'jsx?harmony&stripTypes&insertPragma=React.DOM'], exclude: 'node_modules'},
                //{test: /\.jsx$/, loaders: ['react-hot', 'babel-loader?experimental=true&optional=runtime'], exclude: 'node_modules'},
                {
                    test: /\.jsx$/,
                    loader: 'babel',
                    exclude: 'node_modules'
                },
                {test: /\.json$/, loader: "json"}
            ]
        },
        plugins: [
            //new webpack.HotModuleReplacementPlugin(),
            new webpack.NoErrorsPlugin()
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
            loaders: [
                {test: /\.less$/, loader: "style!css!less"},
                {test: /\.jsx$/, loaders: ['babel-loader', 'stripcomment-loader'], exclude: 'node_modules'},
                {test: /\.json$/, loader: "json"}
            ]
        },
        plugins: [
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
