/*
 * Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * TypedArray Vector Template
 *
 * If you make any changes to this code you'll need to run it through the closure compiler:
 * http://closure-compiler.appspot.com/home and then paste the result into the |typedArrayVectorTemplate|
 * variable below. We duplicate all the code for vectors because we want to keep things monomorphic as
 * much as possible.
 *
 * NOTE: Not all of the AS3 methods need to be implemented natively, some are self-hosted in AS3 code.
 * For better performance we should probably implement them all natively (in JS that is) unless our
 * compiler is good enough.
 */
var TypedArrayVector = (function () {
  // <<-- COPY FROM HERE
  var EXTRA_CAPACITY = 4;
  var INITIAL_CAPACITY = 10;

  function vector(length, fixed) {
    length = length | 0;
    this.fixed = !!fixed;
    this.buffer = new Int32Array(Math.max(INITIAL_CAPACITY, length + EXTRA_CAPACITY));
    this.offset = 0;
    this._length = length;
    this.defaultValue = 0;
  }

  vector.callable = function (object) {
    if (object instanceof vector) {
      return object;
    }
    var length = object.asGetProperty(undefined, "length");
    if (length !== undefined) {
      var v = new vector(length, false);
      for (var i = 0; i < length; i++) {
        v.asSetNumericProperty(i, object.asGetPublicProperty(i));
      }
      return v;
    }
    unexpected();
  };

  vector.prototype.internalToString = function () {
    var str = "";
    var start = this.offset;
    var end = start + this._length;
    for (var i = 0; i < this.buffer.length; i++) {
      if (i === start) {
        str += "[";
      }
      if (i === end) {
        str += "]";
      }
      str += this.buffer[i];
      if (i < this.buffer.length - 1) {
        str += ",";
      }
    }
    if (this.offset + this._length === this.buffer.length) {
      str += "]";
    }
    return str + ": offset: " + this.offset + ", length: " + this._length + ", capacity: " + this.buffer.length;
  };

  vector.prototype.toString = function () {
    var str = "";
    for (var i = 0; i < this._length; i++) {
      str += this.buffer[this.offset + i];
      if (i < this._length - 1) {
        str += ",";
      }
    }
    return str;
  };

  // vector.prototype.toString = vector.prototype.internalToString;

  vector.prototype._view = function () {
    return this.buffer.subarray(this.offset, this.offset + this._length);
  };

  vector.prototype._ensureCapacity = function (length) {
    var minCapacity = this.offset + length;
    if (minCapacity < this.buffer.length) {
      return;
    }
    if (length <= this.buffer.length) {
      // New length exceeds bounds at current offset but fits in the buffer, so we center it.
      var offset = (this.buffer.length - length) >> 2;
      this.buffer.set(this._view(), offset);
      this.offset = offset;
      return;
    }
    // New length doesn't fit at all, resize buffer.
    var oldCapacity = this.buffer.length;
    var newCapacity = (oldCapacity * 3) >> 1 + 1;
    if (newCapacity < minCapacity) {
      newCapacity = minCapacity;
    }
    var buffer = new Int32Array(newCapacity);
    buffer.set(this.buffer, 0);
    this.buffer = buffer;
  };

  vector.prototype.concat = function () {
    notImplemented("TypedArrayVector.concat");
  };

  /**
   * Executes a |callback| function with three arguments: element, index, the vector itself as well
   * as passing the |thisObject| as |this| for each of the elements in the vector. If any of the
   * callbacks return |false| the function terminates, otherwise it returns |true|.
   */
  vector.prototype.every = function (callback, thisObject) {
    for (var i = 0; i < this._length; i++) {
      if (!callback.call(thisObject, this.asGetNumericProperty(i), i, this)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Filters the elements for which the |callback| method returns |true|. The |callback| function
   * is called with three arguments: element, index, the vector itself as well as passing the |thisObject|
   * as |this| for each of the elements in the vector.
   */
  vector.prototype.filter = function (callback, thisObject) {
    var v = new vector();
    for (var i = 0; i < this._length; i++) {
      if (callback.call(thisObject, this.asGetNumericProperty(i), i, this)) {
        v.push(this.asGetNumericProperty(i));
      }
    }
    return v;
  };

  vector.prototype.forEach = function (callback, thisObject) {
    for (var i = 0; i < this._length; i++) {
      callback.call(thisObject, this.asGetNumericProperty(i), i, this);
    }
  };

  vector.prototype.join = function (sep) {
    notImplemented("TypedArrayVector.join");
  };

  vector.prototype.indexOf = function (searchElement, fromIndex) {
    notImplemented("TypedArrayVector.indexOf");
  };

  vector.prototype.lastIndexOf = function (searchElement, fromIndex) {
    notImplemented("TypedArrayVector.lastIndexOf");
  };

  vector.prototype.map = function (callback, thisObject) {
    notImplemented("TypedArrayVector.map");
  };

  vector.prototype.push = function () {
    this._ensureCapacity(this._length + arguments.length);
    for (var i = 0; i < arguments.length; i++) {
      this.buffer[this.offset + this._length++] = arguments[i];
    }
  };

  vector.prototype.pop = function () {
    this._checkFixed();
    if (this._length === 0) {
      return this.defaultValue;
    }
    this._length--;
    return this.buffer[this.offset + this._length];
  };

  vector.prototype.reverse = function () {
    var l = this.offset;
    var r = this.offset + this._length - 1;
    var b = this.buffer;
    while (l < r) {
      var t = b[l];
      b[l] = b[r];
      b[r] = t;
      l ++;
      r --;
    }
  };

  vector.CASEINSENSITIVE = 1;
  vector.DESCENDING = 2;
  vector.UNIQUESORT = 4;
  vector.RETURNINDEXEDARRAY = 8;
  vector.NUMERIC = 16;

  function defaultCompareFunction(a, b) {
    return String(a).localeCompare(String(b));
  }

  function compare(a, b, options, compareFunction) {
    assertNotImplemented (!(options & vector.CASEINSENSITIVE), "CASEINSENSITIVE");
    assertNotImplemented (!(options & vector.UNIQUESORT), "UNIQUESORT");
    assertNotImplemented (!(options & vector.RETURNINDEXEDARRAY), "RETURNINDEXEDARRAY");
    var result = 0;
    if (!compareFunction) {
      compareFunction = defaultCompareFunction;
    }
    if (options & vector.NUMERIC) {
      a = Number(a);
      b = Number(b);
      result = a < b ? -1 : (a > b ? 1 : 0);
    } else {
      result = compareFunction(a, b);
    }
    if (options & vector.DESCENDING) {
      result *= -1;
    }
    return result;
  }

  function _sort(a) {
    var stack = [];
    var sp = -1;
    var l = 0;
    var r = a.length - 1;
    var i, j, swap, temp;
    while (true) {
      if (r - l <= 100) {
        for (j = l + 1; j <= r; j++) {
          swap = a[j];
          i = j - 1;
          while (i >= l && a[i] > swap) {
            a[i + 1] = a[i--];
          }
          a[i + 1] = swap;
        }
        if (sp == -1) {
          break;
        }
        r = stack[sp--];
        l = stack[sp--];
      } else {
        var median = l + r >> 1;
        i = l + 1;
        j = r;
        swap = a[median];
        a[median] = a[i];
        a[i] = swap;
        if (a[l] > a[r]) {
          swap = a[l];
          a[l] = a[r];
          a[r] = swap;
        }
        if (a[i] > a[r]) {
          swap = a[i];
          a[i] = a[r];
          a[r] = swap;
        }
        if (a[l] > a[i]) {
          swap = a[l];
          a[l] = a[i];
          a[i] = swap;
        }
        temp = a[i];
        while (true) {
          do {
            i++;
          } while (a[i] < temp);
          do {
            j--;
          } while (a[j] > temp);
          if (j < i) {
            break;
          }
          swap = a[i];
          a[i] = a[j];
          a[j] = swap;
        }
        a[l + 1] = a[j];
        a[j] = temp;
        if (r - i + 1 >= j - l) {
          stack[++sp] = i;
          stack[++sp] = r;
          r = j - 1;
        } else {
          stack[++sp] = l;
          stack[++sp] = j - 1;
          l = i;
        }
      }
    }
    return a;
  }

  vector.prototype._sortNumeric = function (descending) {
    _sort(this._view());
    if (descending) {
      this.reverse();
    }
  };

  vector.prototype.sort = function () {
    if (arguments.length === 0) {
      return Array.prototype.sort.call(this._view());
    }
    var compareFunction, options = 0;
    if (arguments[0] instanceof Function) {
      compareFunction = arguments[0];
    } else if (isNumber(arguments[0])) {
      options = arguments[0];
    }
    if (isNumber(arguments[1])) {
      options = arguments[1];
    }
    if (options & TypedArrayVector.NUMERIC) {
      return this._sortNumeric(options & vector.DESCENDING);
    }
    Array.prototype.sort.call(this._view(), function (a, b) {
      return compare(a, b, options, compareFunction);
    });
  };

  vector.prototype.asGetNumericProperty = function (i) {
    return this.buffer[this.offset + i];
  };

  vector.prototype.asSetNumericProperty = function (i, v) {
    if (i === this._length) {
      this._ensureCapacity(this._length + 1);
      this._length ++;
    }
    this.buffer[this.offset + i] = v;
  };

  vector.prototype.shift = function () {
    this._checkFixed();
    if (this._length === 0) {
      return undefined;
    }
    this._length--;
    return this.buffer[this.offset++];
  };

  vector.prototype._checkFixed = function() {
    if (this.fixed) {
      var error = Errors.VectorFixedError;
      throwErrorFromVM(AVM2.currentDomain(), "RangeError", getErrorMessage(error.code), error.code);
    }
  };

  vector.prototype._slide = function (distance) {
    this.buffer.set(this._view(), this.offset + distance);
    this.offset += distance;
  };

  vector.prototype.unshift = function () {
    this._checkFixed();
    this._slide(arguments.length);
    this.offset -= arguments.length;
    this.length += arguments.length;
    for (var i = 0; i < arguments.length; i++) {
      this.buffer[this.offset + i] = arguments[i];
    }
  };

  Object.defineProperty(vector.prototype, "length", {
    get: function () {
      return this._length;
    },
    set: function (length) {
      length = toUint(length);
      if (length > this._length) {
        this._ensureCapacity(length);
        for (var i = this.offset + this._length, j = this.offset + length; i < j; i++) {
          this.buffer[i] = this.defaultValue;
        }
      }
      this._length = length;
    }
  });

  /**
   * Delete |deleteCount| elements starting at |index| then insert |insertCount| elements
   * from |args| object starting at |offset|.
   */
  vector.prototype._spliceHelper = function (index, insertCount, deleteCount, args, offset) {
    insertCount = clamp(insertCount, 0, args.length - offset);
    deleteCount = clamp(deleteCount, 0, this._length - index);
    this._ensureCapacity(this._length - deleteCount + insertCount);
    var right = this.offset + index + deleteCount;
    var slice = this.buffer.subarray(right, right + this._length - index - deleteCount);
    this.buffer.set(slice, this.offset + index + insertCount);
    this._length += insertCount - deleteCount;
    for (var i = 0; i < insertCount; i++) {
      this.buffer[this.offset + index + i] = args.asGetNumericProperty(offset + i);
    }
  };
  // <<-- COPY UNTIL HERE
  return vector;
})();

var typedArrayVectorTemplate = 'var EXTRA_CAPACITY=4,INITIAL_CAPACITY=10;function vector(a,b){a|=0;this.fixed=!!b;this.buffer=new Int32Array(Math.max(INITIAL_CAPACITY,a+EXTRA_CAPACITY));this.offset=0;this._length=a;this.defaultValue=0}vector.callable=function(a){if(a instanceof vector)return a;var b=a.asGetProperty(void 0,"length");if(void 0!==b){for(var c=new vector(b,!1),d=0;d<b;d++)c.asSetNumericProperty(d,a.asGetPublicProperty(d));return c}unexpected()}; vector.prototype.internalToString=function(){for(var a="",b=this.offset,c=b+this._length,d=0;d<this.buffer.length;d++)d===b&&(a+="["),d===c&&(a+="]"),a+=this.buffer[d],d<this.buffer.length-1&&(a+=",");this.offset+this._length===this.buffer.length&&(a+="]");return a+": offset: "+this.offset+", length: "+this._length+", capacity: "+this.buffer.length};vector.prototype.toString=function(){for(var a="",b=0;b<this._length;b++)a+=this.buffer[this.offset+b],b<this._length-1&&(a+=",");return a}; vector.prototype._view=function(){return this.buffer.subarray(this.offset,this.offset+this._length)};vector.prototype._ensureCapacity=function(a){var b=this.offset+a;b<this.buffer.length||(a<=this.buffer.length?(b=this.buffer.length-a>>2,this.buffer.set(this._view(),b),this.offset=b):(a=3*this.buffer.length>>2,a<b&&(a=b),b=new Int32Array(a),b.set(this.buffer,0),this.buffer=b))};vector.prototype.concat=function(){notImplemented("TypedArrayVector.concat")}; vector.prototype.every=function(a,b){for(var c=0;c<this._length;c++)if(!a.call(b,this.asGetNumericProperty(c),c,this))return!1;return!0};vector.prototype.filter=function(a,b){for(var c=new vector,d=0;d<this._length;d++)a.call(b,this.asGetNumericProperty(d),d,this)&&c.push(this.asGetNumericProperty(d));return c};vector.prototype.forEach=function(a,b){for(var c=0;c<this._length;c++)a.call(b,this.asGetNumericProperty(c),c,this)};vector.prototype.join=function(a){notImplemented("TypedArrayVector.join")}; vector.prototype.indexOf=function(a,b){notImplemented("TypedArrayVector.indexOf")};vector.prototype.lastIndexOf=function(a,b){notImplemented("TypedArrayVector.lastIndexOf")};vector.prototype.map=function(a,b){notImplemented("TypedArrayVector.map")};vector.prototype.push=function(){this._ensureCapacity(this._length+arguments.length);for(var a=0;a<arguments.length;a++)this.buffer[this.offset+this._length++]=arguments[a]}; vector.prototype.pop=function(){this._checkFixed();if(0===this._length)return this.defaultValue;this._length--;return this.buffer[this.offset+this._length]};vector.prototype.reverse=function(){for(var a=this.offset,b=this.offset+this._length-1,c=this.buffer;a<b;){var d=c[a];c[a]=c[b];c[b]=d;a++;b--}};vector.CASEINSENSITIVE=1;vector.DESCENDING=2;vector.UNIQUESORT=4;vector.RETURNINDEXEDARRAY=8;vector.NUMERIC=16;function defaultCompareFunction(a,b){return String(a).localeCompare(String(b))} function compare(a,b,c,d){assertNotImplemented(!(c&vector.CASEINSENSITIVE),"CASEINSENSITIVE");assertNotImplemented(!(c&vector.UNIQUESORT),"UNIQUESORT");assertNotImplemented(!(c&vector.RETURNINDEXEDARRAY),"RETURNINDEXEDARRAY");var f=0;d||(d=defaultCompareFunction);c&vector.NUMERIC?(a=Number(a),b=Number(b),f=a<b?-1:a>b?1:0):f=d(a,b);c&vector.DESCENDING&&(f*=-1);return f} function _sort(a){for(var b=[],c=-1,d=0,f=a.length-1,e,g,h,k;;)if(100>=f-d){for(g=d+1;g<=f;g++){h=a[g];for(e=g-1;e>=d&&a[e]>h;)a[e+1]=a[e--];a[e+1]=h}if(-1==c)break;f=b[c--];d=b[c--]}else{k=d+f>>1;e=d+1;g=f;h=a[k];a[k]=a[e];a[e]=h;a[d]>a[f]&&(h=a[d],a[d]=a[f],a[f]=h);a[e]>a[f]&&(h=a[e],a[e]=a[f],a[f]=h);a[d]>a[e]&&(h=a[d],a[d]=a[e],a[e]=h);for(k=a[e];;){do e++;while(a[e]<k);do g--;while(a[g]>k);if(g<e)break;h=a[e];a[e]=a[g];a[g]=h}a[d+1]=a[g];a[g]=k;f-e+1>=g-d?(b[++c]=e,b[++c]=f,f=g-1):(b[++c]=d, b[++c]=g-1,d=e)}return a}vector.prototype._sortNumeric=function(a){_sort(this._view());a&&this.reverse()};vector.prototype.sort=function(){if(0===arguments.length)return Array.prototype.sort.call(this._view());var a,b=0;arguments[0]instanceof Function?a=arguments[0]:isNumber(arguments[0])&&(b=arguments[0]);isNumber(arguments[1])&&(b=arguments[1]);if(b&TypedArrayVector.NUMERIC)return this._sortNumeric(b&vector.DESCENDING);Array.prototype.sort.call(this._view(),function(c,d){return compare(c,d,b,a)})}; vector.prototype.asGetNumericProperty=function(a){return this.buffer[this.offset+a]};vector.prototype.asSetNumericProperty=function(a,b){a===this._length&&(this._ensureCapacity(this._length+1),this._length++);this.buffer[this.offset+a]=b};vector.prototype.shift=function(){this._checkFixed();if(0!==this._length)return this._length--,this.buffer[this.offset++]}; vector.prototype._checkFixed=function(){if(this.fixed){var a=Errors.VectorFixedError;throwErrorFromVM(AVM2.currentDomain(),"RangeError",getErrorMessage(a.code),a.code)}};vector.prototype._slide=function(a){this.buffer.set(this._view(),this.offset+a);this.offset+=a};vector.prototype.unshift=function(){this._checkFixed();this._slide(arguments.length);this.offset-=arguments.length;this.length+=arguments.length;for(var a=0;a<arguments.length;a++)this.buffer[this.offset+a]=arguments[a]}; Object.defineProperty(vector.prototype,"length",{get:function(){return this._length},set:function(a){a=toUint(a);if(a>this._length){this._ensureCapacity(a);for(var b=this.offset+this._length,c=this.offset+a;b<c;b++)this.buffer[b]=this.defaultValue}this._length=a}}); vector.prototype._spliceHelper=function(a,b,c,d,f){b=clamp(b,0,d.length-f);c=clamp(c,0,this._length-a);this._ensureCapacity(this._length-c+b);var e=this.offset+a+c,e=this.buffer.subarray(e,e+this._length-a-c);this.buffer.set(e,this.offset+a+b);this._length+=b-c;for(c=0;c<b;c++)this.buffer[this.offset+a+c]=d.asGetNumericProperty(f+c)};';

var Int32Vector  = new Function(typedArrayVectorTemplate.replace(/Int32Array/g, "Int32Array") + " return vector;")();
var Uint32Vector = new Function(typedArrayVectorTemplate.replace(/Int32Array/g, "Uint32Array") + " return vector;")();
var Float64Vector = new Function(typedArrayVectorTemplate.replace(/Int32Array/g, "Float64Array") + " return vector;")();

var GenericVector = (function () {
  function vector(length, fixed, type) {
    length = length | 0;
    this.fixed = !!fixed;
    this.buffer = new Array(length);
    this.type = type;
    this.defaultValue = type ? type.defaultValue : null;
    this._fill(0, length, this.defaultValue);
  }

  /**
   * Makes a vector constructor that is bound to a specified |type|.
   */
  vector.applyType = function applyType(type) {
    function parameterizedVector(length, fixed) {
      vector.call(this, length, fixed, type);
    }
    parameterizedVector.prototype = Object.create(vector.prototype);
    parameterizedVector.callable = vector.callable;
    return parameterizedVector;
  };

  vector.callable = function (object) {
    if (object instanceof vector) {
      return object;
    }
    var length = object.asGetProperty(undefined, "length");
    if (length !== undefined) {
      var v = new vector(length, false);
      for (var i = 0; i < length; i++) {
        v.asSetNumericProperty(i, object.asGetPublicProperty(i));
      }
      return v;
    }
    unexpected();
  };

  vector.prototype._fill = function (index, length, value) {
    for (var i = 0; i < length; i++) {
      this.buffer[index + i] = value;
    }
  };

  /**
   * Can't use Array.prototype.toString because it doesn't print |null|s the same way as AS3.
   */
  vector.prototype.toString = function () {
    var str = "";
    for (var i = 0; i < this.buffer.length; i++) {
      str += this.buffer[i];
      if (i < this.buffer.length - 1) {
        str += ",";
      }
    }
    return str;
  };

  /**
   * Executes a |callback| function with three arguments: element, index, the vector itself as well
   * as passing the |thisObject| as |this| for each of the elements in the vector. If any of the
   * callbacks return |false| the function terminates, otherwise it returns |true|.
   */
  vector.prototype.every = function (callback, thisObject) {
    for (var i = 0; i < this.buffer.length; i++) {
      if (!callback.call(thisObject, this.asGetNumericProperty(i), i, this)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Filters the elements for which the |callback| method returns |true|. The |callback| function
   * is called with three arguments: element, index, the vector itself as well as passing the |thisObject|
   * as |this| for each of the elements in the vector.
   */
  vector.prototype.filter = function (callback, thisObject) {
    var v = new vector();
    for (var i = 0; i < this.buffer.length; i++) {
      if (callback.call(thisObject, this.asGetNumericProperty(i), i, this)) {
        v.push(this.asGetNumericProperty(i));
      }
    }
    return v;
  };

  vector.prototype.forEach = function (callback, thisObject) {
    for (var i = 0; i < this.buffer.length; i++) {
      callback.call(thisObject, this.asGetNumericProperty(i), i, this);
    }
  };

  vector.prototype.push = function () {
    this._checkFixed();
    for (var i = 0; i < arguments.length; i++) {
      this.buffer.push(this._coerce(arguments[i]));
    }
  };

  vector.prototype.pop = function () {
    this._checkFixed();
    if (this.buffer.length === 0) {
      return undefined;
    }
    return this.buffer.pop();
  };

  vector.prototype.reverse = function () {
    this.buffer.reverse();
  };

  vector.CASEINSENSITIVE = 1;
  vector.DESCENDING = 2;
  vector.UNIQUESORT = 4;
  vector.RETURNINDEXEDARRAY = 8;
  vector.NUMERIC = 16;

  function defaultCompareFunction(a, b) {
    return String(a).localeCompare(String(b));
  }

  function compare(a, b, options, compareFunction) {
    assertNotImplemented (!(options & CASEINSENSITIVE), "CASEINSENSITIVE");
    assertNotImplemented (!(options & UNIQUESORT), "UNIQUESORT");
    assertNotImplemented (!(options & RETURNINDEXEDARRAY), "RETURNINDEXEDARRAY");
    var result = 0;
    if (!compareFunction) {
      compareFunction = defaultCompareFunction;
    }
    if (options & NUMERIC) {
      a = Number(a);
      b = Number(b);
      result = a < b ? -1 : (a > b ? 1 : 0);
    } else {
      result = compareFunction(a, b);
    }
    if (options & DESCENDING) {
      result *= -1;
    }
    return result;
  }

  vector.prototype.sort = function () {
    if (arguments.length === 0) {
      return this.buffer.sort();
    }
    var compareFunction, options = 0;
    if (arguments[0] instanceof Function) {
      compareFunction = arguments[0];
    } else if (isNumber(arguments[0])) {
      options = arguments[0];
    }
    if (isNumber(arguments[1])) {
      options = arguments[1];
    }
    if (options & TypedArrayVector.NUMERIC) {
      return this._sortNumeric(options & vector.DESCENDING);
    }
    Array.prototype.sort.call(this.buffer, function (a, b) {
      return compare(a, b, options, compareFunction);
    });
  };

  vector.prototype.asGetNumericProperty = function (i) {
    return this.buffer[i];
  };

  vector.prototype._coerce = function (v) {
    if (this.type) {
      return this.type.coerce(v);
    } else if (v === undefined) {
      return null;
    }
    return v;
  };

  vector.prototype.asSetNumericProperty = function (i, v) {
    this.buffer[i] = this._coerce(v);
  };

  vector.prototype.shift = function () {
    this._checkFixed();
    if (this.buffer.length === 0) {
      return undefined;
    }
    return this.buffer.shift();
  };

  vector.prototype._checkFixed = function() {
    if (this.fixed) {
      var error = Errors.VectorFixedError;
      throwErrorFromVM(AVM2.currentDomain(), "RangeError", getErrorMessage(error.code), error.code);
    }
  };

  vector.prototype.unshift = function () {
    this._checkFixed();
    var items = [];
    for (var i = 0; i < arguments.length; i++) {
      items.push(this._coerce(arguments[i]));
    }
    this.buffer.unshift.apply(this.buffer, items);
  };

  Object.defineProperty(vector.prototype, "length", {
    get: function () {
      return this.buffer.length;
    },
    set: function (length) {
      length = toUint(length);
      if (length > this.buffer.length) {
        for (var i = this.buffer.length; i < length; i++) {
          this.buffer[i] = this.defaultValue;
        }
      } else {
        this.buffer.length = length;
      }
      release || assert (this.buffer.length === length);
    }
  });

  /**
   * Delete |deleteCount| elements starting at |index| then insert |insertCount| elements
   * from |args| object starting at |offset|.
   */
  vector.prototype._spliceHelper = function (index, insertCount, deleteCount, args, offset) {
    insertCount = clamp(insertCount, 0, args.length - offset);
    deleteCount = clamp(deleteCount, 0, this.buffer.length - index);
    var items = [];
    for (var i = 0; i < insertCount; i++) {
      items.push(this._coerce(args.asGetNumericProperty(offset + i)));
    }
    this.buffer.splice.apply(this.buffer, [index, deleteCount].concat(items));
  };

  vector.prototype.getEnumerationKeys = function () {
    var keys = [];
    for (var i = 0; i < this.buffer.length; i++) {
      keys.push(i);
    }
    return keys;
  };
  return vector;
})();