(function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp$1 = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __esmMin = (fn, res, err) => () => {
		if (err) throw err[0];
		try {
			return fn && (res = fn(fn = 0)), res;
		} catch (e) {
			throw err = [e], e;
		}
	};
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp$1(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp$1(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp$1(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp$1(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/polyfills/MessageChannel.js
	var MessagePortPolyfill, MessageChannelPolyfill;
	var init_MessageChannel = __esmMin((() => {
		init_ssr();
		MessagePortPolyfill = class {
			constructor() {
				this.onmessage = null;
				this.onmessageerror = null;
				this.otherPort = null;
				this.onmessageListeners = [];
				this.isClosed = false;
			}
			dispatchEvent(event) {
				if (this.isClosed) return false;
				if (this.onmessage) this.onmessage(event);
				this.onmessageListeners.forEach((listener) => {
					listener(event);
				});
				return true;
			}
			postMessage(message) {
				if (this.isClosed || !this.otherPort) return;
				const event = new MessageEventPolyfill("message", { data: message });
				this.otherPort.dispatchEvent(event);
			}
			addEventListener(type, listener) {
				if (this.isClosed || type !== "message") return;
				if (typeof listener === "function" && !this.onmessageListeners.includes(listener)) this.onmessageListeners.push(listener);
			}
			removeEventListener(type, listener) {
				if (this.isClosed || type !== "message") return;
				if (typeof listener === "function") {
					const index = this.onmessageListeners.indexOf(listener);
					if (index !== -1) this.onmessageListeners.splice(index, 1);
				}
			}
			start() {}
			close() {
				this.isClosed = true;
			}
		};
		MessageChannelPolyfill = class {
			constructor() {
				this.port1 = new MessagePortPolyfill();
				this.port2 = new MessagePortPolyfill();
				this.port1.otherPort = this.port2;
				this.port2.otherPort = this.port1;
			}
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/polyfills/globalScope.js
	var init_globalScope = __esmMin((() => {
		globalThis.global ??= globalThis;
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/constants.js
	var SERVER_PAYLOAD_VARIABLE_NAME;
	var init_constants = __esmMin((() => {
		SERVER_PAYLOAD_VARIABLE_NAME = "__TUONO_SERVER_PAYLOAD__";
	}));
	//#endregion
	//#region ../../node_modules/.bun/react@19.2.8/node_modules/react/cjs/react.production.js
	/**
	* @license React
	* react.production.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
		var REACT_PORTAL_TYPE = Symbol.for("react.portal");
		var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
		var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
		var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
		var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
		var REACT_CONTEXT_TYPE = Symbol.for("react.context");
		var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
		var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
		var REACT_MEMO_TYPE = Symbol.for("react.memo");
		var REACT_LAZY_TYPE = Symbol.for("react.lazy");
		var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
		var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		var ReactNoopUpdateQueue = {
			isMounted: function() {
				return !1;
			},
			enqueueForceUpdate: function() {},
			enqueueReplaceState: function() {},
			enqueueSetState: function() {}
		};
		var assign = Object.assign;
		var emptyObject = {};
		function Component(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		Component.prototype.isReactComponent = {};
		Component.prototype.setState = function(partialState, callback) {
			if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
			this.updater.enqueueSetState(this, partialState, callback, "setState");
		};
		Component.prototype.forceUpdate = function(callback) {
			this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
		};
		function ComponentDummy() {}
		ComponentDummy.prototype = Component.prototype;
		function PureComponent(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
		pureComponentPrototype.constructor = PureComponent;
		assign(pureComponentPrototype, Component.prototype);
		pureComponentPrototype.isPureReactComponent = !0;
		var isArrayImpl = Array.isArray;
		function noop() {}
		var ReactSharedInternals = {
			H: null,
			A: null,
			T: null,
			S: null
		};
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		function ReactElement(type, key, props) {
			var refProp = props.ref;
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				ref: void 0 !== refProp ? refProp : null,
				props
			};
		}
		function cloneAndReplaceKey(oldElement, newKey) {
			return ReactElement(oldElement.type, newKey, oldElement.props);
		}
		function isValidElement(object) {
			return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
		}
		function escape(key) {
			var escaperLookup = {
				"=": "=0",
				":": "=2"
			};
			return "$" + key.replace(/[=:]/g, function(match) {
				return escaperLookup[match];
			});
		}
		var userProvidedKeyEscapeRegex = /\/+/g;
		function getElementKey(element, index) {
			return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
		}
		function resolveThenable(thenable) {
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
					"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
				}, function(error) {
					"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
				})), thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenable.reason;
				}
			}
			throw thenable;
		}
		function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
			var type = typeof children;
			if ("undefined" === type || "boolean" === type) children = null;
			var invokeCallback = !1;
			if (null === children) invokeCallback = !0;
			else switch (type) {
				case "bigint":
				case "string":
				case "number":
					invokeCallback = !0;
					break;
				case "object": switch (children.$$typeof) {
					case REACT_ELEMENT_TYPE:
					case REACT_PORTAL_TYPE:
						invokeCallback = !0;
						break;
					case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
				}
			}
			if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
				return c;
			})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
			invokeCallback = 0;
			var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
			if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if ("object" === type) {
				if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
				array = String(children);
				throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
			}
			return invokeCallback;
		}
		function mapChildren(children, func, context) {
			if (null == children) return children;
			var result = [], count = 0;
			mapIntoArray(children, result, "", "", function(child) {
				return func.call(context, child, count++);
			});
			return result;
		}
		function lazyInitializer(payload) {
			if (-1 === payload._status) {
				var ctor = payload._result;
				ctor = ctor();
				ctor.then(function(moduleObject) {
					if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject;
				}, function(error) {
					if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error;
				});
				-1 === payload._status && (payload._status = 0, payload._result = ctor);
			}
			if (1 === payload._status) return payload._result.default;
			throw payload._result;
		}
		var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
			if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
				var event = new window.ErrorEvent("error", {
					bubbles: !0,
					cancelable: !0,
					message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
					error
				});
				if (!window.dispatchEvent(event)) return;
			} else if ("object" === typeof process && "function" === typeof process.emit) {
				process.emit("uncaughtException", error);
				return;
			}
			console.error(error);
		};
		var Children = {
			map: mapChildren,
			forEach: function(children, forEachFunc, forEachContext) {
				mapChildren(children, function() {
					forEachFunc.apply(this, arguments);
				}, forEachContext);
			},
			count: function(children) {
				var n = 0;
				mapChildren(children, function() {
					n++;
				});
				return n;
			},
			toArray: function(children) {
				return mapChildren(children, function(child) {
					return child;
				}) || [];
			},
			only: function(children) {
				if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
				return children;
			}
		};
		exports.Activity = REACT_ACTIVITY_TYPE;
		exports.Children = Children;
		exports.Component = Component;
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.Profiler = REACT_PROFILER_TYPE;
		exports.PureComponent = PureComponent;
		exports.StrictMode = REACT_STRICT_MODE_TYPE;
		exports.Suspense = REACT_SUSPENSE_TYPE;
		exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
		exports.__COMPILER_RUNTIME = {
			__proto__: null,
			c: function(size) {
				return ReactSharedInternals.H.useMemoCache(size);
			}
		};
		exports.cache = function(fn) {
			return function() {
				return fn.apply(null, arguments);
			};
		};
		exports.cacheSignal = function() {
			return null;
		};
		exports.cloneElement = function(element, config, children) {
			if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
			var props = assign({}, element.props), key = element.key;
			if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
			var propName = arguments.length - 2;
			if (1 === propName) props.children = children;
			else if (1 < propName) {
				for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
				props.children = childArray;
			}
			return ReactElement(element.type, key, props);
		};
		exports.createContext = function(defaultValue) {
			defaultValue = {
				$$typeof: REACT_CONTEXT_TYPE,
				_currentValue: defaultValue,
				_currentValue2: defaultValue,
				_threadCount: 0,
				Provider: null,
				Consumer: null
			};
			defaultValue.Provider = defaultValue;
			defaultValue.Consumer = {
				$$typeof: REACT_CONSUMER_TYPE,
				_context: defaultValue
			};
			return defaultValue;
		};
		exports.createElement = function(type, config, children) {
			var propName, props = {}, key = null;
			if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
			var childrenLength = arguments.length - 2;
			if (1 === childrenLength) props.children = children;
			else if (1 < childrenLength) {
				for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
				props.children = childArray;
			}
			if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
			return ReactElement(type, key, props);
		};
		exports.createRef = function() {
			return { current: null };
		};
		exports.forwardRef = function(render) {
			return {
				$$typeof: REACT_FORWARD_REF_TYPE,
				render
			};
		};
		exports.isValidElement = isValidElement;
		exports.lazy = function(ctor) {
			return {
				$$typeof: REACT_LAZY_TYPE,
				_payload: {
					_status: -1,
					_result: ctor
				},
				_init: lazyInitializer
			};
		};
		exports.memo = function(type, compare) {
			return {
				$$typeof: REACT_MEMO_TYPE,
				type,
				compare: void 0 === compare ? null : compare
			};
		};
		exports.startTransition = function(scope) {
			var prevTransition = ReactSharedInternals.T, currentTransition = {};
			ReactSharedInternals.T = currentTransition;
			try {
				var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
				null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
				"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
			} catch (error) {
				reportGlobalError(error);
			} finally {
				null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
			}
		};
		exports.unstable_useCacheRefresh = function() {
			return ReactSharedInternals.H.useCacheRefresh();
		};
		exports.use = function(usable) {
			return ReactSharedInternals.H.use(usable);
		};
		exports.useActionState = function(action, initialState, permalink) {
			return ReactSharedInternals.H.useActionState(action, initialState, permalink);
		};
		exports.useCallback = function(callback, deps) {
			return ReactSharedInternals.H.useCallback(callback, deps);
		};
		exports.useContext = function(Context) {
			return ReactSharedInternals.H.useContext(Context);
		};
		exports.useDebugValue = function() {};
		exports.useDeferredValue = function(value, initialValue) {
			return ReactSharedInternals.H.useDeferredValue(value, initialValue);
		};
		exports.useEffect = function(create, deps) {
			return ReactSharedInternals.H.useEffect(create, deps);
		};
		exports.useEffectEvent = function(callback) {
			return ReactSharedInternals.H.useEffectEvent(callback);
		};
		exports.useId = function() {
			return ReactSharedInternals.H.useId();
		};
		exports.useImperativeHandle = function(ref, create, deps) {
			return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
		};
		exports.useInsertionEffect = function(create, deps) {
			return ReactSharedInternals.H.useInsertionEffect(create, deps);
		};
		exports.useLayoutEffect = function(create, deps) {
			return ReactSharedInternals.H.useLayoutEffect(create, deps);
		};
		exports.useMemo = function(create, deps) {
			return ReactSharedInternals.H.useMemo(create, deps);
		};
		exports.useOptimistic = function(passthrough, reducer) {
			return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
		};
		exports.useReducer = function(reducer, initialArg, init) {
			return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
		};
		exports.useRef = function(initialValue) {
			return ReactSharedInternals.H.useRef(initialValue);
		};
		exports.useState = function(initialState) {
			return ReactSharedInternals.H.useState(initialState);
		};
		exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
			return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
		};
		exports.useTransition = function() {
			return ReactSharedInternals.H.useTransition();
		};
		exports.version = "19.2.8";
	}));
	//#endregion
	//#region ../../node_modules/.bun/react@19.2.8/node_modules/react/index.js
	var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		module.exports = require_react_production();
	}));
	//#endregion
	//#region ../../node_modules/.bun/react@19.2.8/node_modules/react/cjs/react-jsx-runtime.production.js
	/**
	* @license React
	* react-jsx-runtime.production.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_jsx_runtime_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
		var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
		function jsxProd(type, config, maybeKey) {
			var key = null;
			void 0 !== maybeKey && (key = "" + maybeKey);
			void 0 !== config.key && (key = "" + config.key);
			if ("key" in config) {
				maybeKey = {};
				for (var propName in config) "key" !== propName && (maybeKey[propName] = config[propName]);
			} else maybeKey = config;
			config = maybeKey.ref;
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				ref: void 0 !== config ? config : null,
				props: maybeKey
			};
		}
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.jsx = jsxProd;
		exports.jsxs = jsxProd;
	}));
	//#endregion
	//#region ../../node_modules/.bun/react@19.2.8/node_modules/react/jsx-runtime.js
	var require_jsx_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		module.exports = require_react_jsx_runtime_production();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/TuonoContext.js
	/**
	* @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
	*
	* @see https://github.com/tuono-labs/tuono/issues/410
	*/
	function TuonoContextProvider({ serverPayload, rawServerPayload, children }) {
		const contextValue = (0, import_react$16.useMemo)(() => {
			return {
				serverPayload: isServerSide$2 ? serverPayload : window[SERVER_PAYLOAD_VARIABLE_NAME],
				rawServerPayload
			};
		}, [serverPayload, rawServerPayload]);
		return /* @__PURE__ */ (0, import_jsx_runtime$30.jsx)(TuonoContext, {
			value: contextValue,
			children
		});
	}
	/**
	* @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
	*/
	function useTuonoContextServerPayload() {
		return (0, import_react$16.useContext)(TuonoContext).serverPayload;
	}
	/**
	* @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
	*
	* The raw server payload JSON (server render only); undefined on the client.
	*/
	function useTuonoContextRawServerPayload() {
		return (0, import_react$16.useContext)(TuonoContext).rawServerPayload;
	}
	var import_react$16, import_jsx_runtime$30, isServerSide$2, TuonoContext;
	var init_TuonoContext = __esmMin((() => {
		init_constants();
		import_react$16 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_jsx_runtime$30 = require_jsx_runtime();
		isServerSide$2 = typeof window === "undefined";
		TuonoContext = (0, import_react$16.createContext)({});
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/data/resourceCache.js
	/**
	* The data endpoint URL for a location. In a static export it targets the
	* pre-rendered `.json` file matching what `tuono build --static` writes (root is
	* `/__tuono/data.json` to avoid a `data/.json` dotfile); otherwise the live
	* server's extensionless route, including search params.
	*/
	function dataEndpointUrl({ pathname, searchStr }) {
		return `/__tuono/data${pathname}${searchStr}`;
	}
	/**
	* Rebuild a `ServerErrorPayload` (from the Rust server) into a real `Error` so
	* the error boundary / dev overlay treats a backend panic exactly like a JS
	* error, preserving the panic message and backtrace.
	*/
	function serverErrorToError(payload) {
		const error = new Error(payload.message);
		error.name = payload.name;
		if (payload.stack) error.stack = payload.stack;
		if (payload.source) error.tuonoServerSource = payload.source;
		return error;
	}
	/**
	* Single source of truth for a resource key — used by both the seeder and the
	* loader. Includes `searchStr` so search-param-only navigations create a
	* distinct resource (and therefore refetch).
	*/
	function buildResourceKey(navigationId, { pathname, searchStr }) {
		return `${navigationId}::${pathname}${searchStr}`;
	}
	/** Normalize user server data into a `data` result for seeding. */
	function toDataResult(props) {
		return {
			kind: "data",
			props: props ?? {}
		};
	}
	/**
	* Resource key for a `layout.rs` handler's data. Keyed by the layout's `dataKey`
	* alone (not the navigation) so its data persists across navigations under the
	* same layout and is simply overwritten by each page's data fetch — matching how
	* layouts persist in the tree.
	*/
	function buildLayoutResourceKey(dataKey) {
		return `layout::${dataKey}`;
	}
	/**
	* Seed the wrapping layouts' server data (from a page's SSR payload or data
	* fetch), keyed by each layout's `dataKey`.
	*/
	function seedLayoutData(layoutData) {
		for (const [dataKey, props] of Object.entries(layoutData)) seedResource(buildLayoutResourceKey(dataKey), toDataResult(props));
	}
	/**
	* Read a layout's seeded server data synchronously (no fetch, no suspend): a
	* layout's data always arrives via the page it wraps. Returns empty props when
	* nothing is seeded yet (e.g. a loading-fallback navigation's first frame).
	*/
	function readLayoutData(dataKey) {
		const resource = cache.get(buildLayoutResourceKey(dataKey));
		if (resource?.status === "fulfilled" && resource.value?.kind === "data") return resource.value.props;
		return {};
	}
	function annotate(promise) {
		const resource = promise;
		resource.status = "pending";
		resource.then((value) => {
			resource.status = "fulfilled";
			resource.value = value;
		}, (reason) => {
			resource.status = "rejected";
			resource.reason = reason;
		});
		return resource;
	}
	async function fetchRouteData(location) {
		const res = await fetch(dataEndpointUrl(location));
		const body = await res.json().catch(() => null);
		if (body?.info.serverError) throw serverErrorToError(body.info.serverError);
		if (body?.info.redirect_destination) return {
			kind: "redirect",
			destination: body.info.redirect_destination
		};
		if (!res.ok || !body) throw new Error(`Failed to load server data for "${location.pathname}" (status ${res.status})`);
		if (body.layoutData) seedLayoutData(body.layoutData);
		return toDataResult(body.data);
	}
	/**
	* Insert a pre-fulfilled resource — used to seed the SSR initial data so the
	* first render (server and client) reads it synchronously.
	*/
	function seedResource(key, value) {
		const resource = Promise.resolve(value);
		resource.status = "fulfilled";
		resource.value = value;
		cache.set(key, resource);
		return resource;
	}
	/**
	* Insert a pre-rejected resource carrying a server error — used to seed a
	* handler panic (dev) so `use()` re-throws it into the error boundary on the
	* first render (server and client), rendering the error overlay.
	*/
	function seedErrorResource(key, payload) {
		const reason = serverErrorToError(payload);
		const resource = Promise.reject(reason);
		resource.catch(() => void 0);
		resource.status = "rejected";
		resource.reason = reason;
		cache.set(key, resource);
		return resource;
	}
	/**
	* Return the cached resource for `key`, creating one on demand. Idempotent
	* (StrictMode-safe): at most one fetch is started per key.
	*
	* The server never fetches (the ssr_rs V8 runtime has no `fetch`); every
	* server-rendered route is pre-seeded, and any un-seeded server lookup resolves
	* to empty props rather than suspending.
	*/
	function getOrCreateResource(key, route, location) {
		const existing = cache.get(key);
		if (existing) return existing;
		if (isServerSide$1 || !route.options.hasHandler) return seedResource(key, {
			kind: "data",
			props: {}
		});
		const resource = annotate(fetchRouteData(location));
		cache.set(key, resource);
		evictStaleEntries(key);
		return resource;
	}
	function evictStaleEntries(currentKey) {
		if (cache.size <= CACHE_LIMIT) return;
		for (const key of cache.keys()) {
			if (cache.size <= CACHE_LIMIT) break;
			if (key !== currentKey) cache.delete(key);
		}
	}
	var isServerSide$1, CACHE_LIMIT, cache;
	var init_resourceCache = __esmMin((() => {
		isServerSide$1 = typeof window === "undefined";
		CACHE_LIMIT = 50;
		cache = /* @__PURE__ */ new Map();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/utils/from-url-to-parsed-location.js
	function fromUrlToParsedLocation(href) {
		const location = new URL(href, window.location.origin);
		return {
			href: location.href,
			pathname: location.pathname,
			search: Object.fromEntries(location.searchParams),
			searchStr: location.search,
			hash: location.hash
		};
	}
	var init_from_url_to_parsed_location = __esmMin((() => {}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/utils/match-route.js
	function getDynamicRoutes(routesById) {
		let cached = dynamicRoutesCache.get(routesById);
		if (!cached) {
			cached = Object.keys(routesById).filter((route) => DYNAMIC_PATH_REGEX.test(route)).sort().map((route) => ({
				route,
				segments: route.split("/").filter(Boolean)
			}));
			dynamicRoutesCache.set(routesById, cached);
		}
		return cached;
	}
	/**
	* In order to correctly handle pathnames that might finish with a slash
	* we first sanitize them by removing the final slash.
	*/
	function sanitizePathname(pathname) {
		if (pathname.endsWith("/") && pathname !== "/") return pathname.substring(0, pathname.length - 1);
		return pathname;
	}
	/**
	* Returns the route that matches the given pathname, from the router's route
	* table. Pure (no hooks) so it can be used both by `useRoute` and at navigation
	* time (to inspect the target route before committing).
	*
	* This matching is also implemented on the server side to pick the bundle to
	* load at the first rendering — see crates/tuono_lib/src/payload.rs. Any
	* optimization should happen on both.
	*/
	function matchRoute(routesById, pathname) {
		if (!pathname) return;
		pathname = sanitizePathname(pathname);
		if (routesById[pathname]) return routesById[pathname];
		const dynamicRoutes = getDynamicRoutes(routesById);
		if (!dynamicRoutes.length) return;
		const pathSegments = pathname.split("/").filter(Boolean);
		let match = void 0;
		for (const { segments: dynamicRouteSegments } of dynamicRoutes) {
			const routeSegmentsCollector = [];
			for (let i = 0; i < dynamicRouteSegments.length; i++) {
				if (dynamicRouteSegments[i]?.startsWith("[...")) {
					routeSegmentsCollector.push(dynamicRouteSegments[i] ?? "");
					match = `/${routeSegmentsCollector.join("/")}`;
					break;
				}
				if (dynamicRouteSegments[i] === pathSegments[i] || DYNAMIC_PATH_REGEX.test(dynamicRouteSegments[i] || "")) routeSegmentsCollector.push(dynamicRouteSegments[i] ?? "");
				else break;
			}
			if (routeSegmentsCollector.length === pathSegments.length) {
				match = `/${routeSegmentsCollector.join("/")}`;
				break;
			}
		}
		if (!match) return;
		return routesById[match];
	}
	var DYNAMIC_PATH_REGEX, dynamicRoutesCache;
	var init_match_route = __esmMin((() => {
		DYNAMIC_PATH_REGEX = /\[(.*?)\]/;
		dynamicRoutesCache = /* @__PURE__ */ new WeakMap();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/RouterContext.js
	/**
	* Warm a route's critical CSS before navigating to it, so the
	* `<link rel="stylesheet" precedence>` that renders on arrival doesn't suspend
	* (and flash the loading fallback) while the stylesheet downloads. Resolves once
	* the resource is cached; never rejects.
	*/
	function preloadCriticalCss(componentId) {
		const href = `${CRITICAL_CSS_PATH$1}?componentId=${componentId}`;
		if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return Promise.resolve();
		return new Promise((resolve) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "style";
			link.href = href;
			link.onload = () => resolve();
			link.onerror = () => resolve();
			document.head.appendChild(link);
		});
	}
	function getInitialLocation(serverPayloadLocation) {
		if (isServerSide) return {
			pathname: serverPayloadLocation.pathname || "",
			hash: "",
			href: serverPayloadLocation.href || "",
			searchStr: serverPayloadLocation.searchStr || "",
			search: Object.fromEntries(new URLSearchParams(serverPayloadLocation.searchStr))
		};
		const { pathname, hash, href, search } = window.location;
		return {
			pathname,
			hash,
			href,
			searchStr: search,
			search: Object.fromEntries(new URLSearchParams(search))
		};
	}
	function RouterContextProvider({ router, serverInitialLocation, children }) {
		const [location, setLocation] = (0, import_react$15.useState)(() => getInitialLocation(serverInitialLocation));
		const [navigationId, setNavigationId] = (0, import_react$15.useState)(0);
		const updateLocation = (0, import_react$15.useCallback)((newLocation, options = {}) => {
			const commit = () => {
				setNavigationId((id) => id + 1);
				setLocation(newLocation);
				if (options.history) {
					const { type, path } = options.history;
					window.history[type](path, "", path);
				}
				if (options.scroll) window.scroll(0, 0);
			};
			const targetRoute = matchRoute(router.routesById, newLocation.pathname);
			if (!targetRoute || isServerSide) {
				commit();
				return;
			}
			const pending = [];
			if (targetRoute.options.hasHandler) pending.push(getOrCreateResource(buildResourceKey(navigationId + 1, newLocation), targetRoute, newLocation));
			const criticalCssEnabled = !!document.querySelector(CRITICAL_CSS_LINK_SELECTOR);
			for (let node = targetRoute; node; node = node.isRoot ? void 0 : node.options.getParentRoute?.()) {
				const preloadComponent = node.component.preload;
				if (preloadComponent) pending.push(preloadComponent());
				const componentId = node.filePath || node.id;
				if (criticalCssEnabled && componentId) pending.push(preloadCriticalCss(componentId));
			}
			if (pending.length === 0) {
				commit();
				return;
			}
			const ready = Promise.all(pending);
			if (targetRoute.options.loadingComponent) Promise.race([ready, wait(FALLBACK_DELAY_MS)]).then(commit, commit);
			else ready.then(commit, commit);
		}, [router, navigationId]);
		const retry = (0, import_react$15.useCallback)(() => {
			setNavigationId((id) => id + 1);
		}, []);
		/**
		* Listen browser navigation events. The browser has already updated the URL,
		* so this only mirrors it into router state (and bumps the navigation id so
		* the route refetches — preserving back/forward data loads).
		*/
		(0, import_react$15.useEffect)(() => {
			const updateLocationOnPopStateChange = ({ target }) => {
				const { location: targetLocation } = target;
				updateLocation(fromUrlToParsedLocation(targetLocation.href));
			};
			window.addEventListener("popstate", updateLocationOnPopStateChange);
			return () => {
				window.removeEventListener("popstate", updateLocationOnPopStateChange);
			};
		}, [updateLocation]);
		const contextValue = (0, import_react$15.useMemo)(() => ({
			router,
			location,
			navigationId,
			updateLocation,
			retry
		}), [
			location,
			router,
			navigationId,
			updateLocation,
			retry
		]);
		return /* @__PURE__ */ (0, import_jsx_runtime$29.jsx)(RouterContext.Provider, {
			value: contextValue,
			children
		});
	}
	/**
	* @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
	*/
	function useRouterContext() {
		return (0, import_react$15.useContext)(RouterContext);
	}
	var import_react$15, import_jsx_runtime$29, isServerSide, FALLBACK_DELAY_MS, wait, CRITICAL_CSS_PATH$1, CRITICAL_CSS_LINK_SELECTOR, RouterContext;
	var init_RouterContext = __esmMin((() => {
		init_resourceCache();
		init_from_url_to_parsed_location();
		init_match_route();
		import_react$15 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_jsx_runtime$29 = require_jsx_runtime();
		isServerSide = typeof window === "undefined";
		FALLBACK_DELAY_MS = 100;
		wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		CRITICAL_CSS_PATH$1 = "/vite-server/tuono_internal__critical_css";
		CRITICAL_CSS_LINK_SELECTOR = `link[href*="${CRITICAL_CSS_PATH$1.split("/").pop()}"]`;
		RouterContext = (0, import_react$15.createContext)({});
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/hooks/useRouter.js
	var import_react$14, useRouter;
	var init_useRouter = __esmMin((() => {
		init_RouterContext();
		import_react$14 = /* @__PURE__ */ __toESM(require_react(), 1);
		useRouter = () => {
			const { location, updateLocation } = useRouterContext();
			const navigate = (0, import_react$14.useCallback)((type, path, opts) => {
				const { scroll = true } = opts || {};
				const url = new URL(path, window.location.origin);
				updateLocation({
					href: url.href,
					pathname: url.pathname,
					search: Object.fromEntries(url.searchParams),
					searchStr: url.search,
					hash: url.hash
				}, {
					history: {
						type,
						path
					},
					scroll
				});
			}, [updateLocation]);
			return {
				push: (0, import_react$14.useCallback)((path, opts) => {
					navigate("pushState", path, opts);
				}, [navigate]),
				replace: (0, import_react$14.useCallback)((path, opts) => {
					navigate("replaceState", path, opts);
				}, [navigate]),
				query: location.search,
				pathname: location.pathname
			};
		};
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/utils.js
	function joinPaths(paths) {
		return cleanPath(paths.filter(Boolean).join("/"));
	}
	function cleanPath(path) {
		return path.replace(/\/{2,}/g, "/");
	}
	function trimPathLeft(path) {
		return path === "/" ? path : path.replace(/^\/{1,}/, "");
	}
	function trimPathRight(path) {
		return path === "/" ? path : path.replace(/\/{1,}$/, "");
	}
	function trimPath(path) {
		return trimPathRight(trimPathLeft(path));
	}
	var init_utils$1 = __esmMin((() => {}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/route.js
	function createRoute(options) {
		return new Route(options);
	}
	var ROOT_ROUTE_ID, Route;
	var init_route = __esmMin((() => {
		init_utils$1();
		ROOT_ROUTE_ID = "__root__";
		Route = class {
			constructor(options) {
				this.init = (originalIndex) => {
					this.originalIndex = originalIndex;
					this.parentRoute = this.options.getParentRoute?.();
					const isRoot = !this.parentRoute && !this.options.path && !this.options.id;
					if (isRoot) this.path = ROOT_ROUTE_ID;
					let path = isRoot ? ROOT_ROUTE_ID : this.options.path;
					if (path && path !== "/") path = trimPathLeft(path);
					const customId = this.options.id || path || this.options.filePath;
					let id = isRoot ? ROOT_ROUTE_ID : joinPaths([customId]);
					if (path === "__root__") path = "/";
					if (id !== "__root__") id = joinPaths(["/", id]);
					this.filePath = this.options.filePath;
					this.path = path;
					this.id = id;
					this.fullPath = path || "";
				};
				this.update = (options) => {
					Object.assign(this.options, options);
					this.isRoot = options.isRoot || !options.getParentRoute;
					return this;
				};
				this.isRoot = options.isRoot ?? typeof options.getParentRoute !== "function";
				this.options = options;
				this.$$typeof = Symbol.for("react.memo");
				this.component = options.component;
			}
			addChildren(routes) {
				this.children = routes;
				return this;
			}
		};
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/hooks/useRoute.js
	/**
	* Returns the route that matches the given pathname.
	*
	* This hook is also implemented on server side to match the bundle
	* file to load at the first rendering.
	*
	* File: crates/tuono_lib/src/payload.rs
	*
	* Optimizations should occur on both
	*/
	function useRoute(pathname) {
		const { router: { routesById } } = useRouterContext();
		return matchRoute(routesById, pathname);
	}
	var init_useRoute = __esmMin((() => {
		init_match_route();
		init_RouterContext();
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-intersection-observer@9.16.0+005eabf3d8b6ef06/node_modules/react-intersection-observer/dist/index.mjs
	function getRootId(root) {
		if (!root) return "0";
		if (RootIds.has(root)) return RootIds.get(root);
		rootId += 1;
		RootIds.set(root, rootId.toString());
		return RootIds.get(root);
	}
	function optionsToId(options) {
		return Object.keys(options).sort().filter((key) => options[key] !== void 0).map((key) => {
			return `${key}_${key === "root" ? getRootId(options.root) : options[key]}`;
		}).toString();
	}
	function createObserver(options) {
		const id = optionsToId(options);
		let instance = observerMap.get(id);
		if (!instance) {
			const elements = /* @__PURE__ */ new Map();
			let thresholds;
			const observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					var _a;
					const inView = entry.isIntersecting && thresholds.some((threshold) => entry.intersectionRatio >= threshold);
					if (options.trackVisibility && typeof entry.isVisible === "undefined") entry.isVisible = inView;
					(_a = elements.get(entry.target)) == null || _a.forEach((callback) => {
						callback(inView, entry);
					});
				});
			}, options);
			thresholds = observer.thresholds || (Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0]);
			instance = {
				id,
				observer,
				elements
			};
			observerMap.set(id, instance);
		}
		return instance;
	}
	function observe(element, callback, options = {}, fallbackInView = unsupportedValue) {
		if (typeof window.IntersectionObserver === "undefined" && fallbackInView !== void 0) {
			const bounds = element.getBoundingClientRect();
			callback(fallbackInView, {
				isIntersecting: fallbackInView,
				target: element,
				intersectionRatio: typeof options.threshold === "number" ? options.threshold : 0,
				time: 0,
				boundingClientRect: bounds,
				intersectionRect: bounds,
				rootBounds: bounds
			});
			return () => {};
		}
		const { id, observer, elements } = createObserver(options);
		const callbacks = elements.get(element) || [];
		if (!elements.has(element)) elements.set(element, callbacks);
		callbacks.push(callback);
		observer.observe(element);
		return function unobserve() {
			callbacks.splice(callbacks.indexOf(callback), 1);
			if (callbacks.length === 0) {
				elements.delete(element);
				observer.unobserve(element);
			}
			if (elements.size === 0) {
				observer.disconnect();
				observerMap.delete(id);
			}
		};
	}
	function useInView({ threshold, delay, trackVisibility, rootMargin, root, triggerOnce, skip, initialInView, fallbackInView, onChange } = {}) {
		var _a;
		const [ref, setRef] = import_react$13.useState(null);
		const callback = import_react$13.useRef(onChange);
		const [state, setState] = import_react$13.useState({
			inView: !!initialInView,
			entry: void 0
		});
		callback.current = onChange;
		import_react$13.useEffect(() => {
			if (skip || !ref) return;
			let unobserve;
			unobserve = observe(ref, (inView, entry) => {
				setState({
					inView,
					entry
				});
				if (callback.current) callback.current(inView, entry);
				if (entry.isIntersecting && triggerOnce && unobserve) {
					unobserve();
					unobserve = void 0;
				}
			}, {
				root,
				rootMargin,
				threshold,
				trackVisibility,
				delay
			}, fallbackInView);
			return () => {
				if (unobserve) unobserve();
			};
		}, [
			Array.isArray(threshold) ? threshold.toString() : threshold,
			ref,
			root,
			rootMargin,
			triggerOnce,
			skip,
			trackVisibility,
			fallbackInView,
			delay
		]);
		const entryTarget = (_a = state.entry) == null ? void 0 : _a.target;
		const previousEntryTarget = import_react$13.useRef(void 0);
		if (!ref && entryTarget && !triggerOnce && !skip && previousEntryTarget.current !== entryTarget) {
			previousEntryTarget.current = entryTarget;
			setState({
				inView: !!initialInView,
				entry: void 0
			});
		}
		const result = [
			setRef,
			state.inView,
			state.entry
		];
		result.ref = result[0];
		result.inView = result[1];
		result.entry = result[2];
		return result;
	}
	var import_react$12, import_react$13, observerMap, RootIds, rootId, unsupportedValue;
	var init_dist = __esmMin((() => {
		import_react$12 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_react$13 = /* @__PURE__ */ __toESM(require_react(), 1);
		observerMap = /* @__PURE__ */ new Map();
		RootIds = /* @__PURE__ */ new WeakMap();
		rootId = 0;
		unsupportedValue = void 0;
		import_react$12.Component;
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/Link.js
	function isEventModifierKeyActiveAndTargetDifferentFromSelf(event) {
		const target = event.currentTarget.getAttribute("target");
		return target && target !== "_self" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
	}
	function Link(componentProps) {
		const { preload = true, scroll = true, children, href, replace, onClick, ...rest } = componentProps;
		const router = useRouter();
		const route = useRoute(href);
		const { ref } = useInView({
			onChange(inView) {
				if (inView && preload) route?.component.preload?.();
			},
			triggerOnce: true
		});
		const handleTransition = (event) => {
			onClick?.(event);
			if (href?.startsWith("#") || isEventModifierKeyActiveAndTargetDifferentFromSelf(event)) return;
			event.preventDefault();
			router[replace ? "replace" : "push"](href || "", { scroll });
		};
		return /* @__PURE__ */ (0, import_jsx_runtime$28.jsx)("a", {
			...rest,
			href,
			ref,
			onClick: handleTransition,
			children
		});
	}
	var import_jsx_runtime$28;
	var init_Link = __esmMin((() => {
		init_useRoute();
		init_useRouter();
		import_jsx_runtime$28 = require_jsx_runtime();
		init_dist();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/CriticalCss.js
	/**
	* Returns the critical CSS for the given route
	* This is required in order to avoid FOUC during development
	* since vite does not support CSS injection without JS waterfall
	*/
	function CriticalCss({ routeFilePath, mode }) {
		if (!routeFilePath || mode !== "Dev") return null;
		return /* @__PURE__ */ (0, import_jsx_runtime$27.jsx)("link", {
			href: `${CRITICAL_CSS_PATH}?componentId=${routeFilePath}`,
			precedence: "high",
			rel: "stylesheet"
		});
	}
	var import_jsx_runtime$27, CRITICAL_CSS_PATH;
	var init_CriticalCss = __esmMin((() => {
		import_jsx_runtime$27 = require_jsx_runtime();
		CRITICAL_CSS_PATH = "/vite-server/tuono_internal__critical_css";
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/Redirect.js
	/**
	* Performs a client-side redirect (returned from a route's data load) in an
	* effect — never during render, since navigation is a side effect and the app
	* renders under `StrictMode`. Uses `replace` so the redirecting URL does not
	* become a back-button trap.
	*/
	function Redirect({ to }) {
		const { replace } = useRouter();
		(0, import_react$11.useEffect)(() => {
			replace(to);
		}, [replace, to]);
		return null;
	}
	var import_react$11;
	var init_Redirect = __esmMin((() => {
		init_useRouter();
		import_react$11 = /* @__PURE__ */ __toESM(require_react(), 1);
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/RouteDataLoader.js
	/**
	* Reads the route's server data resource via `use()`. On the initial render the
	* resource is pre-seeded (SSR data) so this resolves synchronously; on client
	* navigation it suspends until the fetch settles, showing the `<Suspense>`
	* fallback (`loading.tsx`). A rejected resource is re-thrown by `use()` and
	* caught by the surrounding error boundary (`error.tsx`).
	*
	* The route's critical CSS is intentionally rendered by `RouteMatch` OUTSIDE
	* the `<Suspense>` boundary (see the note there) — a `precedence` stylesheet
	* inside the boundary would defer its streamed reveal.
	*/
	function RouteDataLoader({ route, resourceKey, location }) {
		const result = (0, import_react$10.use)(getOrCreateResource(resourceKey, route, location));
		if (result.kind === "redirect") return /* @__PURE__ */ (0, import_jsx_runtime$26.jsx)(Redirect, { to: result.destination });
		const Component = route.component;
		return /* @__PURE__ */ (0, import_jsx_runtime$26.jsx)(Component, { ...result.props });
	}
	var import_react$10, import_jsx_runtime$26;
	var init_RouteDataLoader = __esmMin((() => {
		init_resourceCache();
		init_Redirect();
		import_react$10 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_jsx_runtime$26 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/TuonoErrorBoundary.js
	var import_react$9, import_jsx_runtime$25, TuonoErrorBoundary;
	var init_TuonoErrorBoundary = __esmMin((() => {
		import_react$9 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_jsx_runtime$25 = require_jsx_runtime();
		TuonoErrorBoundary = class extends import_react$9.Component {
			constructor(..._args) {
				super(..._args);
				this.state = {
					error: null,
					resetKey: this.props.resetKey
				};
				this.reset = () => {
					this.props.onReset();
				};
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			static getDerivedStateFromProps(props, state) {
				if (props.resetKey !== state.resetKey) return {
					error: null,
					resetKey: props.resetKey
				};
				return null;
			}
			render() {
				const { error } = this.state;
				if (error) {
					const Fallback = this.props.fallback;
					return /* @__PURE__ */ (0, import_jsx_runtime$25.jsx)(Fallback, {
						error,
						reset: this.reset
					});
				}
				return this.props.children;
			}
		};
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/base.js
	var base_default;
	var init_base = __esmMin((() => {
		base_default = "/*\n * Design tokens shared by the framework's default screens (the dev error\n * overlay, the production error fallback, the not-found page, …). Injected as a\n * `<style>` element by `BaseStyles` — the router library has no CSS bundling\n * step, so styles ship as strings.\n *\n * The Google Fonts import MUST stay the first rule in the sheet (CSS ignores\n * `@import` that follows other rules). Noto Sans is the default body font;\n * JetBrains Mono is used for code and stack traces.\n */\n@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans:wght@400;500;600;700&display=swap');\n\n:root {\n  /* Typography ------------------------------------------------------------ */\n  --tuono-font-sans:\n    'Noto Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial,\n    sans-serif;\n  --tuono-font-mono:\n    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas,\n    'Liberation Mono', monospace;\n\n  --tuono-font-size-xs: 12px;\n  --tuono-font-size-sm: 13px;\n  --tuono-font-size: 14px;\n  --tuono-font-size-lg: 18px;\n  --tuono-font-size-xl: 22px;\n\n  --tuono-font-weight-regular: 400;\n  --tuono-font-weight-medium: 500;\n  --tuono-font-weight-semibold: 600;\n  --tuono-font-weight-bold: 700;\n\n  --tuono-line-height: 1.5;\n  --tuono-line-height-tight: 1.25;\n  --tuono-letter-spacing-wide: 0.04em;\n\n  /* Colours (dark theme) -------------------------------------------------- */\n  --tuono-color-bg: #0a0a0e;\n  --tuono-color-surface: #101014;\n  --tuono-color-surface-hover: #1c1c22;\n  --tuono-color-surface-raised: #151519;\n  --tuono-color-border: rgba(255, 255, 255, 0.1);\n  --tuono-color-border-strong: #3a3a42;\n\n  --tuono-color-text: #e6e6e6;\n  --tuono-color-text-muted: #c7c7cf;\n  --tuono-color-text-subtle: #8a8a94;\n  --tuono-color-text-faint: #6f6f78;\n\n  --tuono-color-accent: #f43f5e;\n  --tuono-color-accent-text: #ff8fa3;\n  --tuono-color-on-accent: #ffffff;\n  --tuono-color-danger-surface: #4a1d27;\n\n  --tuono-color-success: #22c55e;\n  --tuono-color-success-text: #4ade80;\n  --tuono-color-success-surface: #16331f;\n\n  /* Radii ----------------------------------------------------------------- */\n  --tuono-radius-sm: 6px;\n  --tuono-radius: 8px;\n  --tuono-radius-pill: 999px;\n\n  /* Spacing --------------------------------------------------------------- */\n  --tuono-space-1: 0.25rem;\n  --tuono-space-2: 0.5rem;\n  --tuono-space-3: 0.75rem;\n  --tuono-space-4: 1rem;\n  --tuono-space-6: 1.5rem;\n  --tuono-space-8: 2rem;\n}\n";
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/BaseStyles.js
	/**
	* Injects the shared design tokens ({@link file://./base.css}) — colours,
	* typography and the Google Font imports (Noto Sans / JetBrains Mono) — used by
	* the framework's default screens. Rendered once at the top of each default
	* screen so it is self-contained (no dependency on the app's stylesheet).
	*/
	function BaseStyles() {
		return /* @__PURE__ */ (0, import_jsx_runtime$24.jsx)("style", { children: base_default });
	}
	var import_jsx_runtime$24;
	var init_BaseStyles = __esmMin((() => {
		init_base();
		import_jsx_runtime$24 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/DefaultScreen.js
	/**
	* Shared shell for the framework's full-page default screens — the production
	* error fallback ({@link DefaultError}) and the 404 page
	* ({@link NotFoundDefaultContent}) — styled to match the development
	* {@link DevErrorOverlay}: a dark canvas with an accent badge and heading.
	*/
	function DefaultScreen({ role, badge, title, children }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$23.jsxs)("div", {
			className: "tuono-screen",
			role,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime$23.jsx)(BaseStyles, {}),
				/* @__PURE__ */ (0, import_jsx_runtime$23.jsx)("style", { children: STYLES }),
				/* @__PURE__ */ (0, import_jsx_runtime$23.jsxs)("div", {
					className: "tuono-screen-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$23.jsx)("span", {
							className: "tuono-screen-badge",
							children: badge
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$23.jsx)("h1", {
							className: "tuono-screen-title",
							children: title
						}),
						children
					]
				})
			]
		});
	}
	var import_jsx_runtime$23, STYLES;
	var init_DefaultScreen = __esmMin((() => {
		init_BaseStyles();
		import_jsx_runtime$23 = require_jsx_runtime();
		STYLES = `
.tuono-screen {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--tuono-space-8);
  background: var(--tuono-color-bg);
  color: var(--tuono-color-text);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size);
  line-height: var(--tuono-line-height);
}
.tuono-screen * { font-family: var(--tuono-font-sans); }
.tuono-screen-card {
  max-width: 32rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tuono-space-4);
  text-align: center;
}
.tuono-screen-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  letter-spacing: var(--tuono-letter-spacing-wide);
  text-transform: uppercase;
}
.tuono-screen-title {
  margin: 0;
  font-size: var(--tuono-font-size-xl);
  font-weight: var(--tuono-font-weight-bold);
  color: var(--tuono-color-accent-text);
}
.tuono-screen-text {
  margin: 0;
  color: var(--tuono-color-text-muted);
}
.tuono-screen-action {
  padding: 6px 16px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}
.tuono-screen-action:hover { background: var(--tuono-color-surface-hover); }
`;
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/DefaultError.js
	/**
	* Production error fallback used when a route has no `error.tsx`. Deliberately
	* shows no error message, stack or source — those could leak internals — just a
	* friendly notice and a retry. The rich {@link DevErrorOverlay} is used in
	* development instead.
	*/
	function DefaultError({ reset }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$22.jsxs)(DefaultScreen, {
			role: "alert",
			badge: "Error",
			title: "Something went wrong",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$22.jsx)("p", {
				className: "tuono-screen-text",
				children: "An unexpected error occurred. Please try again."
			}), /* @__PURE__ */ (0, import_jsx_runtime$22.jsx)("button", {
				type: "button",
				className: "tuono-screen-action",
				onClick: reset,
				children: "Try again"
			})]
		});
	}
	var import_jsx_runtime$22;
	var init_DefaultError = __esmMin((() => {
		init_DefaultScreen();
		import_jsx_runtime$22 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/DefaultLoading.js
	/**
	* Framework default `<Suspense>` fallback used when a route has no nearest
	* `loading.tsx`. Intentionally renders nothing — apps provide their own
	* `loading.tsx` for real loading UI.
	*/
	function DefaultLoading() {
		return null;
	}
	var init_DefaultLoading = __esmMin((() => {}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/devErrorSource.js
	var init_devErrorSource = __esmMin((() => {}));
	var init_DevErrorContent = __esmMin((() => {
		init_devErrorSource();
		require_jsx_runtime();
		require_react();
	}));
	var init_DevErrorOverlay = __esmMin((() => {
		init_BaseStyles();
		init_DevErrorContent();
		require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/devErrorStore.js
	/** The corner is a persisted preference; hiding the badge is per-session. */
	function loadCorner() {
		try {
			const stored = globalThis.localStorage?.getItem(CORNER_STORAGE_KEY);
			if (stored && DEV_OVERLAY_CORNERS.includes(stored)) return stored;
		} catch {}
		return DEFAULT_CORNER;
	}
	function saveCorner(corner) {
		try {
			globalThis.localStorage?.setItem(CORNER_STORAGE_KEY, corner);
		} catch {}
	}
	function jsSignature(error) {
		return `${error.name}:${error.message}:${(error.stack ?? "").slice(0, 200)}`;
	}
	var DEV_OVERLAY_CORNERS, DEFAULT_CORNER, CORNER_STORAGE_KEY, EMPTY_STATE, BRIDGE_KEY, BUFFER_KEY, BUILD_SIGNATURE, DevErrorStore, devErrorStore;
	var init_devErrorStore = __esmMin((() => {
		DEV_OVERLAY_CORNERS = [
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right"
		];
		DEFAULT_CORNER = "bottom-left";
		CORNER_STORAGE_KEY = "tuono:dev-overlay-corner";
		EMPTY_STATE = {
			entries: [],
			activeIndex: 0,
			overlayOpen: false,
			menuOpen: false,
			badgeHidden: false,
			position: DEFAULT_CORNER
		};
		BRIDGE_KEY = "__TUONO_DEV_ERRORS__";
		BUFFER_KEY = "__TUONO_DEV_ERRORS_BUFFER__";
		BUILD_SIGNATURE = "build";
		DevErrorStore = class {
			constructor() {
				this.entries = [];
				this.activeIndex = 0;
				this.overlayOpen = false;
				this.menuOpen = false;
				this.badgeHidden = false;
				this.position = loadCorner();
				this.nextId = 1;
				this.listeners = /* @__PURE__ */ new Set();
				this.snapshot = EMPTY_STATE;
				this.subscribe = (listener) => {
					this.listeners.add(listener);
					return () => {
						this.listeners.delete(listener);
					};
				};
				this.getSnapshot = () => this.snapshot;
				this.getServerSnapshot = () => EMPTY_STATE;
				this.addJsError = (kind, error, reset) => {
					const signature = jsSignature(error);
					const existing = this.entries.find((e) => e.signature === signature);
					if (existing) {
						if (kind === "runtime") {
							existing.kind = "runtime";
							existing.reset = reset ?? existing.reset;
						}
						existing.occurrences += 1;
						this.activeIndex = this.entries.indexOf(existing);
						this.overlayOpen = true;
						this.commit();
						return existing.id;
					}
					const entry = {
						id: this.nextId++,
						kind,
						error,
						reset,
						occurrences: 1,
						signature
					};
					this.entries.push(entry);
					this.activeIndex = this.entries.length - 1;
					this.overlayOpen = true;
					this.commit();
					return entry.id;
				};
				this.addBuildError = (build) => {
					this.entries = this.entries.filter((e) => e.kind !== "build");
					const entry = {
						id: this.nextId++,
						kind: "build",
						build,
						occurrences: 1,
						signature: BUILD_SIGNATURE
					};
					this.entries.push(entry);
					this.activeIndex = this.entries.length - 1;
					this.overlayOpen = true;
					this.commit();
					return entry.id;
				};
				this.clearBuildErrors = () => {
					if (!this.entries.some((e) => e.kind === "build")) return;
					this.entries = this.entries.filter((e) => e.kind !== "build");
					this.commit();
				};
				this.removeById = (id) => {
					const next = this.entries.filter((e) => e.id !== id);
					if (next.length === this.entries.length) return;
					this.entries = next;
					this.commit();
				};
				this.setActiveIndex = (index) => {
					this.activeIndex = index;
					this.commit();
				};
				this.next = () => {
					if (this.entries.length === 0) return;
					this.activeIndex = (this.activeIndex + 1) % this.entries.length;
					this.commit();
				};
				this.prev = () => {
					if (this.entries.length === 0) return;
					this.activeIndex = (this.activeIndex - 1 + this.entries.length) % this.entries.length;
					this.commit();
				};
				this.openOverlay = () => {
					this.overlayOpen = true;
					this.menuOpen = false;
					this.commit();
				};
				this.closeOverlay = () => {
					this.overlayOpen = false;
					this.commit();
				};
				this.toggleMenu = () => {
					this.menuOpen = !this.menuOpen;
					this.commit();
				};
				this.closeMenu = () => {
					if (!this.menuOpen) return;
					this.menuOpen = false;
					this.commit();
				};
				this.hideBadge = () => {
					this.badgeHidden = true;
					this.menuOpen = false;
					this.commit();
				};
				this.setPosition = (corner) => {
					this.position = corner;
					saveCorner(corner);
					this.commit();
				};
				this.commit();
			}
			commit() {
				this.activeIndex = Math.min(Math.max(this.activeIndex, 0), Math.max(this.entries.length - 1, 0));
				this.snapshot = {
					entries: this.entries.slice(),
					activeIndex: this.activeIndex,
					overlayOpen: this.overlayOpen && this.entries.length > 0,
					menuOpen: this.menuOpen,
					badgeHidden: this.badgeHidden,
					position: this.position
				};
				for (const listener of this.listeners) listener();
			}
			/**
			* Publish the store on `window` and drain any errors buffered by the Vite
			* client before this module loaded. Safe to call repeatedly.
			*/
			installBridge() {
				if (typeof window === "undefined") return;
				const globalWindow = window;
				globalWindow[BRIDGE_KEY] = this;
				const buffered = globalWindow[BUFFER_KEY];
				if (buffered?.length) {
					for (const build of buffered) this.addBuildError(build);
					globalWindow[BUFFER_KEY] = [];
				}
			}
		};
		devErrorStore = new DevErrorStore();
		devErrorStore.installBridge();
	}));
	var init_DevBuildErrorContent = __esmMin((() => {
		require_jsx_runtime();
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-dom@19.2.8+0f58469d5b3bd39f/node_modules/react-dom/cjs/react-dom.production.js
	/**
	* @license React
	* react-dom.production.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_dom_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		var React = require_react();
		function formatProdErrorMessage(code) {
			var url = "https://react.dev/errors/" + code;
			if (1 < arguments.length) {
				url += "?args[]=" + encodeURIComponent(arguments[1]);
				for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
			}
			return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
		}
		function noop() {}
		var Internals = {
			d: {
				f: noop,
				r: function() {
					throw Error(formatProdErrorMessage(522));
				},
				D: noop,
				C: noop,
				L: noop,
				m: noop,
				X: noop,
				S: noop,
				M: noop
			},
			p: 0,
			findDOMNode: null
		};
		var REACT_PORTAL_TYPE = Symbol.for("react.portal");
		function createPortal$1(children, containerInfo, implementation) {
			var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
			return {
				$$typeof: REACT_PORTAL_TYPE,
				key: null == key ? null : "" + key,
				children,
				containerInfo,
				implementation
			};
		}
		var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		function getCrossOriginStringAs(as, input) {
			if ("font" === as) return "";
			if ("string" === typeof input) return "use-credentials" === input ? input : "";
		}
		exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
		exports.createPortal = function(children, container) {
			var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
			if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType) throw Error(formatProdErrorMessage(299));
			return createPortal$1(children, container, null, key);
		};
		exports.flushSync = function(fn) {
			var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
			try {
				if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
			} finally {
				ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
			}
		};
		exports.preconnect = function(href, options) {
			"string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
		};
		exports.prefetchDNS = function(href) {
			"string" === typeof href && Internals.d.D(href);
		};
		exports.preinit = function(href, options) {
			if ("string" === typeof href && options && "string" === typeof options.as) {
				var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
				"style" === as ? Internals.d.S(href, "string" === typeof options.precedence ? options.precedence : void 0, {
					crossOrigin,
					integrity,
					fetchPriority
				}) : "script" === as && Internals.d.X(href, {
					crossOrigin,
					integrity,
					fetchPriority,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0
				});
			}
		};
		exports.preinitModule = function(href, options) {
			if ("string" === typeof href) if ("object" === typeof options && null !== options) {
				if (null == options.as || "script" === options.as) {
					var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
					Internals.d.M(href, {
						crossOrigin,
						integrity: "string" === typeof options.integrity ? options.integrity : void 0,
						nonce: "string" === typeof options.nonce ? options.nonce : void 0
					});
				}
			} else options ?? Internals.d.M(href);
		};
		exports.preload = function(href, options) {
			if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
				var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
				Internals.d.L(href, as, {
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0,
					type: "string" === typeof options.type ? options.type : void 0,
					fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
					referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
					imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
					imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
					media: "string" === typeof options.media ? options.media : void 0
				});
			}
		};
		exports.preloadModule = function(href, options) {
			if ("string" === typeof href) if (options) {
				var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
				Internals.d.m(href, {
					as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0
				});
			} else Internals.d.m(href);
		};
		exports.requestFormReset = function(form) {
			Internals.d.r(form);
		};
		exports.unstable_batchedUpdates = function(fn, a) {
			return fn(a);
		};
		exports.useFormState = function(action, initialState, permalink) {
			return ReactSharedInternals.H.useFormState(action, initialState, permalink);
		};
		exports.useFormStatus = function() {
			return ReactSharedInternals.H.useHostTransitionStatus();
		};
		exports.version = "19.2.8";
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-dom@19.2.8+0f58469d5b3bd39f/node_modules/react-dom/index.js
	var require_react_dom = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		function checkDCE() {
			if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") return;
			try {
				__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
			} catch (err) {
				console.error(err);
			}
		}
		checkDCE();
		module.exports = require_react_dom_production();
	}));
	var init_DevErrorOverlayHost = __esmMin((() => {
		init_BaseStyles();
		init_DevErrorContent();
		init_DevBuildErrorContent();
		init_devErrorStore();
		require_jsx_runtime();
		require_react();
		require_react_dom();
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/components/DevErrorReporter.js
	/**
	* Development-only error-boundary fallback. Instead of rendering the overlay in
	* place of the failed subtree (which reads as a full-page replacement), it
	* reports the caught render error — including SSR/Rust panics surfaced through
	* a rejected data resource — to the shared {@link devErrorStore}. The floating
	* {@link DevErrorOverlayHost} then shows it over the app, with the boundary's
	* `reset` wired to the overlay's "Try again".
	*
	* Renders nothing itself; the route area stays blank behind the overlay until
	* the error is fixed or retried (matching Vite/Next).
	*/
	function DevErrorReporter({ error, reset }) {
		(0, import_react$6.useEffect)(() => {
			const id = devErrorStore.addJsError("runtime", error, reset);
			return () => {
				devErrorStore.removeById(id);
			};
		}, [error, reset]);
		return null;
	}
	var import_react$6;
	var init_DevErrorReporter = __esmMin((() => {
		init_devErrorStore();
		import_react$6 = /* @__PURE__ */ __toESM(require_react(), 1);
	}));
	//#endregion
	//#region ../../packages/tuono-ui/dist/esm/index.js
	var init_esm$2 = __esmMin((() => {
		init_BaseStyles();
		init_DefaultScreen();
		init_DefaultError();
		init_DefaultLoading();
		init_devErrorSource();
		init_DevErrorOverlay();
		init_devErrorStore();
		init_DevErrorOverlayHost();
		init_DevErrorReporter();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/RouteMatch.js
	var import_react$5, import_jsx_runtime$17, RouteMatch, TraverseRootComponents, loadParentComponents;
	var init_RouteMatch = __esmMin((() => {
		init_resourceCache();
		init_RouterContext();
		init_CriticalCss();
		init_RouteDataLoader();
		init_TuonoErrorBoundary();
		import_react$5 = /* @__PURE__ */ __toESM(require_react(), 1);
		init_esm$2();
		import_jsx_runtime$17 = require_jsx_runtime();
		RouteMatch = ({ route, mode }) => {
			const { location, navigationId, retry } = useRouterContext();
			const routes = (0, import_react$5.useMemo)(() => loadParentComponents(route), [route.id]);
			const resourceKey = buildResourceKey(navigationId, location);
			const LoadingComponent = route.options.loadingComponent ?? DefaultLoading;
			const ErrorComponent = route.options.errorComponent ?? (mode === "Dev" ? DevErrorReporter : DefaultError);
			return /* @__PURE__ */ (0, import_jsx_runtime$17.jsxs)(TraverseRootComponents, {
				routes,
				mode,
				children: [/* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(CriticalCss, {
					routeFilePath: route.filePath,
					mode
				}), /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(import_react$5.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(LoadingComponent, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(TuonoErrorBoundary, {
						resetKey: resourceKey,
						fallback: ErrorComponent,
						onReset: retry,
						children: /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(RouteDataLoader, {
							route,
							resourceKey,
							location
						})
					})
				})]
			});
		};
		TraverseRootComponents = (0, import_react$5.memo)(({ routes, index = 0, mode, children }) => {
			if (routes.length > index) {
				const route = routes[index];
				const Parent = route.component;
				const routeFilePath = route.filePath || route.id;
				return /* @__PURE__ */ (0, import_jsx_runtime$17.jsxs)(Parent, {
					...route.options.hasHandler && route.options.dataKey ? readLayoutData(route.options.dataKey) : void 0,
					children: [/* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(CriticalCss, {
						routeFilePath,
						mode
					}), /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(TraverseRootComponents, {
						routes,
						index: index + 1,
						mode,
						children
					})]
				});
			}
			return /* @__PURE__ */ (0, import_jsx_runtime$17.jsx)(import_jsx_runtime$17.Fragment, { children });
		});
		TraverseRootComponents.displayName = "TraverseRootComponents";
		loadParentComponents = (route, loader = []) => {
			const parentComponent = route.options.getParentRoute?.();
			loader.push(parentComponent);
			if (!parentComponent.isRoot) return loadParentComponents(parentComponent, loader);
			return loader.reverse();
		};
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/NotFoundDefaultContent.js
	/**
	* Framework default 404 page, shown when no route matches and the app provides
	* no `/404` route. Shares the {@link DefaultScreen} shell with
	* {@link DefaultError} so the two default screens look consistent.
	*/
	function NotFoundDefaultContent() {
		return /* @__PURE__ */ (0, import_jsx_runtime$16.jsxs)(DefaultScreen, {
			role: "status",
			badge: "404",
			title: "Page not found",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$16.jsx)("p", {
				className: "tuono-screen-text",
				children: "The page you’re looking for doesn’t exist or may have moved."
			}), /* @__PURE__ */ (0, import_jsx_runtime$16.jsx)(Link, {
				href: "/",
				className: "tuono-screen-action",
				children: "Return to homepage"
			})]
		});
	}
	var import_jsx_runtime$16;
	var init_NotFoundDefaultContent = __esmMin((() => {
		init_Link();
		init_esm$2();
		import_jsx_runtime$16 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/NotFound.js
	function NotFound({ mode }) {
		const { router } = useRouterContext();
		const rootRoute = router.routesById[ROOT_ROUTE_ID];
		const RootLayout = rootRoute?.component;
		if (!RootLayout) return null;
		const CustomNotFound = rootRoute?.options.notFoundComponent;
		return /* @__PURE__ */ (0, import_jsx_runtime$15.jsxs)(RootLayout, { children: [/* @__PURE__ */ (0, import_jsx_runtime$15.jsx)(CriticalCss, {
			routeFilePath: "__root__",
			mode
		}), CustomNotFound ? /* @__PURE__ */ (0, import_jsx_runtime$15.jsx)(CustomNotFound, {}) : /* @__PURE__ */ (0, import_jsx_runtime$15.jsx)(NotFoundDefaultContent, {})] });
	}
	var import_jsx_runtime$15;
	var init_NotFound = __esmMin((() => {
		init_RouterContext();
		init_CriticalCss();
		init_route();
		init_NotFoundDefaultContent();
		import_jsx_runtime$15 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/Matches.js
	function Matches({ mode }) {
		const { location } = useRouterContext();
		const route = useRoute(location.pathname);
		if (!route) return /* @__PURE__ */ (0, import_jsx_runtime$14.jsx)(NotFound, { mode });
		return /* @__PURE__ */ (0, import_jsx_runtime$14.jsx)(RouteMatch, {
			route,
			mode
		});
	}
	var import_jsx_runtime$14;
	var init_Matches = __esmMin((() => {
		init_RouterContext();
		init_useRoute();
		init_RouteMatch();
		init_NotFound();
		import_jsx_runtime$14 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/components/RouterProvider.js
	function RouterProvider({ router, serverInitialLocation, serverInitialData, serverInitialLayoutData, serverInitialError, mode }) {
		(0, import_react$4.useState)(() => {
			const resourceKey = buildResourceKey(0, getInitialLocation(serverInitialLocation));
			if (serverInitialError) seedErrorResource(resourceKey, serverInitialError);
			else seedResource(resourceKey, toDataResult(serverInitialData));
			if (serverInitialLayoutData) seedLayoutData(serverInitialLayoutData);
			return null;
		});
		return /* @__PURE__ */ (0, import_jsx_runtime$13.jsxs)(RouterContextProvider, {
			router,
			serverInitialLocation,
			children: [/* @__PURE__ */ (0, import_jsx_runtime$13.jsx)(Matches, { mode }), false]
		});
	}
	var import_react$4, import_jsx_runtime$13;
	var init_RouterProvider = __esmMin((() => {
		init_resourceCache();
		init_RouterContext();
		init_Matches();
		import_react$4 = /* @__PURE__ */ __toESM(require_react(), 1);
		init_esm$2();
		import_jsx_runtime$13 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/router.js
	function createRouter(options) {
		return new Router(options);
	}
	var Router;
	var init_router = __esmMin((() => {
		init_utils$1();
		Router = class {
			constructor(options) {
				this.basePath = "/";
				this.isServer = typeof document === "undefined";
				this.routesById = {};
				this.routesByPath = {};
				this.update = (newOptions) => {
					this.options = {
						...this.options,
						...newOptions
					};
					this.#updateBasePath(newOptions.basePath);
					if (this.options.routeTree !== this.routeTree) {
						this.routeTree = this.options.routeTree;
						this.#buildRouteTree();
					}
				};
				this.#buildRouteTree = () => {
					const recurseRoutes = (childRoutes) => {
						childRoutes.forEach((route, i) => {
							route.init(i);
							this.routesById[route.id || ""] = route;
							if (!route.isRoot && route.options.path) {
								const trimmedFullPath = trimPathRight(route.fullPath);
								if (!this.routesByPath[trimmedFullPath] || route.fullPath.endsWith("/")) this.routesByPath[trimmedFullPath] = route;
							}
							const children = route.children;
							if (children?.length) recurseRoutes(children);
						});
					};
					recurseRoutes([this.routeTree]);
				};
				this.#updateBasePath = (basePath) => {
					if (basePath === void 0) return;
					this.basePath = basePath === "" || basePath === "/" ? "/" : `/${trimPath(basePath)}`;
				};
				this.update({ ...options });
				if (!this.isServer) window.__TUONO__ROUTER__ = this;
			}
			#buildRouteTree;
			#updateBasePath;
		};
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/utils/preload-route-chain.js
	/**
	* Preload the code of the route matching `pathname` and of every layout that
	* wraps it, so a subsequent render commits the components eagerly instead of
	* suspending on their `React.lazy` chunk.
	*
	* Used ahead of the *initial* render on both sides — the server before
	* streaming (a suspending route would push the page content into an
	* out-of-order late chunk, painting an empty shell first) and the client
	* before hydration (so the first client render matches that inline HTML).
	* Client-side navigation has its own preload in `RouterContext`.
	*
	* A failed chunk load resolves anyway: the render then falls back to the lazy
	* component, which surfaces the load error through the route's error boundary.
	*/
	async function preloadRouteChain(router, pathname) {
		const matched = matchRoute(router.routesById, pathname);
		if (!matched) return;
		const pending = [];
		for (let node = matched; node; node = node.isRoot ? void 0 : node.options.getParentRoute?.()) {
			const preload = node.component.preload;
			if (preload) pending.push(preload().catch(() => void 0));
		}
		await Promise.all(pending);
	}
	var init_preload_route_chain = __esmMin((() => {
		init_match_route();
	}));
	//#endregion
	//#region ../../packages/tuono-router/dist/esm/index.js
	var init_esm$1 = __esmMin((() => {
		init_useRouter();
		init_route();
		init_Link();
		init_RouterProvider();
		init_router();
		init_preload_route_chain();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/RouterContextProviderWrapper.js
	/**
	* This component is needed to get the data from {@link TuonoContext}
	* since the provider is also located in {@link TuonoEntryPoint}
	* hence the context cannot be accessed directly there
	*
	* @see https://github.com/tuono-labs/tuono/issues/410
	*/
	function RouterContextProviderWrapper({ router }) {
		const serverPayload = useTuonoContextServerPayload();
		return /* @__PURE__ */ (0, import_jsx_runtime$12.jsx)(RouterProvider, {
			router,
			serverInitialLocation: serverPayload.location,
			serverInitialData: serverPayload.data,
			serverInitialLayoutData: serverPayload.layoutData,
			serverInitialError: serverPayload.serverError,
			mode: serverPayload.mode
		});
	}
	var import_jsx_runtime$12;
	var init_RouterContextProviderWrapper = __esmMin((() => {
		init_TuonoContext();
		init_esm$1();
		import_jsx_runtime$12 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/TuonoEntryPoint.js
	function TuonoEntryPoint({ router, serverPayload, rawServerPayload }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$11.jsx)(import_react$3.StrictMode, { children: /* @__PURE__ */ (0, import_jsx_runtime$11.jsx)(TuonoContextProvider, {
			serverPayload,
			rawServerPayload,
			children: /* @__PURE__ */ (0, import_jsx_runtime$11.jsx)(RouterContextProviderWrapper, { router })
		}) });
	}
	var import_react$3, import_jsx_runtime$11;
	var init_TuonoEntryPoint = __esmMin((() => {
		init_TuonoContext();
		init_RouterContextProviderWrapper();
		import_react$3 = /* @__PURE__ */ __toESM(require_react(), 1);
		import_jsx_runtime$11 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/utils.js
	function concatArrayBuffers(chunks) {
		const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
		let offset = 0;
		for (const chunk of chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}
	async function streamToArrayBuffer(stream) {
		const chunks = [];
		for await (const chunk of stream) chunks.push(chunk);
		return concatArrayBuffers(chunks);
	}
	/**
	* This function awaits for the whole stream before returning the string.
	*
	* NOTE: we should improve the bond between the custom V8 runtime and the
	* renderToReadableStream React function to return a stream directly to the client.
	*/
	async function streamToString(stream) {
		const buffer = await streamToArrayBuffer(stream);
		return new TextDecoder().decode(buffer);
	}
	/**
	* Index where the last *complete* UTF-8 character ends: bytes `[0, end)` are
	* safe to decode now, `[end, length)` is an incomplete trailing multi-byte
	* sequence to carry into the next chunk. Malformed input decodes as-is.
	*/
	function completeUtf8End(buf) {
		if (buf.length === 0) return 0;
		let i = buf.length - 1;
		while (i >= 0 && (buf[i] & 192) === 128) i--;
		if (i < 0) return buf.length;
		const lead = buf[i];
		let need;
		if ((lead & 128) === 0) need = 1;
		else if ((lead & 224) === 192) need = 2;
		else if ((lead & 240) === 224) need = 3;
		else if ((lead & 248) === 240) need = 4;
		else return buf.length;
		return buf.length - i >= need ? buf.length : i;
	}
	/**
	* Incremental UTF-8 decoder for the streaming SSR path. The ssr_rs runtime's
	* `TextDecoder` polyfill (`fast-text-encoding`) does not support the
	* `{ stream: true }` option, so we buffer any incomplete trailing byte
	* sequence ourselves and only decode up to a character boundary — keeping
	* multi-byte characters that straddle React's chunk boundaries intact.
	*/
	function createUtf8Streamer() {
		const decoder = new TextDecoder();
		let pending = /* @__PURE__ */ new Uint8Array(0);
		return {
			push(chunk) {
				let buf;
				if (pending.length) {
					buf = new Uint8Array(pending.length + chunk.length);
					buf.set(pending, 0);
					buf.set(chunk, pending.length);
				} else buf = chunk;
				const end = completeUtf8End(buf);
				pending = buf.slice(end);
				return end > 0 ? decoder.decode(buf.subarray(0, end)) : "";
			},
			flush() {
				if (pending.length === 0) return "";
				const out = decoder.decode(pending);
				pending = /* @__PURE__ */ new Uint8Array(0);
				return out;
			}
		};
	}
	var init_utils = __esmMin((() => {}));
	//#endregion
	//#region ../../node_modules/.bun/fast-text-encoding@1.0.6/node_modules/fast-text-encoding/text.min.js
	var init_text_min = __esmMin((() => {
		(function(scope) {
			"use strict";
			function B(r, e) {
				var f;
				return r instanceof Buffer ? f = r : f = Buffer.from(r.buffer, r.byteOffset, r.byteLength), f.toString(e);
			}
			var w = function(r) {
				return Buffer.from(r);
			};
			function h(r) {
				for (var e = 0, f = Math.min(256 * 256, r.length + 1), n = new Uint16Array(f), i = [], o = 0;;) {
					var t = e < r.length;
					if (!t || o >= f - 1) {
						var m = n.subarray(0, o);
						if (i.push(String.fromCharCode.apply(null, m)), !t) return i.join("");
						r = r.subarray(e), e = 0, o = 0;
					}
					var a = r[e++];
					if ((a & 128) === 0) n[o++] = a;
					else if ((a & 224) === 192) {
						var d = r[e++] & 63;
						n[o++] = (a & 31) << 6 | d;
					} else if ((a & 240) === 224) {
						var d = r[e++] & 63, l = r[e++] & 63;
						n[o++] = (a & 31) << 12 | d << 6 | l;
					} else if ((a & 248) === 240) {
						var d = r[e++] & 63, l = r[e++] & 63, R = r[e++] & 63, c = (a & 7) << 18 | d << 12 | l << 6 | R;
						c > 65535 && (c -= 65536, n[o++] = c >>> 10 & 1023 | 55296, c = 56320 | c & 1023), n[o++] = c;
					}
				}
			}
			function F(r) {
				for (var e = 0, f = r.length, n = 0, i = Math.max(32, f + (f >>> 1) + 7), o = new Uint8Array(i >>> 3 << 3); e < f;) {
					var t = r.charCodeAt(e++);
					if (t >= 55296 && t <= 56319) {
						if (e < f) {
							var s = r.charCodeAt(e);
							(s & 64512) === 56320 && (++e, t = ((t & 1023) << 10) + (s & 1023) + 65536);
						}
						if (t >= 55296 && t <= 56319) continue;
					}
					if (n + 4 > o.length) {
						i += 8, i *= 1 + e / r.length * 2, i = i >>> 3 << 3;
						var m = new Uint8Array(i);
						m.set(o), o = m;
					}
					if ((t & 4294967168) === 0) {
						o[n++] = t;
						continue;
					} else if ((t & 4294965248) === 0) o[n++] = t >>> 6 & 31 | 192;
					else if ((t & 4294901760) === 0) o[n++] = t >>> 12 & 15 | 224, o[n++] = t >>> 6 & 63 | 128;
					else if ((t & 4292870144) === 0) o[n++] = t >>> 18 & 7 | 240, o[n++] = t >>> 12 & 63 | 128, o[n++] = t >>> 6 & 63 | 128;
					else continue;
					o[n++] = t & 63 | 128;
				}
				return o.slice ? o.slice(0, n) : o.subarray(0, n);
			}
			var u = "Failed to ", p = function(r, e, f) {
				if (r) throw new Error("".concat(u).concat(e, ": the '").concat(f, "' option is unsupported."));
			};
			var x = typeof Buffer == "function" && Buffer.from;
			var A = x ? w : F;
			function v() {
				this.encoding = "utf-8";
			}
			v.prototype.encode = function(r, e) {
				return p(e && e.stream, "encode", "stream"), A(r);
			};
			function U(r) {
				var e;
				try {
					var f = new Blob([r], { type: "text/plain;charset=UTF-8" });
					e = URL.createObjectURL(f);
					var n = new XMLHttpRequest();
					return n.open("GET", e, !1), n.send(), n.responseText;
				} finally {
					e && URL.revokeObjectURL(e);
				}
			}
			var O = !x && typeof Blob == "function" && typeof URL == "function" && typeof URL.createObjectURL == "function", S = [
				"utf-8",
				"utf8",
				"unicode-1-1-utf-8"
			], T = h;
			x ? T = B : O && (T = function(r) {
				try {
					return U(r);
				} catch (e) {
					return h(r);
				}
			});
			var y = "construct 'TextDecoder'", E = "".concat(u, " ").concat(y, ": the ");
			function g(r, e) {
				p(e && e.fatal, y, "fatal"), r = r || "utf-8";
				var f;
				if (x ? f = Buffer.isEncoding(r) : f = S.indexOf(r.toLowerCase()) !== -1, !f) throw new RangeError("".concat(E, " encoding label provided ('").concat(r, "') is invalid."));
				this.encoding = r, this.fatal = !1, this.ignoreBOM = !1;
			}
			g.prototype.decode = function(r, e) {
				p(e && e.stream, "decode", "stream");
				var f;
				return r instanceof Uint8Array ? f = r : r.buffer instanceof ArrayBuffer ? f = new Uint8Array(r.buffer) : f = new Uint8Array(r), T(f, this.encoding);
			};
			scope.TextEncoder = scope.TextEncoder || v;
			scope.TextDecoder = scope.TextDecoder || g;
		})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : void 0);
	}));
	//#endregion
	//#region ../../node_modules/.bun/url-search-params-polyfill@8.2.5/node_modules/url-search-params-polyfill/index.js
	var init_url_search_params_polyfill = __esmMin((() => {
		/**!
		* url-search-params-polyfill
		*
		* @author Jerry Bendy (https://github.com/jerrybendy)
		* @licence MIT
		*/
		(function(self) {
			"use strict";
			var nativeURLSearchParams = (function() {
				try {
					if (self.URLSearchParams && new self.URLSearchParams("foo=bar").get("foo") === "bar") return self.URLSearchParams;
				} catch (e) {}
				return null;
			})(), isSupportObjectConstructor = nativeURLSearchParams && new nativeURLSearchParams({ a: 1 }).toString() === "a=1", decodesPlusesCorrectly = nativeURLSearchParams && new nativeURLSearchParams("s=%2B").get("s") === "+", isSupportSize = nativeURLSearchParams && "size" in nativeURLSearchParams.prototype, __URLSearchParams__ = "__URLSearchParams__", encodesAmpersandsCorrectly = nativeURLSearchParams ? (function() {
				var ampersandTest = new nativeURLSearchParams();
				ampersandTest.append("s", " &");
				return ampersandTest.toString() === "s=+%26";
			})() : true, prototype = URLSearchParamsPolyfill.prototype, iterable = !!(self.Symbol && self.Symbol.iterator);
			if (nativeURLSearchParams && isSupportObjectConstructor && decodesPlusesCorrectly && encodesAmpersandsCorrectly && isSupportSize) return;
			/**
			* Make a URLSearchParams instance
			*
			* @param {object|string|URLSearchParams} search
			* @constructor
			*/
			function URLSearchParamsPolyfill(search) {
				search = search || "";
				if (search instanceof URLSearchParams || search instanceof URLSearchParamsPolyfill) search = search.toString();
				this[__URLSearchParams__] = parseToDict(search);
			}
			/**
			* Appends a specified key/value pair as a new search parameter.
			*
			* @param {string} name
			* @param {string} value
			*/
			prototype.append = function(name, value) {
				appendTo(this[__URLSearchParams__], name, value);
			};
			/**
			* Deletes the given search parameter, and its associated value,
			* from the list of all search parameters.
			*
			* @param {string} name
			*/
			prototype["delete"] = function(name) {
				delete this[__URLSearchParams__][name];
			};
			/**
			* Returns the first value associated to the given search parameter.
			*
			* @param {string} name
			* @returns {string|null}
			*/
			prototype.get = function(name) {
				var dict = this[__URLSearchParams__];
				return this.has(name) ? dict[name][0] : null;
			};
			/**
			* Returns all the values association with a given search parameter.
			*
			* @param {string} name
			* @returns {Array}
			*/
			prototype.getAll = function(name) {
				var dict = this[__URLSearchParams__];
				return this.has(name) ? dict[name].slice(0) : [];
			};
			/**
			* Returns a Boolean indicating if such a search parameter exists.
			*
			* @param {string} name
			* @returns {boolean}
			*/
			prototype.has = function(name) {
				return hasOwnProperty(this[__URLSearchParams__], name);
			};
			/**
			* Sets the value associated to a given search parameter to
			* the given value. If there were several values, delete the
			* others.
			*
			* @param {string} name
			* @param {string} value
			*/
			prototype.set = function set(name, value) {
				this[__URLSearchParams__][name] = ["" + value];
			};
			/**
			* Returns a string containg a query string suitable for use in a URL.
			*
			* @returns {string}
			*/
			prototype.toString = function() {
				var dict = this[__URLSearchParams__], query = [], i, key, name, value;
				for (key in dict) {
					name = encode(key);
					for (i = 0, value = dict[key]; i < value.length; i++) query.push(name + "=" + encode(value[i]));
				}
				return query.join("&");
			};
			var useProxy = self.Proxy && nativeURLSearchParams && (!decodesPlusesCorrectly || !encodesAmpersandsCorrectly || !isSupportObjectConstructor || !isSupportSize);
			var propValue;
			if (useProxy) {
				propValue = new Proxy(nativeURLSearchParams, { construct: function(target, args) {
					return new target(new URLSearchParamsPolyfill(args[0]).toString());
				} });
				propValue.toString = Function.prototype.toString.bind(URLSearchParamsPolyfill);
			} else propValue = URLSearchParamsPolyfill;
			Object.defineProperty(self, "URLSearchParams", { value: propValue });
			var USPProto = self.URLSearchParams.prototype;
			USPProto.polyfill = true;
			if (!useProxy && self.Symbol) USPProto[self.Symbol.toStringTag] = "URLSearchParams";
			/**
			*
			* @param {function} callback
			* @param {object} thisArg
			*/
			if (!("forEach" in USPProto)) USPProto.forEach = function(callback, thisArg) {
				var dict = parseToDict(this.toString());
				Object.getOwnPropertyNames(dict).forEach(function(name) {
					dict[name].forEach(function(value) {
						callback.call(thisArg, value, name, this);
					}, this);
				}, this);
			};
			/**
			* Sort all name-value pairs
			*/
			if (!("sort" in USPProto)) USPProto.sort = function() {
				var dict = parseToDict(this.toString()), keys = [], k, i, j;
				for (k in dict) keys.push(k);
				keys.sort();
				for (i = 0; i < keys.length; i++) this["delete"](keys[i]);
				for (i = 0; i < keys.length; i++) {
					var key = keys[i], values = dict[key];
					for (j = 0; j < values.length; j++) this.append(key, values[j]);
				}
			};
			/**
			* Returns an iterator allowing to go through all keys of
			* the key/value pairs contained in this object.
			*
			* @returns {function}
			*/
			if (!("keys" in USPProto)) USPProto.keys = function() {
				var items = [];
				this.forEach(function(item, name) {
					items.push(name);
				});
				return makeIterator(items);
			};
			/**
			* Returns an iterator allowing to go through all values of
			* the key/value pairs contained in this object.
			*
			* @returns {function}
			*/
			if (!("values" in USPProto)) USPProto.values = function() {
				var items = [];
				this.forEach(function(item) {
					items.push(item);
				});
				return makeIterator(items);
			};
			/**
			* Returns an iterator allowing to go through all key/value
			* pairs contained in this object.
			*
			* @returns {function}
			*/
			if (!("entries" in USPProto)) USPProto.entries = function() {
				var items = [];
				this.forEach(function(item, name) {
					items.push([name, item]);
				});
				return makeIterator(items);
			};
			if (iterable) USPProto[self.Symbol.iterator] = USPProto[self.Symbol.iterator] || USPProto.entries;
			if (!("size" in USPProto)) Object.defineProperty(USPProto, "size", { get: function() {
				var dict = parseToDict(this.toString());
				if (USPProto === this) throw new TypeError("Illegal invocation at URLSearchParams.invokeGetter");
				return Object.keys(dict).reduce(function(prev, cur) {
					return prev + dict[cur].length;
				}, 0);
			} });
			function encode(str) {
				var replace = {
					"!": "%21",
					"'": "%27",
					"(": "%28",
					")": "%29",
					"~": "%7E",
					"%20": "+",
					"%00": "\0"
				};
				return encodeURIComponent(str).replace(/[!'\(\)~]|%20|%00/g, function(match) {
					return replace[match];
				});
			}
			function decode(str) {
				return str.replace(/[ +]/g, "%20").replace(/(%[a-f0-9]{2})+/gi, function(match) {
					return decodeURIComponent(match);
				});
			}
			function makeIterator(arr) {
				var iterator = { next: function() {
					var value = arr.shift();
					return {
						done: value === void 0,
						value
					};
				} };
				if (iterable) iterator[self.Symbol.iterator] = function() {
					return iterator;
				};
				return iterator;
			}
			function parseToDict(search) {
				var dict = {};
				if (typeof search === "object") {
					if (isArray(search)) for (var i = 0; i < search.length; i++) {
						var item = search[i];
						if (isArray(item) && item.length === 2) appendTo(dict, item[0], item[1]);
						else throw new TypeError("Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements");
					}
					else for (var key in search) if (search.hasOwnProperty(key)) appendTo(dict, key, search[key]);
				} else {
					if (search.indexOf("?") === 0) search = search.slice(1);
					var pairs = search.split("&");
					for (var j = 0; j < pairs.length; j++) {
						var value = pairs[j], index = value.indexOf("=");
						if (-1 < index) appendTo(dict, decode(value.slice(0, index)), decode(value.slice(index + 1)));
						else if (value) appendTo(dict, decode(value), "");
					}
				}
				return dict;
			}
			function appendTo(dict, name, value) {
				var val = typeof value === "string" ? value : value !== null && value !== void 0 && typeof value.toString === "function" ? value.toString() : JSON.stringify(value);
				if (hasOwnProperty(dict, name)) dict[name].push(val);
				else dict[name] = [val];
			}
			function isArray(val) {
				return !!val && "[object Array]" === Object.prototype.toString.call(val);
			}
			function hasOwnProperty(obj, prop) {
				return Object.prototype.hasOwnProperty.call(obj, prop);
			}
		})(typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : void 0);
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-dom@19.2.8+0f58469d5b3bd39f/node_modules/react-dom/cjs/react-dom-server-legacy.browser.production.js
	/**
	* @license React
	* react-dom-server-legacy.browser.production.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_dom_server_legacy_browser_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		var React = require_react();
		var ReactDOM = require_react_dom();
		function formatProdErrorMessage(code) {
			var url = "https://react.dev/errors/" + code;
			if (1 < arguments.length) {
				url += "?args[]=" + encodeURIComponent(arguments[1]);
				for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
			}
			return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
		}
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
		var REACT_PORTAL_TYPE = Symbol.for("react.portal");
		var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
		var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
		var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
		var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
		var REACT_CONTEXT_TYPE = Symbol.for("react.context");
		var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
		var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
		var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
		var REACT_MEMO_TYPE = Symbol.for("react.memo");
		var REACT_LAZY_TYPE = Symbol.for("react.lazy");
		var REACT_SCOPE_TYPE = Symbol.for("react.scope");
		var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
		var REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
		var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
		var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
		var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		var isArrayImpl = Array.isArray;
		function murmurhash3_32_gc(key, seed) {
			var remainder = key.length & 3;
			var bytes = key.length - remainder;
			var h1 = seed;
			for (seed = 0; seed < bytes;) {
				var k1 = key.charCodeAt(seed) & 255 | (key.charCodeAt(++seed) & 255) << 8 | (key.charCodeAt(++seed) & 255) << 16 | (key.charCodeAt(++seed) & 255) << 24;
				++seed;
				k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295;
				k1 = k1 << 15 | k1 >>> 17;
				k1 = 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
				h1 ^= k1;
				h1 = h1 << 13 | h1 >>> 19;
				h1 = 5 * (h1 & 65535) + ((5 * (h1 >>> 16) & 65535) << 16) & 4294967295;
				h1 = (h1 & 65535) + 27492 + (((h1 >>> 16) + 58964 & 65535) << 16);
			}
			k1 = 0;
			switch (remainder) {
				case 3: k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
				case 2: k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
				case 1: k1 ^= key.charCodeAt(seed) & 255, k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295, k1 = k1 << 15 | k1 >>> 17, h1 ^= 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
			}
			h1 ^= key.length;
			h1 ^= h1 >>> 16;
			h1 = 2246822507 * (h1 & 65535) + ((2246822507 * (h1 >>> 16) & 65535) << 16) & 4294967295;
			h1 ^= h1 >>> 13;
			h1 = 3266489909 * (h1 & 65535) + ((3266489909 * (h1 >>> 16) & 65535) << 16) & 4294967295;
			return (h1 ^ h1 >>> 16) >>> 0;
		}
		var assign = Object.assign;
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		var VALID_ATTRIBUTE_NAME_REGEX = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
		var illegalAttributeNameCache = {};
		var validatedAttributeNameCache = {};
		function isAttributeNameSafe(attributeName) {
			if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) return !0;
			if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
			if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) return validatedAttributeNameCache[attributeName] = !0;
			illegalAttributeNameCache[attributeName] = !0;
			return !1;
		}
		var unitlessNumbers = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
		var aliases = /* @__PURE__ */ new Map([
			["acceptCharset", "accept-charset"],
			["htmlFor", "for"],
			["httpEquiv", "http-equiv"],
			["crossOrigin", "crossorigin"],
			["accentHeight", "accent-height"],
			["alignmentBaseline", "alignment-baseline"],
			["arabicForm", "arabic-form"],
			["baselineShift", "baseline-shift"],
			["capHeight", "cap-height"],
			["clipPath", "clip-path"],
			["clipRule", "clip-rule"],
			["colorInterpolation", "color-interpolation"],
			["colorInterpolationFilters", "color-interpolation-filters"],
			["colorProfile", "color-profile"],
			["colorRendering", "color-rendering"],
			["dominantBaseline", "dominant-baseline"],
			["enableBackground", "enable-background"],
			["fillOpacity", "fill-opacity"],
			["fillRule", "fill-rule"],
			["floodColor", "flood-color"],
			["floodOpacity", "flood-opacity"],
			["fontFamily", "font-family"],
			["fontSize", "font-size"],
			["fontSizeAdjust", "font-size-adjust"],
			["fontStretch", "font-stretch"],
			["fontStyle", "font-style"],
			["fontVariant", "font-variant"],
			["fontWeight", "font-weight"],
			["glyphName", "glyph-name"],
			["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
			["glyphOrientationVertical", "glyph-orientation-vertical"],
			["horizAdvX", "horiz-adv-x"],
			["horizOriginX", "horiz-origin-x"],
			["imageRendering", "image-rendering"],
			["letterSpacing", "letter-spacing"],
			["lightingColor", "lighting-color"],
			["markerEnd", "marker-end"],
			["markerMid", "marker-mid"],
			["markerStart", "marker-start"],
			["overlinePosition", "overline-position"],
			["overlineThickness", "overline-thickness"],
			["paintOrder", "paint-order"],
			["panose-1", "panose-1"],
			["pointerEvents", "pointer-events"],
			["renderingIntent", "rendering-intent"],
			["shapeRendering", "shape-rendering"],
			["stopColor", "stop-color"],
			["stopOpacity", "stop-opacity"],
			["strikethroughPosition", "strikethrough-position"],
			["strikethroughThickness", "strikethrough-thickness"],
			["strokeDasharray", "stroke-dasharray"],
			["strokeDashoffset", "stroke-dashoffset"],
			["strokeLinecap", "stroke-linecap"],
			["strokeLinejoin", "stroke-linejoin"],
			["strokeMiterlimit", "stroke-miterlimit"],
			["strokeOpacity", "stroke-opacity"],
			["strokeWidth", "stroke-width"],
			["textAnchor", "text-anchor"],
			["textDecoration", "text-decoration"],
			["textRendering", "text-rendering"],
			["transformOrigin", "transform-origin"],
			["underlinePosition", "underline-position"],
			["underlineThickness", "underline-thickness"],
			["unicodeBidi", "unicode-bidi"],
			["unicodeRange", "unicode-range"],
			["unitsPerEm", "units-per-em"],
			["vAlphabetic", "v-alphabetic"],
			["vHanging", "v-hanging"],
			["vIdeographic", "v-ideographic"],
			["vMathematical", "v-mathematical"],
			["vectorEffect", "vector-effect"],
			["vertAdvY", "vert-adv-y"],
			["vertOriginX", "vert-origin-x"],
			["vertOriginY", "vert-origin-y"],
			["wordSpacing", "word-spacing"],
			["writingMode", "writing-mode"],
			["xmlnsXlink", "xmlns:xlink"],
			["xHeight", "x-height"]
		]);
		var matchHtmlRegExp = /["'&<>]/;
		function escapeTextForBrowser(text) {
			if ("boolean" === typeof text || "number" === typeof text || "bigint" === typeof text) return "" + text;
			text = "" + text;
			var match = matchHtmlRegExp.exec(text);
			if (match) {
				var html = "", index, lastIndex = 0;
				for (index = match.index; index < text.length; index++) {
					switch (text.charCodeAt(index)) {
						case 34:
							match = "&quot;";
							break;
						case 38:
							match = "&amp;";
							break;
						case 39:
							match = "&#x27;";
							break;
						case 60:
							match = "&lt;";
							break;
						case 62:
							match = "&gt;";
							break;
						default: continue;
					}
					lastIndex !== index && (html += text.slice(lastIndex, index));
					lastIndex = index + 1;
					html += match;
				}
				text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
			}
			return text;
		}
		var uppercasePattern = /([A-Z])/g;
		var msPattern = /^ms-/;
		var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
		function sanitizeURL(url) {
			return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
		}
		var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		var sharedNotPendingObject = {
			pending: !1,
			data: null,
			method: null,
			action: null
		};
		var previousDispatcher = ReactDOMSharedInternals.d;
		ReactDOMSharedInternals.d = {
			f: previousDispatcher.f,
			r: previousDispatcher.r,
			D: prefetchDNS,
			C: preconnect,
			L: preload,
			m: preloadModule,
			X: preinitScript,
			S: preinitStyle,
			M: preinitModuleScript
		};
		var PRELOAD_NO_CREDS = [];
		var currentlyFlushingRenderState = null;
		var scriptRegex = /(<\/|<)(s)(cript)/gi;
		function scriptReplacer(match, prefix, s, suffix) {
			return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
		}
		function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
			return {
				idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
				nextFormID: 0,
				streamingFormat: 0,
				bootstrapScriptContent,
				bootstrapScripts,
				bootstrapModules,
				instructions: 0,
				hasBody: !1,
				hasHtml: !1,
				unknownResources: {},
				dnsResources: {},
				connectResources: {
					default: {},
					anonymous: {},
					credentials: {}
				},
				imageResources: {},
				styleResources: {},
				scriptResources: {},
				moduleUnknownResources: {},
				moduleScriptResources: {}
			};
		}
		function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
			return {
				insertionMode,
				selectedValue,
				tagScope,
				viewTransition
			};
		}
		function getChildFormatContext(parentContext, type, props) {
			var subtreeScope = parentContext.tagScope & -25;
			switch (type) {
				case "noscript": return createFormatContext(2, null, subtreeScope | 1, null);
				case "select": return createFormatContext(2, null != props.value ? props.value : props.defaultValue, subtreeScope, null);
				case "svg": return createFormatContext(4, null, subtreeScope, null);
				case "picture": return createFormatContext(2, null, subtreeScope | 2, null);
				case "math": return createFormatContext(5, null, subtreeScope, null);
				case "foreignObject": return createFormatContext(2, null, subtreeScope, null);
				case "table": return createFormatContext(6, null, subtreeScope, null);
				case "thead":
				case "tbody":
				case "tfoot": return createFormatContext(7, null, subtreeScope, null);
				case "colgroup": return createFormatContext(9, null, subtreeScope, null);
				case "tr": return createFormatContext(8, null, subtreeScope, null);
				case "head":
					if (2 > parentContext.insertionMode) return createFormatContext(3, null, subtreeScope, null);
					break;
				case "html": if (0 === parentContext.insertionMode) return createFormatContext(1, null, subtreeScope, null);
			}
			return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode ? createFormatContext(2, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null) : parentContext;
		}
		function getSuspenseViewTransition(parentViewTransition) {
			return null === parentViewTransition ? null : {
				update: parentViewTransition.update,
				enter: "none",
				exit: "none",
				share: parentViewTransition.update,
				name: parentViewTransition.autoName,
				autoName: parentViewTransition.autoName,
				nameIdx: 0
			};
		}
		function getSuspenseFallbackFormatContext(resumableState, parentContext) {
			parentContext.tagScope & 32 && (resumableState.instructions |= 128);
			return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | 12, getSuspenseViewTransition(parentContext.viewTransition));
		}
		function getSuspenseContentFormatContext(resumableState, parentContext) {
			resumableState = getSuspenseViewTransition(parentContext.viewTransition);
			var subtreeScope = parentContext.tagScope | 16;
			null !== resumableState && "none" !== resumableState.share && (subtreeScope |= 64);
			return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, resumableState);
		}
		var styleNameCache = /* @__PURE__ */ new Map();
		function pushStyleAttribute(target, style) {
			if ("object" !== typeof style) throw Error(formatProdErrorMessage(62));
			var isFirst = !0, styleName;
			for (styleName in style) if (hasOwnProperty.call(style, styleName)) {
				var styleValue = style[styleName];
				if (null != styleValue && "boolean" !== typeof styleValue && "" !== styleValue) {
					if (0 === styleName.indexOf("--")) {
						var nameChunk = escapeTextForBrowser(styleName);
						styleValue = escapeTextForBrowser(("" + styleValue).trim());
					} else nameChunk = styleNameCache.get(styleName), void 0 === nameChunk && (nameChunk = escapeTextForBrowser(styleName.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-")), styleNameCache.set(styleName, nameChunk)), styleValue = "number" === typeof styleValue ? 0 === styleValue || unitlessNumbers.has(styleName) ? "" + styleValue : styleValue + "px" : escapeTextForBrowser(("" + styleValue).trim());
					isFirst ? (isFirst = !1, target.push(" style=\"", nameChunk, ":", styleValue)) : target.push(";", nameChunk, ":", styleValue);
				}
			}
			isFirst || target.push("\"");
		}
		function pushBooleanAttribute(target, name, value) {
			value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, "=\"\"");
		}
		function pushStringAttribute(target, name, value) {
			"function" !== typeof value && "symbol" !== typeof value && "boolean" !== typeof value && target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
		}
		var actionJavaScriptURL = escapeTextForBrowser("javascript:throw new Error('React form unexpectedly submitted.')");
		function pushAdditionalFormField(value, key) {
			this.push("<input type=\"hidden\"");
			validateAdditionalFormField(value);
			pushStringAttribute(this, "name", key);
			pushStringAttribute(this, "value", value);
			this.push("/>");
		}
		function validateAdditionalFormField(value) {
			if ("string" !== typeof value) throw Error(formatProdErrorMessage(480));
		}
		function getCustomFormFields(resumableState, formAction) {
			if ("function" === typeof formAction.$$FORM_ACTION) {
				var id = resumableState.nextFormID++;
				resumableState = resumableState.idPrefix + id;
				try {
					var customFields = formAction.$$FORM_ACTION(resumableState);
					if (customFields) customFields.data?.forEach(validateAdditionalFormField);
					return customFields;
				} catch (x) {
					if ("object" === typeof x && null !== x && "function" === typeof x.then) throw x;
				}
			}
			return null;
		}
		function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
			var formData = null;
			if ("function" === typeof formAction) {
				var customFields = getCustomFormFields(resumableState, formAction);
				null !== customFields ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(" ", "formAction", "=\"", actionJavaScriptURL, "\""), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
			}
			null != name && pushAttribute(target, "name", name);
			null != formAction && pushAttribute(target, "formAction", formAction);
			null != formEncType && pushAttribute(target, "formEncType", formEncType);
			null != formMethod && pushAttribute(target, "formMethod", formMethod);
			null != formTarget && pushAttribute(target, "formTarget", formTarget);
			return formData;
		}
		function pushAttribute(target, name, value) {
			switch (name) {
				case "className":
					pushStringAttribute(target, "class", value);
					break;
				case "tabIndex":
					pushStringAttribute(target, "tabindex", value);
					break;
				case "dir":
				case "role":
				case "viewBox":
				case "width":
				case "height":
					pushStringAttribute(target, name, value);
					break;
				case "style":
					pushStyleAttribute(target, value);
					break;
				case "src":
				case "href": if ("" === value) break;
				case "action":
				case "formAction":
					if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) break;
					value = sanitizeURL("" + value);
					target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "defaultValue":
				case "defaultChecked":
				case "innerHTML":
				case "suppressContentEditableWarning":
				case "suppressHydrationWarning":
				case "ref": break;
				case "autoFocus":
				case "multiple":
				case "muted":
					pushBooleanAttribute(target, name.toLowerCase(), value);
					break;
				case "xlinkHref":
					if ("function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) break;
					value = sanitizeURL("" + value);
					target.push(" ", "xlink:href", "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "contentEditable":
				case "spellCheck":
				case "draggable":
				case "value":
				case "autoReverse":
				case "externalResourcesRequired":
				case "focusable":
				case "preserveAlpha":
					"function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "inert":
				case "allowFullScreen":
				case "async":
				case "autoPlay":
				case "controls":
				case "default":
				case "defer":
				case "disabled":
				case "disablePictureInPicture":
				case "disableRemotePlayback":
				case "formNoValidate":
				case "hidden":
				case "loop":
				case "noModule":
				case "noValidate":
				case "open":
				case "playsInline":
				case "readOnly":
				case "required":
				case "reversed":
				case "scoped":
				case "seamless":
				case "itemScope":
					value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, "=\"\"");
					break;
				case "capture":
				case "download":
					!0 === value ? target.push(" ", name, "=\"\"") : !1 !== value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "cols":
				case "rows":
				case "size":
				case "span":
					"function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value && target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "rowSpan":
				case "start":
					"function" === typeof value || "symbol" === typeof value || isNaN(value) || target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					break;
				case "xlinkActuate":
					pushStringAttribute(target, "xlink:actuate", value);
					break;
				case "xlinkArcrole":
					pushStringAttribute(target, "xlink:arcrole", value);
					break;
				case "xlinkRole":
					pushStringAttribute(target, "xlink:role", value);
					break;
				case "xlinkShow":
					pushStringAttribute(target, "xlink:show", value);
					break;
				case "xlinkTitle":
					pushStringAttribute(target, "xlink:title", value);
					break;
				case "xlinkType":
					pushStringAttribute(target, "xlink:type", value);
					break;
				case "xmlBase":
					pushStringAttribute(target, "xml:base", value);
					break;
				case "xmlLang":
					pushStringAttribute(target, "xml:lang", value);
					break;
				case "xmlSpace":
					pushStringAttribute(target, "xml:space", value);
					break;
				default: if (!(2 < name.length) || "o" !== name[0] && "O" !== name[0] || "n" !== name[1] && "N" !== name[1]) {
					if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
						switch (typeof value) {
							case "function":
							case "symbol": return;
							case "boolean":
								var prefix$8 = name.toLowerCase().slice(0, 5);
								if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
						}
						target.push(" ", name, "=\"", escapeTextForBrowser(value), "\"");
					}
				}
			}
		}
		function pushInnerHTML(target, innerHTML, children) {
			if (null != innerHTML) {
				if (null != children) throw Error(formatProdErrorMessage(60));
				if ("object" !== typeof innerHTML || !("__html" in innerHTML)) throw Error(formatProdErrorMessage(61));
				innerHTML = innerHTML.__html;
				null !== innerHTML && void 0 !== innerHTML && target.push("" + innerHTML);
			}
		}
		function flattenOptionChildren(children) {
			var content = "";
			React.Children.forEach(children, function(child) {
				null != child && (content += child);
			});
			return content;
		}
		function injectFormReplayingRuntime(resumableState, renderState) {
			if (0 === (resumableState.instructions & 16)) {
				resumableState.instructions |= 16;
				var preamble = renderState.preamble, bootstrapChunks = renderState.bootstrapChunks;
				(preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(">", "addEventListener(\"submit\",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute(\"formAction\");null!=f&&(e=f,b=null)}\"javascript:throw new Error('React form unexpectedly submitted.')\"===e&&(a.preventDefault(),b?(a=document.createElement(\"input\"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});", "<\/script>")) : bootstrapChunks.unshift(renderState.startInlineScript, ">", "addEventListener(\"submit\",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute(\"formAction\");null!=f&&(e=f,b=null)}\"javascript:throw new Error('React form unexpectedly submitted.')\"===e&&(a.preventDefault(),b?(a=document.createElement(\"input\"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});", "<\/script>");
			}
		}
		function pushLinkImpl(target, props) {
			target.push(startChunkForTag("link"));
			for (var propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "link"));
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push("/>");
			return null;
		}
		var styleRegex = /(<\/|<)(s)(tyle)/gi;
		function styleReplacer(match, prefix, s, suffix) {
			return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
		}
		function pushSelfClosing(target, props, tag) {
			target.push(startChunkForTag(tag));
			for (var propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, tag));
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push("/>");
			return null;
		}
		function pushTitleImpl(target, props) {
			target.push(startChunkForTag("title"));
			var children = null, innerHTML = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						children = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(">");
			props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
			"function" !== typeof props && "symbol" !== typeof props && null !== props && void 0 !== props && target.push(escapeTextForBrowser("" + props));
			pushInnerHTML(target, innerHTML, children);
			target.push(endChunkForTag("title"));
			return null;
		}
		function pushScriptImpl(target, props) {
			target.push(startChunkForTag("script"));
			var children = null, innerHTML = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						children = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(">");
			pushInnerHTML(target, innerHTML, children);
			"string" === typeof children && target.push(("" + children).replace(scriptRegex, scriptReplacer));
			target.push(endChunkForTag("script"));
			return null;
		}
		function pushStartSingletonElement(target, props, tag) {
			target.push(startChunkForTag(tag));
			var innerHTML = tag = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						tag = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(">");
			pushInnerHTML(target, innerHTML, tag);
			return tag;
		}
		function pushStartGenericElement(target, props, tag) {
			target.push(startChunkForTag(tag));
			var innerHTML = tag = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						tag = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(">");
			pushInnerHTML(target, innerHTML, tag);
			return "string" === typeof tag ? (target.push(escapeTextForBrowser(tag)), null) : tag;
		}
		var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
		var validatedTagCache = /* @__PURE__ */ new Map();
		function startChunkForTag(tag) {
			var tagStartChunk = validatedTagCache.get(tag);
			if (void 0 === tagStartChunk) {
				if (!VALID_TAG_REGEX.test(tag)) throw Error(formatProdErrorMessage(65, tag));
				tagStartChunk = "<" + tag;
				validatedTagCache.set(tag, tagStartChunk);
			}
			return tagStartChunk;
		}
		function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
			switch (type) {
				case "div":
				case "span":
				case "svg":
				case "path": break;
				case "a":
					target$jscomp$0.push(startChunkForTag("a"));
					var children = null, innerHTML = null, propKey;
					for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
						var propValue = props[propKey];
						if (null != propValue) switch (propKey) {
							case "children":
								children = propValue;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML = propValue;
								break;
							case "href":
								"" === propValue ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
								break;
							default: pushAttribute(target$jscomp$0, propKey, propValue);
						}
					}
					target$jscomp$0.push(">");
					pushInnerHTML(target$jscomp$0, innerHTML, children);
					if ("string" === typeof children) {
						target$jscomp$0.push(escapeTextForBrowser(children));
						var JSCompiler_inline_result = null;
					} else JSCompiler_inline_result = children;
					return JSCompiler_inline_result;
				case "g":
				case "p":
				case "li": break;
				case "select":
					target$jscomp$0.push(startChunkForTag("select"));
					var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
					for (propKey$jscomp$0 in props) if (hasOwnProperty.call(props, propKey$jscomp$0)) {
						var propValue$jscomp$0 = props[propKey$jscomp$0];
						if (null != propValue$jscomp$0) switch (propKey$jscomp$0) {
							case "children":
								children$jscomp$0 = propValue$jscomp$0;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$0 = propValue$jscomp$0;
								break;
							case "defaultValue":
							case "value": break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$0, propValue$jscomp$0);
						}
					}
					target$jscomp$0.push(">");
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
					return children$jscomp$0;
				case "option":
					var selectedValue = formatContext.selectedValue;
					target$jscomp$0.push(startChunkForTag("option"));
					var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
					for (propKey$jscomp$1 in props) if (hasOwnProperty.call(props, propKey$jscomp$1)) {
						var propValue$jscomp$1 = props[propKey$jscomp$1];
						if (null != propValue$jscomp$1) switch (propKey$jscomp$1) {
							case "children":
								children$jscomp$1 = propValue$jscomp$1;
								break;
							case "selected":
								selected = propValue$jscomp$1;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$1 = propValue$jscomp$1;
								break;
							case "value": value = propValue$jscomp$1;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$1, propValue$jscomp$1);
						}
					}
					if (null != selectedValue) {
						var stringValue = null !== value ? "" + value : flattenOptionChildren(children$jscomp$1);
						if (isArrayImpl(selectedValue)) {
							for (var i = 0; i < selectedValue.length; i++) if ("" + selectedValue[i] === stringValue) {
								target$jscomp$0.push(" selected=\"\"");
								break;
							}
						} else "" + selectedValue === stringValue && target$jscomp$0.push(" selected=\"\"");
					} else selected && target$jscomp$0.push(" selected=\"\"");
					target$jscomp$0.push(">");
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
					return children$jscomp$1;
				case "textarea":
					target$jscomp$0.push(startChunkForTag("textarea"));
					var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
					for (propKey$jscomp$2 in props) if (hasOwnProperty.call(props, propKey$jscomp$2)) {
						var propValue$jscomp$2 = props[propKey$jscomp$2];
						if (null != propValue$jscomp$2) switch (propKey$jscomp$2) {
							case "children":
								children$jscomp$2 = propValue$jscomp$2;
								break;
							case "value":
								value$jscomp$0 = propValue$jscomp$2;
								break;
							case "defaultValue":
								defaultValue = propValue$jscomp$2;
								break;
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(91));
							default: pushAttribute(target$jscomp$0, propKey$jscomp$2, propValue$jscomp$2);
						}
					}
					null === value$jscomp$0 && null !== defaultValue && (value$jscomp$0 = defaultValue);
					target$jscomp$0.push(">");
					if (null != children$jscomp$2) {
						if (null != value$jscomp$0) throw Error(formatProdErrorMessage(92));
						if (isArrayImpl(children$jscomp$2)) {
							if (1 < children$jscomp$2.length) throw Error(formatProdErrorMessage(93));
							value$jscomp$0 = "" + children$jscomp$2[0];
						}
						value$jscomp$0 = "" + children$jscomp$2;
					}
					"string" === typeof value$jscomp$0 && "\n" === value$jscomp$0[0] && target$jscomp$0.push("\n");
					null !== value$jscomp$0 && target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0));
					return null;
				case "input":
					target$jscomp$0.push(startChunkForTag("input"));
					var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
					for (propKey$jscomp$3 in props) if (hasOwnProperty.call(props, propKey$jscomp$3)) {
						var propValue$jscomp$3 = props[propKey$jscomp$3];
						if (null != propValue$jscomp$3) switch (propKey$jscomp$3) {
							case "children":
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "input"));
							case "name":
								name = propValue$jscomp$3;
								break;
							case "formAction":
								formAction = propValue$jscomp$3;
								break;
							case "formEncType":
								formEncType = propValue$jscomp$3;
								break;
							case "formMethod":
								formMethod = propValue$jscomp$3;
								break;
							case "formTarget":
								formTarget = propValue$jscomp$3;
								break;
							case "defaultChecked":
								defaultChecked = propValue$jscomp$3;
								break;
							case "defaultValue":
								defaultValue$jscomp$0 = propValue$jscomp$3;
								break;
							case "checked":
								checked = propValue$jscomp$3;
								break;
							case "value":
								value$jscomp$1 = propValue$jscomp$3;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$3, propValue$jscomp$3);
						}
					}
					var formData = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);
					null !== checked ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : null !== defaultChecked && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
					null !== value$jscomp$1 ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : null !== defaultValue$jscomp$0 && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
					target$jscomp$0.push("/>");
					formData?.forEach(pushAdditionalFormField, target$jscomp$0);
					return null;
				case "button":
					target$jscomp$0.push(startChunkForTag("button"));
					var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
					for (propKey$jscomp$4 in props) if (hasOwnProperty.call(props, propKey$jscomp$4)) {
						var propValue$jscomp$4 = props[propKey$jscomp$4];
						if (null != propValue$jscomp$4) switch (propKey$jscomp$4) {
							case "children":
								children$jscomp$3 = propValue$jscomp$4;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$2 = propValue$jscomp$4;
								break;
							case "name":
								name$jscomp$0 = propValue$jscomp$4;
								break;
							case "formAction":
								formAction$jscomp$0 = propValue$jscomp$4;
								break;
							case "formEncType":
								formEncType$jscomp$0 = propValue$jscomp$4;
								break;
							case "formMethod":
								formMethod$jscomp$0 = propValue$jscomp$4;
								break;
							case "formTarget":
								formTarget$jscomp$0 = propValue$jscomp$4;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$4, propValue$jscomp$4);
						}
					}
					var formData$jscomp$0 = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction$jscomp$0, formEncType$jscomp$0, formMethod$jscomp$0, formTarget$jscomp$0, name$jscomp$0);
					target$jscomp$0.push(">");
					formData$jscomp$0?.forEach(pushAdditionalFormField, target$jscomp$0);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
					if ("string" === typeof children$jscomp$3) {
						target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
						var JSCompiler_inline_result$jscomp$0 = null;
					} else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
					return JSCompiler_inline_result$jscomp$0;
				case "form":
					target$jscomp$0.push(startChunkForTag("form"));
					var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
					for (propKey$jscomp$5 in props) if (hasOwnProperty.call(props, propKey$jscomp$5)) {
						var propValue$jscomp$5 = props[propKey$jscomp$5];
						if (null != propValue$jscomp$5) switch (propKey$jscomp$5) {
							case "children":
								children$jscomp$4 = propValue$jscomp$5;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$3 = propValue$jscomp$5;
								break;
							case "action":
								formAction$jscomp$1 = propValue$jscomp$5;
								break;
							case "encType":
								formEncType$jscomp$1 = propValue$jscomp$5;
								break;
							case "method":
								formMethod$jscomp$1 = propValue$jscomp$5;
								break;
							case "target":
								formTarget$jscomp$1 = propValue$jscomp$5;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$5, propValue$jscomp$5);
						}
					}
					var formData$jscomp$1 = null, formActionName = null;
					if ("function" === typeof formAction$jscomp$1) {
						var customFields = getCustomFormFields(resumableState, formAction$jscomp$1);
						null !== customFields ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(" ", "action", "=\"", actionJavaScriptURL, "\""), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
					}
					null != formAction$jscomp$1 && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
					null != formEncType$jscomp$1 && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
					null != formMethod$jscomp$1 && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
					null != formTarget$jscomp$1 && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
					target$jscomp$0.push(">");
					null !== formActionName && (target$jscomp$0.push("<input type=\"hidden\""), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push("/>"), formData$jscomp$1?.forEach(pushAdditionalFormField, target$jscomp$0));
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
					if ("string" === typeof children$jscomp$4) {
						target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
						var JSCompiler_inline_result$jscomp$1 = null;
					} else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
					return JSCompiler_inline_result$jscomp$1;
				case "menuitem":
					target$jscomp$0.push(startChunkForTag("menuitem"));
					for (var propKey$jscomp$6 in props) if (hasOwnProperty.call(props, propKey$jscomp$6)) {
						var propValue$jscomp$6 = props[propKey$jscomp$6];
						if (null != propValue$jscomp$6) switch (propKey$jscomp$6) {
							case "children":
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(400));
							default: pushAttribute(target$jscomp$0, propKey$jscomp$6, propValue$jscomp$6);
						}
					}
					target$jscomp$0.push(">");
					return null;
				case "object":
					target$jscomp$0.push(startChunkForTag("object"));
					var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
					for (propKey$jscomp$7 in props) if (hasOwnProperty.call(props, propKey$jscomp$7)) {
						var propValue$jscomp$7 = props[propKey$jscomp$7];
						if (null != propValue$jscomp$7) switch (propKey$jscomp$7) {
							case "children":
								children$jscomp$5 = propValue$jscomp$7;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$4 = propValue$jscomp$7;
								break;
							case "data":
								var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
								if ("" === sanitizedValue) break;
								target$jscomp$0.push(" ", "data", "=\"", escapeTextForBrowser(sanitizedValue), "\"");
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$7, propValue$jscomp$7);
						}
					}
					target$jscomp$0.push(">");
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
					if ("string" === typeof children$jscomp$5) {
						target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
						var JSCompiler_inline_result$jscomp$2 = null;
					} else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
					return JSCompiler_inline_result$jscomp$2;
				case "title":
					var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
					if (4 === formatContext.insertionMode || noscriptTagInScope || null != props.itemProp) var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(target$jscomp$0, props);
					else isFallback ? JSCompiler_inline_result$jscomp$3 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$3 = void 0);
					return JSCompiler_inline_result$jscomp$3;
				case "link":
					var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$0 || null != props.itemProp || "string" !== typeof rel || "string" !== typeof href || "" === href) {
						pushLinkImpl(target$jscomp$0, props);
						var JSCompiler_inline_result$jscomp$4 = null;
					} else if ("stylesheet" === props.rel) if ("string" !== typeof precedence || null != props.disabled || props.onLoad || props.onError) JSCompiler_inline_result$jscomp$4 = pushLinkImpl(target$jscomp$0, props);
					else {
						var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
						if (null !== resourceState) {
							resumableState.styleResources[href] = null;
							styleQueue || (styleQueue = {
								precedence: escapeTextForBrowser(precedence),
								rules: [],
								hrefs: [],
								sheets: /* @__PURE__ */ new Map()
							}, renderState.styles.set(precedence, styleQueue));
							var resource = {
								state: 0,
								props: assign({}, props, {
									"data-precedence": props.precedence,
									precedence: null
								})
							};
							if (resourceState) {
								2 === resourceState.length && adoptPreloadCredentials(resource.props, resourceState);
								var preloadResource = renderState.preloads.stylesheets.get(href);
								preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = 1;
							}
							styleQueue.sheets.set(href, resource);
							hoistableState && hoistableState.stylesheets.add(resource);
						} else if (styleQueue) {
							var resource$9 = styleQueue.sheets.get(href);
							resource$9 && hoistableState && hoistableState.stylesheets.add(resource$9);
						}
						textEmbedded && target$jscomp$0.push("<!-- -->");
						JSCompiler_inline_result$jscomp$4 = null;
					}
					else props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$4 = pushLinkImpl(target$jscomp$0, props) : (textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
					return JSCompiler_inline_result$jscomp$4;
				case "script":
					var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
					if ("string" !== typeof props.src || !props.src || !asyncProp || "function" === typeof asyncProp || "symbol" === typeof asyncProp || props.onLoad || props.onError || 4 === formatContext.insertionMode || noscriptTagInScope$jscomp$1 || null != props.itemProp) var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(target$jscomp$0, props);
					else {
						var key = props.src;
						if ("module" === props.type) {
							var resources = resumableState.moduleScriptResources;
							var preloads = renderState.preloads.moduleScripts;
						} else resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
						var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : void 0;
						if (null !== resourceState$jscomp$0) {
							resources[key] = null;
							var scriptProps = props;
							if (resourceState$jscomp$0) {
								2 === resourceState$jscomp$0.length && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
								var preloadResource$jscomp$0 = preloads.get(key);
								preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
							}
							var resource$jscomp$0 = [];
							renderState.scripts.add(resource$jscomp$0);
							pushScriptImpl(resource$jscomp$0, scriptProps);
						}
						textEmbedded && target$jscomp$0.push("<!-- -->");
						JSCompiler_inline_result$jscomp$5 = null;
					}
					return JSCompiler_inline_result$jscomp$5;
				case "style":
					var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1, precedence$jscomp$0 = props.precedence, href$jscomp$0 = props.href, nonce = props.nonce;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$2 || null != props.itemProp || "string" !== typeof precedence$jscomp$0 || "string" !== typeof href$jscomp$0 || "" === href$jscomp$0) {
						target$jscomp$0.push(startChunkForTag("style"));
						var children$jscomp$6 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
						for (propKey$jscomp$8 in props) if (hasOwnProperty.call(props, propKey$jscomp$8)) {
							var propValue$jscomp$8 = props[propKey$jscomp$8];
							if (null != propValue$jscomp$8) switch (propKey$jscomp$8) {
								case "children":
									children$jscomp$6 = propValue$jscomp$8;
									break;
								case "dangerouslySetInnerHTML":
									innerHTML$jscomp$5 = propValue$jscomp$8;
									break;
								default: pushAttribute(target$jscomp$0, propKey$jscomp$8, propValue$jscomp$8);
							}
						}
						target$jscomp$0.push(">");
						var child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
						"function" !== typeof child && "symbol" !== typeof child && null !== child && void 0 !== child && target$jscomp$0.push(("" + child).replace(styleRegex, styleReplacer));
						pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
						target$jscomp$0.push(endChunkForTag("style"));
						var JSCompiler_inline_result$jscomp$6 = null;
					} else {
						var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
						if (null !== (resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : void 0)) {
							resumableState.styleResources[href$jscomp$0] = null;
							styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
								precedence: escapeTextForBrowser(precedence$jscomp$0),
								rules: [],
								hrefs: [],
								sheets: /* @__PURE__ */ new Map()
							}, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
							var nonceStyle = renderState.nonce.style;
							if (!nonceStyle || nonceStyle === nonce) {
								styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
								var target = styleQueue$jscomp$0.rules, children$jscomp$7 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
								for (propKey$jscomp$9 in props) if (hasOwnProperty.call(props, propKey$jscomp$9)) {
									var propValue$jscomp$9 = props[propKey$jscomp$9];
									if (null != propValue$jscomp$9) switch (propKey$jscomp$9) {
										case "children":
											children$jscomp$7 = propValue$jscomp$9;
											break;
										case "dangerouslySetInnerHTML": innerHTML$jscomp$6 = propValue$jscomp$9;
									}
								}
								var child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
								"function" !== typeof child$jscomp$0 && "symbol" !== typeof child$jscomp$0 && null !== child$jscomp$0 && void 0 !== child$jscomp$0 && target.push(("" + child$jscomp$0).replace(styleRegex, styleReplacer));
								pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
							}
						}
						styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
						textEmbedded && target$jscomp$0.push("<!-- -->");
						JSCompiler_inline_result$jscomp$6 = void 0;
					}
					return JSCompiler_inline_result$jscomp$6;
				case "meta":
					var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$3 || null != props.itemProp) var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(target$jscomp$0, props, "meta");
					else textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1 ? null : "string" === typeof props.charSet ? pushSelfClosing(renderState.charsetChunks, props, "meta") : "viewport" === props.name ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
					return JSCompiler_inline_result$jscomp$7;
				case "listing":
				case "pre":
					target$jscomp$0.push(startChunkForTag(type));
					var children$jscomp$8 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
					for (propKey$jscomp$10 in props) if (hasOwnProperty.call(props, propKey$jscomp$10)) {
						var propValue$jscomp$10 = props[propKey$jscomp$10];
						if (null != propValue$jscomp$10) switch (propKey$jscomp$10) {
							case "children":
								children$jscomp$8 = propValue$jscomp$10;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$7 = propValue$jscomp$10;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$10, propValue$jscomp$10);
						}
					}
					target$jscomp$0.push(">");
					if (null != innerHTML$jscomp$7) {
						if (null != children$jscomp$8) throw Error(formatProdErrorMessage(60));
						if ("object" !== typeof innerHTML$jscomp$7 || !("__html" in innerHTML$jscomp$7)) throw Error(formatProdErrorMessage(61));
						var html = innerHTML$jscomp$7.__html;
						null !== html && void 0 !== html && ("string" === typeof html && 0 < html.length && "\n" === html[0] ? target$jscomp$0.push("\n", html) : target$jscomp$0.push("" + html));
					}
					"string" === typeof children$jscomp$8 && "\n" === children$jscomp$8[0] && target$jscomp$0.push("\n");
					return children$jscomp$8;
				case "img":
					var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
					if (!("lazy" === props.loading || !src && !srcSet || "string" !== typeof src && null != src || "string" !== typeof srcSet && null != srcSet || "low" === props.fetchPriority || pictureOrNoScriptTagInScope) && ("string" !== typeof src || ":" !== src[4] || "d" !== src[0] && "D" !== src[0] || "a" !== src[1] && "A" !== src[1] || "t" !== src[2] && "T" !== src[2] || "a" !== src[3] && "A" !== src[3]) && ("string" !== typeof srcSet || ":" !== srcSet[4] || "d" !== srcSet[0] && "D" !== srcSet[0] || "a" !== srcSet[1] && "A" !== srcSet[1] || "t" !== srcSet[2] && "T" !== srcSet[2] || "a" !== srcSet[3] && "A" !== srcSet[3])) {
						null !== hoistableState && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = !0);
						var sizes = "string" === typeof props.sizes ? props.sizes : void 0, key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
						if (resource$jscomp$1) {
							if ("high" === props.fetchPriority || 10 > renderState.highImagePreloads.size) promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
						} else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
							resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
							var input = props.crossOrigin;
							var JSCompiler_inline_result$jscomp$8 = "string" === typeof input ? "use-credentials" === input ? input : "" : void 0;
							var headers = renderState.headers, header;
							headers && 0 < headers.remainingCapacity && "string" !== typeof props.srcSet && ("high" === props.fetchPriority || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
								imageSrcSet: props.srcSet,
								imageSizes: props.sizes,
								crossOrigin: JSCompiler_inline_result$jscomp$8,
								integrity: props.integrity,
								nonce: props.nonce,
								type: props.type,
								fetchPriority: props.fetchPriority,
								referrerPolicy: props.refererPolicy
							}), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
								rel: "preload",
								as: "image",
								href: srcSet ? void 0 : src,
								imageSrcSet: srcSet,
								imageSizes: sizes,
								crossOrigin: JSCompiler_inline_result$jscomp$8,
								integrity: props.integrity,
								type: props.type,
								fetchPriority: props.fetchPriority,
								referrerPolicy: props.referrerPolicy
							}), "high" === props.fetchPriority || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
						}
					}
					return pushSelfClosing(target$jscomp$0, props, "img");
				case "base":
				case "area":
				case "br":
				case "col":
				case "embed":
				case "hr":
				case "keygen":
				case "param":
				case "source":
				case "track":
				case "wbr": return pushSelfClosing(target$jscomp$0, props, type);
				case "annotation-xml":
				case "color-profile":
				case "font-face":
				case "font-face-src":
				case "font-face-uri":
				case "font-face-format":
				case "font-face-name":
				case "missing-glyph": break;
				case "head":
					if (2 > formatContext.insertionMode) {
						var preamble = preambleState || renderState.preamble;
						if (preamble.headChunks) throw Error(formatProdErrorMessage(545, "`<head>`"));
						null !== preambleState && target$jscomp$0.push("<!--head-->");
						preamble.headChunks = [];
						var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(preamble.headChunks, props, "head");
					} else JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(target$jscomp$0, props, "head");
					return JSCompiler_inline_result$jscomp$9;
				case "body":
					if (2 > formatContext.insertionMode) {
						var preamble$jscomp$0 = preambleState || renderState.preamble;
						if (preamble$jscomp$0.bodyChunks) throw Error(formatProdErrorMessage(545, "`<body>`"));
						null !== preambleState && target$jscomp$0.push("<!--body-->");
						preamble$jscomp$0.bodyChunks = [];
						var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(preamble$jscomp$0.bodyChunks, props, "body");
					} else JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(target$jscomp$0, props, "body");
					return JSCompiler_inline_result$jscomp$10;
				case "html":
					if (0 === formatContext.insertionMode) {
						var preamble$jscomp$1 = preambleState || renderState.preamble;
						if (preamble$jscomp$1.htmlChunks) throw Error(formatProdErrorMessage(545, "`<html>`"));
						null !== preambleState && target$jscomp$0.push("<!--html-->");
						preamble$jscomp$1.htmlChunks = [""];
						var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(preamble$jscomp$1.htmlChunks, props, "html");
					} else JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(target$jscomp$0, props, "html");
					return JSCompiler_inline_result$jscomp$11;
				default: if (-1 !== type.indexOf("-")) {
					target$jscomp$0.push(startChunkForTag(type));
					var children$jscomp$9 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
					for (propKey$jscomp$11 in props) if (hasOwnProperty.call(props, propKey$jscomp$11)) {
						var propValue$jscomp$11 = props[propKey$jscomp$11];
						if (null != propValue$jscomp$11) {
							var attributeName = propKey$jscomp$11;
							switch (propKey$jscomp$11) {
								case "children":
									children$jscomp$9 = propValue$jscomp$11;
									break;
								case "dangerouslySetInnerHTML":
									innerHTML$jscomp$8 = propValue$jscomp$11;
									break;
								case "style":
									pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
									break;
								case "suppressContentEditableWarning":
								case "suppressHydrationWarning":
								case "ref": break;
								case "className": attributeName = "class";
								default: if (isAttributeNameSafe(propKey$jscomp$11) && "function" !== typeof propValue$jscomp$11 && "symbol" !== typeof propValue$jscomp$11 && !1 !== propValue$jscomp$11) {
									if (!0 === propValue$jscomp$11) propValue$jscomp$11 = "";
									else if ("object" === typeof propValue$jscomp$11) continue;
									target$jscomp$0.push(" ", attributeName, "=\"", escapeTextForBrowser(propValue$jscomp$11), "\"");
								}
							}
						}
					}
					target$jscomp$0.push(">");
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
					return children$jscomp$9;
				}
			}
			return pushStartGenericElement(target$jscomp$0, props, type);
		}
		var endTagCache = /* @__PURE__ */ new Map();
		function endChunkForTag(tag) {
			var chunk = endTagCache.get(tag);
			void 0 === chunk && (chunk = "</" + tag + ">", endTagCache.set(tag, chunk));
			return chunk;
		}
		function hoistPreambleState(renderState, preambleState) {
			renderState = renderState.preamble;
			null === renderState.htmlChunks && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
			null === renderState.headChunks && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
			null === renderState.bodyChunks && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
		}
		function writeBootstrap(destination, renderState) {
			renderState = renderState.bootstrapChunks;
			for (var i = 0; i < renderState.length - 1; i++) destination.push(renderState[i]);
			return i < renderState.length ? (i = renderState[i], renderState.length = 0, destination.push(i)) : !0;
		}
		function writeStartPendingSuspenseBoundary(destination, renderState, id) {
			destination.push("<!--$?--><template id=\"");
			if (null === id) throw Error(formatProdErrorMessage(395));
			destination.push(renderState.boundaryPrefix);
			renderState = id.toString(16);
			destination.push(renderState);
			return destination.push("\"></template>");
		}
		function writeStartSegment(destination, renderState, formatContext, id) {
			switch (formatContext.insertionMode) {
				case 0:
				case 1:
				case 3:
				case 2: return destination.push("<div hidden id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 4: return destination.push("<svg aria-hidden=\"true\" style=\"display:none\" id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 5: return destination.push("<math aria-hidden=\"true\" style=\"display:none\" id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 6: return destination.push("<table hidden id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 7: return destination.push("<table hidden><tbody id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 8: return destination.push("<table hidden><tr id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				case 9: return destination.push("<table hidden><colgroup id=\""), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push("\">");
				default: throw Error(formatProdErrorMessage(397));
			}
		}
		function writeEndSegment(destination, formatContext) {
			switch (formatContext.insertionMode) {
				case 0:
				case 1:
				case 3:
				case 2: return destination.push("</div>");
				case 4: return destination.push("</svg>");
				case 5: return destination.push("</math>");
				case 6: return destination.push("</table>");
				case 7: return destination.push("</tbody></table>");
				case 8: return destination.push("</tr></table>");
				case 9: return destination.push("</colgroup></table>");
				default: throw Error(formatProdErrorMessage(397));
			}
		}
		var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
		function escapeJSStringsForInstructionScripts(input) {
			return JSON.stringify(input).replace(regexForJSStringsInInstructionScripts, function(match) {
				switch (match) {
					case "<": return "\\u003c";
					case "\u2028": return "\\u2028";
					case "\u2029": return "\\u2029";
					default: throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
				}
			});
		}
		var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
		function escapeJSObjectForInstructionScripts(input) {
			return JSON.stringify(input).replace(regexForJSStringsInScripts, function(match) {
				switch (match) {
					case "&": return "\\u0026";
					case ">": return "\\u003e";
					case "<": return "\\u003c";
					case "\u2028": return "\\u2028";
					case "\u2029": return "\\u2029";
					default: throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
				}
			});
		}
		var currentlyRenderingBoundaryHasStylesToHoist = !1;
		var destinationHasCapacity = !0;
		function flushStyleTagsLateForBoundary(styleQueue) {
			var rules = styleQueue.rules, hrefs = styleQueue.hrefs, i = 0;
			if (hrefs.length) {
				this.push(currentlyFlushingRenderState.startInlineStyle);
				this.push(" media=\"not all\" data-precedence=\"");
				this.push(styleQueue.precedence);
				for (this.push("\" data-href=\""); i < hrefs.length - 1; i++) this.push(hrefs[i]), this.push(" ");
				this.push(hrefs[i]);
				this.push("\">");
				for (i = 0; i < rules.length; i++) this.push(rules[i]);
				destinationHasCapacity = this.push("</style>");
				currentlyRenderingBoundaryHasStylesToHoist = !0;
				rules.length = 0;
				hrefs.length = 0;
			}
		}
		function hasStylesToHoist(stylesheet) {
			return 2 !== stylesheet.state ? currentlyRenderingBoundaryHasStylesToHoist = !0 : !1;
		}
		function writeHoistablesForBoundary(destination, hoistableState, renderState) {
			currentlyRenderingBoundaryHasStylesToHoist = !1;
			destinationHasCapacity = !0;
			currentlyFlushingRenderState = renderState;
			hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
			currentlyFlushingRenderState = null;
			hoistableState.stylesheets.forEach(hasStylesToHoist);
			currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = !0);
			return destinationHasCapacity;
		}
		function flushResource(resource) {
			for (var i = 0; i < resource.length; i++) this.push(resource[i]);
			resource.length = 0;
		}
		var stylesheetFlushingQueue = [];
		function flushStyleInPreamble(stylesheet) {
			pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
			for (var i = 0; i < stylesheetFlushingQueue.length; i++) this.push(stylesheetFlushingQueue[i]);
			stylesheetFlushingQueue.length = 0;
			stylesheet.state = 2;
		}
		function flushStylesInPreamble(styleQueue) {
			var hasStylesheets = 0 < styleQueue.sheets.size;
			styleQueue.sheets.forEach(flushStyleInPreamble, this);
			styleQueue.sheets.clear();
			var rules = styleQueue.rules, hrefs = styleQueue.hrefs;
			if (!hasStylesheets || hrefs.length) {
				this.push(currentlyFlushingRenderState.startInlineStyle);
				this.push(" data-precedence=\"");
				this.push(styleQueue.precedence);
				styleQueue = 0;
				if (hrefs.length) {
					for (this.push("\" data-href=\""); styleQueue < hrefs.length - 1; styleQueue++) this.push(hrefs[styleQueue]), this.push(" ");
					this.push(hrefs[styleQueue]);
				}
				this.push("\">");
				for (styleQueue = 0; styleQueue < rules.length; styleQueue++) this.push(rules[styleQueue]);
				this.push("</style>");
				rules.length = 0;
				hrefs.length = 0;
			}
		}
		function preloadLateStyle(stylesheet) {
			if (0 === stylesheet.state) {
				stylesheet.state = 1;
				var props = stylesheet.props;
				pushLinkImpl(stylesheetFlushingQueue, {
					rel: "preload",
					as: "style",
					href: stylesheet.props.href,
					crossOrigin: props.crossOrigin,
					fetchPriority: props.fetchPriority,
					integrity: props.integrity,
					media: props.media,
					hrefLang: props.hrefLang,
					referrerPolicy: props.referrerPolicy
				});
				for (stylesheet = 0; stylesheet < stylesheetFlushingQueue.length; stylesheet++) this.push(stylesheetFlushingQueue[stylesheet]);
				stylesheetFlushingQueue.length = 0;
			}
		}
		function preloadLateStyles(styleQueue) {
			styleQueue.sheets.forEach(preloadLateStyle, this);
			styleQueue.sheets.clear();
		}
		function pushCompletedShellIdAttribute(target, resumableState) {
			0 === (resumableState.instructions & 32) && (resumableState.instructions |= 32, target.push(" id=\"", escapeTextForBrowser("_" + resumableState.idPrefix + "R_"), "\""));
		}
		function writeStyleResourceDependenciesInJS(destination, hoistableState) {
			destination.push("[");
			var nextArrayOpenBrackChunk = "[";
			hoistableState.stylesheets.forEach(function(resource) {
				if (2 !== resource.state) if (3 === resource.state) destination.push(nextArrayOpenBrackChunk), resource = escapeJSObjectForInstructionScripts("" + resource.props.href), destination.push(resource), destination.push("]"), nextArrayOpenBrackChunk = ",[";
				else {
					destination.push(nextArrayOpenBrackChunk);
					var precedence = resource.props["data-precedence"], props = resource.props, coercedHref = sanitizeURL("" + resource.props.href);
					coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
					destination.push(coercedHref);
					precedence = "" + precedence;
					destination.push(",");
					precedence = escapeJSObjectForInstructionScripts(precedence);
					destination.push(precedence);
					for (var propKey in props) if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], null != precedence)) switch (propKey) {
						case "href":
						case "rel":
						case "precedence":
						case "data-precedence": break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "link"));
						default: writeStyleResourceAttributeInJS(destination, propKey, precedence);
					}
					destination.push("]");
					nextArrayOpenBrackChunk = ",[";
					resource.state = 3;
				}
			});
			destination.push("]");
		}
		function writeStyleResourceAttributeInJS(destination, name, value) {
			var attributeName = name.toLowerCase();
			switch (typeof value) {
				case "function":
				case "symbol": return;
			}
			switch (name) {
				case "innerHTML":
				case "dangerouslySetInnerHTML":
				case "suppressContentEditableWarning":
				case "suppressHydrationWarning":
				case "style":
				case "ref": return;
				case "className":
					attributeName = "class";
					name = "" + value;
					break;
				case "hidden":
					if (!1 === value) return;
					name = "";
					break;
				case "src":
				case "href":
					value = sanitizeURL(value);
					name = "" + value;
					break;
				default:
					if (2 < name.length && ("o" === name[0] || "O" === name[0]) && ("n" === name[1] || "N" === name[1]) || !isAttributeNameSafe(name)) return;
					name = "" + value;
			}
			destination.push(",");
			attributeName = escapeJSObjectForInstructionScripts(attributeName);
			destination.push(attributeName);
			destination.push(",");
			attributeName = escapeJSObjectForInstructionScripts(name);
			destination.push(attributeName);
		}
		function createHoistableState() {
			return {
				styles: /* @__PURE__ */ new Set(),
				stylesheets: /* @__PURE__ */ new Set(),
				suspenseyImages: !1
			};
		}
		function prefetchDNS(href) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if ("string" === typeof href && href) {
					if (!resumableState.dnsResources.hasOwnProperty(href)) {
						resumableState.dnsResources[href] = null;
						resumableState = renderState.headers;
						var header, JSCompiler_temp;
						if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) JSCompiler_temp = (header = "<" + ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
						JSCompiler_temp ? (renderState.resets.dns[href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, {
							href,
							rel: "dns-prefetch"
						}), renderState.preconnects.add(header));
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.D(href);
		}
		function preconnect(href, crossOrigin) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if ("string" === typeof href && href) {
					var bucket = "use-credentials" === crossOrigin ? "credentials" : "string" === typeof crossOrigin ? "anonymous" : "default";
					if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
						resumableState.connectResources[bucket][href] = null;
						resumableState = renderState.headers;
						var header, JSCompiler_temp;
						if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
							JSCompiler_temp = "<" + ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer) + ">; rel=preconnect";
							if ("string" === typeof crossOrigin) {
								var escapedCrossOrigin = ("" + crossOrigin).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
								JSCompiler_temp += "; crossorigin=\"" + escapedCrossOrigin + "\"";
							}
							JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
						}
						JSCompiler_temp ? (renderState.resets.connect[bucket][href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
							rel: "preconnect",
							href,
							crossOrigin
						}), renderState.preconnects.add(bucket));
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.C(href, crossOrigin);
		}
		function preload(href, as, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (as && href) {
					switch (as) {
						case "image":
							if (options) {
								var imageSrcSet = options.imageSrcSet;
								var imageSizes = options.imageSizes;
								var fetchPriority = options.fetchPriority;
							}
							var key = imageSrcSet ? imageSrcSet + "\n" + (imageSizes || "") : href;
							if (resumableState.imageResources.hasOwnProperty(key)) return;
							resumableState.imageResources[key] = PRELOAD_NO_CREDS;
							resumableState = renderState.headers;
							var header;
							resumableState && 0 < resumableState.remainingCapacity && "string" !== typeof imageSrcSet && "high" === fetchPriority && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(resumableState, assign({
								rel: "preload",
								href: imageSrcSet ? void 0 : href,
								as
							}, options)), "high" === fetchPriority ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
							break;
						case "style":
							if (resumableState.styleResources.hasOwnProperty(href)) return;
							imageSrcSet = [];
							pushLinkImpl(imageSrcSet, assign({
								rel: "preload",
								href,
								as
							}, options));
							resumableState.styleResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							renderState.preloads.stylesheets.set(href, imageSrcSet);
							renderState.bulkPreloads.add(imageSrcSet);
							break;
						case "script":
							if (resumableState.scriptResources.hasOwnProperty(href)) return;
							imageSrcSet = [];
							renderState.preloads.scripts.set(href, imageSrcSet);
							renderState.bulkPreloads.add(imageSrcSet);
							pushLinkImpl(imageSrcSet, assign({
								rel: "preload",
								href,
								as
							}, options));
							resumableState.scriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							break;
						default:
							if (resumableState.unknownResources.hasOwnProperty(as)) {
								if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href)) return;
							} else imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
							imageSrcSet[href] = PRELOAD_NO_CREDS;
							if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && "font" === as && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2))) renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
							else switch (resumableState = [], href = assign({
								rel: "preload",
								href,
								as
							}, options), pushLinkImpl(resumableState, href), as) {
								case "font":
									renderState.fontPreloads.add(resumableState);
									break;
								default: renderState.bulkPreloads.add(resumableState);
							}
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.L(href, as, options);
		}
		function preloadModule(href, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (href) {
					var as = options && "string" === typeof options.as ? options.as : "script";
					switch (as) {
						case "script":
							if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
							as = [];
							resumableState.moduleScriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							renderState.preloads.moduleScripts.set(href, as);
							break;
						default:
							if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
								var resources = resumableState.unknownResources[as];
								if (resources.hasOwnProperty(href)) return;
							} else resources = {}, resumableState.moduleUnknownResources[as] = resources;
							as = [];
							resources[href] = PRELOAD_NO_CREDS;
					}
					pushLinkImpl(as, assign({
						rel: "modulepreload",
						href
					}, options));
					renderState.bulkPreloads.add(as);
					enqueueFlush(request);
				}
			} else previousDispatcher.m(href, options);
		}
		function preinitStyle(href, precedence, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (href) {
					precedence = precedence || "default";
					var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
					null !== resourceState && (resumableState.styleResources[href] = null, styleQueue || (styleQueue = {
						precedence: escapeTextForBrowser(precedence),
						rules: [],
						hrefs: [],
						sheets: /* @__PURE__ */ new Map()
					}, renderState.styles.set(precedence, styleQueue)), precedence = {
						state: 0,
						props: assign({
							rel: "stylesheet",
							href,
							"data-precedence": precedence
						}, options)
					}, resourceState && (2 === resourceState.length && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = 1), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
				}
			} else previousDispatcher.S(href, precedence, options);
		}
		function preinitScript(src, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (src) {
					var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : void 0;
					null !== resourceState && (resumableState.scriptResources[src] = null, options = assign({
						src,
						async: !0
					}, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
				}
			} else previousDispatcher.X(src, options);
		}
		function preinitModuleScript(src, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (src) {
					var resourceState = resumableState.moduleScriptResources.hasOwnProperty(src) ? resumableState.moduleScriptResources[src] : void 0;
					null !== resourceState && (resumableState.moduleScriptResources[src] = null, options = assign({
						src,
						type: "module",
						async: !0
					}, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
				}
			} else previousDispatcher.M(src, options);
		}
		function adoptPreloadCredentials(target, preloadState) {
			target.crossOrigin ??= preloadState[0];
			target.integrity ??= preloadState[1];
		}
		function getPreloadAsHeader(href, as, params) {
			href = ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer);
			as = ("" + as).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
			as = "<" + href + ">; rel=preload; as=\"" + as + "\"";
			for (var paramName in params) hasOwnProperty.call(params, paramName) && (href = params[paramName], "string" === typeof href && (as += "; " + paramName.toLowerCase() + "=\"" + ("" + href).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer) + "\""));
			return as;
		}
		var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
		function escapeHrefForLinkHeaderURLContextReplacer(match) {
			switch (match) {
				case "<": return "%3C";
				case ">": return "%3E";
				case "\n": return "%0A";
				case "\r": return "%0D";
				default: throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		}
		var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
		function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
			switch (match) {
				case "\"": return "%22";
				case "'": return "%27";
				case ";": return "%3B";
				case ",": return "%2C";
				case "\n": return "%0A";
				case "\r": return "%0D";
				default: throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		}
		function hoistStyleQueueDependency(styleQueue) {
			this.styles.add(styleQueue);
		}
		function hoistStylesheetDependency(stylesheet) {
			this.stylesheets.add(stylesheet);
		}
		function hoistHoistables(parentState, childState) {
			childState.styles.forEach(hoistStyleQueueDependency, parentState);
			childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
			childState.suspenseyImages && (parentState.suspenseyImages = !0);
		}
		function createRenderState(resumableState, generateStaticMarkup) {
			var idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
			void 0 !== bootstrapScriptContent && (bootstrapChunks.push("<script"), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(">", ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer), "<\/script>"));
			bootstrapScriptContent = idPrefix + "P:";
			var JSCompiler_object_inline_segmentPrefix_1673 = idPrefix + "S:";
			idPrefix += "B:";
			var JSCompiler_object_inline_preconnects_1687 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_fontPreloads_1688 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_highImagePreloads_1689 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_styles_1690 = /* @__PURE__ */ new Map(), JSCompiler_object_inline_bootstrapScripts_1691 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_scripts_1692 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_bulkPreloads_1693 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_preloads_1694 = {
				images: /* @__PURE__ */ new Map(),
				stylesheets: /* @__PURE__ */ new Map(),
				scripts: /* @__PURE__ */ new Map(),
				moduleScripts: /* @__PURE__ */ new Map()
			};
			if (void 0 !== bootstrapScripts) for (var i = 0; i < bootstrapScripts.length; i++) {
				var scriptConfig = bootstrapScripts[i], src, crossOrigin = void 0, integrity = void 0, props = {
					rel: "preload",
					as: "script",
					fetchPriority: "low",
					nonce: void 0
				};
				"string" === typeof scriptConfig ? props.href = src = scriptConfig : (props.href = src = scriptConfig.src, props.integrity = integrity = "string" === typeof scriptConfig.integrity ? scriptConfig.integrity : void 0, props.crossOrigin = crossOrigin = "string" === typeof scriptConfig || null == scriptConfig.crossOrigin ? void 0 : "use-credentials" === scriptConfig.crossOrigin ? "use-credentials" : "");
				scriptConfig = resumableState;
				var href = src;
				scriptConfig.scriptResources[href] = null;
				scriptConfig.moduleScriptResources[href] = null;
				scriptConfig = [];
				pushLinkImpl(scriptConfig, props);
				JSCompiler_object_inline_bootstrapScripts_1691.add(scriptConfig);
				bootstrapChunks.push("<script src=\"", escapeTextForBrowser(src), "\"");
				"string" === typeof integrity && bootstrapChunks.push(" integrity=\"", escapeTextForBrowser(integrity), "\"");
				"string" === typeof crossOrigin && bootstrapChunks.push(" crossorigin=\"", escapeTextForBrowser(crossOrigin), "\"");
				pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
				bootstrapChunks.push(" async=\"\"><\/script>");
			}
			if (void 0 !== bootstrapModules) for (bootstrapScripts = 0; bootstrapScripts < bootstrapModules.length; bootstrapScripts++) props = bootstrapModules[bootstrapScripts], crossOrigin = src = void 0, integrity = {
				rel: "modulepreload",
				fetchPriority: "low",
				nonce: void 0
			}, "string" === typeof props ? integrity.href = i = props : (integrity.href = i = props.src, integrity.integrity = crossOrigin = "string" === typeof props.integrity ? props.integrity : void 0, integrity.crossOrigin = src = "string" === typeof props || null == props.crossOrigin ? void 0 : "use-credentials" === props.crossOrigin ? "use-credentials" : ""), props = resumableState, scriptConfig = i, props.scriptResources[scriptConfig] = null, props.moduleScriptResources[scriptConfig] = null, props = [], pushLinkImpl(props, integrity), JSCompiler_object_inline_bootstrapScripts_1691.add(props), bootstrapChunks.push("<script type=\"module\" src=\"", escapeTextForBrowser(i), "\""), "string" === typeof crossOrigin && bootstrapChunks.push(" integrity=\"", escapeTextForBrowser(crossOrigin), "\""), "string" === typeof src && bootstrapChunks.push(" crossorigin=\"", escapeTextForBrowser(src), "\""), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(" async=\"\"><\/script>");
			return {
				placeholderPrefix: bootstrapScriptContent,
				segmentPrefix: JSCompiler_object_inline_segmentPrefix_1673,
				boundaryPrefix: idPrefix,
				startInlineScript: "<script",
				startInlineStyle: "<style",
				preamble: {
					htmlChunks: null,
					headChunks: null,
					bodyChunks: null
				},
				externalRuntimeScript: null,
				bootstrapChunks,
				importMapChunks: [],
				onHeaders: void 0,
				headers: null,
				resets: {
					font: {},
					dns: {},
					connect: {
						default: {},
						anonymous: {},
						credentials: {}
					},
					image: {},
					style: {}
				},
				charsetChunks: [],
				viewportChunks: [],
				hoistableChunks: [],
				preconnects: JSCompiler_object_inline_preconnects_1687,
				fontPreloads: JSCompiler_object_inline_fontPreloads_1688,
				highImagePreloads: JSCompiler_object_inline_highImagePreloads_1689,
				styles: JSCompiler_object_inline_styles_1690,
				bootstrapScripts: JSCompiler_object_inline_bootstrapScripts_1691,
				scripts: JSCompiler_object_inline_scripts_1692,
				bulkPreloads: JSCompiler_object_inline_bulkPreloads_1693,
				preloads: JSCompiler_object_inline_preloads_1694,
				nonce: {
					script: void 0,
					style: void 0
				},
				stylesToHoist: !1,
				generateStaticMarkup
			};
		}
		function pushTextInstance(target, text, renderState, textEmbedded) {
			if (renderState.generateStaticMarkup) return target.push(escapeTextForBrowser(text)), !1;
			"" === text ? target = textEmbedded : (textEmbedded && target.push("<!-- -->"), target.push(escapeTextForBrowser(text)), target = !0);
			return target;
		}
		function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
			renderState.generateStaticMarkup || lastPushedText && textEmbedded && target.push("<!-- -->");
		}
		var bind = Function.prototype.bind;
		var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
		function getComponentNameFromType(type) {
			if (null == type) return null;
			if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
			if ("string" === typeof type) return type;
			switch (type) {
				case REACT_FRAGMENT_TYPE: return "Fragment";
				case REACT_PROFILER_TYPE: return "Profiler";
				case REACT_STRICT_MODE_TYPE: return "StrictMode";
				case REACT_SUSPENSE_TYPE: return "Suspense";
				case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
				case REACT_ACTIVITY_TYPE: return "Activity";
			}
			if ("object" === typeof type) switch (type.$$typeof) {
				case REACT_PORTAL_TYPE: return "Portal";
				case REACT_CONTEXT_TYPE: return type.displayName || "Context";
				case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
				case REACT_FORWARD_REF_TYPE:
					var innerType = type.render;
					type = type.displayName;
					type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
					return type;
				case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
				case REACT_LAZY_TYPE:
					innerType = type._payload;
					type = type._init;
					try {
						return getComponentNameFromType(type(innerType));
					} catch (x) {}
			}
			return null;
		}
		var emptyContextObject = {};
		var currentActiveSnapshot = null;
		function popToNearestCommonAncestor(prev, next) {
			if (prev !== next) {
				prev.context._currentValue2 = prev.parentValue;
				prev = prev.parent;
				var parentNext = next.parent;
				if (null === prev) {
					if (null !== parentNext) throw Error(formatProdErrorMessage(401));
				} else {
					if (null === parentNext) throw Error(formatProdErrorMessage(401));
					popToNearestCommonAncestor(prev, parentNext);
				}
				next.context._currentValue2 = next.value;
			}
		}
		function popAllPrevious(prev) {
			prev.context._currentValue2 = prev.parentValue;
			prev = prev.parent;
			null !== prev && popAllPrevious(prev);
		}
		function pushAllNext(next) {
			var parentNext = next.parent;
			null !== parentNext && pushAllNext(parentNext);
			next.context._currentValue2 = next.value;
		}
		function popPreviousToCommonLevel(prev, next) {
			prev.context._currentValue2 = prev.parentValue;
			prev = prev.parent;
			if (null === prev) throw Error(formatProdErrorMessage(402));
			prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
		}
		function popNextToCommonLevel(prev, next) {
			var parentNext = next.parent;
			if (null === parentNext) throw Error(formatProdErrorMessage(402));
			prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
			next.context._currentValue2 = next.value;
		}
		function switchContext(newSnapshot) {
			var prev = currentActiveSnapshot;
			prev !== newSnapshot && (null === prev ? pushAllNext(newSnapshot) : null === newSnapshot ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
		}
		var classComponentUpdater = {
			enqueueSetState: function(inst, payload) {
				inst = inst._reactInternals;
				null !== inst.queue && inst.queue.push(payload);
			},
			enqueueReplaceState: function(inst, payload) {
				inst = inst._reactInternals;
				inst.replace = !0;
				inst.queue = [payload];
			},
			enqueueForceUpdate: function() {}
		};
		var emptyTreeContext = {
			id: 1,
			overflow: ""
		};
		function pushTreeContext(baseContext, totalChildren, index) {
			var baseIdWithLeadingBit = baseContext.id;
			baseContext = baseContext.overflow;
			var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
			baseIdWithLeadingBit &= ~(1 << baseLength);
			index += 1;
			var length = 32 - clz32(totalChildren) + baseLength;
			if (30 < length) {
				var numberOfOverflowBits = baseLength - baseLength % 5;
				length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
				baseIdWithLeadingBit >>= numberOfOverflowBits;
				baseLength -= numberOfOverflowBits;
				return {
					id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
					overflow: length + baseContext
				};
			}
			return {
				id: 1 << length | index << baseLength | baseIdWithLeadingBit,
				overflow: baseContext
			};
		}
		var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
		var log = Math.log;
		var LN2 = Math.LN2;
		function clz32Fallback(x) {
			x >>>= 0;
			return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
		}
		function noop() {}
		var SuspenseException = Error(formatProdErrorMessage(460));
		function trackUsedThenable(thenableState, thenable, index) {
			index = thenableState[index];
			void 0 === index ? thenableState.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default:
					"string" === typeof thenable.status ? thenable.then(noop, noop) : (thenableState = thenable, thenableState.status = "pending", thenableState.then(function(fulfilledValue) {
						if ("pending" === thenable.status) {
							var fulfilledThenable = thenable;
							fulfilledThenable.status = "fulfilled";
							fulfilledThenable.value = fulfilledValue;
						}
					}, function(error) {
						if ("pending" === thenable.status) {
							var rejectedThenable = thenable;
							rejectedThenable.status = "rejected";
							rejectedThenable.reason = error;
						}
					}));
					switch (thenable.status) {
						case "fulfilled": return thenable.value;
						case "rejected": throw thenable.reason;
					}
					suspendedThenable = thenable;
					throw SuspenseException;
			}
		}
		var suspendedThenable = null;
		function getSuspendedThenable() {
			if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
			var thenable = suspendedThenable;
			suspendedThenable = null;
			return thenable;
		}
		function is(x, y) {
			return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
		}
		var objectIs = "function" === typeof Object.is ? Object.is : is;
		var currentlyRenderingComponent = null;
		var currentlyRenderingTask = null;
		var currentlyRenderingRequest = null;
		var currentlyRenderingKeyPath = null;
		var firstWorkInProgressHook = null;
		var workInProgressHook = null;
		var isReRender = !1;
		var didScheduleRenderPhaseUpdate = !1;
		var localIdCounter = 0;
		var actionStateCounter = 0;
		var actionStateMatchingIndex = -1;
		var thenableIndexCounter = 0;
		var thenableState = null;
		var renderPhaseUpdates = null;
		var numberOfReRenders = 0;
		function resolveCurrentlyRenderingComponent() {
			if (null === currentlyRenderingComponent) throw Error(formatProdErrorMessage(321));
			return currentlyRenderingComponent;
		}
		function createHook() {
			if (0 < numberOfReRenders) throw Error(formatProdErrorMessage(312));
			return {
				memoizedState: null,
				queue: null,
				next: null
			};
		}
		function createWorkInProgressHook() {
			null === workInProgressHook ? null === firstWorkInProgressHook ? (isReRender = !1, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = !0, workInProgressHook = firstWorkInProgressHook) : null === workInProgressHook.next ? (isReRender = !1, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = !0, workInProgressHook = workInProgressHook.next);
			return workInProgressHook;
		}
		function getThenableStateAfterSuspending() {
			var state = thenableState;
			thenableState = null;
			return state;
		}
		function resetHooksState() {
			currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
			didScheduleRenderPhaseUpdate = !1;
			firstWorkInProgressHook = null;
			numberOfReRenders = 0;
			workInProgressHook = renderPhaseUpdates = null;
		}
		function basicStateReducer(state, action) {
			return "function" === typeof action ? action(state) : action;
		}
		function useReducer(reducer, initialArg, init) {
			currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
			workInProgressHook = createWorkInProgressHook();
			if (isReRender) {
				var queue = workInProgressHook.queue;
				initialArg = queue.dispatch;
				if (null !== renderPhaseUpdates && (init = renderPhaseUpdates.get(queue), void 0 !== init)) {
					renderPhaseUpdates.delete(queue);
					queue = workInProgressHook.memoizedState;
					do
						queue = reducer(queue, init.action), init = init.next;
					while (null !== init);
					workInProgressHook.memoizedState = queue;
					return [queue, initialArg];
				}
				return [workInProgressHook.memoizedState, initialArg];
			}
			reducer = reducer === basicStateReducer ? "function" === typeof initialArg ? initialArg() : initialArg : void 0 !== init ? init(initialArg) : initialArg;
			workInProgressHook.memoizedState = reducer;
			reducer = workInProgressHook.queue = {
				last: null,
				dispatch: null
			};
			reducer = reducer.dispatch = dispatchAction.bind(null, currentlyRenderingComponent, reducer);
			return [workInProgressHook.memoizedState, reducer];
		}
		function useMemo(nextCreate, deps) {
			currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
			workInProgressHook = createWorkInProgressHook();
			deps = void 0 === deps ? null : deps;
			if (null !== workInProgressHook) {
				var prevState = workInProgressHook.memoizedState;
				if (null !== prevState && null !== deps) {
					var prevDeps = prevState[1];
					a: if (null === prevDeps) prevDeps = !1;
					else {
						for (var i = 0; i < prevDeps.length && i < deps.length; i++) if (!objectIs(deps[i], prevDeps[i])) {
							prevDeps = !1;
							break a;
						}
						prevDeps = !0;
					}
					if (prevDeps) return prevState[0];
				}
			}
			nextCreate = nextCreate();
			workInProgressHook.memoizedState = [nextCreate, deps];
			return nextCreate;
		}
		function dispatchAction(componentIdentity, queue, action) {
			if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
			if (componentIdentity === currentlyRenderingComponent) if (didScheduleRenderPhaseUpdate = !0, componentIdentity = {
				action,
				next: null
			}, null === renderPhaseUpdates && (renderPhaseUpdates = /* @__PURE__ */ new Map()), action = renderPhaseUpdates.get(queue), void 0 === action) renderPhaseUpdates.set(queue, componentIdentity);
			else {
				for (queue = action; null !== queue.next;) queue = queue.next;
				queue.next = componentIdentity;
			}
		}
		function throwOnUseEffectEventCall() {
			throw Error(formatProdErrorMessage(440));
		}
		function unsupportedStartTransition() {
			throw Error(formatProdErrorMessage(394));
		}
		function unsupportedSetOptimisticState() {
			throw Error(formatProdErrorMessage(479));
		}
		function useActionState(action, initialState, permalink) {
			resolveCurrentlyRenderingComponent();
			var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
			if ("function" === typeof action.$$FORM_ACTION) {
				var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
				request = request.formState;
				var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
				if (null !== request && "function" === typeof isSignatureEqual) {
					var postbackKey = request[1];
					isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
						componentKeyPath,
						null,
						actionStateHookIndex
					]), 0), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
				}
				var boundAction = action.bind(null, initialState);
				action = function(payload) {
					boundAction(payload);
				};
				"function" === typeof boundAction.$$FORM_ACTION && (action.$$FORM_ACTION = function(prefix) {
					prefix = boundAction.$$FORM_ACTION(prefix);
					void 0 !== permalink && (permalink += "", prefix.action = permalink);
					var formData = prefix.data;
					formData && (null === nextPostbackStateKey && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
						componentKeyPath,
						null,
						actionStateHookIndex
					]), 0)), formData.append("$ACTION_KEY", nextPostbackStateKey));
					return prefix;
				});
				return [
					initialState,
					action,
					!1
				];
			}
			var boundAction$22 = action.bind(null, initialState);
			return [
				initialState,
				function(payload) {
					boundAction$22(payload);
				},
				!1
			];
		}
		function unwrapThenable(thenable) {
			var index = thenableIndexCounter;
			thenableIndexCounter += 1;
			null === thenableState && (thenableState = []);
			return trackUsedThenable(thenableState, thenable, index);
		}
		function unsupportedRefresh() {
			throw Error(formatProdErrorMessage(393));
		}
		var HooksDispatcher = {
			readContext: function(context) {
				return context._currentValue2;
			},
			use: function(usable) {
				if (null !== usable && "object" === typeof usable) {
					if ("function" === typeof usable.then) return unwrapThenable(usable);
					if (usable.$$typeof === REACT_CONTEXT_TYPE) return usable._currentValue2;
				}
				throw Error(formatProdErrorMessage(438, String(usable)));
			},
			useContext: function(context) {
				resolveCurrentlyRenderingComponent();
				return context._currentValue2;
			},
			useMemo,
			useReducer,
			useRef: function(initialValue) {
				currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
				workInProgressHook = createWorkInProgressHook();
				var previousRef = workInProgressHook.memoizedState;
				return null === previousRef ? (initialValue = { current: initialValue }, workInProgressHook.memoizedState = initialValue) : previousRef;
			},
			useState: function(initialState) {
				return useReducer(basicStateReducer, initialState);
			},
			useInsertionEffect: noop,
			useLayoutEffect: noop,
			useCallback: function(callback, deps) {
				return useMemo(function() {
					return callback;
				}, deps);
			},
			useImperativeHandle: noop,
			useEffect: noop,
			useDebugValue: noop,
			useDeferredValue: function(value, initialValue) {
				resolveCurrentlyRenderingComponent();
				return void 0 !== initialValue ? initialValue : value;
			},
			useTransition: function() {
				resolveCurrentlyRenderingComponent();
				return [!1, unsupportedStartTransition];
			},
			useId: function() {
				var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
				var overflow = JSCompiler_inline_result.overflow;
				JSCompiler_inline_result = JSCompiler_inline_result.id;
				JSCompiler_inline_result = (JSCompiler_inline_result & ~(1 << 32 - clz32(JSCompiler_inline_result) - 1)).toString(32) + overflow;
				var resumableState = currentResumableState;
				if (null === resumableState) throw Error(formatProdErrorMessage(404));
				overflow = localIdCounter++;
				JSCompiler_inline_result = "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
				0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
				return JSCompiler_inline_result + "_";
			},
			useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
				if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
				return getServerSnapshot();
			},
			useOptimistic: function(passthrough) {
				resolveCurrentlyRenderingComponent();
				return [passthrough, unsupportedSetOptimisticState];
			},
			useActionState,
			useFormState: useActionState,
			useHostTransitionStatus: function() {
				resolveCurrentlyRenderingComponent();
				return sharedNotPendingObject;
			},
			useMemoCache: function(size) {
				for (var data = Array(size), i = 0; i < size; i++) data[i] = REACT_MEMO_CACHE_SENTINEL;
				return data;
			},
			useCacheRefresh: function() {
				return unsupportedRefresh;
			},
			useEffectEvent: function() {
				return throwOnUseEffectEventCall;
			}
		};
		var currentResumableState = null;
		var DefaultAsyncDispatcher = {
			getCacheForType: function() {
				throw Error(formatProdErrorMessage(248));
			},
			cacheSignal: function() {
				throw Error(formatProdErrorMessage(248));
			}
		};
		var prefix;
		var suffix;
		function describeBuiltInComponentFrame(name) {
			if (void 0 === prefix) try {
				throw Error();
			} catch (x) {
				var match = x.stack.trim().match(/\n( *(at )?)/);
				prefix = match && match[1] || "";
				suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
			}
			return "\n" + prefix + name + suffix;
		}
		var reentry = !1;
		function describeNativeComponentFrame(fn, construct) {
			if (!fn || reentry) return "";
			reentry = !0;
			var previousPrepareStackTrace = Error.prepareStackTrace;
			Error.prepareStackTrace = void 0;
			try {
				var RunInRootFrame = { DetermineComponentFrameRoot: function() {
					try {
						if (construct) {
							var Fake = function() {
								throw Error();
							};
							Object.defineProperty(Fake.prototype, "props", { set: function() {
								throw Error();
							} });
							if ("object" === typeof Reflect && Reflect.construct) {
								try {
									Reflect.construct(Fake, []);
								} catch (x) {
									var control = x;
								}
								Reflect.construct(fn, [], Fake);
							} else {
								try {
									Fake.call();
								} catch (x$24) {
									control = x$24;
								}
								fn.call(Fake.prototype);
							}
						} else {
							try {
								throw Error();
							} catch (x$25) {
								control = x$25;
							}
							(Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {});
						}
					} catch (sample) {
						if (sample && control && "string" === typeof sample.stack) return [sample.stack, control.stack];
					}
					return [null, null];
				} };
				RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
				var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
				namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
				var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
				if (sampleStack && controlStack) {
					var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
					for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");) RunInRootFrame++;
					for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes("DetermineComponentFrameRoot");) namePropDescriptor++;
					if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length) for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];) namePropDescriptor--;
					for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--) if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
						if (1 !== RunInRootFrame || 1 !== namePropDescriptor) do
							if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
								var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
								fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
								return frame;
							}
						while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
						break;
					}
				}
			} finally {
				reentry = !1, Error.prepareStackTrace = previousPrepareStackTrace;
			}
			return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
		}
		function describeComponentStackByType(type) {
			if ("string" === typeof type) return describeBuiltInComponentFrame(type);
			if ("function" === typeof type) return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, !0) : describeNativeComponentFrame(type, !1);
			if ("object" === typeof type && null !== type) {
				switch (type.$$typeof) {
					case REACT_FORWARD_REF_TYPE: return describeNativeComponentFrame(type.render, !1);
					case REACT_MEMO_TYPE: return describeNativeComponentFrame(type.type, !1);
					case REACT_LAZY_TYPE:
						var lazyComponent = type, payload = lazyComponent._payload;
						lazyComponent = lazyComponent._init;
						try {
							type = lazyComponent(payload);
						} catch (x) {
							return describeBuiltInComponentFrame("Lazy");
						}
						return describeComponentStackByType(type);
				}
				if ("string" === typeof type.name) {
					a: {
						payload = type.name;
						lazyComponent = type.env;
						var location = type.debugLocation;
						if (null != location && (type = Error.prepareStackTrace, Error.prepareStackTrace = void 0, location = location.stack, Error.prepareStackTrace = type, location.startsWith("Error: react-stack-top-frame\n") && (location = location.slice(29)), type = location.indexOf("\n"), -1 !== type && (location = location.slice(type + 1)), type = location.indexOf("react_stack_bottom_frame"), -1 !== type && (type = location.lastIndexOf("\n", type)), type = -1 !== type ? location = location.slice(0, type) : "", location = type.lastIndexOf("\n"), type = -1 === location ? type : type.slice(location + 1), -1 !== type.indexOf(payload))) {
							payload = "\n" + type;
							break a;
						}
						payload = describeBuiltInComponentFrame(payload + (lazyComponent ? " [" + lazyComponent + "]" : ""));
					}
					return payload;
				}
			}
			switch (type) {
				case REACT_SUSPENSE_LIST_TYPE: return describeBuiltInComponentFrame("SuspenseList");
				case REACT_SUSPENSE_TYPE: return describeBuiltInComponentFrame("Suspense");
			}
			return "";
		}
		function isEligibleForOutlining(request, boundary) {
			return (500 < boundary.byteSize || !1) && null === boundary.contentPreamble;
		}
		function defaultErrorHandler(error) {
			if ("object" === typeof error && null !== error && "string" === typeof error.environmentName) {
				var JSCompiler_inline_result = error.environmentName;
				error = [error].slice(0);
				"string" === typeof error[0] ? error.splice(0, 1, "[%s] " + error[0], " " + JSCompiler_inline_result + " ") : error.splice(0, 0, "[%s]", " " + JSCompiler_inline_result + " ");
				error.unshift(console);
				JSCompiler_inline_result = bind.apply(console.error, error);
				JSCompiler_inline_result();
			} else console.error(error);
			return null;
		}
		function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
			var abortSet = /* @__PURE__ */ new Set();
			this.destination = null;
			this.flushScheduled = !1;
			this.resumableState = resumableState;
			this.renderState = renderState;
			this.rootFormatContext = rootFormatContext;
			this.progressiveChunkSize = void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
			this.status = 10;
			this.fatalError = null;
			this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
			this.completedPreambleSegments = this.completedRootSegment = null;
			this.byteSize = 0;
			this.abortableTasks = abortSet;
			this.pingedTasks = [];
			this.clientRenderedBoundaries = [];
			this.completedBoundaries = [];
			this.partialBoundaries = [];
			this.trackedPostpones = null;
			this.onError = void 0 === onError ? defaultErrorHandler : onError;
			this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
			this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
			this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
			this.onShellError = void 0 === onShellError ? noop : onShellError;
			this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
			this.formState = void 0 === formState ? null : formState;
		}
		function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
			resumableState = new RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState);
			renderState = createPendingSegment(resumableState, 0, null, rootFormatContext, !1, !1);
			renderState.parentFlushed = !0;
			children = createRenderTask(resumableState, null, children, -1, null, renderState, null, null, resumableState.abortableTasks, null, rootFormatContext, null, emptyTreeContext, null, null);
			pushComponentStack(children);
			resumableState.pingedTasks.push(children);
			return resumableState;
		}
		var currentRequest = null;
		function pingTask(request, task) {
			request.pingedTasks.push(task);
			1 === request.pingedTasks.length && (request.flushScheduled = null !== request.destination, performWork(request));
		}
		function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
			fallbackAbortableTasks = {
				status: 0,
				rootSegmentID: -1,
				parentFlushed: !1,
				pendingTasks: 0,
				row,
				completedSegments: [],
				byteSize: 0,
				fallbackAbortableTasks,
				errorDigest: null,
				contentState: createHoistableState(),
				fallbackState: createHoistableState(),
				contentPreamble,
				fallbackPreamble,
				trackedContentKeyPath: null,
				trackedFallbackNode: null
			};
			null !== row && (row.pendingTasks++, contentPreamble = row.boundaries, null !== contentPreamble && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, null !== request && hoistHoistables(fallbackAbortableTasks.contentState, request));
			return fallbackAbortableTasks;
		}
		function createRenderTask(request, thenableState, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
			request.allPendingTasks++;
			null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
			null !== row && row.pendingTasks++;
			var task = {
				replay: null,
				node,
				childIndex,
				ping: function() {
					return pingTask(request, task);
				},
				blockedBoundary,
				blockedSegment,
				blockedPreamble,
				hoistableState,
				abortSet,
				keyPath,
				formatContext,
				context,
				treeContext,
				row,
				componentStack,
				thenableState
			};
			abortSet.add(task);
			return task;
		}
		function createReplayTask(request, thenableState, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
			request.allPendingTasks++;
			null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
			null !== row && row.pendingTasks++;
			replay.pendingTasks++;
			var task = {
				replay,
				node,
				childIndex,
				ping: function() {
					return pingTask(request, task);
				},
				blockedBoundary,
				blockedSegment: null,
				blockedPreamble: null,
				hoistableState,
				abortSet,
				keyPath,
				formatContext,
				context,
				treeContext,
				row,
				componentStack,
				thenableState
			};
			abortSet.add(task);
			return task;
		}
		function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
			return {
				status: 0,
				parentFlushed: !1,
				id: -1,
				index,
				chunks: [],
				children: [],
				preambleChildren: [],
				parentFormatContext,
				boundary,
				lastPushedText,
				textEmbedded
			};
		}
		function pushComponentStack(task) {
			var node = task.node;
			if ("object" === typeof node && null !== node) switch (node.$$typeof) {
				case REACT_ELEMENT_TYPE: task.componentStack = {
					parent: task.componentStack,
					type: node.type
				};
			}
		}
		function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
			return null === componentStack ? null : {
				parent: componentStack.parent,
				type: "Suspense Fallback"
			};
		}
		function getThrownInfo(node$jscomp$0) {
			var errorInfo = {};
			node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
				configurable: !0,
				enumerable: !0,
				get: function() {
					try {
						var info = "", node = node$jscomp$0;
						do
							info += describeComponentStackByType(node.type), node = node.parent;
						while (node);
						var JSCompiler_inline_result = info;
					} catch (x) {
						JSCompiler_inline_result = "\nError generating stack: " + x.message + "\n" + x.stack;
					}
					Object.defineProperty(errorInfo, "componentStack", { value: JSCompiler_inline_result });
					return JSCompiler_inline_result;
				}
			});
			return errorInfo;
		}
		function logRecoverableError(request, error, errorInfo) {
			request = request.onError;
			error = request(error, errorInfo);
			if (null == error || "string" === typeof error) return error;
		}
		function fatalError(request, error) {
			var onShellError = request.onShellError, onFatalError = request.onFatalError;
			onShellError(error);
			onFatalError(error);
			null !== request.destination ? (request.status = 14, request.destination.destroy(error)) : (request.status = 13, request.fatalError = error);
		}
		function finishSuspenseListRow(request, row) {
			unblockSuspenseListRow(request, row.next, row.hoistables);
		}
		function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
			for (; null !== unblockedRow;) {
				null !== inheritedHoistables && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
				var unblockedBoundaries = unblockedRow.boundaries;
				if (null !== unblockedBoundaries) {
					unblockedRow.boundaries = null;
					for (var i = 0; i < unblockedBoundaries.length; i++) {
						var unblockedBoundary = unblockedBoundaries[i];
						null !== inheritedHoistables && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
						finishedTask(request, unblockedBoundary, null, null);
					}
				}
				unblockedRow.pendingTasks--;
				if (0 < unblockedRow.pendingTasks) break;
				inheritedHoistables = unblockedRow.hoistables;
				unblockedRow = unblockedRow.next;
			}
		}
		function tryToResolveTogetherRow(request, togetherRow) {
			var boundaries = togetherRow.boundaries;
			if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
				for (var allCompleteAndInlinable = !0, i = 0; i < boundaries.length; i++) {
					var rowBoundary = boundaries[i];
					if (1 !== rowBoundary.pendingTasks || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
						allCompleteAndInlinable = !1;
						break;
					}
				}
				allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
			}
		}
		function createSuspenseListRow(previousRow) {
			var newRow = {
				pendingTasks: 1,
				boundaries: null,
				hoistables: createHoistableState(),
				inheritedHoistables: null,
				together: !1,
				next: null
			};
			null !== previousRow && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
			return newRow;
		}
		function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
			var prevKeyPath = task.keyPath, prevTreeContext = task.treeContext, prevRow = task.row;
			task.keyPath = keyPath;
			keyPath = rows.length;
			var previousSuspenseListRow = null;
			if (null !== task.replay) {
				var resumeSlots = task.replay.slots;
				if (null !== resumeSlots && "object" === typeof resumeSlots) for (var n = 0; n < keyPath; n++) {
					var i = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? n : keyPath - 1 - n, node = rows[i];
					task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
					task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
					var resumeSegmentID = resumeSlots[i];
					"number" === typeof resumeSegmentID ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
					0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
				}
				else for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++) n = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
			} else if ("backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder) for (revealOrder = 0; revealOrder < keyPath; revealOrder++) resumeSlots = rows[revealOrder], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, revealOrder), renderNode(request, task, resumeSlots, revealOrder), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
			else {
				revealOrder = task.blockedSegment;
				resumeSlots = revealOrder.children.length;
				n = revealOrder.chunks.length;
				for (i = keyPath - 1; 0 <= i; i--) {
					node = rows[i];
					task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
					task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
					resumeSegmentID = createPendingSegment(request, n, null, task.formatContext, 0 === i ? revealOrder.lastPushedText : !0, !0);
					revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
					task.blockedSegment = resumeSegmentID;
					try {
						renderNode(request, task, node, i), pushSegmentFinale(resumeSegmentID.chunks, request.renderState, resumeSegmentID.lastPushedText, resumeSegmentID.textEmbedded), resumeSegmentID.status = 1, 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
					} catch (thrownValue) {
						throw resumeSegmentID.status = 12 === request.status ? 3 : 4, thrownValue;
					}
				}
				task.blockedSegment = revealOrder;
				revealOrder.lastPushedText = !1;
			}
			null !== prevRow && null !== previousSuspenseListRow && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
			task.treeContext = prevTreeContext;
			task.row = prevRow;
			task.keyPath = prevKeyPath;
		}
		function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
			var prevThenableState = task.thenableState;
			task.thenableState = null;
			currentlyRenderingComponent = {};
			currentlyRenderingTask = task;
			currentlyRenderingRequest = request;
			currentlyRenderingKeyPath = keyPath;
			actionStateCounter = localIdCounter = 0;
			actionStateMatchingIndex = -1;
			thenableIndexCounter = 0;
			thenableState = prevThenableState;
			for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate;) didScheduleRenderPhaseUpdate = !1, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
			resetHooksState();
			return request;
		}
		function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex) {
			var didEmitActionStateMarkers = !1;
			if (0 !== actionStateCount && null !== request.formState) {
				var segment = task.blockedSegment;
				if (null !== segment) {
					didEmitActionStateMarkers = !0;
					segment = segment.chunks;
					for (var i = 0; i < actionStateCount; i++) i === actionStateMatchingIndex ? segment.push("<!--F!-->") : segment.push("<!--F-->");
				}
			}
			actionStateCount = task.keyPath;
			task.keyPath = keyPath;
			hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
			task.keyPath = actionStateCount;
		}
		function renderElement(request, task, keyPath, type, props, ref) {
			if ("function" === typeof type) if (type.prototype && type.prototype.isReactComponent) {
				var newProps = props;
				if ("ref" in props) {
					newProps = {};
					for (var propName in props) "ref" !== propName && (newProps[propName] = props[propName]);
				}
				var defaultProps = type.defaultProps;
				if (defaultProps) {
					newProps === props && (newProps = assign({}, newProps, props));
					for (var propName$43 in defaultProps) void 0 === newProps[propName$43] && (newProps[propName$43] = defaultProps[propName$43]);
				}
				props = newProps;
				newProps = emptyContextObject;
				defaultProps = type.contextType;
				"object" === typeof defaultProps && null !== defaultProps && (newProps = defaultProps._currentValue2);
				newProps = new type(props, newProps);
				var initialState = void 0 !== newProps.state ? newProps.state : null;
				newProps.updater = classComponentUpdater;
				newProps.props = props;
				newProps.state = initialState;
				defaultProps = {
					queue: [],
					replace: !1
				};
				newProps._reactInternals = defaultProps;
				ref = type.contextType;
				newProps.context = "object" === typeof ref && null !== ref ? ref._currentValue2 : emptyContextObject;
				ref = type.getDerivedStateFromProps;
				"function" === typeof ref && (ref = ref(props, initialState), initialState = null === ref || void 0 === ref ? initialState : assign({}, initialState, ref), newProps.state = initialState);
				if ("function" !== typeof type.getDerivedStateFromProps && "function" !== typeof newProps.getSnapshotBeforeUpdate && ("function" === typeof newProps.UNSAFE_componentWillMount || "function" === typeof newProps.componentWillMount)) if (type = newProps.state, "function" === typeof newProps.componentWillMount && newProps.componentWillMount(), "function" === typeof newProps.UNSAFE_componentWillMount && newProps.UNSAFE_componentWillMount(), type !== newProps.state && classComponentUpdater.enqueueReplaceState(newProps, newProps.state, null), null !== defaultProps.queue && 0 < defaultProps.queue.length) if (type = defaultProps.queue, ref = defaultProps.replace, defaultProps.queue = null, defaultProps.replace = !1, ref && 1 === type.length) newProps.state = type[0];
				else {
					defaultProps = ref ? type[0] : newProps.state;
					initialState = !0;
					for (ref = ref ? 1 : 0; ref < type.length; ref++) propName$43 = type[ref], propName$43 = "function" === typeof propName$43 ? propName$43.call(newProps, defaultProps, props, void 0) : propName$43, null != propName$43 && (initialState ? (initialState = !1, defaultProps = assign({}, defaultProps, propName$43)) : assign(defaultProps, propName$43));
					newProps.state = defaultProps;
				}
				else defaultProps.queue = null;
				type = newProps.render();
				if (12 === request.status) throw null;
				props = task.keyPath;
				task.keyPath = keyPath;
				renderNodeDestructive(request, task, type, -1);
				task.keyPath = props;
			} else {
				type = renderWithHooks(request, task, keyPath, type, props, void 0);
				if (12 === request.status) throw null;
				finishFunctionComponent(request, task, keyPath, type, 0 !== localIdCounter, actionStateCounter, actionStateMatchingIndex);
			}
			else if ("string" === typeof type) if (newProps = task.blockedSegment, null === newProps) newProps = props.children, defaultProps = task.formatContext, initialState = task.keyPath, task.formatContext = getChildFormatContext(defaultProps, type, props), task.keyPath = keyPath, renderNode(request, task, newProps, -1), task.formatContext = defaultProps, task.keyPath = initialState;
			else {
				initialState = pushStartInstance(newProps.chunks, type, props, request.resumableState, request.renderState, task.blockedPreamble, task.hoistableState, task.formatContext, newProps.lastPushedText);
				newProps.lastPushedText = !1;
				defaultProps = task.formatContext;
				ref = task.keyPath;
				task.keyPath = keyPath;
				if (3 === (task.formatContext = getChildFormatContext(defaultProps, type, props)).insertionMode) {
					keyPath = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
					newProps.preambleChildren.push(keyPath);
					task.blockedSegment = keyPath;
					try {
						keyPath.status = 6, renderNode(request, task, initialState, -1), pushSegmentFinale(keyPath.chunks, request.renderState, keyPath.lastPushedText, keyPath.textEmbedded), keyPath.status = 1;
					} finally {
						task.blockedSegment = newProps;
					}
				} else renderNode(request, task, initialState, -1);
				task.formatContext = defaultProps;
				task.keyPath = ref;
				a: {
					task = newProps.chunks;
					request = request.resumableState;
					switch (type) {
						case "title":
						case "style":
						case "script":
						case "area":
						case "base":
						case "br":
						case "col":
						case "embed":
						case "hr":
						case "img":
						case "input":
						case "keygen":
						case "link":
						case "meta":
						case "param":
						case "source":
						case "track":
						case "wbr": break a;
						case "body":
							if (1 >= defaultProps.insertionMode) {
								request.hasBody = !0;
								break a;
							}
							break;
						case "html":
							if (0 === defaultProps.insertionMode) {
								request.hasHtml = !0;
								break a;
							}
							break;
						case "head": if (1 >= defaultProps.insertionMode) break a;
					}
					task.push(endChunkForTag(type));
				}
				newProps.lastPushedText = !1;
			}
			else {
				switch (type) {
					case REACT_LEGACY_HIDDEN_TYPE:
					case REACT_STRICT_MODE_TYPE:
					case REACT_PROFILER_TYPE:
					case REACT_FRAGMENT_TYPE:
						type = task.keyPath;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, props.children, -1);
						task.keyPath = type;
						return;
					case REACT_ACTIVITY_TYPE:
						type = task.blockedSegment;
						null === type ? "hidden" !== props.mode && (type = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = type) : "hidden" !== props.mode && (request.renderState.generateStaticMarkup || type.chunks.push("<!--&-->"), type.lastPushedText = !1, newProps = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = newProps, request.renderState.generateStaticMarkup || type.chunks.push("<!--/&-->"), type.lastPushedText = !1);
						return;
					case REACT_SUSPENSE_LIST_TYPE:
						a: {
							type = props.children;
							props = props.revealOrder;
							if ("forwards" === props || "backwards" === props || "unstable_legacy-backwards" === props) {
								if (isArrayImpl(type)) {
									renderSuspenseListRows(request, task, keyPath, type, props);
									break a;
								}
								if (newProps = getIteratorFn(type)) {
									if (newProps = newProps.call(type)) {
										defaultProps = newProps.next();
										if (!defaultProps.done) {
											do
												defaultProps = newProps.next();
											while (!defaultProps.done);
											renderSuspenseListRows(request, task, keyPath, type, props);
										}
										break a;
									}
								}
							}
							"together" === props ? (props = task.keyPath, newProps = task.row, defaultProps = task.row = createSuspenseListRow(null), defaultProps.boundaries = [], defaultProps.together = !0, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), 0 === --defaultProps.pendingTasks && finishSuspenseListRow(request, defaultProps), task.keyPath = props, task.row = newProps, null !== newProps && 0 < defaultProps.pendingTasks && (newProps.pendingTasks++, defaultProps.next = newProps)) : (props = task.keyPath, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), task.keyPath = props);
						}
						return;
					case REACT_VIEW_TRANSITION_TYPE:
					case REACT_SCOPE_TYPE: throw Error(formatProdErrorMessage(343));
					case REACT_SUSPENSE_TYPE:
						a: if (null !== task.replay) {
							type = task.keyPath;
							newProps = task.formatContext;
							defaultProps = task.row;
							task.keyPath = keyPath;
							task.formatContext = getSuspenseContentFormatContext(request.resumableState, newProps);
							task.row = null;
							keyPath = props.children;
							try {
								renderNode(request, task, keyPath, -1);
							} finally {
								task.keyPath = type, task.formatContext = newProps, task.row = defaultProps;
							}
						} else {
							type = task.keyPath;
							ref = task.formatContext;
							var prevRow = task.row, parentBoundary = task.blockedBoundary;
							propName$43 = task.blockedPreamble;
							var parentHoistableState = task.hoistableState;
							propName = task.blockedSegment;
							var fallback = props.fallback;
							props = props.children;
							var fallbackAbortSet = /* @__PURE__ */ new Set();
							var newBoundary = createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
							null !== request.trackedPostpones && (newBoundary.trackedContentKeyPath = keyPath);
							var boundarySegment = createPendingSegment(request, propName.chunks.length, newBoundary, task.formatContext, !1, !1);
							propName.children.push(boundarySegment);
							propName.lastPushedText = !1;
							var contentRootSegment = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
							contentRootSegment.parentFlushed = !0;
							if (null !== request.trackedPostpones) {
								newProps = task.componentStack;
								defaultProps = [
									keyPath[0],
									"Suspense Fallback",
									keyPath[2]
								];
								initialState = [
									defaultProps[1],
									defaultProps[2],
									[],
									null
								];
								request.trackedPostpones.workingMap.set(defaultProps, initialState);
								newBoundary.trackedFallbackNode = initialState;
								task.blockedSegment = boundarySegment;
								task.blockedPreamble = newBoundary.fallbackPreamble;
								task.keyPath = defaultProps;
								task.formatContext = getSuspenseFallbackFormatContext(request.resumableState, ref);
								task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
								boundarySegment.status = 6;
								try {
									renderNode(request, task, fallback, -1), pushSegmentFinale(boundarySegment.chunks, request.renderState, boundarySegment.lastPushedText, boundarySegment.textEmbedded), boundarySegment.status = 1;
								} catch (thrownValue) {
									throw boundarySegment.status = 12 === request.status ? 3 : 4, thrownValue;
								} finally {
									task.blockedSegment = propName, task.blockedPreamble = propName$43, task.keyPath = type, task.formatContext = ref;
								}
								task = createRenderTask(request, null, props, -1, newBoundary, contentRootSegment, newBoundary.contentPreamble, newBoundary.contentState, task.abortSet, keyPath, getSuspenseContentFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, null, newProps);
								pushComponentStack(task);
								request.pingedTasks.push(task);
							} else {
								task.blockedBoundary = newBoundary;
								task.blockedPreamble = newBoundary.contentPreamble;
								task.hoistableState = newBoundary.contentState;
								task.blockedSegment = contentRootSegment;
								task.keyPath = keyPath;
								task.formatContext = getSuspenseContentFormatContext(request.resumableState, ref);
								task.row = null;
								contentRootSegment.status = 6;
								try {
									if (renderNode(request, task, props, -1), pushSegmentFinale(contentRootSegment.chunks, request.renderState, contentRootSegment.lastPushedText, contentRootSegment.textEmbedded), contentRootSegment.status = 1, queueCompletedSegment(newBoundary, contentRootSegment), 0 === newBoundary.pendingTasks && 0 === newBoundary.status) {
										if (newBoundary.status = 1, !isEligibleForOutlining(request, newBoundary)) {
											null !== prevRow && 0 === --prevRow.pendingTasks && finishSuspenseListRow(request, prevRow);
											0 === request.pendingRootTasks && task.blockedPreamble && preparePreamble(request);
											break a;
										}
									} else null !== prevRow && prevRow.together && tryToResolveTogetherRow(request, prevRow);
								} catch (thrownValue$30) {
									newBoundary.status = 4, 12 === request.status ? (contentRootSegment.status = 3, newProps = request.fatalError) : (contentRootSegment.status = 4, newProps = thrownValue$30), defaultProps = getThrownInfo(task.componentStack), initialState = logRecoverableError(request, newProps, defaultProps), newBoundary.errorDigest = initialState, untrackBoundary(request, newBoundary);
								} finally {
									task.blockedBoundary = parentBoundary, task.blockedPreamble = propName$43, task.hoistableState = parentHoistableState, task.blockedSegment = propName, task.keyPath = type, task.formatContext = ref, task.row = prevRow;
								}
								task = createRenderTask(request, null, fallback, -1, parentBoundary, boundarySegment, newBoundary.fallbackPreamble, newBoundary.fallbackState, fallbackAbortSet, [
									keyPath[0],
									"Suspense Fallback",
									keyPath[2]
								], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack));
								pushComponentStack(task);
								request.pingedTasks.push(task);
							}
						}
						return;
				}
				if ("object" === typeof type && null !== type) switch (type.$$typeof) {
					case REACT_FORWARD_REF_TYPE:
						if ("ref" in props) for (fallback in newProps = {}, props) "ref" !== fallback && (newProps[fallback] = props[fallback]);
						else newProps = props;
						type = renderWithHooks(request, task, keyPath, type.render, newProps, ref);
						finishFunctionComponent(request, task, keyPath, type, 0 !== localIdCounter, actionStateCounter, actionStateMatchingIndex);
						return;
					case REACT_MEMO_TYPE:
						renderElement(request, task, keyPath, type.type, props, ref);
						return;
					case REACT_CONTEXT_TYPE:
						defaultProps = props.children;
						newProps = task.keyPath;
						props = props.value;
						initialState = type._currentValue2;
						type._currentValue2 = props;
						ref = currentActiveSnapshot;
						currentActiveSnapshot = type = {
							parent: ref,
							depth: null === ref ? 0 : ref.depth + 1,
							context: type,
							parentValue: initialState,
							value: props
						};
						task.context = type;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, defaultProps, -1);
						request = currentActiveSnapshot;
						if (null === request) throw Error(formatProdErrorMessage(403));
						request.context._currentValue2 = request.parentValue;
						request = currentActiveSnapshot = request.parent;
						task.context = request;
						task.keyPath = newProps;
						return;
					case REACT_CONSUMER_TYPE:
						props = props.children;
						type = props(type._context._currentValue2);
						props = task.keyPath;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, type, -1);
						task.keyPath = props;
						return;
					case REACT_LAZY_TYPE:
						newProps = type._init;
						type = newProps(type._payload);
						if (12 === request.status) throw null;
						renderElement(request, task, keyPath, type, props, ref);
						return;
				}
				throw Error(formatProdErrorMessage(130, null == type ? type : typeof type, ""));
			}
		}
		function resumeNode(request, task, segmentId, node, childIndex) {
			var prevReplay = task.replay, blockedBoundary = task.blockedBoundary, resumedSegment = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
			resumedSegment.id = segmentId;
			resumedSegment.parentFlushed = !0;
			try {
				task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = 1, null === blockedBoundary ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
			} finally {
				task.replay = prevReplay, task.blockedSegment = null;
			}
		}
		function renderNodeDestructive(request, task, node, childIndex) {
			null !== task.replay && "number" === typeof task.replay.slots ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, pushComponentStack(task), retryNode(request, task), task.componentStack = node);
		}
		function retryNode(request, task) {
			var node = task.node, childIndex = task.childIndex;
			if (null !== node) {
				if ("object" === typeof node) {
					switch (node.$$typeof) {
						case REACT_ELEMENT_TYPE:
							var type = node.type, key = node.key, props = node.props;
							node = props.ref;
							var ref = void 0 !== node ? node : null, name = getComponentNameFromType(type), keyOrIndex = null == key ? -1 === childIndex ? 0 : childIndex : key;
							key = [
								task.keyPath,
								name,
								keyOrIndex
							];
							if (null !== task.replay) a: {
								var replay = task.replay;
								childIndex = replay.nodes;
								for (node = 0; node < childIndex.length; node++) {
									var node$jscomp$0 = childIndex[node];
									if (keyOrIndex === node$jscomp$0[1]) {
										if (4 === node$jscomp$0.length) {
											if (null !== name && name !== node$jscomp$0[0]) throw Error(formatProdErrorMessage(490, node$jscomp$0[0], name));
											var childNodes = node$jscomp$0[2];
											name = node$jscomp$0[3];
											keyOrIndex = task.node;
											task.replay = {
												nodes: childNodes,
												slots: name,
												pendingTasks: 1
											};
											try {
												renderElement(request, task, key, type, props, ref);
												if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
												task.replay.pendingTasks--;
											} catch (x) {
												if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then)) throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(node, 1), x;
												task.replay.pendingTasks--;
												props = getThrownInfo(task.componentStack);
												key = request;
												request = task.blockedBoundary;
												type = x;
												props = logRecoverableError(key, type, props);
												abortRemainingReplayNodes(key, request, childNodes, name, type, props);
											}
											task.replay = replay;
										} else {
											if (type !== REACT_SUSPENSE_TYPE) throw Error(formatProdErrorMessage(490, "Suspense", getComponentNameFromType(type) || "Unknown"));
											b: {
												replay = void 0;
												type = node$jscomp$0[5];
												ref = node$jscomp$0[2];
												name = node$jscomp$0[3];
												keyOrIndex = null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
												node$jscomp$0 = null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
												var prevKeyPath = task.keyPath, prevContext = task.formatContext, prevRow = task.row, previousReplaySet = task.replay, parentBoundary = task.blockedBoundary, parentHoistableState = task.hoistableState, content = props.children, fallback = props.fallback, fallbackAbortSet = /* @__PURE__ */ new Set();
												props = createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
												props.parentFlushed = !0;
												props.rootSegmentID = type;
												task.blockedBoundary = props;
												task.hoistableState = props.contentState;
												task.keyPath = key;
												task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext);
												task.row = null;
												task.replay = {
													nodes: ref,
													slots: name,
													pendingTasks: 1
												};
												try {
													renderNode(request, task, content, -1);
													if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
													task.replay.pendingTasks--;
													if (0 === props.pendingTasks && 0 === props.status) {
														props.status = 1;
														request.completedBoundaries.push(props);
														break b;
													}
												} catch (error) {
													props.status = 4, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(request, error, childNodes), props.errorDigest = replay, task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
												} finally {
													task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
												}
												childNodes = createReplayTask(request, null, {
													nodes: keyOrIndex,
													slots: node$jscomp$0,
													pendingTasks: 0
												}, fallback, -1, parentBoundary, props.fallbackState, fallbackAbortSet, [
													key[0],
													"Suspense Fallback",
													key[2]
												], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack));
												pushComponentStack(childNodes);
												request.pingedTasks.push(childNodes);
											}
										}
										childIndex.splice(node, 1);
										break a;
									}
								}
							}
							else renderElement(request, task, key, type, props, ref);
							return;
						case REACT_PORTAL_TYPE: throw Error(formatProdErrorMessage(257));
						case REACT_LAZY_TYPE:
							childNodes = node._init;
							node = childNodes(node._payload);
							if (12 === request.status) throw null;
							renderNodeDestructive(request, task, node, childIndex);
							return;
					}
					if (isArrayImpl(node)) {
						renderChildrenArray(request, task, node, childIndex);
						return;
					}
					if (childNodes = getIteratorFn(node)) {
						if (childNodes = childNodes.call(node)) {
							node = childNodes.next();
							if (!node.done) {
								props = [];
								do
									props.push(node.value), node = childNodes.next();
								while (!node.done);
								renderChildrenArray(request, task, props, childIndex);
							}
							return;
						}
					}
					if ("function" === typeof node.then) return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
					if (node.$$typeof === REACT_CONTEXT_TYPE) return renderNodeDestructive(request, task, node._currentValue2, childIndex);
					childIndex = Object.prototype.toString.call(node);
					throw Error(formatProdErrorMessage(31, "[object Object]" === childIndex ? "object with keys {" + Object.keys(node).join(", ") + "}" : childIndex));
				}
				if ("string" === typeof node) childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(childIndex.chunks, node, request.renderState, childIndex.lastPushedText));
				else if ("number" === typeof node || "bigint" === typeof node) childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(childIndex.chunks, "" + node, request.renderState, childIndex.lastPushedText));
			}
		}
		function renderChildrenArray(request, task, children, childIndex) {
			var prevKeyPath = task.keyPath;
			if (-1 !== childIndex && (task.keyPath = [
				task.keyPath,
				"Fragment",
				childIndex
			], null !== task.replay)) {
				for (var replay = task.replay, replayNodes = replay.nodes, j = 0; j < replayNodes.length; j++) {
					var node = replayNodes[j];
					if (node[1] === childIndex) {
						childIndex = node[2];
						node = node[3];
						task.replay = {
							nodes: childIndex,
							slots: node,
							pendingTasks: 1
						};
						try {
							renderChildrenArray(request, task, children, -1);
							if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
							task.replay.pendingTasks--;
						} catch (x) {
							if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then)) throw x;
							task.replay.pendingTasks--;
							children = getThrownInfo(task.componentStack);
							var boundary = task.blockedBoundary, error = x;
							children = logRecoverableError(request, error, children);
							abortRemainingReplayNodes(request, boundary, childIndex, node, error, children);
						}
						task.replay = replay;
						replayNodes.splice(j, 1);
						break;
					}
				}
				task.keyPath = prevKeyPath;
				return;
			}
			replay = task.treeContext;
			replayNodes = children.length;
			if (null !== task.replay && (j = task.replay.slots, null !== j && "object" === typeof j)) {
				for (childIndex = 0; childIndex < replayNodes; childIndex++) node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), boundary = j[childIndex], "number" === typeof boundary ? (resumeNode(request, task, boundary, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
				task.treeContext = replay;
				task.keyPath = prevKeyPath;
				return;
			}
			for (j = 0; j < replayNodes; j++) childIndex = children[j], task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
			task.treeContext = replay;
			task.keyPath = prevKeyPath;
		}
		function trackPostponedBoundary(request, trackedPostpones, boundary) {
			boundary.status = 5;
			boundary.rootSegmentID = request.nextSegmentId++;
			request = boundary.trackedContentKeyPath;
			if (null === request) throw Error(formatProdErrorMessage(486));
			var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
			if (void 0 === boundaryNode) return boundary = [
				request[1],
				request[2],
				children,
				null,
				fallbackReplayNode,
				boundary.rootSegmentID
			], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
			boundaryNode[4] = fallbackReplayNode;
			boundaryNode[5] = boundary.rootSegmentID;
			return boundaryNode;
		}
		function trackPostpone(request, trackedPostpones, task, segment) {
			segment.status = 5;
			var keyPath = task.keyPath, boundary = task.blockedBoundary;
			if (null === boundary) segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, null !== request.completedRootSegment && (request.completedRootSegment.status = 5);
			else {
				if (null !== boundary && 0 === boundary.status) {
					var boundaryNode = trackPostponedBoundary(request, trackedPostpones, boundary);
					if (boundary.trackedContentKeyPath === keyPath && -1 === task.childIndex) {
						-1 === segment.id && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
						boundaryNode[3] = segment.id;
						return;
					}
				}
				-1 === segment.id && (segment.id = segment.parentFlushed && null !== boundary ? boundary.rootSegmentID : request.nextSegmentId++);
				if (-1 === task.childIndex) null === keyPath ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), void 0 === task ? (task = [
					keyPath[1],
					keyPath[2],
					[],
					segment.id
				], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
				else {
					if (null === keyPath) {
						if (request = trackedPostpones.rootSlots, null === request) request = trackedPostpones.rootSlots = {};
						else if ("number" === typeof request) throw Error(formatProdErrorMessage(491));
					} else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), void 0 === boundaryNode) request = {}, boundaryNode = [
						keyPath[1],
						keyPath[2],
						[],
						request
					], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
					else if (request = boundaryNode[3], null === request) request = boundaryNode[3] = {};
					else if ("number" === typeof request) throw Error(formatProdErrorMessage(491));
					request[task.childIndex] = segment.id;
				}
			}
		}
		function untrackBoundary(request, boundary) {
			request = request.trackedPostpones;
			null !== request && (boundary = boundary.trackedContentKeyPath, null !== boundary && (boundary = request.workingMap.get(boundary), void 0 !== boundary && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
		}
		function spawnNewSuspendedReplayTask(request, task, thenableState) {
			return createReplayTask(request, thenableState, task.replay, task.node, task.childIndex, task.blockedBoundary, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack);
		}
		function spawnNewSuspendedRenderTask(request, task, thenableState) {
			var segment = task.blockedSegment, newSegment = createPendingSegment(request, segment.chunks.length, null, task.formatContext, segment.lastPushedText, !0);
			segment.children.push(newSegment);
			segment.lastPushedText = !1;
			return createRenderTask(request, thenableState, task.node, task.childIndex, task.blockedBoundary, newSegment, task.blockedPreamble, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack);
		}
		function renderNode(request, task, node, childIndex) {
			var previousFormatContext = task.formatContext, previousContext = task.context, previousKeyPath = task.keyPath, previousTreeContext = task.treeContext, previousComponentStack = task.componentStack, segment = task.blockedSegment;
			if (null === segment) {
				segment = task.replay;
				try {
					return renderNodeDestructive(request, task, node, childIndex);
				} catch (thrownValue) {
					if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, 12 !== request.status && "object" === typeof node && null !== node) {
						if ("function" === typeof node.then) {
							childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
							request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
							node.then(request, request);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							task.replay = segment;
							switchContext(previousContext);
							return;
						}
						if ("Maximum call stack size exceeded" === node.message) {
							node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
							node = spawnNewSuspendedReplayTask(request, task, node);
							request.pingedTasks.push(node);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							task.replay = segment;
							switchContext(previousContext);
							return;
						}
					}
				}
			} else {
				var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
				try {
					return renderNodeDestructive(request, task, node, childIndex);
				} catch (thrownValue$62) {
					if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$62 === SuspenseException ? getSuspendedThenable() : thrownValue$62, 12 !== request.status && "object" === typeof node && null !== node) {
						if ("function" === typeof node.then) {
							segment = node;
							node = thrownValue$62 === SuspenseException ? getThenableStateAfterSuspending() : null;
							request = spawnNewSuspendedRenderTask(request, task, node).ping;
							segment.then(request, request);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							switchContext(previousContext);
							return;
						}
						if ("Maximum call stack size exceeded" === node.message) {
							segment = thrownValue$62 === SuspenseException ? getThenableStateAfterSuspending() : null;
							segment = spawnNewSuspendedRenderTask(request, task, segment);
							request.pingedTasks.push(segment);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							switchContext(previousContext);
							return;
						}
					}
				}
			}
			task.formatContext = previousFormatContext;
			task.context = previousContext;
			task.keyPath = previousKeyPath;
			task.treeContext = previousTreeContext;
			switchContext(previousContext);
			throw node;
		}
		function abortTaskSoft(task) {
			var boundary = task.blockedBoundary, segment = task.blockedSegment;
			null !== segment && (segment.status = 3, finishedTask(this, boundary, task.row, segment));
		}
		function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error, errorDigest$jscomp$0) {
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				if (4 === node.length) abortRemainingReplayNodes(request$jscomp$0, boundary, node[2], node[3], error, errorDigest$jscomp$0);
				else {
					node = node[5];
					var request = request$jscomp$0, errorDigest = errorDigest$jscomp$0, resumedBoundary = createSuspenseBoundary(request, null, /* @__PURE__ */ new Set(), null, null);
					resumedBoundary.parentFlushed = !0;
					resumedBoundary.rootSegmentID = node;
					resumedBoundary.status = 4;
					resumedBoundary.errorDigest = errorDigest;
					resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
				}
			}
			nodes.length = 0;
			if (null !== slots) {
				if (null === boundary) throw Error(formatProdErrorMessage(487));
				4 !== boundary.status && (boundary.status = 4, boundary.errorDigest = errorDigest$jscomp$0, boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
				if ("object" === typeof slots) for (var index in slots) delete slots[index];
			}
		}
		function abortTask(task, request, error) {
			var boundary = task.blockedBoundary, segment = task.blockedSegment;
			if (null !== segment) {
				if (6 === segment.status) return;
				segment.status = 3;
			}
			var errorInfo = getThrownInfo(task.componentStack);
			if (null === boundary) {
				if (13 !== request.status && 14 !== request.status) {
					boundary = task.replay;
					if (null === boundary) {
						null !== request.trackedPostpones && null !== segment ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo), fatalError(request, error));
						return;
					}
					boundary.pendingTasks--;
					0 === boundary.pendingTasks && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo), abortRemainingReplayNodes(request, null, boundary.nodes, boundary.slots, error, segment));
					request.pendingRootTasks--;
					0 === request.pendingRootTasks && completeShell(request);
				}
			} else {
				var trackedPostpones$63 = request.trackedPostpones;
				if (4 !== boundary.status) {
					if (null !== trackedPostpones$63 && null !== segment) return logRecoverableError(request, error, errorInfo), trackPostpone(request, trackedPostpones$63, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
						return abortTask(fallbackTask, request, error);
					}), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
					boundary.status = 4;
					segment = logRecoverableError(request, error, errorInfo);
					boundary.status = 4;
					boundary.errorDigest = segment;
					untrackBoundary(request, boundary);
					boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
				}
				boundary.pendingTasks--;
				segment = boundary.row;
				null !== segment && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
				boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
					return abortTask(fallbackTask, request, error);
				});
				boundary.fallbackAbortableTasks.clear();
			}
			task = task.row;
			null !== task && 0 === --task.pendingTasks && finishSuspenseListRow(request, task);
			request.allPendingTasks--;
			0 === request.allPendingTasks && completeAll(request);
		}
		function safelyEmitEarlyPreloads(request, shellComplete) {
			try {
				var renderState = request.renderState, onHeaders = renderState.onHeaders;
				if (onHeaders) {
					var headers = renderState.headers;
					if (headers) {
						renderState.headers = null;
						var linkHeader = headers.preconnects;
						headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
						headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
						if (!shellComplete) {
							var queueIter = renderState.styles.values(), queueStep = queueIter.next();
							b: for (; 0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next()) for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next(); 0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
								var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props, header = getPreloadAsHeader(props$jscomp$0.href, "style", {
									crossOrigin: props$jscomp$0.crossOrigin,
									integrity: props$jscomp$0.integrity,
									nonce: props$jscomp$0.nonce,
									type: props$jscomp$0.type,
									fetchPriority: props$jscomp$0.fetchPriority,
									referrerPolicy: props$jscomp$0.referrerPolicy,
									media: props$jscomp$0.media
								});
								if (0 <= (headers.remainingCapacity -= header.length + 2)) renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = "string" === typeof props.crossOrigin || "string" === typeof props.integrity ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
								else break b;
							}
						}
						linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
					}
				}
			} catch (error) {
				logRecoverableError(request, error, {});
			}
		}
		function completeShell(request) {
			null === request.trackedPostpones && safelyEmitEarlyPreloads(request, !0);
			null === request.trackedPostpones && preparePreamble(request);
			request.onShellError = noop;
			request = request.onShellReady;
			request();
		}
		function completeAll(request) {
			safelyEmitEarlyPreloads(request, null === request.trackedPostpones ? !0 : null === request.completedRootSegment || 5 !== request.completedRootSegment.status);
			preparePreamble(request);
			request = request.onAllReady;
			request();
		}
		function queueCompletedSegment(boundary, segment) {
			if (0 === segment.chunks.length && 1 === segment.children.length && null === segment.children[0].boundary && -1 === segment.children[0].id) {
				var childSegment = segment.children[0];
				childSegment.id = segment.id;
				childSegment.parentFlushed = !0;
				1 !== childSegment.status && 3 !== childSegment.status && 4 !== childSegment.status || queueCompletedSegment(boundary, childSegment);
			} else boundary.completedSegments.push(segment);
		}
		function finishedTask(request, boundary, row, segment) {
			null !== row && (0 === --row.pendingTasks ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
			request.allPendingTasks--;
			if (null === boundary) {
				if (null !== segment && segment.parentFlushed) {
					if (null !== request.completedRootSegment) throw Error(formatProdErrorMessage(389));
					request.completedRootSegment = segment;
				}
				request.pendingRootTasks--;
				0 === request.pendingRootTasks && completeShell(request);
			} else if (boundary.pendingTasks--, 4 !== boundary.status) if (0 === boundary.pendingTasks) {
				if (0 === boundary.status && (boundary.status = 1), null !== segment && segment.parentFlushed && (1 === segment.status || 3 === segment.status) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), 1 === boundary.status) row = boundary.row, null !== row && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row)), 0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary.contentPreamble && preparePreamble(request);
				else if (5 === boundary.status && (boundary = boundary.row, null !== boundary)) {
					if (null !== request.trackedPostpones) {
						row = request.trackedPostpones;
						var postponedRow = boundary.next;
						if (null !== postponedRow && (segment = postponedRow.boundaries, null !== segment)) for (postponedRow.boundaries = null, postponedRow = 0; postponedRow < segment.length; postponedRow++) {
							var postponedBoundary = segment[postponedRow];
							trackPostponedBoundary(request, row, postponedBoundary);
							finishedTask(request, postponedBoundary, null, null);
						}
					}
					0 === --boundary.pendingTasks && finishSuspenseListRow(request, boundary);
				}
			} else null === segment || !segment.parentFlushed || 1 !== segment.status && 3 !== segment.status || (queueCompletedSegment(boundary, segment), 1 === boundary.completedSegments.length && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, null !== boundary && boundary.together && tryToResolveTogetherRow(request, boundary);
			0 === request.allPendingTasks && completeAll(request);
		}
		function performWork(request$jscomp$2) {
			if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
				var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
				ReactSharedInternals.H = HooksDispatcher;
				var prevAsyncDispatcher = ReactSharedInternals.A;
				ReactSharedInternals.A = DefaultAsyncDispatcher;
				var prevRequest = currentRequest;
				currentRequest = request$jscomp$2;
				var prevResumableState = currentResumableState;
				currentResumableState = request$jscomp$2.resumableState;
				try {
					var pingedTasks = request$jscomp$2.pingedTasks, i;
					for (i = 0; i < pingedTasks.length; i++) {
						var task = pingedTasks[i], request = request$jscomp$2, segment = task.blockedSegment;
						if (null === segment) {
							var request$jscomp$0 = request;
							if (0 !== task.replay.pendingTasks) {
								switchContext(task.context);
								try {
									"number" === typeof task.replay.slots ? resumeNode(request$jscomp$0, task, task.replay.slots, task.node, task.childIndex) : retryNode(request$jscomp$0, task);
									if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
									task.replay.pendingTasks--;
									task.abortSet.delete(task);
									finishedTask(request$jscomp$0, task.blockedBoundary, task.row, null);
								} catch (thrownValue) {
									resetHooksState();
									var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
									if ("object" === typeof x && null !== x && "function" === typeof x.then) {
										var ping = task.ping;
										x.then(ping, ping);
										task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
									} else {
										task.replay.pendingTasks--;
										task.abortSet.delete(task);
										var errorInfo = getThrownInfo(task.componentStack);
										request = void 0;
										var request$jscomp$1 = request$jscomp$0, boundary = task.blockedBoundary, error$jscomp$0 = 12 === request$jscomp$0.status ? request$jscomp$0.fatalError : x, replayNodes = task.replay.nodes, resumeSlots = task.replay.slots;
										request = logRecoverableError(request$jscomp$1, error$jscomp$0, errorInfo);
										abortRemainingReplayNodes(request$jscomp$1, boundary, replayNodes, resumeSlots, error$jscomp$0, request);
										request$jscomp$0.pendingRootTasks--;
										0 === request$jscomp$0.pendingRootTasks && completeShell(request$jscomp$0);
										request$jscomp$0.allPendingTasks--;
										0 === request$jscomp$0.allPendingTasks && completeAll(request$jscomp$0);
									}
								}
							}
						} else if (request$jscomp$0 = void 0, request$jscomp$1 = segment, 0 === request$jscomp$1.status) {
							request$jscomp$1.status = 6;
							switchContext(task.context);
							var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
							try {
								retryNode(request, task), pushSegmentFinale(request$jscomp$1.chunks, request.renderState, request$jscomp$1.lastPushedText, request$jscomp$1.textEmbedded), task.abortSet.delete(task), request$jscomp$1.status = 1, finishedTask(request, task.blockedBoundary, task.row, request$jscomp$1);
							} catch (thrownValue) {
								resetHooksState();
								request$jscomp$1.children.length = childrenLength;
								request$jscomp$1.chunks.length = chunkLength;
								var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : 12 === request.status ? request.fatalError : thrownValue;
								if (12 === request.status && null !== request.trackedPostpones) {
									var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(task.componentStack);
									task.abortSet.delete(task);
									logRecoverableError(request, x$jscomp$0, thrownInfo);
									trackPostpone(request, trackedPostpones, task, request$jscomp$1);
									finishedTask(request, task.blockedBoundary, task.row, request$jscomp$1);
								} else if ("object" === typeof x$jscomp$0 && null !== x$jscomp$0 && "function" === typeof x$jscomp$0.then) {
									request$jscomp$1.status = 0;
									task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
									var ping$jscomp$0 = task.ping;
									x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
								} else {
									var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
									task.abortSet.delete(task);
									request$jscomp$1.status = 4;
									var boundary$jscomp$0 = task.blockedBoundary, row = task.row;
									null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
									request.allPendingTasks--;
									request$jscomp$0 = logRecoverableError(request, x$jscomp$0, errorInfo$jscomp$0);
									if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
									else if (boundary$jscomp$0.pendingTasks--, 4 !== boundary$jscomp$0.status) {
										boundary$jscomp$0.status = 4;
										boundary$jscomp$0.errorDigest = request$jscomp$0;
										untrackBoundary(request, boundary$jscomp$0);
										var boundaryRow = boundary$jscomp$0.row;
										null !== boundaryRow && 0 === --boundaryRow.pendingTasks && finishSuspenseListRow(request, boundaryRow);
										boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
										0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary$jscomp$0.contentPreamble && preparePreamble(request);
									}
									0 === request.allPendingTasks && completeAll(request);
								}
							}
						}
					}
					pingedTasks.splice(0, i);
					null !== request$jscomp$2.destination && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
				} catch (error) {
					logRecoverableError(request$jscomp$2, error, {}), fatalError(request$jscomp$2, error);
				} finally {
					currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
				}
			}
		}
		function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
			segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
			for (var pendingPreambles = !1, i = 0; i < segment.children.length; i++) pendingPreambles = preparePreambleFromSegment(request, segment.children[i], collectedPreambleSegments) || pendingPreambles;
			return pendingPreambles;
		}
		function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
			var boundary = segment.boundary;
			if (null === boundary) return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
			var preamble = boundary.contentPreamble, fallbackPreamble = boundary.fallbackPreamble;
			if (null === preamble || null === fallbackPreamble) return !1;
			switch (boundary.status) {
				case 1:
					hoistPreambleState(request.renderState, preamble);
					request.byteSize += boundary.byteSize;
					segment = boundary.completedSegments[0];
					if (!segment) throw Error(formatProdErrorMessage(391));
					return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
				case 5: if (null !== request.trackedPostpones) return !0;
				case 4: if (1 === segment.status) return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
				default: return !0;
			}
		}
		function preparePreamble(request) {
			if (request.completedRootSegment && null === request.completedPreambleSegments) {
				var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(request, request.completedRootSegment, collectedPreambleSegments), preamble = request.renderState.preamble;
				!1 === hasPendingPreambles || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
			}
		}
		function flushSubtree(request, destination, segment, hoistableState) {
			segment.parentFlushed = !0;
			switch (segment.status) {
				case 0: segment.id = request.nextSegmentId++;
				case 5: return hoistableState = segment.id, segment.lastPushedText = !1, segment.textEmbedded = !1, request = request.renderState, destination.push("<template id=\""), destination.push(request.placeholderPrefix), request = hoistableState.toString(16), destination.push(request), destination.push("\"></template>");
				case 1:
					segment.status = 2;
					var r = !0, chunks = segment.chunks, chunkIdx = 0;
					segment = segment.children;
					for (var childIdx = 0; childIdx < segment.length; childIdx++) {
						for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++) destination.push(chunks[chunkIdx]);
						r = flushSegment(request, destination, r, hoistableState);
					}
					for (; chunkIdx < chunks.length - 1; chunkIdx++) destination.push(chunks[chunkIdx]);
					chunkIdx < chunks.length && (r = destination.push(chunks[chunkIdx]));
					return r;
				case 3: return !0;
				default: throw Error(formatProdErrorMessage(390));
			}
		}
		var flushedByteSize = 0;
		function flushSegment(request, destination, segment, hoistableState) {
			var boundary = segment.boundary;
			if (null === boundary) return flushSubtree(request, destination, segment, hoistableState);
			boundary.parentFlushed = !0;
			if (4 === boundary.status) {
				var row = boundary.row;
				null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
				request.renderState.generateStaticMarkup || (boundary = boundary.errorDigest, destination.push("<!--$!-->"), destination.push("<template"), boundary && (destination.push(" data-dgst=\""), boundary = escapeTextForBrowser(boundary), destination.push(boundary), destination.push("\"")), destination.push("></template>"));
				flushSubtree(request, destination, segment, hoistableState);
				request = request.renderState.generateStaticMarkup ? !0 : destination.push("<!--/$-->");
				return request;
			}
			if (1 !== boundary.status) return 0 === boundary.status && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState), destination.push("<!--/$-->");
			if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && flushedByteSize + boundary.byteSize > request.progressiveChunkSize) return boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), flushSubtree(request, destination, segment, hoistableState), destination.push("<!--/$-->");
			flushedByteSize += boundary.byteSize;
			hoistableState && hoistHoistables(hoistableState, boundary.contentState);
			segment = boundary.row;
			null !== segment && isEligibleForOutlining(request, boundary) && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
			request.renderState.generateStaticMarkup || destination.push("<!--$-->");
			segment = boundary.completedSegments;
			if (1 !== segment.length) throw Error(formatProdErrorMessage(391));
			flushSegment(request, destination, segment[0], hoistableState);
			request = request.renderState.generateStaticMarkup ? !0 : destination.push("<!--/$-->");
			return request;
		}
		function flushSegmentContainer(request, destination, segment, hoistableState) {
			writeStartSegment(destination, request.renderState, segment.parentFormatContext, segment.id);
			flushSegment(request, destination, segment, hoistableState);
			return writeEndSegment(destination, segment.parentFormatContext);
		}
		function flushCompletedBoundary(request, destination, boundary) {
			flushedByteSize = boundary.byteSize;
			for (var completedSegments = boundary.completedSegments, i = 0; i < completedSegments.length; i++) flushPartiallyCompletedSegment(request, destination, boundary, completedSegments[i]);
			completedSegments.length = 0;
			completedSegments = boundary.row;
			null !== completedSegments && isEligibleForOutlining(request, boundary) && 0 === --completedSegments.pendingTasks && finishSuspenseListRow(request, completedSegments);
			writeHoistablesForBoundary(destination, boundary.contentState, request.renderState);
			completedSegments = request.resumableState;
			request = request.renderState;
			i = boundary.rootSegmentID;
			boundary = boundary.contentState;
			var requiresStyleInsertion = request.stylesToHoist;
			request.stylesToHoist = !1;
			destination.push(request.startInlineScript);
			destination.push(">");
			requiresStyleInsertion ? (0 === (completedSegments.instructions & 4) && (completedSegments.instructions |= 4, destination.push("$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};")), 0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, destination.push("$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if(\"/$\"===d||\"/&\"===d)if(0===h)break;else h--;else\"$\"!==d&&\"$?\"!==d&&\"$~\"!==d&&\"$!\"!==d&&\"&\"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data=\"$\";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data=\"$~\",$RB.push(a,b),2===$RB.length&&(\"number\"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};")), 0 === (completedSegments.instructions & 8) ? (completedSegments.instructions |= 8, destination.push("$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll(\"link[data-precedence],style[data-precedence]\"),v=[],k=0;b=e[k++];)\"not all\"===b.getAttribute(\"media\")?v.push(b):(\"LINK\"===b.tagName&&$RM.set(b.getAttribute(\"href\"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement(\"link\");a.href=d;a.rel=\n\"stylesheet\";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute(\"media\");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute(\"data-precedence\");a.removeAttribute(\"media\")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n\"$~\";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,\"CSS failed to load\"))};$RR(\"")) : destination.push("$RR(\"")) : (0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, destination.push("$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if(\"/$\"===d||\"/&\"===d)if(0===h)break;else h--;else\"$\"!==d&&\"$?\"!==d&&\"$~\"!==d&&\"$!\"!==d&&\"&\"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data=\"$\";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data=\"$~\",$RB.push(a,b),2===$RB.length&&(\"number\"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};")), destination.push("$RC(\""));
			completedSegments = i.toString(16);
			destination.push(request.boundaryPrefix);
			destination.push(completedSegments);
			destination.push("\",\"");
			destination.push(request.segmentPrefix);
			destination.push(completedSegments);
			requiresStyleInsertion ? (destination.push("\","), writeStyleResourceDependenciesInJS(destination, boundary)) : destination.push("\"");
			boundary = destination.push(")<\/script>");
			return writeBootstrap(destination, request) && boundary;
		}
		function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
			if (2 === segment.status) return !0;
			var hoistableState = boundary.contentState, segmentID = segment.id;
			if (-1 === segmentID) {
				if (-1 === (segment.id = boundary.rootSegmentID)) throw Error(formatProdErrorMessage(392));
				return flushSegmentContainer(request, destination, segment, hoistableState);
			}
			if (segmentID === boundary.rootSegmentID) return flushSegmentContainer(request, destination, segment, hoistableState);
			flushSegmentContainer(request, destination, segment, hoistableState);
			boundary = request.resumableState;
			request = request.renderState;
			destination.push(request.startInlineScript);
			destination.push(">");
			0 === (boundary.instructions & 1) ? (boundary.instructions |= 1, destination.push("$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS(\"")) : destination.push("$RS(\"");
			destination.push(request.segmentPrefix);
			segmentID = segmentID.toString(16);
			destination.push(segmentID);
			destination.push("\",\"");
			destination.push(request.placeholderPrefix);
			destination.push(segmentID);
			destination = destination.push("\")<\/script>");
			return destination;
		}
		var flushingPartialBoundaries = !1;
		function flushCompletedQueues(request, destination) {
			try {
				if (!(0 < request.pendingRootTasks)) {
					var i, completedRootSegment = request.completedRootSegment;
					if (null !== completedRootSegment) {
						if (5 === completedRootSegment.status) return;
						var completedPreambleSegments = request.completedPreambleSegments;
						if (null === completedPreambleSegments) return;
						flushedByteSize = request.byteSize;
						var resumableState = request.resumableState, renderState = request.renderState, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
						if (htmlChunks) {
							for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++) destination.push(htmlChunks[i$jscomp$0]);
							if (headChunks) for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++) destination.push(headChunks[i$jscomp$0]);
							else {
								var chunk = startChunkForTag("head");
								destination.push(chunk);
								destination.push(">");
							}
						} else if (headChunks) for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++) destination.push(headChunks[i$jscomp$0]);
						var charsetChunks = renderState.charsetChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++) destination.push(charsetChunks[i$jscomp$0]);
						charsetChunks.length = 0;
						renderState.preconnects.forEach(flushResource, destination);
						renderState.preconnects.clear();
						var viewportChunks = renderState.viewportChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++) destination.push(viewportChunks[i$jscomp$0]);
						viewportChunks.length = 0;
						renderState.fontPreloads.forEach(flushResource, destination);
						renderState.fontPreloads.clear();
						renderState.highImagePreloads.forEach(flushResource, destination);
						renderState.highImagePreloads.clear();
						currentlyFlushingRenderState = renderState;
						renderState.styles.forEach(flushStylesInPreamble, destination);
						currentlyFlushingRenderState = null;
						var importMapChunks = renderState.importMapChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++) destination.push(importMapChunks[i$jscomp$0]);
						importMapChunks.length = 0;
						renderState.bootstrapScripts.forEach(flushResource, destination);
						renderState.scripts.forEach(flushResource, destination);
						renderState.scripts.clear();
						renderState.bulkPreloads.forEach(flushResource, destination);
						renderState.bulkPreloads.clear();
						resumableState.instructions |= 32;
						var hoistableChunks = renderState.hoistableChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++) destination.push(hoistableChunks[i$jscomp$0]);
						for (resumableState = hoistableChunks.length = 0; resumableState < completedPreambleSegments.length; resumableState++) {
							var segments = completedPreambleSegments[resumableState];
							for (renderState = 0; renderState < segments.length; renderState++) flushSegment(request, destination, segments[renderState], null);
						}
						var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
						if (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) {
							var chunk$jscomp$0 = endChunkForTag("head");
							destination.push(chunk$jscomp$0);
						}
						var bodyChunks = preamble$jscomp$0.bodyChunks;
						if (bodyChunks) for (completedPreambleSegments = 0; completedPreambleSegments < bodyChunks.length; completedPreambleSegments++) destination.push(bodyChunks[completedPreambleSegments]);
						flushSegment(request, destination, completedRootSegment, null);
						request.completedRootSegment = null;
						var renderState$jscomp$0 = request.renderState;
						if (0 !== request.allPendingTasks || 0 !== request.clientRenderedBoundaries.length || 0 !== request.completedBoundaries.length || null !== request.trackedPostpones && (0 !== request.trackedPostpones.rootNodes.length || null !== request.trackedPostpones.rootSlots)) {
							var resumableState$jscomp$0 = request.resumableState;
							if (0 === (resumableState$jscomp$0.instructions & 64)) {
								resumableState$jscomp$0.instructions |= 64;
								destination.push(renderState$jscomp$0.startInlineScript);
								if (0 === (resumableState$jscomp$0.instructions & 32)) {
									resumableState$jscomp$0.instructions |= 32;
									var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
									destination.push(" id=\"");
									var chunk$jscomp$1 = escapeTextForBrowser(shellId);
									destination.push(chunk$jscomp$1);
									destination.push("\"");
								}
								destination.push(">");
								destination.push("requestAnimationFrame(function(){$RT=performance.now()});");
								destination.push("<\/script>");
							}
						}
						writeBootstrap(destination, renderState$jscomp$0);
					}
					var renderState$jscomp$1 = request.renderState;
					completedRootSegment = 0;
					var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
					for (completedRootSegment = 0; completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++) destination.push(viewportChunks$jscomp$0[completedRootSegment]);
					viewportChunks$jscomp$0.length = 0;
					renderState$jscomp$1.preconnects.forEach(flushResource, destination);
					renderState$jscomp$1.preconnects.clear();
					renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
					renderState$jscomp$1.fontPreloads.clear();
					renderState$jscomp$1.highImagePreloads.forEach(flushResource, destination);
					renderState$jscomp$1.highImagePreloads.clear();
					renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
					renderState$jscomp$1.scripts.forEach(flushResource, destination);
					renderState$jscomp$1.scripts.clear();
					renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
					renderState$jscomp$1.bulkPreloads.clear();
					var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
					for (completedRootSegment = 0; completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++) destination.push(hoistableChunks$jscomp$0[completedRootSegment]);
					hoistableChunks$jscomp$0.length = 0;
					var clientRenderedBoundaries = request.clientRenderedBoundaries;
					for (i = 0; i < clientRenderedBoundaries.length; i++) {
						var boundary = clientRenderedBoundaries[i];
						renderState$jscomp$1 = destination;
						var resumableState$jscomp$1 = request.resumableState, renderState$jscomp$2 = request.renderState, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest;
						renderState$jscomp$1.push(renderState$jscomp$2.startInlineScript);
						renderState$jscomp$1.push(">");
						0 === (resumableState$jscomp$1.instructions & 4) ? (resumableState$jscomp$1.instructions |= 4, renderState$jscomp$1.push("$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX(\"")) : renderState$jscomp$1.push("$RX(\"");
						renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
						var chunk$jscomp$2 = id.toString(16);
						renderState$jscomp$1.push(chunk$jscomp$2);
						renderState$jscomp$1.push("\"");
						if (errorDigest) {
							renderState$jscomp$1.push(",");
							var chunk$jscomp$3 = escapeJSStringsForInstructionScripts(errorDigest || "");
							renderState$jscomp$1.push(chunk$jscomp$3);
						}
						var JSCompiler_inline_result = renderState$jscomp$1.push(")<\/script>");
						if (!JSCompiler_inline_result) {
							request.destination = null;
							i++;
							clientRenderedBoundaries.splice(0, i);
							return;
						}
					}
					clientRenderedBoundaries.splice(0, i);
					var completedBoundaries = request.completedBoundaries;
					for (i = 0; i < completedBoundaries.length; i++) if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
						request.destination = null;
						i++;
						completedBoundaries.splice(0, i);
						return;
					}
					completedBoundaries.splice(0, i);
					flushingPartialBoundaries = !0;
					var partialBoundaries = request.partialBoundaries;
					for (i = 0; i < partialBoundaries.length; i++) {
						var boundary$69 = partialBoundaries[i];
						a: {
							clientRenderedBoundaries = request;
							boundary = destination;
							flushedByteSize = boundary$69.byteSize;
							var completedSegments = boundary$69.completedSegments;
							for (JSCompiler_inline_result = 0; JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++) if (!flushPartiallyCompletedSegment(clientRenderedBoundaries, boundary, boundary$69, completedSegments[JSCompiler_inline_result])) {
								JSCompiler_inline_result++;
								completedSegments.splice(0, JSCompiler_inline_result);
								var JSCompiler_inline_result$jscomp$0 = !1;
								break a;
							}
							completedSegments.splice(0, JSCompiler_inline_result);
							var row = boundary$69.row;
							null !== row && row.together && 1 === boundary$69.pendingTasks && (1 === row.pendingTasks ? unblockSuspenseListRow(clientRenderedBoundaries, row, row.hoistables) : row.pendingTasks--);
							JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(boundary, boundary$69.contentState, clientRenderedBoundaries.renderState);
						}
						if (!JSCompiler_inline_result$jscomp$0) {
							request.destination = null;
							i++;
							partialBoundaries.splice(0, i);
							return;
						}
					}
					partialBoundaries.splice(0, i);
					flushingPartialBoundaries = !1;
					var largeBoundaries = request.completedBoundaries;
					for (i = 0; i < largeBoundaries.length; i++) if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
						request.destination = null;
						i++;
						largeBoundaries.splice(0, i);
						return;
					}
					largeBoundaries.splice(0, i);
				}
			} finally {
				flushingPartialBoundaries = !1, 0 === request.allPendingTasks && 0 === request.clientRenderedBoundaries.length && 0 === request.completedBoundaries.length && (request.flushScheduled = !1, i = request.resumableState, i.hasBody && (partialBoundaries = endChunkForTag("body"), destination.push(partialBoundaries)), i.hasHtml && (i = endChunkForTag("html"), destination.push(i)), request.status = 14, destination.push(null), request.destination = null);
			}
		}
		function enqueueFlush(request) {
			if (!1 === request.flushScheduled && 0 === request.pingedTasks.length && null !== request.destination) {
				request.flushScheduled = !0;
				var destination = request.destination;
				destination ? flushCompletedQueues(request, destination) : request.flushScheduled = !1;
			}
		}
		function startFlowing(request, destination) {
			if (13 === request.status) request.status = 14, destination.destroy(request.fatalError);
			else if (14 !== request.status && null === request.destination) {
				request.destination = destination;
				try {
					flushCompletedQueues(request, destination);
				} catch (error) {
					logRecoverableError(request, error, {}), fatalError(request, error);
				}
			}
		}
		function abort(request, reason) {
			if (11 === request.status || 10 === request.status) request.status = 12;
			try {
				var abortableTasks = request.abortableTasks;
				if (0 < abortableTasks.size) {
					var error = void 0 === reason ? Error(formatProdErrorMessage(432)) : "object" === typeof reason && null !== reason && "function" === typeof reason.then ? Error(formatProdErrorMessage(530)) : reason;
					request.fatalError = error;
					abortableTasks.forEach(function(task) {
						return abortTask(task, request, error);
					});
					abortableTasks.clear();
				}
				null !== request.destination && flushCompletedQueues(request, request.destination);
			} catch (error$71) {
				logRecoverableError(request, error$71, {}), fatalError(request, error$71);
			}
		}
		function addToReplayParent(node, parentKeyPath, trackedPostpones) {
			if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
			else {
				var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
				void 0 === parentNode && (parentNode = [
					parentKeyPath[1],
					parentKeyPath[2],
					[],
					null
				], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
				parentNode[2].push(node);
			}
		}
		function onError() {}
		function renderToStringImpl(children, options, generateStaticMarkup, abortReason) {
			var didFatal = !1, fatalError = null, result = "", readyToStream = !1;
			options = createResumableState(options ? options.identifierPrefix : void 0);
			children = createRequest(children, options, createRenderState(options, generateStaticMarkup), createFormatContext(0, null, 0, null), Infinity, onError, void 0, function() {
				readyToStream = !0;
			}, void 0, void 0, void 0);
			children.flushScheduled = null !== children.destination;
			performWork(children);
			10 === children.status && (children.status = 11);
			null === children.trackedPostpones && safelyEmitEarlyPreloads(children, 0 === children.pendingRootTasks);
			abort(children, abortReason);
			startFlowing(children, {
				push: function(chunk) {
					null !== chunk && (result += chunk);
					return !0;
				},
				destroy: function(error) {
					didFatal = !0;
					fatalError = error;
				}
			});
			if (didFatal && fatalError !== abortReason) throw fatalError;
			if (!readyToStream) throw Error(formatProdErrorMessage(426));
			return result;
		}
		exports.renderToStaticMarkup = function(children, options) {
			return renderToStringImpl(children, options, !0, "The server used \"renderToStaticMarkup\" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to \"renderToReadableStream\" which supports Suspense on the server");
		};
		exports.renderToString = function(children, options) {
			return renderToStringImpl(children, options, !1, "The server used \"renderToString\" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to \"renderToReadableStream\" which supports Suspense on the server");
		};
		exports.version = "19.2.8";
	}));
	//#endregion
	//#region ../../node_modules/.bun/web-streams-polyfill@4.3.0/node_modules/web-streams-polyfill/dist/ponyfill.js
	var require_ponyfill = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		/**
		* @license
		* web-streams-polyfill v4.3.0
		* Copyright 2026 Mattias Buelens, Diwank Singh Tomer and other contributors.
		* This code is released under the MIT license.
		* SPDX-License-Identifier: MIT
		*/
		(function(e, t) {
			"object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd ? define(["exports"], t) : t((e = "undefined" != typeof globalThis ? globalThis : e || self).WebStreamsPolyfill = {});
		})(exports, function(e) {
			"use strict";
			function t() {}
			function r(e) {
				return "object" == typeof e && null !== e || "function" == typeof e;
			}
			const o = t;
			function n(e, t) {
				try {
					Object.defineProperty(e, "name", {
						value: t,
						configurable: !0
					});
				} catch (e) {}
			}
			const i = Promise, a = Promise.resolve.bind(i), s = Promise.prototype.then, l = Promise.reject.bind(i), u = a;
			function c(e) {
				return new i(e);
			}
			function d(e) {
				return c((t) => t(e));
			}
			function f(e) {
				return l(e);
			}
			function b(e, t, r) {
				return s.call(e, t, r);
			}
			function h(e, t, r) {
				b(b(e, t, r), void 0, o);
			}
			function _(e, t) {
				h(e, t);
			}
			function m(e, t) {
				h(e, void 0, t);
			}
			function p(e, t, r) {
				return b(e, t, r);
			}
			function y(e) {
				b(e, void 0, o);
			}
			let S = (e) => {
				if ("function" == typeof queueMicrotask) S = queueMicrotask;
				else {
					const e = d(void 0);
					S = (t) => b(e, t);
				}
				return S(e);
			};
			function g(e, t, r) {
				if ("function" != typeof e) throw new TypeError("Argument is not a function");
				return Function.prototype.apply.call(e, t, r);
			}
			function v(e, t, r) {
				try {
					return d(g(e, t, r));
				} catch (e) {
					return f(e);
				}
			}
			class w {
				constructor() {
					this._cursor = 0, this._size = 0, this._front = {
						_elements: [],
						_next: void 0
					}, this._back = this._front, this._cursor = 0, this._size = 0;
				}
				get length() {
					return this._size;
				}
				push(e) {
					const t = this._back;
					let r = t;
					16383 === t._elements.length && (r = {
						_elements: [],
						_next: void 0
					}), t._elements.push(e), r !== t && (this._back = r, t._next = r), ++this._size;
				}
				shift() {
					const e = this._front;
					let t = e;
					const r = this._cursor;
					let o = r + 1;
					const n = e._elements, i = n[r];
					return 16384 === o && (t = e._next, o = 0), --this._size, this._cursor = o, e !== t && (this._front = t), n[r] = void 0, i;
				}
				forEach(e) {
					let t = this._cursor, r = this._front, o = r._elements;
					for (; !(t === o.length && void 0 === r._next || t === o.length && (r = r._next, o = r._elements, t = 0, 0 === o.length));) e(o[t]), ++t;
				}
				peek() {
					const e = this._front, t = this._cursor;
					return e._elements[t];
				}
			}
			const R = Symbol("[[AbortSteps]]"), T = Symbol("[[ErrorSteps]]"), P = Symbol("[[CancelSteps]]"), C = Symbol("[[PullSteps]]"), q = Symbol("[[CanPullSyncSteps]]"), E = Symbol("[[ReleaseSteps]]");
			function W(e, t) {
				e._ownerReadableStream = t, t._reader = e, "readable" === t._state ? k(e) : "closed" === t._state ? function(e) {
					k(e), D(e);
				}(e) : A(e, t._storedError);
			}
			function B(e, t) {
				return Yr(e._ownerReadableStream, t);
			}
			function O(e) {
				const t = e._ownerReadableStream;
				"readable" === t._state ? z(e, /* @__PURE__ */ new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")) : function(e, t) {
					A(e, t);
				}(e, /* @__PURE__ */ new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")), t._readableStreamController[E](), t._reader = void 0, e._ownerReadableStream = void 0;
			}
			function j(e) {
				return /* @__PURE__ */ new TypeError("Cannot " + e + " a stream using a released reader");
			}
			function k(e) {
				e._closedPromise = c((t, r) => {
					e._closedPromise_resolve = t, e._closedPromise_reject = r;
				});
			}
			function A(e, t) {
				k(e), z(e, t);
			}
			function z(e, t) {
				void 0 !== e._closedPromise_reject && (y(e._closedPromise), e._closedPromise_reject(t), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0);
			}
			function D(e) {
				void 0 !== e._closedPromise_resolve && (e._closedPromise_resolve(void 0), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0);
			}
			const F = Number.isFinite || function(e) {
				return "number" == typeof e && isFinite(e);
			}, L = Math.trunc || function(e) {
				return e < 0 ? Math.ceil(e) : Math.floor(e);
			};
			function I(e, t) {
				if (void 0 !== e && "object" != typeof (r = e) && "function" != typeof r) throw new TypeError(`${t} is not an object.`);
				var r;
			}
			function $(e, t) {
				if ("function" != typeof e) throw new TypeError(`${t} is not a function.`);
			}
			function M(e, t) {
				if (!function(e) {
					return "object" == typeof e && null !== e || "function" == typeof e;
				}(e)) throw new TypeError(`${t} is not an object.`);
			}
			function Y(e, t, r) {
				if (void 0 === e) throw new TypeError(`Parameter ${t} is required in '${r}'.`);
			}
			function x(e, t, r) {
				if (void 0 === e) throw new TypeError(`${t} is required in '${r}'.`);
			}
			function Q(e) {
				return Number(e);
			}
			function N(e) {
				return 0 === e ? 0 : e;
			}
			function H(e, t) {
				const r = Number.MAX_SAFE_INTEGER;
				let o = Number(e);
				if (o = N(o), !F(o)) throw new TypeError(`${t} is not a finite number`);
				if (o = function(e) {
					return N(L(e));
				}(o), o < 0 || o > r) throw new TypeError(`${t} is outside the accepted range of 0 to ${r}, inclusive`);
				return F(o) && 0 !== o ? o : 0;
			}
			function V(e, t) {
				if (!$r(e)) throw new TypeError(`${t} is not a ReadableStream.`);
			}
			function U(e) {
				return new ReadableStreamDefaultReader(e);
			}
			function G(e, t) {
				e._reader._readRequests.push(t);
			}
			function X(e, t, r) {
				const o = e._reader._readRequests.shift();
				r ? o._closeSteps() : o._chunkSteps(t);
			}
			function J(e) {
				return e._reader._readRequests.length;
			}
			function K(e) {
				const t = e._reader;
				return void 0 !== t && !!te(t);
			}
			class ReadableStreamDefaultReader {
				constructor(e) {
					if (Y(e, 1, "ReadableStreamDefaultReader"), V(e, "First parameter"), Mr(e)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
					W(this, e), this._readRequests = new w();
				}
				get closed() {
					return te(this) ? this._closedPromise : f(ie("closed"));
				}
				cancel(e = void 0) {
					return te(this) ? void 0 === this._ownerReadableStream ? f(j("cancel")) : B(this, e) : f(ie("cancel"));
				}
				read() {
					if (!te(this)) return f(ie("read"));
					if (void 0 === this._ownerReadableStream) return f(j("read from"));
					const e = oe(this) ? new ee() : new Z();
					return re(this, e), e._promise;
				}
				releaseLock() {
					if (!te(this)) throw ie("releaseLock");
					void 0 !== this._ownerReadableStream && function(e) {
						O(e);
						ne(e, /* @__PURE__ */ new TypeError("Reader was released"));
					}(this);
				}
			}
			Object.defineProperties(ReadableStreamDefaultReader.prototype, {
				cancel: { enumerable: !0 },
				read: { enumerable: !0 },
				releaseLock: { enumerable: !0 },
				closed: { enumerable: !0 }
			}), n(ReadableStreamDefaultReader.prototype.cancel, "cancel"), n(ReadableStreamDefaultReader.prototype.read, "read"), n(ReadableStreamDefaultReader.prototype.releaseLock, "releaseLock"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamDefaultReader.prototype, Symbol.toStringTag, {
				value: "ReadableStreamDefaultReader",
				configurable: !0
			});
			class Z {
				constructor() {
					this._promise = c((e, t) => {
						this._resolvePromise = e, this._rejectPromise = t;
					});
				}
				_chunkSteps(e) {
					this._resolvePromise({
						value: e,
						done: !1
					});
				}
				_closeSteps() {
					this._resolvePromise({
						value: void 0,
						done: !0
					});
				}
				_errorSteps(e) {
					this._rejectPromise(e);
				}
			}
			class ee {
				constructor() {
					this._promise = void 0;
				}
				_chunkSteps(e) {
					this._promise = u({
						value: e,
						done: !1
					});
				}
				_closeSteps() {
					this._promise = u({
						value: void 0,
						done: !0
					});
				}
				_errorSteps(e) {
					this._promise = f(e);
				}
			}
			function te(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_readRequests") && e instanceof ReadableStreamDefaultReader;
			}
			function re(e, t) {
				const r = e._ownerReadableStream;
				r._disturbed = !0, "closed" === r._state ? t._closeSteps() : "errored" === r._state ? t._errorSteps(r._storedError) : r._readableStreamController[C](t);
			}
			function oe(e) {
				const t = e._ownerReadableStream;
				return "closed" === t._state || "errored" === t._state || t._readableStreamController[q]();
			}
			function ne(e, t) {
				const r = e._readRequests;
				e._readRequests = new w(), r.forEach((e) => {
					e._errorSteps(t);
				});
			}
			function ie(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStreamDefaultReader.prototype.${e} can only be used on a ReadableStreamDefaultReader`);
			}
			var ae, se, le;
			function ue(e) {
				return e.slice();
			}
			function ce(e, t, r, o, n) {
				new Uint8Array(e).set(new Uint8Array(r, o, n), t);
			}
			let de = (e) => (de = "function" == typeof e.transfer ? (e) => e.transfer() : "function" == typeof structuredClone ? (e) => structuredClone(e, { transfer: [e] }) : (e) => e, de(e)), fe = (e) => (fe = "boolean" == typeof e.detached ? (e) => e.detached : (e) => 0 === e.byteLength, fe(e));
			function be(e, t, r) {
				if (e.slice) return e.slice(t, r);
				const o = r - t, n = new ArrayBuffer(o);
				return ce(n, 0, e, t, o), n;
			}
			function he(e, t) {
				const r = e[t];
				if (null != r) {
					if ("function" != typeof r) throw new TypeError(`${String(t)} is not a function`);
					return r;
				}
			}
			function _e(e) {
				try {
					const t = e.done, r = e.value;
					return b(u(r), (e) => ({
						done: t,
						value: e
					}));
				} catch (e) {
					return f(e);
				}
			}
			const me = null !== (le = null !== (ae = Symbol.asyncIterator) && void 0 !== ae ? ae : null === (se = Symbol.for) || void 0 === se ? void 0 : se.call(Symbol, "Symbol.asyncIterator")) && void 0 !== le ? le : "@@asyncIterator";
			function pe(e, t = "sync", o) {
				if (void 0 === o) if ("async" === t) {
					if (void 0 === (o = he(e, me))) return function(e) {
						const t = {
							next() {
								let t;
								try {
									t = ye(e);
								} catch (e) {
									return f(e);
								}
								return _e(t);
							},
							return(t) {
								let o;
								try {
									const r = he(e.iterator, "return");
									if (void 0 === r) return d({
										done: !0,
										value: t
									});
									o = g(r, e.iterator, [t]);
								} catch (e) {
									return f(e);
								}
								return r(o) ? _e(o) : f(/* @__PURE__ */ new TypeError("The iterator.return() method must return an object"));
							}
						};
						return {
							iterator: t,
							nextMethod: t.next,
							done: !1
						};
					}(pe(e, "sync", he(e, Symbol.iterator)));
				} else o = he(e, Symbol.iterator);
				if (void 0 === o) throw new TypeError("The object is not iterable");
				const n = g(o, e, []);
				if (!r(n)) throw new TypeError("The iterator method must return an object");
				return {
					iterator: n,
					nextMethod: n.next,
					done: !1
				};
			}
			function ye(e) {
				const t = g(e.nextMethod, e.iterator, []);
				if (!r(t)) throw new TypeError("The iterator.next() method must return an object");
				return t;
			}
			class Se {
				constructor(e, t) {
					this._ongoingPromise = void 0, this._isFinished = !1, this._reader = e, this._preventCancel = t;
				}
				next() {
					const e = () => this._nextSteps();
					return this._ongoingPromise = this._ongoingPromise ? p(this._ongoingPromise, e, e) : e(), this._ongoingPromise;
				}
				return(e) {
					const t = () => this._returnSteps(e);
					return this._ongoingPromise = this._ongoingPromise ? p(this._ongoingPromise, t, t) : t(), this._ongoingPromise;
				}
				_nextSteps() {
					if (this._isFinished) return Promise.resolve({
						value: void 0,
						done: !0
					});
					const e = this._reader, t = new ge(this);
					return re(e, t), t._promise;
				}
				_returnSteps(e) {
					if (this._isFinished) return Promise.resolve({
						value: e,
						done: !0
					});
					this._isFinished = !0;
					const t = this._reader;
					if (!this._preventCancel) {
						const r = B(t, e);
						return O(t), p(r, () => ({
							value: e,
							done: !0
						}));
					}
					return O(t), d({
						value: e,
						done: !0
					});
				}
			}
			class ge {
				constructor(e) {
					this._iterator = e, this._promise = c((e, t) => {
						this._resolvePromise = e, this._rejectPromise = t;
					});
				}
				_chunkSteps(e) {
					this._iterator._ongoingPromise = void 0, S(() => this._resolvePromise({
						value: e,
						done: !1
					}));
				}
				_closeSteps() {
					const e = this._iterator;
					e._ongoingPromise = void 0, e._isFinished = !0, O(e._reader), this._resolvePromise({
						value: void 0,
						done: !0
					});
				}
				_errorSteps(e) {
					const t = this._iterator;
					t._ongoingPromise = void 0, t._isFinished = !0, O(t._reader), this._rejectPromise(e);
				}
			}
			const ve = {
				next() {
					return we(this) ? this._asyncIteratorImpl.next() : f(Re("next"));
				},
				return(e) {
					return we(this) ? this._asyncIteratorImpl.return(e) : f(Re("return"));
				},
				[me]() {
					return this;
				}
			};
			function we(e) {
				if (!r(e)) return !1;
				if (!Object.prototype.hasOwnProperty.call(e, "_asyncIteratorImpl")) return !1;
				try {
					return e._asyncIteratorImpl instanceof Se;
				} catch (e) {
					return !1;
				}
			}
			function Re(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStreamAsyncIterator.${e} can only be used on a ReadableSteamAsyncIterator`);
			}
			Object.defineProperty(ve, me, { enumerable: !1 });
			const Te = Number.isNaN || function(e) {
				return e != e;
			};
			function Pe(e) {
				const t = be(e.buffer, e.byteOffset, e.byteOffset + e.byteLength);
				return new Uint8Array(t);
			}
			function Ce(e) {
				const t = e._queue.shift();
				return e._queueTotalSize -= t.size, e._queueTotalSize < 0 && (e._queueTotalSize = 0), t.value;
			}
			function qe(e, t, r) {
				if ("number" != typeof (o = r) || Te(o) || o < 0 || r === Infinity) throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
				var o;
				e._queue.push({
					value: t,
					size: r
				}), e._queueTotalSize += r;
			}
			function Ee(e) {
				e._queue = new w(), e._queueTotalSize = 0;
			}
			function We(e) {
				return e === DataView;
			}
			function Be(e) {
				return We(e) ? 1 : e.BYTES_PER_ELEMENT;
			}
			class ReadableStreamBYOBRequest {
				constructor() {
					throw new TypeError("Illegal constructor");
				}
				get view() {
					if (!je(this)) throw nt("view");
					return this._view;
				}
				respond(e) {
					if (!je(this)) throw nt("respond");
					if (Y(e, 1, "respond"), e = H(e, "First parameter"), void 0 === this._associatedReadableByteStreamController) throw new TypeError("This BYOB request has been invalidated");
					if (fe(this._view.buffer)) throw new TypeError("The BYOB request's buffer has been detached and so cannot be used as a response");
					tt(this._associatedReadableByteStreamController, e);
				}
				respondWithNewView(e) {
					if (!je(this)) throw nt("respondWithNewView");
					if (Y(e, 1, "respondWithNewView"), !ArrayBuffer.isView(e)) throw new TypeError("You can only respond with array buffer views");
					if (void 0 === this._associatedReadableByteStreamController) throw new TypeError("This BYOB request has been invalidated");
					if (fe(e.buffer)) throw new TypeError("The given view's buffer has been detached and so cannot be used as a response");
					rt(this._associatedReadableByteStreamController, e);
				}
			}
			Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
				respond: { enumerable: !0 },
				respondWithNewView: { enumerable: !0 },
				view: { enumerable: !0 }
			}), n(ReadableStreamBYOBRequest.prototype.respond, "respond"), n(ReadableStreamBYOBRequest.prototype.respondWithNewView, "respondWithNewView"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamBYOBRequest.prototype, Symbol.toStringTag, {
				value: "ReadableStreamBYOBRequest",
				configurable: !0
			});
			class ReadableByteStreamController {
				constructor() {
					throw new TypeError("Illegal constructor");
				}
				get byobRequest() {
					if (!Oe(this)) throw it("byobRequest");
					return Ze(this);
				}
				get desiredSize() {
					if (!Oe(this)) throw it("desiredSize");
					return et(this);
				}
				close() {
					if (!Oe(this)) throw it("close");
					if (this._closeRequested) throw new TypeError("The stream has already been closed; do not close it again!");
					const e = this._controlledReadableByteStream._state;
					if ("readable" !== e) throw new TypeError(`The stream (in ${e} state) is not in the readable state and cannot be closed`);
					Ge(this);
				}
				enqueue(e) {
					if (!Oe(this)) throw it("enqueue");
					if (Y(e, 1, "enqueue"), !ArrayBuffer.isView(e)) throw new TypeError("chunk must be an array buffer view");
					if (0 === e.byteLength) throw new TypeError("chunk must have non-zero byteLength");
					if (0 === e.buffer.byteLength) throw new TypeError("chunk's buffer must have non-zero byteLength");
					if (this._closeRequested) throw new TypeError("stream is closed or draining");
					const t = this._controlledReadableByteStream._state;
					if ("readable" !== t) throw new TypeError(`The stream (in ${t} state) is not in the readable state and cannot be enqueued to`);
					Xe(this, e);
				}
				error(e = void 0) {
					if (!Oe(this)) throw it("error");
					Je(this, e);
				}
				[P](e) {
					Ae(this), Ee(this);
					const t = this._cancelAlgorithm(e);
					return Ue(this), t;
				}
				[C](e) {
					const t = this._controlledReadableByteStream;
					if (this._queueTotalSize > 0) return void Ke(this, e);
					const r = this._autoAllocateChunkSize;
					if (void 0 !== r) {
						let t;
						try {
							t = new ArrayBuffer(r);
						} catch (t) {
							e._errorSteps(t);
							return;
						}
						const o = {
							buffer: t,
							bufferByteLength: r,
							byteOffset: 0,
							byteLength: r,
							bytesFilled: 0,
							minimumFill: 1,
							elementSize: 1,
							viewConstructor: Uint8Array,
							readerType: "default"
						};
						this._pendingPullIntos.push(o);
					}
					G(t, e), ke(this);
				}
				[q]() {
					return this._queueTotalSize > 0;
				}
				[E]() {
					if (this._pendingPullIntos.length > 0) {
						const e = this._pendingPullIntos.peek();
						e.readerType = "none", this._pendingPullIntos = new w(), this._pendingPullIntos.push(e);
					}
				}
			}
			function Oe(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_controlledReadableByteStream") && e instanceof ReadableByteStreamController;
			}
			function je(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_associatedReadableByteStreamController") && e instanceof ReadableStreamBYOBRequest;
			}
			function ke(e) {
				if (!function(e) {
					const t = e._controlledReadableByteStream;
					if ("readable" !== t._state) return !1;
					if (e._closeRequested) return !1;
					if (!e._started) return !1;
					if (K(t) && J(t) > 0) return !0;
					if (ct(t) && ut(t) > 0) return !0;
					if (et(e) > 0) return !0;
					return !1;
				}(e)) return;
				if (e._pulling) return void (e._pullAgain = !0);
				e._pulling = !0;
				h(e._pullAlgorithm(), () => (e._pulling = !1, e._pullAgain && (e._pullAgain = !1, ke(e)), null), (t) => (Je(e, t), null));
			}
			function Ae(e) {
				Qe(e), e._pendingPullIntos = new w();
			}
			function ze(e, t) {
				let r = !1;
				"closed" === e._state && (r = !0);
				const o = Fe(t);
				"default" === t.readerType ? X(e, o, r) : function(e, t, r) {
					const n = e._reader._readIntoRequests.shift();
					r ? n._closeSteps(t) : n._chunkSteps(t);
				}(e, o, r);
			}
			function De(e, t) {
				for (let r = 0; r < t.length; ++r) ze(e, t[r]);
			}
			function Fe(e) {
				const t = e.bytesFilled, r = e.elementSize;
				return new e.viewConstructor(e.buffer, e.byteOffset, t / r);
			}
			function Le(e, t, r, o) {
				e._queue.push({
					buffer: t,
					byteOffset: r,
					byteLength: o
				}), e._queueTotalSize += o;
			}
			function Ie(e, t, r, o) {
				let n;
				try {
					n = be(t, r, r + o);
				} catch (t) {
					throw Je(e, t), t;
				}
				Le(e, n, 0, o);
			}
			function $e(e, t) {
				t.bytesFilled > 0 && Ie(e, t.buffer, t.byteOffset, t.bytesFilled), Ve(e);
			}
			function Me(e, t) {
				const r = Math.min(e._queueTotalSize, t.byteLength - t.bytesFilled), o = t.bytesFilled + r;
				let n = r, i = !1;
				const a = o - o % t.elementSize;
				a >= t.minimumFill && (n = a - t.bytesFilled, i = !0);
				const s = e._queue;
				for (; n > 0;) {
					const r = s.peek(), o = Math.min(n, r.byteLength), i = t.byteOffset + t.bytesFilled;
					ce(t.buffer, i, r.buffer, r.byteOffset, o), r.byteLength === o ? s.shift() : (r.byteOffset += o, r.byteLength -= o), e._queueTotalSize -= o, Ye(e, o, t), n -= o;
				}
				return i;
			}
			function Ye(e, t, r) {
				r.bytesFilled += t;
			}
			function xe(e) {
				0 === e._queueTotalSize && e._closeRequested ? (Ue(e), xr(e._controlledReadableByteStream)) : ke(e);
			}
			function Qe(e) {
				null !== e._byobRequest && (e._byobRequest._associatedReadableByteStreamController = void 0, e._byobRequest._view = null, e._byobRequest = null);
			}
			function Ne(e) {
				const t = [];
				for (; e._pendingPullIntos.length > 0 && 0 !== e._queueTotalSize;) {
					const r = e._pendingPullIntos.peek();
					Me(e, r) && (Ve(e), t.push(r));
				}
				return t;
			}
			function He(e, t) {
				const r = e._pendingPullIntos.peek();
				Qe(e);
				"closed" === e._controlledReadableByteStream._state ? function(e, t) {
					"none" === t.readerType && Ve(e);
					const r = e._controlledReadableByteStream;
					if (ct(r)) {
						const t = [];
						for (; t.length < ut(r);) t.push(Ve(e));
						De(r, t);
					}
				}(e, r) : function(e, t, r) {
					if (Ye(0, t, r), "none" === r.readerType) {
						$e(e, r);
						const t = Ne(e);
						De(e._controlledReadableByteStream, t);
						return;
					}
					if (r.bytesFilled < r.minimumFill) return;
					Ve(e);
					const o = r.bytesFilled % r.elementSize;
					if (o > 0) {
						const t = r.byteOffset + r.bytesFilled;
						Ie(e, r.buffer, t - o, o);
					}
					r.bytesFilled -= o;
					const n = Ne(e);
					ze(e._controlledReadableByteStream, r), De(e._controlledReadableByteStream, n);
				}(e, t, r), ke(e);
			}
			function Ve(e) {
				return e._pendingPullIntos.shift();
			}
			function Ue(e) {
				e._pullAlgorithm = void 0, e._cancelAlgorithm = void 0;
			}
			function Ge(e) {
				const t = e._controlledReadableByteStream;
				if (!e._closeRequested && "readable" === t._state) if (e._queueTotalSize > 0) e._closeRequested = !0;
				else {
					if (e._pendingPullIntos.length > 0) {
						const t = e._pendingPullIntos.peek();
						if (t.bytesFilled % t.elementSize !== 0) {
							const t = /* @__PURE__ */ new TypeError("Insufficient bytes to fill elements in the given buffer");
							throw Je(e, t), t;
						}
					}
					Ue(e), xr(t);
				}
			}
			function Xe(e, t) {
				const r = e._controlledReadableByteStream;
				if (e._closeRequested || "readable" !== r._state) return;
				const { buffer: o, byteOffset: n, byteLength: i } = t;
				if (fe(o)) throw new TypeError("chunk's buffer is detached and so cannot be enqueued");
				const a = de(o);
				if (e._pendingPullIntos.length > 0) {
					const t = e._pendingPullIntos.peek();
					if (fe(t.buffer)) throw new TypeError("The BYOB request's buffer has been detached and so cannot be filled with an enqueued chunk");
					Qe(e), t.buffer = de(t.buffer), "none" === t.readerType && $e(e, t);
				}
				if (K(r)) if (function(e) {
					const t = e._controlledReadableByteStream._reader;
					for (; t._readRequests.length > 0;) {
						if (0 === e._queueTotalSize) return;
						Ke(e, t._readRequests.shift());
					}
				}(e), 0 === J(r)) Le(e, a, n, i);
				else {
					e._pendingPullIntos.length > 0 && Ve(e);
					X(r, new Uint8Array(a, n, i), !1);
				}
				else if (ct(r)) {
					Le(e, a, n, i);
					De(r, Ne(e));
				} else Le(e, a, n, i);
				ke(e);
			}
			function Je(e, t) {
				const r = e._controlledReadableByteStream;
				"readable" === r._state && (Ae(e), Ee(e), Ue(e), Qr(r, t));
			}
			function Ke(e, t) {
				const r = e._queue.shift();
				e._queueTotalSize -= r.byteLength, xe(e);
				const o = new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
				t._chunkSteps(o);
			}
			function Ze(e) {
				if (null === e._byobRequest && e._pendingPullIntos.length > 0) {
					const t = e._pendingPullIntos.peek(), r = new Uint8Array(t.buffer, t.byteOffset + t.bytesFilled, t.byteLength - t.bytesFilled), o = Object.create(ReadableStreamBYOBRequest.prototype);
					(function(e, t, r) {
						e._associatedReadableByteStreamController = t, e._view = r;
					})(o, e, r), e._byobRequest = o;
				}
				return e._byobRequest;
			}
			function et(e) {
				const t = e._controlledReadableByteStream._state;
				return "errored" === t ? null : "closed" === t ? 0 : e._strategyHWM - e._queueTotalSize;
			}
			function tt(e, t) {
				const r = e._pendingPullIntos.peek();
				if ("closed" === e._controlledReadableByteStream._state) {
					if (0 !== t) throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
				} else {
					if (0 === t) throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
					if (r.bytesFilled + t > r.byteLength) throw new RangeError("bytesWritten out of range");
				}
				r.buffer = de(r.buffer), He(e, t);
			}
			function rt(e, t) {
				const r = e._pendingPullIntos.peek();
				if ("closed" === e._controlledReadableByteStream._state) {
					if (0 !== t.byteLength) throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
				} else if (0 === t.byteLength) throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
				if (r.byteOffset + r.bytesFilled !== t.byteOffset) throw new RangeError("The region specified by view does not match byobRequest");
				if (r.bufferByteLength !== t.buffer.byteLength) throw new RangeError("The buffer of view has different capacity than byobRequest");
				if (r.bytesFilled + t.byteLength > r.byteLength) throw new RangeError("The region specified by view is larger than byobRequest");
				const o = t.byteLength;
				r.buffer = de(t.buffer), He(e, o);
			}
			function ot(e, t, r, o, n, i, a) {
				t._controlledReadableByteStream = e, t._pullAgain = !1, t._pulling = !1, t._byobRequest = null, t._queue = t._queueTotalSize = void 0, Ee(t), t._closeRequested = !1, t._started = !1, t._strategyHWM = i, t._pullAlgorithm = o, t._cancelAlgorithm = n, t._autoAllocateChunkSize = a, t._pendingPullIntos = new w(), e._readableStreamController = t;
				h(d(r()), () => (t._started = !0, ke(t), null), (e) => (Je(t, e), null));
			}
			function nt(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStreamBYOBRequest.prototype.${e} can only be used on a ReadableStreamBYOBRequest`);
			}
			function it(e) {
				return /* @__PURE__ */ new TypeError(`ReadableByteStreamController.prototype.${e} can only be used on a ReadableByteStreamController`);
			}
			function at(e, t) {
				if ("byob" !== (e = `${e}`)) throw new TypeError(`${t} '${e}' is not a valid enumeration value for ReadableStreamReaderMode`);
				return e;
			}
			function st(e) {
				return new ReadableStreamBYOBReader(e);
			}
			function lt(e, t) {
				e._reader._readIntoRequests.push(t);
			}
			function ut(e) {
				return e._reader._readIntoRequests.length;
			}
			function ct(e) {
				const t = e._reader;
				return void 0 !== t && !!bt(t);
			}
			Object.defineProperties(ReadableByteStreamController.prototype, {
				close: { enumerable: !0 },
				enqueue: { enumerable: !0 },
				error: { enumerable: !0 },
				byobRequest: { enumerable: !0 },
				desiredSize: { enumerable: !0 }
			}), n(ReadableByteStreamController.prototype.close, "close"), n(ReadableByteStreamController.prototype.enqueue, "enqueue"), n(ReadableByteStreamController.prototype.error, "error"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableByteStreamController.prototype, Symbol.toStringTag, {
				value: "ReadableByteStreamController",
				configurable: !0
			});
			class ReadableStreamBYOBReader {
				constructor(e) {
					if (Y(e, 1, "ReadableStreamBYOBReader"), V(e, "First parameter"), Mr(e)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
					if (!Oe(e._readableStreamController)) throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
					W(this, e), this._readIntoRequests = new w();
				}
				get closed() {
					return bt(this) ? this._closedPromise : f(mt("closed"));
				}
				cancel(e = void 0) {
					return bt(this) ? void 0 === this._ownerReadableStream ? f(j("cancel")) : B(this, e) : f(mt("cancel"));
				}
				read(e, t = {}) {
					if (!bt(this)) return f(mt("read"));
					if (!ArrayBuffer.isView(e)) return f(/* @__PURE__ */ new TypeError("view must be an array buffer view"));
					if (0 === e.byteLength) return f(/* @__PURE__ */ new TypeError("view must have non-zero byteLength"));
					if (0 === e.buffer.byteLength) return f(/* @__PURE__ */ new TypeError("view's buffer must have non-zero byteLength"));
					if (fe(e.buffer)) return f(/* @__PURE__ */ new TypeError("view's buffer has been detached"));
					let r;
					try {
						r = function(e, t) {
							var r;
							return I(e, t), { min: H(null !== (r = null == e ? void 0 : e.min) && void 0 !== r ? r : 1, `${t} has member 'min' that`) };
						}(t, "options");
					} catch (e) {
						return f(e);
					}
					const o = r.min;
					if (0 === o) return f(/* @__PURE__ */ new TypeError("options.min must be greater than 0"));
					if (function(e) {
						return We(e.constructor);
					}(e)) {
						if (o > e.byteLength) return f(/* @__PURE__ */ new RangeError("options.min must be less than or equal to view's byteLength"));
					} else if (o > e.length) return f(/* @__PURE__ */ new RangeError("options.min must be less than or equal to view's length"));
					if (void 0 === this._ownerReadableStream) return f(j("read from"));
					const n = function(e, t, r) {
						const o = e._ownerReadableStream;
						return "errored" === o._state || function(e, t, r) {
							const o = e._controlledReadableByteStream, n = Be(t.constructor), { byteLength: i } = t, a = r * n;
							return !(e._pendingPullIntos.length > 0) && ("closed" === o._state || e._queueTotalSize >= a);
						}(o._readableStreamController, t, r);
					}(this, e, o) ? new ft() : new dt();
					return ht(this, e, o, n), n._promise;
				}
				releaseLock() {
					if (!bt(this)) throw mt("releaseLock");
					void 0 !== this._ownerReadableStream && function(e) {
						O(e);
						_t(e, /* @__PURE__ */ new TypeError("Reader was released"));
					}(this);
				}
			}
			Object.defineProperties(ReadableStreamBYOBReader.prototype, {
				cancel: { enumerable: !0 },
				read: { enumerable: !0 },
				releaseLock: { enumerable: !0 },
				closed: { enumerable: !0 }
			}), n(ReadableStreamBYOBReader.prototype.cancel, "cancel"), n(ReadableStreamBYOBReader.prototype.read, "read"), n(ReadableStreamBYOBReader.prototype.releaseLock, "releaseLock"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamBYOBReader.prototype, Symbol.toStringTag, {
				value: "ReadableStreamBYOBReader",
				configurable: !0
			});
			class dt {
				constructor() {
					this._promise = c((e, t) => {
						this._resolvePromise = e, this._rejectPromise = t;
					});
				}
				_chunkSteps(e) {
					this._resolvePromise({
						value: e,
						done: !1
					});
				}
				_closeSteps(e) {
					this._resolvePromise({
						value: e,
						done: !0
					});
				}
				_errorSteps(e) {
					this._rejectPromise(e);
				}
			}
			class ft {
				constructor() {
					this._promise = void 0;
				}
				_chunkSteps(e) {
					this._promise = u({
						value: e,
						done: !1
					});
				}
				_closeSteps(e) {
					this._promise = u({
						value: e,
						done: !0
					});
				}
				_errorSteps(e) {
					this._promise = f(e);
				}
			}
			function bt(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_readIntoRequests") && e instanceof ReadableStreamBYOBReader;
			}
			function ht(e, t, r, o) {
				const n = e._ownerReadableStream;
				n._disturbed = !0, "errored" === n._state ? o._errorSteps(n._storedError) : function(e, t, r, o) {
					const n = e._controlledReadableByteStream, i = t.constructor, a = Be(i), { byteOffset: s, byteLength: l } = t, u = r * a;
					let c;
					try {
						c = de(t.buffer);
					} catch (e) {
						o._errorSteps(e);
						return;
					}
					const d = {
						buffer: c,
						bufferByteLength: c.byteLength,
						byteOffset: s,
						byteLength: l,
						bytesFilled: 0,
						minimumFill: u,
						elementSize: a,
						viewConstructor: i,
						readerType: "byob"
					};
					if (e._pendingPullIntos.length > 0) return e._pendingPullIntos.push(d), void lt(n, o);
					if ("closed" === n._state) {
						const e = new i(d.buffer, d.byteOffset, 0);
						o._closeSteps(e);
						return;
					}
					if (e._queueTotalSize > 0) {
						if (Me(e, d)) {
							const t = Fe(d);
							xe(e), o._chunkSteps(t);
							return;
						}
						if (e._closeRequested) {
							const t = /* @__PURE__ */ new TypeError("Insufficient bytes to fill elements in the given buffer");
							Je(e, t), o._errorSteps(t);
							return;
						}
					}
					e._pendingPullIntos.push(d), lt(n, o), ke(e);
				}(n._readableStreamController, t, r, o);
			}
			function _t(e, t) {
				const r = e._readIntoRequests;
				e._readIntoRequests = new w(), r.forEach((e) => {
					e._errorSteps(t);
				});
			}
			function mt(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStreamBYOBReader.prototype.${e} can only be used on a ReadableStreamBYOBReader`);
			}
			function pt(e, t) {
				const { highWaterMark: r } = e;
				if (void 0 === r) return t;
				if (Te(r) || r < 0) throw new RangeError("Invalid highWaterMark");
				return r;
			}
			function yt(e) {
				const { size: t } = e;
				return t || (() => 1);
			}
			function St(e, t) {
				I(e, t);
				const r = null == e ? void 0 : e.highWaterMark, o = null == e ? void 0 : e.size;
				return {
					highWaterMark: void 0 === r ? void 0 : Q(r),
					size: void 0 === o ? void 0 : gt(o, `${t} has member 'size' that`)
				};
			}
			function gt(e, t) {
				return $(e, t), (t) => Q(e(t));
			}
			function vt(e, t, r) {
				return $(e, r), (r) => v(e, t, [r]);
			}
			function wt(e, t, r) {
				return $(e, r), () => v(e, t, []);
			}
			function Rt(e, t, r) {
				return $(e, r), (r) => g(e, t, [r]);
			}
			function Tt(e, t, r) {
				return $(e, r), (r, o) => v(e, t, [r, o]);
			}
			function Pt(e, t) {
				if (!Et(e)) throw new TypeError(`${t} is not a WritableStream.`);
			}
			class WritableStream {
				constructor(e = {}, t = {}) {
					void 0 === e ? e = null : M(e, "First parameter");
					const r = St(t, "Second parameter"), o = function(e, t) {
						I(e, t);
						const r = null == e ? void 0 : e.abort, o = null == e ? void 0 : e.close, n = null == e ? void 0 : e.start, i = null == e ? void 0 : e.type, a = null == e ? void 0 : e.write;
						return {
							abort: void 0 === r ? void 0 : vt(r, e, `${t} has member 'abort' that`),
							close: void 0 === o ? void 0 : wt(o, e, `${t} has member 'close' that`),
							start: void 0 === n ? void 0 : Rt(n, e, `${t} has member 'start' that`),
							write: void 0 === a ? void 0 : Tt(a, e, `${t} has member 'write' that`),
							type: i
						};
					}(e, "First parameter");
					qt(this);
					if (void 0 !== o.type) throw new RangeError("Invalid type is specified");
					const n = yt(r);
					(function(e, t, r, o) {
						const n = Object.create(WritableStreamDefaultController.prototype);
						let i, a, s, l;
						i = void 0 !== t.start ? () => t.start(n) : () => {};
						a = void 0 !== t.write ? (e) => t.write(e, n) : () => d(void 0);
						s = void 0 !== t.close ? () => t.close() : () => d(void 0);
						l = void 0 !== t.abort ? (e) => t.abort(e) : () => d(void 0);
						Ht(e, n, i, a, s, l, r, o);
					})(this, o, pt(r, 1), n);
				}
				get locked() {
					if (!Et(this)) throw Zt("locked");
					return Wt(this);
				}
				abort(e = void 0) {
					return Et(this) ? Wt(this) ? f(/* @__PURE__ */ new TypeError("Cannot abort a stream that already has a writer")) : Bt(this, e) : f(Zt("abort"));
				}
				close() {
					return Et(this) ? Wt(this) ? f(/* @__PURE__ */ new TypeError("Cannot close a stream that already has a writer")) : zt(this) ? f(/* @__PURE__ */ new TypeError("Cannot close an already-closing stream")) : Ot(this) : f(Zt("close"));
				}
				getWriter() {
					if (!Et(this)) throw Zt("getWriter");
					return Ct(this);
				}
			}
			function Ct(e) {
				return new WritableStreamDefaultWriter(e);
			}
			function qt(e) {
				e._state = "writable", e._storedError = void 0, e._writer = void 0, e._writableStreamController = void 0, e._writeRequests = new w(), e._inFlightWriteRequest = void 0, e._closeRequest = void 0, e._inFlightCloseRequest = void 0, e._pendingAbortRequest = void 0, e._backpressure = !1;
			}
			function Et(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_writableStreamController") && e instanceof WritableStream;
			}
			function Wt(e) {
				return void 0 !== e._writer;
			}
			function Bt(e, t) {
				var r;
				if ("closed" === e._state || "errored" === e._state) return d(void 0);
				e._writableStreamController._abortReason = t, null === (r = e._writableStreamController._abortController) || void 0 === r || r.abort(t);
				const o = e._state;
				if ("closed" === o || "errored" === o) return d(void 0);
				if (void 0 !== e._pendingAbortRequest) return e._pendingAbortRequest._promise;
				let n = !1;
				"erroring" === o && (n = !0, t = void 0);
				const i = c((r, o) => {
					e._pendingAbortRequest = {
						_promise: void 0,
						_resolve: r,
						_reject: o,
						_reason: t,
						_wasAlreadyErroring: n
					};
				});
				return e._pendingAbortRequest._promise = i, n || kt(e, t), i;
			}
			function Ot(e) {
				const t = e._state;
				if ("closed" === t || "errored" === t) return f(/* @__PURE__ */ new TypeError(`The stream (in ${t} state) is not in the writable state and cannot be closed`));
				const r = c((t, r) => {
					e._closeRequest = {
						_resolve: t,
						_reject: r
					};
				}), o = e._writer;
				var n;
				return void 0 !== o && e._backpressure && "writable" === t && dr(o), qe(n = e._writableStreamController, Qt, 0), Gt(n), r;
			}
			function jt(e, t) {
				"writable" !== e._state ? At(e) : kt(e, t);
			}
			function kt(e, t) {
				const r = e._writableStreamController;
				e._state = "erroring", e._storedError = t;
				const o = e._writer;
				void 0 !== o && Mt(o, t), !function(e) {
					if (void 0 === e._inFlightWriteRequest && void 0 === e._inFlightCloseRequest) return !1;
					return !0;
				}(e) && r._started && At(e);
			}
			function At(e) {
				e._state = "errored", e._writableStreamController[T]();
				const t = e._storedError;
				if (e._writeRequests.forEach((e) => {
					e._reject(t);
				}), e._writeRequests = new w(), void 0 === e._pendingAbortRequest) return void Dt(e);
				const r = e._pendingAbortRequest;
				if (e._pendingAbortRequest = void 0, r._wasAlreadyErroring) return r._reject(t), void Dt(e);
				h(e._writableStreamController[R](r._reason), () => (r._resolve(), Dt(e), null), (t) => (r._reject(t), Dt(e), null));
			}
			function zt(e) {
				return void 0 !== e._closeRequest || void 0 !== e._inFlightCloseRequest;
			}
			function Dt(e) {
				void 0 !== e._closeRequest && (e._closeRequest._reject(e._storedError), e._closeRequest = void 0);
				const t = e._writer;
				void 0 !== t && ir(t, e._storedError);
			}
			function Ft(e, t) {
				const r = e._writer;
				void 0 !== r && t !== e._backpressure && (t ? function(e) {
					sr(e);
				}(r) : dr(r)), e._backpressure = t;
			}
			Object.defineProperties(WritableStream.prototype, {
				abort: { enumerable: !0 },
				close: { enumerable: !0 },
				getWriter: { enumerable: !0 },
				locked: { enumerable: !0 }
			}), n(WritableStream.prototype.abort, "abort"), n(WritableStream.prototype.close, "close"), n(WritableStream.prototype.getWriter, "getWriter"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStream.prototype, Symbol.toStringTag, {
				value: "WritableStream",
				configurable: !0
			});
			class WritableStreamDefaultWriter {
				constructor(e) {
					if (Y(e, 1, "WritableStreamDefaultWriter"), Pt(e, "First parameter"), Wt(e)) throw new TypeError("This stream has already been locked for exclusive writing by another writer");
					this._ownerWritableStream = e, e._writer = this;
					const t = e._state;
					if ("writable" === t) !zt(e) && e._backpressure ? sr(this) : ur(this), or(this);
					else if ("erroring" === t) lr(this, e._storedError), or(this);
					else if ("closed" === t) ur(this), or(r = this), ar(r);
					else {
						const t = e._storedError;
						lr(this, t), nr(this, t);
					}
					var r;
				}
				get closed() {
					return Lt(this) ? this._closedPromise : f(tr("closed"));
				}
				get desiredSize() {
					if (!Lt(this)) throw tr("desiredSize");
					if (void 0 === this._ownerWritableStream) throw rr("desiredSize");
					return function(e) {
						const t = e._ownerWritableStream, r = t._state;
						if ("errored" === r || "erroring" === r) return null;
						if ("closed" === r) return 0;
						return Ut(t._writableStreamController);
					}(this);
				}
				get ready() {
					return Lt(this) ? this._readyPromise : f(tr("ready"));
				}
				abort(e = void 0) {
					return Lt(this) ? void 0 === this._ownerWritableStream ? f(rr("abort")) : function(e, t) {
						return Bt(e._ownerWritableStream, t);
					}(this, e) : f(tr("abort"));
				}
				close() {
					if (!Lt(this)) return f(tr("close"));
					const e = this._ownerWritableStream;
					return void 0 === e ? f(rr("close")) : zt(e) ? f(/* @__PURE__ */ new TypeError("Cannot close an already-closing stream")) : It(this);
				}
				releaseLock() {
					if (!Lt(this)) throw tr("releaseLock");
					void 0 !== this._ownerWritableStream && Yt(this);
				}
				write(e = void 0) {
					return Lt(this) ? void 0 === this._ownerWritableStream ? f(rr("write to")) : xt(this, e) : f(tr("write"));
				}
			}
			function Lt(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_ownerWritableStream") && e instanceof WritableStreamDefaultWriter;
			}
			function It(e) {
				return Ot(e._ownerWritableStream);
			}
			function $t(e, t) {
				"pending" === e._closedPromiseState ? ir(e, t) : function(e, t) {
					nr(e, t);
				}(e, t);
			}
			function Mt(e, t) {
				"pending" === e._readyPromiseState ? cr(e, t) : function(e, t) {
					lr(e, t);
				}(e, t);
			}
			function Yt(e) {
				const t = e._ownerWritableStream, r = /* @__PURE__ */ new TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
				Mt(e, r), $t(e, r), t._writer = void 0, e._ownerWritableStream = void 0;
			}
			function xt(e, t) {
				const r = e._ownerWritableStream, o = r._writableStreamController, n = function(e, t) {
					if (void 0 === e._strategySizeAlgorithm) return 1;
					try {
						return e._strategySizeAlgorithm(t);
					} catch (t) {
						return Xt(e, t), 1;
					}
				}(o, t);
				if (r !== e._ownerWritableStream) return f(rr("write to"));
				const i = r._state;
				if ("errored" === i) return f(r._storedError);
				if (zt(r) || "closed" === i) return f(/* @__PURE__ */ new TypeError("The stream is closing or closed and cannot be written to"));
				if ("erroring" === i) return f(r._storedError);
				const a = function(e) {
					return c((t, r) => {
						const o = {
							_resolve: t,
							_reject: r
						};
						e._writeRequests.push(o);
					});
				}(r);
				return function(e, t, r) {
					try {
						qe(e, t, r);
					} catch (t) {
						Xt(e, t);
						return;
					}
					const o = e._controlledWritableStream;
					if (!zt(o) && "writable" === o._state) Ft(o, Jt(e));
					Gt(e);
				}(o, t, n), a;
			}
			Object.defineProperties(WritableStreamDefaultWriter.prototype, {
				abort: { enumerable: !0 },
				close: { enumerable: !0 },
				releaseLock: { enumerable: !0 },
				write: { enumerable: !0 },
				closed: { enumerable: !0 },
				desiredSize: { enumerable: !0 },
				ready: { enumerable: !0 }
			}), n(WritableStreamDefaultWriter.prototype.abort, "abort"), n(WritableStreamDefaultWriter.prototype.close, "close"), n(WritableStreamDefaultWriter.prototype.releaseLock, "releaseLock"), n(WritableStreamDefaultWriter.prototype.write, "write"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStreamDefaultWriter.prototype, Symbol.toStringTag, {
				value: "WritableStreamDefaultWriter",
				configurable: !0
			});
			const Qt = {};
			class WritableStreamDefaultController {
				constructor() {
					throw new TypeError("Illegal constructor");
				}
				get abortReason() {
					if (!Nt(this)) throw er("abortReason");
					return this._abortReason;
				}
				get signal() {
					if (!Nt(this)) throw er("signal");
					if (void 0 === this._abortController) throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
					return this._abortController.signal;
				}
				error(e = void 0) {
					if (!Nt(this)) throw er("error");
					"writable" === this._controlledWritableStream._state && Kt(this, e);
				}
				[R](e) {
					const t = this._abortAlgorithm(e);
					return Vt(this), t;
				}
				[T]() {
					Ee(this);
				}
			}
			function Nt(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_controlledWritableStream") && e instanceof WritableStreamDefaultController;
			}
			function Ht(e, t, r, o, n, i, a, s) {
				t._controlledWritableStream = e, e._writableStreamController = t, t._queue = void 0, t._queueTotalSize = void 0, Ee(t), t._abortReason = void 0, t._abortController = function() {
					if ("function" == typeof AbortController) return new AbortController();
				}(), t._started = !1, t._strategySizeAlgorithm = s, t._strategyHWM = a, t._writeAlgorithm = o, t._closeAlgorithm = n, t._abortAlgorithm = i;
				Ft(e, Jt(t));
				h(d(r()), () => (t._started = !0, Gt(t), null), (r) => (t._started = !0, jt(e, r), null));
			}
			function Vt(e) {
				e._writeAlgorithm = void 0, e._closeAlgorithm = void 0, e._abortAlgorithm = void 0, e._strategySizeAlgorithm = void 0;
			}
			function Ut(e) {
				return e._strategyHWM - e._queueTotalSize;
			}
			function Gt(e) {
				const t = e._controlledWritableStream;
				if (!e._started) return;
				if (void 0 !== t._inFlightWriteRequest) return;
				if ("erroring" === t._state) return void At(t);
				if (0 === e._queue.length) return;
				const r = e._queue.peek().value;
				r === Qt ? function(e) {
					const t = e._controlledWritableStream;
					(function(e) {
						e._inFlightCloseRequest = e._closeRequest, e._closeRequest = void 0;
					})(t), Ce(e);
					const r = e._closeAlgorithm();
					Vt(e), h(r, () => (function(e) {
						e._inFlightCloseRequest._resolve(void 0), e._inFlightCloseRequest = void 0, "erroring" === e._state && (e._storedError = void 0, void 0 !== e._pendingAbortRequest && (e._pendingAbortRequest._resolve(), e._pendingAbortRequest = void 0)), e._state = "closed";
						const t = e._writer;
						void 0 !== t && ar(t);
					}(t), null), (e) => (function(e, t) {
						e._inFlightCloseRequest._reject(t), e._inFlightCloseRequest = void 0, void 0 !== e._pendingAbortRequest && (e._pendingAbortRequest._reject(t), e._pendingAbortRequest = void 0), jt(e, t);
					}(t, e), null));
				}(e) : function(e, t) {
					const r = e._controlledWritableStream;
					(function(e) {
						e._inFlightWriteRequest = e._writeRequests.shift();
					})(r);
					h(e._writeAlgorithm(t), () => {
						(function(e) {
							e._inFlightWriteRequest._resolve(void 0), e._inFlightWriteRequest = void 0;
						})(r);
						const t = r._state;
						if (Ce(e), !zt(r) && "writable" === t) {
							const t = Jt(e);
							Ft(r, t);
						}
						return Gt(e), null;
					}, (t) => ("writable" === r._state && Vt(e), function(e, t) {
						e._inFlightWriteRequest._reject(t), e._inFlightWriteRequest = void 0, jt(e, t);
					}(r, t), null));
				}(e, r);
			}
			function Xt(e, t) {
				"writable" === e._controlledWritableStream._state && Kt(e, t);
			}
			function Jt(e) {
				return Ut(e) <= 0;
			}
			function Kt(e, t) {
				const r = e._controlledWritableStream;
				Vt(e), kt(r, t);
			}
			function Zt(e) {
				return /* @__PURE__ */ new TypeError(`WritableStream.prototype.${e} can only be used on a WritableStream`);
			}
			function er(e) {
				return /* @__PURE__ */ new TypeError(`WritableStreamDefaultController.prototype.${e} can only be used on a WritableStreamDefaultController`);
			}
			function tr(e) {
				return /* @__PURE__ */ new TypeError(`WritableStreamDefaultWriter.prototype.${e} can only be used on a WritableStreamDefaultWriter`);
			}
			function rr(e) {
				return /* @__PURE__ */ new TypeError("Cannot " + e + " a stream using a released writer");
			}
			function or(e) {
				e._closedPromise = c((t, r) => {
					e._closedPromise_resolve = t, e._closedPromise_reject = r, e._closedPromiseState = "pending";
				});
			}
			function nr(e, t) {
				or(e), ir(e, t);
			}
			function ir(e, t) {
				void 0 !== e._closedPromise_reject && (y(e._closedPromise), e._closedPromise_reject(t), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0, e._closedPromiseState = "rejected");
			}
			function ar(e) {
				void 0 !== e._closedPromise_resolve && (e._closedPromise_resolve(void 0), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0, e._closedPromiseState = "resolved");
			}
			function sr(e) {
				e._readyPromise = c((t, r) => {
					e._readyPromise_resolve = t, e._readyPromise_reject = r;
				}), e._readyPromiseState = "pending";
			}
			function lr(e, t) {
				sr(e), cr(e, t);
			}
			function ur(e) {
				sr(e), dr(e);
			}
			function cr(e, t) {
				void 0 !== e._readyPromise_reject && (y(e._readyPromise), e._readyPromise_reject(t), e._readyPromise_resolve = void 0, e._readyPromise_reject = void 0, e._readyPromiseState = "rejected");
			}
			function dr(e) {
				void 0 !== e._readyPromise_resolve && (e._readyPromise_resolve(void 0), e._readyPromise_resolve = void 0, e._readyPromise_reject = void 0, e._readyPromiseState = "fulfilled");
			}
			Object.defineProperties(WritableStreamDefaultController.prototype, {
				abortReason: { enumerable: !0 },
				signal: { enumerable: !0 },
				error: { enumerable: !0 }
			}), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStreamDefaultController.prototype, Symbol.toStringTag, {
				value: "WritableStreamDefaultController",
				configurable: !0
			});
			const fr = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : "undefined" != typeof global ? global : void 0;
			const br = function() {
				const e = null == fr ? void 0 : fr.DOMException;
				return function(e) {
					if ("function" != typeof e && "object" != typeof e) return !1;
					if ("DOMException" !== e.name) return !1;
					try {
						return new e(), !0;
					} catch (e) {
						return !1;
					}
				}(e) ? e : void 0;
			}() || function() {
				const e = function(e, t) {
					this.message = e || "", this.name = t || "Error", Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
				};
				return n(e, "DOMException"), e.prototype = Object.create(Error.prototype), Object.defineProperty(e.prototype, "constructor", {
					value: e,
					writable: !0,
					configurable: !0
				}), e;
			}();
			function hr(e, t, r, o, n, i) {
				const a = U(e), s = Ct(t);
				e._disturbed = !0;
				const l = new _r(s), u = new pr(l);
				return c((m, p) => {
					let S;
					if (void 0 !== i) {
						if (S = () => {
							const r = void 0 !== i.reason ? i.reason : new br("Aborted", "AbortError"), a = [];
							o || a.push(() => "writable" === t._state ? Bt(t, r) : d(void 0)), n || a.push(() => "readable" === e._state ? Yr(e, r) : d(void 0)), T(() => Promise.all(a.map((e) => e())), !0, r);
						}, i.aborted) return void S();
						i.addEventListener("abort", S);
					}
					function g() {
						for (; !l._shuttingDown && !t._backpressure && "writable" === t._state && !zt(t) && "readable" === e._state && oe(a);) re(a, u);
						if (l._shuttingDown) return d(!0);
						if (t._backpressure) return b(s._readyPromise, g);
						const r = new mr(l);
						return re(a, r), r._promise;
					}
					var v, w, R;
					if (yr(e, a._closedPromise, (e) => (o ? P(!0, e) : T(() => Bt(t, e), !0, e), null)), yr(t, s._closedPromise, (t) => (n ? P(!0, t) : T(() => Yr(e, t), !0, t), null)), v = e, w = a._closedPromise, R = () => (r ? P() : T(() => function(e) {
						const t = e._ownerWritableStream, r = t._state;
						return zt(t) || "closed" === r ? d(void 0) : "errored" === r ? f(t._storedError) : It(e);
					}(s)), null), "closed" === v._state ? R() : _(w, R), zt(t) || "closed" === t._state) {
						const t = /* @__PURE__ */ new TypeError("the destination writable stream closed before all data could be piped to it");
						n ? P(!0, t) : T(() => Yr(e, t), !0, t);
					}
					function T(e, r, o) {
						function n() {
							return h(e(), () => C(r, o), (e) => C(!0, e)), null;
						}
						l._shuttingDown || (l._shuttingDown = !0, "writable" !== t._state || zt(t) ? n() : _(l._waitForWritesToFinish(), n));
					}
					function P(e, r) {
						l._shuttingDown || (l._shuttingDown = !0, "writable" !== t._state || zt(t) ? C(e, r) : _(l._waitForWritesToFinish(), () => C(e, r)));
					}
					function C(e, t) {
						return Yt(s), O(a), void 0 !== i && i.removeEventListener("abort", S), e ? p(t) : m(void 0), null;
					}
					y(c((e, t) => {
						(function r(o) {
							o ? e() : b(g(), r, t);
						})(!1);
					}));
				});
			}
			class _r {
				constructor(e) {
					this._writer = e, this._shuttingDown = !1, this._currentWrite = d(void 0);
				}
				_waitForWritesToFinish() {
					const e = this._currentWrite;
					return b(this._currentWrite, () => e !== this._currentWrite ? this._waitForWritesToFinish() : void 0);
				}
			}
			class mr {
				constructor(e) {
					this._state = e, this._promise = c((e, t) => {
						this._resolvePromise = e, this._rejectPromise = t;
					});
				}
				_chunkSteps(e) {
					this._state._currentWrite = b(xt(this._state._writer, e), void 0, t), this._resolvePromise(!1);
				}
				_closeSteps() {
					this._resolvePromise(!0);
				}
				_errorSteps(e) {
					this._rejectPromise(e);
				}
			}
			class pr {
				constructor(e) {
					this._state = e;
				}
				_chunkSteps(e) {
					this._state._currentWrite = b(xt(this._state._writer, e), void 0, t);
				}
				_closeSteps() {}
				_errorSteps(e) {}
			}
			function yr(e, t, r) {
				"errored" === e._state ? r(e._storedError) : m(t, r);
			}
			class ReadableStreamDefaultController {
				constructor() {
					throw new TypeError("Illegal constructor");
				}
				get desiredSize() {
					if (!Sr(this)) throw Wr("desiredSize");
					return Cr(this);
				}
				close() {
					if (!Sr(this)) throw Wr("close");
					if (!qr(this)) throw new TypeError("The stream is not in a state that permits close");
					Rr(this);
				}
				enqueue(e = void 0) {
					if (!Sr(this)) throw Wr("enqueue");
					if (!qr(this)) throw new TypeError("The stream is not in a state that permits enqueue");
					return Tr(this, e);
				}
				error(e = void 0) {
					if (!Sr(this)) throw Wr("error");
					Pr(this, e);
				}
				[P](e) {
					Ee(this);
					const t = this._cancelAlgorithm(e);
					return wr(this), t;
				}
				[C](e) {
					const t = this._controlledReadableStream;
					if (this._queue.length > 0) {
						const r = Ce(this);
						this._closeRequested && 0 === this._queue.length ? (wr(this), xr(t)) : gr(this), e._chunkSteps(r);
					} else G(t, e), gr(this);
				}
				[q]() {
					return this._queue.length > 0;
				}
				[E]() {}
			}
			function Sr(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_controlledReadableStream") && e instanceof ReadableStreamDefaultController;
			}
			function gr(e) {
				if (!vr(e)) return;
				if (e._pulling) return void (e._pullAgain = !0);
				e._pulling = !0;
				h(e._pullAlgorithm(), () => (e._pulling = !1, e._pullAgain && (e._pullAgain = !1, gr(e)), null), (t) => (Pr(e, t), null));
			}
			function vr(e) {
				const t = e._controlledReadableStream;
				if (!qr(e)) return !1;
				if (!e._started) return !1;
				if (Mr(t) && J(t) > 0) return !0;
				return Cr(e) > 0;
			}
			function wr(e) {
				e._pullAlgorithm = void 0, e._cancelAlgorithm = void 0, e._strategySizeAlgorithm = void 0;
			}
			function Rr(e) {
				if (!qr(e)) return;
				const t = e._controlledReadableStream;
				e._closeRequested = !0, 0 === e._queue.length && (wr(e), xr(t));
			}
			function Tr(e, t) {
				if (!qr(e)) return;
				const r = e._controlledReadableStream;
				if (Mr(r) && J(r) > 0) X(r, t, !1);
				else {
					let r;
					try {
						r = e._strategySizeAlgorithm(t);
					} catch (t) {
						throw Pr(e, t), t;
					}
					try {
						qe(e, t, r);
					} catch (t) {
						throw Pr(e, t), t;
					}
				}
				gr(e);
			}
			function Pr(e, t) {
				const r = e._controlledReadableStream;
				"readable" === r._state && (Ee(e), wr(e), Qr(r, t));
			}
			function Cr(e) {
				const t = e._controlledReadableStream._state;
				return "errored" === t ? null : "closed" === t ? 0 : e._strategyHWM - e._queueTotalSize;
			}
			function qr(e) {
				const t = e._controlledReadableStream._state;
				return !e._closeRequested && "readable" === t;
			}
			function Er(e, t, r, o, n, i, a) {
				t._controlledReadableStream = e, t._queue = void 0, t._queueTotalSize = void 0, Ee(t), t._started = !1, t._closeRequested = !1, t._pullAgain = !1, t._pulling = !1, t._strategySizeAlgorithm = a, t._strategyHWM = i, t._pullAlgorithm = o, t._cancelAlgorithm = n, e._readableStreamController = t;
				h(d(r()), () => (t._started = !0, gr(t), null), (e) => (Pr(t, e), null));
			}
			function Wr(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStreamDefaultController.prototype.${e} can only be used on a ReadableStreamDefaultController`);
			}
			function Br(e, t) {
				return Oe(e._readableStreamController) ? function(e) {
					let t, r, o, n, i, a = U(e), s = !1, l = !1, u = !1, f = !1, b = !1;
					const h = c((e) => {
						i = e;
					});
					function _(e) {
						m(e._closedPromise, (t) => (e !== a || (Je(o._readableStreamController, t), Je(n._readableStreamController, t), f && b || i(void 0)), null));
					}
					function p() {
						bt(a) && (O(a), a = U(e), _(a));
						re(a, {
							_chunkSteps: (t) => {
								S(() => {
									l = !1, u = !1;
									const r = t;
									let a = t;
									if (!f && !b) try {
										a = Pe(t);
									} catch (t) {
										Je(o._readableStreamController, t), Je(n._readableStreamController, t), i(Yr(e, t));
										return;
									}
									f || Xe(o._readableStreamController, r), b || Xe(n._readableStreamController, a), s = !1, l ? g() : u && v();
								});
							},
							_closeSteps: () => {
								s = !1, f || Ge(o._readableStreamController), b || Ge(n._readableStreamController), o._readableStreamController._pendingPullIntos.length > 0 && tt(o._readableStreamController, 0), n._readableStreamController._pendingPullIntos.length > 0 && tt(n._readableStreamController, 0), f && b || i(void 0);
							},
							_errorSteps: () => {
								s = !1;
							}
						});
					}
					function y(t, r) {
						te(a) && (O(a), a = st(e), _(a));
						const c = r ? n : o, d = r ? o : n;
						ht(a, t, 1, {
							_chunkSteps: (t) => {
								S(() => {
									l = !1, u = !1;
									const o = r ? b : f;
									if (r ? f : b) o || rt(c._readableStreamController, t);
									else {
										let r;
										try {
											r = Pe(t);
										} catch (t) {
											Je(c._readableStreamController, t), Je(d._readableStreamController, t), i(Yr(e, t));
											return;
										}
										o || rt(c._readableStreamController, t), Xe(d._readableStreamController, r);
									}
									s = !1, l ? g() : u && v();
								});
							},
							_closeSteps: (e) => {
								s = !1;
								const t = r ? b : f, o = r ? f : b;
								t || Ge(c._readableStreamController), o || Ge(d._readableStreamController), void 0 !== e && (t || rt(c._readableStreamController, e), !o && d._readableStreamController._pendingPullIntos.length > 0 && tt(d._readableStreamController, 0)), t && o || i(void 0);
							},
							_errorSteps: () => {
								s = !1;
							}
						});
					}
					function g() {
						if (s) return l = !0, d(void 0);
						s = !0;
						const e = Ze(o._readableStreamController);
						return null === e ? p() : y(e._view, !1), d(void 0);
					}
					function v() {
						if (s) return u = !0, d(void 0);
						s = !0;
						const e = Ze(n._readableStreamController);
						return null === e ? p() : y(e._view, !0), d(void 0);
					}
					function w(o) {
						if (f = !0, t = o, b) {
							const n = Yr(e, ue([t, r]));
							i(n);
						}
						return h;
					}
					function R(o) {
						if (b = !0, r = o, f) {
							const n = Yr(e, ue([t, r]));
							i(n);
						}
						return h;
					}
					function T() {}
					return o = Lr(T, g, w), n = Lr(T, v, R), _(a), [o, n];
				}(e) : function(e) {
					const t = U(e);
					let r, o, n, i, a, s = !1, l = !1, u = !1, f = !1;
					const b = c((e) => {
						a = e;
					});
					function h() {
						if (s) return l = !0, d(void 0);
						s = !0;
						return re(t, {
							_chunkSteps: (e) => {
								S(() => {
									l = !1;
									const t = e, r = e;
									u || Tr(n._readableStreamController, t), f || Tr(i._readableStreamController, r), s = !1, l && h();
								});
							},
							_closeSteps: () => {
								s = !1, u || Rr(n._readableStreamController), f || Rr(i._readableStreamController), u && f || a(void 0);
							},
							_errorSteps: () => {
								s = !1;
							}
						}), d(void 0);
					}
					function _(t) {
						if (u = !0, r = t, f) {
							const n = Yr(e, ue([r, o]));
							a(n);
						}
						return b;
					}
					function p(t) {
						if (f = !0, o = t, u) {
							const n = Yr(e, ue([r, o]));
							a(n);
						}
						return b;
					}
					function y() {}
					return n = Fr(y, h, _), i = Fr(y, h, p), m(t._closedPromise, (e) => (Pr(n._readableStreamController, e), Pr(i._readableStreamController, e), u && f || a(void 0), null)), [n, i];
				}(e);
			}
			function Or(e) {
				return r(o = e) && void 0 !== o.getReader ? function(e) {
					let o;
					function n() {
						let t;
						try {
							t = e.read();
						} catch (e) {
							return f(e);
						}
						return p(t, (e) => {
							if (!r(e)) throw new TypeError("The promise returned by the reader.read() method must fulfill with an object");
							if (e.done) Rr(o._readableStreamController);
							else {
								const t = e.value;
								Tr(o._readableStreamController, t);
							}
						});
					}
					function i(t) {
						try {
							return d(e.cancel(t));
						} catch (e) {
							return f(e);
						}
					}
					return o = Fr(t, n, i, 0), o;
				}(e.getReader()) : function(e) {
					let o;
					const n = pe(e, "async");
					function i() {
						let e;
						try {
							e = ye(n);
						} catch (e) {
							return f(e);
						}
						return p(d(e), (e) => {
							if (!r(e)) throw new TypeError("The promise returned by the iterator.next() method must fulfill with an object");
							if (e.done) Rr(o._readableStreamController);
							else {
								const t = e.value;
								Tr(o._readableStreamController, t);
							}
						});
					}
					function a(e) {
						const t = n.iterator;
						let o;
						try {
							o = he(t, "return");
						} catch (e) {
							return f(e);
						}
						if (void 0 === o) return d(void 0);
						return p(v(o, t, [e]), (e) => {
							if (!r(e)) throw new TypeError("The promise returned by the iterator.return() method must fulfill with an object");
						});
					}
					return o = Fr(t, i, a, 0), o;
				}(e);
				var o;
			}
			function jr(e, t, r) {
				return $(e, r), (r) => v(e, t, [r]);
			}
			function kr(e, t, r) {
				return $(e, r), (r) => v(e, t, [r]);
			}
			function Ar(e, t, r) {
				return $(e, r), (r) => g(e, t, [r]);
			}
			function zr(e, t) {
				if ("bytes" !== (e = `${e}`)) throw new TypeError(`${t} '${e}' is not a valid enumeration value for ReadableStreamType`);
				return e;
			}
			function Dr(e, t) {
				I(e, t);
				const r = null == e ? void 0 : e.preventAbort, o = null == e ? void 0 : e.preventCancel, n = null == e ? void 0 : e.preventClose, i = null == e ? void 0 : e.signal;
				return void 0 !== i && function(e, t) {
					if (!function(e) {
						if ("object" != typeof e || null === e) return !1;
						try {
							return "boolean" == typeof e.aborted;
						} catch (e) {
							return !1;
						}
					}(e)) throw new TypeError(`${t} is not an AbortSignal.`);
				}(i, `${t} has member 'signal' that`), {
					preventAbort: Boolean(r),
					preventCancel: Boolean(o),
					preventClose: Boolean(n),
					signal: i
				};
			}
			Object.defineProperties(ReadableStreamDefaultController.prototype, {
				close: { enumerable: !0 },
				enqueue: { enumerable: !0 },
				error: { enumerable: !0 },
				desiredSize: { enumerable: !0 }
			}), n(ReadableStreamDefaultController.prototype.close, "close"), n(ReadableStreamDefaultController.prototype.enqueue, "enqueue"), n(ReadableStreamDefaultController.prototype.error, "error"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamDefaultController.prototype, Symbol.toStringTag, {
				value: "ReadableStreamDefaultController",
				configurable: !0
			});
			class ReadableStream {
				constructor(e = {}, t = {}) {
					void 0 === e ? e = null : M(e, "First parameter");
					const r = St(t, "Second parameter"), o = function(e, t) {
						I(e, t);
						const r = e, o = null == r ? void 0 : r.autoAllocateChunkSize, n = null == r ? void 0 : r.cancel, i = null == r ? void 0 : r.pull, a = null == r ? void 0 : r.start, s = null == r ? void 0 : r.type;
						return {
							autoAllocateChunkSize: void 0 === o ? void 0 : H(o, `${t} has member 'autoAllocateChunkSize' that`),
							cancel: void 0 === n ? void 0 : jr(n, r, `${t} has member 'cancel' that`),
							pull: void 0 === i ? void 0 : kr(i, r, `${t} has member 'pull' that`),
							start: void 0 === a ? void 0 : Ar(a, r, `${t} has member 'start' that`),
							type: void 0 === s ? void 0 : zr(s, `${t} has member 'type' that`)
						};
					}(e, "First parameter");
					if (Ir(this), "bytes" === o.type) {
						if (void 0 !== r.size) throw new RangeError("The strategy for a byte stream cannot have a size function");
						(function(e, t, r) {
							const o = Object.create(ReadableByteStreamController.prototype);
							let n, i, a;
							n = void 0 !== t.start ? () => t.start(o) : () => {}, i = void 0 !== t.pull ? () => t.pull(o) : () => d(void 0), a = void 0 !== t.cancel ? (e) => t.cancel(e) : () => d(void 0);
							const s = t.autoAllocateChunkSize;
							if (0 === s) throw new TypeError("autoAllocateChunkSize must be greater than 0");
							ot(e, o, n, i, a, r, s);
						})(this, o, pt(r, 0));
					} else {
						const e = yt(r);
						(function(e, t, r, o) {
							const n = Object.create(ReadableStreamDefaultController.prototype);
							let i, a, s;
							i = void 0 !== t.start ? () => t.start(n) : () => {}, a = void 0 !== t.pull ? () => t.pull(n) : () => d(void 0), s = void 0 !== t.cancel ? (e) => t.cancel(e) : () => d(void 0), Er(e, n, i, a, s, r, o);
						})(this, o, pt(r, 1), e);
					}
				}
				get locked() {
					if (!$r(this)) throw Nr("locked");
					return Mr(this);
				}
				cancel(e = void 0) {
					return $r(this) ? Mr(this) ? f(/* @__PURE__ */ new TypeError("Cannot cancel a stream that already has a reader")) : Yr(this, e) : f(Nr("cancel"));
				}
				getReader(e = void 0) {
					if (!$r(this)) throw Nr("getReader");
					return void 0 === function(e, t) {
						I(e, t);
						const r = null == e ? void 0 : e.mode;
						return { mode: void 0 === r ? void 0 : at(r, `${t} has member 'mode' that`) };
					}(e, "First parameter").mode ? U(this) : st(this);
				}
				pipeThrough(e, t = {}) {
					if (!$r(this)) throw Nr("pipeThrough");
					Y(e, 1, "pipeThrough");
					const r = function(e, t) {
						I(e, t);
						const r = null == e ? void 0 : e.readable;
						x(r, "readable", "ReadableWritablePair"), V(r, `${t} has member 'readable' that`);
						const o = null == e ? void 0 : e.writable;
						return x(o, "writable", "ReadableWritablePair"), Pt(o, `${t} has member 'writable' that`), {
							readable: r,
							writable: o
						};
					}(e, "First parameter"), o = Dr(t, "Second parameter");
					if (Mr(this)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
					if (Wt(r.writable)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
					return y(hr(this, r.writable, o.preventClose, o.preventAbort, o.preventCancel, o.signal)), r.readable;
				}
				pipeTo(e, t = {}) {
					if (!$r(this)) return f(Nr("pipeTo"));
					if (void 0 === e) return f("Parameter 1 is required in 'pipeTo'.");
					if (!Et(e)) return f(/* @__PURE__ */ new TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
					let r;
					try {
						r = Dr(t, "Second parameter");
					} catch (e) {
						return f(e);
					}
					return Mr(this) ? f(/* @__PURE__ */ new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream")) : Wt(e) ? f(/* @__PURE__ */ new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream")) : hr(this, e, r.preventClose, r.preventAbort, r.preventCancel, r.signal);
				}
				tee() {
					if (!$r(this)) throw Nr("tee");
					return ue(Br(this));
				}
				values(e = void 0) {
					if (!$r(this)) throw Nr("values");
					return function(e, t) {
						const r = U(e), o = new Se(r, t), n = Object.create(ve);
						return n._asyncIteratorImpl = o, n;
					}(this, function(e, t) {
						I(e, t);
						const r = null == e ? void 0 : e.preventCancel;
						return { preventCancel: Boolean(r) };
					}(e, "First parameter").preventCancel);
				}
				[me](e) {
					return this.values(e);
				}
				static from(e) {
					return Or(e);
				}
			}
			function Fr(e, t, r, o = 1, n = () => 1) {
				const i = Object.create(ReadableStream.prototype);
				Ir(i);
				return Er(i, Object.create(ReadableStreamDefaultController.prototype), e, t, r, o, n), i;
			}
			function Lr(e, t, r) {
				const o = Object.create(ReadableStream.prototype);
				Ir(o);
				return ot(o, Object.create(ReadableByteStreamController.prototype), e, t, r, 0, void 0), o;
			}
			function Ir(e) {
				e._state = "readable", e._reader = void 0, e._storedError = void 0, e._disturbed = !1;
			}
			function $r(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_readableStreamController") && e instanceof ReadableStream;
			}
			function Mr(e) {
				return void 0 !== e._reader;
			}
			function Yr(e, r) {
				if (e._disturbed = !0, "closed" === e._state) return d(void 0);
				if ("errored" === e._state) return f(e._storedError);
				xr(e);
				const o = e._reader;
				if (void 0 !== o && bt(o)) {
					const e = o._readIntoRequests;
					o._readIntoRequests = new w(), e.forEach((e) => {
						e._closeSteps(void 0);
					});
				}
				return p(e._readableStreamController[P](r), t);
			}
			function xr(e) {
				e._state = "closed";
				const t = e._reader;
				if (void 0 !== t && (D(t), te(t))) {
					const e = t._readRequests;
					t._readRequests = new w(), e.forEach((e) => {
						e._closeSteps();
					});
				}
			}
			function Qr(e, t) {
				e._state = "errored", e._storedError = t;
				const r = e._reader;
				void 0 !== r && (z(r, t), te(r) ? ne(r, t) : _t(r, t));
			}
			function Nr(e) {
				return /* @__PURE__ */ new TypeError(`ReadableStream.prototype.${e} can only be used on a ReadableStream`);
			}
			function Hr(e, t) {
				I(e, t);
				const r = null == e ? void 0 : e.highWaterMark;
				return x(r, "highWaterMark", "QueuingStrategyInit"), { highWaterMark: Q(r) };
			}
			Object.defineProperties(ReadableStream, { from: { enumerable: !0 } }), Object.defineProperties(ReadableStream.prototype, {
				cancel: { enumerable: !0 },
				getReader: { enumerable: !0 },
				pipeThrough: { enumerable: !0 },
				pipeTo: { enumerable: !0 },
				tee: { enumerable: !0 },
				values: { enumerable: !0 },
				locked: { enumerable: !0 }
			}), n(ReadableStream.from, "from"), n(ReadableStream.prototype.cancel, "cancel"), n(ReadableStream.prototype.getReader, "getReader"), n(ReadableStream.prototype.pipeThrough, "pipeThrough"), n(ReadableStream.prototype.pipeTo, "pipeTo"), n(ReadableStream.prototype.tee, "tee"), n(ReadableStream.prototype.values, "values"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStream.prototype, Symbol.toStringTag, {
				value: "ReadableStream",
				configurable: !0
			}), Object.defineProperty(ReadableStream.prototype, me, {
				value: ReadableStream.prototype.values,
				writable: !0,
				configurable: !0
			});
			const Vr = (e) => e.byteLength;
			n(Vr, "size");
			class ByteLengthQueuingStrategy {
				constructor(e) {
					Y(e, 1, "ByteLengthQueuingStrategy"), e = Hr(e, "First parameter"), this._byteLengthQueuingStrategyHighWaterMark = e.highWaterMark;
				}
				get highWaterMark() {
					if (!Gr(this)) throw Ur("highWaterMark");
					return this._byteLengthQueuingStrategyHighWaterMark;
				}
				get size() {
					if (!Gr(this)) throw Ur("size");
					return Vr;
				}
			}
			function Ur(e) {
				return /* @__PURE__ */ new TypeError(`ByteLengthQueuingStrategy.prototype.${e} can only be used on a ByteLengthQueuingStrategy`);
			}
			function Gr(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_byteLengthQueuingStrategyHighWaterMark") && e instanceof ByteLengthQueuingStrategy;
			}
			Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
				highWaterMark: { enumerable: !0 },
				size: { enumerable: !0 }
			}), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ByteLengthQueuingStrategy.prototype, Symbol.toStringTag, {
				value: "ByteLengthQueuingStrategy",
				configurable: !0
			});
			const Xr = () => 1;
			n(Xr, "size");
			class CountQueuingStrategy {
				constructor(e) {
					Y(e, 1, "CountQueuingStrategy"), e = Hr(e, "First parameter"), this._countQueuingStrategyHighWaterMark = e.highWaterMark;
				}
				get highWaterMark() {
					if (!Kr(this)) throw Jr("highWaterMark");
					return this._countQueuingStrategyHighWaterMark;
				}
				get size() {
					if (!Kr(this)) throw Jr("size");
					return Xr;
				}
			}
			function Jr(e) {
				return /* @__PURE__ */ new TypeError(`CountQueuingStrategy.prototype.${e} can only be used on a CountQueuingStrategy`);
			}
			function Kr(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_countQueuingStrategyHighWaterMark") && e instanceof CountQueuingStrategy;
			}
			function Zr(e, t, r) {
				return $(e, r), (r) => v(e, t, [r]);
			}
			function eo(e, t, r) {
				return $(e, r), (r) => g(e, t, [r]);
			}
			function to(e, t, r) {
				return $(e, r), (r, o) => v(e, t, [r, o]);
			}
			function ro(e, t, r) {
				return $(e, r), (r) => v(e, t, [r]);
			}
			Object.defineProperties(CountQueuingStrategy.prototype, {
				highWaterMark: { enumerable: !0 },
				size: { enumerable: !0 }
			}), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(CountQueuingStrategy.prototype, Symbol.toStringTag, {
				value: "CountQueuingStrategy",
				configurable: !0
			});
			class TransformStream {
				constructor(e = {}, t = {}, r = {}) {
					void 0 === e && (e = null);
					const o = St(t, "Second parameter"), n = St(r, "Third parameter"), i = function(e, t) {
						I(e, t);
						const r = null == e ? void 0 : e.cancel, o = null == e ? void 0 : e.flush, n = null == e ? void 0 : e.readableType, i = null == e ? void 0 : e.start, a = null == e ? void 0 : e.transform, s = null == e ? void 0 : e.writableType;
						return {
							cancel: void 0 === r ? void 0 : ro(r, e, `${t} has member 'cancel' that`),
							flush: void 0 === o ? void 0 : Zr(o, e, `${t} has member 'flush' that`),
							readableType: n,
							start: void 0 === i ? void 0 : eo(i, e, `${t} has member 'start' that`),
							transform: void 0 === a ? void 0 : to(a, e, `${t} has member 'transform' that`),
							writableType: s
						};
					}(e, "First parameter");
					if (void 0 !== i.readableType) throw new RangeError("Invalid readableType specified");
					if (void 0 !== i.writableType) throw new RangeError("Invalid writableType specified");
					const a = pt(n, 0), s = yt(n), l = pt(o, 1), u = yt(o);
					let b;
					(function(e, t, r, o, n, i) {
						function a() {
							return t;
						}
						function s(t) {
							return function(e, t) {
								const r = e._transformStreamController;
								if (e._backpressure) return p(e._backpressureChangePromise, () => {
									const o = e._writable;
									if ("erroring" === o._state) throw o._storedError;
									return fo(r, t);
								});
								return fo(r, t);
							}(e, t);
						}
						function l(t) {
							return function(e, t) {
								const r = e._transformStreamController;
								if (void 0 !== r._finishPromise) return r._finishPromise;
								const o = e._readable;
								r._finishPromise = c((e, t) => {
									r._finishPromise_resolve = e, r._finishPromise_reject = t;
								});
								const n = r._cancelAlgorithm(t);
								return uo(r), h(n, () => ("errored" === o._state ? _o(r, o._storedError) : (Pr(o._readableStreamController, t), ho(r)), null), (e) => (Pr(o._readableStreamController, e), _o(r, e), null)), r._finishPromise;
							}(e, t);
						}
						function u() {
							return function(e) {
								const t = e._transformStreamController;
								if (void 0 !== t._finishPromise) return t._finishPromise;
								const r = e._readable;
								t._finishPromise = c((e, r) => {
									t._finishPromise_resolve = e, t._finishPromise_reject = r;
								});
								const o = t._flushAlgorithm();
								return uo(t), h(o, () => ("errored" === r._state ? _o(t, r._storedError) : (Rr(r._readableStreamController), ho(t)), null), (e) => (Pr(r._readableStreamController, e), _o(t, e), null)), t._finishPromise;
							}(e);
						}
						function d() {
							return function(e) {
								return so(e, !1), e._backpressureChangePromise;
							}(e);
						}
						function f(t) {
							return function(e, t) {
								const r = e._transformStreamController;
								if (void 0 !== r._finishPromise) return r._finishPromise;
								const o = e._writable;
								r._finishPromise = c((e, t) => {
									r._finishPromise_resolve = e, r._finishPromise_reject = t;
								});
								const n = r._cancelAlgorithm(t);
								return uo(r), h(n, () => ("errored" === o._state ? _o(r, o._storedError) : (Xt(o._writableStreamController, t), ao(e), ho(r)), null), (t) => (Xt(o._writableStreamController, t), ao(e), _o(r, t), null)), r._finishPromise;
							}(e, t);
						}
						e._writable = function(e, t, r, o, n = 1, i = () => 1) {
							const a = Object.create(WritableStream.prototype);
							return qt(a), Ht(a, Object.create(WritableStreamDefaultController.prototype), e, t, r, o, n, i), a;
						}(a, s, u, l, r, o), e._readable = Fr(a, d, f, n, i), e._backpressure = void 0, e._backpressureChangePromise = void 0, e._backpressureChangePromise_resolve = void 0, so(e, !0), e._transformStreamController = void 0;
					})(this, c((e) => {
						b = e;
					}), l, u, a, s), function(e, t) {
						const r = Object.create(TransformStreamDefaultController.prototype);
						let o, n, i;
						o = void 0 !== t.transform ? (e) => t.transform(e, r) : (e) => {
							try {
								return co(r, e), d(void 0);
							} catch (e) {
								return f(e);
							}
						};
						n = void 0 !== t.flush ? () => t.flush(r) : () => d(void 0);
						i = void 0 !== t.cancel ? (e) => t.cancel(e) : () => d(void 0);
						(function(e, t, r, o, n) {
							t._controlledTransformStream = e, e._transformStreamController = t, t._transformAlgorithm = r, t._flushAlgorithm = o, t._cancelAlgorithm = n, t._finishPromise = void 0, t._finishPromise_resolve = void 0, t._finishPromise_reject = void 0;
						})(e, r, o, n, i);
					}(this, i), void 0 !== i.start ? b(i.start(this._transformStreamController)) : b(void 0);
				}
				get readable() {
					if (!oo(this)) throw mo("readable");
					return this._readable;
				}
				get writable() {
					if (!oo(this)) throw mo("writable");
					return this._writable;
				}
			}
			function oo(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_transformStreamController") && e instanceof TransformStream;
			}
			function no(e, t) {
				Pr(e._readable._readableStreamController, t), io(e, t);
			}
			function io(e, t) {
				uo(e._transformStreamController), Xt(e._writable._writableStreamController, t), ao(e);
			}
			function ao(e) {
				e._backpressure && so(e, !1);
			}
			function so(e, t) {
				void 0 !== e._backpressureChangePromise && e._backpressureChangePromise_resolve(), e._backpressureChangePromise = c((t) => {
					e._backpressureChangePromise_resolve = t;
				}), e._backpressure = t;
			}
			Object.defineProperties(TransformStream.prototype, {
				readable: { enumerable: !0 },
				writable: { enumerable: !0 }
			}), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(TransformStream.prototype, Symbol.toStringTag, {
				value: "TransformStream",
				configurable: !0
			});
			class TransformStreamDefaultController {
				constructor() {
					throw new TypeError("Illegal constructor");
				}
				get desiredSize() {
					if (!lo(this)) throw bo("desiredSize");
					return Cr(this._controlledTransformStream._readable._readableStreamController);
				}
				enqueue(e = void 0) {
					if (!lo(this)) throw bo("enqueue");
					co(this, e);
				}
				error(e = void 0) {
					if (!lo(this)) throw bo("error");
					var t = e;
					no(this._controlledTransformStream, t);
				}
				terminate() {
					if (!lo(this)) throw bo("terminate");
					(function(e) {
						const t = e._controlledTransformStream;
						Rr(t._readable._readableStreamController);
						io(t, /* @__PURE__ */ new TypeError("TransformStream terminated"));
					})(this);
				}
			}
			function lo(e) {
				return !!r(e) && !!Object.prototype.hasOwnProperty.call(e, "_controlledTransformStream") && e instanceof TransformStreamDefaultController;
			}
			function uo(e) {
				e._transformAlgorithm = void 0, e._flushAlgorithm = void 0, e._cancelAlgorithm = void 0;
			}
			function co(e, t) {
				const r = e._controlledTransformStream, o = r._readable._readableStreamController;
				if (!qr(o)) throw new TypeError("Readable side is not in a state that permits enqueue");
				try {
					Tr(o, t);
				} catch (e) {
					throw io(r, e), r._readable._storedError;
				}
				(function(e) {
					return !vr(e);
				})(o) !== r._backpressure && so(r, !0);
			}
			function fo(e, t) {
				return p(e._transformAlgorithm(t), void 0, (t) => {
					throw no(e._controlledTransformStream, t), t;
				});
			}
			function bo(e) {
				return /* @__PURE__ */ new TypeError(`TransformStreamDefaultController.prototype.${e} can only be used on a TransformStreamDefaultController`);
			}
			function ho(e) {
				void 0 !== e._finishPromise_resolve && (e._finishPromise_resolve(), e._finishPromise_resolve = void 0, e._finishPromise_reject = void 0);
			}
			function _o(e, t) {
				void 0 !== e._finishPromise_reject && (y(e._finishPromise), e._finishPromise_reject(t), e._finishPromise_resolve = void 0, e._finishPromise_reject = void 0);
			}
			function mo(e) {
				return /* @__PURE__ */ new TypeError(`TransformStream.prototype.${e} can only be used on a TransformStream`);
			}
			Object.defineProperties(TransformStreamDefaultController.prototype, {
				enqueue: { enumerable: !0 },
				error: { enumerable: !0 },
				terminate: { enumerable: !0 },
				desiredSize: { enumerable: !0 }
			}), n(TransformStreamDefaultController.prototype.enqueue, "enqueue"), n(TransformStreamDefaultController.prototype.error, "error"), n(TransformStreamDefaultController.prototype.terminate, "terminate"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(TransformStreamDefaultController.prototype, Symbol.toStringTag, {
				value: "TransformStreamDefaultController",
				configurable: !0
			}), e.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy, e.CountQueuingStrategy = CountQueuingStrategy, e.ReadableByteStreamController = ReadableByteStreamController, e.ReadableStream = ReadableStream, e.ReadableStreamBYOBReader = ReadableStreamBYOBReader, e.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest, e.ReadableStreamDefaultController = ReadableStreamDefaultController, e.ReadableStreamDefaultReader = ReadableStreamDefaultReader, e.TransformStream = TransformStream, e.TransformStreamDefaultController = TransformStreamDefaultController, e.WritableStream = WritableStream, e.WritableStreamDefaultController = WritableStreamDefaultController, e.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
		});
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-dom@19.2.8+0f58469d5b3bd39f/node_modules/react-dom/cjs/react-dom-server.browser.production.js
	var require_react_dom_server_browser_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		init_ssr();
		var import_ponyfill = require_ponyfill();
		/**
		* @license React
		* react-dom-server.browser.production.js
		*
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var React = require_react();
		var ReactDOM = require_react_dom();
		function formatProdErrorMessage(code) {
			var url = "https://react.dev/errors/" + code;
			if (1 < arguments.length) {
				url += "?args[]=" + encodeURIComponent(arguments[1]);
				for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
			}
			return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
		}
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
		var REACT_PORTAL_TYPE = Symbol.for("react.portal");
		var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
		var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
		var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
		var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
		var REACT_CONTEXT_TYPE = Symbol.for("react.context");
		var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
		var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
		var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
		var REACT_MEMO_TYPE = Symbol.for("react.memo");
		var REACT_LAZY_TYPE = Symbol.for("react.lazy");
		var REACT_SCOPE_TYPE = Symbol.for("react.scope");
		var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
		var REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
		var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
		var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
		var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		var isArrayImpl = Array.isArray;
		function murmurhash3_32_gc(key, seed) {
			var remainder = key.length & 3;
			var bytes = key.length - remainder;
			var h1 = seed;
			for (seed = 0; seed < bytes;) {
				var k1 = key.charCodeAt(seed) & 255 | (key.charCodeAt(++seed) & 255) << 8 | (key.charCodeAt(++seed) & 255) << 16 | (key.charCodeAt(++seed) & 255) << 24;
				++seed;
				k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295;
				k1 = k1 << 15 | k1 >>> 17;
				k1 = 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
				h1 ^= k1;
				h1 = h1 << 13 | h1 >>> 19;
				h1 = 5 * (h1 & 65535) + ((5 * (h1 >>> 16) & 65535) << 16) & 4294967295;
				h1 = (h1 & 65535) + 27492 + (((h1 >>> 16) + 58964 & 65535) << 16);
			}
			k1 = 0;
			switch (remainder) {
				case 3: k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
				case 2: k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
				case 1: k1 ^= key.charCodeAt(seed) & 255, k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295, k1 = k1 << 15 | k1 >>> 17, h1 ^= 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
			}
			h1 ^= key.length;
			h1 ^= h1 >>> 16;
			h1 = 2246822507 * (h1 & 65535) + ((2246822507 * (h1 >>> 16) & 65535) << 16) & 4294967295;
			h1 ^= h1 >>> 13;
			h1 = 3266489909 * (h1 & 65535) + ((3266489909 * (h1 >>> 16) & 65535) << 16) & 4294967295;
			return (h1 ^ h1 >>> 16) >>> 0;
		}
		var channel = new MessageChannelPolyfill();
		var taskQueue = [];
		channel.port1.onmessage = function() {
			var task = taskQueue.shift();
			task && task();
		};
		function scheduleWork(callback) {
			taskQueue.push(callback);
			channel.port2.postMessage(null);
		}
		function handleErrorInNextTick(error) {
			setTimeout(function() {
				throw error;
			});
		}
		var LocalPromise = Promise;
		var scheduleMicrotask = "function" === typeof queueMicrotask ? queueMicrotask : function(callback) {
			LocalPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
		};
		var currentView = null;
		var writtenBytes = 0;
		function writeChunk(destination, chunk) {
			if (0 !== chunk.byteLength) if (2048 < chunk.byteLength) 0 < writtenBytes && (destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes)), currentView = /* @__PURE__ */ new Uint8Array(2048), writtenBytes = 0), destination.enqueue(chunk);
			else {
				var allowableBytes = currentView.length - writtenBytes;
				allowableBytes < chunk.byteLength && (0 === allowableBytes ? destination.enqueue(currentView) : (currentView.set(chunk.subarray(0, allowableBytes), writtenBytes), destination.enqueue(currentView), chunk = chunk.subarray(allowableBytes)), currentView = /* @__PURE__ */ new Uint8Array(2048), writtenBytes = 0);
				currentView.set(chunk, writtenBytes);
				writtenBytes += chunk.byteLength;
			}
		}
		function writeChunkAndReturn(destination, chunk) {
			writeChunk(destination, chunk);
			return !0;
		}
		function completeWriting(destination) {
			currentView && 0 < writtenBytes && (destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes)), currentView = null, writtenBytes = 0);
		}
		var textEncoder = new TextEncoder();
		function stringToChunk(content) {
			return textEncoder.encode(content);
		}
		function stringToPrecomputedChunk(content) {
			return textEncoder.encode(content);
		}
		function byteLengthOfChunk(chunk) {
			return chunk.byteLength;
		}
		function closeWithError(destination, error) {
			"function" === typeof destination.error ? destination.error(error) : destination.close();
		}
		var assign = Object.assign;
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		var VALID_ATTRIBUTE_NAME_REGEX = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
		var illegalAttributeNameCache = {};
		var validatedAttributeNameCache = {};
		function isAttributeNameSafe(attributeName) {
			if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) return !0;
			if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
			if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) return validatedAttributeNameCache[attributeName] = !0;
			illegalAttributeNameCache[attributeName] = !0;
			return !1;
		}
		var unitlessNumbers = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
		var aliases = /* @__PURE__ */ new Map([
			["acceptCharset", "accept-charset"],
			["htmlFor", "for"],
			["httpEquiv", "http-equiv"],
			["crossOrigin", "crossorigin"],
			["accentHeight", "accent-height"],
			["alignmentBaseline", "alignment-baseline"],
			["arabicForm", "arabic-form"],
			["baselineShift", "baseline-shift"],
			["capHeight", "cap-height"],
			["clipPath", "clip-path"],
			["clipRule", "clip-rule"],
			["colorInterpolation", "color-interpolation"],
			["colorInterpolationFilters", "color-interpolation-filters"],
			["colorProfile", "color-profile"],
			["colorRendering", "color-rendering"],
			["dominantBaseline", "dominant-baseline"],
			["enableBackground", "enable-background"],
			["fillOpacity", "fill-opacity"],
			["fillRule", "fill-rule"],
			["floodColor", "flood-color"],
			["floodOpacity", "flood-opacity"],
			["fontFamily", "font-family"],
			["fontSize", "font-size"],
			["fontSizeAdjust", "font-size-adjust"],
			["fontStretch", "font-stretch"],
			["fontStyle", "font-style"],
			["fontVariant", "font-variant"],
			["fontWeight", "font-weight"],
			["glyphName", "glyph-name"],
			["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
			["glyphOrientationVertical", "glyph-orientation-vertical"],
			["horizAdvX", "horiz-adv-x"],
			["horizOriginX", "horiz-origin-x"],
			["imageRendering", "image-rendering"],
			["letterSpacing", "letter-spacing"],
			["lightingColor", "lighting-color"],
			["markerEnd", "marker-end"],
			["markerMid", "marker-mid"],
			["markerStart", "marker-start"],
			["overlinePosition", "overline-position"],
			["overlineThickness", "overline-thickness"],
			["paintOrder", "paint-order"],
			["panose-1", "panose-1"],
			["pointerEvents", "pointer-events"],
			["renderingIntent", "rendering-intent"],
			["shapeRendering", "shape-rendering"],
			["stopColor", "stop-color"],
			["stopOpacity", "stop-opacity"],
			["strikethroughPosition", "strikethrough-position"],
			["strikethroughThickness", "strikethrough-thickness"],
			["strokeDasharray", "stroke-dasharray"],
			["strokeDashoffset", "stroke-dashoffset"],
			["strokeLinecap", "stroke-linecap"],
			["strokeLinejoin", "stroke-linejoin"],
			["strokeMiterlimit", "stroke-miterlimit"],
			["strokeOpacity", "stroke-opacity"],
			["strokeWidth", "stroke-width"],
			["textAnchor", "text-anchor"],
			["textDecoration", "text-decoration"],
			["textRendering", "text-rendering"],
			["transformOrigin", "transform-origin"],
			["underlinePosition", "underline-position"],
			["underlineThickness", "underline-thickness"],
			["unicodeBidi", "unicode-bidi"],
			["unicodeRange", "unicode-range"],
			["unitsPerEm", "units-per-em"],
			["vAlphabetic", "v-alphabetic"],
			["vHanging", "v-hanging"],
			["vIdeographic", "v-ideographic"],
			["vMathematical", "v-mathematical"],
			["vectorEffect", "vector-effect"],
			["vertAdvY", "vert-adv-y"],
			["vertOriginX", "vert-origin-x"],
			["vertOriginY", "vert-origin-y"],
			["wordSpacing", "word-spacing"],
			["writingMode", "writing-mode"],
			["xmlnsXlink", "xmlns:xlink"],
			["xHeight", "x-height"]
		]);
		var matchHtmlRegExp = /["'&<>]/;
		function escapeTextForBrowser(text) {
			if ("boolean" === typeof text || "number" === typeof text || "bigint" === typeof text) return "" + text;
			text = "" + text;
			var match = matchHtmlRegExp.exec(text);
			if (match) {
				var html = "", index, lastIndex = 0;
				for (index = match.index; index < text.length; index++) {
					switch (text.charCodeAt(index)) {
						case 34:
							match = "&quot;";
							break;
						case 38:
							match = "&amp;";
							break;
						case 39:
							match = "&#x27;";
							break;
						case 60:
							match = "&lt;";
							break;
						case 62:
							match = "&gt;";
							break;
						default: continue;
					}
					lastIndex !== index && (html += text.slice(lastIndex, index));
					lastIndex = index + 1;
					html += match;
				}
				text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
			}
			return text;
		}
		var uppercasePattern = /([A-Z])/g;
		var msPattern = /^ms-/;
		var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
		function sanitizeURL(url) {
			return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
		}
		var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		var sharedNotPendingObject = {
			pending: !1,
			data: null,
			method: null,
			action: null
		};
		var previousDispatcher = ReactDOMSharedInternals.d;
		ReactDOMSharedInternals.d = {
			f: previousDispatcher.f,
			r: previousDispatcher.r,
			D: prefetchDNS,
			C: preconnect,
			L: preload,
			m: preloadModule,
			X: preinitScript,
			S: preinitStyle,
			M: preinitModuleScript
		};
		var PRELOAD_NO_CREDS = [];
		var currentlyFlushingRenderState = null;
		stringToPrecomputedChunk("\"></template>");
		var startInlineScript = stringToPrecomputedChunk("<script");
		var endInlineScript = stringToPrecomputedChunk("<\/script>");
		var startScriptSrc = stringToPrecomputedChunk("<script src=\"");
		var startModuleSrc = stringToPrecomputedChunk("<script type=\"module\" src=\"");
		var scriptNonce = stringToPrecomputedChunk(" nonce=\"");
		var scriptIntegirty = stringToPrecomputedChunk(" integrity=\"");
		var scriptCrossOrigin = stringToPrecomputedChunk(" crossorigin=\"");
		var endAsyncScript = stringToPrecomputedChunk(" async=\"\"><\/script>");
		var startInlineStyle = stringToPrecomputedChunk("<style");
		var scriptRegex = /(<\/|<)(s)(cript)/gi;
		function scriptReplacer(match, prefix, s, suffix) {
			return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
		}
		var importMapScriptStart = stringToPrecomputedChunk("<script type=\"importmap\">");
		var importMapScriptEnd = stringToPrecomputedChunk("<\/script>");
		function createRenderState(resumableState, nonce, externalRuntimeConfig, importMap, onHeaders, maxHeadersLength) {
			externalRuntimeConfig = "string" === typeof nonce ? nonce : nonce && nonce.script;
			var inlineScriptWithNonce = void 0 === externalRuntimeConfig ? startInlineScript : stringToPrecomputedChunk("<script nonce=\"" + escapeTextForBrowser(externalRuntimeConfig) + "\""), nonceStyle = "string" === typeof nonce ? void 0 : nonce && nonce.style, inlineStyleWithNonce = void 0 === nonceStyle ? startInlineStyle : stringToPrecomputedChunk("<style nonce=\"" + escapeTextForBrowser(nonceStyle) + "\""), idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
			void 0 !== bootstrapScriptContent && (bootstrapChunks.push(inlineScriptWithNonce), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, stringToChunk(("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer)), endInlineScript));
			bootstrapScriptContent = [];
			void 0 !== importMap && (bootstrapScriptContent.push(importMapScriptStart), bootstrapScriptContent.push(stringToChunk(("" + JSON.stringify(importMap)).replace(scriptRegex, scriptReplacer))), bootstrapScriptContent.push(importMapScriptEnd));
			importMap = onHeaders ? {
				preconnects: "",
				fontPreloads: "",
				highImagePreloads: "",
				remainingCapacity: 2 + ("number" === typeof maxHeadersLength ? maxHeadersLength : 2e3)
			} : null;
			onHeaders = {
				placeholderPrefix: stringToPrecomputedChunk(idPrefix + "P:"),
				segmentPrefix: stringToPrecomputedChunk(idPrefix + "S:"),
				boundaryPrefix: stringToPrecomputedChunk(idPrefix + "B:"),
				startInlineScript: inlineScriptWithNonce,
				startInlineStyle: inlineStyleWithNonce,
				preamble: createPreambleState(),
				externalRuntimeScript: null,
				bootstrapChunks,
				importMapChunks: bootstrapScriptContent,
				onHeaders,
				headers: importMap,
				resets: {
					font: {},
					dns: {},
					connect: {
						default: {},
						anonymous: {},
						credentials: {}
					},
					image: {},
					style: {}
				},
				charsetChunks: [],
				viewportChunks: [],
				hoistableChunks: [],
				preconnects: /* @__PURE__ */ new Set(),
				fontPreloads: /* @__PURE__ */ new Set(),
				highImagePreloads: /* @__PURE__ */ new Set(),
				styles: /* @__PURE__ */ new Map(),
				bootstrapScripts: /* @__PURE__ */ new Set(),
				scripts: /* @__PURE__ */ new Set(),
				bulkPreloads: /* @__PURE__ */ new Set(),
				preloads: {
					images: /* @__PURE__ */ new Map(),
					stylesheets: /* @__PURE__ */ new Map(),
					scripts: /* @__PURE__ */ new Map(),
					moduleScripts: /* @__PURE__ */ new Map()
				},
				nonce: {
					script: externalRuntimeConfig,
					style: nonceStyle
				},
				hoistableState: null,
				stylesToHoist: !1
			};
			if (void 0 !== bootstrapScripts) for (importMap = 0; importMap < bootstrapScripts.length; importMap++) idPrefix = bootstrapScripts[importMap], nonceStyle = inlineScriptWithNonce = void 0, inlineStyleWithNonce = {
				rel: "preload",
				as: "script",
				fetchPriority: "low",
				nonce
			}, "string" === typeof idPrefix ? inlineStyleWithNonce.href = maxHeadersLength = idPrefix : (inlineStyleWithNonce.href = maxHeadersLength = idPrefix.src, inlineStyleWithNonce.integrity = nonceStyle = "string" === typeof idPrefix.integrity ? idPrefix.integrity : void 0, inlineStyleWithNonce.crossOrigin = inlineScriptWithNonce = "string" === typeof idPrefix || null == idPrefix.crossOrigin ? void 0 : "use-credentials" === idPrefix.crossOrigin ? "use-credentials" : ""), idPrefix = resumableState, bootstrapScriptContent = maxHeadersLength, idPrefix.scriptResources[bootstrapScriptContent] = null, idPrefix.moduleScriptResources[bootstrapScriptContent] = null, idPrefix = [], pushLinkImpl(idPrefix, inlineStyleWithNonce), onHeaders.bootstrapScripts.add(idPrefix), bootstrapChunks.push(startScriptSrc, stringToChunk(escapeTextForBrowser(maxHeadersLength)), attributeEnd), externalRuntimeConfig && bootstrapChunks.push(scriptNonce, stringToChunk(escapeTextForBrowser(externalRuntimeConfig)), attributeEnd), "string" === typeof nonceStyle && bootstrapChunks.push(scriptIntegirty, stringToChunk(escapeTextForBrowser(nonceStyle)), attributeEnd), "string" === typeof inlineScriptWithNonce && bootstrapChunks.push(scriptCrossOrigin, stringToChunk(escapeTextForBrowser(inlineScriptWithNonce)), attributeEnd), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endAsyncScript);
			if (void 0 !== bootstrapModules) for (nonce = 0; nonce < bootstrapModules.length; nonce++) nonceStyle = bootstrapModules[nonce], maxHeadersLength = importMap = void 0, inlineScriptWithNonce = {
				rel: "modulepreload",
				fetchPriority: "low",
				nonce: externalRuntimeConfig
			}, "string" === typeof nonceStyle ? inlineScriptWithNonce.href = bootstrapScripts = nonceStyle : (inlineScriptWithNonce.href = bootstrapScripts = nonceStyle.src, inlineScriptWithNonce.integrity = maxHeadersLength = "string" === typeof nonceStyle.integrity ? nonceStyle.integrity : void 0, inlineScriptWithNonce.crossOrigin = importMap = "string" === typeof nonceStyle || null == nonceStyle.crossOrigin ? void 0 : "use-credentials" === nonceStyle.crossOrigin ? "use-credentials" : ""), nonceStyle = resumableState, inlineStyleWithNonce = bootstrapScripts, nonceStyle.scriptResources[inlineStyleWithNonce] = null, nonceStyle.moduleScriptResources[inlineStyleWithNonce] = null, nonceStyle = [], pushLinkImpl(nonceStyle, inlineScriptWithNonce), onHeaders.bootstrapScripts.add(nonceStyle), bootstrapChunks.push(startModuleSrc, stringToChunk(escapeTextForBrowser(bootstrapScripts)), attributeEnd), externalRuntimeConfig && bootstrapChunks.push(scriptNonce, stringToChunk(escapeTextForBrowser(externalRuntimeConfig)), attributeEnd), "string" === typeof maxHeadersLength && bootstrapChunks.push(scriptIntegirty, stringToChunk(escapeTextForBrowser(maxHeadersLength)), attributeEnd), "string" === typeof importMap && bootstrapChunks.push(scriptCrossOrigin, stringToChunk(escapeTextForBrowser(importMap)), attributeEnd), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endAsyncScript);
			return onHeaders;
		}
		function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
			return {
				idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
				nextFormID: 0,
				streamingFormat: 0,
				bootstrapScriptContent,
				bootstrapScripts,
				bootstrapModules,
				instructions: 0,
				hasBody: !1,
				hasHtml: !1,
				unknownResources: {},
				dnsResources: {},
				connectResources: {
					default: {},
					anonymous: {},
					credentials: {}
				},
				imageResources: {},
				styleResources: {},
				scriptResources: {},
				moduleUnknownResources: {},
				moduleScriptResources: {}
			};
		}
		function createPreambleState() {
			return {
				htmlChunks: null,
				headChunks: null,
				bodyChunks: null
			};
		}
		function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
			return {
				insertionMode,
				selectedValue,
				tagScope,
				viewTransition
			};
		}
		function createRootFormatContext(namespaceURI) {
			return createFormatContext("http://www.w3.org/2000/svg" === namespaceURI ? 4 : "http://www.w3.org/1998/Math/MathML" === namespaceURI ? 5 : 0, null, 0, null);
		}
		function getChildFormatContext(parentContext, type, props) {
			var subtreeScope = parentContext.tagScope & -25;
			switch (type) {
				case "noscript": return createFormatContext(2, null, subtreeScope | 1, null);
				case "select": return createFormatContext(2, null != props.value ? props.value : props.defaultValue, subtreeScope, null);
				case "svg": return createFormatContext(4, null, subtreeScope, null);
				case "picture": return createFormatContext(2, null, subtreeScope | 2, null);
				case "math": return createFormatContext(5, null, subtreeScope, null);
				case "foreignObject": return createFormatContext(2, null, subtreeScope, null);
				case "table": return createFormatContext(6, null, subtreeScope, null);
				case "thead":
				case "tbody":
				case "tfoot": return createFormatContext(7, null, subtreeScope, null);
				case "colgroup": return createFormatContext(9, null, subtreeScope, null);
				case "tr": return createFormatContext(8, null, subtreeScope, null);
				case "head":
					if (2 > parentContext.insertionMode) return createFormatContext(3, null, subtreeScope, null);
					break;
				case "html": if (0 === parentContext.insertionMode) return createFormatContext(1, null, subtreeScope, null);
			}
			return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode ? createFormatContext(2, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null) : parentContext;
		}
		function getSuspenseViewTransition(parentViewTransition) {
			return null === parentViewTransition ? null : {
				update: parentViewTransition.update,
				enter: "none",
				exit: "none",
				share: parentViewTransition.update,
				name: parentViewTransition.autoName,
				autoName: parentViewTransition.autoName,
				nameIdx: 0
			};
		}
		function getSuspenseFallbackFormatContext(resumableState, parentContext) {
			parentContext.tagScope & 32 && (resumableState.instructions |= 128);
			return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | 12, getSuspenseViewTransition(parentContext.viewTransition));
		}
		function getSuspenseContentFormatContext(resumableState, parentContext) {
			resumableState = getSuspenseViewTransition(parentContext.viewTransition);
			var subtreeScope = parentContext.tagScope | 16;
			null !== resumableState && "none" !== resumableState.share && (subtreeScope |= 64);
			return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, resumableState);
		}
		var textSeparator = stringToPrecomputedChunk("<!-- -->");
		function pushTextInstance(target, text, renderState, textEmbedded) {
			if ("" === text) return textEmbedded;
			textEmbedded && target.push(textSeparator);
			target.push(stringToChunk(escapeTextForBrowser(text)));
			return !0;
		}
		var styleNameCache = /* @__PURE__ */ new Map();
		var styleAttributeStart = stringToPrecomputedChunk(" style=\"");
		var styleAssign = stringToPrecomputedChunk(":");
		var styleSeparator = stringToPrecomputedChunk(";");
		function pushStyleAttribute(target, style) {
			if ("object" !== typeof style) throw Error(formatProdErrorMessage(62));
			var isFirst = !0, styleName;
			for (styleName in style) if (hasOwnProperty.call(style, styleName)) {
				var styleValue = style[styleName];
				if (null != styleValue && "boolean" !== typeof styleValue && "" !== styleValue) {
					if (0 === styleName.indexOf("--")) {
						var nameChunk = stringToChunk(escapeTextForBrowser(styleName));
						styleValue = stringToChunk(escapeTextForBrowser(("" + styleValue).trim()));
					} else nameChunk = styleNameCache.get(styleName), void 0 === nameChunk && (nameChunk = stringToPrecomputedChunk(escapeTextForBrowser(styleName.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-"))), styleNameCache.set(styleName, nameChunk)), styleValue = "number" === typeof styleValue ? 0 === styleValue || unitlessNumbers.has(styleName) ? stringToChunk("" + styleValue) : stringToChunk(styleValue + "px") : stringToChunk(escapeTextForBrowser(("" + styleValue).trim()));
					isFirst ? (isFirst = !1, target.push(styleAttributeStart, nameChunk, styleAssign, styleValue)) : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
				}
			}
			isFirst || target.push(attributeEnd);
		}
		var attributeSeparator = stringToPrecomputedChunk(" ");
		var attributeAssign = stringToPrecomputedChunk("=\"");
		var attributeEnd = stringToPrecomputedChunk("\"");
		var attributeEmptyString = stringToPrecomputedChunk("=\"\"");
		function pushBooleanAttribute(target, name, value) {
			value && "function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
		}
		function pushStringAttribute(target, name, value) {
			"function" !== typeof value && "symbol" !== typeof value && "boolean" !== typeof value && target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
		}
		var actionJavaScriptURL = stringToPrecomputedChunk(escapeTextForBrowser("javascript:throw new Error('React form unexpectedly submitted.')"));
		var startHiddenInputChunk = stringToPrecomputedChunk("<input type=\"hidden\"");
		function pushAdditionalFormField(value, key) {
			this.push(startHiddenInputChunk);
			validateAdditionalFormField(value);
			pushStringAttribute(this, "name", key);
			pushStringAttribute(this, "value", value);
			this.push(endOfStartTagSelfClosing);
		}
		function validateAdditionalFormField(value) {
			if ("string" !== typeof value) throw Error(formatProdErrorMessage(480));
		}
		function getCustomFormFields(resumableState, formAction) {
			if ("function" === typeof formAction.$$FORM_ACTION) {
				var id = resumableState.nextFormID++;
				resumableState = resumableState.idPrefix + id;
				try {
					var customFields = formAction.$$FORM_ACTION(resumableState);
					if (customFields) customFields.data?.forEach(validateAdditionalFormField);
					return customFields;
				} catch (x) {
					if ("object" === typeof x && null !== x && "function" === typeof x.then) throw x;
				}
			}
			return null;
		}
		function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
			var formData = null;
			if ("function" === typeof formAction) {
				var customFields = getCustomFormFields(resumableState, formAction);
				null !== customFields ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(attributeSeparator, stringToChunk("formAction"), attributeAssign, actionJavaScriptURL, attributeEnd), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
			}
			null != name && pushAttribute(target, "name", name);
			null != formAction && pushAttribute(target, "formAction", formAction);
			null != formEncType && pushAttribute(target, "formEncType", formEncType);
			null != formMethod && pushAttribute(target, "formMethod", formMethod);
			null != formTarget && pushAttribute(target, "formTarget", formTarget);
			return formData;
		}
		function pushAttribute(target, name, value) {
			switch (name) {
				case "className":
					pushStringAttribute(target, "class", value);
					break;
				case "tabIndex":
					pushStringAttribute(target, "tabindex", value);
					break;
				case "dir":
				case "role":
				case "viewBox":
				case "width":
				case "height":
					pushStringAttribute(target, name, value);
					break;
				case "style":
					pushStyleAttribute(target, value);
					break;
				case "src":
				case "href": if ("" === value) break;
				case "action":
				case "formAction":
					if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) break;
					value = sanitizeURL("" + value);
					target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "defaultValue":
				case "defaultChecked":
				case "innerHTML":
				case "suppressContentEditableWarning":
				case "suppressHydrationWarning":
				case "ref": break;
				case "autoFocus":
				case "multiple":
				case "muted":
					pushBooleanAttribute(target, name.toLowerCase(), value);
					break;
				case "xlinkHref":
					if ("function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) break;
					value = sanitizeURL("" + value);
					target.push(attributeSeparator, stringToChunk("xlink:href"), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "contentEditable":
				case "spellCheck":
				case "draggable":
				case "value":
				case "autoReverse":
				case "externalResourcesRequired":
				case "focusable":
				case "preserveAlpha":
					"function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "inert":
				case "allowFullScreen":
				case "async":
				case "autoPlay":
				case "controls":
				case "default":
				case "defer":
				case "disabled":
				case "disablePictureInPicture":
				case "disableRemotePlayback":
				case "formNoValidate":
				case "hidden":
				case "loop":
				case "noModule":
				case "noValidate":
				case "open":
				case "playsInline":
				case "readOnly":
				case "required":
				case "reversed":
				case "scoped":
				case "seamless":
				case "itemScope":
					value && "function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
					break;
				case "capture":
				case "download":
					!0 === value ? target.push(attributeSeparator, stringToChunk(name), attributeEmptyString) : !1 !== value && "function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "cols":
				case "rows":
				case "size":
				case "span":
					"function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value && target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "rowSpan":
				case "start":
					"function" === typeof value || "symbol" === typeof value || isNaN(value) || target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					break;
				case "xlinkActuate":
					pushStringAttribute(target, "xlink:actuate", value);
					break;
				case "xlinkArcrole":
					pushStringAttribute(target, "xlink:arcrole", value);
					break;
				case "xlinkRole":
					pushStringAttribute(target, "xlink:role", value);
					break;
				case "xlinkShow":
					pushStringAttribute(target, "xlink:show", value);
					break;
				case "xlinkTitle":
					pushStringAttribute(target, "xlink:title", value);
					break;
				case "xlinkType":
					pushStringAttribute(target, "xlink:type", value);
					break;
				case "xmlBase":
					pushStringAttribute(target, "xml:base", value);
					break;
				case "xmlLang":
					pushStringAttribute(target, "xml:lang", value);
					break;
				case "xmlSpace":
					pushStringAttribute(target, "xml:space", value);
					break;
				default: if (!(2 < name.length) || "o" !== name[0] && "O" !== name[0] || "n" !== name[1] && "N" !== name[1]) {
					if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
						switch (typeof value) {
							case "function":
							case "symbol": return;
							case "boolean":
								var prefix$8 = name.toLowerCase().slice(0, 5);
								if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
						}
						target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
					}
				}
			}
		}
		var endOfStartTag = stringToPrecomputedChunk(">");
		var endOfStartTagSelfClosing = stringToPrecomputedChunk("/>");
		function pushInnerHTML(target, innerHTML, children) {
			if (null != innerHTML) {
				if (null != children) throw Error(formatProdErrorMessage(60));
				if ("object" !== typeof innerHTML || !("__html" in innerHTML)) throw Error(formatProdErrorMessage(61));
				innerHTML = innerHTML.__html;
				null !== innerHTML && void 0 !== innerHTML && target.push(stringToChunk("" + innerHTML));
			}
		}
		function flattenOptionChildren(children) {
			var content = "";
			React.Children.forEach(children, function(child) {
				null != child && (content += child);
			});
			return content;
		}
		var selectedMarkerAttribute = stringToPrecomputedChunk(" selected=\"\"");
		var formReplayingRuntimeScript = stringToPrecomputedChunk("addEventListener(\"submit\",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute(\"formAction\");null!=f&&(e=f,b=null)}\"javascript:throw new Error('React form unexpectedly submitted.')\"===e&&(a.preventDefault(),b?(a=document.createElement(\"input\"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});");
		function injectFormReplayingRuntime(resumableState, renderState) {
			if (0 === (resumableState.instructions & 16)) {
				resumableState.instructions |= 16;
				var preamble = renderState.preamble, bootstrapChunks = renderState.bootstrapChunks;
				(preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, formReplayingRuntimeScript, endInlineScript)) : bootstrapChunks.unshift(renderState.startInlineScript, endOfStartTag, formReplayingRuntimeScript, endInlineScript);
			}
		}
		var formStateMarkerIsMatching = stringToPrecomputedChunk("<!--F!-->");
		var formStateMarkerIsNotMatching = stringToPrecomputedChunk("<!--F-->");
		function pushLinkImpl(target, props) {
			target.push(startChunkForTag("link"));
			for (var propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "link"));
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTagSelfClosing);
			return null;
		}
		var styleRegex = /(<\/|<)(s)(tyle)/gi;
		function styleReplacer(match, prefix, s, suffix) {
			return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
		}
		function pushSelfClosing(target, props, tag) {
			target.push(startChunkForTag(tag));
			for (var propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, tag));
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTagSelfClosing);
			return null;
		}
		function pushTitleImpl(target, props) {
			target.push(startChunkForTag("title"));
			var children = null, innerHTML = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						children = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTag);
			props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
			"function" !== typeof props && "symbol" !== typeof props && null !== props && void 0 !== props && target.push(stringToChunk(escapeTextForBrowser("" + props)));
			pushInnerHTML(target, innerHTML, children);
			target.push(endChunkForTag("title"));
			return null;
		}
		var headPreambleContributionChunk = stringToPrecomputedChunk("<!--head-->");
		var bodyPreambleContributionChunk = stringToPrecomputedChunk("<!--body-->");
		var htmlPreambleContributionChunk = stringToPrecomputedChunk("<!--html-->");
		function pushScriptImpl(target, props) {
			target.push(startChunkForTag("script"));
			var children = null, innerHTML = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						children = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTag);
			pushInnerHTML(target, innerHTML, children);
			"string" === typeof children && target.push(stringToChunk(("" + children).replace(scriptRegex, scriptReplacer)));
			target.push(endChunkForTag("script"));
			return null;
		}
		function pushStartSingletonElement(target, props, tag) {
			target.push(startChunkForTag(tag));
			var innerHTML = tag = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						tag = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTag);
			pushInnerHTML(target, innerHTML, tag);
			return tag;
		}
		function pushStartGenericElement(target, props, tag) {
			target.push(startChunkForTag(tag));
			var innerHTML = tag = null, propKey;
			for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
				var propValue = props[propKey];
				if (null != propValue) switch (propKey) {
					case "children":
						tag = propValue;
						break;
					case "dangerouslySetInnerHTML":
						innerHTML = propValue;
						break;
					default: pushAttribute(target, propKey, propValue);
				}
			}
			target.push(endOfStartTag);
			pushInnerHTML(target, innerHTML, tag);
			return "string" === typeof tag ? (target.push(stringToChunk(escapeTextForBrowser(tag))), null) : tag;
		}
		var leadingNewline = stringToPrecomputedChunk("\n");
		var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
		var validatedTagCache = /* @__PURE__ */ new Map();
		function startChunkForTag(tag) {
			var tagStartChunk = validatedTagCache.get(tag);
			if (void 0 === tagStartChunk) {
				if (!VALID_TAG_REGEX.test(tag)) throw Error(formatProdErrorMessage(65, tag));
				tagStartChunk = stringToPrecomputedChunk("<" + tag);
				validatedTagCache.set(tag, tagStartChunk);
			}
			return tagStartChunk;
		}
		var doctypeChunk = stringToPrecomputedChunk("<!DOCTYPE html>");
		function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
			switch (type) {
				case "div":
				case "span":
				case "svg":
				case "path": break;
				case "a":
					target$jscomp$0.push(startChunkForTag("a"));
					var children = null, innerHTML = null, propKey;
					for (propKey in props) if (hasOwnProperty.call(props, propKey)) {
						var propValue = props[propKey];
						if (null != propValue) switch (propKey) {
							case "children":
								children = propValue;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML = propValue;
								break;
							case "href":
								"" === propValue ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
								break;
							default: pushAttribute(target$jscomp$0, propKey, propValue);
						}
					}
					target$jscomp$0.push(endOfStartTag);
					pushInnerHTML(target$jscomp$0, innerHTML, children);
					if ("string" === typeof children) {
						target$jscomp$0.push(stringToChunk(escapeTextForBrowser(children)));
						var JSCompiler_inline_result = null;
					} else JSCompiler_inline_result = children;
					return JSCompiler_inline_result;
				case "g":
				case "p":
				case "li": break;
				case "select":
					target$jscomp$0.push(startChunkForTag("select"));
					var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
					for (propKey$jscomp$0 in props) if (hasOwnProperty.call(props, propKey$jscomp$0)) {
						var propValue$jscomp$0 = props[propKey$jscomp$0];
						if (null != propValue$jscomp$0) switch (propKey$jscomp$0) {
							case "children":
								children$jscomp$0 = propValue$jscomp$0;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$0 = propValue$jscomp$0;
								break;
							case "defaultValue":
							case "value": break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$0, propValue$jscomp$0);
						}
					}
					target$jscomp$0.push(endOfStartTag);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
					return children$jscomp$0;
				case "option":
					var selectedValue = formatContext.selectedValue;
					target$jscomp$0.push(startChunkForTag("option"));
					var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
					for (propKey$jscomp$1 in props) if (hasOwnProperty.call(props, propKey$jscomp$1)) {
						var propValue$jscomp$1 = props[propKey$jscomp$1];
						if (null != propValue$jscomp$1) switch (propKey$jscomp$1) {
							case "children":
								children$jscomp$1 = propValue$jscomp$1;
								break;
							case "selected":
								selected = propValue$jscomp$1;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$1 = propValue$jscomp$1;
								break;
							case "value": value = propValue$jscomp$1;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$1, propValue$jscomp$1);
						}
					}
					if (null != selectedValue) {
						var stringValue = null !== value ? "" + value : flattenOptionChildren(children$jscomp$1);
						if (isArrayImpl(selectedValue)) {
							for (var i = 0; i < selectedValue.length; i++) if ("" + selectedValue[i] === stringValue) {
								target$jscomp$0.push(selectedMarkerAttribute);
								break;
							}
						} else "" + selectedValue === stringValue && target$jscomp$0.push(selectedMarkerAttribute);
					} else selected && target$jscomp$0.push(selectedMarkerAttribute);
					target$jscomp$0.push(endOfStartTag);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
					return children$jscomp$1;
				case "textarea":
					target$jscomp$0.push(startChunkForTag("textarea"));
					var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
					for (propKey$jscomp$2 in props) if (hasOwnProperty.call(props, propKey$jscomp$2)) {
						var propValue$jscomp$2 = props[propKey$jscomp$2];
						if (null != propValue$jscomp$2) switch (propKey$jscomp$2) {
							case "children":
								children$jscomp$2 = propValue$jscomp$2;
								break;
							case "value":
								value$jscomp$0 = propValue$jscomp$2;
								break;
							case "defaultValue":
								defaultValue = propValue$jscomp$2;
								break;
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(91));
							default: pushAttribute(target$jscomp$0, propKey$jscomp$2, propValue$jscomp$2);
						}
					}
					null === value$jscomp$0 && null !== defaultValue && (value$jscomp$0 = defaultValue);
					target$jscomp$0.push(endOfStartTag);
					if (null != children$jscomp$2) {
						if (null != value$jscomp$0) throw Error(formatProdErrorMessage(92));
						if (isArrayImpl(children$jscomp$2)) {
							if (1 < children$jscomp$2.length) throw Error(formatProdErrorMessage(93));
							value$jscomp$0 = "" + children$jscomp$2[0];
						}
						value$jscomp$0 = "" + children$jscomp$2;
					}
					"string" === typeof value$jscomp$0 && "\n" === value$jscomp$0[0] && target$jscomp$0.push(leadingNewline);
					null !== value$jscomp$0 && target$jscomp$0.push(stringToChunk(escapeTextForBrowser("" + value$jscomp$0)));
					return null;
				case "input":
					target$jscomp$0.push(startChunkForTag("input"));
					var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
					for (propKey$jscomp$3 in props) if (hasOwnProperty.call(props, propKey$jscomp$3)) {
						var propValue$jscomp$3 = props[propKey$jscomp$3];
						if (null != propValue$jscomp$3) switch (propKey$jscomp$3) {
							case "children":
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "input"));
							case "name":
								name = propValue$jscomp$3;
								break;
							case "formAction":
								formAction = propValue$jscomp$3;
								break;
							case "formEncType":
								formEncType = propValue$jscomp$3;
								break;
							case "formMethod":
								formMethod = propValue$jscomp$3;
								break;
							case "formTarget":
								formTarget = propValue$jscomp$3;
								break;
							case "defaultChecked":
								defaultChecked = propValue$jscomp$3;
								break;
							case "defaultValue":
								defaultValue$jscomp$0 = propValue$jscomp$3;
								break;
							case "checked":
								checked = propValue$jscomp$3;
								break;
							case "value":
								value$jscomp$1 = propValue$jscomp$3;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$3, propValue$jscomp$3);
						}
					}
					var formData = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);
					null !== checked ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : null !== defaultChecked && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
					null !== value$jscomp$1 ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : null !== defaultValue$jscomp$0 && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
					target$jscomp$0.push(endOfStartTagSelfClosing);
					formData?.forEach(pushAdditionalFormField, target$jscomp$0);
					return null;
				case "button":
					target$jscomp$0.push(startChunkForTag("button"));
					var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
					for (propKey$jscomp$4 in props) if (hasOwnProperty.call(props, propKey$jscomp$4)) {
						var propValue$jscomp$4 = props[propKey$jscomp$4];
						if (null != propValue$jscomp$4) switch (propKey$jscomp$4) {
							case "children":
								children$jscomp$3 = propValue$jscomp$4;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$2 = propValue$jscomp$4;
								break;
							case "name":
								name$jscomp$0 = propValue$jscomp$4;
								break;
							case "formAction":
								formAction$jscomp$0 = propValue$jscomp$4;
								break;
							case "formEncType":
								formEncType$jscomp$0 = propValue$jscomp$4;
								break;
							case "formMethod":
								formMethod$jscomp$0 = propValue$jscomp$4;
								break;
							case "formTarget":
								formTarget$jscomp$0 = propValue$jscomp$4;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$4, propValue$jscomp$4);
						}
					}
					var formData$jscomp$0 = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction$jscomp$0, formEncType$jscomp$0, formMethod$jscomp$0, formTarget$jscomp$0, name$jscomp$0);
					target$jscomp$0.push(endOfStartTag);
					formData$jscomp$0?.forEach(pushAdditionalFormField, target$jscomp$0);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
					if ("string" === typeof children$jscomp$3) {
						target$jscomp$0.push(stringToChunk(escapeTextForBrowser(children$jscomp$3)));
						var JSCompiler_inline_result$jscomp$0 = null;
					} else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
					return JSCompiler_inline_result$jscomp$0;
				case "form":
					target$jscomp$0.push(startChunkForTag("form"));
					var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
					for (propKey$jscomp$5 in props) if (hasOwnProperty.call(props, propKey$jscomp$5)) {
						var propValue$jscomp$5 = props[propKey$jscomp$5];
						if (null != propValue$jscomp$5) switch (propKey$jscomp$5) {
							case "children":
								children$jscomp$4 = propValue$jscomp$5;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$3 = propValue$jscomp$5;
								break;
							case "action":
								formAction$jscomp$1 = propValue$jscomp$5;
								break;
							case "encType":
								formEncType$jscomp$1 = propValue$jscomp$5;
								break;
							case "method":
								formMethod$jscomp$1 = propValue$jscomp$5;
								break;
							case "target":
								formTarget$jscomp$1 = propValue$jscomp$5;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$5, propValue$jscomp$5);
						}
					}
					var formData$jscomp$1 = null, formActionName = null;
					if ("function" === typeof formAction$jscomp$1) {
						var customFields = getCustomFormFields(resumableState, formAction$jscomp$1);
						null !== customFields ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(attributeSeparator, stringToChunk("action"), attributeAssign, actionJavaScriptURL, attributeEnd), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
					}
					null != formAction$jscomp$1 && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
					null != formEncType$jscomp$1 && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
					null != formMethod$jscomp$1 && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
					null != formTarget$jscomp$1 && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
					target$jscomp$0.push(endOfStartTag);
					null !== formActionName && (target$jscomp$0.push(startHiddenInputChunk), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push(endOfStartTagSelfClosing), formData$jscomp$1?.forEach(pushAdditionalFormField, target$jscomp$0));
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
					if ("string" === typeof children$jscomp$4) {
						target$jscomp$0.push(stringToChunk(escapeTextForBrowser(children$jscomp$4)));
						var JSCompiler_inline_result$jscomp$1 = null;
					} else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
					return JSCompiler_inline_result$jscomp$1;
				case "menuitem":
					target$jscomp$0.push(startChunkForTag("menuitem"));
					for (var propKey$jscomp$6 in props) if (hasOwnProperty.call(props, propKey$jscomp$6)) {
						var propValue$jscomp$6 = props[propKey$jscomp$6];
						if (null != propValue$jscomp$6) switch (propKey$jscomp$6) {
							case "children":
							case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(400));
							default: pushAttribute(target$jscomp$0, propKey$jscomp$6, propValue$jscomp$6);
						}
					}
					target$jscomp$0.push(endOfStartTag);
					return null;
				case "object":
					target$jscomp$0.push(startChunkForTag("object"));
					var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
					for (propKey$jscomp$7 in props) if (hasOwnProperty.call(props, propKey$jscomp$7)) {
						var propValue$jscomp$7 = props[propKey$jscomp$7];
						if (null != propValue$jscomp$7) switch (propKey$jscomp$7) {
							case "children":
								children$jscomp$5 = propValue$jscomp$7;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$4 = propValue$jscomp$7;
								break;
							case "data":
								var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
								if ("" === sanitizedValue) break;
								target$jscomp$0.push(attributeSeparator, stringToChunk("data"), attributeAssign, stringToChunk(escapeTextForBrowser(sanitizedValue)), attributeEnd);
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$7, propValue$jscomp$7);
						}
					}
					target$jscomp$0.push(endOfStartTag);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
					if ("string" === typeof children$jscomp$5) {
						target$jscomp$0.push(stringToChunk(escapeTextForBrowser(children$jscomp$5)));
						var JSCompiler_inline_result$jscomp$2 = null;
					} else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
					return JSCompiler_inline_result$jscomp$2;
				case "title":
					var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
					if (4 === formatContext.insertionMode || noscriptTagInScope || null != props.itemProp) var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(target$jscomp$0, props);
					else isFallback ? JSCompiler_inline_result$jscomp$3 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$3 = void 0);
					return JSCompiler_inline_result$jscomp$3;
				case "link":
					var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$0 || null != props.itemProp || "string" !== typeof rel || "string" !== typeof href || "" === href) {
						pushLinkImpl(target$jscomp$0, props);
						var JSCompiler_inline_result$jscomp$4 = null;
					} else if ("stylesheet" === props.rel) if ("string" !== typeof precedence || null != props.disabled || props.onLoad || props.onError) JSCompiler_inline_result$jscomp$4 = pushLinkImpl(target$jscomp$0, props);
					else {
						var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
						if (null !== resourceState) {
							resumableState.styleResources[href] = null;
							styleQueue || (styleQueue = {
								precedence: stringToChunk(escapeTextForBrowser(precedence)),
								rules: [],
								hrefs: [],
								sheets: /* @__PURE__ */ new Map()
							}, renderState.styles.set(precedence, styleQueue));
							var resource = {
								state: 0,
								props: assign({}, props, {
									"data-precedence": props.precedence,
									precedence: null
								})
							};
							if (resourceState) {
								2 === resourceState.length && adoptPreloadCredentials(resource.props, resourceState);
								var preloadResource = renderState.preloads.stylesheets.get(href);
								preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = 1;
							}
							styleQueue.sheets.set(href, resource);
							hoistableState && hoistableState.stylesheets.add(resource);
						} else if (styleQueue) {
							var resource$9 = styleQueue.sheets.get(href);
							resource$9 && hoistableState && hoistableState.stylesheets.add(resource$9);
						}
						textEmbedded && target$jscomp$0.push(textSeparator);
						JSCompiler_inline_result$jscomp$4 = null;
					}
					else props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$4 = pushLinkImpl(target$jscomp$0, props) : (textEmbedded && target$jscomp$0.push(textSeparator), JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
					return JSCompiler_inline_result$jscomp$4;
				case "script":
					var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
					if ("string" !== typeof props.src || !props.src || !asyncProp || "function" === typeof asyncProp || "symbol" === typeof asyncProp || props.onLoad || props.onError || 4 === formatContext.insertionMode || noscriptTagInScope$jscomp$1 || null != props.itemProp) var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(target$jscomp$0, props);
					else {
						var key = props.src;
						if ("module" === props.type) {
							var resources = resumableState.moduleScriptResources;
							var preloads = renderState.preloads.moduleScripts;
						} else resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
						var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : void 0;
						if (null !== resourceState$jscomp$0) {
							resources[key] = null;
							var scriptProps = props;
							if (resourceState$jscomp$0) {
								2 === resourceState$jscomp$0.length && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
								var preloadResource$jscomp$0 = preloads.get(key);
								preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
							}
							var resource$jscomp$0 = [];
							renderState.scripts.add(resource$jscomp$0);
							pushScriptImpl(resource$jscomp$0, scriptProps);
						}
						textEmbedded && target$jscomp$0.push(textSeparator);
						JSCompiler_inline_result$jscomp$5 = null;
					}
					return JSCompiler_inline_result$jscomp$5;
				case "style":
					var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1, precedence$jscomp$0 = props.precedence, href$jscomp$0 = props.href, nonce = props.nonce;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$2 || null != props.itemProp || "string" !== typeof precedence$jscomp$0 || "string" !== typeof href$jscomp$0 || "" === href$jscomp$0) {
						target$jscomp$0.push(startChunkForTag("style"));
						var children$jscomp$6 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
						for (propKey$jscomp$8 in props) if (hasOwnProperty.call(props, propKey$jscomp$8)) {
							var propValue$jscomp$8 = props[propKey$jscomp$8];
							if (null != propValue$jscomp$8) switch (propKey$jscomp$8) {
								case "children":
									children$jscomp$6 = propValue$jscomp$8;
									break;
								case "dangerouslySetInnerHTML":
									innerHTML$jscomp$5 = propValue$jscomp$8;
									break;
								default: pushAttribute(target$jscomp$0, propKey$jscomp$8, propValue$jscomp$8);
							}
						}
						target$jscomp$0.push(endOfStartTag);
						var child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
						"function" !== typeof child && "symbol" !== typeof child && null !== child && void 0 !== child && target$jscomp$0.push(stringToChunk(("" + child).replace(styleRegex, styleReplacer)));
						pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
						target$jscomp$0.push(endChunkForTag("style"));
						var JSCompiler_inline_result$jscomp$6 = null;
					} else {
						var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
						if (null !== (resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : void 0)) {
							resumableState.styleResources[href$jscomp$0] = null;
							styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
								precedence: stringToChunk(escapeTextForBrowser(precedence$jscomp$0)),
								rules: [],
								hrefs: [],
								sheets: /* @__PURE__ */ new Map()
							}, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
							var nonceStyle = renderState.nonce.style;
							if (!nonceStyle || nonceStyle === nonce) {
								styleQueue$jscomp$0.hrefs.push(stringToChunk(escapeTextForBrowser(href$jscomp$0)));
								var target = styleQueue$jscomp$0.rules, children$jscomp$7 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
								for (propKey$jscomp$9 in props) if (hasOwnProperty.call(props, propKey$jscomp$9)) {
									var propValue$jscomp$9 = props[propKey$jscomp$9];
									if (null != propValue$jscomp$9) switch (propKey$jscomp$9) {
										case "children":
											children$jscomp$7 = propValue$jscomp$9;
											break;
										case "dangerouslySetInnerHTML": innerHTML$jscomp$6 = propValue$jscomp$9;
									}
								}
								var child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
								"function" !== typeof child$jscomp$0 && "symbol" !== typeof child$jscomp$0 && null !== child$jscomp$0 && void 0 !== child$jscomp$0 && target.push(stringToChunk(("" + child$jscomp$0).replace(styleRegex, styleReplacer)));
								pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
							}
						}
						styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
						textEmbedded && target$jscomp$0.push(textSeparator);
						JSCompiler_inline_result$jscomp$6 = void 0;
					}
					return JSCompiler_inline_result$jscomp$6;
				case "meta":
					var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
					if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$3 || null != props.itemProp) var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(target$jscomp$0, props, "meta");
					else textEmbedded && target$jscomp$0.push(textSeparator), JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1 ? null : "string" === typeof props.charSet ? pushSelfClosing(renderState.charsetChunks, props, "meta") : "viewport" === props.name ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
					return JSCompiler_inline_result$jscomp$7;
				case "listing":
				case "pre":
					target$jscomp$0.push(startChunkForTag(type));
					var children$jscomp$8 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
					for (propKey$jscomp$10 in props) if (hasOwnProperty.call(props, propKey$jscomp$10)) {
						var propValue$jscomp$10 = props[propKey$jscomp$10];
						if (null != propValue$jscomp$10) switch (propKey$jscomp$10) {
							case "children":
								children$jscomp$8 = propValue$jscomp$10;
								break;
							case "dangerouslySetInnerHTML":
								innerHTML$jscomp$7 = propValue$jscomp$10;
								break;
							default: pushAttribute(target$jscomp$0, propKey$jscomp$10, propValue$jscomp$10);
						}
					}
					target$jscomp$0.push(endOfStartTag);
					if (null != innerHTML$jscomp$7) {
						if (null != children$jscomp$8) throw Error(formatProdErrorMessage(60));
						if ("object" !== typeof innerHTML$jscomp$7 || !("__html" in innerHTML$jscomp$7)) throw Error(formatProdErrorMessage(61));
						var html = innerHTML$jscomp$7.__html;
						null !== html && void 0 !== html && ("string" === typeof html && 0 < html.length && "\n" === html[0] ? target$jscomp$0.push(leadingNewline, stringToChunk(html)) : target$jscomp$0.push(stringToChunk("" + html)));
					}
					"string" === typeof children$jscomp$8 && "\n" === children$jscomp$8[0] && target$jscomp$0.push(leadingNewline);
					return children$jscomp$8;
				case "img":
					var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
					if (!("lazy" === props.loading || !src && !srcSet || "string" !== typeof src && null != src || "string" !== typeof srcSet && null != srcSet || "low" === props.fetchPriority || pictureOrNoScriptTagInScope) && ("string" !== typeof src || ":" !== src[4] || "d" !== src[0] && "D" !== src[0] || "a" !== src[1] && "A" !== src[1] || "t" !== src[2] && "T" !== src[2] || "a" !== src[3] && "A" !== src[3]) && ("string" !== typeof srcSet || ":" !== srcSet[4] || "d" !== srcSet[0] && "D" !== srcSet[0] || "a" !== srcSet[1] && "A" !== srcSet[1] || "t" !== srcSet[2] && "T" !== srcSet[2] || "a" !== srcSet[3] && "A" !== srcSet[3])) {
						null !== hoistableState && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = !0);
						var sizes = "string" === typeof props.sizes ? props.sizes : void 0, key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
						if (resource$jscomp$1) {
							if ("high" === props.fetchPriority || 10 > renderState.highImagePreloads.size) promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
						} else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
							resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
							var input = props.crossOrigin;
							var JSCompiler_inline_result$jscomp$8 = "string" === typeof input ? "use-credentials" === input ? input : "" : void 0;
							var headers = renderState.headers, header;
							headers && 0 < headers.remainingCapacity && "string" !== typeof props.srcSet && ("high" === props.fetchPriority || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
								imageSrcSet: props.srcSet,
								imageSizes: props.sizes,
								crossOrigin: JSCompiler_inline_result$jscomp$8,
								integrity: props.integrity,
								nonce: props.nonce,
								type: props.type,
								fetchPriority: props.fetchPriority,
								referrerPolicy: props.refererPolicy
							}), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
								rel: "preload",
								as: "image",
								href: srcSet ? void 0 : src,
								imageSrcSet: srcSet,
								imageSizes: sizes,
								crossOrigin: JSCompiler_inline_result$jscomp$8,
								integrity: props.integrity,
								type: props.type,
								fetchPriority: props.fetchPriority,
								referrerPolicy: props.referrerPolicy
							}), "high" === props.fetchPriority || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
						}
					}
					return pushSelfClosing(target$jscomp$0, props, "img");
				case "base":
				case "area":
				case "br":
				case "col":
				case "embed":
				case "hr":
				case "keygen":
				case "param":
				case "source":
				case "track":
				case "wbr": return pushSelfClosing(target$jscomp$0, props, type);
				case "annotation-xml":
				case "color-profile":
				case "font-face":
				case "font-face-src":
				case "font-face-uri":
				case "font-face-format":
				case "font-face-name":
				case "missing-glyph": break;
				case "head":
					if (2 > formatContext.insertionMode) {
						var preamble = preambleState || renderState.preamble;
						if (preamble.headChunks) throw Error(formatProdErrorMessage(545, "`<head>`"));
						null !== preambleState && target$jscomp$0.push(headPreambleContributionChunk);
						preamble.headChunks = [];
						var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(preamble.headChunks, props, "head");
					} else JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(target$jscomp$0, props, "head");
					return JSCompiler_inline_result$jscomp$9;
				case "body":
					if (2 > formatContext.insertionMode) {
						var preamble$jscomp$0 = preambleState || renderState.preamble;
						if (preamble$jscomp$0.bodyChunks) throw Error(formatProdErrorMessage(545, "`<body>`"));
						null !== preambleState && target$jscomp$0.push(bodyPreambleContributionChunk);
						preamble$jscomp$0.bodyChunks = [];
						var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(preamble$jscomp$0.bodyChunks, props, "body");
					} else JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(target$jscomp$0, props, "body");
					return JSCompiler_inline_result$jscomp$10;
				case "html":
					if (0 === formatContext.insertionMode) {
						var preamble$jscomp$1 = preambleState || renderState.preamble;
						if (preamble$jscomp$1.htmlChunks) throw Error(formatProdErrorMessage(545, "`<html>`"));
						null !== preambleState && target$jscomp$0.push(htmlPreambleContributionChunk);
						preamble$jscomp$1.htmlChunks = [doctypeChunk];
						var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(preamble$jscomp$1.htmlChunks, props, "html");
					} else JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(target$jscomp$0, props, "html");
					return JSCompiler_inline_result$jscomp$11;
				default: if (-1 !== type.indexOf("-")) {
					target$jscomp$0.push(startChunkForTag(type));
					var children$jscomp$9 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
					for (propKey$jscomp$11 in props) if (hasOwnProperty.call(props, propKey$jscomp$11)) {
						var propValue$jscomp$11 = props[propKey$jscomp$11];
						if (null != propValue$jscomp$11) {
							var attributeName = propKey$jscomp$11;
							switch (propKey$jscomp$11) {
								case "children":
									children$jscomp$9 = propValue$jscomp$11;
									break;
								case "dangerouslySetInnerHTML":
									innerHTML$jscomp$8 = propValue$jscomp$11;
									break;
								case "style":
									pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
									break;
								case "suppressContentEditableWarning":
								case "suppressHydrationWarning":
								case "ref": break;
								case "className": attributeName = "class";
								default: if (isAttributeNameSafe(propKey$jscomp$11) && "function" !== typeof propValue$jscomp$11 && "symbol" !== typeof propValue$jscomp$11 && !1 !== propValue$jscomp$11) {
									if (!0 === propValue$jscomp$11) propValue$jscomp$11 = "";
									else if ("object" === typeof propValue$jscomp$11) continue;
									target$jscomp$0.push(attributeSeparator, stringToChunk(attributeName), attributeAssign, stringToChunk(escapeTextForBrowser(propValue$jscomp$11)), attributeEnd);
								}
							}
						}
					}
					target$jscomp$0.push(endOfStartTag);
					pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
					return children$jscomp$9;
				}
			}
			return pushStartGenericElement(target$jscomp$0, props, type);
		}
		var endTagCache = /* @__PURE__ */ new Map();
		function endChunkForTag(tag) {
			var chunk = endTagCache.get(tag);
			void 0 === chunk && (chunk = stringToPrecomputedChunk("</" + tag + ">"), endTagCache.set(tag, chunk));
			return chunk;
		}
		function hoistPreambleState(renderState, preambleState) {
			renderState = renderState.preamble;
			null === renderState.htmlChunks && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
			null === renderState.headChunks && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
			null === renderState.bodyChunks && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
		}
		function writeBootstrap(destination, renderState) {
			renderState = renderState.bootstrapChunks;
			for (var i = 0; i < renderState.length - 1; i++) writeChunk(destination, renderState[i]);
			return i < renderState.length ? (i = renderState[i], renderState.length = 0, writeChunkAndReturn(destination, i)) : !0;
		}
		var shellTimeRuntimeScript = stringToPrecomputedChunk("requestAnimationFrame(function(){$RT=performance.now()});");
		var placeholder1 = stringToPrecomputedChunk("<template id=\"");
		var placeholder2 = stringToPrecomputedChunk("\"></template>");
		var startActivityBoundary = stringToPrecomputedChunk("<!--&-->");
		var endActivityBoundary = stringToPrecomputedChunk("<!--/&-->");
		var startCompletedSuspenseBoundary = stringToPrecomputedChunk("<!--$-->");
		var startPendingSuspenseBoundary1 = stringToPrecomputedChunk("<!--$?--><template id=\"");
		var startPendingSuspenseBoundary2 = stringToPrecomputedChunk("\"></template>");
		var startClientRenderedSuspenseBoundary = stringToPrecomputedChunk("<!--$!-->");
		var endSuspenseBoundary = stringToPrecomputedChunk("<!--/$-->");
		var clientRenderedSuspenseBoundaryError1 = stringToPrecomputedChunk("<template");
		var clientRenderedSuspenseBoundaryErrorAttrInterstitial = stringToPrecomputedChunk("\"");
		var clientRenderedSuspenseBoundaryError1A = stringToPrecomputedChunk(" data-dgst=\"");
		stringToPrecomputedChunk(" data-msg=\"");
		stringToPrecomputedChunk(" data-stck=\"");
		stringToPrecomputedChunk(" data-cstck=\"");
		var clientRenderedSuspenseBoundaryError2 = stringToPrecomputedChunk("></template>");
		function writeStartPendingSuspenseBoundary(destination, renderState, id) {
			writeChunk(destination, startPendingSuspenseBoundary1);
			if (null === id) throw Error(formatProdErrorMessage(395));
			writeChunk(destination, renderState.boundaryPrefix);
			writeChunk(destination, stringToChunk(id.toString(16)));
			return writeChunkAndReturn(destination, startPendingSuspenseBoundary2);
		}
		var startSegmentHTML = stringToPrecomputedChunk("<div hidden id=\"");
		var startSegmentHTML2 = stringToPrecomputedChunk("\">");
		var endSegmentHTML = stringToPrecomputedChunk("</div>");
		var startSegmentSVG = stringToPrecomputedChunk("<svg aria-hidden=\"true\" style=\"display:none\" id=\"");
		var startSegmentSVG2 = stringToPrecomputedChunk("\">");
		var endSegmentSVG = stringToPrecomputedChunk("</svg>");
		var startSegmentMathML = stringToPrecomputedChunk("<math aria-hidden=\"true\" style=\"display:none\" id=\"");
		var startSegmentMathML2 = stringToPrecomputedChunk("\">");
		var endSegmentMathML = stringToPrecomputedChunk("</math>");
		var startSegmentTable = stringToPrecomputedChunk("<table hidden id=\"");
		var startSegmentTable2 = stringToPrecomputedChunk("\">");
		var endSegmentTable = stringToPrecomputedChunk("</table>");
		var startSegmentTableBody = stringToPrecomputedChunk("<table hidden><tbody id=\"");
		var startSegmentTableBody2 = stringToPrecomputedChunk("\">");
		var endSegmentTableBody = stringToPrecomputedChunk("</tbody></table>");
		var startSegmentTableRow = stringToPrecomputedChunk("<table hidden><tr id=\"");
		var startSegmentTableRow2 = stringToPrecomputedChunk("\">");
		var endSegmentTableRow = stringToPrecomputedChunk("</tr></table>");
		var startSegmentColGroup = stringToPrecomputedChunk("<table hidden><colgroup id=\"");
		var startSegmentColGroup2 = stringToPrecomputedChunk("\">");
		var endSegmentColGroup = stringToPrecomputedChunk("</colgroup></table>");
		function writeStartSegment(destination, renderState, formatContext, id) {
			switch (formatContext.insertionMode) {
				case 0:
				case 1:
				case 3:
				case 2: return writeChunk(destination, startSegmentHTML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentHTML2);
				case 4: return writeChunk(destination, startSegmentSVG), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentSVG2);
				case 5: return writeChunk(destination, startSegmentMathML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentMathML2);
				case 6: return writeChunk(destination, startSegmentTable), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentTable2);
				case 7: return writeChunk(destination, startSegmentTableBody), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentTableBody2);
				case 8: return writeChunk(destination, startSegmentTableRow), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentTableRow2);
				case 9: return writeChunk(destination, startSegmentColGroup), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, stringToChunk(id.toString(16))), writeChunkAndReturn(destination, startSegmentColGroup2);
				default: throw Error(formatProdErrorMessage(397));
			}
		}
		function writeEndSegment(destination, formatContext) {
			switch (formatContext.insertionMode) {
				case 0:
				case 1:
				case 3:
				case 2: return writeChunkAndReturn(destination, endSegmentHTML);
				case 4: return writeChunkAndReturn(destination, endSegmentSVG);
				case 5: return writeChunkAndReturn(destination, endSegmentMathML);
				case 6: return writeChunkAndReturn(destination, endSegmentTable);
				case 7: return writeChunkAndReturn(destination, endSegmentTableBody);
				case 8: return writeChunkAndReturn(destination, endSegmentTableRow);
				case 9: return writeChunkAndReturn(destination, endSegmentColGroup);
				default: throw Error(formatProdErrorMessage(397));
			}
		}
		var completeSegmentScript1Full = stringToPrecomputedChunk("$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS(\"");
		var completeSegmentScript1Partial = stringToPrecomputedChunk("$RS(\"");
		var completeSegmentScript2 = stringToPrecomputedChunk("\",\"");
		var completeSegmentScriptEnd = stringToPrecomputedChunk("\")<\/script>");
		stringToPrecomputedChunk("<template data-rsi=\"\" data-sid=\"");
		stringToPrecomputedChunk("\" data-pid=\"");
		var completeBoundaryScriptFunctionOnly = stringToPrecomputedChunk("$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if(\"/$\"===d||\"/&\"===d)if(0===h)break;else h--;else\"$\"!==d&&\"$?\"!==d&&\"$~\"!==d&&\"$!\"!==d&&\"&\"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data=\"$\";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data=\"$~\",$RB.push(a,b),2===$RB.length&&(\"number\"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};");
		stringToChunk("$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),\"auto\"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute(\"vt-name\"))||(a=\"_T_\"+K++ +\"_\"),b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll(\"[vt-share]\"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute(\"vt-name\"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if(\"/$\"===r)if(0===f)break;else f--;else\"$\"!==r&&\"$?\"!==r&&\"$~\"!==r&&\"$!\"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute(\"vt-name\"),y=m.get(D);k(d,y?\"vt-share\":\"vt-exit\");y&&(k(y,\"vt-share\"),m.set(D,null));var E=d.querySelectorAll(\"[vt-share]\");for(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute(\"vt-name\"),\nH=m.get(G);H&&(k(F,\"vt-share\"),k(H,\"vt-share\"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute(\"vt-name\"))&&k(t,\"vt-enter\"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute(\"vt-update\");J&&\"none\"!==J&&!l.includes(n)&&k(n,\"vt-update\");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&\"none\"!==c.getAttribute(\"vt-update\"));u.push.apply(u,I.querySelectorAll('img[src]:not([loading=\"lazy\"])'))}}}if(B){var z=\ndocument.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener(\"load\",q);w.g.addEventListener(\"error\",q)}}(b)),a.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=\nperformance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];\"\"===b.getAttribute(\"style\")&&b.removeAttribute(\"style\")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,$RV);");
		var completeBoundaryScript1Partial = stringToPrecomputedChunk("$RC(\"");
		var completeBoundaryWithStylesScript1FullPartial = stringToPrecomputedChunk("$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll(\"link[data-precedence],style[data-precedence]\"),v=[],k=0;b=e[k++];)\"not all\"===b.getAttribute(\"media\")?v.push(b):(\"LINK\"===b.tagName&&$RM.set(b.getAttribute(\"href\"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement(\"link\");a.href=d;a.rel=\n\"stylesheet\";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute(\"media\");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute(\"data-precedence\");a.removeAttribute(\"media\")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n\"$~\";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,\"CSS failed to load\"))};$RR(\"");
		var completeBoundaryWithStylesScript1Partial = stringToPrecomputedChunk("$RR(\"");
		var completeBoundaryScript2 = stringToPrecomputedChunk("\",\"");
		var completeBoundaryScript3a = stringToPrecomputedChunk("\",");
		var completeBoundaryScript3b = stringToPrecomputedChunk("\"");
		var completeBoundaryScriptEnd = stringToPrecomputedChunk(")<\/script>");
		stringToPrecomputedChunk("<template data-rci=\"\" data-bid=\"");
		stringToPrecomputedChunk("<template data-rri=\"\" data-bid=\"");
		stringToPrecomputedChunk("\" data-sid=\"");
		stringToPrecomputedChunk("\" data-sty=\"");
		var clientRenderScriptFunctionOnly = stringToPrecomputedChunk("$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};");
		var clientRenderScript1Full = stringToPrecomputedChunk("$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX(\"");
		var clientRenderScript1Partial = stringToPrecomputedChunk("$RX(\"");
		var clientRenderScript1A = stringToPrecomputedChunk("\"");
		var clientRenderErrorScriptArgInterstitial = stringToPrecomputedChunk(",");
		var clientRenderScriptEnd = stringToPrecomputedChunk(")<\/script>");
		stringToPrecomputedChunk("<template data-rxi=\"\" data-bid=\"");
		stringToPrecomputedChunk("\" data-dgst=\"");
		stringToPrecomputedChunk("\" data-msg=\"");
		stringToPrecomputedChunk("\" data-stck=\"");
		stringToPrecomputedChunk("\" data-cstck=\"");
		var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
		function escapeJSStringsForInstructionScripts(input) {
			return JSON.stringify(input).replace(regexForJSStringsInInstructionScripts, function(match) {
				switch (match) {
					case "<": return "\\u003c";
					case "\u2028": return "\\u2028";
					case "\u2029": return "\\u2029";
					default: throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
				}
			});
		}
		var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
		function escapeJSObjectForInstructionScripts(input) {
			return JSON.stringify(input).replace(regexForJSStringsInScripts, function(match) {
				switch (match) {
					case "&": return "\\u0026";
					case ">": return "\\u003e";
					case "<": return "\\u003c";
					case "\u2028": return "\\u2028";
					case "\u2029": return "\\u2029";
					default: throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
				}
			});
		}
		var lateStyleTagResourceOpen1 = stringToPrecomputedChunk(" media=\"not all\" data-precedence=\"");
		var lateStyleTagResourceOpen2 = stringToPrecomputedChunk("\" data-href=\"");
		var lateStyleTagResourceOpen3 = stringToPrecomputedChunk("\">");
		var lateStyleTagTemplateClose = stringToPrecomputedChunk("</style>");
		var currentlyRenderingBoundaryHasStylesToHoist = !1;
		var destinationHasCapacity = !0;
		function flushStyleTagsLateForBoundary(styleQueue) {
			var rules = styleQueue.rules, hrefs = styleQueue.hrefs, i = 0;
			if (hrefs.length) {
				writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
				writeChunk(this, lateStyleTagResourceOpen1);
				writeChunk(this, styleQueue.precedence);
				for (writeChunk(this, lateStyleTagResourceOpen2); i < hrefs.length - 1; i++) writeChunk(this, hrefs[i]), writeChunk(this, spaceSeparator);
				writeChunk(this, hrefs[i]);
				writeChunk(this, lateStyleTagResourceOpen3);
				for (i = 0; i < rules.length; i++) writeChunk(this, rules[i]);
				destinationHasCapacity = writeChunkAndReturn(this, lateStyleTagTemplateClose);
				currentlyRenderingBoundaryHasStylesToHoist = !0;
				rules.length = 0;
				hrefs.length = 0;
			}
		}
		function hasStylesToHoist(stylesheet) {
			return 2 !== stylesheet.state ? currentlyRenderingBoundaryHasStylesToHoist = !0 : !1;
		}
		function writeHoistablesForBoundary(destination, hoistableState, renderState) {
			currentlyRenderingBoundaryHasStylesToHoist = !1;
			destinationHasCapacity = !0;
			currentlyFlushingRenderState = renderState;
			hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
			currentlyFlushingRenderState = null;
			hoistableState.stylesheets.forEach(hasStylesToHoist);
			currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = !0);
			return destinationHasCapacity;
		}
		function flushResource(resource) {
			for (var i = 0; i < resource.length; i++) writeChunk(this, resource[i]);
			resource.length = 0;
		}
		var stylesheetFlushingQueue = [];
		function flushStyleInPreamble(stylesheet) {
			pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
			for (var i = 0; i < stylesheetFlushingQueue.length; i++) writeChunk(this, stylesheetFlushingQueue[i]);
			stylesheetFlushingQueue.length = 0;
			stylesheet.state = 2;
		}
		var styleTagResourceOpen1 = stringToPrecomputedChunk(" data-precedence=\"");
		var styleTagResourceOpen2 = stringToPrecomputedChunk("\" data-href=\"");
		var spaceSeparator = stringToPrecomputedChunk(" ");
		var styleTagResourceOpen3 = stringToPrecomputedChunk("\">");
		var styleTagResourceClose = stringToPrecomputedChunk("</style>");
		function flushStylesInPreamble(styleQueue) {
			var hasStylesheets = 0 < styleQueue.sheets.size;
			styleQueue.sheets.forEach(flushStyleInPreamble, this);
			styleQueue.sheets.clear();
			var rules = styleQueue.rules, hrefs = styleQueue.hrefs;
			if (!hasStylesheets || hrefs.length) {
				writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
				writeChunk(this, styleTagResourceOpen1);
				writeChunk(this, styleQueue.precedence);
				styleQueue = 0;
				if (hrefs.length) {
					for (writeChunk(this, styleTagResourceOpen2); styleQueue < hrefs.length - 1; styleQueue++) writeChunk(this, hrefs[styleQueue]), writeChunk(this, spaceSeparator);
					writeChunk(this, hrefs[styleQueue]);
				}
				writeChunk(this, styleTagResourceOpen3);
				for (styleQueue = 0; styleQueue < rules.length; styleQueue++) writeChunk(this, rules[styleQueue]);
				writeChunk(this, styleTagResourceClose);
				rules.length = 0;
				hrefs.length = 0;
			}
		}
		function preloadLateStyle(stylesheet) {
			if (0 === stylesheet.state) {
				stylesheet.state = 1;
				var props = stylesheet.props;
				pushLinkImpl(stylesheetFlushingQueue, {
					rel: "preload",
					as: "style",
					href: stylesheet.props.href,
					crossOrigin: props.crossOrigin,
					fetchPriority: props.fetchPriority,
					integrity: props.integrity,
					media: props.media,
					hrefLang: props.hrefLang,
					referrerPolicy: props.referrerPolicy
				});
				for (stylesheet = 0; stylesheet < stylesheetFlushingQueue.length; stylesheet++) writeChunk(this, stylesheetFlushingQueue[stylesheet]);
				stylesheetFlushingQueue.length = 0;
			}
		}
		function preloadLateStyles(styleQueue) {
			styleQueue.sheets.forEach(preloadLateStyle, this);
			styleQueue.sheets.clear();
		}
		stringToPrecomputedChunk("<link rel=\"expect\" href=\"#");
		stringToPrecomputedChunk("\" blocking=\"render\"/>");
		var completedShellIdAttributeStart = stringToPrecomputedChunk(" id=\"");
		function pushCompletedShellIdAttribute(target, resumableState) {
			0 === (resumableState.instructions & 32) && (resumableState.instructions |= 32, target.push(completedShellIdAttributeStart, stringToChunk(escapeTextForBrowser("_" + resumableState.idPrefix + "R_")), attributeEnd));
		}
		var arrayFirstOpenBracket = stringToPrecomputedChunk("[");
		var arraySubsequentOpenBracket = stringToPrecomputedChunk(",[");
		var arrayInterstitial = stringToPrecomputedChunk(",");
		var arrayCloseBracket = stringToPrecomputedChunk("]");
		function writeStyleResourceDependenciesInJS(destination, hoistableState) {
			writeChunk(destination, arrayFirstOpenBracket);
			var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
			hoistableState.stylesheets.forEach(function(resource) {
				if (2 !== resource.state) if (3 === resource.state) writeChunk(destination, nextArrayOpenBrackChunk), writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts("" + resource.props.href))), writeChunk(destination, arrayCloseBracket), nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
				else {
					writeChunk(destination, nextArrayOpenBrackChunk);
					var precedence = resource.props["data-precedence"], props = resource.props;
					writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(sanitizeURL("" + resource.props.href))));
					precedence = "" + precedence;
					writeChunk(destination, arrayInterstitial);
					writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(precedence)));
					for (var propKey in props) if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], null != precedence)) switch (propKey) {
						case "href":
						case "rel":
						case "precedence":
						case "data-precedence": break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(399, "link"));
						default: writeStyleResourceAttributeInJS(destination, propKey, precedence);
					}
					writeChunk(destination, arrayCloseBracket);
					nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
					resource.state = 3;
				}
			});
			writeChunk(destination, arrayCloseBracket);
		}
		function writeStyleResourceAttributeInJS(destination, name, value) {
			var attributeName = name.toLowerCase();
			switch (typeof value) {
				case "function":
				case "symbol": return;
			}
			switch (name) {
				case "innerHTML":
				case "dangerouslySetInnerHTML":
				case "suppressContentEditableWarning":
				case "suppressHydrationWarning":
				case "style":
				case "ref": return;
				case "className":
					attributeName = "class";
					name = "" + value;
					break;
				case "hidden":
					if (!1 === value) return;
					name = "";
					break;
				case "src":
				case "href":
					value = sanitizeURL(value);
					name = "" + value;
					break;
				default:
					if (2 < name.length && ("o" === name[0] || "O" === name[0]) && ("n" === name[1] || "N" === name[1]) || !isAttributeNameSafe(name)) return;
					name = "" + value;
			}
			writeChunk(destination, arrayInterstitial);
			writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(attributeName)));
			writeChunk(destination, arrayInterstitial);
			writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(name)));
		}
		function createHoistableState() {
			return {
				styles: /* @__PURE__ */ new Set(),
				stylesheets: /* @__PURE__ */ new Set(),
				suspenseyImages: !1
			};
		}
		function prefetchDNS(href) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if ("string" === typeof href && href) {
					if (!resumableState.dnsResources.hasOwnProperty(href)) {
						resumableState.dnsResources[href] = null;
						resumableState = renderState.headers;
						var header, JSCompiler_temp;
						if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) JSCompiler_temp = (header = "<" + ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
						JSCompiler_temp ? (renderState.resets.dns[href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, {
							href,
							rel: "dns-prefetch"
						}), renderState.preconnects.add(header));
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.D(href);
		}
		function preconnect(href, crossOrigin) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if ("string" === typeof href && href) {
					var bucket = "use-credentials" === crossOrigin ? "credentials" : "string" === typeof crossOrigin ? "anonymous" : "default";
					if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
						resumableState.connectResources[bucket][href] = null;
						resumableState = renderState.headers;
						var header, JSCompiler_temp;
						if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
							JSCompiler_temp = "<" + ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer) + ">; rel=preconnect";
							if ("string" === typeof crossOrigin) {
								var escapedCrossOrigin = ("" + crossOrigin).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
								JSCompiler_temp += "; crossorigin=\"" + escapedCrossOrigin + "\"";
							}
							JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
						}
						JSCompiler_temp ? (renderState.resets.connect[bucket][href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
							rel: "preconnect",
							href,
							crossOrigin
						}), renderState.preconnects.add(bucket));
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.C(href, crossOrigin);
		}
		function preload(href, as, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (as && href) {
					switch (as) {
						case "image":
							if (options) {
								var imageSrcSet = options.imageSrcSet;
								var imageSizes = options.imageSizes;
								var fetchPriority = options.fetchPriority;
							}
							var key = imageSrcSet ? imageSrcSet + "\n" + (imageSizes || "") : href;
							if (resumableState.imageResources.hasOwnProperty(key)) return;
							resumableState.imageResources[key] = PRELOAD_NO_CREDS;
							resumableState = renderState.headers;
							var header;
							resumableState && 0 < resumableState.remainingCapacity && "string" !== typeof imageSrcSet && "high" === fetchPriority && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(resumableState, assign({
								rel: "preload",
								href: imageSrcSet ? void 0 : href,
								as
							}, options)), "high" === fetchPriority ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
							break;
						case "style":
							if (resumableState.styleResources.hasOwnProperty(href)) return;
							imageSrcSet = [];
							pushLinkImpl(imageSrcSet, assign({
								rel: "preload",
								href,
								as
							}, options));
							resumableState.styleResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							renderState.preloads.stylesheets.set(href, imageSrcSet);
							renderState.bulkPreloads.add(imageSrcSet);
							break;
						case "script":
							if (resumableState.scriptResources.hasOwnProperty(href)) return;
							imageSrcSet = [];
							renderState.preloads.scripts.set(href, imageSrcSet);
							renderState.bulkPreloads.add(imageSrcSet);
							pushLinkImpl(imageSrcSet, assign({
								rel: "preload",
								href,
								as
							}, options));
							resumableState.scriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							break;
						default:
							if (resumableState.unknownResources.hasOwnProperty(as)) {
								if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href)) return;
							} else imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
							imageSrcSet[href] = PRELOAD_NO_CREDS;
							if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && "font" === as && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2))) renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
							else switch (resumableState = [], href = assign({
								rel: "preload",
								href,
								as
							}, options), pushLinkImpl(resumableState, href), as) {
								case "font":
									renderState.fontPreloads.add(resumableState);
									break;
								default: renderState.bulkPreloads.add(resumableState);
							}
					}
					enqueueFlush(request);
				}
			} else previousDispatcher.L(href, as, options);
		}
		function preloadModule(href, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (href) {
					var as = options && "string" === typeof options.as ? options.as : "script";
					switch (as) {
						case "script":
							if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
							as = [];
							resumableState.moduleScriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
							renderState.preloads.moduleScripts.set(href, as);
							break;
						default:
							if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
								var resources = resumableState.unknownResources[as];
								if (resources.hasOwnProperty(href)) return;
							} else resources = {}, resumableState.moduleUnknownResources[as] = resources;
							as = [];
							resources[href] = PRELOAD_NO_CREDS;
					}
					pushLinkImpl(as, assign({
						rel: "modulepreload",
						href
					}, options));
					renderState.bulkPreloads.add(as);
					enqueueFlush(request);
				}
			} else previousDispatcher.m(href, options);
		}
		function preinitStyle(href, precedence, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (href) {
					precedence = precedence || "default";
					var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
					null !== resourceState && (resumableState.styleResources[href] = null, styleQueue || (styleQueue = {
						precedence: stringToChunk(escapeTextForBrowser(precedence)),
						rules: [],
						hrefs: [],
						sheets: /* @__PURE__ */ new Map()
					}, renderState.styles.set(precedence, styleQueue)), precedence = {
						state: 0,
						props: assign({
							rel: "stylesheet",
							href,
							"data-precedence": precedence
						}, options)
					}, resourceState && (2 === resourceState.length && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = 1), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
				}
			} else previousDispatcher.S(href, precedence, options);
		}
		function preinitScript(src, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (src) {
					var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : void 0;
					null !== resourceState && (resumableState.scriptResources[src] = null, options = assign({
						src,
						async: !0
					}, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
				}
			} else previousDispatcher.X(src, options);
		}
		function preinitModuleScript(src, options) {
			var request = currentRequest ? currentRequest : null;
			if (request) {
				var resumableState = request.resumableState, renderState = request.renderState;
				if (src) {
					var resourceState = resumableState.moduleScriptResources.hasOwnProperty(src) ? resumableState.moduleScriptResources[src] : void 0;
					null !== resourceState && (resumableState.moduleScriptResources[src] = null, options = assign({
						src,
						type: "module",
						async: !0
					}, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
				}
			} else previousDispatcher.M(src, options);
		}
		function adoptPreloadCredentials(target, preloadState) {
			target.crossOrigin ??= preloadState[0];
			target.integrity ??= preloadState[1];
		}
		function getPreloadAsHeader(href, as, params) {
			href = ("" + href).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer);
			as = ("" + as).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
			as = "<" + href + ">; rel=preload; as=\"" + as + "\"";
			for (var paramName in params) hasOwnProperty.call(params, paramName) && (href = params[paramName], "string" === typeof href && (as += "; " + paramName.toLowerCase() + "=\"" + ("" + href).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer) + "\""));
			return as;
		}
		var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
		function escapeHrefForLinkHeaderURLContextReplacer(match) {
			switch (match) {
				case "<": return "%3C";
				case ">": return "%3E";
				case "\n": return "%0A";
				case "\r": return "%0D";
				default: throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		}
		var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
		function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
			switch (match) {
				case "\"": return "%22";
				case "'": return "%27";
				case ";": return "%3B";
				case ",": return "%2C";
				case "\n": return "%0A";
				case "\r": return "%0D";
				default: throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		}
		function hoistStyleQueueDependency(styleQueue) {
			this.styles.add(styleQueue);
		}
		function hoistStylesheetDependency(stylesheet) {
			this.stylesheets.add(stylesheet);
		}
		function hoistHoistables(parentState, childState) {
			childState.styles.forEach(hoistStyleQueueDependency, parentState);
			childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
			childState.suspenseyImages && (parentState.suspenseyImages = !0);
		}
		function hasSuspenseyContent(hoistableState) {
			return 0 < hoistableState.stylesheets.size || hoistableState.suspenseyImages;
		}
		var bind = Function.prototype.bind;
		var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
		function getComponentNameFromType(type) {
			if (null == type) return null;
			if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
			if ("string" === typeof type) return type;
			switch (type) {
				case REACT_FRAGMENT_TYPE: return "Fragment";
				case REACT_PROFILER_TYPE: return "Profiler";
				case REACT_STRICT_MODE_TYPE: return "StrictMode";
				case REACT_SUSPENSE_TYPE: return "Suspense";
				case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
				case REACT_ACTIVITY_TYPE: return "Activity";
			}
			if ("object" === typeof type) switch (type.$$typeof) {
				case REACT_PORTAL_TYPE: return "Portal";
				case REACT_CONTEXT_TYPE: return type.displayName || "Context";
				case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
				case REACT_FORWARD_REF_TYPE:
					var innerType = type.render;
					type = type.displayName;
					type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
					return type;
				case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
				case REACT_LAZY_TYPE:
					innerType = type._payload;
					type = type._init;
					try {
						return getComponentNameFromType(type(innerType));
					} catch (x) {}
			}
			return null;
		}
		var emptyContextObject = {};
		var currentActiveSnapshot = null;
		function popToNearestCommonAncestor(prev, next) {
			if (prev !== next) {
				prev.context._currentValue = prev.parentValue;
				prev = prev.parent;
				var parentNext = next.parent;
				if (null === prev) {
					if (null !== parentNext) throw Error(formatProdErrorMessage(401));
				} else {
					if (null === parentNext) throw Error(formatProdErrorMessage(401));
					popToNearestCommonAncestor(prev, parentNext);
				}
				next.context._currentValue = next.value;
			}
		}
		function popAllPrevious(prev) {
			prev.context._currentValue = prev.parentValue;
			prev = prev.parent;
			null !== prev && popAllPrevious(prev);
		}
		function pushAllNext(next) {
			var parentNext = next.parent;
			null !== parentNext && pushAllNext(parentNext);
			next.context._currentValue = next.value;
		}
		function popPreviousToCommonLevel(prev, next) {
			prev.context._currentValue = prev.parentValue;
			prev = prev.parent;
			if (null === prev) throw Error(formatProdErrorMessage(402));
			prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
		}
		function popNextToCommonLevel(prev, next) {
			var parentNext = next.parent;
			if (null === parentNext) throw Error(formatProdErrorMessage(402));
			prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
			next.context._currentValue = next.value;
		}
		function switchContext(newSnapshot) {
			var prev = currentActiveSnapshot;
			prev !== newSnapshot && (null === prev ? pushAllNext(newSnapshot) : null === newSnapshot ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
		}
		var classComponentUpdater = {
			enqueueSetState: function(inst, payload) {
				inst = inst._reactInternals;
				null !== inst.queue && inst.queue.push(payload);
			},
			enqueueReplaceState: function(inst, payload) {
				inst = inst._reactInternals;
				inst.replace = !0;
				inst.queue = [payload];
			},
			enqueueForceUpdate: function() {}
		};
		var emptyTreeContext = {
			id: 1,
			overflow: ""
		};
		function pushTreeContext(baseContext, totalChildren, index) {
			var baseIdWithLeadingBit = baseContext.id;
			baseContext = baseContext.overflow;
			var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
			baseIdWithLeadingBit &= ~(1 << baseLength);
			index += 1;
			var length = 32 - clz32(totalChildren) + baseLength;
			if (30 < length) {
				var numberOfOverflowBits = baseLength - baseLength % 5;
				length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
				baseIdWithLeadingBit >>= numberOfOverflowBits;
				baseLength -= numberOfOverflowBits;
				return {
					id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
					overflow: length + baseContext
				};
			}
			return {
				id: 1 << length | index << baseLength | baseIdWithLeadingBit,
				overflow: baseContext
			};
		}
		var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
		var log = Math.log;
		var LN2 = Math.LN2;
		function clz32Fallback(x) {
			x >>>= 0;
			return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
		}
		function noop() {}
		var SuspenseException = Error(formatProdErrorMessage(460));
		function trackUsedThenable(thenableState, thenable, index) {
			index = thenableState[index];
			void 0 === index ? thenableState.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default:
					"string" === typeof thenable.status ? thenable.then(noop, noop) : (thenableState = thenable, thenableState.status = "pending", thenableState.then(function(fulfilledValue) {
						if ("pending" === thenable.status) {
							var fulfilledThenable = thenable;
							fulfilledThenable.status = "fulfilled";
							fulfilledThenable.value = fulfilledValue;
						}
					}, function(error) {
						if ("pending" === thenable.status) {
							var rejectedThenable = thenable;
							rejectedThenable.status = "rejected";
							rejectedThenable.reason = error;
						}
					}));
					switch (thenable.status) {
						case "fulfilled": return thenable.value;
						case "rejected": throw thenable.reason;
					}
					suspendedThenable = thenable;
					throw SuspenseException;
			}
		}
		var suspendedThenable = null;
		function getSuspendedThenable() {
			if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
			var thenable = suspendedThenable;
			suspendedThenable = null;
			return thenable;
		}
		function is(x, y) {
			return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
		}
		var objectIs = "function" === typeof Object.is ? Object.is : is;
		var currentlyRenderingComponent = null;
		var currentlyRenderingTask = null;
		var currentlyRenderingRequest = null;
		var currentlyRenderingKeyPath = null;
		var firstWorkInProgressHook = null;
		var workInProgressHook = null;
		var isReRender = !1;
		var didScheduleRenderPhaseUpdate = !1;
		var localIdCounter = 0;
		var actionStateCounter = 0;
		var actionStateMatchingIndex = -1;
		var thenableIndexCounter = 0;
		var thenableState = null;
		var renderPhaseUpdates = null;
		var numberOfReRenders = 0;
		function resolveCurrentlyRenderingComponent() {
			if (null === currentlyRenderingComponent) throw Error(formatProdErrorMessage(321));
			return currentlyRenderingComponent;
		}
		function createHook() {
			if (0 < numberOfReRenders) throw Error(formatProdErrorMessage(312));
			return {
				memoizedState: null,
				queue: null,
				next: null
			};
		}
		function createWorkInProgressHook() {
			null === workInProgressHook ? null === firstWorkInProgressHook ? (isReRender = !1, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = !0, workInProgressHook = firstWorkInProgressHook) : null === workInProgressHook.next ? (isReRender = !1, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = !0, workInProgressHook = workInProgressHook.next);
			return workInProgressHook;
		}
		function getThenableStateAfterSuspending() {
			var state = thenableState;
			thenableState = null;
			return state;
		}
		function resetHooksState() {
			currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
			didScheduleRenderPhaseUpdate = !1;
			firstWorkInProgressHook = null;
			numberOfReRenders = 0;
			workInProgressHook = renderPhaseUpdates = null;
		}
		function basicStateReducer(state, action) {
			return "function" === typeof action ? action(state) : action;
		}
		function useReducer(reducer, initialArg, init) {
			currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
			workInProgressHook = createWorkInProgressHook();
			if (isReRender) {
				var queue = workInProgressHook.queue;
				initialArg = queue.dispatch;
				if (null !== renderPhaseUpdates && (init = renderPhaseUpdates.get(queue), void 0 !== init)) {
					renderPhaseUpdates.delete(queue);
					queue = workInProgressHook.memoizedState;
					do
						queue = reducer(queue, init.action), init = init.next;
					while (null !== init);
					workInProgressHook.memoizedState = queue;
					return [queue, initialArg];
				}
				return [workInProgressHook.memoizedState, initialArg];
			}
			reducer = reducer === basicStateReducer ? "function" === typeof initialArg ? initialArg() : initialArg : void 0 !== init ? init(initialArg) : initialArg;
			workInProgressHook.memoizedState = reducer;
			reducer = workInProgressHook.queue = {
				last: null,
				dispatch: null
			};
			reducer = reducer.dispatch = dispatchAction.bind(null, currentlyRenderingComponent, reducer);
			return [workInProgressHook.memoizedState, reducer];
		}
		function useMemo(nextCreate, deps) {
			currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
			workInProgressHook = createWorkInProgressHook();
			deps = void 0 === deps ? null : deps;
			if (null !== workInProgressHook) {
				var prevState = workInProgressHook.memoizedState;
				if (null !== prevState && null !== deps) {
					var prevDeps = prevState[1];
					a: if (null === prevDeps) prevDeps = !1;
					else {
						for (var i = 0; i < prevDeps.length && i < deps.length; i++) if (!objectIs(deps[i], prevDeps[i])) {
							prevDeps = !1;
							break a;
						}
						prevDeps = !0;
					}
					if (prevDeps) return prevState[0];
				}
			}
			nextCreate = nextCreate();
			workInProgressHook.memoizedState = [nextCreate, deps];
			return nextCreate;
		}
		function dispatchAction(componentIdentity, queue, action) {
			if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
			if (componentIdentity === currentlyRenderingComponent) if (didScheduleRenderPhaseUpdate = !0, componentIdentity = {
				action,
				next: null
			}, null === renderPhaseUpdates && (renderPhaseUpdates = /* @__PURE__ */ new Map()), action = renderPhaseUpdates.get(queue), void 0 === action) renderPhaseUpdates.set(queue, componentIdentity);
			else {
				for (queue = action; null !== queue.next;) queue = queue.next;
				queue.next = componentIdentity;
			}
		}
		function throwOnUseEffectEventCall() {
			throw Error(formatProdErrorMessage(440));
		}
		function unsupportedStartTransition() {
			throw Error(formatProdErrorMessage(394));
		}
		function unsupportedSetOptimisticState() {
			throw Error(formatProdErrorMessage(479));
		}
		function useActionState(action, initialState, permalink) {
			resolveCurrentlyRenderingComponent();
			var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
			if ("function" === typeof action.$$FORM_ACTION) {
				var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
				request = request.formState;
				var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
				if (null !== request && "function" === typeof isSignatureEqual) {
					var postbackKey = request[1];
					isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
						componentKeyPath,
						null,
						actionStateHookIndex
					]), 0), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
				}
				var boundAction = action.bind(null, initialState);
				action = function(payload) {
					boundAction(payload);
				};
				"function" === typeof boundAction.$$FORM_ACTION && (action.$$FORM_ACTION = function(prefix) {
					prefix = boundAction.$$FORM_ACTION(prefix);
					void 0 !== permalink && (permalink += "", prefix.action = permalink);
					var formData = prefix.data;
					formData && (null === nextPostbackStateKey && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
						componentKeyPath,
						null,
						actionStateHookIndex
					]), 0)), formData.append("$ACTION_KEY", nextPostbackStateKey));
					return prefix;
				});
				return [
					initialState,
					action,
					!1
				];
			}
			var boundAction$22 = action.bind(null, initialState);
			return [
				initialState,
				function(payload) {
					boundAction$22(payload);
				},
				!1
			];
		}
		function unwrapThenable(thenable) {
			var index = thenableIndexCounter;
			thenableIndexCounter += 1;
			null === thenableState && (thenableState = []);
			return trackUsedThenable(thenableState, thenable, index);
		}
		function unsupportedRefresh() {
			throw Error(formatProdErrorMessage(393));
		}
		var HooksDispatcher = {
			readContext: function(context) {
				return context._currentValue;
			},
			use: function(usable) {
				if (null !== usable && "object" === typeof usable) {
					if ("function" === typeof usable.then) return unwrapThenable(usable);
					if (usable.$$typeof === REACT_CONTEXT_TYPE) return usable._currentValue;
				}
				throw Error(formatProdErrorMessage(438, String(usable)));
			},
			useContext: function(context) {
				resolveCurrentlyRenderingComponent();
				return context._currentValue;
			},
			useMemo,
			useReducer,
			useRef: function(initialValue) {
				currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
				workInProgressHook = createWorkInProgressHook();
				var previousRef = workInProgressHook.memoizedState;
				return null === previousRef ? (initialValue = { current: initialValue }, workInProgressHook.memoizedState = initialValue) : previousRef;
			},
			useState: function(initialState) {
				return useReducer(basicStateReducer, initialState);
			},
			useInsertionEffect: noop,
			useLayoutEffect: noop,
			useCallback: function(callback, deps) {
				return useMemo(function() {
					return callback;
				}, deps);
			},
			useImperativeHandle: noop,
			useEffect: noop,
			useDebugValue: noop,
			useDeferredValue: function(value, initialValue) {
				resolveCurrentlyRenderingComponent();
				return void 0 !== initialValue ? initialValue : value;
			},
			useTransition: function() {
				resolveCurrentlyRenderingComponent();
				return [!1, unsupportedStartTransition];
			},
			useId: function() {
				var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
				var overflow = JSCompiler_inline_result.overflow;
				JSCompiler_inline_result = JSCompiler_inline_result.id;
				JSCompiler_inline_result = (JSCompiler_inline_result & ~(1 << 32 - clz32(JSCompiler_inline_result) - 1)).toString(32) + overflow;
				var resumableState = currentResumableState;
				if (null === resumableState) throw Error(formatProdErrorMessage(404));
				overflow = localIdCounter++;
				JSCompiler_inline_result = "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
				0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
				return JSCompiler_inline_result + "_";
			},
			useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
				if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
				return getServerSnapshot();
			},
			useOptimistic: function(passthrough) {
				resolveCurrentlyRenderingComponent();
				return [passthrough, unsupportedSetOptimisticState];
			},
			useActionState,
			useFormState: useActionState,
			useHostTransitionStatus: function() {
				resolveCurrentlyRenderingComponent();
				return sharedNotPendingObject;
			},
			useMemoCache: function(size) {
				for (var data = Array(size), i = 0; i < size; i++) data[i] = REACT_MEMO_CACHE_SENTINEL;
				return data;
			},
			useCacheRefresh: function() {
				return unsupportedRefresh;
			},
			useEffectEvent: function() {
				return throwOnUseEffectEventCall;
			}
		};
		var currentResumableState = null;
		var DefaultAsyncDispatcher = {
			getCacheForType: function() {
				throw Error(formatProdErrorMessage(248));
			},
			cacheSignal: function() {
				throw Error(formatProdErrorMessage(248));
			}
		};
		var prefix;
		var suffix;
		function describeBuiltInComponentFrame(name) {
			if (void 0 === prefix) try {
				throw Error();
			} catch (x) {
				var match = x.stack.trim().match(/\n( *(at )?)/);
				prefix = match && match[1] || "";
				suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
			}
			return "\n" + prefix + name + suffix;
		}
		var reentry = !1;
		function describeNativeComponentFrame(fn, construct) {
			if (!fn || reentry) return "";
			reentry = !0;
			var previousPrepareStackTrace = Error.prepareStackTrace;
			Error.prepareStackTrace = void 0;
			try {
				var RunInRootFrame = { DetermineComponentFrameRoot: function() {
					try {
						if (construct) {
							var Fake = function() {
								throw Error();
							};
							Object.defineProperty(Fake.prototype, "props", { set: function() {
								throw Error();
							} });
							if ("object" === typeof Reflect && Reflect.construct) {
								try {
									Reflect.construct(Fake, []);
								} catch (x) {
									var control = x;
								}
								Reflect.construct(fn, [], Fake);
							} else {
								try {
									Fake.call();
								} catch (x$24) {
									control = x$24;
								}
								fn.call(Fake.prototype);
							}
						} else {
							try {
								throw Error();
							} catch (x$25) {
								control = x$25;
							}
							(Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {});
						}
					} catch (sample) {
						if (sample && control && "string" === typeof sample.stack) return [sample.stack, control.stack];
					}
					return [null, null];
				} };
				RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
				var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
				namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
				var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
				if (sampleStack && controlStack) {
					var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
					for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");) RunInRootFrame++;
					for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes("DetermineComponentFrameRoot");) namePropDescriptor++;
					if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length) for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];) namePropDescriptor--;
					for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--) if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
						if (1 !== RunInRootFrame || 1 !== namePropDescriptor) do
							if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
								var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
								fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
								return frame;
							}
						while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
						break;
					}
				}
			} finally {
				reentry = !1, Error.prepareStackTrace = previousPrepareStackTrace;
			}
			return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
		}
		function describeComponentStackByType(type) {
			if ("string" === typeof type) return describeBuiltInComponentFrame(type);
			if ("function" === typeof type) return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, !0) : describeNativeComponentFrame(type, !1);
			if ("object" === typeof type && null !== type) {
				switch (type.$$typeof) {
					case REACT_FORWARD_REF_TYPE: return describeNativeComponentFrame(type.render, !1);
					case REACT_MEMO_TYPE: return describeNativeComponentFrame(type.type, !1);
					case REACT_LAZY_TYPE:
						var lazyComponent = type, payload = lazyComponent._payload;
						lazyComponent = lazyComponent._init;
						try {
							type = lazyComponent(payload);
						} catch (x) {
							return describeBuiltInComponentFrame("Lazy");
						}
						return describeComponentStackByType(type);
				}
				if ("string" === typeof type.name) {
					a: {
						payload = type.name;
						lazyComponent = type.env;
						var location = type.debugLocation;
						if (null != location && (type = Error.prepareStackTrace, Error.prepareStackTrace = void 0, location = location.stack, Error.prepareStackTrace = type, location.startsWith("Error: react-stack-top-frame\n") && (location = location.slice(29)), type = location.indexOf("\n"), -1 !== type && (location = location.slice(type + 1)), type = location.indexOf("react_stack_bottom_frame"), -1 !== type && (type = location.lastIndexOf("\n", type)), type = -1 !== type ? location = location.slice(0, type) : "", location = type.lastIndexOf("\n"), type = -1 === location ? type : type.slice(location + 1), -1 !== type.indexOf(payload))) {
							payload = "\n" + type;
							break a;
						}
						payload = describeBuiltInComponentFrame(payload + (lazyComponent ? " [" + lazyComponent + "]" : ""));
					}
					return payload;
				}
			}
			switch (type) {
				case REACT_SUSPENSE_LIST_TYPE: return describeBuiltInComponentFrame("SuspenseList");
				case REACT_SUSPENSE_TYPE: return describeBuiltInComponentFrame("Suspense");
			}
			return "";
		}
		function isEligibleForOutlining(request, boundary) {
			return (500 < boundary.byteSize || hasSuspenseyContent(boundary.contentState)) && null === boundary.contentPreamble;
		}
		function defaultErrorHandler(error) {
			if ("object" === typeof error && null !== error && "string" === typeof error.environmentName) {
				var JSCompiler_inline_result = error.environmentName;
				error = [error].slice(0);
				"string" === typeof error[0] ? error.splice(0, 1, "%c%s%c " + error[0], "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px", " " + JSCompiler_inline_result + " ", "") : error.splice(0, 0, "%c%s%c", "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px", " " + JSCompiler_inline_result + " ", "");
				error.unshift(console);
				JSCompiler_inline_result = bind.apply(console.error, error);
				JSCompiler_inline_result();
			} else console.error(error);
			return null;
		}
		function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
			var abortSet = /* @__PURE__ */ new Set();
			this.destination = null;
			this.flushScheduled = !1;
			this.resumableState = resumableState;
			this.renderState = renderState;
			this.rootFormatContext = rootFormatContext;
			this.progressiveChunkSize = void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
			this.status = 10;
			this.fatalError = null;
			this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
			this.completedPreambleSegments = this.completedRootSegment = null;
			this.byteSize = 0;
			this.abortableTasks = abortSet;
			this.pingedTasks = [];
			this.clientRenderedBoundaries = [];
			this.completedBoundaries = [];
			this.partialBoundaries = [];
			this.trackedPostpones = null;
			this.onError = void 0 === onError ? defaultErrorHandler : onError;
			this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
			this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
			this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
			this.onShellError = void 0 === onShellError ? noop : onShellError;
			this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
			this.formState = void 0 === formState ? null : formState;
		}
		function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
			resumableState = new RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState);
			renderState = createPendingSegment(resumableState, 0, null, rootFormatContext, !1, !1);
			renderState.parentFlushed = !0;
			children = createRenderTask(resumableState, null, children, -1, null, renderState, null, null, resumableState.abortableTasks, null, rootFormatContext, null, emptyTreeContext, null, null);
			pushComponentStack(children);
			resumableState.pingedTasks.push(children);
			return resumableState;
		}
		function createPrerenderRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
			children = createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, void 0);
			children.trackedPostpones = {
				workingMap: /* @__PURE__ */ new Map(),
				rootNodes: [],
				rootSlots: null
			};
			return children;
		}
		function resumeRequest(children, postponedState, renderState, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
			renderState = new RequestInstance(postponedState.resumableState, renderState, postponedState.rootFormatContext, postponedState.progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, null);
			renderState.nextSegmentId = postponedState.nextSegmentId;
			if ("number" === typeof postponedState.replaySlots) return onError = createPendingSegment(renderState, 0, null, postponedState.rootFormatContext, !1, !1), onError.parentFlushed = !0, children = createRenderTask(renderState, null, children, -1, null, onError, null, null, renderState.abortableTasks, null, postponedState.rootFormatContext, null, emptyTreeContext, null, null), pushComponentStack(children), renderState.pingedTasks.push(children), renderState;
			children = createReplayTask(renderState, null, {
				nodes: postponedState.replayNodes,
				slots: postponedState.replaySlots,
				pendingTasks: 0
			}, children, -1, null, null, renderState.abortableTasks, null, postponedState.rootFormatContext, null, emptyTreeContext, null, null);
			pushComponentStack(children);
			renderState.pingedTasks.push(children);
			return renderState;
		}
		function resumeAndPrerenderRequest(children, postponedState, renderState, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
			children = resumeRequest(children, postponedState, renderState, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone);
			children.trackedPostpones = {
				workingMap: /* @__PURE__ */ new Map(),
				rootNodes: [],
				rootSlots: null
			};
			return children;
		}
		var currentRequest = null;
		function pingTask(request, task) {
			request.pingedTasks.push(task);
			1 === request.pingedTasks.length && (request.flushScheduled = null !== request.destination, null !== request.trackedPostpones || 10 === request.status ? scheduleMicrotask(function() {
				return performWork(request);
			}) : scheduleWork(function() {
				return performWork(request);
			}));
		}
		function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
			fallbackAbortableTasks = {
				status: 0,
				rootSegmentID: -1,
				parentFlushed: !1,
				pendingTasks: 0,
				row,
				completedSegments: [],
				byteSize: 0,
				fallbackAbortableTasks,
				errorDigest: null,
				contentState: createHoistableState(),
				fallbackState: createHoistableState(),
				contentPreamble,
				fallbackPreamble,
				trackedContentKeyPath: null,
				trackedFallbackNode: null
			};
			null !== row && (row.pendingTasks++, contentPreamble = row.boundaries, null !== contentPreamble && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, null !== request && hoistHoistables(fallbackAbortableTasks.contentState, request));
			return fallbackAbortableTasks;
		}
		function createRenderTask(request, thenableState, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
			request.allPendingTasks++;
			null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
			null !== row && row.pendingTasks++;
			var task = {
				replay: null,
				node,
				childIndex,
				ping: function() {
					return pingTask(request, task);
				},
				blockedBoundary,
				blockedSegment,
				blockedPreamble,
				hoistableState,
				abortSet,
				keyPath,
				formatContext,
				context,
				treeContext,
				row,
				componentStack,
				thenableState
			};
			abortSet.add(task);
			return task;
		}
		function createReplayTask(request, thenableState, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
			request.allPendingTasks++;
			null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
			null !== row && row.pendingTasks++;
			replay.pendingTasks++;
			var task = {
				replay,
				node,
				childIndex,
				ping: function() {
					return pingTask(request, task);
				},
				blockedBoundary,
				blockedSegment: null,
				blockedPreamble: null,
				hoistableState,
				abortSet,
				keyPath,
				formatContext,
				context,
				treeContext,
				row,
				componentStack,
				thenableState
			};
			abortSet.add(task);
			return task;
		}
		function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
			return {
				status: 0,
				parentFlushed: !1,
				id: -1,
				index,
				chunks: [],
				children: [],
				preambleChildren: [],
				parentFormatContext,
				boundary,
				lastPushedText,
				textEmbedded
			};
		}
		function pushComponentStack(task) {
			var node = task.node;
			if ("object" === typeof node && null !== node) switch (node.$$typeof) {
				case REACT_ELEMENT_TYPE: task.componentStack = {
					parent: task.componentStack,
					type: node.type
				};
			}
		}
		function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
			return null === componentStack ? null : {
				parent: componentStack.parent,
				type: "Suspense Fallback"
			};
		}
		function getThrownInfo(node$jscomp$0) {
			var errorInfo = {};
			node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
				configurable: !0,
				enumerable: !0,
				get: function() {
					try {
						var info = "", node = node$jscomp$0;
						do
							info += describeComponentStackByType(node.type), node = node.parent;
						while (node);
						var JSCompiler_inline_result = info;
					} catch (x) {
						JSCompiler_inline_result = "\nError generating stack: " + x.message + "\n" + x.stack;
					}
					Object.defineProperty(errorInfo, "componentStack", { value: JSCompiler_inline_result });
					return JSCompiler_inline_result;
				}
			});
			return errorInfo;
		}
		function logRecoverableError(request, error, errorInfo) {
			request = request.onError;
			error = request(error, errorInfo);
			if (null == error || "string" === typeof error) return error;
		}
		function fatalError(request, error) {
			var onShellError = request.onShellError, onFatalError = request.onFatalError;
			onShellError(error);
			onFatalError(error);
			null !== request.destination ? (request.status = 14, closeWithError(request.destination, error)) : (request.status = 13, request.fatalError = error);
		}
		function finishSuspenseListRow(request, row) {
			unblockSuspenseListRow(request, row.next, row.hoistables);
		}
		function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
			for (; null !== unblockedRow;) {
				null !== inheritedHoistables && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
				var unblockedBoundaries = unblockedRow.boundaries;
				if (null !== unblockedBoundaries) {
					unblockedRow.boundaries = null;
					for (var i = 0; i < unblockedBoundaries.length; i++) {
						var unblockedBoundary = unblockedBoundaries[i];
						null !== inheritedHoistables && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
						finishedTask(request, unblockedBoundary, null, null);
					}
				}
				unblockedRow.pendingTasks--;
				if (0 < unblockedRow.pendingTasks) break;
				inheritedHoistables = unblockedRow.hoistables;
				unblockedRow = unblockedRow.next;
			}
		}
		function tryToResolveTogetherRow(request, togetherRow) {
			var boundaries = togetherRow.boundaries;
			if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
				for (var allCompleteAndInlinable = !0, i = 0; i < boundaries.length; i++) {
					var rowBoundary = boundaries[i];
					if (1 !== rowBoundary.pendingTasks || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
						allCompleteAndInlinable = !1;
						break;
					}
				}
				allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
			}
		}
		function createSuspenseListRow(previousRow) {
			var newRow = {
				pendingTasks: 1,
				boundaries: null,
				hoistables: createHoistableState(),
				inheritedHoistables: null,
				together: !1,
				next: null
			};
			null !== previousRow && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
			return newRow;
		}
		function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
			var prevKeyPath = task.keyPath, prevTreeContext = task.treeContext, prevRow = task.row;
			task.keyPath = keyPath;
			keyPath = rows.length;
			var previousSuspenseListRow = null;
			if (null !== task.replay) {
				var resumeSlots = task.replay.slots;
				if (null !== resumeSlots && "object" === typeof resumeSlots) for (var n = 0; n < keyPath; n++) {
					var i = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? n : keyPath - 1 - n, node = rows[i];
					task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
					task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
					var resumeSegmentID = resumeSlots[i];
					"number" === typeof resumeSegmentID ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
					0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
				}
				else for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++) n = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
			} else if ("backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder) for (revealOrder = 0; revealOrder < keyPath; revealOrder++) resumeSlots = rows[revealOrder], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, revealOrder), renderNode(request, task, resumeSlots, revealOrder), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
			else {
				revealOrder = task.blockedSegment;
				resumeSlots = revealOrder.children.length;
				n = revealOrder.chunks.length;
				for (i = keyPath - 1; 0 <= i; i--) {
					node = rows[i];
					task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
					task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
					resumeSegmentID = createPendingSegment(request, n, null, task.formatContext, 0 === i ? revealOrder.lastPushedText : !0, !0);
					revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
					task.blockedSegment = resumeSegmentID;
					try {
						renderNode(request, task, node, i), resumeSegmentID.lastPushedText && resumeSegmentID.textEmbedded && resumeSegmentID.chunks.push(textSeparator), resumeSegmentID.status = 1, finishedSegment(request, task.blockedBoundary, resumeSegmentID), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
					} catch (thrownValue) {
						throw resumeSegmentID.status = 12 === request.status ? 3 : 4, thrownValue;
					}
				}
				task.blockedSegment = revealOrder;
				revealOrder.lastPushedText = !1;
			}
			null !== prevRow && null !== previousSuspenseListRow && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
			task.treeContext = prevTreeContext;
			task.row = prevRow;
			task.keyPath = prevKeyPath;
		}
		function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
			var prevThenableState = task.thenableState;
			task.thenableState = null;
			currentlyRenderingComponent = {};
			currentlyRenderingTask = task;
			currentlyRenderingRequest = request;
			currentlyRenderingKeyPath = keyPath;
			actionStateCounter = localIdCounter = 0;
			actionStateMatchingIndex = -1;
			thenableIndexCounter = 0;
			thenableState = prevThenableState;
			for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate;) didScheduleRenderPhaseUpdate = !1, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
			resetHooksState();
			return request;
		}
		function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex) {
			var didEmitActionStateMarkers = !1;
			if (0 !== actionStateCount && null !== request.formState) {
				var segment = task.blockedSegment;
				if (null !== segment) {
					didEmitActionStateMarkers = !0;
					segment = segment.chunks;
					for (var i = 0; i < actionStateCount; i++) i === actionStateMatchingIndex ? segment.push(formStateMarkerIsMatching) : segment.push(formStateMarkerIsNotMatching);
				}
			}
			actionStateCount = task.keyPath;
			task.keyPath = keyPath;
			hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
			task.keyPath = actionStateCount;
		}
		function renderElement(request, task, keyPath, type, props, ref) {
			if ("function" === typeof type) if (type.prototype && type.prototype.isReactComponent) {
				var newProps = props;
				if ("ref" in props) {
					newProps = {};
					for (var propName in props) "ref" !== propName && (newProps[propName] = props[propName]);
				}
				var defaultProps = type.defaultProps;
				if (defaultProps) {
					newProps === props && (newProps = assign({}, newProps, props));
					for (var propName$44 in defaultProps) void 0 === newProps[propName$44] && (newProps[propName$44] = defaultProps[propName$44]);
				}
				props = newProps;
				newProps = emptyContextObject;
				defaultProps = type.contextType;
				"object" === typeof defaultProps && null !== defaultProps && (newProps = defaultProps._currentValue);
				newProps = new type(props, newProps);
				var initialState = void 0 !== newProps.state ? newProps.state : null;
				newProps.updater = classComponentUpdater;
				newProps.props = props;
				newProps.state = initialState;
				defaultProps = {
					queue: [],
					replace: !1
				};
				newProps._reactInternals = defaultProps;
				ref = type.contextType;
				newProps.context = "object" === typeof ref && null !== ref ? ref._currentValue : emptyContextObject;
				ref = type.getDerivedStateFromProps;
				"function" === typeof ref && (ref = ref(props, initialState), initialState = null === ref || void 0 === ref ? initialState : assign({}, initialState, ref), newProps.state = initialState);
				if ("function" !== typeof type.getDerivedStateFromProps && "function" !== typeof newProps.getSnapshotBeforeUpdate && ("function" === typeof newProps.UNSAFE_componentWillMount || "function" === typeof newProps.componentWillMount)) if (type = newProps.state, "function" === typeof newProps.componentWillMount && newProps.componentWillMount(), "function" === typeof newProps.UNSAFE_componentWillMount && newProps.UNSAFE_componentWillMount(), type !== newProps.state && classComponentUpdater.enqueueReplaceState(newProps, newProps.state, null), null !== defaultProps.queue && 0 < defaultProps.queue.length) if (type = defaultProps.queue, ref = defaultProps.replace, defaultProps.queue = null, defaultProps.replace = !1, ref && 1 === type.length) newProps.state = type[0];
				else {
					defaultProps = ref ? type[0] : newProps.state;
					initialState = !0;
					for (ref = ref ? 1 : 0; ref < type.length; ref++) propName$44 = type[ref], propName$44 = "function" === typeof propName$44 ? propName$44.call(newProps, defaultProps, props, void 0) : propName$44, null != propName$44 && (initialState ? (initialState = !1, defaultProps = assign({}, defaultProps, propName$44)) : assign(defaultProps, propName$44));
					newProps.state = defaultProps;
				}
				else defaultProps.queue = null;
				type = newProps.render();
				if (12 === request.status) throw null;
				props = task.keyPath;
				task.keyPath = keyPath;
				renderNodeDestructive(request, task, type, -1);
				task.keyPath = props;
			} else {
				type = renderWithHooks(request, task, keyPath, type, props, void 0);
				if (12 === request.status) throw null;
				finishFunctionComponent(request, task, keyPath, type, 0 !== localIdCounter, actionStateCounter, actionStateMatchingIndex);
			}
			else if ("string" === typeof type) if (newProps = task.blockedSegment, null === newProps) newProps = props.children, defaultProps = task.formatContext, initialState = task.keyPath, task.formatContext = getChildFormatContext(defaultProps, type, props), task.keyPath = keyPath, renderNode(request, task, newProps, -1), task.formatContext = defaultProps, task.keyPath = initialState;
			else {
				initialState = pushStartInstance(newProps.chunks, type, props, request.resumableState, request.renderState, task.blockedPreamble, task.hoistableState, task.formatContext, newProps.lastPushedText);
				newProps.lastPushedText = !1;
				defaultProps = task.formatContext;
				ref = task.keyPath;
				task.keyPath = keyPath;
				if (3 === (task.formatContext = getChildFormatContext(defaultProps, type, props)).insertionMode) {
					keyPath = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
					newProps.preambleChildren.push(keyPath);
					task.blockedSegment = keyPath;
					try {
						keyPath.status = 6, renderNode(request, task, initialState, -1), keyPath.lastPushedText && keyPath.textEmbedded && keyPath.chunks.push(textSeparator), keyPath.status = 1, finishedSegment(request, task.blockedBoundary, keyPath);
					} finally {
						task.blockedSegment = newProps;
					}
				} else renderNode(request, task, initialState, -1);
				task.formatContext = defaultProps;
				task.keyPath = ref;
				a: {
					task = newProps.chunks;
					request = request.resumableState;
					switch (type) {
						case "title":
						case "style":
						case "script":
						case "area":
						case "base":
						case "br":
						case "col":
						case "embed":
						case "hr":
						case "img":
						case "input":
						case "keygen":
						case "link":
						case "meta":
						case "param":
						case "source":
						case "track":
						case "wbr": break a;
						case "body":
							if (1 >= defaultProps.insertionMode) {
								request.hasBody = !0;
								break a;
							}
							break;
						case "html":
							if (0 === defaultProps.insertionMode) {
								request.hasHtml = !0;
								break a;
							}
							break;
						case "head": if (1 >= defaultProps.insertionMode) break a;
					}
					task.push(endChunkForTag(type));
				}
				newProps.lastPushedText = !1;
			}
			else {
				switch (type) {
					case REACT_LEGACY_HIDDEN_TYPE:
					case REACT_STRICT_MODE_TYPE:
					case REACT_PROFILER_TYPE:
					case REACT_FRAGMENT_TYPE:
						type = task.keyPath;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, props.children, -1);
						task.keyPath = type;
						return;
					case REACT_ACTIVITY_TYPE:
						type = task.blockedSegment;
						null === type ? "hidden" !== props.mode && (type = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = type) : "hidden" !== props.mode && (type.chunks.push(startActivityBoundary), type.lastPushedText = !1, newProps = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = newProps, type.chunks.push(endActivityBoundary), type.lastPushedText = !1);
						return;
					case REACT_SUSPENSE_LIST_TYPE:
						a: {
							type = props.children;
							props = props.revealOrder;
							if ("forwards" === props || "backwards" === props || "unstable_legacy-backwards" === props) {
								if (isArrayImpl(type)) {
									renderSuspenseListRows(request, task, keyPath, type, props);
									break a;
								}
								if (newProps = getIteratorFn(type)) {
									if (newProps = newProps.call(type)) {
										defaultProps = newProps.next();
										if (!defaultProps.done) {
											do
												defaultProps = newProps.next();
											while (!defaultProps.done);
											renderSuspenseListRows(request, task, keyPath, type, props);
										}
										break a;
									}
								}
							}
							"together" === props ? (props = task.keyPath, newProps = task.row, defaultProps = task.row = createSuspenseListRow(null), defaultProps.boundaries = [], defaultProps.together = !0, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), 0 === --defaultProps.pendingTasks && finishSuspenseListRow(request, defaultProps), task.keyPath = props, task.row = newProps, null !== newProps && 0 < defaultProps.pendingTasks && (newProps.pendingTasks++, defaultProps.next = newProps)) : (props = task.keyPath, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), task.keyPath = props);
						}
						return;
					case REACT_VIEW_TRANSITION_TYPE:
					case REACT_SCOPE_TYPE: throw Error(formatProdErrorMessage(343));
					case REACT_SUSPENSE_TYPE:
						a: if (null !== task.replay) {
							type = task.keyPath;
							newProps = task.formatContext;
							defaultProps = task.row;
							task.keyPath = keyPath;
							task.formatContext = getSuspenseContentFormatContext(request.resumableState, newProps);
							task.row = null;
							keyPath = props.children;
							try {
								renderNode(request, task, keyPath, -1);
							} finally {
								task.keyPath = type, task.formatContext = newProps, task.row = defaultProps;
							}
						} else {
							type = task.keyPath;
							ref = task.formatContext;
							var prevRow = task.row;
							propName$44 = task.blockedBoundary;
							propName = task.blockedPreamble;
							var parentHoistableState = task.hoistableState, parentSegment = task.blockedSegment, fallback = props.fallback;
							props = props.children;
							var fallbackAbortSet = /* @__PURE__ */ new Set();
							var newBoundary = 2 > task.formatContext.insertionMode ? createSuspenseBoundary(request, task.row, fallbackAbortSet, createPreambleState(), createPreambleState()) : createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
							null !== request.trackedPostpones && (newBoundary.trackedContentKeyPath = keyPath);
							var boundarySegment = createPendingSegment(request, parentSegment.chunks.length, newBoundary, task.formatContext, !1, !1);
							parentSegment.children.push(boundarySegment);
							parentSegment.lastPushedText = !1;
							var contentRootSegment = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
							contentRootSegment.parentFlushed = !0;
							if (null !== request.trackedPostpones) {
								newProps = task.componentStack;
								defaultProps = [
									keyPath[0],
									"Suspense Fallback",
									keyPath[2]
								];
								initialState = [
									defaultProps[1],
									defaultProps[2],
									[],
									null
								];
								request.trackedPostpones.workingMap.set(defaultProps, initialState);
								newBoundary.trackedFallbackNode = initialState;
								task.blockedSegment = boundarySegment;
								task.blockedPreamble = newBoundary.fallbackPreamble;
								task.keyPath = defaultProps;
								task.formatContext = getSuspenseFallbackFormatContext(request.resumableState, ref);
								task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
								boundarySegment.status = 6;
								try {
									renderNode(request, task, fallback, -1), boundarySegment.lastPushedText && boundarySegment.textEmbedded && boundarySegment.chunks.push(textSeparator), boundarySegment.status = 1, finishedSegment(request, propName$44, boundarySegment);
								} catch (thrownValue) {
									throw boundarySegment.status = 12 === request.status ? 3 : 4, thrownValue;
								} finally {
									task.blockedSegment = parentSegment, task.blockedPreamble = propName, task.keyPath = type, task.formatContext = ref;
								}
								task = createRenderTask(request, null, props, -1, newBoundary, contentRootSegment, newBoundary.contentPreamble, newBoundary.contentState, task.abortSet, keyPath, getSuspenseContentFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, null, newProps);
								pushComponentStack(task);
								request.pingedTasks.push(task);
							} else {
								task.blockedBoundary = newBoundary;
								task.blockedPreamble = newBoundary.contentPreamble;
								task.hoistableState = newBoundary.contentState;
								task.blockedSegment = contentRootSegment;
								task.keyPath = keyPath;
								task.formatContext = getSuspenseContentFormatContext(request.resumableState, ref);
								task.row = null;
								contentRootSegment.status = 6;
								try {
									if (renderNode(request, task, props, -1), contentRootSegment.lastPushedText && contentRootSegment.textEmbedded && contentRootSegment.chunks.push(textSeparator), contentRootSegment.status = 1, finishedSegment(request, newBoundary, contentRootSegment), queueCompletedSegment(newBoundary, contentRootSegment), 0 === newBoundary.pendingTasks && 0 === newBoundary.status) {
										if (newBoundary.status = 1, !isEligibleForOutlining(request, newBoundary)) {
											null !== prevRow && 0 === --prevRow.pendingTasks && finishSuspenseListRow(request, prevRow);
											0 === request.pendingRootTasks && task.blockedPreamble && preparePreamble(request);
											break a;
										}
									} else null !== prevRow && prevRow.together && tryToResolveTogetherRow(request, prevRow);
								} catch (thrownValue$31) {
									newBoundary.status = 4, 12 === request.status ? (contentRootSegment.status = 3, newProps = request.fatalError) : (contentRootSegment.status = 4, newProps = thrownValue$31), defaultProps = getThrownInfo(task.componentStack), initialState = logRecoverableError(request, newProps, defaultProps), newBoundary.errorDigest = initialState, untrackBoundary(request, newBoundary);
								} finally {
									task.blockedBoundary = propName$44, task.blockedPreamble = propName, task.hoistableState = parentHoistableState, task.blockedSegment = parentSegment, task.keyPath = type, task.formatContext = ref, task.row = prevRow;
								}
								task = createRenderTask(request, null, fallback, -1, propName$44, boundarySegment, newBoundary.fallbackPreamble, newBoundary.fallbackState, fallbackAbortSet, [
									keyPath[0],
									"Suspense Fallback",
									keyPath[2]
								], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack));
								pushComponentStack(task);
								request.pingedTasks.push(task);
							}
						}
						return;
				}
				if ("object" === typeof type && null !== type) switch (type.$$typeof) {
					case REACT_FORWARD_REF_TYPE:
						if ("ref" in props) for (parentSegment in newProps = {}, props) "ref" !== parentSegment && (newProps[parentSegment] = props[parentSegment]);
						else newProps = props;
						type = renderWithHooks(request, task, keyPath, type.render, newProps, ref);
						finishFunctionComponent(request, task, keyPath, type, 0 !== localIdCounter, actionStateCounter, actionStateMatchingIndex);
						return;
					case REACT_MEMO_TYPE:
						renderElement(request, task, keyPath, type.type, props, ref);
						return;
					case REACT_CONTEXT_TYPE:
						defaultProps = props.children;
						newProps = task.keyPath;
						props = props.value;
						initialState = type._currentValue;
						type._currentValue = props;
						ref = currentActiveSnapshot;
						currentActiveSnapshot = type = {
							parent: ref,
							depth: null === ref ? 0 : ref.depth + 1,
							context: type,
							parentValue: initialState,
							value: props
						};
						task.context = type;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, defaultProps, -1);
						request = currentActiveSnapshot;
						if (null === request) throw Error(formatProdErrorMessage(403));
						request.context._currentValue = request.parentValue;
						request = currentActiveSnapshot = request.parent;
						task.context = request;
						task.keyPath = newProps;
						return;
					case REACT_CONSUMER_TYPE:
						props = props.children;
						type = props(type._context._currentValue);
						props = task.keyPath;
						task.keyPath = keyPath;
						renderNodeDestructive(request, task, type, -1);
						task.keyPath = props;
						return;
					case REACT_LAZY_TYPE:
						newProps = type._init;
						type = newProps(type._payload);
						if (12 === request.status) throw null;
						renderElement(request, task, keyPath, type, props, ref);
						return;
				}
				throw Error(formatProdErrorMessage(130, null == type ? type : typeof type, ""));
			}
		}
		function resumeNode(request, task, segmentId, node, childIndex) {
			var prevReplay = task.replay, blockedBoundary = task.blockedBoundary, resumedSegment = createPendingSegment(request, 0, null, task.formatContext, !1, !1);
			resumedSegment.id = segmentId;
			resumedSegment.parentFlushed = !0;
			try {
				task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = 1, finishedSegment(request, blockedBoundary, resumedSegment), null === blockedBoundary ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
			} finally {
				task.replay = prevReplay, task.blockedSegment = null;
			}
		}
		function renderNodeDestructive(request, task, node, childIndex) {
			null !== task.replay && "number" === typeof task.replay.slots ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, pushComponentStack(task), retryNode(request, task), task.componentStack = node);
		}
		function retryNode(request, task) {
			var node = task.node, childIndex = task.childIndex;
			if (null !== node) {
				if ("object" === typeof node) {
					switch (node.$$typeof) {
						case REACT_ELEMENT_TYPE:
							var type = node.type, key = node.key, props = node.props;
							node = props.ref;
							var ref = void 0 !== node ? node : null, name = getComponentNameFromType(type), keyOrIndex = null == key ? -1 === childIndex ? 0 : childIndex : key;
							key = [
								task.keyPath,
								name,
								keyOrIndex
							];
							if (null !== task.replay) a: {
								var replay = task.replay;
								childIndex = replay.nodes;
								for (node = 0; node < childIndex.length; node++) {
									var node$jscomp$0 = childIndex[node];
									if (keyOrIndex === node$jscomp$0[1]) {
										if (4 === node$jscomp$0.length) {
											if (null !== name && name !== node$jscomp$0[0]) throw Error(formatProdErrorMessage(490, node$jscomp$0[0], name));
											var childNodes = node$jscomp$0[2];
											name = node$jscomp$0[3];
											keyOrIndex = task.node;
											task.replay = {
												nodes: childNodes,
												slots: name,
												pendingTasks: 1
											};
											try {
												renderElement(request, task, key, type, props, ref);
												if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
												task.replay.pendingTasks--;
											} catch (x) {
												if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then)) throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(node, 1), x;
												task.replay.pendingTasks--;
												props = getThrownInfo(task.componentStack);
												key = request;
												request = task.blockedBoundary;
												type = x;
												props = logRecoverableError(key, type, props);
												abortRemainingReplayNodes(key, request, childNodes, name, type, props);
											}
											task.replay = replay;
										} else {
											if (type !== REACT_SUSPENSE_TYPE) throw Error(formatProdErrorMessage(490, "Suspense", getComponentNameFromType(type) || "Unknown"));
											b: {
												replay = void 0;
												type = node$jscomp$0[5];
												ref = node$jscomp$0[2];
												name = node$jscomp$0[3];
												keyOrIndex = null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
												node$jscomp$0 = null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
												var prevKeyPath = task.keyPath, prevContext = task.formatContext, prevRow = task.row, previousReplaySet = task.replay, parentBoundary = task.blockedBoundary, parentHoistableState = task.hoistableState, content = props.children, fallback = props.fallback, fallbackAbortSet = /* @__PURE__ */ new Set();
												props = 2 > task.formatContext.insertionMode ? createSuspenseBoundary(request, task.row, fallbackAbortSet, createPreambleState(), createPreambleState()) : createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
												props.parentFlushed = !0;
												props.rootSegmentID = type;
												task.blockedBoundary = props;
												task.hoistableState = props.contentState;
												task.keyPath = key;
												task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext);
												task.row = null;
												task.replay = {
													nodes: ref,
													slots: name,
													pendingTasks: 1
												};
												try {
													renderNode(request, task, content, -1);
													if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
													task.replay.pendingTasks--;
													if (0 === props.pendingTasks && 0 === props.status) {
														props.status = 1;
														request.completedBoundaries.push(props);
														break b;
													}
												} catch (error) {
													props.status = 4, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(request, error, childNodes), props.errorDigest = replay, task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
												} finally {
													task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
												}
												childNodes = createReplayTask(request, null, {
													nodes: keyOrIndex,
													slots: node$jscomp$0,
													pendingTasks: 0
												}, fallback, -1, parentBoundary, props.fallbackState, fallbackAbortSet, [
													key[0],
													"Suspense Fallback",
													key[2]
												], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack));
												pushComponentStack(childNodes);
												request.pingedTasks.push(childNodes);
											}
										}
										childIndex.splice(node, 1);
										break a;
									}
								}
							}
							else renderElement(request, task, key, type, props, ref);
							return;
						case REACT_PORTAL_TYPE: throw Error(formatProdErrorMessage(257));
						case REACT_LAZY_TYPE:
							childNodes = node._init;
							node = childNodes(node._payload);
							if (12 === request.status) throw null;
							renderNodeDestructive(request, task, node, childIndex);
							return;
					}
					if (isArrayImpl(node)) {
						renderChildrenArray(request, task, node, childIndex);
						return;
					}
					if (childNodes = getIteratorFn(node)) {
						if (childNodes = childNodes.call(node)) {
							node = childNodes.next();
							if (!node.done) {
								props = [];
								do
									props.push(node.value), node = childNodes.next();
								while (!node.done);
								renderChildrenArray(request, task, props, childIndex);
							}
							return;
						}
					}
					if ("function" === typeof node.then) return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
					if (node.$$typeof === REACT_CONTEXT_TYPE) return renderNodeDestructive(request, task, node._currentValue, childIndex);
					childIndex = Object.prototype.toString.call(node);
					throw Error(formatProdErrorMessage(31, "[object Object]" === childIndex ? "object with keys {" + Object.keys(node).join(", ") + "}" : childIndex));
				}
				if ("string" === typeof node) childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(childIndex.chunks, node, request.renderState, childIndex.lastPushedText));
				else if ("number" === typeof node || "bigint" === typeof node) childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(childIndex.chunks, "" + node, request.renderState, childIndex.lastPushedText));
			}
		}
		function renderChildrenArray(request, task, children, childIndex) {
			var prevKeyPath = task.keyPath;
			if (-1 !== childIndex && (task.keyPath = [
				task.keyPath,
				"Fragment",
				childIndex
			], null !== task.replay)) {
				for (var replay = task.replay, replayNodes = replay.nodes, j = 0; j < replayNodes.length; j++) {
					var node = replayNodes[j];
					if (node[1] === childIndex) {
						childIndex = node[2];
						node = node[3];
						task.replay = {
							nodes: childIndex,
							slots: node,
							pendingTasks: 1
						};
						try {
							renderChildrenArray(request, task, children, -1);
							if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
							task.replay.pendingTasks--;
						} catch (x) {
							if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then)) throw x;
							task.replay.pendingTasks--;
							children = getThrownInfo(task.componentStack);
							var boundary = task.blockedBoundary, error = x;
							children = logRecoverableError(request, error, children);
							abortRemainingReplayNodes(request, boundary, childIndex, node, error, children);
						}
						task.replay = replay;
						replayNodes.splice(j, 1);
						break;
					}
				}
				task.keyPath = prevKeyPath;
				return;
			}
			replay = task.treeContext;
			replayNodes = children.length;
			if (null !== task.replay && (j = task.replay.slots, null !== j && "object" === typeof j)) {
				for (childIndex = 0; childIndex < replayNodes; childIndex++) node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), boundary = j[childIndex], "number" === typeof boundary ? (resumeNode(request, task, boundary, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
				task.treeContext = replay;
				task.keyPath = prevKeyPath;
				return;
			}
			for (j = 0; j < replayNodes; j++) childIndex = children[j], task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
			task.treeContext = replay;
			task.keyPath = prevKeyPath;
		}
		function trackPostponedBoundary(request, trackedPostpones, boundary) {
			boundary.status = 5;
			boundary.rootSegmentID = request.nextSegmentId++;
			request = boundary.trackedContentKeyPath;
			if (null === request) throw Error(formatProdErrorMessage(486));
			var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
			if (void 0 === boundaryNode) return boundary = [
				request[1],
				request[2],
				children,
				null,
				fallbackReplayNode,
				boundary.rootSegmentID
			], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
			boundaryNode[4] = fallbackReplayNode;
			boundaryNode[5] = boundary.rootSegmentID;
			return boundaryNode;
		}
		function trackPostpone(request, trackedPostpones, task, segment) {
			segment.status = 5;
			var keyPath = task.keyPath, boundary = task.blockedBoundary;
			if (null === boundary) segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, null !== request.completedRootSegment && (request.completedRootSegment.status = 5);
			else {
				if (null !== boundary && 0 === boundary.status) {
					var boundaryNode = trackPostponedBoundary(request, trackedPostpones, boundary);
					if (boundary.trackedContentKeyPath === keyPath && -1 === task.childIndex) {
						-1 === segment.id && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
						boundaryNode[3] = segment.id;
						return;
					}
				}
				-1 === segment.id && (segment.id = segment.parentFlushed && null !== boundary ? boundary.rootSegmentID : request.nextSegmentId++);
				if (-1 === task.childIndex) null === keyPath ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), void 0 === task ? (task = [
					keyPath[1],
					keyPath[2],
					[],
					segment.id
				], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
				else {
					if (null === keyPath) {
						if (request = trackedPostpones.rootSlots, null === request) request = trackedPostpones.rootSlots = {};
						else if ("number" === typeof request) throw Error(formatProdErrorMessage(491));
					} else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), void 0 === boundaryNode) request = {}, boundaryNode = [
						keyPath[1],
						keyPath[2],
						[],
						request
					], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
					else if (request = boundaryNode[3], null === request) request = boundaryNode[3] = {};
					else if ("number" === typeof request) throw Error(formatProdErrorMessage(491));
					request[task.childIndex] = segment.id;
				}
			}
		}
		function untrackBoundary(request, boundary) {
			request = request.trackedPostpones;
			null !== request && (boundary = boundary.trackedContentKeyPath, null !== boundary && (boundary = request.workingMap.get(boundary), void 0 !== boundary && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
		}
		function spawnNewSuspendedReplayTask(request, task, thenableState) {
			return createReplayTask(request, thenableState, task.replay, task.node, task.childIndex, task.blockedBoundary, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack);
		}
		function spawnNewSuspendedRenderTask(request, task, thenableState) {
			var segment = task.blockedSegment, newSegment = createPendingSegment(request, segment.chunks.length, null, task.formatContext, segment.lastPushedText, !0);
			segment.children.push(newSegment);
			segment.lastPushedText = !1;
			return createRenderTask(request, thenableState, task.node, task.childIndex, task.blockedBoundary, newSegment, task.blockedPreamble, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack);
		}
		function renderNode(request, task, node, childIndex) {
			var previousFormatContext = task.formatContext, previousContext = task.context, previousKeyPath = task.keyPath, previousTreeContext = task.treeContext, previousComponentStack = task.componentStack, segment = task.blockedSegment;
			if (null === segment) {
				segment = task.replay;
				try {
					return renderNodeDestructive(request, task, node, childIndex);
				} catch (thrownValue) {
					if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, 12 !== request.status && "object" === typeof node && null !== node) {
						if ("function" === typeof node.then) {
							childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
							request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
							node.then(request, request);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							task.replay = segment;
							switchContext(previousContext);
							return;
						}
						if ("Maximum call stack size exceeded" === node.message) {
							node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
							node = spawnNewSuspendedReplayTask(request, task, node);
							request.pingedTasks.push(node);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							task.replay = segment;
							switchContext(previousContext);
							return;
						}
					}
				}
			} else {
				var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
				try {
					return renderNodeDestructive(request, task, node, childIndex);
				} catch (thrownValue$63) {
					if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$63 === SuspenseException ? getSuspendedThenable() : thrownValue$63, 12 !== request.status && "object" === typeof node && null !== node) {
						if ("function" === typeof node.then) {
							segment = node;
							node = thrownValue$63 === SuspenseException ? getThenableStateAfterSuspending() : null;
							request = spawnNewSuspendedRenderTask(request, task, node).ping;
							segment.then(request, request);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							switchContext(previousContext);
							return;
						}
						if ("Maximum call stack size exceeded" === node.message) {
							segment = thrownValue$63 === SuspenseException ? getThenableStateAfterSuspending() : null;
							segment = spawnNewSuspendedRenderTask(request, task, segment);
							request.pingedTasks.push(segment);
							task.formatContext = previousFormatContext;
							task.context = previousContext;
							task.keyPath = previousKeyPath;
							task.treeContext = previousTreeContext;
							task.componentStack = previousComponentStack;
							switchContext(previousContext);
							return;
						}
					}
				}
			}
			task.formatContext = previousFormatContext;
			task.context = previousContext;
			task.keyPath = previousKeyPath;
			task.treeContext = previousTreeContext;
			switchContext(previousContext);
			throw node;
		}
		function abortTaskSoft(task) {
			var boundary = task.blockedBoundary, segment = task.blockedSegment;
			null !== segment && (segment.status = 3, finishedTask(this, boundary, task.row, segment));
		}
		function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error, errorDigest$jscomp$0) {
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				if (4 === node.length) abortRemainingReplayNodes(request$jscomp$0, boundary, node[2], node[3], error, errorDigest$jscomp$0);
				else {
					node = node[5];
					var request = request$jscomp$0, errorDigest = errorDigest$jscomp$0, resumedBoundary = createSuspenseBoundary(request, null, /* @__PURE__ */ new Set(), null, null);
					resumedBoundary.parentFlushed = !0;
					resumedBoundary.rootSegmentID = node;
					resumedBoundary.status = 4;
					resumedBoundary.errorDigest = errorDigest;
					resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
				}
			}
			nodes.length = 0;
			if (null !== slots) {
				if (null === boundary) throw Error(formatProdErrorMessage(487));
				4 !== boundary.status && (boundary.status = 4, boundary.errorDigest = errorDigest$jscomp$0, boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
				if ("object" === typeof slots) for (var index in slots) delete slots[index];
			}
		}
		function abortTask(task, request, error) {
			var boundary = task.blockedBoundary, segment = task.blockedSegment;
			if (null !== segment) {
				if (6 === segment.status) return;
				segment.status = 3;
			}
			var errorInfo = getThrownInfo(task.componentStack);
			if (null === boundary) {
				if (13 !== request.status && 14 !== request.status) {
					boundary = task.replay;
					if (null === boundary) {
						null !== request.trackedPostpones && null !== segment ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo), fatalError(request, error));
						return;
					}
					boundary.pendingTasks--;
					0 === boundary.pendingTasks && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo), abortRemainingReplayNodes(request, null, boundary.nodes, boundary.slots, error, segment));
					request.pendingRootTasks--;
					0 === request.pendingRootTasks && completeShell(request);
				}
			} else {
				var trackedPostpones$64 = request.trackedPostpones;
				if (4 !== boundary.status) {
					if (null !== trackedPostpones$64 && null !== segment) return logRecoverableError(request, error, errorInfo), trackPostpone(request, trackedPostpones$64, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
						return abortTask(fallbackTask, request, error);
					}), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
					boundary.status = 4;
					segment = logRecoverableError(request, error, errorInfo);
					boundary.status = 4;
					boundary.errorDigest = segment;
					untrackBoundary(request, boundary);
					boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
				}
				boundary.pendingTasks--;
				segment = boundary.row;
				null !== segment && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
				boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
					return abortTask(fallbackTask, request, error);
				});
				boundary.fallbackAbortableTasks.clear();
			}
			task = task.row;
			null !== task && 0 === --task.pendingTasks && finishSuspenseListRow(request, task);
			request.allPendingTasks--;
			0 === request.allPendingTasks && completeAll(request);
		}
		function safelyEmitEarlyPreloads(request, shellComplete) {
			try {
				var renderState = request.renderState, onHeaders = renderState.onHeaders;
				if (onHeaders) {
					var headers = renderState.headers;
					if (headers) {
						renderState.headers = null;
						var linkHeader = headers.preconnects;
						headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
						headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
						if (!shellComplete) {
							var queueIter = renderState.styles.values(), queueStep = queueIter.next();
							b: for (; 0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next()) for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next(); 0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
								var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props, header = getPreloadAsHeader(props$jscomp$0.href, "style", {
									crossOrigin: props$jscomp$0.crossOrigin,
									integrity: props$jscomp$0.integrity,
									nonce: props$jscomp$0.nonce,
									type: props$jscomp$0.type,
									fetchPriority: props$jscomp$0.fetchPriority,
									referrerPolicy: props$jscomp$0.referrerPolicy,
									media: props$jscomp$0.media
								});
								if (0 <= (headers.remainingCapacity -= header.length + 2)) renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = "string" === typeof props.crossOrigin || "string" === typeof props.integrity ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
								else break b;
							}
						}
						linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
					}
				}
			} catch (error) {
				logRecoverableError(request, error, {});
			}
		}
		function completeShell(request) {
			null === request.trackedPostpones && safelyEmitEarlyPreloads(request, !0);
			null === request.trackedPostpones && preparePreamble(request);
			request.onShellError = noop;
			request = request.onShellReady;
			request();
		}
		function completeAll(request) {
			safelyEmitEarlyPreloads(request, null === request.trackedPostpones ? !0 : null === request.completedRootSegment || 5 !== request.completedRootSegment.status);
			preparePreamble(request);
			request = request.onAllReady;
			request();
		}
		function queueCompletedSegment(boundary, segment) {
			if (0 === segment.chunks.length && 1 === segment.children.length && null === segment.children[0].boundary && -1 === segment.children[0].id) {
				var childSegment = segment.children[0];
				childSegment.id = segment.id;
				childSegment.parentFlushed = !0;
				1 !== childSegment.status && 3 !== childSegment.status && 4 !== childSegment.status || queueCompletedSegment(boundary, childSegment);
			} else boundary.completedSegments.push(segment);
		}
		function finishedSegment(request, boundary, segment) {
			if (null !== byteLengthOfChunk) {
				segment = segment.chunks;
				for (var segmentByteSize = 0, i = 0; i < segment.length; i++) segmentByteSize += segment[i].byteLength;
				null === boundary ? request.byteSize += segmentByteSize : boundary.byteSize += segmentByteSize;
			}
		}
		function finishedTask(request, boundary, row, segment) {
			null !== row && (0 === --row.pendingTasks ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
			request.allPendingTasks--;
			if (null === boundary) {
				if (null !== segment && segment.parentFlushed) {
					if (null !== request.completedRootSegment) throw Error(formatProdErrorMessage(389));
					request.completedRootSegment = segment;
				}
				request.pendingRootTasks--;
				0 === request.pendingRootTasks && completeShell(request);
			} else if (boundary.pendingTasks--, 4 !== boundary.status) if (0 === boundary.pendingTasks) {
				if (0 === boundary.status && (boundary.status = 1), null !== segment && segment.parentFlushed && (1 === segment.status || 3 === segment.status) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), 1 === boundary.status) row = boundary.row, null !== row && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row)), 0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary.contentPreamble && preparePreamble(request);
				else if (5 === boundary.status && (boundary = boundary.row, null !== boundary)) {
					if (null !== request.trackedPostpones) {
						row = request.trackedPostpones;
						var postponedRow = boundary.next;
						if (null !== postponedRow && (segment = postponedRow.boundaries, null !== segment)) for (postponedRow.boundaries = null, postponedRow = 0; postponedRow < segment.length; postponedRow++) {
							var postponedBoundary = segment[postponedRow];
							trackPostponedBoundary(request, row, postponedBoundary);
							finishedTask(request, postponedBoundary, null, null);
						}
					}
					0 === --boundary.pendingTasks && finishSuspenseListRow(request, boundary);
				}
			} else null === segment || !segment.parentFlushed || 1 !== segment.status && 3 !== segment.status || (queueCompletedSegment(boundary, segment), 1 === boundary.completedSegments.length && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, null !== boundary && boundary.together && tryToResolveTogetherRow(request, boundary);
			0 === request.allPendingTasks && completeAll(request);
		}
		function performWork(request$jscomp$2) {
			if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
				var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
				ReactSharedInternals.H = HooksDispatcher;
				var prevAsyncDispatcher = ReactSharedInternals.A;
				ReactSharedInternals.A = DefaultAsyncDispatcher;
				var prevRequest = currentRequest;
				currentRequest = request$jscomp$2;
				var prevResumableState = currentResumableState;
				currentResumableState = request$jscomp$2.resumableState;
				try {
					var pingedTasks = request$jscomp$2.pingedTasks, i;
					for (i = 0; i < pingedTasks.length; i++) {
						var task = pingedTasks[i], request = request$jscomp$2, segment = task.blockedSegment;
						if (null === segment) {
							var request$jscomp$0 = request;
							if (0 !== task.replay.pendingTasks) {
								switchContext(task.context);
								try {
									"number" === typeof task.replay.slots ? resumeNode(request$jscomp$0, task, task.replay.slots, task.node, task.childIndex) : retryNode(request$jscomp$0, task);
									if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length) throw Error(formatProdErrorMessage(488));
									task.replay.pendingTasks--;
									task.abortSet.delete(task);
									finishedTask(request$jscomp$0, task.blockedBoundary, task.row, null);
								} catch (thrownValue) {
									resetHooksState();
									var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
									if ("object" === typeof x && null !== x && "function" === typeof x.then) {
										var ping = task.ping;
										x.then(ping, ping);
										task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
									} else {
										task.replay.pendingTasks--;
										task.abortSet.delete(task);
										var errorInfo = getThrownInfo(task.componentStack);
										request = void 0;
										var request$jscomp$1 = request$jscomp$0, boundary = task.blockedBoundary, error$jscomp$0 = 12 === request$jscomp$0.status ? request$jscomp$0.fatalError : x, replayNodes = task.replay.nodes, resumeSlots = task.replay.slots;
										request = logRecoverableError(request$jscomp$1, error$jscomp$0, errorInfo);
										abortRemainingReplayNodes(request$jscomp$1, boundary, replayNodes, resumeSlots, error$jscomp$0, request);
										request$jscomp$0.pendingRootTasks--;
										0 === request$jscomp$0.pendingRootTasks && completeShell(request$jscomp$0);
										request$jscomp$0.allPendingTasks--;
										0 === request$jscomp$0.allPendingTasks && completeAll(request$jscomp$0);
									}
								}
							}
						} else if (request$jscomp$0 = void 0, request$jscomp$1 = segment, 0 === request$jscomp$1.status) {
							request$jscomp$1.status = 6;
							switchContext(task.context);
							var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
							try {
								retryNode(request, task), request$jscomp$1.lastPushedText && request$jscomp$1.textEmbedded && request$jscomp$1.chunks.push(textSeparator), task.abortSet.delete(task), request$jscomp$1.status = 1, finishedSegment(request, task.blockedBoundary, request$jscomp$1), finishedTask(request, task.blockedBoundary, task.row, request$jscomp$1);
							} catch (thrownValue) {
								resetHooksState();
								request$jscomp$1.children.length = childrenLength;
								request$jscomp$1.chunks.length = chunkLength;
								var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : 12 === request.status ? request.fatalError : thrownValue;
								if (12 === request.status && null !== request.trackedPostpones) {
									var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(task.componentStack);
									task.abortSet.delete(task);
									logRecoverableError(request, x$jscomp$0, thrownInfo);
									trackPostpone(request, trackedPostpones, task, request$jscomp$1);
									finishedTask(request, task.blockedBoundary, task.row, request$jscomp$1);
								} else if ("object" === typeof x$jscomp$0 && null !== x$jscomp$0 && "function" === typeof x$jscomp$0.then) {
									request$jscomp$1.status = 0;
									task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
									var ping$jscomp$0 = task.ping;
									x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
								} else {
									var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
									task.abortSet.delete(task);
									request$jscomp$1.status = 4;
									var boundary$jscomp$0 = task.blockedBoundary, row = task.row;
									null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
									request.allPendingTasks--;
									request$jscomp$0 = logRecoverableError(request, x$jscomp$0, errorInfo$jscomp$0);
									if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
									else if (boundary$jscomp$0.pendingTasks--, 4 !== boundary$jscomp$0.status) {
										boundary$jscomp$0.status = 4;
										boundary$jscomp$0.errorDigest = request$jscomp$0;
										untrackBoundary(request, boundary$jscomp$0);
										var boundaryRow = boundary$jscomp$0.row;
										null !== boundaryRow && 0 === --boundaryRow.pendingTasks && finishSuspenseListRow(request, boundaryRow);
										boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
										0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary$jscomp$0.contentPreamble && preparePreamble(request);
									}
									0 === request.allPendingTasks && completeAll(request);
								}
							}
						}
					}
					pingedTasks.splice(0, i);
					null !== request$jscomp$2.destination && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
				} catch (error) {
					logRecoverableError(request$jscomp$2, error, {}), fatalError(request$jscomp$2, error);
				} finally {
					currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
				}
			}
		}
		function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
			segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
			for (var pendingPreambles = !1, i = 0; i < segment.children.length; i++) pendingPreambles = preparePreambleFromSegment(request, segment.children[i], collectedPreambleSegments) || pendingPreambles;
			return pendingPreambles;
		}
		function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
			var boundary = segment.boundary;
			if (null === boundary) return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
			var preamble = boundary.contentPreamble, fallbackPreamble = boundary.fallbackPreamble;
			if (null === preamble || null === fallbackPreamble) return !1;
			switch (boundary.status) {
				case 1:
					hoistPreambleState(request.renderState, preamble);
					request.byteSize += boundary.byteSize;
					segment = boundary.completedSegments[0];
					if (!segment) throw Error(formatProdErrorMessage(391));
					return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
				case 5: if (null !== request.trackedPostpones) return !0;
				case 4: if (1 === segment.status) return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
				default: return !0;
			}
		}
		function preparePreamble(request) {
			if (request.completedRootSegment && null === request.completedPreambleSegments) {
				var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(request, request.completedRootSegment, collectedPreambleSegments), preamble = request.renderState.preamble;
				!1 === hasPendingPreambles || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
			}
		}
		function flushSubtree(request, destination, segment, hoistableState) {
			segment.parentFlushed = !0;
			switch (segment.status) {
				case 0: segment.id = request.nextSegmentId++;
				case 5: return hoistableState = segment.id, segment.lastPushedText = !1, segment.textEmbedded = !1, request = request.renderState, writeChunk(destination, placeholder1), writeChunk(destination, request.placeholderPrefix), request = stringToChunk(hoistableState.toString(16)), writeChunk(destination, request), writeChunkAndReturn(destination, placeholder2);
				case 1:
					segment.status = 2;
					var r = !0, chunks = segment.chunks, chunkIdx = 0;
					segment = segment.children;
					for (var childIdx = 0; childIdx < segment.length; childIdx++) {
						for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++) writeChunk(destination, chunks[chunkIdx]);
						r = flushSegment(request, destination, r, hoistableState);
					}
					for (; chunkIdx < chunks.length - 1; chunkIdx++) writeChunk(destination, chunks[chunkIdx]);
					chunkIdx < chunks.length && (r = writeChunkAndReturn(destination, chunks[chunkIdx]));
					return r;
				case 3: return !0;
				default: throw Error(formatProdErrorMessage(390));
			}
		}
		var flushedByteSize = 0;
		function flushSegment(request, destination, segment, hoistableState) {
			var boundary = segment.boundary;
			if (null === boundary) return flushSubtree(request, destination, segment, hoistableState);
			boundary.parentFlushed = !0;
			if (4 === boundary.status) {
				var row = boundary.row;
				null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
				boundary = boundary.errorDigest;
				writeChunkAndReturn(destination, startClientRenderedSuspenseBoundary);
				writeChunk(destination, clientRenderedSuspenseBoundaryError1);
				boundary && (writeChunk(destination, clientRenderedSuspenseBoundaryError1A), writeChunk(destination, stringToChunk(escapeTextForBrowser(boundary))), writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial));
				writeChunkAndReturn(destination, clientRenderedSuspenseBoundaryError2);
				flushSubtree(request, destination, segment, hoistableState);
			} else if (1 !== boundary.status) 0 === boundary.status && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState);
			else if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && (flushedByteSize + boundary.byteSize > request.progressiveChunkSize || hasSuspenseyContent(boundary.contentState))) boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), flushSubtree(request, destination, segment, hoistableState);
			else {
				flushedByteSize += boundary.byteSize;
				hoistableState && hoistHoistables(hoistableState, boundary.contentState);
				segment = boundary.row;
				null !== segment && isEligibleForOutlining(request, boundary) && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
				writeChunkAndReturn(destination, startCompletedSuspenseBoundary);
				segment = boundary.completedSegments;
				if (1 !== segment.length) throw Error(formatProdErrorMessage(391));
				flushSegment(request, destination, segment[0], hoistableState);
			}
			return writeChunkAndReturn(destination, endSuspenseBoundary);
		}
		function flushSegmentContainer(request, destination, segment, hoistableState) {
			writeStartSegment(destination, request.renderState, segment.parentFormatContext, segment.id);
			flushSegment(request, destination, segment, hoistableState);
			return writeEndSegment(destination, segment.parentFormatContext);
		}
		function flushCompletedBoundary(request, destination, boundary) {
			flushedByteSize = boundary.byteSize;
			for (var completedSegments = boundary.completedSegments, i = 0; i < completedSegments.length; i++) flushPartiallyCompletedSegment(request, destination, boundary, completedSegments[i]);
			completedSegments.length = 0;
			completedSegments = boundary.row;
			null !== completedSegments && isEligibleForOutlining(request, boundary) && 0 === --completedSegments.pendingTasks && finishSuspenseListRow(request, completedSegments);
			writeHoistablesForBoundary(destination, boundary.contentState, request.renderState);
			completedSegments = request.resumableState;
			request = request.renderState;
			i = boundary.rootSegmentID;
			boundary = boundary.contentState;
			var requiresStyleInsertion = request.stylesToHoist;
			request.stylesToHoist = !1;
			writeChunk(destination, request.startInlineScript);
			writeChunk(destination, endOfStartTag);
			requiresStyleInsertion ? (0 === (completedSegments.instructions & 4) && (completedSegments.instructions |= 4, writeChunk(destination, clientRenderScriptFunctionOnly)), 0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, writeChunk(destination, completeBoundaryScriptFunctionOnly)), 0 === (completedSegments.instructions & 8) ? (completedSegments.instructions |= 8, writeChunk(destination, completeBoundaryWithStylesScript1FullPartial)) : writeChunk(destination, completeBoundaryWithStylesScript1Partial)) : (0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, writeChunk(destination, completeBoundaryScriptFunctionOnly)), writeChunk(destination, completeBoundaryScript1Partial));
			completedSegments = stringToChunk(i.toString(16));
			writeChunk(destination, request.boundaryPrefix);
			writeChunk(destination, completedSegments);
			writeChunk(destination, completeBoundaryScript2);
			writeChunk(destination, request.segmentPrefix);
			writeChunk(destination, completedSegments);
			requiresStyleInsertion ? (writeChunk(destination, completeBoundaryScript3a), writeStyleResourceDependenciesInJS(destination, boundary)) : writeChunk(destination, completeBoundaryScript3b);
			boundary = writeChunkAndReturn(destination, completeBoundaryScriptEnd);
			return writeBootstrap(destination, request) && boundary;
		}
		function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
			if (2 === segment.status) return !0;
			var hoistableState = boundary.contentState, segmentID = segment.id;
			if (-1 === segmentID) {
				if (-1 === (segment.id = boundary.rootSegmentID)) throw Error(formatProdErrorMessage(392));
				return flushSegmentContainer(request, destination, segment, hoistableState);
			}
			if (segmentID === boundary.rootSegmentID) return flushSegmentContainer(request, destination, segment, hoistableState);
			flushSegmentContainer(request, destination, segment, hoistableState);
			boundary = request.resumableState;
			request = request.renderState;
			writeChunk(destination, request.startInlineScript);
			writeChunk(destination, endOfStartTag);
			0 === (boundary.instructions & 1) ? (boundary.instructions |= 1, writeChunk(destination, completeSegmentScript1Full)) : writeChunk(destination, completeSegmentScript1Partial);
			writeChunk(destination, request.segmentPrefix);
			segmentID = stringToChunk(segmentID.toString(16));
			writeChunk(destination, segmentID);
			writeChunk(destination, completeSegmentScript2);
			writeChunk(destination, request.placeholderPrefix);
			writeChunk(destination, segmentID);
			destination = writeChunkAndReturn(destination, completeSegmentScriptEnd);
			return destination;
		}
		var flushingPartialBoundaries = !1;
		function flushCompletedQueues(request, destination) {
			currentView = /* @__PURE__ */ new Uint8Array(2048);
			writtenBytes = 0;
			try {
				if (!(0 < request.pendingRootTasks)) {
					var i, completedRootSegment = request.completedRootSegment;
					if (null !== completedRootSegment) {
						if (5 === completedRootSegment.status) return;
						var completedPreambleSegments = request.completedPreambleSegments;
						if (null === completedPreambleSegments) return;
						flushedByteSize = request.byteSize;
						var resumableState = request.resumableState, renderState = request.renderState, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
						if (htmlChunks) {
							for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++) writeChunk(destination, htmlChunks[i$jscomp$0]);
							if (headChunks) for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++) writeChunk(destination, headChunks[i$jscomp$0]);
							else writeChunk(destination, startChunkForTag("head")), writeChunk(destination, endOfStartTag);
						} else if (headChunks) for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++) writeChunk(destination, headChunks[i$jscomp$0]);
						var charsetChunks = renderState.charsetChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++) writeChunk(destination, charsetChunks[i$jscomp$0]);
						charsetChunks.length = 0;
						renderState.preconnects.forEach(flushResource, destination);
						renderState.preconnects.clear();
						var viewportChunks = renderState.viewportChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++) writeChunk(destination, viewportChunks[i$jscomp$0]);
						viewportChunks.length = 0;
						renderState.fontPreloads.forEach(flushResource, destination);
						renderState.fontPreloads.clear();
						renderState.highImagePreloads.forEach(flushResource, destination);
						renderState.highImagePreloads.clear();
						currentlyFlushingRenderState = renderState;
						renderState.styles.forEach(flushStylesInPreamble, destination);
						currentlyFlushingRenderState = null;
						var importMapChunks = renderState.importMapChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++) writeChunk(destination, importMapChunks[i$jscomp$0]);
						importMapChunks.length = 0;
						renderState.bootstrapScripts.forEach(flushResource, destination);
						renderState.scripts.forEach(flushResource, destination);
						renderState.scripts.clear();
						renderState.bulkPreloads.forEach(flushResource, destination);
						renderState.bulkPreloads.clear();
						htmlChunks || headChunks || (resumableState.instructions |= 32);
						var hoistableChunks = renderState.hoistableChunks;
						for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++) writeChunk(destination, hoistableChunks[i$jscomp$0]);
						for (resumableState = hoistableChunks.length = 0; resumableState < completedPreambleSegments.length; resumableState++) {
							var segments = completedPreambleSegments[resumableState];
							for (renderState = 0; renderState < segments.length; renderState++) flushSegment(request, destination, segments[renderState], null);
						}
						var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
						(preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) && writeChunk(destination, endChunkForTag("head"));
						var bodyChunks = preamble$jscomp$0.bodyChunks;
						if (bodyChunks) for (completedPreambleSegments = 0; completedPreambleSegments < bodyChunks.length; completedPreambleSegments++) writeChunk(destination, bodyChunks[completedPreambleSegments]);
						flushSegment(request, destination, completedRootSegment, null);
						request.completedRootSegment = null;
						var renderState$jscomp$0 = request.renderState;
						if (0 !== request.allPendingTasks || 0 !== request.clientRenderedBoundaries.length || 0 !== request.completedBoundaries.length || null !== request.trackedPostpones && (0 !== request.trackedPostpones.rootNodes.length || null !== request.trackedPostpones.rootSlots)) {
							var resumableState$jscomp$0 = request.resumableState;
							if (0 === (resumableState$jscomp$0.instructions & 64)) {
								resumableState$jscomp$0.instructions |= 64;
								writeChunk(destination, renderState$jscomp$0.startInlineScript);
								if (0 === (resumableState$jscomp$0.instructions & 32)) {
									resumableState$jscomp$0.instructions |= 32;
									var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
									writeChunk(destination, completedShellIdAttributeStart);
									writeChunk(destination, stringToChunk(escapeTextForBrowser(shellId)));
									writeChunk(destination, attributeEnd);
								}
								writeChunk(destination, endOfStartTag);
								writeChunk(destination, shellTimeRuntimeScript);
								writeChunkAndReturn(destination, endInlineScript);
							}
						}
						writeBootstrap(destination, renderState$jscomp$0);
					}
					var renderState$jscomp$1 = request.renderState;
					completedRootSegment = 0;
					var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
					for (completedRootSegment = 0; completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++) writeChunk(destination, viewportChunks$jscomp$0[completedRootSegment]);
					viewportChunks$jscomp$0.length = 0;
					renderState$jscomp$1.preconnects.forEach(flushResource, destination);
					renderState$jscomp$1.preconnects.clear();
					renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
					renderState$jscomp$1.fontPreloads.clear();
					renderState$jscomp$1.highImagePreloads.forEach(flushResource, destination);
					renderState$jscomp$1.highImagePreloads.clear();
					renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
					renderState$jscomp$1.scripts.forEach(flushResource, destination);
					renderState$jscomp$1.scripts.clear();
					renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
					renderState$jscomp$1.bulkPreloads.clear();
					var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
					for (completedRootSegment = 0; completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++) writeChunk(destination, hoistableChunks$jscomp$0[completedRootSegment]);
					hoistableChunks$jscomp$0.length = 0;
					var clientRenderedBoundaries = request.clientRenderedBoundaries;
					for (i = 0; i < clientRenderedBoundaries.length; i++) {
						var boundary = clientRenderedBoundaries[i];
						renderState$jscomp$1 = destination;
						var resumableState$jscomp$1 = request.resumableState, renderState$jscomp$2 = request.renderState, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest;
						writeChunk(renderState$jscomp$1, renderState$jscomp$2.startInlineScript);
						writeChunk(renderState$jscomp$1, endOfStartTag);
						0 === (resumableState$jscomp$1.instructions & 4) ? (resumableState$jscomp$1.instructions |= 4, writeChunk(renderState$jscomp$1, clientRenderScript1Full)) : writeChunk(renderState$jscomp$1, clientRenderScript1Partial);
						writeChunk(renderState$jscomp$1, renderState$jscomp$2.boundaryPrefix);
						writeChunk(renderState$jscomp$1, stringToChunk(id.toString(16)));
						writeChunk(renderState$jscomp$1, clientRenderScript1A);
						errorDigest && (writeChunk(renderState$jscomp$1, clientRenderErrorScriptArgInterstitial), writeChunk(renderState$jscomp$1, stringToChunk(escapeJSStringsForInstructionScripts(errorDigest || ""))));
						var JSCompiler_inline_result = writeChunkAndReturn(renderState$jscomp$1, clientRenderScriptEnd);
						if (!JSCompiler_inline_result) {
							request.destination = null;
							i++;
							clientRenderedBoundaries.splice(0, i);
							return;
						}
					}
					clientRenderedBoundaries.splice(0, i);
					var completedBoundaries = request.completedBoundaries;
					for (i = 0; i < completedBoundaries.length; i++) if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
						request.destination = null;
						i++;
						completedBoundaries.splice(0, i);
						return;
					}
					completedBoundaries.splice(0, i);
					completeWriting(destination);
					currentView = /* @__PURE__ */ new Uint8Array(2048);
					writtenBytes = 0;
					flushingPartialBoundaries = !0;
					var partialBoundaries = request.partialBoundaries;
					for (i = 0; i < partialBoundaries.length; i++) {
						var boundary$70 = partialBoundaries[i];
						a: {
							clientRenderedBoundaries = request;
							boundary = destination;
							flushedByteSize = boundary$70.byteSize;
							var completedSegments = boundary$70.completedSegments;
							for (JSCompiler_inline_result = 0; JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++) if (!flushPartiallyCompletedSegment(clientRenderedBoundaries, boundary, boundary$70, completedSegments[JSCompiler_inline_result])) {
								JSCompiler_inline_result++;
								completedSegments.splice(0, JSCompiler_inline_result);
								var JSCompiler_inline_result$jscomp$0 = !1;
								break a;
							}
							completedSegments.splice(0, JSCompiler_inline_result);
							var row = boundary$70.row;
							null !== row && row.together && 1 === boundary$70.pendingTasks && (1 === row.pendingTasks ? unblockSuspenseListRow(clientRenderedBoundaries, row, row.hoistables) : row.pendingTasks--);
							JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(boundary, boundary$70.contentState, clientRenderedBoundaries.renderState);
						}
						if (!JSCompiler_inline_result$jscomp$0) {
							request.destination = null;
							i++;
							partialBoundaries.splice(0, i);
							return;
						}
					}
					partialBoundaries.splice(0, i);
					flushingPartialBoundaries = !1;
					var largeBoundaries = request.completedBoundaries;
					for (i = 0; i < largeBoundaries.length; i++) if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
						request.destination = null;
						i++;
						largeBoundaries.splice(0, i);
						return;
					}
					largeBoundaries.splice(0, i);
				}
			} finally {
				flushingPartialBoundaries = !1, 0 === request.allPendingTasks && 0 === request.clientRenderedBoundaries.length && 0 === request.completedBoundaries.length ? (request.flushScheduled = !1, i = request.resumableState, i.hasBody && writeChunk(destination, endChunkForTag("body")), i.hasHtml && writeChunk(destination, endChunkForTag("html")), completeWriting(destination), request.status = 14, destination.close(), request.destination = null) : completeWriting(destination);
			}
		}
		function startWork(request) {
			request.flushScheduled = null !== request.destination;
			scheduleMicrotask(function() {
				return performWork(request);
			});
			scheduleWork(function() {
				10 === request.status && (request.status = 11);
				null === request.trackedPostpones && safelyEmitEarlyPreloads(request, 0 === request.pendingRootTasks);
			});
		}
		function enqueueFlush(request) {
			!1 === request.flushScheduled && 0 === request.pingedTasks.length && null !== request.destination && (request.flushScheduled = !0, scheduleWork(function() {
				var destination = request.destination;
				destination ? flushCompletedQueues(request, destination) : request.flushScheduled = !1;
			}));
		}
		function startFlowing(request, destination) {
			if (13 === request.status) request.status = 14, closeWithError(destination, request.fatalError);
			else if (14 !== request.status && null === request.destination) {
				request.destination = destination;
				try {
					flushCompletedQueues(request, destination);
				} catch (error) {
					logRecoverableError(request, error, {}), fatalError(request, error);
				}
			}
		}
		function abort(request, reason) {
			if (11 === request.status || 10 === request.status) request.status = 12;
			try {
				var abortableTasks = request.abortableTasks;
				if (0 < abortableTasks.size) {
					var error = void 0 === reason ? Error(formatProdErrorMessage(432)) : "object" === typeof reason && null !== reason && "function" === typeof reason.then ? Error(formatProdErrorMessage(530)) : reason;
					request.fatalError = error;
					abortableTasks.forEach(function(task) {
						return abortTask(task, request, error);
					});
					abortableTasks.clear();
				}
				null !== request.destination && flushCompletedQueues(request, request.destination);
			} catch (error$72) {
				logRecoverableError(request, error$72, {}), fatalError(request, error$72);
			}
		}
		function addToReplayParent(node, parentKeyPath, trackedPostpones) {
			if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
			else {
				var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
				void 0 === parentNode && (parentNode = [
					parentKeyPath[1],
					parentKeyPath[2],
					[],
					null
				], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
				parentNode[2].push(node);
			}
		}
		function getPostponedState(request) {
			var trackedPostpones = request.trackedPostpones;
			if (null === trackedPostpones || 0 === trackedPostpones.rootNodes.length && null === trackedPostpones.rootSlots) return request.trackedPostpones = null;
			if (null === request.completedRootSegment || 5 !== request.completedRootSegment.status && null !== request.completedPreambleSegments) {
				var nextSegmentId = request.nextSegmentId;
				var replaySlots = trackedPostpones.rootSlots;
				var resumableState = request.resumableState;
				resumableState.bootstrapScriptContent = void 0;
				resumableState.bootstrapScripts = void 0;
				resumableState.bootstrapModules = void 0;
			} else {
				nextSegmentId = 0;
				replaySlots = -1;
				resumableState = request.resumableState;
				var renderState = request.renderState;
				resumableState.nextFormID = 0;
				resumableState.hasBody = !1;
				resumableState.hasHtml = !1;
				resumableState.unknownResources = { font: renderState.resets.font };
				resumableState.dnsResources = renderState.resets.dns;
				resumableState.connectResources = renderState.resets.connect;
				resumableState.imageResources = renderState.resets.image;
				resumableState.styleResources = renderState.resets.style;
				resumableState.scriptResources = {};
				resumableState.moduleUnknownResources = {};
				resumableState.moduleScriptResources = {};
				resumableState.instructions = 0;
			}
			return {
				nextSegmentId,
				rootFormatContext: request.rootFormatContext,
				progressiveChunkSize: request.progressiveChunkSize,
				resumableState: request.resumableState,
				replayNodes: trackedPostpones.rootNodes,
				replaySlots
			};
		}
		function ensureCorrectIsomorphicReactVersion() {
			var isomorphicReactPackageVersion = React.version;
			if ("19.2.8" !== isomorphicReactPackageVersion) throw Error(formatProdErrorMessage(527, isomorphicReactPackageVersion, "19.2.8"));
		}
		ensureCorrectIsomorphicReactVersion();
		ensureCorrectIsomorphicReactVersion();
		exports.prerender = function(children, options) {
			return new Promise(function(resolve, reject) {
				var onHeaders = options ? options.onHeaders : void 0, onHeadersImpl;
				onHeaders && (onHeadersImpl = function(headersDescriptor) {
					onHeaders(new Headers(headersDescriptor));
				});
				var resources = createResumableState(options ? options.identifierPrefix : void 0, options ? options.unstable_externalRuntimeSrc : void 0, options ? options.bootstrapScriptContent : void 0, options ? options.bootstrapScripts : void 0, options ? options.bootstrapModules : void 0), request = createPrerenderRequest(children, resources, createRenderState(resources, void 0, options ? options.unstable_externalRuntimeSrc : void 0, options ? options.importMap : void 0, onHeadersImpl, options ? options.maxHeadersLength : void 0), createRootFormatContext(options ? options.namespaceURI : void 0), options ? options.progressiveChunkSize : void 0, options ? options.onError : void 0, function() {
					var stream = new import_ponyfill.ReadableStream({
						type: "bytes",
						pull: function(controller) {
							startFlowing(request, controller);
						},
						cancel: function(reason) {
							request.destination = null;
							abort(request, reason);
						}
					}, { highWaterMark: 0 });
					stream = {
						postponed: getPostponedState(request),
						prelude: stream
					};
					resolve(stream);
				}, void 0, void 0, reject, options ? options.onPostpone : void 0);
				if (options && options.signal) {
					var signal = options.signal;
					if (signal.aborted) abort(request, signal.reason);
					else {
						var listener = function() {
							abort(request, signal.reason);
							signal.removeEventListener("abort", listener);
						};
						signal.addEventListener("abort", listener);
					}
				}
				startWork(request);
			});
		};
		exports.renderToReadableStream = function(children, options) {
			return new Promise(function(resolve, reject) {
				var onFatalError, onAllReady, allReady = new Promise(function(res, rej) {
					onAllReady = res;
					onFatalError = rej;
				}), onHeaders = options ? options.onHeaders : void 0, onHeadersImpl;
				onHeaders && (onHeadersImpl = function(headersDescriptor) {
					onHeaders(new Headers(headersDescriptor));
				});
				var resumableState = createResumableState(options ? options.identifierPrefix : void 0, options ? options.unstable_externalRuntimeSrc : void 0, options ? options.bootstrapScriptContent : void 0, options ? options.bootstrapScripts : void 0, options ? options.bootstrapModules : void 0), request = createRequest(children, resumableState, createRenderState(resumableState, options ? options.nonce : void 0, options ? options.unstable_externalRuntimeSrc : void 0, options ? options.importMap : void 0, onHeadersImpl, options ? options.maxHeadersLength : void 0), createRootFormatContext(options ? options.namespaceURI : void 0), options ? options.progressiveChunkSize : void 0, options ? options.onError : void 0, onAllReady, function() {
					var stream = new import_ponyfill.ReadableStream({
						type: "bytes",
						pull: function(controller) {
							startFlowing(request, controller);
						},
						cancel: function(reason) {
							request.destination = null;
							abort(request, reason);
						}
					}, { highWaterMark: 0 });
					stream.allReady = allReady;
					resolve(stream);
				}, function(error) {
					allReady.catch(function() {});
					reject(error);
				}, onFatalError, options ? options.onPostpone : void 0, options ? options.formState : void 0);
				if (options && options.signal) {
					var signal = options.signal;
					if (signal.aborted) abort(request, signal.reason);
					else {
						var listener = function() {
							abort(request, signal.reason);
							signal.removeEventListener("abort", listener);
						};
						signal.addEventListener("abort", listener);
					}
				}
				startWork(request);
			});
		};
		exports.resume = function(children, postponedState, options) {
			return new Promise(function(resolve, reject) {
				var onFatalError, onAllReady, allReady = new Promise(function(res, rej) {
					onAllReady = res;
					onFatalError = rej;
				}), request = resumeRequest(children, postponedState, createRenderState(postponedState.resumableState, options ? options.nonce : void 0, void 0, void 0, void 0, void 0), options ? options.onError : void 0, onAllReady, function() {
					var stream = new import_ponyfill.ReadableStream({
						type: "bytes",
						pull: function(controller) {
							startFlowing(request, controller);
						},
						cancel: function(reason) {
							request.destination = null;
							abort(request, reason);
						}
					}, { highWaterMark: 0 });
					stream.allReady = allReady;
					resolve(stream);
				}, function(error) {
					allReady.catch(function() {});
					reject(error);
				}, onFatalError, options ? options.onPostpone : void 0);
				if (options && options.signal) {
					var signal = options.signal;
					if (signal.aborted) abort(request, signal.reason);
					else {
						var listener = function() {
							abort(request, signal.reason);
							signal.removeEventListener("abort", listener);
						};
						signal.addEventListener("abort", listener);
					}
				}
				startWork(request);
			});
		};
		exports.resumeAndPrerender = function(children, postponedState, options) {
			return new Promise(function(resolve, reject) {
				var request = resumeAndPrerenderRequest(children, postponedState, createRenderState(postponedState.resumableState, void 0, void 0, void 0, void 0, void 0), options ? options.onError : void 0, function() {
					var stream = new import_ponyfill.ReadableStream({
						type: "bytes",
						pull: function(controller) {
							startFlowing(request, controller);
						},
						cancel: function(reason) {
							request.destination = null;
							abort(request, reason);
						}
					}, { highWaterMark: 0 });
					stream = {
						postponed: getPostponedState(request),
						prelude: stream
					};
					resolve(stream);
				}, void 0, void 0, reject, options ? options.onPostpone : void 0);
				if (options && options.signal) {
					var signal = options.signal;
					if (signal.aborted) abort(request, signal.reason);
					else {
						var listener = function() {
							abort(request, signal.reason);
							signal.removeEventListener("abort", listener);
						};
						signal.addEventListener("abort", listener);
					}
				}
				startWork(request);
			});
		};
		exports.version = "19.2.8";
	}));
	//#endregion
	//#region ../../node_modules/.bun/react-dom@19.2.8+0f58469d5b3bd39f/node_modules/react-dom/server.browser.js
	var require_server_browser = /* @__PURE__ */ __commonJSMin(((exports) => {
		var l = require_react_dom_server_legacy_browser_production();
		var s = require_react_dom_server_browser_production();
		exports.version = l.version;
		exports.renderToString = l.renderToString;
		exports.renderToStaticMarkup = l.renderToStaticMarkup;
		exports.renderToReadableStream = s.renderToReadableStream;
		exports.resume = s.resume;
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/server.js
	function serverSideRendering(routeTree) {
		const element = async (payload) => {
			const serverPayload = payload ? JSON.parse(payload) : {};
			const router = createRouter({ routeTree });
			await preloadRouteChain(router, serverPayload.location?.pathname);
			return /* @__PURE__ */ (0, import_jsx_runtime$10.jsx)(TuonoEntryPoint, {
				router,
				serverPayload,
				rawServerPayload: payload
			});
		};
		return {
			/**
			* Buffered render: resolve the whole page to a single string. Used for
			* error pages, static export (SSG), `catch_all`, and the dev fallback —
			* anywhere the caller needs the complete HTML up front.
			*/
			async renderFn(payload) {
				const stream = await (0, import_server_browser.renderToReadableStream)(await element(payload));
				await stream.allReady;
				return await streamToString(stream);
			},
			/**
			* Streaming render: flush each HTML chunk to Rust via
			* `__ssr_write` as React produces it, so the shell reaches the
			* client without waiting for the full page. `renderToReadableStream`
			* rejects on a *shell* error before any chunk is written, so Rust can still
			* send a 500 instead of a partial 200 in that case.
			*/
			async renderStream(payload) {
				const write = __ssr_write;
				if (typeof write !== "function") throw new Error("__ssr_write is not registered by the runtime");
				const stream = await (0, import_server_browser.renderToReadableStream)(await element(payload));
				const streamer = createUtf8Streamer();
				for await (const chunk of stream) {
					const text = streamer.push(chunk);
					if (text) write(text);
				}
				const tail = streamer.flush();
				if (tail) write(tail);
			}
		};
	}
	var import_jsx_runtime$10, import_server_browser;
	var init_server = __esmMin((() => {
		init_globalScope();
		init_MessageChannel();
		init_TuonoEntryPoint();
		init_utils();
		init_esm$1();
		import_jsx_runtime$10 = require_jsx_runtime();
		init_text_min();
		init_url_search_params_polyfill();
		import_server_browser = require_server_browser();
		(function(scope = {}) {
			scope["MessageChannel"] = scope["MessageChannel"] ?? MessageChannelPolyfill;
		})(void 0);
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/polyfills/Event.js
	var EventPolyfill;
	var init_Event = __esmMin((() => {
		EventPolyfill = class {
			constructor(type, eventInitDict) {
				this.currentTarget = null;
				this.defaultPrevented = false;
				this.eventPhase = 0;
				this.isTrusted = false;
				this.target = null;
				this.timeStamp = Date.now();
				this.returnValue = true;
				this.srcElement = null;
				this.type = type;
				this.bubbles = eventInitDict?.bubbles ?? false;
				this.cancelable = eventInitDict?.cancelable ?? false;
				this.composed = eventInitDict?.composed ?? false;
			}
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/polyfills/MessageEvent.js
	var MessageEventPolyfill;
	var init_MessageEvent = __esmMin((() => {
		init_Event();
		MessageEventPolyfill = class extends EventPolyfill {
			constructor(type, options) {
				super(type, options);
				this.data = options.data;
				this.lastEventId = options.lastEventId ?? "";
				this.origin = options.origin ?? "";
				this.ports = options.ports ?? [];
				this.source = options.source ?? null;
			}
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/ssr/index.js
	var init_ssr = __esmMin((() => {
		init_MessageChannel();
		init_server();
		init_MessageEvent();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/dynamic/RouteLazyLoading.js
	var import_react$2, RouteLazyLoading;
	var init_RouteLazyLoading = __esmMin((() => {
		import_react$2 = /* @__PURE__ */ __toESM(require_react(), 1);
		RouteLazyLoading = (factory) => {
			let LoadedComponent;
			const LazyComponent = (0, import_react$2.lazy)(factory);
			const loadComponent = () => factory().then((module) => {
				LoadedComponent = module.default;
			});
			const Component = (props) => (0, import_react$2.createElement)(LoadedComponent || LazyComponent, props);
			Component.preload = loadComponent;
			return Component;
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/DevResources.js
	var import_jsx_runtime$9, DEFAULT_SERVER_CONFIG, VITE_PROXY_PATH, DevResources;
	var init_DevResources = __esmMin((() => {
		import_jsx_runtime$9 = require_jsx_runtime();
		DEFAULT_SERVER_CONFIG = {
			host: "localhost",
			origin: null,
			port: 3e3
		};
		VITE_PROXY_PATH = "/vite-server";
		DevResources = ({ devServerConfig }) => {
			const { host, origin, port } = devServerConfig ?? DEFAULT_SERVER_CONFIG;
			const viteBaseUrl = origin != null ? `${origin}${VITE_PROXY_PATH}` : `http://${host}:${port}${VITE_PROXY_PATH}`;
			/**
			* These scripts must execute in order: the react-refresh preamble has to run
			* (and set `__vite_plugin_react_preamble_installed__`) before `client-main`
			* loads any React component, otherwise `@vitejs/plugin-react-swc` throws
			* "can't detect preamble". `type="module"` already defers execution without
			* blocking parsing, so `async` only removes the ordering guarantee and must
			* NOT be used here — it caused an intermittent preamble race.
			*/
			return /* @__PURE__ */ (0, import_jsx_runtime$9.jsxs)(import_jsx_runtime$9.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime$9.jsx)("script", {
					type: "module",
					children: [
						`import RefreshRuntime from '${viteBaseUrl}/@react-refresh'`,
						"RefreshRuntime.injectIntoGlobalHook(window)",
						"window.$RefreshReg$ = () => {}",
						"window.$RefreshSig$ = () => (type) => type",
						"window.__vite_plugin_react_preamble_installed__ = true"
					].join("\n")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$9.jsx)("script", {
					type: "module",
					src: `${viteBaseUrl}/@vite/client`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$9.jsx)("script", {
					type: "module",
					src: `${viteBaseUrl}/client-main.tsx`
				})
			] });
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/ProdResources.js
	var import_jsx_runtime$8, ProdResources;
	var init_ProdResources = __esmMin((() => {
		import_jsx_runtime$8 = require_jsx_runtime();
		ProdResources = ({ cssBundles, jsBundles }) => {
			return /* @__PURE__ */ (0, import_jsx_runtime$8.jsxs)(import_jsx_runtime$8.Fragment, { children: [cssBundles?.map((cssHref) => /* @__PURE__ */ (0, import_jsx_runtime$8.jsx)("link", {
				rel: "stylesheet",
				precedence: "high",
				type: "text/css",
				href: `/${cssHref}`
			}, cssHref)), jsBundles?.map((scriptSrc) => /* @__PURE__ */ (0, import_jsx_runtime$8.jsx)("script", {
				type: "module",
				src: `/${scriptSrc}`
			}, scriptSrc))] });
		};
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/shared/TuonoScripts.js
	/**
	* The payload is embedded as a JS expression inside a `<script>`, so a string
	* value containing `<\/script>` (or `<!--`) could otherwise break out of the tag.
	* Escaping `<` to its unicode form neutralises that while remaining valid JSON.
	*/
	function escapeForScript(json) {
		return json.replace(/</g, "\\u003c");
	}
	function TuonoScripts() {
		const serverPayload = useTuonoContextServerPayload();
		return /* @__PURE__ */ (0, import_jsx_runtime$7.jsxs)(import_jsx_runtime$7.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime$7.jsx)("script", {
				suppressHydrationWarning: true,
				dangerouslySetInnerHTML: { __html: `window['${SERVER_PAYLOAD_VARIABLE_NAME}']=${escapeForScript(useTuonoContextRawServerPayload() ?? JSON.stringify(serverPayload))}` }
			}),
			serverPayload.mode === "Dev" && /* @__PURE__ */ (0, import_jsx_runtime$7.jsx)(DevResources, { devServerConfig: serverPayload.devServerConfig }),
			serverPayload.mode === "Prod" && /* @__PURE__ */ (0, import_jsx_runtime$7.jsx)(ProdResources, {
				jsBundles: serverPayload.jsBundles,
				cssBundles: serverPayload.cssBundles
			})
		] });
	}
	var import_jsx_runtime$7;
	var init_TuonoScripts = __esmMin((() => {
		init_constants();
		init_DevResources();
		init_ProdResources();
		init_TuonoContext();
		import_jsx_runtime$7 = require_jsx_runtime();
	}));
	//#endregion
	//#region ../../packages/tuono/dist/esm/index.js
	var init_esm = __esmMin((() => {
		init_RouteLazyLoading();
		init_TuonoScripts();
		init_esm$1();
	}));
	//#endregion
	//#region src/styles/global.css
	init_esm();
	//#endregion
	//#region src/routes/layout.tsx
	var import_jsx_runtime$6 = require_jsx_runtime();
	function RootLayout({ children }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$6.jsxs)("html", {
			lang: "en",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime$6.jsxs)("body", { children: [/* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("main", { children }), /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)(TuonoScripts, {})] })]
		});
	}
	//#endregion
	//#region src/components/PokemonView.module.css
	var pokemon, name, spec, label, PokemonView_module_default;
	var init_PokemonView_module = __esmMin((() => {
		pokemon = "_pokemon_yzq5x_1";
		name = "_name_yzq5x_13";
		spec = "_spec_yzq5x_26";
		label = "_label_yzq5x_37";
		PokemonView_module_default = {
			pokemon,
			name,
			spec,
			label
		};
	}));
	//#endregion
	//#region src/components/PokemonSkeleton.tsx
	init_PokemonView_module();
	function PokemonSkeleton() {
		return /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("div", {
			className: PokemonView_module_default.pokemon,
			style: { height: 270 },
			children: /* @__PURE__ */ (0, import_jsx_runtime$6.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("h1", {
					className: PokemonView_module_default.name,
					children: "Loading..."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$6.jsxs)("dl", {
					className: PokemonView_module_default.spec,
					children: [/* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("dt", {
						className: PokemonView_module_default.label,
						children: "Weight: "
					}), /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("dd", { children: "...lbs" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$6.jsxs)("dl", {
					className: PokemonView_module_default.spec,
					children: [/* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("dt", {
						className: PokemonView_module_default.label,
						children: "Height: "
					}), /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)("dd", { children: "...ft" })]
				})
			] })
		});
	}
	//#endregion
	//#region src/routes/pokemons/[pokemon]/loading.tsx
	function PokemonViewLoading() {
		return /* @__PURE__ */ (0, import_jsx_runtime$6.jsx)(PokemonSkeleton, {});
	}
	//#endregion
	//#region src/routes/pokemons/[pokemon]/layout.tsx
	var layout_exports = /* @__PURE__ */ __exportAll({ default: () => PokemonPageLayout });
	function PokemonPageLayout({ children }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$5.jsxs)(import_jsx_runtime$5.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$5.jsx)(Link, {
			href: "/",
			className: "back-link",
			children: "Back"
		}), children] });
	}
	var import_jsx_runtime$5;
	var init_layout = __esmMin((() => {
		require_react();
		init_esm();
		import_jsx_runtime$5 = require_jsx_runtime();
	}));
	//#endregion
	//#region src/components/Wordmark.module.css
	var logo, cog, rotate, cogBackground, orbit, Wordmark_module_default;
	var init_Wordmark_module = __esmMin((() => {
		logo = "_logo_nsw1r_10";
		cog = "_cog_nsw1r_15";
		rotate = "_rotate_nsw1r_1";
		cogBackground = "_cogBackground_nsw1r_20";
		orbit = "_orbit_nsw1r_24";
		Wordmark_module_default = {
			logo,
			cog,
			rotate,
			cogBackground,
			orbit
		};
	})), import_jsx_runtime$4, Wordmark;
	var init_Wordmark = __esmMin((() => {
		require_react();
		init_Wordmark_module();
		import_jsx_runtime$4 = require_jsx_runtime();
		Wordmark = (props) => {
			return /* @__PURE__ */ (0, import_jsx_runtime$4.jsxs)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 500 500",
				...props,
				className: Wordmark_module_default.logo,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$4.jsxs)("g", {
						className: Wordmark_module_default.cog,
						children: [/* @__PURE__ */ (0, import_jsx_runtime$4.jsx)("path", {
							className: Wordmark_module_default.cogBackground,
							d: "M250 31.37C129.25 31.37 31.37 129.25 31.37 250S129.25 468.63 250 468.63 468.63 370.75 468.63 250 370.75 31.37 250 31.37M72.04 213.46c-11.03 0-19.97-8.94-19.97-19.97s8.94-19.97 19.97-19.97 19.97 8.94 19.97 19.97-8.94 19.97-19.97 19.97m67.13 209.22c-11.03 0-19.97-8.94-19.97-19.97s8.94-19.97 19.97-19.97 19.97 8.94 19.97 19.97-8.94 19.97-19.97 19.97M249.19 79.05c-11.03 0-19.97-8.94-19.97-19.97s8.94-19.97 19.97-19.97 19.97 8.94 19.97 19.97-8.94 19.97-19.97 19.97M359.17 423.4c-11.03 0-19.97-8.94-19.97-19.97s8.94-19.97 19.97-19.97 19.97 8.94 19.97 19.97-8.94 19.97-19.97 19.97m67.15-209.22c-11.03 0-19.97-8.94-19.97-19.97s8.94-19.97 19.97-19.97 19.97 8.94 19.97 19.97-8.94 19.97-19.97 19.97"
						}), /* @__PURE__ */ (0, import_jsx_runtime$4.jsx)("path", {
							fill: "#fff",
							fillRule: "evenodd",
							d: "m475.58 230.85 21 13c2.12 1.3 3.42 3.64 3.42 6.16s-1.3 4.82-3.42 6.14l-21 13q-.27 3.06-.6 6.12l18.04 16.84a7.14 7.14 0 0 1 2.16 6.68c-.48 2.46-2.22 4.48-4.56 5.36l-23.06 8.62c-.58 2-1.18 3.98-1.8 5.96l14.38 19.98a7.16 7.16 0 0 1 .82 6.98 7.24 7.24 0 0 1-5.52 4.36l-24.32 3.96c-.94 1.84-1.92 3.64-2.92 5.46l10.22 22.42a7.16 7.16 0 0 1-.56 7.02 7.18 7.18 0 0 1-6.26 3.2l-24.68-.86c-1.26 1.6-2.56 3.18-3.88 4.74l5.66 24.04c.58 2.44-.14 5-1.92 6.76a7.16 7.16 0 0 1-6.76 1.92l-24.04-5.66c-1.56 1.32-3.14 2.6-4.74 3.88l.86 24.68c.04 1.14-.18 2.26-.66 3.28-1.66 3.62-5.94 5.2-9.56 3.54l-22.42-10.22c-.38.2-.75.4-1.12.6-1.44.78-2.88 1.55-4.34 2.32l-3.96 24.3c-.18 1.1-.6 2.16-1.26 3.06-2.32 3.24-6.84 3.96-10.08 1.64l-19.98-14.4c-1.98.64-3.96 1.24-5.96 1.82l-8.62 23.06a7.18 7.18 0 0 1-5.36 4.56c-2.44.5-4.98-.32-6.68-2.16l-16.82-18.04c-2.04.24-4.08.44-6.12.62l-13 21c-1.32 2.12-3.64 3.42-6.14 3.42s-4.82-1.3-6.14-3.42l-13-21-1.53-.15c-1.53-.15-3.06-.29-4.59-.47l-16.84 18.04a7.14 7.14 0 0 1-6.68 2.16c-2.46-.48-4.48-2.22-5.36-4.56l-8.62-23.06c-2-.58-3.98-1.2-5.96-1.82l-19.98 14.4a7.235 7.235 0 0 1-11.36-4.72l-3.96-24.3c-1.84-.94-3.66-1.92-5.46-2.92l-22.42 10.22a7.3 7.3 0 0 1-3.26.64c-4-.16-7.1-3.5-6.96-7.48l.86-24.68c-1.6-1.26-3.18-2.56-4.74-3.88l-24.04 5.66c-2.42.58-5-.14-6.76-1.92a7.21 7.21 0 0 1-1.92-6.76l5.72-23.98q-1.98-2.34-3.9-4.74l-24.66.86c-2.5.1-4.88-1.12-6.26-3.2a7.26 7.26 0 0 1-.56-7.02l10.22-22.42c-1-1.8-1.96-3.62-2.92-5.46l-24.32-3.96a7.2 7.2 0 0 1-3.08-1.28c-3.22-2.34-3.96-6.84-1.62-10.08l14.38-19.98c-.62-1.98-1.22-3.96-1.8-5.96l-23.06-8.62c-1.06-.38-2-1.02-2.76-1.84a7.21 7.21 0 0 1 .36-10.2l18.04-16.84q-.33-3.06-.6-6.12l-21-13c-2.12-1.3-3.42-3.64-3.42-6.14s1.3-4.82 3.42-6.14l21-13q.27-3.06.6-6.12L7.04 207.93c-.82-.76-1.44-1.7-1.84-2.74-1.42-3.74.48-7.92 4.22-9.32l23.06-8.62c.56-2 1.18-3.98 1.8-5.96L19.9 161.31c-.64-.9-1.08-1.96-1.26-3.06-.66-3.94 2.02-7.66 5.96-8.3l24.32-3.96c.94-1.84 1.92-3.66 2.92-5.46l-10.22-22.42a7.21 7.21 0 0 1 .56-7.02 7.3 7.3 0 0 1 6.26-3.2l24.68.86c1.26-1.58 2.56-3.16 3.88-4.72l-5.66-24.04c-.58-2.42.14-5 1.92-6.76a7.21 7.21 0 0 1 6.76-1.92l24.04 5.66q2.34-1.98 4.74-3.9l-.86-24.68c-.1-2.5 1.12-4.88 3.2-6.26a7.23 7.23 0 0 1 7-.56l22.42 10.22c1.8-1 3.62-1.96 5.46-2.92l3.96-24.32c.4-2.48 2.06-4.56 4.36-5.52 2.32-.96 4.96-.64 7 .82l19.98 14.38q2.94-.93 5.94-1.8l8.62-23.06a7.06 7.06 0 0 1 1.84-2.78 7.21 7.21 0 0 1 10.2.36l16.84 18.06c2.04-.24 4.08-.42 6.12-.6l13-21c.58-.96 1.38-1.76 2.34-2.34a7.214 7.214 0 0 1 9.94 2.34l13 21q3.06.27 6.12.6L292.1 6.95a7.24 7.24 0 0 1 6.68-2.16c2.46.48 4.48 2.22 5.36 4.56l8.62 23.06q3 .87 5.94 1.8l20-14.38c.92-.64 1.96-1.08 3.06-1.26 3.94-.66 7.66 2.02 8.3 5.96l3.96 24.32c1.84.94 3.66 1.92 5.46 2.92l22.4-10.22a7.21 7.21 0 0 1 7.02.56 7.18 7.18 0 0 1 3.2 6.26l-.86 24.68q2.4 1.92 4.74 3.9l24.04-5.66c2.44-.58 5 .14 6.76 1.92a7.21 7.21 0 0 1 1.92 6.76l-5.68 24.04c1.32 1.54 2.62 3.12 3.9 4.72l24.68-.86c2.5-.1 4.88 1.12 6.26 3.2 1.4 2.08 1.6 4.74.56 7.02l-10.22 22.42c1 1.8 1.98 3.62 2.92 5.46l24.32 3.96c1.1.18 2.14.62 3.06 1.28 3.24 2.34 3.98 6.84 1.64 10.08l-14.38 19.98c.62 1.98 1.22 3.96 1.8 5.96l23.06 8.62c2.36.88 4.08 2.9 4.56 5.36.5 2.46-.32 5-2.16 6.7l-18.04 16.82q.33 3.06.6 6.12M344.66 400.3c-1.72 8.04 3.38 15.94 11.4 17.66s15.92-3.4 17.62-11.42c1.72-8.02-3.38-15.94-11.4-17.66s-15.9 3.38-17.62 11.42M284.32 68.79l-.66-.12-25.58 24.46-.02.02c-5.4 5.16-13.96 4.94-19.12-.46l-21.74-22.8-1.37-1.44c-3.15.82-3.24.63-6.1 1.37-37.74 8.46-70.99 28.78-95.93 56.61h.38C95.5 147.4 91.3 164.69 91.3 164.69l11.34 22.08.15.19 4.28 9.69c3.04 6.84-.04 14.84-6.88 17.88l-27 12-5.75 2s-.09 3.82-.01 9.97c-.17 3.27-.26 6.57-.26 9.88-.02 13.61 1.49 27.15 4.48 40.4 1.21 6.8 2.76 13.34 4.75 19.1 12.94 37.59 41.77 68.02 41.77 68.02l.65-.31 30.61-6.58c7.32-1.56 14.52 3.1 16.08 10.42l7.44 34.78c23.42 10.88 49.51 16.96 77.03 16.96s52.45-5.8 75.45-16.24l7.46-34.78v-.02c1.58-7.32 8.78-11.96 16.08-10.4l31.4 6.76c6.12-6.2 11.78-12.84 16.94-19.86-.05 0-.1.02-.14.02 9.31-11.75 20.17-27.13 25.76-41.02 6.23-15.48 8.51-36.47 9.23-53.68h.16c.34-4.5.5-9.02.5-13.58 0-5.7-.26-11.32-.78-16.88-.02-.39-.04-.59-.04-.59h-.02c-.02-.23-.04-.46-.07-.69l-33.72-14.98c-6.82-3.02-9.9-11.04-6.88-17.88l17.52-39.58c-25.76-45.06-70.14-78.09-122.65-88.63M124.66 405.83c1.72 8.04 9.62 13.16 17.64 11.42 8-1.72 13.1-9.64 11.4-17.66-1.72-8.02-9.62-13.14-17.64-11.42s-13.12 9.62-11.4 17.66M78.05 207.07c7.5-3.32 10.88-12.12 7.56-19.62-3.32-7.52-12.1-10.9-19.58-7.56-7.5 3.34-10.88 12.12-7.56 19.62s12.08 10.9 19.58 7.56M259.93 48.8c-5.68-5.92-15.08-6.16-21-.48-5.92 5.66-6.14 15.06-.5 21.02 5.68 5.94 15.08 6.16 21 .48 5.94-5.66 6.16-15.08.5-21.02m172.38 131.8c-7.5-3.3-16.24.08-19.56 7.58s.06 16.3 7.56 19.62c0 .02.02.02.02.02 7.5 3.3 16.26-.08 19.57-7.58 3.32-7.5-.06-16.3-7.56-19.62 0-.02-.02-.02-.02-.02Z"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$4.jsx)("path", {
						className: Wordmark_module_default.orbit,
						fill: "#61dafb",
						d: "M385.76 250.03c0-17.95-22.52-34.95-57.06-45.5 7.97-35.12 4.43-63.06-11.18-72.01-3.6-2.1-7.8-3.09-12.4-3.09v12.31c2.55 0 4.59.5 6.31 1.44 7.53 4.31 10.79 20.71 8.25 41.8-.61 5.19-1.61 10.66-2.82 16.23-10.85-2.65-22.69-4.69-35.14-6.02-7.47-10.22-15.22-19.49-23.02-27.61 18.04-16.73 34.98-25.9 46.49-25.9v-12.31c-15.22 0-35.14 10.82-55.29 29.6-20.15-18.66-40.07-29.38-55.29-29.38v12.31c11.46 0 28.45 9.11 46.49 25.73-7.75 8.12-15.5 17.34-22.86 27.55-12.51 1.33-24.35 3.37-35.2 6.07-1.27-5.52-2.21-10.88-2.88-16.01-2.6-21.09.61-37.49 8.08-41.86 1.66-.99 3.82-1.44 6.36-1.44v-12.31c-4.65 0-8.85.99-12.51 3.09-15.55 8.95-19.04 36.83-11.01 71.84-34.42 10.6-56.84 27.55-56.84 45.45s22.52 34.95 57.06 45.5c-7.97 35.12-4.43 63.06 11.18 72.01 3.6 2.1 7.8 3.09 12.45 3.09 15.22 0 35.14-10.82 55.29-29.6 20.15 18.66 40.07 29.38 55.29 29.38 4.65 0 8.85-.99 12.51-3.09 15.55-8.95 19.04-36.83 11.01-71.84 34.31-10.55 56.73-27.55 56.73-45.44ZM313.7 213.2c-2.05 7.12-4.59 14.47-7.47 21.81-2.27-4.42-4.65-8.83-7.25-13.25-2.55-4.42-5.26-8.72-7.97-12.92 7.86 1.16 15.44 2.6 22.69 4.36M288.35 272c-4.32 7.45-8.74 14.52-13.34 21.09-8.25.72-16.6 1.1-25.02 1.1s-16.71-.39-24.9-1.05a303 303 0 0 1-13.39-20.98c-4.21-7.23-8.02-14.58-11.51-21.98 3.43-7.4 7.31-14.8 11.46-22.03 4.32-7.45 8.74-14.52 13.34-21.09 8.25-.72 16.6-1.1 25.02-1.1s16.71.39 24.9 1.05a303 303 0 0 1 13.39 20.98c4.21 7.23 8.02 14.58 11.51 21.98-3.49 7.4-7.31 14.8-11.46 22.03m17.88-7.17c2.99 7.4 5.53 14.8 7.64 21.98-7.25 1.77-14.89 3.26-22.8 4.42 2.71-4.25 5.42-8.61 7.97-13.09 2.55-4.42 4.93-8.89 7.19-13.31m-56.12 58.91c-5.15-5.3-10.29-11.21-15.39-17.67 4.98.22 10.07.39 15.22.39s10.35-.11 15.39-.39a216 216 0 0 1-15.22 17.67m-41.18-32.52c-7.86-1.16-15.44-2.6-22.69-4.36 2.05-7.12 4.59-14.47 7.47-21.81 2.27 4.42 4.65 8.83 7.25 13.25s5.26 8.72 7.97 12.92m40.9-114.91c5.15 5.3 10.29 11.21 15.39 17.67-4.98-.22-10.07-.39-15.22-.39s-10.35.11-15.39.39c4.98-6.46 10.13-12.37 15.22-17.67m-40.95 32.52c-2.71 4.25-5.42 8.61-7.97 13.09-2.55 4.42-4.93 8.83-7.19 13.25-2.99-7.4-5.53-14.8-7.64-21.98 7.25-1.71 14.89-3.2 22.8-4.36m-50.09 69.14c-19.59-8.34-32.27-19.27-32.27-27.94s12.67-19.66 32.27-27.94c4.76-2.04 9.96-3.87 15.33-5.58 3.15 10.82 7.31 22.09 12.45 33.63-5.09 11.49-9.19 22.7-12.29 33.46-5.48-1.71-10.68-3.59-15.5-5.63Zm29.78 78.91c-7.53-4.31-10.79-20.71-8.25-41.8.61-5.19 1.6-10.66 2.82-16.23 10.85 2.65 22.69 4.69 35.14 6.02 7.47 10.22 15.22 19.49 23.02 27.61-18.04 16.73-34.98 25.9-46.49 25.9-2.49-.06-4.59-.55-6.25-1.49Zm131.27-42.08c2.6 21.09-.61 37.49-8.08 41.86-1.66.99-3.82 1.44-6.36 1.44-11.46 0-28.45-9.11-46.49-25.73 7.75-8.12 15.5-17.34 22.86-27.55 12.51-1.33 24.35-3.37 35.2-6.07 1.27 5.58 2.27 10.93 2.88 16.07Zm21.31-36.83c-4.76 2.04-9.96 3.87-15.33 5.58-3.15-10.82-7.31-22.09-12.45-33.63 5.09-11.49 9.19-22.7 12.29-33.46 5.48 1.71 10.68 3.59 15.55 5.63 19.59 8.34 32.27 19.27 32.27 27.94-.06 8.67-12.73 19.66-32.32 27.94Z"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$4.jsx)("path", {
						fill: "#fbc100",
						d: "M261.43 217.83c1.19 1.04 1.62 2.93 1.09 4.57l-7.81 23.73h14.41c1.34 0 2.54 1.02 3 2.55.46 1.54.07 3.25-.96 4.3l-28.68 29.04c-1.13 1.14-2.73 1.2-3.91.16-1.19-1.04-1.62-2.93-1.09-4.57l7.81-23.73h-14.41c-1.34 0-2.54-1.02-3-2.55-.46-1.54-.07-3.25.96-4.3l28.68-29.04c1.13-1.14 2.73-1.2 3.91-.16"
					})
				]
			});
		};
	}));
	//#endregion
	//#region src/components/PokemonLink.module.css
	var link, PokemonLink_module_default;
	var init_PokemonLink_module = __esmMin((() => {
		link = "_link_1bs56_1";
		PokemonLink_module_default = { link };
	}));
	//#endregion
	//#region src/components/PokemonLink.tsx
	function PokemonLink({ id, name }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$3.jsxs)(Link, {
			href: `/pokemons/${name}`,
			className: PokemonLink_module_default.link,
			id: id.toString(),
			children: [name, /* @__PURE__ */ (0, import_jsx_runtime$3.jsx)("img", {
				src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
				alt: ""
			})]
		});
	}
	var import_jsx_runtime$3;
	var init_PokemonLink = __esmMin((() => {
		init_esm();
		init_PokemonLink_module();
		import_jsx_runtime$3 = require_jsx_runtime();
	}));
	//#endregion
	//#region src/routes/page.tsx
	var page_exports$1 = /* @__PURE__ */ __exportAll({ default: () => IndexPage });
	var import_jsx_runtime$2, IndexPage;
	var init_page$1 = __esmMin((() => {
		init_Wordmark();
		init_PokemonLink();
		import_jsx_runtime$2 = require_jsx_runtime();
		IndexPage = ({ results }) => {
			return /* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)(import_jsx_runtime$2.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("title", { children: "Tuono tutorial" }),
				/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("img", {
					src: "/lightning.webp",
					className: "background",
					alt: ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("div", {
					className: "hero",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("h1", {
							className: "title",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", { children: "TU" }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", {
									className: "visually-hidden",
									children: "O"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)(Wordmark, { "aria-hidden": true }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", { children: "NO" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("p", {
							className: "subtitle",
							children: "Pick a Pokémon — a Tuono tutorial Pokédex"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("div", {
							className: "links",
							children: [/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
								href: "https://crates.io/crates/tuono",
								target: "_blank",
								rel: "noreferrer",
								children: "Crates"
							}), /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
								href: "https://www.npmjs.com/package/tuono",
								target: "_blank",
								rel: "noreferrer",
								children: "Npm"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("ul", {
					className: "pokemon-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)(PokemonLink, {
						name: "GOAT",
						id: 0
					}), results.map((pokemon, i) => /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)(PokemonLink, {
						name: pokemon.name,
						id: i + 1
					}, pokemon.name))]
				})
			] });
		};
	}));
	//#endregion
	//#region src/components/PokemonView.tsx
	function PokemonView({ pokemon }) {
		return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			className: PokemonView_module_default.pokemon,
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h1", {
					className: PokemonView_module_default.name,
					children: pokemon.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("dl", {
					className: PokemonView_module_default.spec,
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("dt", {
						className: PokemonView_module_default.label,
						children: "Weight: "
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("dd", { children: [pokemon.weight, "lbs"] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("dl", {
					className: PokemonView_module_default.spec,
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("dt", {
						className: PokemonView_module_default.label,
						children: "Height: "
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("dd", { children: [pokemon.height, "ft"] })]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
				src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
				alt: ""
			})]
		});
	}
	var import_jsx_runtime$1;
	var init_PokemonView = __esmMin((() => {
		init_PokemonView_module();
		import_jsx_runtime$1 = require_jsx_runtime();
	}));
	//#endregion
	//#region src/routes/pokemons/[pokemon]/page.tsx
	var page_exports = /* @__PURE__ */ __exportAll({ default: () => PokemonPage });
	function PokemonPage(pokemon) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: `Pokemon: ${pokemon.name}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PokemonView, { pokemon })] });
	}
	var import_jsx_runtime;
	var init_page = __esmMin((() => {
		init_PokemonView();
		import_jsx_runtime = require_jsx_runtime();
	}));
	//#endregion
	//#region .tuono/routeTree.gen.ts
	init_esm();
	var PokemonspokemonLayoutImport = RouteLazyLoading(() => Promise.resolve().then(() => (init_layout(), layout_exports)));
	var PageImport = RouteLazyLoading(() => Promise.resolve().then(() => (init_page$1(), page_exports$1)));
	var PokemonspokemonPageImport = RouteLazyLoading(() => Promise.resolve().then(() => (init_page(), page_exports)));
	var rootRoute = createRoute({
		isRoot: true,
		component: RootLayout,
		dataKey: "/layout"
	});
	var PokemonspokemonLayout = createRoute({
		component: PokemonspokemonLayoutImport,
		isRoot: true
	});
	var Page = createRoute({ component: PageImport });
	var PokemonspokemonPage = createRoute({ component: PokemonspokemonPageImport });
	var PokemonspokemonLayoutRoute = PokemonspokemonLayout.update({
		getParentRoute: () => rootRoute,
		filePath: "/pokemons/[pokemon]/layout",
		dataKey: "/pokemons/[pokemon]/layout"
	});
	var PageRoute = Page.update({
		path: "/",
		getParentRoute: () => rootRoute,
		hasHandler: true,
		filePath: "/",
		dataKey: "/page"
	});
	var PokemonspokemonPageRoute = PokemonspokemonPage.update({
		path: "/pokemons/[pokemon]",
		getParentRoute: () => PokemonspokemonLayoutRoute,
		hasHandler: true,
		filePath: "/pokemons/[pokemon]/",
		dataKey: "/pokemons/[pokemon]/page",
		loadingComponent: PokemonViewLoading
	});
	var routeTree = rootRoute.addChildren([
		PageRoute,
		PokemonspokemonLayoutRoute.addChildren([PokemonspokemonPageRoute]),
		PokemonspokemonPageRoute
	]);
	//#endregion
	//#region .tuono/server-main.tsx
	init_ssr();
	var renderer = serverSideRendering(routeTree);
	var renderFn = renderer.renderFn;
	var renderStream = renderer.renderStream;
	//#endregion
	exports.renderFn = renderFn;
	exports.renderStream = renderStream;
	return exports;
})({});
