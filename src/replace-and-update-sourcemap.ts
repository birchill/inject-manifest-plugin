// This file includes code from Google Workbox, which is licensed under the MIT
// License.
//
// Copyright 2019 Google LLC

import {
  type RawSourceMap,
  SourceMapConsumer,
  SourceMapGenerator,
} from 'source-map';

export async function replaceAndUpdateSourceMap({
  jsFilename,
  originalMap,
  originalSource,
  replaceString,
  searchString,
}: {
  jsFilename: string;
  originalMap: RawSourceMap;
  originalSource: string;
  replaceString: string;
  searchString: string;
}): Promise<{ map: string; source: string }> {
  const generator = new SourceMapGenerator({ file: jsFilename });

  const consumer = await new SourceMapConsumer(originalMap);

  let pos: number;
  let src = originalSource;
  const replacements: Array<{ line: number; column: number }> = [];
  let lineNum = 0;
  let filePos = 0;

  const lines = src.split('\n');
  for (let line of lines) {
    lineNum++;
    let searchPos = 0;
    while ((pos = line.indexOf(searchString, searchPos)) !== -1) {
      src =
        src.substring(0, filePos + pos) +
        replaceString +
        src.substring(filePos + pos + searchString.length);
      line =
        line.substring(0, pos) +
        replaceString +
        line.substring(pos + searchString.length);
      replacements.push({ line: lineNum, column: pos });
      searchPos = pos + replaceString.length;
    }
    filePos += line.length + 1;
  }

  replacements.reverse();

  consumer.eachMapping((mapping) => {
    for (const replacement of replacements) {
      if (
        replacement.line === mapping.generatedLine &&
        mapping.generatedColumn > replacement.column
      ) {
        const offset = searchString.length - replaceString.length;
        mapping.generatedColumn -= offset;
      }
    }

    if (mapping.source) {
      const newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
        },
        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn,
        },
        source: mapping.source,
      };
      return generator.addMapping(newMapping);
    }

    return mapping;
  });

  consumer.destroy();

  const updatedSourceMap: RawSourceMap = Object.assign(
    JSON.parse(generator.toString()),
    {
      names: originalMap.names,
      sourceRoot: originalMap.sourceRoot,
      sources: originalMap.sources,
      sourcesContent: originalMap.sourcesContent,
    }
  );

  return {
    map: JSON.stringify(updatedSourceMap),
    source: src,
  };
}
