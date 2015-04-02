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
            filename: "bundle.js"
        },
        devtool: "source-map",
        module: {
            loaders: [
                {test: /\.less$/, loader: "style!css!less"},
                //{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
                //{ test: /\.jsx$/, loaders: ['react-hot', 'jsx?harmony&stripTypes&insertPragma=React.DOM'], exclude: 'node_modules'},
                {test: /\.jsx$/, loaders: ['react-hot', 'babel-loader?experimental=true&optional=runtime'], exclude: 'node_modules'},
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
            filename: "bundle.js"
        },
        module: {
            loaders: [
                {test: /\.less$/, loader: "style!css!less"},
                {test: /\.jsx$/, loaders: [/*'uglify-loader', */'babel-loader?experimental=true&optional=runtime'], exclude: 'node_modules'},
                {test: /\.json$/, loader: "json"}
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                "process.env": {
                    NODE_ENV: JSON.stringify("production"),
                    BROWSER: JSON.stringify(true)
                }
            }),
            //new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor-[chunkhash].js', Infinity)
            //new webpack.optimize.DedupePlugin(),
            //new webpack.optimize.OccurenceOrderPlugin(true),
            //new webpack.optimize.AggressiveMergingPlugin(),
            //new webpack.optimize.UglifyJsPlugin({
            //    output: {
            //        comments: true,
            //        beautify: true
            //    },
            //    compress: false,
            //    mangle: false
            //})
        ]
    }
};

module.exports = webpackConfigs[process.env.NODE_ENV == "production" ? "dist" : "dev"];
