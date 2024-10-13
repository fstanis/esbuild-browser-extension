import { HtmlBuilder } from './HtmlBuilder.js';
import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

export class ESBuildManager {
  #htmlFiles = Object.create(null);
  #entryPoints = new Set();
  #loaders = Object.create(null);
  #inputBase;
  #outputPath;

  constructor({ inputBase, outputPath }) {
    this.#inputBase = inputBase;
    this.#outputPath = outputPath;
  }

  addHtmlFile(htmlFile) {
    const htmlFolder = path.dirname(htmlFile);
    const builder = fs
      .readFile(htmlFile, 'utf8')
      .then((html) => new HtmlBuilder({ html, htmlFolder }));
    this.#htmlFiles[htmlFile] = builder;
  }

  addJsFile(file) {
    this.#entryPoints.add(file);
  }

  addAssetFile(file) {
    this.#loaders[path.extname(file)] = 'file';
    this.#entryPoints.add(file);
  }

  async build(opts = {}) {
    const loader = Object.assign(this.#loaders, opts.loader || {});
    const { metafile } = await esbuild.build(
      Object.assign(opts, {
        entryPoints: await this.#getEntryPoints(),
        outdir: this.#outputPath,
        outbase: this.#inputBase,
        loader,
        metafile: true,
      })
    );
    const result = await this.#processOutputs(metafile);
    await this.#processHtmlFiles(result);
    return result;
  }

  async #getEntryPoints() {
    const entryPoints = new Set(this.#entryPoints);
    for (const builderPromise of Object.values(this.#htmlFiles)) {
      for (const entryPoint of (await builderPromise).getEntryPoints()) {
        entryPoints.add(entryPoint);
      }
    }
    return Array.from(entryPoints);
  }

  async #processHtmlFiles(outputs) {
    const promises = [];
    for (const [htmlFile, builderPromise] of Object.entries(this.#htmlFiles)) {
      const outputRelative = path.relative(this.#inputBase, htmlFile);
      const outputFile = path.join(this.#outputPath, outputRelative);
      promises.push(
        fs.writeFile(
          outputFile,
          (await builderPromise).process(outputFile, outputs),
          'utf8'
        )
      );
      outputs[htmlFile] = outputFile;
    }
    await Promise.all(promises);
  }

  async #processOutputs(metafile) {
    const entryPoints = Object.create(null);
    const outputs = Object.create(null);
    for (const [output, entry] of Object.entries(metafile.outputs)) {
      if (entry.entryPoint) {
        entryPoints[entry.entryPoint] = output;
      } else {
        const inputs = Object.keys(entry.inputs);
        if (inputs.length !== 1) {
          continue;
        }
        outputs[inputs[0]] = output;
      }
    }
    const promises = [];
    for (const [entryPoint, output] of Object.entries(entryPoints)) {
      if (outputs[entryPoint]) {
        promises.push(fs.rm(output));
      } else {
        outputs[entryPoint] = output;
      }
    }
    await Promise.all(promises);
    return outputs;
  }
}
