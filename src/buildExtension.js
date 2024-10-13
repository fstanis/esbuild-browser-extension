import { ESBuildManager } from './ESBuildManager.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function findFilesInManifest(inputBase, parent) {
  const urls = [];
  if (Array.isArray(parent)) {
    for (const item of parent) {
      urls.push(...findFilesInManifest(inputBase, item));
    }
  } else if (typeof parent === 'object') {
    for (const val of Object.values(parent)) {
      urls.push(...findFilesInManifest(inputBase, val));
    }
  } else if (typeof parent === 'string') {
    const filename = path.join(inputBase, parent);
    if (existsSync(filename)) {
      urls.push(filename);
    }
  }
  return urls;
}

function replaceInManifest(parent, mapper) {
  if (Array.isArray(parent)) {
    return parent.map((item) => replaceInManifest(item, mapper));
  } else if (typeof parent === 'object') {
    const result = {};
    for (const val of Object.keys(parent)) {
      result[val] = replaceInManifest(parent[val], mapper);
    }
    return result;
  }
  return mapper(parent);
}

export async function buildExtension({
  inputBase,
  outputPath,
  esbuildOptions,
}) {
  const manager = new ESBuildManager({ inputBase, outputPath });
  const manifest = JSON.parse(
    await fs.readFile(`${inputBase}/manifest.json`, 'utf8')
  );
  for (const file of findFilesInManifest(inputBase, manifest)) {
    if (path.extname(file) === '.html') {
      manager.addHtmlFile(file);
    } else if (path.extname(file) === '.js') {
      manager.addJsFile(file);
    } else {
      manager.addAssetFile(file);
    }
  }
  const files = await manager.build(esbuildOptions);
  const newManifest = replaceInManifest(manifest, (val) => {
    if (typeof val !== 'string') {
      return val;
    }
    const filename = path.join(inputBase, val);
    if (files[filename]) {
      return path.relative(outputPath, files[filename]);
    }
    return val;
  });
  await fs.writeFile(
    `${outputPath}/manifest.json`,
    JSON.stringify(newManifest, null, 2)
  );
}
