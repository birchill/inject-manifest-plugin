// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2018 Google LLC

import type { Compilation, Compiler } from '@rspack/core';
import stringify from 'fast-json-stable-stringify';
import prettyBytes from 'pretty-bytes';
import webpackSources from 'webpack-sources';

import { type ResolvedOptions, type Options, validate } from './options.js';
import { PLUGIN_NAME } from './plugin-name.js';
import { getManifestEntriesFromCompilation } from './get-manifest-entries.js';
import { escapeRegExp } from './escape-regexp.js';
import { replaceAndUpdateSourceMap } from './replace-and-update-sourcemap.js';
import {
  ManifestEntry,
  ManifestTransform,
  ManifestTransformResult,
} from './transform-manifest.js';

export class InjectManifest {
  #options: ResolvedOptions;

  constructor(options: Options) {
    this.#options = validate(options);
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: 1000,
        },
        () => injectManifest(compilation, this.#options)
      );
    });
  }
}

export { Options, ManifestEntry, ManifestTransform, ManifestTransformResult };

async function injectManifest(
  compilation: Compilation,
  inputOptions: ResolvedOptions
) {
  const options = { ...inputOptions };

  // Look up the service worker asset
  const swAsset = compilation.getAsset(options.swDest);
  if (!swAsset) {
    const assets = compilation.getAssets();
    throw new Error(
      `Failed to find the service worker asset: ${options.swDest} (found ${assets.map((asset) => asset.name).join(', ')})`
    );
  }

  // Check the injection point is found in the service worker
  const swAssetString = swAsset.source.source().toString();
  const globalRegexp = new RegExp(escapeRegExp(options.injectionPoint), 'g');
  const injectionResults = swAssetString.match(globalRegexp);
  if (!injectionResults) {
    throw new Error(`Can't find ${options.injectionPoint} in your SW source.`);
  }

  // Make sure it and its source map are excluded from the manifest
  options.exclude = options.exclude ? [...options.exclude] : [];
  options.exclude.push(inputOptions.swDest);
  if (swAsset.info.related?.sourceMap) {
    options.exclude.push(swAsset.info.related.sourceMap);
  }

  // Generate the manifest source
  const { size, sortedEntries } = await getManifestEntriesFromCompilation(
    compilation,
    options
  );
  const manifestString = stringify(sortedEntries);

  // Inject the manifest at the injectionPoint
  const sourceMapAssetName = swAsset.info.related?.sourceMap;
  if (sourceMapAssetName) {
    const sourceMapAsset = compilation.getAsset(sourceMapAssetName)!;
    const { source, map } = await replaceAndUpdateSourceMap({
      jsFilename: options.swDest,
      originalMap: JSON.parse(sourceMapAsset.source.source().toString()),
      originalSource: swAssetString,
      replaceString: manifestString,
      searchString: options.injectionPoint,
    });

    compilation.updateAsset(
      sourceMapAssetName,
      new webpackSources.RawSource(map) as any
    );
    compilation.updateAsset(
      options.swDest,
      new webpackSources.RawSource(source) as any
    );
  } else {
    compilation.updateAsset(
      options.swDest,
      new webpackSources.RawSource(
        swAssetString.replace(options.injectionPoint, manifestString)
      ) as any
    );
  }

  if (compilation.getLogger) {
    const logger = compilation.getLogger(PLUGIN_NAME);
    logger.info(
      `The service worker at ${options.swDest} will precache ${sortedEntries.length} URLs, totaling ${prettyBytes(size)}.`
    );
  }
}
