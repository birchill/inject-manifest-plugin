// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2018 Google LLC

export function resolveRspackUrl(
  publicPath: string,
  ...paths: Array<string>
): string {
  if (publicPath === 'auto') {
    return paths.join('');
  } else {
    return [publicPath, ...paths].join('');
  }
}
