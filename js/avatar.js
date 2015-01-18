/**
 * Avatar Picker
 * https://bitbucket.org/atlassianlabs/avatar-picker/
 * A combination of the source files required for the avatar dialog to work.
 */


//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.
(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

window.CanvasCropper = (function(){
    function CanvasCropper(width, height){
        if (!CanvasCropper.isSupported()) {
            throw new Error("This browser doesn't support CanvasCropper.");
        }
        return this.init.apply(this, arguments);
    }

    var supportsCanvas = (function() {
        var canvas = document.createElement('canvas');
        return (typeof canvas.getContext === 'function') && canvas.getContext('2d');
    }());

    CanvasCropper.isSupported = function() {
        return supportsCanvas;
    };

    CanvasCropper.prototype.defaults = {
        outputFormat: 'image/jpeg',
        backgroundFillColor: undefined
    };

    CanvasCropper.prototype.init = function(width, height, opts) {
        this.width = width;
        this.height = height || width; //Allow single param for square crop
        this.options = $.extend({}, this.defaults, opts);
        this.canvas = $('<canvas/>')
            .attr('width', this.width)
            .attr('height', this.height)
            [0];
        return this;
    };

    CanvasCropper.prototype.cropToDataURI = function(image, sourceX, sourceY, cropWidth, cropHeight) {
        return this
                .crop(image, sourceX, sourceY, cropWidth, cropHeight)
                .getDataURI(this.options.outputFormat);
    };

    CanvasCropper.prototype.crop = function(image, sourceX, sourceY, cropWidth, cropHeight) {
        var context = this.canvas.getContext('2d'),
            targetX = 0,
            targetY = 0,
            targetWidth = this.width,
            targetHeight = this.height;

        context.clearRect(targetX, targetY, targetWidth, targetHeight);

        if (this.options.backgroundFillColor) {
            context.fillStyle = this.options.backgroundFillColor;
            context.fillRect(targetX, targetY, targetWidth, targetHeight);
        }

        /*
         *** Negative sourceX or sourceY ***
         context.drawImage can't accept negative values for source co-ordinates,
         but what you probably meant is you want to do something like the below

         |-------------------|
         |                   |
         |   CROP AREA       |
         |                   |
         |        |----------|----------------|
         |        |          |                |
         |        |          |   IMAGE        |
         |        |          |                |
         |-------------------|                |
                  |                           |
                  |                           |
                  |                           |
                  |                           |
                  |---------------------------|

         We need to do a couple of things to make that work.
         1. Set the target position to the proportional location of the source position
         2. Set source co-ordinates to 0
         */

        if (sourceX < 0) {
            targetX = Math.round((Math.abs(sourceX) / cropWidth) * targetWidth);
            sourceX = 0;
        }

        if (sourceY < 0) {
            targetY = Math.round((Math.abs(sourceY) / cropHeight) * targetHeight);
            sourceY = 0;
        }

        /*
         *** source co-ordinate + cropSize > image size ***
         context.drawImage can't accept a source co-ordinate and a crop size where their sum
         is greater than the image size. Again, below is probably what you wanted to achieve.


         |---------------------------|
         |                           |
         |       IMAGE               |
         |                           |
         |                           |
         |               |-----------|-------|
         |               |           |       |
         |               |     X     |       |
         |               |           |       |
         |---------------|-----------|       |
                         |                   |
                         |   CROP AREA       |
                         |                   |
                         |-------------------|

         We need to do a couple of things to make that work also.
         1. Work out the size of the actual image area to be cropped (X).
         2. Get the proportional size of the target based on the above
         3. Set the crop size to the actual crop size.
         */

        if (sourceX + cropWidth > image.naturalWidth) {
            var newCropWidth = image.naturalWidth - sourceX;
            targetWidth *= newCropWidth / cropWidth;
            cropWidth = newCropWidth;
        }

        if (sourceY + cropHeight > image.naturalHeight) {
            var newCropHeight = image.naturalHeight - sourceY;
            targetHeight *= newCropHeight / cropHeight;
            cropHeight = newCropHeight;
        }

        context.canvas.width = 250;
        context.canvas.height = 250;
        context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, targetX, targetY, 250, 250);

        return this;
    };

    CanvasCropper.prototype.getDataURI = function(outputFormat) {
        if (outputFormat) { //TODO: Check if in array of valid mime types
            return this.canvas.toDataURL("image/jpeg", 0.85);
        } else {
            return null;
        }
    };

    return CanvasCropper;
})();

