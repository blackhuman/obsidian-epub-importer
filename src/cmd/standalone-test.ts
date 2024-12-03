import { DOMParser } from '@xmldom/xmldom'
import fs from 'fs/promises'
import path from 'path'
import process from 'process'

// @ts-ignore
globalThis.DOMParser = DOMParser;
import EpubParser, { Section } from '../lib/EpubParser';

/*
{
  title: "Daisy Jones & the Six: A Novel",
  publisher: "Random House Publishing Group",
  language: "en",
  author: "\"Taylor Jenkins Reid\"",
  bookName: "Daisy Jones & the Six_ A Novel - Taylor Jenkins Reid",
}
  */
class Manifest {
  meta: {
    title: string,
    publisher: string,
    language: string,
    author: string,
  }
  cover: string
  files: Record<string, string> = {}
  toc: {
    name: string,
    index: string
  }[] = []
  spine: string[] = []
}

async function processEpub({epubPath, outputPath}: {epubPath: string, outputPath: string}) {
  const parser = new EpubParser(epubPath, false);
  await parser.init()
  formatPrint('parser.meta', parser.meta)
  formatPrint('parser.toc', parser.toc.map(v => v.name))
  // formatPrint('parser.toc child', parser.toc.map(v => v.subItems))
  formatPrint('parser.sections', parser.sections.map(v => ({
    name: v.name, 
    url: v.url, 
    urlPath: v.urlPath,
    urlHref: v.urlHref,
    html: ''
  })))
  // formatPrint('parser.chapters names', parser.chapters.map(v => v.name))
  // formatPrint('parser.ncxFilePath', parser.ncxFilePath)
  // formatPrint('parser.opfFilePath', parser.opfFilePath)
  formatPrint('parser.tmpPath', parser.tmpPath)

  function getSectionIndex(section: Section) {
    return parser.sections.findIndex(v => v.url === section.url)
  }

  function getOutputRelativePath(url: string) {
    return path.relative(parser.tmpPath, url)
  }

  // process.chdir(outputPath)
  const manifest = new Manifest()
  // @ts-ignore
  manifest.meta = parser.meta
  manifest.cover = getOutputRelativePath(parser.coverPath)
  for (let index = 0; index < parser.sections.length; index++) {
    manifest.files[index] = getOutputRelativePath(parser.sections[index].url)
    manifest.spine.push(`${index}`)
  }

  for (const chapter of parser.toc) {
    manifest.toc.push({
      name: chapter.name,
      index: '' + getSectionIndex(chapter.sections[0])
    })
    // if (chapter.name === 'Contents') {
    //   formatPrint('section count', chapter.sections.length)
    //   const html = chapter.sections.map(v => v.html).join('\n')
    //   console.log(html)
    // }
  }

  formatPrint('manifest', manifest)

  await fs.rm(outputPath, {recursive: true, force: true})
  await fs.mkdir(outputPath, {recursive: true})

  for (const [_, file] of Object.entries(manifest.files)) {
    const source = path.resolve(parser.tmpPath, file)
    const target = path.resolve(outputPath, file)
    // console.log('target', target, path.dirname(target))
    await fs.mkdir(path.dirname(target), {recursive: true})
    await fs.copyFile(source, target)
  }

  await fs.writeFile(
    path.resolve(outputPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

}

function formatPrint(header: string, content: any) {
  console.log(`======= ${header} ====================`)
  console.log(content)
}

processEpub({
  epubPath: '/Users/august/Documents/Calibre Library/Taylor Jenkins Reid/Daisy Jones & the Six_ A Novel (121)/Daisy Jones & the Six_ A Novel - Taylor Jenkins Reid.epub',
  outputPath: './output'
})