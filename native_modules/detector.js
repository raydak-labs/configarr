import { extname } from 'node:path';

const markerModules = ['bindings', 'nan', 'node-gyp', 'node-gyp-build', 'node-pre-gyp', 'prebuild']

export const isNativeModule = ({ binary, dependencies = {}, devDependencies = {}, files = [], gypfile }) => {
  if (binary || gypfile) {
    return true
  }

  const hasMarkerModule = markerModules.some((marker) => dependencies[marker] || devDependencies[marker])

  if (hasMarkerModule) {
    return true
  }

  const hasBinaryFile = files.some((path) => !path.startsWith('!') && extname(path) === '.node')

  return hasBinaryFile
}