window.ClientFileHandler = (function(){

    function ClientFileHandler(opts){
        return this.init(opts);
    }

    ClientFileHandler.typeFilters = {
        all: /.*/,
        application: /^application\/.*/,
        audio: /^audio\/.*/,
        image: /^image\/.*/,
        imageWeb: /^image\/(jpeg|png|gif)$/,
        text: /^text\/.*/,
        video: /^video\/.*/
    };

    ClientFileHandler.prototype.defaults = {
        fileTypeFilter: ClientFileHandler.typeFilters.all, //specify a regex or use one of the built in typeFilters
        fileCountLimit: Infinity, //How many files can a user upload at once? This will limit it to the first n files,
        fileSizeLimit: 20 * 1024 * 1024, //Maximum file size in bytes (20MB per file),
        onSuccess: $.noop,
        onError: $.noop
    };

    ClientFileHandler.prototype.init = function(opts){
        this.options = $.extend({}, this.defaults, opts);

        if (opts && !opts.fileSizeLimit) {
            this.options.fileSizeLimit = this.defaults.fileSizeLimit;
        }
        if (opts && !opts.fileCountLimit) {
            this.options.fileCountLimit = this.defaults.fileCountLimit;
        }

        _.bindAll(this, 'handleFiles', 'filterFiles');

        return this;
    };

    /**
     * Takes in an array of files, processes them, and fires the onSuccess handler if any are valid, or the onError handler
     * otherwise. These handlers can be specified on the options object passed to the constructor.
     * @param fileList array of objects like { size:Number, type:String }
     * @param fileSourceElem - Unused. Matches IframeUploader interface
     */
    ClientFileHandler.prototype.handleFiles = function(fileList, fileSourceElem){
        //Assumes any number of files > 0 is a success, else it's an error
        var filteredFiles = this.filterFiles(fileList);

        if (filteredFiles.valid.length > 0) {
            //There was at least one valid file
            _.isFunction(this.options.onSuccess) && this.options.onSuccess(filteredFiles.valid);
        } else {
            //there were no valid files added
            _.isFunction(this.options.onError) && this.options.onError(filteredFiles.invalid);
        }
    };

    ClientFileHandler.prototype.filterFiles = function(fileList){
        var fileTypeFilter = _.isRegExp(this.options.fileTypeFilter) ? this.options.fileTypeFilter : this.defaults.fileTypeFilter,
            fileSizeLimit = this.options.fileSizeLimit,
            invalid = {
                byType: [],
                bySize: [],
                byCount: []
            },
            valid = _.filter(fileList, function(file){

                if (!fileTypeFilter.test(file.type)) {
                    invalid.byType.push(file);
                    return false;
                }

                if (file.size > fileSizeLimit) {
                    invalid.bySize.push(file);
                    return false;
                }

                return true;
            });

        if (valid.length > this.options.fileCountLimit) {
            invalid.byCount = valid.slice(this.options.fileCountLimit);
            valid = valid.slice(0, this.options.fileCountLimit);
        }

        return {
            valid: valid,
            invalid: invalid
        };
    };

    return ClientFileHandler;

})();

window.ClientFileReader = (function(){

    var fileReaderSupport = !!(window.File && window.FileList && window.FileReader);

    var _readMethodMap = {
        ArrayBuffer : 'readAsArrayBuffer',
        BinaryString: 'readAsBinaryString',
        DataURL : 'readAsDataURL',
        Text : 'readAsText'
    };

    function ClientFileReader(opts){
        if (!ClientFileReader.isSupported()) {
            throw new Error("ClientFileReader requires FileReaderAPI support");
        }
        return this.init(opts);
    }

    ClientFileReader.isSupported = function() {
        return fileReaderSupport;
    };

    $.extend(ClientFileReader.prototype, ClientFileHandler.prototype);



    ClientFileReader.readMethods = {
        ArrayBuffer : 'ArrayBuffer',
        BinaryString: 'BinaryString',
        DataURL : 'DataURL',
        Text : 'Text'
    };

    ClientFileReader.typeFilters = ClientFileHandler.typeFilters; //Expose this to the calling code

    ClientFileReader.prototype.defaults = $.extend({}, ClientFileHandler.prototype.defaults, {
        readMethod: ClientFileReader.readMethods.DataURL,
        onRead: $.noop
    });

    ClientFileReader.prototype.init = function(opts) {
        _.bindAll(this, 'onSuccess', 'readFile');
        ClientFileHandler.prototype.init.call(this, opts);

        this.options.onSuccess = this.onSuccess; //We don't want this to be optional.
        return this;
    };

    ClientFileReader.prototype.onSuccess = function(files) {
        var readMethod = _.has(_readMethodMap, this.options.readMethod) ? _readMethodMap[this.options.readMethod] : undefined;

        if (readMethod) {
            _.each(files, _.bind(function(file){
                var fileReader = new FileReader();
                fileReader.onload = _.bind(this.readFile, this, file); //pass the file handle to allow callback access to filename, size, etc.
                fileReader[readMethod](file);
            }, this));
        }
    };

    ClientFileReader.prototype.readFile = function(file, fileReaderEvent){
        _.isFunction(this.options.onRead) && this.options.onRead(fileReaderEvent.target.result, file);
    };

    return ClientFileReader;
})();

