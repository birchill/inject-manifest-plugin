import prettyBytes from 'pretty-bytes';

import type { ManifestTransform } from './transform-manifest.js';

export function maximumSizeTransform(
  maximumFileSizeToCacheInBytes: number
): ManifestTransform {
  return (originalManifest) => {
    const warnings: Array<string> = [];
    const manifest = originalManifest.filter((entry) => {
      if (entry.size <= maximumFileSizeToCacheInBytes) {
        return true;
      }

      warnings.push(
        `${entry.url} is ${prettyBytes(entry.size)}, and won't ` +
          `be precached. Configure maximumFileSizeToCacheInBytes to change ` +
          `this limit.`
      );
      return false;
    });

    return { manifest, warnings };
  };
}
