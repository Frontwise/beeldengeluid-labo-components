const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BUILD_DIR = path.resolve(__dirname, '../dist');
const APP_DIR = path.resolve(__dirname, '../app');

module.exports = {
    watch: true,
    entry: ["babel-polyfill", APP_DIR + '/index.jsx'],
    output: {
        path: BUILD_DIR,
        filename: 'labo-components.js',
        libraryTarget: 'umd',
        library: 'labo'
    },
    devtool: 'source-map',
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