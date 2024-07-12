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
