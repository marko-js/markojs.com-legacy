---
categories: ['Marko Widgets','Announcements']
comments: true
---

Announcing Marko Widgets v5
============================================

The release of Marko Widgets v5 introduces some exciting new features that improve how the DOM is updated. The highlight of this release is that Marko Widgets now uses DOM diffing/patching to update the DOM by integrating the [morphdom](https://github.com/patrick-steele-idem/morphdom) module. We intentionally omitted the "virtual" part because `morphdom` does diffing between _real_ DOM nodes. We found it beneficial to not go the "virtual" route for the following reasons:

- The real DOM is the source of truth so there is no need to have a persistent copy of the actual DOM in memory at all times
- Our benchmarks  showed that using the real DOM is plenty fast (for example, <0.5ms to update Todo MVC view, see [Marko vs React](https://github.com/patrick-steele-idem/marko-vs-react) and [morphdom » Benchmarks](https://github.com/patrick-steele-idem/morphdom#benchmarks))
- Less layers of abstraction
- A virtual DOM solution can only be used with code/templates that produce a virtual DOM tree and...
- Creating and rendering a virtual DOM tree on the server is much slower than rendering HTML on the server (Our [Marko vs React](https://github.com/patrick-steele-idem/marko-vs-react) and [morphdom » Benchmarks](https://github.com/patrick-steele-idem/morphdom#benchmarks) benchmark showed that Marko Widgets is 10x faster than React in rendering a page of 100 search results on the server)
- Also, by using the real DOM, UI components can manually manipulate the DOM and diffing/patching will still work.

# Size

The `morphdom` module is tiny at ~250 lines of code and about ~1KB gzipped. In addition, by introducing the `morphdom` we were able to shrink the size of Marko Widgets since it simplified how the DOM was updated and solved a lot of other quirks in the process. As a result Marko Widgets is extremely small:

- Marko Widgets (including morphdom and core dependencies): `~10KB` gzipped*
- Marko: `~4KB` gzipped*

_*NOTE: Choice of JavaScript module bundler will impact actual JavaScript size. Some common dependencies such as the [events](https://nodejs.org/api/events.html) module have been omitted from size calculation._

# Upgrading

Marko Widgets v5 is largely backwards compatible and you will likely be able to upgrade with no code changes. However, because reusing DOM nodes has the potential to introduce different behavior we chose to increment the major version.

For the complete list of changes and instructions for upgrading, please see [marko-widgets » CHANGELOG.md](https://github.com/marko-js/marko-widgets/blob/master/CHANGELOG.md#v4-to-v5)
