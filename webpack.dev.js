const webpack = require('webpack')
const path = require('path')


const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var nodeExternals = require('webpack-node-externals');


module.exports = {
  target: 'node',
  
  externals:[nodeExternals({
    modulesFromFile: true,
    whitelist: ["@roshub/api","@roshub/service-model","@dataparty/crypto"]
  })],
  module: {
    rules: [{
      
      include: [path.resolve(__dirname, 'src')],
      loader: 'babel-loader',

      options: {
        sourceType: "script",
        presets: [['@babel/preset-env', {
          'modules': false,
          'targets': {
            node: "4.2.6"
          },
          'useBuiltIns': "entry"
        }]]
      },
      test: /\.js$/
    }]
  },
  resolve: {
    modules: [
      'node_modules',
    ],
    extensions: ['.ts', '.tsx', '.js', '.json'],
    symlinks: true,
  },
  entry: "./src/index.js",

  output: {
    filename: 'roshubd.js',
    path: path.resolve(__dirname, 'dist')
  },

  mode: 'development',
  
  /*optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          priority: -10,
          test: /[\\/]node_modules[\\/]/
        }
      },

      chunks: 'async',
      minChunks: 1,
      minSize: 30000,
      name: true
    }
  }*/
}