# esbuild-browser-extension

A simple wrapper around [esbuild](https://esbuild.github.io/) tailored to
building browser extensions.

Given a folder that contains a `manifest.json` file, it locates all defined
entry points and generates a new `manifest.json` file with the outputs. HTML
files are processed by finding all tags that have either a `src` or `href`
attribute.

## Example

Assuming you have the following structure:

```
project
└───src
│   │   manifest.json
│   │   popup.html
│   │   popup.jsx
│   │   App.jsx
```

With `src/manifest.json` that looks like this:

```
{
  "manifest_version": 3,
  "name": "Example",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html",
  }
}
```

And with `src/popup.html` containing the following:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="popup.jsx"></script>
  </body>
</html>
```

An example build command may look like this:

```js
import { buildExtension } from 'esbuild-browser-extension';

await buildExtension({
  inputBase: 'src',
  outputPath: 'dist',
  esbuildOptions: {
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
  }
});
```

Resulting in the following file structure:

```
project
└───src
│   │   manifest.json
│   │   popup.html
│   │   popup.jsx
│   │   App.jsx
│
└───dist
    │   manifest.json
    │   popup.html
    │   popup.js
```

Notice that `src/popup.jsx` and `src/App.jsx` have both been bundled into
`dist/popup.js`. `dist/popup.html` is updated accordingly to point to the new
bundle.
