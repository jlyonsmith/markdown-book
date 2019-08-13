# Markdown Book

A tool for making books, whitepapers, essays and other long documents out of a collection of Markdown files. It can:

- Collate multiple Markdown files into one document in the process
  - Adjusting all heading depths
  - Optionally adding section numbering
- Add an indented table of contents (TOC)
- Generate a PDF or just a bigger Markdown file

## Installation

Install the tool with:

```Shell
npm install markdown-book
```

or run it with:

```Shell
npx markdown-book
```

## Using It

Create a [JSON5]() document containing:

```json5
{
  title: "A Book About Nothing",
  toc: true,
  number: true,
  files: ["./part1.md", "./part2.md", "./part3.md"],
}
```

- `title` will be the top level, single `#`, for the book.
- `toc` if `true` will include a table of contents after the title.
- `number` if `true` will insert a section number in all headings in the format *1.1.1*, separated by a colon `:`.
- `files` is an array of files relative to the `.json5` file.

The tool expects [ATX headings](https://github.github.com/gfm/#atx-headings) (leading `#`'s).  If you have [Setext headings](https://github.github.com/gfm/#setext-heading) (`-` or `=` underlines) they will be ignored.

Any images that are references by local file paths will be adjusted to the new relative path to the image from the output `.md` file. URL image references will not be modified.
