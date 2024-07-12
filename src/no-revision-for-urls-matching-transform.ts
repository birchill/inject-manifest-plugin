import { PLUGIN_NAME } from './plugin-name.js';
import type { ManifestTransform } from './transform-manifest.js';

export function noRevisionForURLsMatchingTransform(
  regexp: RegExp
): ManifestTransform {
  return (originalManifest) => {
    const manifest = originalManifest.map((entry) => {
      if (typeof entry.url !== 'string') {
        throw new Error(
          `The generated manifest contains an entry without a URL string. This is likely an error in ${PLUGIN_NAME}.`
        );
      }

      if (entry.url.match(regexp)) {
        entry.revision = null;
      }

      return entry;
    });

    return { manifest };
  };
}
