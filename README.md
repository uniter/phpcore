PHPCore
=======

[![Build Status](https://github.com/uniter/phpcore/workflows/CI/badge.svg)](https://github.com/uniter/phpcore/actions?query=workflow%3ACI)

Minimal PHP core library for PHP environments.

Who would use this?
-------------------
After getting started with [Uniter][] and [PHPRuntime][], you might want only a subset of the standard PHP library.
You can include PHPCore and then only expose the builtin functions, classes or constants you need.

```javascript
var phpCore = require('phpcore');

phpCore.install({
    functionGroups: [
        function (internals) {
            return {
                'add_one_to': function (argReference) {
                    return internals.valueFactory.createInteger(argReference.getNative() + 1);
                }
            };
        }
    ],
    classes: {
        'TwentyOne': function () {
            function TwentyOne() {}

            TwentyOne.prototype.getIt = function () {
                return 21;
            };

            return TwentyOne;
        },
        'My\\Tools\\Worker': function () {
            function Worker() {}

            Worker.prototype.run = function () {
                console.log('running');
            };

            return Worker;
        }
    },
    constantGroups: [
        function (internals) {
            return {
                'MY_CONSTANT': 1000
            };
        }
    ]
});

phpCore.compile(
    // Example JS code transpiled from PHP by PHPToJS:
    function (stdin, stdout, stderr, tools, namespace) {
        var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;
        return tools.valueFactory.createInteger(
            namespaceScope.getConstant('MY_CONSTANT').getNative() +
            namespaceScope.getFunction('add_one_to')(tools.valueFactory.createInteger(21)).getNative()
        );
    }
)().execute().then(function (result) {
    console.log(result.unwrapForJS()); // Prints "1022"
});
```

Keeping up to date
------------------
- [Follow me on Twitter](https://twitter.com/@asmblah) for updates: [https://twitter.com/@asmblah](https://twitter.com/@asmblah)

[Uniter]: https://github.com/asmblah/uniter
[PHPRuntime]: https://github.com/uniter/phpruntime
