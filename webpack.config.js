const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BUILD_DIR = path.resolve(__dirname, './dist');
const APP_DIR =  path.resolve(__dirname, './app');

module.exports = {
    entry: ["babel-polyfill", APP_DIR + '/index.jsx'],
    output: {
        path: BUILD_DIR,
        filename: 'labo-components.js',
        libraryTarget: 'umd',
        library: 'labo'
    },
    watch: true,
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
                        loader: "css-loader",
                        options: {
                            modules: true,
                            sourceMap: true,
                            importLoader: 2
                        }
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