window.DragDropFileTarget = (function(){

    function DragDropFileTarget(el, opts){
        return this.init.apply(this, arguments);
    }

    DragDropFileTarget.prototype.getDefaults = function() {
        return {
            activeDropTargetClass: 'active-drop-target',
            uploadPrompt: 'Drag a file here to upload',
            clientFileHandler: null
        };
    };

    DragDropFileTarget.prototype.init = function(el, opts){
        _.bindAll(this, 'onDragOver', 'onDragEnd', 'onDrop');

        this.$target = $(el);
        this.options = $.extend({}, this.getDefaults(), opts);

        this.$target.attr('data-upload-prompt', this.options.uploadPrompt);

        //bind drag & drop events
        this.$target.on('dragover', this.onDragOver);
        this.$target.on('dragleave', this.onDragEnd);
        this.$target.on('dragend', this.onDragEnd);
        this.$target.on('drop', this.onDrop);
    };

    DragDropFileTarget.prototype.onDragOver = function(e){
        e.preventDefault();
        this.$target.addClass(this.options.activeDropTargetClass);
    };

    DragDropFileTarget.prototype.onDragEnd = function(e){
        e.preventDefault();
        this.$target.removeClass(this.options.activeDropTargetClass);
    };

    DragDropFileTarget.prototype.onDrop = function(e){
        e.preventDefault();
        e.originalEvent.preventDefault();

        this.$target.removeClass(this.options.activeDropTargetClass);

        if (this.options.clientFileHandler) {
            this.options.clientFileHandler.handleFiles(e.originalEvent.dataTransfer.files, e.originalEvent.target);
        }
    };

    return DragDropFileTarget;
})();

window.UploadInterceptor = (function(){

    function UploadInterceptor(el, opts){
        return this.init.apply(this, arguments);
    }

    UploadInterceptor.prototype.defaults = {
        replacementEl: undefined,
        clientFileHandler: null
    };

    UploadInterceptor.prototype.init = function(el, opts) {
        _.bindAll(this, 'onSelectFile', 'onReplacementClick');

        this.$el = $(el);
        this.options = $.extend({}, this.defaults, opts);

        this.$el.on('change', this.onSelectFile);

        if (this.options.replacementEl) {
            this.$replacement = $(this.options.replacementEl);
            this.$el.hide();

            // IE marks a file input as compromised if has a click triggered programmatically
            // and this prevents you from later submitting it's form via Javascript.
            // The work around is to use a label as the replacementEl with the `for` set to the file input,
            // but it requires that the click handler below not be bound. So regardless of whether you want
            // to use the workaround or not, the handler should not be bound in IE.
            if ($.browser && $.browser.msie) {
                if (!this.$replacement.is('label')) {
                    // Workaround is not being used, fallback to showing the regular file element and hide the replacement
                    this.$replacement.hide();
                    this.$el.show();
                }
            } else {
                this.$replacement.on('click', this.onReplacementClick);
            }
        }
    };

    UploadInterceptor.prototype.onSelectFile = function(e){
        if ($(e.target).val() && this.options.clientFileHandler) {
            this.options.clientFileHandler.handleFiles(e.target.files, this.$el);
        }
    };

    UploadInterceptor.prototype.onReplacementClick = function(e){
        e.preventDefault();
        this.$el.click();
    };

    UploadInterceptor.prototype.destroy = function(){
        this.$el.off('change', this.onSelectFile);
        this.$replacement.off('click', this.onReplacementClick);
    };

    return UploadInterceptor;
})();

