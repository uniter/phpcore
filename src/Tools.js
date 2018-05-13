/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('phpcommon'),
    require('./Debug/DebugVariable'),
    require('./KeyValuePair'),
    require('./List'),
    require('./Exception/LoadFailedException')
], function (
    _,
    phpCommon,
    DebugVariable,
    KeyValuePair,
    List,
    LoadFailedException
) {
    var Exception = phpCommon.Exception,
        hasOwn = {}.hasOwnProperty,
        EVAL_OPTION = 'eval',
        INCLUDE_OPTION = 'include',
        TICK_OPTION = 'tick',
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    /**
     * @param {CallStack} callStack
     * @param {Environment} environment
     * @param {Namespace} globalNamespace
     * @param {Loader} loader
     * @param {Module} module
     * @param {Object} options
     * @param {string} path
     * @param {ReferenceFactory} referenceFactory
     * @param {ScopeFactory} scopeFactory
     * @param {NamespaceScope} topLevelNamespaceScope
     * @param {Scope} topLevelScope
     * @param {ValueFactory} valueFactory
     * @constructor
     */
    function Tools(
        callStack,
        environment,
        globalNamespace,
        loader,
        module,
        options,
        path,
        referenceFactory,
        scopeFactory,
        topLevelNamespaceScope,
        topLevelScope,
        valueFactory
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Environment}
         */
        this.environment = environment;
        /**
         * @type {Namespace}
         */
        this.globalNamespace = globalNamespace;
        /**
         * @type {Object.<string, boolean>}
         */
        this.includedPaths = {};
        /**
         * @type {Loader}
         */
        this.loader = loader;
        /**
         * @type {Module}
         */
        this.module = module;
        /**
         * @type {Object}
         */
        this.options = options;
        /**
         * @type {string}
         */
        this.path = path;
        /**
         * @type {ReferenceFactory}
         * @public Referenced from transpiled code
         */
        this.referenceFactory = referenceFactory;
        /**
         * @type {ScopeFactory}
         */
        this.scopeFactory = scopeFactory;
        /**
         * @type {NamespaceScope}
         * @public Referenced from transpiled code
         */
        this.topLevelNamespaceScope = topLevelNamespaceScope;
        /**
         * @type {Scope}
         * @public Referenced from transpiled code
         */
        this.topLevelScope = topLevelScope;
        /**
         * @type {ValueFactory}
         * @public Referenced from transpiled code
         */
        this.valueFactory = valueFactory;
    }

    _.extend(Tools.prototype, {
        /**
         * Creates an ObjectValue that wraps an instance of the builtin PHP Closure class
         * whose behaviour is defined by the provided function
         *
         * @param {Function} func
         * @param {Scope} scope
         * @return {ObjectValue}
         */
        createClosure: function (func, scope) {
            var tools = this;

            return tools.valueFactory.createObject(
                scope.createClosure(func),
                tools.globalNamespace.getClass('Closure')
            );
        },

        /**
         * Creates a DebugVariable, for showing the value of a variable in the scope
         * inside Google Chrome's developer tools
         *
         * @param {Scope} scope
         * @param {string} variableName
         * @return {DebugVariable}
         */
        createDebugVar: function (scope, variableName) {
            return new DebugVariable(scope, variableName);
        },

        /**
         * Used by transpiled PHP `new MyClass(<args>)` expressions
         *
         * @param {NamespaceScope} namespaceScope
         * @param {Value} classNameValue
         * @param {Value[]} args Arguments to pass to the constructor
         * @return {ObjectValue}
         */
        createInstance: function (namespaceScope, classNameValue, args) {
            return classNameValue.instantiate(args, namespaceScope);
        },

        /**
         * Creates a new KeyValuePair
         *
         * @param {Value} key
         * @param {Value} value
         * @return {KeyValuePair}
         */
        createKeyValuePair: function (key, value) {
            return new KeyValuePair(key, value);
        },

        /**
         * Creates a new List, which is a list of references that may be assigned to
         * by assigning them an array, where each list element gets the corresponding array element
         *
         * @param {Reference[]} elements
         * @return {List}
         */
        createList: function (elements) {
            return new List(this.valueFactory, elements);
        },

        /**
         * Creates a new NamespaceScope
         *
         * @param {Namespace} namespace
         * @return {NamespaceScope}
         */
        createNamespaceScope: function (namespace) {
            var tools = this;

            return tools.scopeFactory.createNamespaceScope(namespace, tools.globalNamespace, tools.module);
        },

        /**
         * Evaluates the given PHP code using the configured `eval` option
         *
         * @param {string} code
         * @param {Scope} evalScope
         * @return {Value}
         */
        eval: function (code, evalScope) {
            var tools = this;

            if (!tools.options[EVAL_OPTION]) {
                throw new Exception(
                    'eval(...) :: No "eval" interpreter option is available.'
                );
            }

            return tools.loader.load(
                'eval',
                // Use the path to the script that called eval() along with this suffix
                // as the path to the current file inside the eval
                tools.path + ' : eval()\'d code',
                tools.options,
                tools.environment,
                tools.module,
                evalScope,
                function (path, promise, parentPath, valueFactory) {
                    return tools.options[EVAL_OPTION]('<?php ' + code, path, promise, parentPath, valueFactory);
                }
            );
        },

        /**
         * Immediately exits the currently executing PHP script. This is achieved
         * by throwing a JS error that cannot be caught by any PHP-land try..catch statement.
         * If the program was run from a command-line, any exit status provided will be used
         * as the exit code for the process.
         *
         * @param {Value|null} statusValue
         * @throws {ExitValue}
         */
        exit: function (statusValue) {
            throw this.valueFactory.createExit(statusValue);
        },

        /**
         * Fetches the name of the specified class, wrapped as a StringValue
         *
         * @param {Class} classObject
         * @returns {StringValue}
         */
        getClassName: function (classObject) {
            return this.valueFactory.createString(classObject.getName());
        },

        /**
         * Fetches a human-readable string representing the path to the current script file
         *
         * @return {string}
         */
        getNormalizedPath: function () {
            var tools = this;

            return tools.path === null ? '(program)' : tools.path;
        },

        /**
         * Fetches the name of the parent of the specified class, wrapped as a StringValue
         *
         * @param {Class} classObject
         * @returns {StringValue}
         */
        getParentClassName: function (classObject) {
            var superClass = classObject.getSuperClass();

            if (!superClass) {
                // Fatal error: Uncaught Error: Cannot access parent:: when current class scope has no parent
                throw new PHPFatalError(PHPFatalError.NO_PARENT_CLASS);
            }

            return this.valueFactory.createString(superClass.getName());
        },

        /**
         * Fetches the path to the current script, wrapped as a StringValue
         *
         * @return {StringValue}
         */
        getPath: function () {
            var tools = this;

            return tools.valueFactory.createString(tools.getNormalizedPath());
        },

        /**
         * Fetches the path to the directory containing the current script, wrapped as a StringValue
         *
         * @return {StringValue}
         */
        getPathDirectory: function () {
            var tools = this;

            return tools.valueFactory.createString(tools.getNormalizedPath().replace(/\/[^\/]+$/, ''));
        },

        /**
         * Assigns the provided variable a new array value if it is not currently defined
         * or defined with a value of NULL, then returns its current value
         *
         * @param {Reference|Variable} variable
         * @return {Value}
         */
        implyArray: function (variable) {
            // Undefined variables and variables containing null may be implicitly converted to arrays
            if (!variable.isDefined() || variable.getValue().getType() === 'null') {
                variable.setValue(this.valueFactory.createArray([]));
            }

            return variable.getValue();
        },

        /**
         * Assigns the provided variable a new stdClass instance value if it is not currently defined
         * or defined with a value of NULL, then returns its current value
         *
         * @param {Reference|Variable} variable
         * @return {Reference|Variable}
         */
        implyObject: function (variable) {
            // FIXME: If the given variable/reference does not have an object as its value:
            //  `PHP Warning: Creating default object from empty value`
            return variable.getValue();
        },

        /**
         * Includes the specified module if it has not been included yet.
         * If it has not already been included, the module's return value is returned,
         * otherwise boolean true will be returned.
         * Throws if no include transport has been configured.
         *
         * @param {string} includedPath
         * @param {Scope} includeScope
         * @return {Value}
         */
        includeOnce: function (includedPath, includeScope) {
            var tools = this;

            if (hasOwn.call(tools.includedPaths, includedPath)) {
                return tools.valueFactory.createBoolean(true);
            }

            tools.includedPaths[includedPath] = true;

            return tools.include(includedPath, includeScope);
        },

        /**
         * Includes the specified module, returning its return value.
         * Throws if no include transport has been configured.
         *
         * @param {string} includedPath
         * @param {Scope} includeScope
         * @return {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        include: function (includedPath, includeScope) {
            var tools = this;

            if (!tools.options[INCLUDE_OPTION]) {
                throw new Exception(
                    'include(' + includedPath + ') :: No "include" transport is available for loading the module.'
                );
            }

            try {
                return tools.loader.load(
                    'include',
                    includedPath,
                    tools.options,
                    tools.environment,
                    tools.module,
                    includeScope,
                    function (path, promise, parentPath, valueFactory) {
                        return tools.options[INCLUDE_OPTION](path, promise, parentPath, valueFactory);
                    }
                );
            } catch (error) {
                if (!(error instanceof LoadFailedException)) {
                    // Rethrow for anything other than the expected possible exception(s) trying to load the module
                    throw error;
                }

                tools.callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(' + includedPath + '): failed to open stream: No such file or directory'
                );
                tools.callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(): Failed opening \'' + includedPath + '\' for inclusion'
                );

                return tools.loader.valueFactory.createBoolean(false);
            }
        },

        /**
         * Used for providing a function for fetching the last line executed in the current scope
         *
         * @param {function} finder
         */
        instrument: function (finder) {
            this.callStack.instrumentCurrent(finder);
        },

        requireOnce: function () {
            // FIXME: This should not be identical to include() or require()

            return this.include.apply(this, arguments);
        },

        require: function () {
            // FIXME: This should not be identical to include()

            return this.include.apply(this, arguments);
        },

        /**
         * Throws an "unable to break/continue" fatal error
         *
         * @param {number} levels
         * @throws {PHPFatalError}
         */
        throwCannotBreakOrContinue: function (levels) {
            throw new PHPFatalError(PHPFatalError.CANNOT_BREAK_OR_CONTINUE, {
                'levels': levels,
                'suffix': levels === 1 ? '' : 's'
            });
        },

        /**
         * Calls the configured tick handler with the current statement's position data.
         * PHPToJS inserts calls to this method when ticking is enabled.
         *
         * @param {number} startLine
         * @param {number} startColumn
         * @param {number} endLine
         * @param {number} endColumn
         * @throws {Exception} When no tick handler has been configured
         */
        tick: function (startLine, startColumn, endLine, endColumn) {
            var tools = this;

            if (!tools.options[TICK_OPTION]) {
                throw new Exception('tick(...) :: No "tick" handler option is available.');
            }

            tools.options[TICK_OPTION].call(null, tools.path, startLine, startColumn, endLine, endColumn);
        }
    });

    return Tools;
}, {strict: true});
