import parseArgs from "minimist"
import autobind from "autobind-decorator"
import * as version from "./version"
import JSON5 from "@johnls/json5"
import tempy from "tempy"
import fs from "fs-extra"
import path from "path"

const pipeToPromise = (readable, writeable) => {
  const promise = new Promise((resolve, reject) => {
    readable.on("error", (error) => {
      reject(error)
    })
    writeable.on("error", (error) => {
      reject(error)
    })
    writeable.on("finish", (file) => {
      resolve(file)
    })
  })
  readable.pipe(writeable)
  return promise
}

@autobind
export class MarkdownBookTool {
  constructor(container) {
    this.toolName = container.toolName
    this.log = container.log
    this.debug = !!container.debug
  }

  async run(argv) {
    const options = {
      boolean: ["debug", "help", "version"],
      string: ["output"],
      alias: {
        o: "output",
      },
    }

    const args = parseArgs(argv, options)

    this.debug = !!args.debug

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
  --output <file>, -o <file>    Markdown output file. Default is definition
                                file name with .md extension.
`)
      return 0
    }

    const bookPath = args._[0]

    if (!bookPath) {
      throw new Error("A book definition file must be specified")
    }

    let outputPath = args["output"]

    if (!outputPath) {
      outputPath =
        path.join(
          path.dirname(bookPath),
          path.basename(bookPath, path.extname(bookPath))
        ) + ".md"
    }

    const { files, title = "Unknown", number, toc } = JSON5.parse(
      await fs.readFile(bookPath)
    )

    if (!files || !Array.isArray(files)) {
      throw new Error("No files array property specified")
    }

    const sectionsTmpPath = tempy.file({ extension: "md" })
    const bookTmpPath = tempy.file({ extension: "md" })
    const bookDir = path.resolve(path.dirname(bookPath))

    this.log.info(`Book title is '${title}'`)

    await fs.writeFile(bookTmpPath, `# ${title}\n\n`)

    let tableOfContents = ""
    let numbering = [0]
    const createSectionNumber = (depth, numbering) => {
      let section = ""

      while (true) {
        if (depth > numbering.length) {
          numbering.push(0)
        } else if (depth === numbering.length) {
          numbering[numbering.length - 1] += 1
          break
        } else if (depth < numbering.length) {
          numbering.pop()
        }
      }

      for (let i = 0; i < numbering.length; i++) {
        section += numbering[i] + "."
      }

      return section
    }

    for (let filePath of files) {
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(bookDir, filePath)
      }

      const fileDir = path.dirname(filePath)

      this.log.info(`Appending ${path.basename(filePath)}`)

      let markdown = await fs.readFile(filePath, { encoding: "utf8" })

      // Re-write the headings
      markdown = markdown.replace(/^(#+) (.*)$/gm, (match, p1, p2) => {
        const section = createSectionNumber(p1.length, numbering)

        if (toc) {
          const title = (number ? section + " " : "") + p2
          const link = title
            .toLowerCase()
            .replace(/\./g, "")
            .replace(/ /g, "-")

          tableOfContents +=
            "&nbsp;".repeat((numbering.length - 1) * 2) +
            "[" +
            title +
            "](#" +
            link +
            ")  \n"
        }

        return "#" + p1 + " " + (number ? section : "") + " " + p2
      })

      // Re-write relative image links
      markdown = markdown.replace(/!\[(.+)\]\((.+)\)/gm, (match, p1, p2) => {
        return (
          "![" +
          p1 +
          "](" +
          path.relative(bookDir, path.resolve(fileDir, p2)) +
          ")"
        )
      })

      // Ensure file ends with a blank line
      markdown += "\n"

      await fs.appendFile(sectionsTmpPath, markdown)
    }

    tableOfContents += "\n---\n\n"

    if (toc) {
      await fs.appendFile(bookTmpPath, tableOfContents)
    }

    await pipeToPromise(
      fs.createReadStream(sectionsTmpPath),
      fs.createWriteStream(bookTmpPath, { flags: "a" })
    )
    await fs.move(bookTmpPath, outputPath, { overwrite: true })

    this.log.info(`Output file is ${outputPath}`)

    return 0
  }
}
