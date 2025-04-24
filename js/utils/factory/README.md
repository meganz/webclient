### Collection of utility functions powered by a simplistic module loader.

This folder contains a collection of **zero-dependency, pure vanilla JavaScript utility functions** designed for
reusability and modularity. The functions are loaded and managed via a **factory module loader**, a lightweight system
for defining, caching, and requiring modules. Welcome back to 2001, read more below.

### Overview

The factory module loader provides a simple yet effective way to define, cache, and require modules in a
browser environment. It is designed to be minimalistic, with no external dependencies, and works seamlessly
with the utility functions provided in this folder.

### Key Features

- **Zero Dependencies**: Meant to be pure vanilla JavaScript modules, without external dependencies.
- **Modular Design**: Each utility function is encapsulated in its own module and private context.
- **Lazy Loading**: Modules are loaded and cached only when required.
- **Error Handling**: Built-in error handling for module loading and execution.
- **Secure & Immutable**: Uses frozen objects by design to prevent accidental mutations and tampering by external
  actors, such as browser extensions.
- **Automated Module Registration**: The `scripts/factory.sh` script automatically updates `secureboot.js` with
  references to new modules, eliminating manual updates.

### Factory Module Loader

The factory module loader is a global object (`factory`) that provides the following methods:

### `factory.define(name, module)`

Defines a module with a given name. The module is a function that returns an object containing the module's exports.

```js
factory.define('myModule', (factory) => {
    return freeze({
        myFunction: () => 'Hello from myModule!'
    });
});
```

### `factory.require(name)`

Loads and returns a module by its name. If the module has not been loaded before, it is executed and cached for future
use.

```js
const myModule = factory.require('myModule');
console.log(myModule.myFunction()); // Outputs: "Hello from myModule!"
```

### `factory.lazy(target, module, name)`

Lazily loads a specific module and attaches it to a target object (usually, a `prototype`)

```js
factory.lazy(myObject, 'myModule', 'myFunction');
console.log(myObject.myFunction()); // Outputs: "Hello from myModule!"
```

### Automation with factory.sh

To simplify the addition of new modules, the `factory.sh` bash script automatically updates `secureboot.js` with
references to all module files in the folder. Run the script after adding or removing modules:

```bash
./scripts/factory.sh
```

This ensures `secureboot.js` always contains the correct list of modules without manual intervention.

### Future Improvements

- Transition to Subresource Integrity (SRI) and native ES modules with import(map) statements.
- Enhanced Error Reporting and circular dependency collision prevention.
- The moon!
