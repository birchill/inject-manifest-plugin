import { additionalManifestEntriesTransform } from './additional-manifest-entries-transform.js';
import { maximumSizeTransform } from './maximum-size-transform.js';
import { modifyURLPrefixTransform } from './modify-url-prefix-transform.js';
import { noRevisionForURLsMatchingTransform } from './no-revision-for-urls-matching-transform.js';

type ManifestTransformResultWithWarnings = {
  count: number;
  size: number;
  manifestEntries: ManifestEntry[];
  warnings: string[];
};

export type ManifestEntry = {
  integrity?: string;
  revision: string | null;
  url: string;
};

export type FileDetails = {
  file: string;
  hash: string | null;
  size: number;
};

export type ManifestTransform = (
  manifestEntries: Array<ManifestEntry & { size: number }>,
  compilation?: unknown
) => Promise<ManifestTransformResult> | ManifestTransformResult;

type ManifestTransformResult = {
  manifest: Array<ManifestEntry & { size: number }>;
  warnings?: Array<string>;
};

export async function transformManifest({
  additionalManifestEntries,
  dontCacheBustURLsMatching,
  fileDetails,
  manifestTransforms,
  maximumFileSizeToCacheInBytes,
  modifyURLPrefix,
  transformParam,
}: {
  additionalManifestEntries?: Array<string | ManifestEntry>;
  dontCacheBustURLsMatching?: RegExp;
  fileDetails: Array<FileDetails>;
  manifestTransforms?: Array<ManifestTransform>;
  maximumFileSizeToCacheInBytes?: number;
  modifyURLPrefix?: Record<string, string>;
  transformParam?: unknown;
}): Promise<ManifestTransformResultWithWarnings> {
  const allWarnings: Array<string> = [];

  // Take the array of fileDetail objects and convert it into an array of
  // {url, revision, size} objects, with \ replaced with /.
  const normalizedManifest = fileDetails.map((fileDetails) => {
    return {
      url: fileDetails.file.replace(/\\/g, '/'),
      revision: fileDetails.hash,
      size: fileDetails.size,
    };
  });

  const transformsToApply: Array<ManifestTransform> = [];

  if (maximumFileSizeToCacheInBytes) {
    transformsToApply.push(maximumSizeTransform(maximumFileSizeToCacheInBytes));
  }

  if (modifyURLPrefix) {
    transformsToApply.push(modifyURLPrefixTransform(modifyURLPrefix));
  }

  if (dontCacheBustURLsMatching) {
    transformsToApply.push(
      noRevisionForURLsMatchingTransform(dontCacheBustURLsMatching)
    );
  }

  // Run any manifestTransforms functions second-to-last.
  if (manifestTransforms) {
    transformsToApply.push(...manifestTransforms);
  }

  // Run additionalManifestEntriesTransform last.
  if (additionalManifestEntries) {
    transformsToApply.push(
      additionalManifestEntriesTransform(additionalManifestEntries)
    );
  }

  let transformedManifest: Array<ManifestEntry & { size: number }> =
    normalizedManifest;
  for (const transform of transformsToApply) {
    const result = await transform(transformedManifest, transformParam);

    transformedManifest = result.manifest;
    allWarnings.push(...(result.warnings || []));
  }

  // Generate some metadata about the manifest before we clear out the size
  // properties from each entry.
  const count = transformedManifest.length;
  let size = 0;
  for (const manifestEntry of transformedManifest as Array<
    ManifestEntry & { size?: number }
  >) {
    size += manifestEntry.size || 0;
    delete manifestEntry.size;
  }

  return {
    count,
    size,
    manifestEntries: transformedManifest as Array<ManifestEntry>,
    warnings: allWarnings,
  };
}
