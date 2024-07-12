import type { Compilation } from '@rspack/core';

import { filterAssets } from './filter-assets.js';
import { getAssetHash } from './get-asset-hash.js';
import type { Options } from './options.js';
import { resolveRspackUrl } from './resolve-rspack-url.js';
import {
  transformManifest,
  type FileDetails,
  type ManifestEntry,
} from './transform-manifest.js';

export async function getManifestEntriesFromCompilation(
  compilation: Compilation,
  options: Options
): Promise<{ size: number; sortedEntries: ManifestEntry[] }> {
  const filteredAssets = filterAssets(compilation, options);

  const { publicPath } = compilation.options.output;

  const fileDetails = Array.from(filteredAssets).map(
    (asset): FileDetails => ({
      file: resolveRspackUrl(publicPath as string, asset.name),
      hash: asset.info?.immutable ? null : getAssetHash(asset),
      size: asset.source.size() || 0,
    })
  );

  const { manifestEntries, size, warnings } = await transformManifest({
    fileDetails,
    additionalManifestEntries: options.additionalManifestEntries,
    dontCacheBustURLsMatching: options.dontCacheBustURLsMatching,
    manifestTransforms: options.manifestTransforms,
    maximumFileSizeToCacheInBytes: options.maximumFileSizeToCacheInBytes,
    modifyURLPrefix: options.modifyURLPrefix,
    transformParam: compilation,
  });

  for (const warning of warnings) {
    compilation.warnings.push(new Error(warning));
  }

  // Ensure that the entries are properly sorted by URL.
  const sortedEntries = manifestEntries.sort((a, b) =>
    a.url === b.url ? 0 : a.url > b.url ? 1 : -1
  );

  return { size, sortedEntries };
}
