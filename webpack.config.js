module.exports = function (options, env) {
    return require(`./webpack_envs/webpack.${env.mode}.js`)
};