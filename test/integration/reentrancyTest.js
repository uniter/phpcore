/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('./tools');

describe('PHP reentrancy integration', function () {
    it('should support re-executing a module during a pause', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

do_pause_if_needed();

$getTrace = function () {
    return (new Exception)->getTraceAsString();
};

return [
    'trace' => $getTrace()
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            paused = false;
        engine.defineCoercingFunction('do_pause_if_needed', function () {
            if (paused) {
                return;
            }

            paused = true;

            return this.createFutureValue(function () {
                // Leave the future unresolved so the engine will be paused...
            });
        });
        // Perform the initial execution, which will pause indefinitely. Whilst paused...
        engine.execute();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'trace': nowdoc(function () {/*<<<EOS
#0 /path/to/my_module.php(10): {closure}()
#1 {main}
EOS
*/;}), //jshint ignore:line
        });
    });

    it('should support calling into an exported closure while one is paused', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstClosure = function () {
    do_pause();
};

$secondClosure = function () {
    return 'my result';
};

return [
    'first' => $firstClosure,
    'second' => $secondClosure
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedClosures;
        engine.defineCoercingFunction('do_pause', function () {
            return this.createFutureValue(function () {
                // Leave the future unresolved so the engine will be paused...
            });
        });
        exportedClosures = (await engine.execute()).getNative();
        // Call the first closure, which will pause indefinitely. Whilst paused...
        exportedClosures.first();

        // Call the second closure
        expect(await exportedClosures.second()).to.equal('my result');
    });

    it('should support resuming an earlier pause while a later one is in effect using exported closures', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstClosure = function () {
    do_first_pause();

    return 'my first result';
};

$secondClosure = function () {
    do_second_pause();

    return 'my second result';
};

return [
    'first' => $firstClosure,
    'second' => $secondClosure
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedClosures,
            firstPromise,
            secondPromise,
            resolveFirstPause,
            resolveSecondPause;
        engine.defineCoercingFunction('do_first_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveFirstPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        engine.defineCoercingFunction('do_second_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveSecondPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        exportedClosures = (await engine.execute()).getNative();
        // Call the first closure, which will pause indefinitely. Whilst paused...
        firstPromise = exportedClosures.first();
        // Call the second closure, which will also pause indefinitely. Whilst paused...
        secondPromise = exportedClosures.second();

        // Go back and resume the first pause while the second is also in effect.
        resolveFirstPause();
        expect(await firstPromise).to.equal('my first result');
        // Finally go back and resume the second pause.
        resolveSecondPause();
        expect(await secondPromise).to.equal('my second result');
    });

    it('should support resuming an earlier pause while a later one is in effect using instance methods of exported object', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function firstMethod()
    {
        do_first_pause();

        return 'my first result';
    }

    public function secondMethod()
    {
        do_second_pause();

        return 'my second result';
    }
}

return new MyClass;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedObject,
            firstPromise,
            secondPromise,
            resolveFirstPause,
            resolveSecondPause;
        engine.defineCoercingFunction('do_first_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveFirstPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        engine.defineCoercingFunction('do_second_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveSecondPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        exportedObject = (await engine.execute()).getNative();
        // Call the first method, which will pause indefinitely. Whilst paused...
        firstPromise = exportedObject.firstMethod();
        // Call the second method, which will also pause indefinitely. Whilst paused...
        secondPromise = exportedObject.secondMethod();

        // Go back and resume the first pause while the second is also in effect.
        resolveFirstPause();
        expect(await firstPromise).to.equal('my first result');
        // Finally go back and resume the second pause.
        resolveSecondPause();
        expect(await secondPromise).to.equal('my second result');
    });

    it('should support resuming an earlier pause while a later one is in effect using methods of imported JSObject', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myCallback = function ($myValue) {
    return $myValue . ' (via callback)';
};

// Wrap access to the methods otherwise the underlying JS object will simply be returned to JS-land.
return [
    'first' => function () use ($myObject, $myCallback) {
        return $myObject->firstMethod($myCallback);
    },
    'second' => function () use ($myObject, $myCallback) {
        return $myObject->secondMethod($myCallback);
    }
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedObject,
            firstPromise,
            secondPromise,
            resolveFirstPause,
            resolveSecondPause,
            waitFor = 2,
            resolveReady,
            oneReady = function () {
                waitFor--;

                if (waitFor === 0) {
                    resolveReady();
                }
            },
            readyPromise = new Promise(function (resolve) {
                resolveReady = resolve;
            });
        engine.defineGlobal('myObject', {
            firstMethod: function (myCallback) {
                return engine.createFFIResult(
                    function () {
                        throw new Error('This test should run in async mode and use the async callback');
                    },
                    function () {
                        return new Promise(function (resolve) {
                            resolveFirstPause = resolve;
                            // Promises always settle in a microtask so there will be a pause...

                            oneReady();
                        }).then(function () {
                            return myCallback('my first result');
                        });
                    }
                );
            },
            secondMethod: function (myCallback) {
                return engine.createFFIResult(
                    function () {
                        throw new Error('This test should run in async mode and use the async callback');
                    },
                    function () {
                        return new Promise(function (resolve) {
                            resolveSecondPause = resolve;
                            // Promises always settle in a microtask so there will be a pause...

                            oneReady();
                        }).then(function () {
                            return myCallback('my second result');
                        });
                    }
                );
            }
        });
        exportedObject = (await engine.execute()).getNative();
        // Call the first method, which will pause indefinitely. Whilst paused...
        firstPromise = exportedObject.first();
        // Call the second method, which will also pause indefinitely. Whilst paused...
        secondPromise = exportedObject.second();
        // Wait for both coroutines to finish pausing fully.
        await readyPromise;

        // Go back and resume the first pause while the second is also in effect.
        resolveFirstPause();
        expect(await firstPromise).to.equal('my first result (via callback)');
        // Finally go back and resume the second pause.
        resolveSecondPause();
        expect(await secondPromise).to.equal('my second result (via callback)');
    });

    it('should support resuming an earlier pause while a later one is in effect using imported functions (JSObject-wrapped)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myCallback = function ($myValue) {
    return $myValue;
};

