// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2018 Google LLC

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
