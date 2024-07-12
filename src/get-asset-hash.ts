// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2018 Google LLC

import type { Asset } from '@rspack/core';
import crypto from 'node:crypto';

export function getAssetHash(asset: Asset): string {
  return crypto
    .createHash('md5')
    .update(Buffer.from(asset.source.source()))
    .digest('hex');
}
