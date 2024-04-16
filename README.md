# CSS Toggles preview

- [Demo](https://toggles.oddbird.net)
- [Explainer](https://css.oddbird.net/toggles/explainer/)
- [Draft Spec](https://tabatkins.github.io/css-toggle/)

## Polyfill Installation

### Download a copy

The simplest, recommended way to install the polyfill is to copy it into your
project.

Download `css-toggles.min.js` [from
unpkg.com](https://unpkg.com/browse/@oddbird/css-toggles/dist/) and add it to
the appropriate directory in your project. Then, include it where necessary with
a `<script>` tag:

```html
<script src="/path/to/css-toggles.min.js" type="module"></script>
```

You can also use an
[IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) version if your
target browsers require it:

```html
<script src="/path/to/css-toggles.iife.min.js"></script>
```

### With npm

For more advanced configuration, you can install with
[npm](https://www.npmjs.com/):

```sh
npm install @oddbird/css-toggles
```

After installing, you’ll need to use appropriate tooling to use `node_modules/@oddbird/css-toggles/dist/css-toggles.js` (or `.min.js`).

### Via CDN

For prototyping or testing, you can use the npm package via a Content Delivery
Network. Avoid using JavaScript CDN’s in production, for [many good
reasons](https://blog.wesleyac.com/posts/why-not-javascript-cdn) such as
performance and robustness.

```html
<script
  src="https://cdn.jsdelivr.net/npm/@oddbird/css-toggles@latest"
  crossorigin="anonymous"
  defer
></script>
```

## Usage

After installation the polyfill will automatically parse all stylesheets present
in the HTML document (both inline and linked) for the proposed CSS Toggles
syntax. Once the styles are parsed the toggling behavior will be polyfilled with
JavaScript.

## Contributing

Visit our [contribution guidelines](https://github.com/oddbird/css-toggles/blob/main/CONTRIBUTING.md).

## Sponsor OddBird's OSS Work

At OddBird, we love contributing to the languages & tools developers rely on.
We're currently working on polyfills
for new Popover & Anchor Positioning functionality,
as well as CSS specifications for functions, mixins, and responsive typography.
Help us keep this work sustainable
and centered on your needs as a developer!
We display sponsor logos and avatars
on our [website](https://www.oddbird.net/polyfill/#open-source-sponsors).

[Sponsor OddBird's OSS Work](https://opencollective.com/oddbird-open-source)
