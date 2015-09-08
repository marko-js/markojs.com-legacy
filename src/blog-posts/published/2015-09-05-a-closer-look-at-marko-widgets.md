---
categories: ['JavaScript','UI Components','Marko Widgets','Node.js', 'Marko']
comments: true
---

A Closer Look at Marko Widgets
============================================

Marko Widgets is a minimalist library for building UI components with the help of the [Marko templating engine](http://markojs.com/docs/). Marko is a [fast](https://github.com/marko-js/templating-benchmarks) and lightweight (~4 KB gzipped) HTML-based templating engine that compiles templates to [readable CommonJS modules](https://gist.github.com/patrick-steele-idem/0514b480219d1c9ed8d4#file-template-marko-js) and supports [streaming](http://www.ebaytechblog.com/2014/12/08/async-fragments-rediscovering-progressive-html-rendering-with-marko/), async rendering and custom tags. Marko is used for rendering the HTML for UI components, while Marko Widgets is used to add client-side behavior. Client-side behavior includes the following:

- Handling DOM events
- Emitting custom events
- Handling custom events emitted by other widgets
- Manipulating and updating the DOM

We call the client-side behavior of a UI component the _widget_.

Applications can use the Marko templating engine as a general purpose HTML templating engine. In places where client-side behavior is needed, a developer can easily bind a _widget_ to an HTML element. When a rendered UI component is mounted to the DOM, Marko Widgets will take care of creating a widget instance and binding it to the root HTML element of the UI component. The `w-bind` attribute is used to associate an HTML element with a JavaScript module that exports the widget functionality as shown below:

_src/components/click-count/template.marko_

```xml
<div w-bind="./index.js">
    <div>
        You clicked the button ${data.clickCount} ${data.timesMessage}.
    </div>
    <button type="button" w-onClick="handleButtonClick">
        Click Me
    </button>
</div>
```

The Marko template serves as the _view_ for the UI component whereas the behavior and rendering logic are placed in a separate JavaScript module file as shown below:

_src/components/click-count/index.js_

```javascript
module.exports = require('marko-widgets').defineComponent({
    /**
     * The template to use as the view
     */
    template: require('./template.marko'),

    /**
     * Return the initial state for the UI component based on
     * the input properties that were provided.
     */
    getInitialState: function(input) {
        return {
            clickCount: 0
        };
    },

    /**
     * Return an object that is used as the template data. The
     * template data should be based on the current widget state
     * that is passed in as the first argument
     */
    getTemplateData: function(state) {
        var clickCount = state.clickCount;
        var timesMessage = clickCount === 1 ? 'time' : 'times';

        return {
            clickCount: clickCount,
            timesMessage: timesMessage
        };
    },

    /**
     * This is the constructor for the widget. Called once when the UI
     * component is first mounted to the DOM.
     */
    init: function() {
        var el = this.el;
        // "el" will be reference the raw HTML element that this
        // widget is bound to. You can do whatever you want with it...
    },

    /**
     * Handler method for the button "click" event. This method name
     * matches the name of the `w-onClick` attribute in the earlier
     * template.
     */
    handleButtonClick: function(event, el) {
        this.setState('clickCount', this.state.clickCount + 1);
    }
});
```

The `require('marko-widgets').defineComponent(def)` function is used to define a UI component that includes both client-side behavior (i.e., the _widget_) and rendering logic (i.e., the _renderer_). That function returns a widget constructor function that also includes a static `render(input)` method. The returned function will also have a static `renderer(input, out)` method that can be used as a [Marko custom tag renderer](http://markojs.com/docs/marko/custom-taglibs/#tag-renderer).

The above UI component can be rendered in the browser and added to the DOM using code similar to the following:

```javascript
var clickCount = require('./src/components/click-count');
clickCount.render({ /* input props */ })
    .appendTo(document.body);
```

After the UI component is rendered and after the HTML output (based on the given template) is inserted into the DOM, a new instance of the widget is created and bound to the corresponding html element. The `init()` method is the first method called when a widget has been created and mounted to the DOM. The `this.el` property can be used to get access to the raw DOM element that a widget is bound to.

Instead of rendering the component using the JavaScript API, the same UI component can also be embedded in a Marko template using a custom tag as shown below:

```xml
<div class="my-app">
    <click-count />
</div>
```

The above template with the embedded `<click-count>` tag can be rendered on the server or in the browser giving web applications an isomorphic character. For more examples and to try out UI components in a live editor, please check out the <a href="http://markojs.com/marko-widgets/try-online" target="_blank">Try Marko Widgets Online</a> page.

# Why did we build Marko Widgets?

Marko Widgets started out with the simple goal of facilitating the automatic binding of behavior to UI components rendered on the server or in the browser. During rendering, Marko Widgets keeps track of all of the rendered UI components and this information is used to efficiently create widget instances when the rendered HTML is added to the DOM. In addition, Marko Widgets provides a simple mechanism for referencing nested widgets and nested DOM elements. Over time we improved Marko Widgets to support features such as declarative event binding, efficient event delegation, stateful widgets, batched updates and DOM diffing/patching. A lot of the later improvements were inspired by some of the great work done by the [React](http://facebook.github.io/react/) team. Marko Widgets offers much of the functionality found in React, but with a much lighter package and with substantially better performance on the server (and very similar performance in the browser). Our [Marko vs React: Performance Benchmark](https://github.com/patrick-steele-idem/marko-vs-react) showed that Marko Widgets was able to render a page of 100 search results on the server over 10x faster than React while offering a very similar UI component-based approach.

Marko Widgets aims to be a simple, minimalist library that is focused solely on helping developers build a web-based UI. It does not provide any functionality associated with data management, routing, etc. (those are things best handled by other modules). It does, however, provide support for things such as updating the DOM, listening to DOM events, referencing nested widgets and nested DOM elements, and rendering UI components. In addition, Marko Widgets was built with the goal of being fast and extremely lightweight (~10 KB gzipped). Because of the simpler internals, Marko Widgets is easier to learn and fully understand compared to more complicated and heavy weight libraries.

# Understanding Marko Widgets

We believe that to properly use a tool, you need to be able to fully understand its inner workings (no developer likes "magic").  While Marko Widgets is not trivial, we hope that you will be able to fully understand the inner workings within a week. Please read on to learn about the architecture of Marko Widgets.

## How does server-side rendering work?

When rendered on the server, all UI components are rendered using their associated Marko template. All HTML output is written to the HTTP response stream and the output HTML will include some _extra information_ used by Marko Widgets in the browser. The extra information is added by the Marko Widgets taglib and it is used to efficiently create widgets when the DOM is ready. That information is encoded in HTML elements using `data-*` attributes and there is one extra DOM element that encodes the IDs of all of the rendered UI components as shown in the sample HTML output below:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Marko Widgets Demo</title>
</head>
<body>
    <div id="w0"
        data-widget="/src/components/click-count"
        data-w-state="{'greetingName':'Frank','clickCount':0}">
        Hello Frank!
        <div>
            You clicked the button 0 times.
        </div>
        <button type="button" data-w-onclick="handleButtonClick|w0">
            Click Me
        </button>
    </div>
    <div id="w1"
        data-widget="/src/components/foo-bar">
        Foobar
    </div>
    <span id="markoWidgets" data-ids="w0,w1" style="display:none;"></span>
    <script src="/static/bundle.js"></script>
</body>
</html>
```

Initializing widgets associated with UI components rendered on the server is handled by looking up the `#markoWidgets` element and reading the `data-ids` attribute to get the list of DOM element IDs for all of the UI components rendered on the server. The client-side code for Marko Widgets simply loops over each DOM element ID and looks up the corresponding DOM element using `document.getElementById()` and then it reads the extra information encoded in the `data-*` attributes to create widget instances. When a widget instance is created, it is given a reference to the HTML element that it is bound to.

## How does browser-side rendering work?

If rendered in the browser, the list of rendered UI components is kept in memory and as soon as the rendered HTML is added to the DOM, the widgets are created. There is no need to encode information in `data-*` attributes for UI components rendered in the browser. The `data-*` attributes are _only_ used to pass down information about UI components rendered on the server.

## How does Marko Widgets keep track of rendered UI components?

When rendering a page or UI component using Marko, a single "rendering context" is created and that rendering context wraps an output stream. That rendering context is passed to all UI components that are encountered during rendering. In Marko and Marko Widgets, the rendering context object is the `out` variable and it is an instance of [AsyncWriter](https://github.com/marko-js/async-writer). The `out` object also has an `out.global` property which is just a vanilla JavaScript object that code can use at render time to store information during rendering. Marko Widgets introduces an `out.global.widgets` property which is used to track anything related to rendered UI components. The `out.global.widgets` value is an instance of [WidgetsContext](https://github.com/marko-js/marko-widgets/blob/master/lib/WidgetsContext.js) and that object provides methods for registering widget information as UI components are rendered.

## How does Marko Widgets integrate with Marko?

The Marko templating engine supports custom HTML tags and custom HTML attributes. During compilation, the Marko template compiler builds an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree). Each HTML element in the template becomes a node in the AST. Compile-time transformers can manipulate the AST (add new nodes, remove nodes, rearrange nodes, modify nodes, etc.) to control how the template compiles to JavaScript. Marko Widgets introduces a compile-time template transformer that processes custom attributes such as `w-bind`, `w-id`, and `w-on*`. For example, when a `w-bind` attribute is found during compilation, the Marko Widgets compile-time transformer will update the AST to automatically assign an "id" attribute to the HTML element (if not already provided by the developer) and add code that is used at render time to associate the rendered ID with a widget type. Marko Widgets does as much work at compilation time as possible to minimize the work that needs to be done at render time so that rendering is extremely fast.

## How is component state managed?

A developer can optionally choose to make a UI component stateful by implementing a `getInitialState(input)` method. The JavaScript object returned by the `getInitialState(input)` method will be persisted with the widget as the `this.state` property. The benefit of making a widget stateful is that Marko Widgets will automatically rerender a widget if its internal state changes and the current state will be made available to the UI component renderer.

Widget state is stored in the `this.state` property of a widget and that property will be a plain JavaScript object. While it is safe to read state properties using `this.state.someProperty`, all writes to state should go through `this.setState('someProperty', someNewValue)`. The `setState()` function will compare the old value of the property to the new value and if the new value is different then the widget's DOM will be updated.

Marko Widgets only does a shallow compare on state properties. As a developer, you must treat complex objects stored in the state as immutable objects, or you must explicitly call `this.setStateDirty('someProperty')` to force an update.

Calling `this.setState(...)` is one way to trigger a widget to rerender. Another way to trigger a widget to rerender is to call `this.setProps(newProps)`. For stateful widgets, calling `this.setProps(newProps)` will cause `this.getInitialState(newProps)` to be called to get the new state and if the state changes then the UI component will be rerendered using the new state. If a widget is not stateful then the new properties will be used to rerender the UI component based on the new input properties.

## How is the DOM updated?

As a UI component developer you are in control of how the DOM is updated for a UI component. You can choose to write or use code that manually manipulates the DOM. Or, better yet, you can choose to trigger a rerender of a UI component by providing new input properties using `this.setProps(newInput)` or changing the widget state using `this.setState(name, value)`. When rerendering a UI component, Marko Widgets will invoke the Marko template associated with the widget to produce a new DOM tree. The newly rendered DOM tree will then be compared to the old DOM tree and the old DOM tree will be transformed to match the newly rendered DOM using a diffing/patching algorithm that operates on _real_ DOM nodes and makes the minimum number of changes to the DOM. The diffing and patching is handled by the separate and independent [morphdom](https://github.com/patrick-steele-idem/morphdom) module.

Rerendering a UI component is the recommended way to update the DOM for a UI component. By rerendering, a UI component's template is always used to produce the _view_. Writing code to manually manipulate the DOM makes it harder to test UI components and it typically results in code that is more difficult to maintain.

## Why does Marko and Marko Widgets perform so well on the server?

When considering performance, Marko Widgets excels on the server largely due to the fact that Marko is arguably the fastest templating engine for Node.js that supports streaming and asynchronous rendering. Marko compiles templates into efficient JavaScript functions that render HTML strings in a single pass. In contrast to virtual DOM-based solutions, there is no intermediate tree representation.

For example, server-side rendering using React happens in two phases:

- **PHASE 1) Build the tree** - Render the top-level UI component and all nested UI components to get back a complete intermediate tree-representation of the final output
- **PHASE 2) Serialize the tree** - Traverse the entire tree to build the final HTML string

On a related note, in order to bind behavior to React UI components rendered on the server, the entire UI must be rendered _again_ in the browser. In contrast, Marko Widgets does not require an additional client-side rendering to bind behavior to UI components rendered on the server.

## How does event delegation work?

If you are building a UI component you will likely need to write code to handle various DOM events (`click`, `submit`, etc.). It is common for developers to write code that adds DOM event listeners using `el.addEventListener(...)` or using a library such as jQuery. You can still do that when building UI components using Marko Widgets, but there is overhead in attaching listeners when lots of widgets are being initialized. Instead, Marko Widgets recommends using declarative event binding as shown below:

```xml
<button type="button" w-onClick="handleClick" w-bind>
    Click Me
</button>
```

When using declarative event binding, no DOM event listeners are actually attached for events that bubble. Instead, Marko Widgets attaches a single listener on the root DOM element of the page for each DOM event that bubbles (done at startup). When Marko Widgets receives an event at the root it handles delegating the event to the appropriate widgets that are interested in that event. This is done by looking at the `event.target` property to see where the event originated and then walking up the tree to find widgets that need to be notified. As a result, there is slightly more work that is done when a DOM event is captured at the root, but this approach uses much less memory and reduces the amount of work that is done during initialization. The extra overhead of delegating events to widgets will not be noticeable (unless maybe if the DOM tree is hundreds of levels deep) so it is a very beneficial optimization.

The signature for an event handler method is `function(event, el)`. The first argument will be the original DOM event that was fired by the browser (in older browsers the event will be patched to be standards compliant). The second argument will be the HTML element that the event handler method was declaratively bound to (which may be different from `event.target`).

Another side benefit of having Marko Widgets do the event delegation is that the `this` variable will be the widget instance in the handler functions as shown below:

```javascript
module.exports = require('marko-widgets').defineComponent({
    // ...

    init: function() {
        // Using jQuery to attach event listeners...
        var self = this;
        $(this.el).click(function() {
            // "this" is not the widget instance...
            // Must use "self" variable that is part of the parent closure
            self.doSomething();            
        });

        // Using the native DOM API...
        this.el.addEventListener('click', function() {
            // "this" is not the widget instance...
            // Must use "self" variable that is part of the parent closure
            self.doSomething();            
        });
    },

    handleClick: function(event, el) {
        // "this" will always be the widget instance
        this.doSomething();
    }
});
```

## How does batching work?

Batching is used to defer updates to the DOM until all of the changes have been made. That is, changes to a widget state will _not_ trigger an immediate update of the DOM. Batching prevents DOM thrashing from happening in cases where there are a lot of intermediate updates to widgets. For example, given the following code:

```javascript
this.setState('foo', 'bar');
this.setState('foo', 'baz');
```

The widget will only be rendered once after the above code runs and it will be based on the final state (with `this.state.foo` set to `'baz'`). When a widget's state changes, Marko Widgets will mark the widget as "dirty" and queue it up to be updated with the next batch.

During event delegation, Marko Widgets will automatically create a new batch so that after all user code runs to handle the DOM event the DOM will then be updated. In situations where a widget's DOM is queued to be updated outside of event delegation, Marko Widgets will create a new batch and schedule the DOM updates using  `process.nextTick()`. A widget can implement the [onUpdate](http://markojs.com/docs/marko-widgets/component-lifecycle/#onupdate) method to be notified when its DOM has updated.

## How are references to nested widgets and nested DOM elements handled?

Marko Widgets allows a _scoped_ ID to be assigned to nested DOM elements and nested widgets using the `w-id` attribute as shown below:

```xml
<div class="my-app" w-bind>
    <button type="button" w-onClick="handleButtonClick">
        Click Me
    </button>

    <alert-overlay visible="false" w-id="alert">
        This is a test alert.
    </alert-overlay>

    <div w-id="clickMessage" style="display: none;">
        You clicked the button!
    </div>
</div>
```

The `w-id` attributes allows the parent widget to reference nested widgets and nested DOM elements as shown below:

```javascript
module.exports = require('marko-widgets').defineComponent({

    // ...

    handleButtonClick: function(event, el) {
        var alertWidget = this.getWidget('alert');

        // Call the `show()` function implemented by the alert widget:
        alertWidget.show();

        var clickMessageEl = this.getEl('clickMessage');
        clickMessageEl.style.display = 'block';
    }
});
```

The value of the `w-id` attribute is used to assign a unique DOM ID to the nested widget or nested DOM element by prefixing the provided ID with the ID of the parent widget. For example, if the ID of the parent widget is `myParent` then the produced HTML will be similar to the following:

```html
<div class="click-count" id="myParent">
    <button type="button" data-w-onclick="handleButtonClick|myParent">
        Click Me
    </button>
    <div class="alert" id="myParent-alert">
        This is a test alert.
    </div>
    <div style="display: none;" id="myParent-clickMessage">
        You clicked the button!
    </div>
</div>
```

For this example, calling `this.getEl('clickMessage')` is the equivalent of doing the following:

```javascript
var clickMessageEl = document.getElementById(this.id + '-clickMessage');
```

Calling `this.getWidget('alert')` is the equivalent of doing the following:

```javascript
var markoWidgets = require('marko-widgets');
var alertEl = document.getElementById(this.id + '-alert');
var alertWidget = markoWidgets.getWidgetForEl(alertEl);
```

# Looking Forward

We see Marko Widgets as a great foundation for building web applications with a UI component-based approach. UI components built using Marko Widgets export a simple JavaScript API that allows them to be utilized in any web application.

With Marko Widgets developers are able to adopt many of the best practices for building modern web applications with a UI component-based approach and those applications will perform very well due to the many optimizations found in Marko and Marko Widgets. The recent release of Marko Widgets v5 introduced some internal changes to improve how the DOM was updated by integrating a DOM diffing/patching library. We will continue to explore performance improvements and API simplifications, but we will resist adding unnecessary bloat.

eBay is using Marko and Marko Widgets on the server (Node.js) and in the browser for both the desktop and mobile website. For eBay, performance of the website is extremely important (especially on mobile devices) and this has impacted how Marko and Marko Widgets were designed. A lot of focus has been placed on keeping the library small and fast. At the same time, we want Marko Widgets to have a minimal learning curve so we have kept the API small and we have provided lots of documentation and [sample apps](https://github.com/marko-js-samples).

We would like to see developer tools be created for Marko Widgets that allow developers to inspect widgets and events on the page. Marko Widgets already exposes a `getWidgetForEl(el)` method to get a reference to a widget instance associated with an element and the `this.state` property is freely inspectable.

 We welcome outside contributions and strive to have a healthy (and growing) community. If you have a question, find a bug or have a suggestion on how to improve Marko Widgets please don't hesitate to reach out to us by [opening a Github issue](https://github.com/marko-js/marko-widgets/issues), [chatting with us on Gitter](https://gitter.im/marko-js/marko-widgets) or tweeting to [@MarkoDevTeam](https://twitter.com/MarkoDevTeam). We enjoy getting feedback from the community so please share your thoughts on Twitter using the [#MarkoJS](https://twitter.com/search?src=typd&q=%23MarkoJS) hashtag.

 Check out the [Try Marko Widgets Online!](http://markojs.com/marko-widgets/try-online/) feature to experience building UI components in your browser. To learn more, head on over to the [Marko Widgets Documentation](http://markojs.com/docs/marko-widgets/).