return [
    'first' => function () use ($firstFunction, $myCallback) {
        return $firstFunction($myCallback);
    },
    'second' => function () use ($secondFunction, $myCallback) {
        return $secondFunction($myCallback);
    }
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedObject,
            firstPromise,
            secondPromise,
            resolveFirstPause,
            resolveSecondPause,
            waitFor = 2,
            resolveReady,
            oneReady = function () {
                waitFor--;

                if (waitFor === 0) {
                    resolveReady();
                }
            },
            readyPromise = new Promise(function (resolve) {
                resolveReady = resolve;
            });
        engine.defineGlobal('firstFunction', function (myCallback) {
            return engine.createFFIResult(
                function () {
                    throw new Error('This test should run in async mode and use the async callback');
                },
                function () {
                    return new Promise(function (resolve) {
                        resolveFirstPause = resolve;
                        // Promises always settle in a microtask so there will be a pause...

                        oneReady();
                    }).then(function () {
                        return myCallback('my first result');
                    });
                }
            );
        });
        engine.defineGlobal('secondFunction', function (myCallback) {
            return engine.createFFIResult(
                function () {
                    throw new Error('This test should run in async mode and use the async callback');
                },
                function () {
                    return new Promise(function (resolve) {
                        resolveSecondPause = resolve;
                        // Promises always settle in a microtask so there will be a pause...

                        oneReady();
                    }).then(function () {
                        return myCallback('my second result');
                    });
                }
            );
        });
        exportedObject = (await engine.execute()).getNative();
        // Call the first method, which will pause indefinitely. Whilst paused...
        firstPromise = exportedObject.first();
        // Call the second method, which will also pause indefinitely. Whilst paused...
        secondPromise = exportedObject.second();
        // Wait for both coroutines to finish pausing fully.
        await readyPromise;

        // Go back and resume the first pause while the second is also in effect.
        resolveFirstPause();
        expect(await firstPromise).to.equal('my first result');
        // Finally go back and resume the second pause.
        resolveSecondPause();
        expect(await secondPromise).to.equal('my second result');
    });

    it('should support resuming an earlier pause while a later one is in effect using exported closures in different namespace scopes', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\First
{
    $firstClosure = function () {
        do_first_pause();

        return 'my first result from "' . __NAMESPACE__ . '"';
    };
}

namespace My\Second
{
    $secondClosure = function () {
        do_second_pause();

        return 'my second result from "' . __NAMESPACE__ . '"';
    };
}

namespace My\Third
{
    return [
        'first' => $firstClosure,
        'second' => $secondClosure
    ];
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            exportedClosures,
            firstPromise,
            secondPromise,
            resolveFirstPause,
            resolveSecondPause;
        engine.defineCoercingFunction('do_first_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveFirstPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        engine.defineCoercingFunction('do_second_pause', function () {
            return this.createFutureValue(function (resolve) {
                resolveSecondPause = resolve;
                // Leave the future unresolved so the engine will be paused...
            });
        });
        exportedClosures = (await engine.execute()).getNative();
        // Call the first closure, which will pause indefinitely. Whilst paused...
        firstPromise = exportedClosures.first();
        // Call the second closure, which will also pause indefinitely. Whilst paused...
        secondPromise = exportedClosures.second();

        // Go back and resume the first pause while the second is also in effect.
        resolveFirstPause();
        expect(await firstPromise).to.equal('my first result from "My\\First"');
        // Finally go back and resume the second pause.
        resolveSecondPause();
        expect(await secondPromise).to.equal('my second result from "My\\Second"');
    });
});
