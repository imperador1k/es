module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Reanimated DEVE ser o último plugin
      // Desativar plugin no web para evitar erro CSSStyleDeclaration
      ...(api.caller((caller) => caller && caller.platform === 'web')
        ? []
        : ["react-native-reanimated/plugin"]),
    ],
  };
};