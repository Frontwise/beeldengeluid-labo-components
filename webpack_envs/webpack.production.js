const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BUILD_DIR = path.resolve(__dirname, '../dist');
const APP_DIR = path.resolve(__dirname, '../app');

module.exports = {
    entry: ["babel-polyfill", APP_DIR + '/index.jsx'],
    output: {
        path: BUILD_DIR,
        filename: 'labo-components.js',
        libraryTarget: 'umd',
        library: 'labo'
    },
    optimization: {
        minimizer: [
            new UglifyJSPlugin({
                uglifyOptions: {
                    mangle: {
                        keep_classnames: true,
                        keep_fnames: true,
                        toplevel: true
                    },
                    compress: {
                        comparisons: true,
                        dead_code: true,
                        warnings: false,
                        drop_console: true,
                        ecma: 6,
                        keep_fargs: false,
                        passes: 1,
                        unsafe_math: true,
                        unsafe_Function: true,
                        unsafe_undefined: true
                    }
                },
                parallel: true,
                cache: true,
                sourceMap: true
            }),
        ]
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
                loader: 'url-loader'
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader"
                    },
                    "sass-loader"
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "labo-component.css",
            chunkFilename: "labo-component.css"
        })
    ]
};