window.ImageExplorer = (function(){

    function ImageExplorer($container, opts){
        this.init.apply(this, arguments);
    }

    ImageExplorer.scaleModes = {
        fill: 'fill',
        contain: 'contain',
        containAndFill: 'containAndFill'
    };

    ImageExplorer.zoomModes = {
        localZoom: 'localZoom', //Keep the area under the mask centered so you zoom further in on the same location.
        imageZoom: 'imageZoom' //Keep the image centered in its current location, so unless the image is centered under the mask, the area under the mask will change.
    };

    ImageExplorer.prototype.defaults = {
        initialScaleMode: ImageExplorer.scaleModes.containAndFill,
        zoomMode: ImageExplorer.zoomModes.localZoom,
        emptyClass: 'empty',
        scaleMax: 1 //Maximum image size is 100% (is overridden by whatever the initial scale is calculated to be)
    };

    ImageExplorer.prototype.init = function($container, opts){
        this.$container      = $container;
        this.$imageView      = this.$container.find('.image-explorer-image-view');
        this.$sourceImage    = this.$container.find('.image-explorer-source');
        this.$mask           = this.$container.find('.image-explorer-mask');
        this.$dragDelegate   = this.$container.find('.image-explorer-drag-delegate');
        this.$scaleSlider    = this.$container.find('.image-explorer-scale-slider');
        this.options         = $.extend({}, this.defaults, opts);
        this.imageProperties = {};

        _.bindAll(this, 'getImageSrc', 'setImageSrc', 'initImage', 'initDragDelegate', 'initScaleSlider', 'setInitialScale',
            'getFillScale', 'getContainedScale', 'getCircularContainedScale', 'sliderValToScale', 'scaleToSliderVal',
            'updateImageScale', 'resetImagePosition', 'resetScaleSlider', 'toggleEmpty', 'get$ImageView', 'get$SourceImage',
            'get$Mask', 'get$DragDelegate', 'getMaskedImageProperties', 'showError', 'clearError', 'hasValidImage',
            '_resetFromError', '_removeError');

        this.toggleEmpty(true); //assume the explorer is empty initially and override below if otherwise

        if (this.$sourceImage[0].naturalWidth) {
            //The image has already loaded (most likely because the src was specified in the html),
            //so remove the empty class and call initImage passing through a fake event object with the target
            this.toggleEmpty(false);

            this.initImage({
                target:this.$sourceImage[0]
            });
        }

        this.$sourceImage.on('load', this.initImage);

        this.initDragDelegate();
        this.initScaleSlider();
    };

    ImageExplorer.prototype.getImageSrc = function(){
        return (this.$sourceImage) ? this.$sourceImage.attr('src') : undefined;
    };

    ImageExplorer.prototype.setImageSrc = function(src){
        if (this.$sourceImage) {
            this.$sourceImage.attr('src', '').attr('src', src); //Force image to reset if the user uploads the same image
        }
    };

    ImageExplorer.prototype.initImage = function(e){
        var image = e.target;
        this.imageProperties.naturalWidth = image.naturalWidth;
        this.imageProperties.naturalHeight = image.naturalHeight;

        this._removeError();
        this.toggleEmpty(false);
        this.setInitialScale();
    };

    ImageExplorer.prototype.initDragDelegate = function(){
        var imageOffset;

        this.$dragDelegate.draggable({
            start: _.bind(function(){
                imageOffset = this.$sourceImage.offset();
            }, this),
            drag: _.bind(function(e, ui){
                this.$sourceImage.offset({
                    top: imageOffset.top + ui.position.top - ui.originalPosition.top,
                    left: imageOffset.left + ui.position.left - ui.originalPosition.left
                });
            }, this),
            revert: true,
            revertDuration: 0
        });
    };

    ImageExplorer.prototype.initScaleSlider = function(){
        this.$scaleSlider.on('change', _.bind(function(e){
            this.updateImageScale(this.sliderValToScale(e.target.value));
        }, this));
    };

    ImageExplorer.prototype.setInitialScale = function(){
        var maskWidth = this.$mask.width(),
            maskHeight =this.$mask.height(),
            naturalWidth = this.imageProperties.naturalWidth,
            naturalHeight = this.imageProperties.naturalHeight,
            initialScale = 1;

        this.minScale = 1;

        switch(this.options.initialScaleMode) {
            case ImageExplorer.scaleModes.fill:
                //sets the scale of the image to the smallest size possible that completely fills the mask.
                this.minScale = initialScale = this.getFillScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
            break;

            case ImageExplorer.scaleModes.contain:
                //Sets the scale of the image so that the entire image is visible inside the mask.
                if (this.$mask.hasClass('circle-mask')) {
                    this.minScale = initialScale = this.getCircularContainedScale(naturalWidth, naturalHeight, maskWidth / 2);
                } else {
                    this.minScale = initialScale = this.getContainedScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
                }
            break;

            case ImageExplorer.scaleModes.containAndFill:
                //Set the min scale so that the lower bound is the same as scaleModes.contain, but the initial scale is scaleModes.fill
                if (this.$mask.hasClass('circle-mask')) {
                    this.minScale = this.getCircularContainedScale(naturalWidth, naturalHeight, maskWidth / 2);
                } else {
                    this.minScale = this.getContainedScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
                }

                initialScale = this.getFillScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
            break;
        }

        this.maxScale = Math.max(initialScale, this.options.scaleMax);
        this.resetScaleSlider(this.scaleToSliderVal(initialScale));
        //Always use ImageExplorer.zoomModes.imageZoom when setting the initial scale to center the image.
        this.updateImageScale(initialScale, ImageExplorer.zoomModes.imageZoom);
        this.resetImagePosition();
    };

    ImageExplorer.prototype.getFillScale = function(imageWidth, imageHeight, constraintWidth, constraintHeight){
        var widthRatio = constraintWidth / imageWidth,
            heightRatio = constraintHeight / imageHeight;
        return Math.max(widthRatio, heightRatio);
    };

    ImageExplorer.prototype.getContainedScale = function(imageWidth, imageHeight, constraintWidth, constraintHeight){
        var widthRatio = constraintWidth / imageWidth,
            heightRatio = constraintHeight / imageHeight;
        return Math.min(widthRatio, heightRatio);
    };

    ImageExplorer.prototype.getCircularContainedScale = function(imageWidth, imageHeight, constraintRadius){
        var theta = Math.atan(imageHeight / imageWidth),
            scaledWidth = Math.cos(theta) * constraintRadius * 2;
            //Math.cos(theta) * constraintRadius gives the width from the centre of the circle to one edge so we need to double it.
        return scaledWidth / imageWidth;
    };

    ImageExplorer.prototype.sliderValToScale = function(sliderValue) {
        var sliderValAsUnitInterval = sliderValue / (this.$scaleSlider.attr('max') - this.$scaleSlider.attr('min'));
        //http://math.stackexchange.com/questions/2489/is-there-a-name-for-0-1 (was tempted to use sliderValAsWombatNumber)
        return this.minScale + (sliderValAsUnitInterval * (this.maxScale - this.minScale));
    };

    ImageExplorer.prototype.scaleToSliderVal = function(scale) {
        //Slider represents the range between maxScale and minScale, normalised as a percent (the HTML slider range is 0-100).
        var sliderValAsUnitInterval = (scale - this.minScale) / (this.maxScale - this.minScale);

        return sliderValAsUnitInterval * (this.$scaleSlider.attr('max') - this.$scaleSlider.attr('min'));
    };

    ImageExplorer.prototype.updateImageScale = function(newScale, zoomMode){
        var newWidth = Math.round(newScale * this.imageProperties.naturalWidth),
            newHeight = Math.round(newScale * this.imageProperties.naturalHeight),
            newMarginLeft,
            newMarginTop;

        zoomMode = zoomMode || this.options.zoomMode;

        switch (zoomMode) {
            case ImageExplorer.zoomModes.imageZoom:
                newMarginLeft = -1 * newWidth / 2;
                newMarginTop = -1 * newHeight / 2;
            break;

            case ImageExplorer.zoomModes.localZoom:
                var oldWidth = this.$sourceImage.width(),
                    oldHeight = this.$sourceImage.height(),
                    oldMarginLeft = parseInt(this.$sourceImage.css('margin-left'), 10),
                    oldMarginTop = parseInt(this.$sourceImage.css('margin-top'), 10),
                    sourceImagePosition = this.$sourceImage.position(), //Position top & left only. Doesn't take into account margins
                    imageViewCenterX = this.$imageView.width() / 2,
                    imageViewCenterY = this.$imageView.height() / 2,
                    //Which pixel is currently in the center of the mask? (assumes the mask is centered in the $imageView)
                    oldImageFocusX = imageViewCenterX - sourceImagePosition.left - oldMarginLeft,
                    oldImageFocusY = imageViewCenterY - sourceImagePosition.top - oldMarginTop,
                    //Where will that pixel be once the image is resized?
                    newImageFocusX = (oldImageFocusX / oldWidth) * newWidth,
                    newImageFocusY = (oldImageFocusY / oldHeight) * newHeight;

                //How many pixels do we need to shift the image to put the new focused pixel in the center of the mask?
                newMarginLeft = imageViewCenterX - sourceImagePosition.left - newImageFocusX;
                newMarginTop = imageViewCenterY - sourceImagePosition.top - newImageFocusY;
            break;
        }

        this.$sourceImage
            .width(newWidth)
            .height(newHeight)
            .css({
                'margin-left': Math.round(newMarginLeft) +'px',
                'margin-top': Math.round(newMarginTop) +'px'
            });
    };


    ImageExplorer.prototype.resetImagePosition = function(){
        this.$sourceImage.css({
            top: '50%',
            left: '50%'
        });
    };

    ImageExplorer.prototype.resetScaleSlider = function(initialValue){
        this.$scaleSlider
                .val(initialValue)
                .removeClass('disabled')
                .removeAttr('disabled');
    };

    ImageExplorer.prototype.toggleEmpty = function(toggle) {
        this.$container.toggleClass(this.options.emptyClass, toggle);
    };

    ImageExplorer.prototype.get$ImageView = function(){
        return this.$imageView;
    };

    ImageExplorer.prototype.get$SourceImage = function(){
        return this.$sourceImage;
    };

    ImageExplorer.prototype.get$Mask = function(){
        return this.$mask;
    };

    ImageExplorer.prototype.get$DragDelegate = function(){
        return this.$dragDelegate;
    };

    ImageExplorer.prototype.getMaskedImageProperties = function(){
        var currentScaleX = this.$sourceImage.width() / this.imageProperties.naturalWidth,
            currentScaleY = this.$sourceImage.height() / this.imageProperties.naturalHeight,
            maskPosition = this.$mask.position(),
            imagePosition = this.$sourceImage.position();

            maskPosition.top += parseInt(this.$mask.css('margin-top'), 10);
            maskPosition.left += parseInt(this.$mask.css('margin-left'), 10);

            imagePosition.top += parseInt(this.$sourceImage.css('margin-top'), 10);
            imagePosition.left += parseInt(this.$sourceImage.css('margin-left'), 10);

        return {
            maskedAreaImageX : Math.round((maskPosition.left - imagePosition.left) / currentScaleX),
            maskedAreaImageY : Math.round((maskPosition.top - imagePosition.top) / currentScaleY),
            maskedAreaWidth  : Math.round(this.$mask.width() / currentScaleX),
            maskedAreaHeight : Math.round(this.$mask.height() / currentScaleY)
        };
    };

    ImageExplorer.prototype.showError = function(title, contents) {
        alert(title + ' ' + contents);
    };

    ImageExplorer.prototype.clearError = function() {
        this._removeError();
        this._resetFromError();
    };

    ImageExplorer.prototype.hasValidImage = function(){
        return !!(this.getImageSrc() && this.$sourceImage.prop('naturalWidth'));
    };

    ImageExplorer.prototype._resetFromError = function(){
        // When the error is closed/removed, if there was a valid img in the explorer, show that,
        // otherwise keep displaying the 'empty' view
        // Might also need to do something in the caller (e.g. ImageUploadAndCrop) so fire an optional callback.
        var hasValidImage = this.hasValidImage();
        this.toggleEmpty(!hasValidImage);
        this.$container.removeClass('error');
        _.isFunction(this.options.onErrorReset) && this.options.onErrorReset(hasValidImage ? this.getImageSrc() : undefined);
    };

    ImageExplorer.prototype._removeError = function(){
        this.$imageView.find('.aui-message.error').remove();
    };

    return ImageExplorer;
})();

