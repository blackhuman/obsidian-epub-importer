# Obsidian Epub Importer

Import .epub file into Obsidian as markdown notes.

> [!IMPORTANT]
> This plugin is still in a very early stage and will probably only work with some specific formats of .epub files. If you find any incompatibilities, please let me know.

> [!NOTE]
> the plugin need to access files outside of Obsidian vaults, becasue .epub file is outside of Obsidian vaults. 

## Usage

Get the plugin from obsidian BRAT plugin.

Run `Epub Importer: Import epub to your vault` command, 
and input the absolute path to .epub file you want to import it into your obsidian vault.
Then, .epub file will be converted to a folder and some notes, 
so you can read the book directly in obsidian, and make some marks, make some links and notes.

[![Watch the video](https://img.youtube.com/vi/SH3OuDLdMQw/hqdefault.jpg)](https://www.youtube.com/embed/SH3OuDLdMQw)

## RoudMap

- [x] convert name of char to a vaild windows file path, delete invalid characters.
- [x] image support.
- [x] toc support.
- [ ] inline link support.
- [x] fix conflicting images bug.
- [x] fix note duplication caused by href.
- [x] inline fontnote support.
- [ ] escape characters in the original text that are mistaken for markdown format tags.
- [x] settings tab page can specify the default path for searching e-book files.
- [x] settings to add tag for new books.
- [x] cover parser for obsidian projects plugin.
- [ ] Parse more metadata.

## Working on Compatibility...

The internal structure of the epub file is very confusing and I don't expect that I can only identify a vert small part of it.
