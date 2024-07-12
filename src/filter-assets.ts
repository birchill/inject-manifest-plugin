import { type Asset, type Chunk, type Compilation } from '@rspack/core';
import rspack from '@rspack/core';
import type { ResolvedOptions, Condition } from './options.js';
import { PLUGIN_NAME } from './plugin-name.js';

export function filterAssets(
  compilation: Compilation,
  options: ResolvedOptions
): Set<Asset> {
  const filteredAssets = new Set<Asset>();
  const assets = compilation.getAssets();

  const allowedAssetNames = new Set<string>();
  if (Array.isArray(options.chunks)) {
    for (const name of options.chunks) {
      const assetsInChunkOrGroup = getNamesOfAssetsInChunkOrGroup(
        compilation,
        name
      );
      if (assetsInChunkOrGroup) {
        for (const assetName of assetsInChunkOrGroup) {
          allowedAssetNames.add(assetName);
        }
      } else {
        compilation.warnings.push(
          new Error(
            `The chunk '${name}' was ` +
              `provided in your ${PLUGIN_NAME} config, but was not found in the ` +
              `compilation.`
          )
        );
      }
    }
  }

  const deniedAssetNames = new Set();
  if (Array.isArray(options.excludeChunks)) {
    for (const name of options.excludeChunks) {
      const assetsInChunkOrGroup = getNamesOfAssetsInChunkOrGroup(
        compilation,
        name
      );
      if (assetsInChunkOrGroup) {
        for (const assetName of assetsInChunkOrGroup) {
          deniedAssetNames.add(assetName);
        }
      } // Don't warn if the chunk group isn't found.
    }
  }

  for (const asset of assets) {
    // chunk based filtering is funky because:
    // - Each asset might belong to one or more chunks.
    // - If *any* of those chunk names match our config.excludeChunks,
    //   then we skip that asset.
    // - If the config.chunks is defined *and* there's no match
    //   between at least one of the chunkNames and one entry, then
    //   we skip that assets as well.

    if (deniedAssetNames.has(asset.name)) {
      continue;
    }

    if (Array.isArray(options.chunks) && !allowedAssetNames.has(asset.name)) {
      continue;
    }

    // Next, check asset-level checks via includes/excludes:
    const isExcluded = checkConditions(asset, compilation, options.exclude);
    if (isExcluded) {
      continue;
    }

    // Treat an empty config.includes as an implicit inclusion.
    const isIncluded =
      !Array.isArray(options.include) ||
      checkConditions(asset, compilation, options.include);
    if (!isIncluded) {
      continue;
    }

    // If we've gotten this far, then add the asset.
    filteredAssets.add(asset);
  }

  return filteredAssets;
}

function getNamesOfAssetsInChunkOrGroup(
  compilation: Compilation,
  chunkOrGroup: string
): Array<string> | null {
  const chunk =
    compilation.namedChunks && compilation.namedChunks.get(chunkOrGroup);
  return chunk ? getNamesOfAssetsInChunk(chunk) : null;
}

function getNamesOfAssetsInChunk(chunk: Readonly<Chunk>): Array<string> {
  const assetNames: Array<string> = [];

  assetNames.push(...chunk.files);

  // This only appears to be set in webpack v5.
  if (chunk.auxiliaryFiles) {
    assetNames.push(...chunk.auxiliaryFiles);
  }

  return assetNames;
}

function checkConditions(
  asset: Asset,
  compilation: Compilation,
  conditions: Array<Condition> = []
): boolean {
  for (const condition of conditions) {
    if (typeof condition === 'function') {
      return condition({ asset, compilation });
    } else {
      if (rspack.ModuleFilenameHelpers.matchPart(asset.name, condition)) {
        return true;
      }
    }
  }

  // We'll only get here if none of the conditions applied.
  return false;
}
