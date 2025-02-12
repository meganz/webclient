'use strict';

function traverse(node) {
    while (node) {
        switch (node.type) {
            case 'CallExpression':
                node = node.callee;
                break;
            case 'MemberExpression':
                node = node.object;
                break;
            case 'Identifier':
                return node;
            default:
                node = null;
                break;
        }
    }
    return false;
}

function xpath(node, path) {
    path = String(path).split('/');

    var i = 0;
    var l = path.length;

    while (node && l > i) {
        const loc = path[i++].split('[');

        if ((node = node[loc[0]]) && loc.length > 1) {
            const [prop, value] = loc[1].slice(0, -1).split('=');

            if (node[prop] !== value) {
                node = null;
                break;
            }
        }
    }

    return node || false;
}

// Returns true if the function call node is attached to a jQuery element set.
function isjQuery(node) {
    const id = traverse(node);
    return id && id.name.startsWith('$');
}

function dump(what) {
    if (typeof what !== 'string') {
        what = require('util').inspect(what);
    }
    process.stderr.write(what + '\n');
}

const jQueryEVh = {'on': 1, 'off': 1, 'bind': 1, 'unbind': 1, 'one': 1, 'trigger': 1, 'rebind': 1};

module.exports = {
    'open': {
        meta: {
            docs: {
                description: 'Ensure safe window.open() calls.',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                Identifier(node) {
                    if (node.name === 'open') {
                        const parent = xpath(node, 'parent/type');
                        const args = 'MemberExpression' === parent ? xpath(node, 'parent/parent/arguments')
                            : parent === 'CallExpression' && xpath(node, 'parent/arguments');

                        if (args && (args.length < 3
                            || !String(args[2].value).includes('noopener')
                            || !String(args[2].value).includes('noreferrer'))) {

                            let a0 = args[0] || false;
                            if (a0.type === 'BinaryExpression') {
                                do {
                                    a0 = a0.left || false;
                                }
                                while (a0.type === 'BinaryExpression');
                            }
                            if (a0.type === 'CallExpression') {
                                a0 = a0.callee.name;
                            }
                            else if (a0.type === 'Literal') {
                                a0 = a0.value;
                            }

                            if (!/^(?:GET|POST|https:\/\/mega\.(?:nz|io)|get(?:App)?BaseUrl)\b/.test(a0)) {

                                context.report(node,
                                    'If this is a window.open() call, it must be explicitly invoked with noopener|noreferrer.'
                                );
                            }
                        }
                    }
                },
            };
        }
    },
    'good-boy': {
        meta: {
            docs: {
                description: 'Eslint rules for some safe practices.',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                FunctionExpression(node) {

                    if (node.id && node.id.name === 'populate_l') {
                        const escaped = new Set();
                        const unescaped = new Map();
                        const {body = false} = node.body;

                        for (let i = body.length; i--;) {
                            let {left, right} = xpath(body[i], 'expression[type=AssignmentExpression]');

                            if ((left = traverse(left)).name === 'l') {

                                switch ((right = traverse(right)).name) {
                                    case 'l': {
                                        const p = xpath(right, 'parent/property');
                                        unescaped.set(right, p.name || p.value);
                                        break;
                                    }
                                    case 'escapeHTML': {
                                        const p = xpath(left, 'parent/property');
                                        escaped.add(p.name || p.value);

                                        const [a0] = xpath(right, 'parent/arguments');
                                        if (a0.type === 'CallExpression' && traverse(a0).name === 'l') {

                                            context.report(a0,
                                                'This will yield a TypeError if the locale string becomes ' +
                                                'unavailable, wrap it in a template-literal if you do *really* ' +
                                                'have to mutate it prior to the escapeHTML() call.');
                                        }
                                        break;
                                    }
                                    default:
                                        if (right.type === 'Identifier') {

                                            context.report(right, `Missing call to escapeHTML(${right.name}*)`);
                                        }
                                }
                            }
                        }

                        for (const [node, value] of unescaped) {

                            if (!escaped.has(value)) {

                                context.report(node, `Missing call to escapeHTML(l['${value}'])`);
                            }
                        }
                    }
                },
            };
        }
    },
    'hints': {
        meta: {
            docs: {
                description: 'ESLint rule for some miscellaneous stuff.',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                MemberExpression(node) {
                    if (node.parent.type === 'AssignmentExpression') {
                        const {
                            object: {
                                name: o,
                                property: {name: op} = false
                            },
                            parent: {
                                right: {type: as} = false
                            },
                            property: {name: p}
                        } = node;

                        if (o === "$" && p === "dialog") {
                            context.report(node,
                                'Overwriting $.dialog is discouraged, handling of' +
                                ' new dialogs should be achieved through M.safeShowDialog(), see MR!1419');
                        }
                        else if ((o === 'location' && p === 'href')
                            || p === "location" && (o === "window" || o === 'self')) {

                            context.report(node,
                                'Assigning to (self|window).location.* will not work over our browser extension.');
                        }
                        else if (op === 'prototype' && as === 'ArrowFunctionExpression') {

                            context.report(node, 'Unexpected arrow-function assignment on prototypal method.');
                        }
                    }
                },
                NewExpression(node) {
                    if (node.callee.name === 'MegaPromise' && !node.arguments.length && node.parent.type !== 'CallExpression') {
                        context.report(node,
                            'New code should use the native Promise implementation instead of MegaPromise, ' +
                            'or provide an executor to the MegaPromise constructor. ' +
                            'The promisify() helper function is worth looking into as well.');
                    }
                },
                Identifier(node) {
                    // Enforce the use of toArray.apply(null, arguments)
                    if (node.name === "arguments" && xpath(node, 'parent/callee/property/name') !== 'apply') {
                        // do not complain about safe property access (i.e. length, or by idx)
                        if (xpath(node, 'parent/property/type') === false) {
                            context.report(node, 'The `arguments` object must not be passed or leaked anywhere.');
                        }
                    }
                },
                TryStatement(node) {
                    context.report(node,
                        'The use of try/catch statements can impact performance, they must be isolated ' +
                        'to a minimal function so that the main code is not affected. ' +
                        'I.e. consider using our tryCatch() helper.');
                }
            };
        }
    },
    'misc-warnings': {
        meta: {
            docs: {
                description: 'ESLint rule for some miscellaneous stuff.',
                category: 'enhancements',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                MemberExpression(node) {
                    const obj = node.object.name;
                    const prop = node.property.name;

                    if (prop === 'forEach') {
                        context.report(node, 'Prefer for() loops instead of Array.forEach');
                    }
                    else if (obj === 'localStorage' && !/^test|[Dd]ebug/.test(prop)) {
                        context.report(node, 'Do not abuse localStorage, ' +
                            'consider using sessionStorage or M.setPersistentData() instead.');
                    }
                }
            };
        }
    },
    'classes': {
        meta: {
            docs: {
                description: 'ESLint rules for es6+ classes and related.',
                category: 'suggestion',
                recommended: 'strict'
            },
            schema: []
        },
        create(context) {
            return {
                ClassBody(node) {
                    // xxx: Based on typescript-eslint/no-extraneous-class.ts
                    const {parent, body} = node;

                    if (parent && !parent.superClass) {

                        if (body.length === 0) {

                            context.report(node, 'Unexpected empty class.');
                        }
                        else {
                            let onlyStatic = true;
                            let onlyConstructor = true;

                            for (const prop of body) {

                                if (prop.kind === 'constructor') {

                                    if (prop.value.params.length) {
                                        onlyStatic = false;
                                        onlyConstructor = false;
                                    }
                                }
                                else {
                                    onlyConstructor = false;

                                    if ('static' in prop && !prop.static) {
                                        onlyStatic = false;
                                    }
                                }

                                if (!(onlyStatic || onlyConstructor)) {
                                    break;
                                }
                            }

                            if (onlyConstructor) {
                                context.report(node, 'Unexpected class with only a constructor.');
                            }
                            if (onlyStatic) {
                                context.report(node, 'Unexpected class with only static properties.');
                            }
                        }
                    }
                },
                VariableDeclaration(node) {
                    // xxx: like no-implicit-globals, but only for const/let (aka, lexicalBindings)

                    if (node.kind === "const" || node.kind === "let") {

                        if (node.parent && node.parent.type === 'Program') {

                            context.report(node, `Unexpected globally-scoped '${node.kind}' usage.`);
                        }
                    }
                }
            };
        }
    },
    'jquery-replacements': {
        meta: {
            docs: {
                description: 'ESLint rule to disallow and/or replace jQuery methods',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                CallExpression(node) {
                    if (node.callee.type === 'MemberExpression') {
                        const methods = ['html', 'append', 'prepend'];
                        const prop = node.callee.property.name;

                        if (methods.includes(prop) && isjQuery(node)) {
                            let alt = 'safe' + (prop === 'html' ? 'HTML' : (prop[0].toUpperCase() + prop.substr(1)));
                            let msg = `Please do use ${alt} instead of jQuery.${prop}`;

                            if (prop === 'html' && !node.arguments.length) {
                                msg = 'jQuery.html() is a discouraged method to deal with the DOM...';
                            }

                            context.report(node, msg);
                        }
                        else if (jQueryEVh[prop] && isjQuery(node)) {
                            if (prop === 'on') {
                                context.report(node, 'Prefer $.rebind to $.on and $.off + $.on');
                            }

                            const arg0 = node.arguments[0] || false;
                            if (arg0.type === 'Literal' && String(arg0.value).indexOf(',') !== -1) {
                                context.report(node, 'Unexpected comma, that is not a valid separator.');
                            }
                        }
                        else if ((prop === 'show' || prop === 'hide') && isjQuery(node)) {
                            let rep = prop === 'show' ? 'removeClass' : 'addClass';

                            context.report(node, `jQuery.${prop}() should be replaced with jQuery.${rep}('hidden')`);
                        }
                    }
                }
            };
        }
    },
    'jquery-scopes': {
        meta: {
            docs: {
                description: 'ESLint rule to suggest enhancements to jQuery namespaces/scopes',
                category: 'possible-enhancements',
                recommended: false
            },
            schema: []
        },
        create(context) {
            return {
                CallExpression(node) {
                    const arg0 = node.arguments[0];

                    if (node.callee.type === 'MemberExpression') {
                        const methods = ['unbind', 'rebind', 'off', 'on'];
                        const prop = node.callee.property.name;

                        if (methods.includes(prop) && isjQuery(node)
                            && arg0 && arg0.type === "Literal" && arg0.value && arg0.value.indexOf(".") === -1) {

                            context.report(node,
                                'Found "' + prop + '" call, but the event name was not containing a ' +
                                'namespace, which may cause accidental removal of other event handlers. ' +
                                'Please add namespace to ' + node.arguments[0].raw);
                        }
                    }
                    else if (isjQuery(node) && node.arguments.length === 1 && arg0.type === "Literal") {
                        context.report(node, 'Found unscoped/global DOM query: $(' + node.arguments[0].raw + ')');
                    }
                }
            };
        }
    },
};
