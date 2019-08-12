import parseArgs from "minimist"
import autobind from "autobind-decorator"
import * as version from "./version"
import JSON5 from "@johnls/json5"
import tempy from "tempy"
import fs from "fs-extra"
import path from "path"

@autobind
export class MarkdownBookTool {
  constructor(container) {
    this.toolName = container.toolName
    this.log = container.log
    this.debug = !!container.debug
  }

  async run(argv) {
    const options = {
      boolean: ["help", "version"],
      string: ["output", "pdf"],
      alias: {
        o: "output",
        p: "pdf",
      },
    }

    const args = parseArgs(argv, options)

    if (args.version) {
      this.log.info(version.fullVersion)
      return 0
    }

    if (args.help) {
      this.log.info(`
Usage: ${this.toolName} [options] <book-definition-file>

Description:

Creates a book from Markdown files.  Supply a JSON5 file list all the
Markdown files in the book in order.

Options:
  --help                        Shows this help.
  --version                     Shows the tool version.
  --output <file>, -o <file>    Markdown output file. Required.
  --pdf <file>, -p <file>       Generate a PDF as the output.
`)
      return 0
    }

    const bookPath = args._[0]

    if (!bookPath) {
      throw new Error("A book definition file must be specified")
    }

    const outputPath = args["output"]

    if (!outputPath) {
      throw new Error("An output path must be specified")
    }

    this.log.info(`Processing ${bookPath}`)
    const { files, title, number } = JSON5.parse(await fs.readFile(bookPath))

    if (!files || !Array.isArray(files)) {
      throw new Error("No files array property specified")
    }

    const tmpPath = tempy.file({ extension: "md" })
    const bookDir = path.resolve(path.dirname(bookPath))

    fs.writeFile(tmpPath, `# ${title || "Unknown"}\n\n`)

    let numbering = []
    const createSectionNumber = (depth, numbering) => {
      let s = ""

      if (depth === numbering.length + 1) {
        numbering.push(1)
      } else if (depth === numbering.length) {
        numbering[depth - 1] += 1
      } else if (depth === numbering.length - 1) {
        numbering.pop()
        numbering[numbering.length - 1] += 1
      } else {
        return "#".repeat(depth + 1) + "?.?.?: "
      }

      for (let i = 1; i <= numbering.length; i++) {
        s += numbering[i - 1] + (i !== numbering.length ? "." : "")
      }

      return "#".repeat(depth + 1) + " " + s + ": "
    }

    for (let filePath of files) {
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(bookDir, filePath)
      }

      let markdown = await fs.readFile(filePath, { encoding: "utf8" })

      // Re-write the headings
      markdown = markdown.replace(/^(#+) /gm, (match, p1) => {
        const depth = p1.length

        return "#" + p1 + numbering
          ? createSectionNumber(depth, numbering)
          : " "
      })

      // Insert a title and ensure file ends with a blank line
      markdown += "\n"

      fs.appendFile(tmpPath, markdown)
    }

    fs.move(tmpPath, outputPath, { overwrite: true })

    return 0
  }
}
