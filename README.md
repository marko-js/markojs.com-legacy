markojs.com source code
=======================

# Running locally

```
git clone https://github.com/marko-js/markojs.com
npm install
npm start
```

[browser-refresh](https://github.com/patrick-steele-idem/browser-refresh) is also supported for instant page refreshes:

```
browser-refresh
```

The documentation is pulled from the [marko](https://github.com/marko-js/marko) and [marko-widgets](https://github.com/marko-js/marko-widgets) modules that are npm installed with this project. Specifically:

- `node_modules/marko/docs`rve
- `node_modules/marko-widgets/docs`

If you want, you can `npm link` those modules into this project:

```
npm link marko
npm link marko-widgets
```

# Production preview

```
npm run preview
```

This will do a production build and start a local HTTP server.

# Production publish

Make sure the following Github repo is in a sibling directory to this project:

```
cd ../
git clone https://github.com/marko-js/marko-js.github.io
```

Then run the `pm run publish` command which will do a build and copy the files over to `../marko-js.github.io`

```
npm run publish
```