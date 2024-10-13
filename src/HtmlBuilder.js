import * as parse5 from 'parse5';
import path from 'path';
import { existsSync } from 'fs';

export class HtmlBuilder {
  #document;
  #entries = [];

  constructor({ html, htmlFolder }) {
    this.#document = parse5.parse(html);
    this.#processTagsWithAttr('src', htmlFolder);
    this.#processTagsWithAttr('href', htmlFolder);
  }

  process(htmlFilename, files) {
    for (const entryEl of Object.values(this.#entries)) {
      const newFilename = path.relative(
        path.dirname(htmlFilename),
        files[entryEl.filename]
      );
      this.#setAttr(entryEl.node, entryEl.attr, newFilename);
    }
    return parse5.serialize(this.#document);
  }

  getEntryPoints() {
    return this.#entries.map((e) => e.filename);
  }

  #processTagsWithAttr(attrName, htmlFolder) {
    for (const el of this.#findTagsWithAttr(this.#document, attrName)) {
      const filename = path.join(htmlFolder, this.#getAttr(el, attrName));
      if (!existsSync(filename)) {
        continue;
      }
      this.#entries.push({ node: el, attr: attrName, filename });
    }
  }

  #findTagsWithAttr(node, attrName) {
    const res = [];
    if (this.#getAttr(node, attrName)) {
      res.push(node);
    }
    if (node.childNodes) {
      for (const child of node.childNodes) {
        res.push(...this.#findTagsWithAttr(child, attrName));
      }
    }
    return res;
  }

  #getAttr(el, attrName) {
    const attr = (el.attrs || []).find((e) => e.name === attrName);
    if (attr) {
      return attr.value;
    }
    return '';
  }

  #setAttr(el, attrName, value) {
    const attr = (el.attrs || []).find((e) => e.name === attrName);
    if (attr) {
      attr.value = value;
    } else {
      el.attrs.push({ name: attrName, value });
    }
  }
}
