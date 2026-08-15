// metro.config.js
// Firebase JS SDK(@firebase/logger等)のpackage.json "exports"フィールドの記述と
// MetroのPackage Exports解決が競合してバンドルに失敗するため、無効化する。
// 参考: https://github.com/firebase/firebase-js-sdk/issues/8760

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
