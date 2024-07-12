import type { Asset } from '@rspack/core';
import crypto from 'node:crypto';

export function getAssetHash(asset: Asset): string {
  return crypto
    .createHash('md5')
    .update(Buffer.from(asset.source.source()))
    .digest('hex');
}
