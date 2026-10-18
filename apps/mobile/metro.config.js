const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both mobile and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force singleton instance of React and React Native across the entire monorepo
const reactPath = fs.existsSync(path.resolve(projectRoot, 'node_modules/react'))
  ? path.resolve(projectRoot, 'node_modules/react')
  : path.resolve(workspaceRoot, 'node_modules/react');

const reactNativePath = fs.existsSync(path.resolve(projectRoot, 'node_modules/react-native'))
  ? path.resolve(projectRoot, 'node_modules/react-native')
  : path.resolve(workspaceRoot, 'node_modules/react-native');

config.resolver.extraNodeModules = {
  react: reactPath,
  'react-native': reactNativePath,
};

module.exports = config;
