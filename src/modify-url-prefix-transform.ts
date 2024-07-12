// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2018 Google LLC

import { escapeRegExp } from './escape-regexp.js';
import { PLUGIN_NAME } from './plugin-name.js';
import { ManifestTransform } from './transform-manifest.js';

export function modifyURLPrefixTransform(
  modifyURLPrefix: Record<string, string>
): ManifestTransform {
  if (
    !modifyURLPrefix ||
    typeof modifyURLPrefix !== 'object' ||
    Array.isArray(modifyURLPrefix)
  ) {
    throw new Error(
      "The 'modifyURLPrefix' parameter must be an object with string key value pairs."
    );
  }

  // If there are no entries in modifyURLPrefix, just return an identity
  // function as a shortcut.
  if (!Object.keys(modifyURLPrefix).length) {
    return (manifest) => ({ manifest });
  }

  for (const key of Object.keys(modifyURLPrefix)) {
    if (typeof modifyURLPrefix[key] !== 'string') {
      throw new Error(
        "The 'modifyURLPrefix' parameter must be an object with string key value pairs."
      );
    }
  }

  // Escape the user input so it's safe to use in a regex.
  const safeModifyURLPrefixes = Object.keys(modifyURLPrefix).map(escapeRegExp);
  // Join all the `modifyURLPrefix` keys so a single regex can be used.
  const prefixMatchesStrings = safeModifyURLPrefixes.join('|');
  // Add `^` to the front the prefix matches so it only matches the start of
  // a string.
  const modifyRegex = new RegExp(`^(${prefixMatchesStrings})`);

  return (originalManifest) => {
    const manifest = originalManifest.map((entry) => {
      if (typeof entry.url !== 'string') {
        throw new Error(
          `The generated manifest contains an entry without a URL string. This is likely an error in ${PLUGIN_NAME}.`
        );
      }

      entry.url = entry.url.replace(
        modifyRegex,
        (match) => modifyURLPrefix[match] || match
      );

      return entry;
    });

    return { manifest };
  };
}
