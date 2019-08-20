"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MarkdownBookTool = void 0;

var _minimist = _interopRequireDefault(require("minimist"));

var _autobindDecorator = _interopRequireDefault(require("autobind-decorator"));

var version = _interopRequireWildcard(require("./version"));

var _json = _interopRequireDefault(require("@johnls/json5"));

var _tempy = _interopRequireDefault(require("tempy"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _class;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let MarkdownBookTool = (0, _autobindDecorator.default)(_class = class MarkdownBookTool {
  constructor(container) {
    this.toolName = container.toolName;
    this.log = container.log;
    this.debug = !!container.debug;
  }

  async run(argv) {
    const options = {
      boolean: ["help", "version"],
      string: ["output"],
      alias: {
        o: "output"
      }
    };
    const args = (0, _minimist.default)(argv, options);

    if (args.version) {
      this.log.info(version.fullVersion);
      return 0;
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
`);
      return 0;
    }

    const bookPath = args._[0];

    if (!bookPath) {
      throw new Error("A book definition file must be specified");
    }

    let outputPath = args["output"];

    if (!outputPath) {
      outputPath = _path.default.join(_path.default.dirname(bookPath), _path.default.basename(bookPath, _path.default.extname(bookPath))) + ".md";
    }

    const {
      files,
      title = "Unknown",
      number
    } = _json.default.parse((await _fsExtra.default.readFile(bookPath)));

    if (!files || !Array.isArray(files)) {
      throw new Error("No files array property specified");
    }

    const tmpPath = _tempy.default.file({
      extension: "md"
    });

    const bookDir = _path.default.resolve(_path.default.dirname(bookPath));

    _fsExtra.default.writeFile(tmpPath, `# ${title}\n\n`);

    this.log.info(`Book title is '${title}'`);
    let numbering = [0];

    const createSectionNumber = (depth, numbering) => {
      let section = "";

      while (true) {
        if (depth > numbering.length) {
          numbering.push(0);
        } else if (depth === numbering.length) {
          numbering[numbering.length - 1] += 1;
          break;
        } else if (depth < numbering.length) {
          numbering.pop();
        }
      }

      for (let i = 0; i < numbering.length; i++) {
        section += numbering[i] + ".";
      }

      return section;
    };

    for (let filePath of files) {
      if (!_path.default.isAbsolute(filePath)) {
        filePath = _path.default.resolve(bookDir, filePath);
      }

      this.log.info(`Appending ${_path.default.basename(filePath)}`);
      let markdown = await _fsExtra.default.readFile(filePath, {
        encoding: "utf8"
      }); // Re-write the headings

      markdown = markdown.replace(/^(#+) /gm, (match, p1) => {
        return "#" + p1 + " " + (number ? createSectionNumber(p1.length, numbering) : "") + " ";
      }); // Ensure file ends with a blank line

      markdown += "\n";

      _fsExtra.default.appendFile(tmpPath, markdown);
    }

    _fsExtra.default.move(tmpPath, outputPath, {
      overwrite: true
    });

    this.log.info(`Output file is ${outputPath}`);
    return 0;
  }

}) || _class;

exports.MarkdownBookTool = MarkdownBookTool;
//# sourceMappingURL=MarkdownBookTool.js.map