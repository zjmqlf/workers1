const path = require("path");
const webpack = require("webpack");
/**/const TerserPlugin = require('terser-webpack-plugin');
/**/const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
//  target: ["web"],
/**/target: ["node"],
  entry: path.resolve(__dirname, "gramjs/index.ts"),
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },

      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
//      fs: false,
//      path: require.resolve("path-browserify"),
//      net: false,
//      crypto: false,
//      os: require.resolve("os-browserify/browser"),
//      util: require.resolve("util/"),
//      assert: false,
//      stream: false,
//      events: false,
//      constants: false,
    },
  },
//  mode: process.env.NODE_ENV ?? "development",
/**/mode: "production",
/**/optimization: {
/**/ sideEffects: true, // 启用副作用标记
/**/  usedExports: true, // 启用导出使用分析
/**/  concatenateModules: true, // 启用模块合并，可以减少模块ID的数量，进一步优化代码分割和缓存。
/**/  minimize: true,
/**/  minimizer: [
/**/    new TerserPlugin({
/**/      //parallel: 4,
/**/      //extractComments: false, // 禁止提取注释到单独的文件
/**/      //parallel: true, // 启用并行压缩
/**/      //sourceMap: true, // 生成 Source Map
/**/      terserOptions: {
/**/        format: {
/**/          comments: false, // 设置为false以移除所有注释
/**/        },
/**/        compress: {
/**/          warnings: false,
/**/          drop_console: true, // 移除console语句
/**/          drop_debugger: true, // 移除debugger语句
/**/          pure_funcs: ['console.log'] // 移除console.log等函数定义
/**/        },
/**/      },
/**/    }),
/**/  ],
/**/},
  plugins: [
//    new webpack.ProvidePlugin({
//      Buffer: ["buffer", "Buffer"],
//    }),
//    new webpack.ProvidePlugin({
//      process: "process/browser",
//    }),
//    new UsedExportsPlugin({
//      mangleExports: 'deterministic' // 确保导出名称的确定性修改，便于调试和缓存优化
//    }),
/**/new CleanWebpackPlugin(), // 清理/dist文件夹
  ],
  output: {
    library: "telegram",
    libraryTarget: "umd",
///**/libraryTarget: "commonjs",
    filename: "telegram.js",
    path: path.resolve(__dirname, "browser"),
  },
};