window.ImageUploadAndCrop = (function(){

    function ImageUploadAndCrop($container, opts){
        if (!ImageUploadAndCrop.isSupported()) {
            throw new Error("This browser doesn't support ImageUploadAndCrop.");
        }
        this.init.apply(this, arguments);
    }

    ImageUploadAndCrop.isSupported = function() {
        return CanvasCropper.isSupported();
    };

    ImageUploadAndCrop.prototype.defaults = {
        HiDPIMultiplier: 2,  //The canvas crop size is multiplied by this to support HiDPI screens
        dragDropUploadPrompt: l[1390],
        onImageUpload: $.noop,
        onImageUploadError: $.noop,
        onCrop: $.noop,
        outputFormat: 'image/png',
        fallbackUploadOptions: {},
        initialScaleMode: ImageExplorer.scaleModes.containAndFill,
        scaleMax: 1,
        fileSizeLimit: 15 * 1024 * 1024, //5MB
        maxImageDimension: 5000 //In pixels
    };

    ImageUploadAndCrop.prototype.init = function($container, opts){
        this.options = $.extend({}, this.defaults, opts);
        this.$container = $container;

        _.bindAll(this, 'crop', 'resetState', '_onFileProcessed', 'setImageSrc', 'validateImageResolution', '_onFilesError',
            '_onFileError', '_resetFileUploadField', '_onErrorReset');

        this.imageExplorer = new ImageExplorer(this.$container.find('.image-explorer-container'), {
            initialScaleMode: this.options.initialScaleMode,
            scaleMax: this.options.scaleMax,
            onErrorReset: this._onErrorReset
        });

        if (ClientFileReader.isSupported()) {
            this.clientFileReader = new ClientFileReader({
                onRead: this._onFileProcessed,
                onError: this._onFilesError,
                fileTypeFilter: ClientFileReader.typeFilters.imageWeb,
                fileCountLimit: 1,
                fileSizeLimit: this.options.fileSizeLimit
            });

            //drag drop uploading is only possible in browsers that support the fileReaderAPI
            this.dragDropFileTarget = new DragDropFileTarget(this.imageExplorer.get$ImageView(), {
                uploadPrompt: this.options.dragDropUploadPrompt,
                clientFileHandler: this.clientFileReader
            });
        } else {
            //Fallback for older browsers. TODO: Client side filetype filtering?

            this.$container.addClass("filereader-unsupported");

            var fallbackOptions = $.extend({
                onUpload: this._onFileProcessed,
                onError: this._onFileError
            }, this.options.fallbackUploadOptions);

            this.clientFileReader = new ClientFileIframeUploader(fallbackOptions);
        }

        this.uploadIntercepter = new UploadInterceptor(this.$container.find('.image-upload-field'), {
            replacementEl: this.$container.find('.image-upload-field-replacement'),
            clientFileHandler: this.clientFileReader
        });

        var mask = this.imageExplorer.get$Mask();

        this.canvasCroppper = new CanvasCropper(
            mask.width() * this.options.HiDPIMultiplier,
            mask.height() * this.options.HiDPIMultiplier,
            {
                outputFormat: this.options.outputFormat
            }
        );

        this.options.cropButton && $(this.options.cropButton).click(this.crop);
    };

    ImageUploadAndCrop.prototype.crop = function(){
        var cropProperties = this.imageExplorer.getMaskedImageProperties(),
            croppedDataURI = this.canvasCroppper.cropToDataURI(
                this.imageExplorer.get$SourceImage()[0],
                cropProperties.maskedAreaImageX,
                cropProperties.maskedAreaImageY,
                cropProperties.maskedAreaWidth,
                cropProperties.maskedAreaHeight
            );

        _.isFunction(this.options.onCrop) && this.options.onCrop(croppedDataURI);
    };

    ImageUploadAndCrop.prototype.resetState = function(){
        this.imageExplorer.clearError();
        this._resetFileUploadField();
    };

    ImageUploadAndCrop.prototype._onFileProcessed = function(imageSrc){
        if (imageSrc){
            if (!isNaN(this.options.maxImageDimension)) {
                var validatePromise = this.validateImageResolution(imageSrc);

                validatePromise
                    .done(_.bind(function(imageWidth, imageHeight){
                        this.setImageSrc(imageSrc);
                    }, this))
                    .fail(_.bind(function(imageWidth, imageHeight){
                        this._onFileError('The selected image size is ' + imageWidth + 'px * ' + imageHeight + 'px. The maximum allowed image size is ' + this.options.maxImageDimension +
                            'px * ' + this.options.maxImageDimension + 'px');
                    }, this));
            } else {
                // If imageResolutionMax isn't valid, skip the validation and just set the image src.
                this.setImageSrc(imageSrc);
            }
        } else {
            this._onFileError();
        }
    };

    ImageUploadAndCrop.prototype.setImageSrc = function(imageSrc) {
        this.imageExplorer.setImageSrc(imageSrc);
        _.isFunction(this.options.onImageUpload) && this.options.onImageUpload(imageSrc);
        this._resetFileUploadField();
    };

    ImageUploadAndCrop.prototype.validateImageResolution = function(imageSrc){
        var validatePromise = $.Deferred(),
            tmpImage = new Image(),
            self = this;

        tmpImage.onload = function(){
            if (this.naturalWidth > self.options.maxImageDimension ||  this.naturalHeight > self.options.maxImageDimension) {
                validatePromise.reject(this.naturalWidth, this.naturalHeight);
            } else {
                validatePromise.resolve(this.naturalWidth, this.naturalHeight);
            }
        };

        tmpImage.src = imageSrc;

        return validatePromise;
    };

    ImageUploadAndCrop.prototype._onFilesError = function(invalidFiles) {
        // Work out the most appropriate error to display. Because drag and drop uploading can accept multiple files and we can't restrict this,
        // it's not an all or nothing situation, we need to try and find the most correct file and base the error on that.
        // If there was at least 1 valid file, then this wouldn't be called, so we don't need to worry about files rejected because of the fileCountLimit

        if (invalidFiles && invalidFiles.bySize && invalidFiles.bySize.length){
            //Some image files of the correct type were filtered because they were too big. Pick the first one to use as an example.
            var file = _.first(invalidFiles.bySize);
            this._onFileError('File "' + TextUtil.abbreviateText(file.name, 50) + '" is ' + TextUtil.formatSizeInBytes(file.size) +
                ' which is larger than the maximum allowed size of ' + TextUtil.formatSizeInBytes(this.options.fileSizeLimit));
        } else {
            //No files of the correct type were uploaded. The default error message will cover this.
            this._onFileError();
        }
    };

    ImageUploadAndCrop.prototype._onFileError = function(error){
        var title = 'There was an error uploading your image',
            contents = error || 'Please check that your file is a valid image and try again.';

        this.imageExplorer.showError(title, contents);
        this._resetFileUploadField();
        _.isFunction(this.options.onImageUploadError) && this.options.onImageUploadError(error);
    };

    ImageUploadAndCrop.prototype._resetFileUploadField = function(){
        //clear out the fileUpload field so the user could select the same file again to "reset" the imageExplorer
        var form = this.$container.find("#image-upload-and-crop-upload-field").prop('form');
        form && form.reset();
    };

    ImageUploadAndCrop.prototype._onErrorReset = function(imgSrc){
        //If we have a valid image after resetting from the error, notify the calling code.
        if (imgSrc) {
            _.isFunction(this.options.onImageUpload) && this.options.onImageUpload(imgSrc);
        }
    };

    return ImageUploadAndCrop;
})();

