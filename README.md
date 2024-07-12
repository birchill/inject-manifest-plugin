# `@birchill/inject-manifest-plugin`

An rspack plugin that generates a manifest of assets and injects it into a
service worker asset.

This is a fork of the `InjectManifest` part of the
[`workbox-webpack-plugin`](https://github.com/GoogleChrome/workbox/) package
but adapted to rspack's native Service Worker support.

## Usage

The first step is to define your service worker in a way that rspack will detect
it.
That means passing a `URL` object to `navigator.serviceWorker.register()`.
For example:

```js
const registrationPromise = navigator.serviceWorker.register(
  new URL(
    /* webpackChunkName: "serviceworker" */
    './sw.ts',
    import.meta.url
  )
);
```

Note that there are various limitations to rspack's handling of URL arguments
such as not being able to pass a URL variable.
See rspack's [usage notes for Web
Workers](https://www.rspack.dev/guide/features/web-workers#usage).

The next step is ensuring that your generated service worker asset has a fixed
name (e.g. `serviceworker.js`) rather than a name with a cache-busting hash in
it.

```js
// rspack.config.js
const config = {
  // ...
  output: {
    chunkFilename: (assetInfo) => {
      // The service worker entrypoint needs to be fixed (i.e. not have a hash
      // appended).
      if (assetInfo.chunk?.name === 'serviceworker') {
        return '[name].js';
      }
      return '[name].[contenthash].js';
    },
  },
};
```

Finally, add the plugin to your rspack configuration.

The only required parameter is `swDest`, which is the path to the _generated_
service worker asset.
This is _not_ necessarily the same as the path of the source file.

For example, if your service worker source file is `src/sw.ts` but you
registered it as follows:

```js
navigator.serviceWorker.register(
  new URL(
    /* webpackChunkName: "serviceworker" */
    './sw.ts',
    import.meta.url
  )
);
```

`swDest` should be `'serviceworker.js'`, _NOT_ `src/sw.ts`.

For example:

```js
// rspack.config.js
import { InjectManifest } from '@birchill/inject-manifest-plugin';

const config = {
  // ...
  plugins: [
    new InjectManifest({
      swDest: 'serviceworker.js',
    }),
  ],
};
```

### Options

The options are the same as the `InjectManifest` options in the workbox plugin
which are [documented
here](https://developer.chrome.com/docs/workbox/modules/workbox-build#type-WebpackInjectManifestOptions).

- `additionalManifestProperties` (optional) - A list of entries to be precached,
  in addition to any entries that are generated as part of the build
  configuration.

  Type: Array of strings or `ManifestEntry` objects whose shape is as follows:

  ```ts
  interface ManifestEntry {
    integrity?: string;
    revision: string | null;
    url: string;
  }
  ```

- `chunks` (optional) - One or more chunk names whose corresponding output files
  should be included in the precache manifest.

  Type: Array of strings.

- `dontCacheBustURLsMatching` (optional) - Assets that match this will be
  uniquely versioned via their URL, and exempted from the normal HTTP
  cache-busting that's done when populating the precache.

  While not required, it's recommended that if your existing build process
  already inserts a `[hash]` value into each filename, you provide a RegExp
  that will detect that, as it will reduce the bandwidth consumed when
  precaching.

- `exclude` (optional) - One or more specifiers used to exclude assets from the
  precache manifest.

  This is interpreted following
  [the same rules](https://www.rspack.dev/config/module.html#condition) as
  `rspack`'s standard `exclude` option.

  If not provided, the default value is `[/\\.map$/, /^manifest.*\\.js$/]`.",

  Type: Array of `Condition`s whose type is

  ```ts
  type Condition = RegExp | string | ((any: unknown) => boolean);
  ```

- `excludeChunks` (optional) - One or more chunk names whose corresponding
  output files should be excluded from the precache manifest.

  Type: Array of strings.

- `include` (optional) - One or more specifiers used to include assets in the
  precache manifest.

  This is interpreted following
  [the same rules](https://www.rspack.dev/config/module.html#condition) as
  `rspack`'s standard `include` option.

  Type: Array of `Condition`s.

- `injectionPoint` (optional) - The string to find inside of the `swDest` asset.
  Once found, it will be replaced by the generated precache manifest.

  Defaults to `'self.__WB_MANIFEST'`.

  Type: string.

- `manifestTransforms` (optional) - One or more functions which will be applied
  sequentially against the generated manifest.

  If `modifyURLPrefix` or `dontCacheBustURLsMatching` are also specified, their
  corresponding transformations will be applied first.

  Type: Array of functions whose type is `ManifestTransform`:

  ```ts
  type ManifestTransform = (
    manifestEntries: Array<ManifestEntry & { size: number }>,
    compilation?: Compilation
  ) => Promise<ManifestTransformResult> | ManifestTransformResult;

  type ManifestTransformResult = {
    manifest: Array<ManifestEntry & { size: number }>;
    warnings?: Array<string>;
  };

  type ManifestEntry = {
    integrity?: string;
    revision: string | null;
    url: string;
  };
  ```

- `maximumFileSizeToCacheInBytes` (optional) - This value can be used to
  determine the maximum size of files that will be precached.

  This prevents you from inadvertently precaching very large files that might
  have accidentally matched one of your patterns.

  Defaults to `2097152` (2MB).

  Type: number.

- `modifyURLPrefix` (optional) - An object mapping string prefixes to
  replacement string values.

  This can be used to, e.g., remove or add a path prefix from a manifest entry
  if your web hosting setup doesn't match your local filesystem setup.

  As an alternative with more flexibility, you can use the `manifestTransforms`
  option and provide a function that modifies the entries in the manifest using
  whatever logic you provide.

  Type: object whose keys are strings and values are strings.

- `swDest` **(required)** - The name of the service worker file that will be
  The name of the service worker file that will be generated,
  e.g. `"serviceworker.js"`.

  This file is generated by rspack but needs to be specified in order to inject
  the manifest into it.

  Note that this is name of the file generated by rspack, not the original
  service worker file.