window.TextUtil = (function(){
    return {
        formatSizeInBytes : function(size) {
            // Convert the size to the most appropriate unit ('n units' where n < magnitudeStep and n >= 1)
            // and round to 1 decimal only if needed (so `1.72` becomes `1.7`, but `1.02` becomes `1`)
            var units = [' bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
                magnitudeStep = 1024,
                orderOfMagnitude = 0,
                maxMagnitude = units.length - 1;

            size = (typeof size === 'number') ? size : parseInt(size, 10);

            if (isNaN(size)) {
                return '';
            }

            while (size >= magnitudeStep && orderOfMagnitude < maxMagnitude) {
                size /= magnitudeStep;
                orderOfMagnitude++;
            }

            size = Math.floor((size * 10)) / 10; //Reduce to 1 decimal place only if required.
            return size + units[orderOfMagnitude];
        },
        abbreviateText: function(text, maxLength, opt_replacement) {
            //Abbreviate the text by removing characters from the middle and replacing them with a single instance of the replacement,
            // so that the total width of the new string is <= to `maxLength`
            if (typeof text !== 'string') {
                //trying to abbreviate a non-string is undefined
                return undefined;
            }
            if (isNaN(maxLength) || maxLength < 0 || text.length <= maxLength  ) {
                //if maxLength is not a number or less than zero, or if the text is shorter than the maxLength, return the original text
                return text;
            }

            var replacement = (typeof opt_replacement === 'string') ? opt_replacement : '…',
                removedCharCount = text.length - maxLength + replacement.length,
                textCenter = Math.round(text.length/2);

            return text.substring(0, textCenter - Math.ceil(removedCharCount/2)) + replacement +
                text.substring(textCenter + Math.floor(removedCharCount/2), text.length);
        }
    };
})();

