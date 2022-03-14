
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.45.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const generatePaths = currencies => {
      return currencies
        .map(currency => currencies.map(currency2 => currencies.map(currency3 => {
          if (currency !== currency2 && currency !== currency3 && currency2 !== currency3) {
            return ({
              path: [currency, currency2, currency3],
              joined: `${currency}/${currency2}/${currency3}`,
            });
          }
          return null;
        })))
        .flat(2)
        .filter(Boolean)
        .reduce((acc, pathObj) => {
          const {path} = pathObj;
          const current = acc.map(a => a.path.join());
          if (
            !current.includes(path.join())
            && !current.includes([path[1], path[2], path[0]].join())
            && !current.includes([path[2], path[0], path[1]].join())
          ) {
            acc.push(pathObj);
          }
          return acc;
        }, []);
    };

    const addPairs = pairings => path => ({
      ...path,
      pairs: path.path
        .map((currency, idx) => {
          const nextCurrency = path.path[path.path[idx + 1] ? idx + 1 : 0];
          if (pairings[currency] && pairings[currency].includes(nextCurrency)) {
            return {base: nextCurrency, quote: currency, side: 'BUY'};
          }
          if (pairings[nextCurrency] && pairings[nextCurrency].includes(currency)) {
            return {base: currency, quote: nextCurrency, side: 'SELL'};
          }
          return null;
        })
        .map(pair => {
          if (pair) {
            return {
              ...pair,
              get id() {
                return `${this.base}${this.quote}`;
              },
              get tickerName() {
                return `${this.id.toLowerCase()}@bookTicker`;
              },
            };
          }
          return null;
        }),
    });

    const addPercentChange = (prices, feePerTrade, changedId) => path => {
      if (
        path.percent
          ? !path.pairs.some(({id}) => id === changedId)
          : !path.pairs.every(({id}) => prices[id])
      ) {
        return path;
      }

      const endBalance = path.pairs.reduce((balance, {id, side}) => {
        if (side === 'BUY') {
          const fee = balance * feePerTrade;
          const balanceAfterFee = balance - fee;
          return balanceAfterFee / prices[id]['BUY'];
        }
        const balanceAfterSold = balance * prices[id]['SELL'];
        const fee = balanceAfterSold * feePerTrade;
        return balanceAfterSold - fee;
      }, 1);

      const finalBalance = endBalance - 1;

      return {
        ...path,
        percent: (finalBalance * 100).toFixed(4),
        isProfitable: finalBalance > 0,
      };
    };

    let binanceApi;

    const getMarketData = () => {
      binanceApi = binanceApi || new window.ccxt.binance();
      return binanceApi.loadMarkets();
    };

    const subscribeAction = params => JSON.stringify({method: 'SUBSCRIBE', params, id: 1});
    const unsubscribeAction = params => JSON.stringify({method: 'UNSUBSCRIBE', params, id: 312});

    const getPairings = () => {
      return getMarketData()
        .then(marketData => {
          return Object.values(marketData).reduce((acc, market, idx) => {
            // if (idx === 0) {
            //   console.log(market)
            // }

            if (!market.active || !market.spot) {
              return acc;
            }

            if (!acc[market.quote]) {
              acc[market.quote] = [market.base];
            } else {
              acc[market.quote].push(market.base);
            }
            return acc;
          }, {});
        })
        .then(pairings => {
          return Object.entries(pairings).reduce((acc, [quote, bases]) => {
            acc[quote] = bases.filter(base => {
              if (acc[base]) {
                return true;
              }
              return Object.entries(pairings).some(([quote2, bases2]) => {
                if (quote2 === quote) {
                  return false;
                }
                return bases2.includes(base);
              });
            });
            return acc;
          }, {});
        });
    };

    /**
     * Svelte action that dispatches a custom stuck event when a node becomes stuck or unstuck (position: sticky is having an effect)
     * @param node  - the node the action is placed on
     * @param params.callback - function to execute when the node becomes stuck or unstuck
     */
    function sticky(node, { stickToTop }) {
      const intersectionCallback = function (entries) {
        // only observing one item at a time
        const entry = entries[0];

        let isStuck = false;
        if (!entry.isIntersecting && isValidYPosition(entry)) {
          isStuck = true;
        }

        node.dispatchEvent(new CustomEvent('stuck', {
          detail: { isStuck }
        }));
      };

      const isValidYPosition = function ({ target, boundingClientRect }) {
        if (target === stickySentinelTop) {
          return boundingClientRect.y < 0;
        } else {
          return boundingClientRect.y > 0;
        }
      };

      const mutationCallback = function (mutations) {
        // If something changes and the sentinel nodes are no longer first and last child, put them back in position
        mutations.forEach(function (mutation) {
          const { parentNode: topParent } = stickySentinelTop;
          const { parentNode: bottomParent } = stickySentinelBottom;

          if (stickySentinelTop !== topParent.firstChild) {
            topParent.prepend(stickySentinelTop);
          }
          if (stickySentinelBottom !== bottomParent.lastChild) {
            bottomParent.append(stickySentinelBottom);
          }
        });
      };

      const intersectionObserver = new IntersectionObserver(
        intersectionCallback,
        {}
      );
      const mutationObserver = new MutationObserver(mutationCallback);

      // we insert and observe a sentinel node immediately after the target
      // when it is visible, the target node cannot be sticking
      const sentinelStyle = 'position: absolute; height: 1px;';
      const stickySentinelTop = document.createElement('div');
      stickySentinelTop.classList.add('stickySentinelTop');
      // without setting a height, Safari breaks
      stickySentinelTop.style = sentinelStyle;
      node.parentNode.prepend(stickySentinelTop);

      const stickySentinelBottom = document.createElement('div');
      stickySentinelBottom.classList.add('stickySentinelBottom');
      stickySentinelBottom.style = sentinelStyle;
      node.parentNode.append(stickySentinelBottom);

      if (stickToTop) {
        intersectionObserver.observe(stickySentinelTop);
      } else {
        intersectionObserver.observe(stickySentinelBottom);
      }

      mutationObserver.observe(node.parentNode, { childList: true });

      return {
        update({ stickToTop }) {
          // change which sentinel we are observing
          if (stickToTop) {
            intersectionObserver.unobserve(stickySentinelBottom);
            intersectionObserver.observe(stickySentinelTop);
          } else {
            intersectionObserver.unobserve(stickySentinelTop);
            intersectionObserver.observe(stickySentinelBottom);
          }
        },

        destroy() {
          intersectionObserver.disconnect();
          mutationObserver.disconnect();
        }
      };
    }

    /* src/components/StickyContent.svelte generated by Svelte v3.45.0 */
    const file$1 = "src/components/StickyContent.svelte";
    const get_wrapper_slot_changes_1 = dirty => ({});
    const get_wrapper_slot_context_1 = ctx => ({});
    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});
    const get_wrapper_slot_changes = dirty => ({});
    const get_wrapper_slot_context = ctx => ({});

    // (42:2) {#if !stickToTop}
    function create_if_block_1(ctx) {
    	let current;
    	const wrapper_slot_template = /*#slots*/ ctx[4].wrapper;
    	const wrapper_slot = create_slot(wrapper_slot_template, ctx, /*$$scope*/ ctx[3], get_wrapper_slot_context);

    	const block = {
    		c: function create() {
    			if (wrapper_slot) wrapper_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (wrapper_slot) {
    				wrapper_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (wrapper_slot) {
    				if (wrapper_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						wrapper_slot,
    						wrapper_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(wrapper_slot_template, /*$$scope*/ ctx[3], dirty, get_wrapper_slot_changes),
    						get_wrapper_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wrapper_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wrapper_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (wrapper_slot) wrapper_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(42:2) {#if !stickToTop}",
    		ctx
    	});

    	return block;
    }

    // (55:2) {#if stickToTop}
    function create_if_block$1(ctx) {
    	let current;
    	const wrapper_slot_template = /*#slots*/ ctx[4].wrapper;
    	const wrapper_slot = create_slot(wrapper_slot_template, ctx, /*$$scope*/ ctx[3], get_wrapper_slot_context_1);

    	const block = {
    		c: function create() {
    			if (wrapper_slot) wrapper_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (wrapper_slot) {
    				wrapper_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (wrapper_slot) {
    				if (wrapper_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						wrapper_slot,
    						wrapper_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(wrapper_slot_template, /*$$scope*/ ctx[3], dirty, get_wrapper_slot_changes_1),
    						get_wrapper_slot_context_1
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wrapper_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wrapper_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (wrapper_slot) wrapper_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(55:2) {#if stickToTop}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let t0;
    	let div;
    	let div_data_position_value;
    	let sticky_action;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*stickToTop*/ ctx[0] && create_if_block_1(ctx);
    	const content_slot_template = /*#slots*/ ctx[4].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[3], get_content_slot_context);
    	let if_block1 = /*stickToTop*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div = element("div");
    			if (content_slot) content_slot.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "sticky svelte-12fdvuc");
    			attr_dev(div, "data-position", div_data_position_value = /*stickToTop*/ ctx[0] ? 'top' : 'bottom');
    			toggle_class(div, "isStuck", /*isStuck*/ ctx[1]);
    			add_location(div, file$1, 45, 2, 1057);
    			add_location(section, file$1, 40, 0, 989);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block0) if_block0.m(section, null);
    			append_dev(section, t0);
    			append_dev(section, div);

    			if (content_slot) {
    				content_slot.m(div, null);
    			}

    			append_dev(section, t1);
    			if (if_block1) if_block1.m(section, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(sticky_action = sticky.call(null, div, { stickToTop: /*stickToTop*/ ctx[0] })),
    					listen_dev(div, "stuck", /*handleStuck*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*stickToTop*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*stickToTop*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(section, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (content_slot) {
    				if (content_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						content_slot,
    						content_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(content_slot_template, /*$$scope*/ ctx[3], dirty, get_content_slot_changes),
    						get_content_slot_context
    					);
    				}
    			}

    			if (!current || dirty & /*stickToTop*/ 1 && div_data_position_value !== (div_data_position_value = /*stickToTop*/ ctx[0] ? 'top' : 'bottom')) {
    				attr_dev(div, "data-position", div_data_position_value);
    			}

    			if (sticky_action && is_function(sticky_action.update) && dirty & /*stickToTop*/ 1) sticky_action.update.call(null, { stickToTop: /*stickToTop*/ ctx[0] });

    			if (dirty & /*isStuck*/ 2) {
    				toggle_class(div, "isStuck", /*isStuck*/ ctx[1]);
    			}

    			if (/*stickToTop*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*stickToTop*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(section, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(content_slot, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(content_slot, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block0) if_block0.d();
    			if (content_slot) content_slot.d(detaching);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('StickyContent', slots, ['wrapper','content']);
    	let { stickToTop = true } = $$props;
    	let isStuck = false;

    	function handleStuck(e) {
    		$$invalidate(1, isStuck = e.detail.isStuck);
    	}

    	const writable_props = ['stickToTop'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<StickyContent> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('stickToTop' in $$props) $$invalidate(0, stickToTop = $$props.stickToTop);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ sticky, stickToTop, isStuck, handleStuck });

    	$$self.$inject_state = $$props => {
    		if ('stickToTop' in $$props) $$invalidate(0, stickToTop = $$props.stickToTop);
    		if ('isStuck' in $$props) $$invalidate(1, isStuck = $$props.isStuck);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stickToTop, isStuck, handleStuck, $$scope, slots];
    }

    class StickyContent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { stickToTop: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StickyContent",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get stickToTop() {
    		throw new Error("<StickyContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stickToTop(value) {
    		throw new Error("<StickyContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.45.0 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    // (735:12) {#each availableQuoteAssets as asset}
    function create_each_block_2(ctx) {
    	let button;
    	let t0_value = /*asset*/ ctx[30] + "";
    	let t0;
    	let t1;
    	let button_value_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[15](/*asset*/ ctx[30]);
    	}

    	function mouseenter_handler_1() {
    		return /*mouseenter_handler_1*/ ctx[16](/*asset*/ ctx[30]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "w-24 mr-1 mb-1");
    			button.value = button_value_value = /*asset*/ ctx[30];
    			set_style(button, "background-color", quoteBackgroundColor(/*selectedAssets*/ ctx[4], /*relatedQuoteAssets*/ ctx[3], /*asset*/ ctx[30]));
    			add_location(button, file, 735, 14, 18001);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", click_handler_1, false, false, false),
    					listen_dev(button, "mouseenter", mouseenter_handler_1, false, false, false),
    					listen_dev(button, "mouseleave", /*resetRelatedQuoteAssets*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*availableQuoteAssets*/ 2 && t0_value !== (t0_value = /*asset*/ ctx[30] + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*availableQuoteAssets*/ 2 && button_value_value !== (button_value_value = /*asset*/ ctx[30])) {
    				prop_dev(button, "value", button_value_value);
    			}

    			if (dirty[0] & /*selectedAssets, relatedQuoteAssets, availableQuoteAssets*/ 26) {
    				set_style(button, "background-color", quoteBackgroundColor(/*selectedAssets*/ ctx[4], /*relatedQuoteAssets*/ ctx[3], /*asset*/ ctx[30]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(735:12) {#each availableQuoteAssets as asset}",
    		ctx
    	});

    	return block;
    }

    // (729:8) 
    function create_content_slot(ctx) {
    	let div2;
    	let div0;
    	let span0;
    	let t1;
    	let span1;
    	let t3;
    	let div1;
    	let each_value_2 = /*availableQuoteAssets*/ ctx[1];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Quote Assets";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "(select at least 2)";
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span0, "class", "text-xl");
    			add_location(span0, file, 730, 12, 17779);
    			add_location(span1, file, 731, 12, 17833);
    			add_location(div0, file, 729, 10, 17761);
    			attr_dev(div1, "class", "flex flex-wrap justify-center");
    			add_location(div1, file, 733, 10, 17893);
    			attr_dev(div2, "slot", "content");
    			attr_dev(div2, "class", "p-4");
    			add_location(div2, file, 728, 8, 17718);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(div2, t3);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*availableQuoteAssets, selectedAssets, relatedQuoteAssets, toggleAsset, showRelatedQuoteAssets, resetRelatedQuoteAssets*/ 1818) {
    				each_value_2 = /*availableQuoteAssets*/ ctx[1];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_content_slot.name,
    		type: "slot",
    		source: "(729:8) ",
    		ctx
    	});

    	return block;
    }

    // (752:12) {#each availableBaseAssets as asset}
    function create_each_block_1(ctx) {
    	let button;
    	let t0_value = /*asset*/ ctx[30] + "";
    	let t0;
    	let t1;
    	let button_value_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[13](/*asset*/ ctx[30]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[14](/*asset*/ ctx[30]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "w-24 mr-1 mb-1");
    			button.value = button_value_value = /*asset*/ ctx[30];

    			set_style(button, "background-color", /*selectedAssets*/ ctx[4].includes(/*asset*/ ctx[30])
    			? '#c8c8c8'
    			: '#fff');

    			add_location(button, file, 752, 14, 18719);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", click_handler, false, false, false),
    					listen_dev(button, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(button, "mouseleave", /*resetRelatedQuoteAssets*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*availableBaseAssets*/ 4 && t0_value !== (t0_value = /*asset*/ ctx[30] + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*availableBaseAssets*/ 4 && button_value_value !== (button_value_value = /*asset*/ ctx[30])) {
    				prop_dev(button, "value", button_value_value);
    			}

    			if (dirty[0] & /*selectedAssets, availableBaseAssets*/ 20) {
    				set_style(button, "background-color", /*selectedAssets*/ ctx[4].includes(/*asset*/ ctx[30])
    				? '#c8c8c8'
    				: '#fff');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(752:12) {#each availableBaseAssets as asset}",
    		ctx
    	});

    	return block;
    }

    // (748:8) 
    function create_wrapper_slot(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let t2;
    	let div2;
    	let each_value_1 = /*availableBaseAssets*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Base Assets";
    			t2 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "h-4");
    			add_location(div0, file, 748, 10, 18529);
    			attr_dev(div1, "class", "text-xl");
    			add_location(div1, file, 749, 10, 18563);
    			attr_dev(div2, "class", "flex flex-wrap justify-center");
    			add_location(div2, file, 750, 10, 18612);
    			attr_dev(div3, "slot", "wrapper");
    			attr_dev(div3, "class", "p-4");
    			add_location(div3, file, 747, 8, 18486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*availableBaseAssets, selectedAssets, toggleAsset, showRelatedQuoteAssets, resetRelatedQuoteAssets*/ 1812) {
    				each_value_1 = /*availableBaseAssets*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_wrapper_slot.name,
    		type: "slot",
    		source: "(748:8) ",
    		ctx
    	});

    	return block;
    }

    // (774:6) {#if !paths.length}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			p = element("p");
    			p.textContent = "No paths found. Try to select different quote and base assets.";
    			attr_dev(div, "class", "h-4");
    			add_location(div, file, 774, 8, 19443);
    			add_location(p, file, 775, 8, 19475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(774:6) {#if !paths.length}",
    		ctx
    	});

    	return block;
    }

    // (781:8) {#each paths.filter(path => 'percent' in path) as path (path.joined)}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let span0;
    	let t0_value = /*path*/ ctx[27].percent + "";
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let t3;
    	let span1;
    	let t4_value = /*path*/ ctx[27].joined + "";
    	let t4;
    	let t5;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div1 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = text("%");
    			t2 = space();
    			div0 = element("div");
    			t3 = space();
    			span1 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(span0, "class", "w-20 font-bold font-mono flex justify-end");
    			set_style(span0, "color", /*path*/ ctx[27].isProfitable ? 'green' : 'red');
    			add_location(span0, file, 782, 12, 19746);
    			attr_dev(div0, "class", "w-1");
    			add_location(div0, file, 786, 12, 19937);
    			attr_dev(span1, "class", "w-40");
    			add_location(span1, file, 787, 12, 19973);
    			attr_dev(div1, "class", "flex");
    			add_location(div1, file, 781, 10, 19715);
    			this.first = div1;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div1, t3);
    			append_dev(div1, span1);
    			append_dev(span1, t4);
    			append_dev(div1, t5);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*paths*/ 32 && t0_value !== (t0_value = /*path*/ ctx[27].percent + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*paths*/ 32) {
    				set_style(span0, "color", /*path*/ ctx[27].isProfitable ? 'green' : 'red');
    			}

    			if (dirty[0] & /*paths*/ 32 && t4_value !== (t4_value = /*path*/ ctx[27].joined + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(781:8) {#each paths.filter(path => 'percent' in path) as path (path.joined)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let div11;
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let t1;
    	let div3;
    	let t2;
    	let div10;
    	let h1;
    	let t3;
    	let span0;
    	let t4;
    	let t5;
    	let t6;
    	let h2;
    	let t8;
    	let div4;
    	let t9;
    	let p0;
    	let t11;
    	let div5;
    	let t12;
    	let div9;
    	let div8;
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t14;
    	let li1;
    	let a1;
    	let t16;
    	let li2;
    	let a2;
    	let t18;
    	let form;
    	let span1;
    	let t20;
    	let div6;
    	let t21;
    	let input;
    	let t22;
    	let div7;
    	let t23;
    	let span2;
    	let t24_value = (/*feePerTrade*/ ctx[0] / 1000).toFixed(4) + "";
    	let t24;
    	let t25;
    	let t26;
    	let div12;
    	let t27;
    	let div22;
    	let div16;
    	let div15;
    	let div14;
    	let div13;
    	let t29;
    	let p1;
    	let t31;
    	let stickycontent;
    	let t32;
    	let div17;
    	let t33;
    	let div21;
    	let div20;
    	let div18;
    	let t35;
    	let t36;
    	let div19;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t37;
    	let div23;
    	let t38;
    	let footer;
    	let current;
    	let mounted;
    	let dispose;

    	stickycontent = new StickyContent({
    			props: {
    				$$slots: {
    					wrapper: [create_wrapper_slot],
    					content: [create_content_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = !/*paths*/ ctx[5].length && create_if_block(ctx);
    	let each_value = /*paths*/ ctx[5].filter(func);
    	validate_each_argument(each_value);
    	const get_key = ctx => /*path*/ ctx[27].joined;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div11 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t1 = space();
    			div3 = element("div");
    			t2 = space();
    			div10 = element("div");
    			h1 = element("h1");
    			t3 = text("Binance ");
    			span0 = element("span");
    			t4 = text("▲");
    			t5 = text(" Triangular arbitrage monitor");
    			t6 = space();
    			h2 = element("h2");
    			h2.textContent = "Monitoring arbitrage opportunities on Binance";
    			t8 = space();
    			div4 = element("div");
    			t9 = space();
    			p0 = element("p");
    			p0.textContent = "This app monitors arbitrage opportunities on Binance. It is a web app that uses the Binance API to fetch the\n      current price of the assets and then calculates the arbitrage opportunities. The arbitrage opportunities are then\n      displayed in a table.";
    			t11 = space();
    			div5 = element("div");
    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Triangular";
    			t14 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Quadupular";
    			t16 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Quintupular";
    			t18 = space();
    			form = element("form");
    			span1 = element("span");
    			span1.textContent = "FEES";
    			t20 = space();
    			div6 = element("div");
    			t21 = space();
    			input = element("input");
    			t22 = space();
    			div7 = element("div");
    			t23 = space();
    			span2 = element("span");
    			t24 = text(t24_value);
    			t25 = text("%");
    			t26 = space();
    			div12 = element("div");
    			t27 = space();
    			div22 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div13.textContent = "Select Assets";
    			t29 = space();
    			p1 = element("p");
    			p1.textContent = "Click on the assets you want to monitor. First select a couple of quote asset, then the base assets.\n          Hovering over an asset will highlight the related quote assets.\n          Once you've selected base and quote assets, the arbitrage results will be displayed on the right.";
    			t31 = space();
    			create_component(stickycontent.$$.fragment);
    			t32 = space();
    			div17 = element("div");
    			t33 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Paths";
    			t35 = space();
    			if (if_block) if_block.c();
    			t36 = space();
    			div19 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t37 = space();
    			div23 = element("div");
    			t38 = space();
    			footer = element("footer");
    			footer.textContent = "© 2022 - Vince Liem";
    			attr_dev(div0, "class", "h-4");
    			add_location(div0, file, 665, 0, 15385);
    			attr_dev(img, "class", "w-40");
    			attr_dev(img, "alt", "logo");
    			if (!src_url_equal(img.src, img_src_value = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Logo_Comit%C3%A9_d%27arbitrage.svg/1024px-Logo_Comit%C3%A9_d%27arbitrage.svg.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 670, 6, 15522);
    			attr_dev(div1, "class", "w-full h-full flex justify-center items-center");
    			add_location(div1, file, 669, 4, 15455);
    			attr_dev(div2, "class", "w-1/3");
    			add_location(div2, file, 668, 2, 15431);
    			attr_dev(div3, "class", "w-4");
    			add_location(div3, file, 674, 2, 15731);
    			attr_dev(span0, "id", "websocket-status");
    			set_style(span0, "color", /*wsStatus*/ ctx[6]);
    			add_location(span0, file, 677, 14, 15831);
    			attr_dev(h1, "class", "text-2xl");
    			add_location(h1, file, 676, 4, 15795);
    			attr_dev(h2, "class", "test-xl");
    			add_location(h2, file, 679, 4, 15937);
    			attr_dev(div4, "class", "h-4");
    			add_location(div4, file, 682, 4, 16024);
    			attr_dev(p0, "class", "w-[50vw]");
    			add_location(p0, file, 683, 4, 16052);
    			attr_dev(div5, "class", "h-4");
    			add_location(div5, file, 689, 4, 16350);
    			attr_dev(a0, "class", "font-bold");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file, 695, 16, 16539);
    			add_location(li0, file, 695, 12, 16535);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file, 696, 16, 16605);
    			add_location(li1, file, 696, 12, 16601);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file, 697, 16, 16653);
    			add_location(li2, file, 697, 12, 16649);
    			attr_dev(ul, "class", "flex gap-4");
    			add_location(ul, file, 694, 10, 16499);
    			add_location(nav, file, 693, 8, 16483);
    			add_location(span1, file, 702, 10, 16794);
    			attr_dev(div6, "class", "w-4");
    			add_location(div6, file, 703, 10, 16822);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "p-1");
    			add_location(input, file, 704, 10, 16856);
    			attr_dev(div7, "class", "w-4");
    			add_location(div7, file, 705, 10, 16960);
    			attr_dev(span2, "class", "font-mono");
    			add_location(span2, file, 706, 10, 16994);
    			attr_dev(form, "id", "fees");
    			attr_dev(form, "class", "flex items-center justify-center");
    			add_location(form, file, 701, 8, 16726);
    			attr_dev(div8, "class", "flex items-center justify-between");
    			add_location(div8, file, 692, 6, 16427);
    			attr_dev(div9, "class", "p-4 shadow rounded bg-white");
    			add_location(div9, file, 691, 4, 16379);
    			attr_dev(div10, "class", "flex flex-col w-2/3");
    			add_location(div10, file, 675, 2, 15757);
    			attr_dev(div11, "class", "flex");
    			add_location(div11, file, 667, 0, 15410);
    			attr_dev(div12, "class", "h-4");
    			add_location(div12, file, 713, 0, 17117);
    			attr_dev(div13, "class", "text-2xl");
    			add_location(div13, file, 720, 8, 17315);
    			add_location(p1, file, 721, 8, 17365);
    			attr_dev(div14, "id", "asset-buttons-description");
    			attr_dev(div14, "class", "p-4");
    			add_location(div14, file, 719, 6, 17258);
    			attr_dev(div15, "id", "asset-buttons");
    			attr_dev(div15, "class", "shadow rounded bg-white");
    			add_location(div15, file, 718, 4, 17195);
    			attr_dev(div16, "class", "w-1/3");
    			add_location(div16, file, 716, 2, 17170);
    			attr_dev(div17, "class", "w-4");
    			add_location(div17, file, 768, 2, 19230);
    			attr_dev(div18, "class", "text-xl flex justify-center");
    			add_location(div18, file, 772, 6, 19356);
    			attr_dev(div19, "class", "flex flex-wrap justify-center");
    			add_location(div19, file, 779, 6, 19583);
    			attr_dev(div20, "class", "p-4 shadow rounded bg-white flex flex-col items-center");
    			add_location(div20, file, 771, 4, 19281);
    			attr_dev(div21, "class", "w-2/3");
    			add_location(div21, file, 770, 2, 19257);
    			attr_dev(div22, "class", "w-full flex");
    			add_location(div22, file, 715, 0, 17142);
    			attr_dev(div23, "class", "h-4");
    			add_location(div23, file, 795, 0, 20087);
    			add_location(footer, file, 797, 0, 20112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div2);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(div11, t1);
    			append_dev(div11, div3);
    			append_dev(div11, t2);
    			append_dev(div11, div10);
    			append_dev(div10, h1);
    			append_dev(h1, t3);
    			append_dev(h1, span0);
    			append_dev(span0, t4);
    			append_dev(h1, t5);
    			append_dev(div10, t6);
    			append_dev(div10, h2);
    			append_dev(div10, t8);
    			append_dev(div10, div4);
    			append_dev(div10, t9);
    			append_dev(div10, p0);
    			append_dev(div10, t11);
    			append_dev(div10, div5);
    			append_dev(div10, t12);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t14);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t16);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(div8, t18);
    			append_dev(div8, form);
    			append_dev(form, span1);
    			append_dev(form, t20);
    			append_dev(form, div6);
    			append_dev(form, t21);
    			append_dev(form, input);
    			set_input_value(input, /*feePerTrade*/ ctx[0]);
    			append_dev(form, t22);
    			append_dev(form, div7);
    			append_dev(form, t23);
    			append_dev(form, span2);
    			append_dev(span2, t24);
    			append_dev(span2, t25);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, div12, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, div22, anchor);
    			append_dev(div22, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div14, t29);
    			append_dev(div14, p1);
    			append_dev(div15, t31);
    			mount_component(stickycontent, div15, null);
    			append_dev(div22, t32);
    			append_dev(div22, div17);
    			append_dev(div22, t33);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t35);
    			if (if_block) if_block.m(div20, null);
    			append_dev(div20, t36);
    			append_dev(div20, div19);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div19, null);
    			}

    			insert_dev(target, t37, anchor);
    			insert_dev(target, div23, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, footer, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(input, "keyup", /*keyup_handler*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*wsStatus*/ 64) {
    				set_style(span0, "color", /*wsStatus*/ ctx[6]);
    			}

    			if (dirty[0] & /*feePerTrade*/ 1 && to_number(input.value) !== /*feePerTrade*/ ctx[0]) {
    				set_input_value(input, /*feePerTrade*/ ctx[0]);
    			}

    			if ((!current || dirty[0] & /*feePerTrade*/ 1) && t24_value !== (t24_value = (/*feePerTrade*/ ctx[0] / 1000).toFixed(4) + "")) set_data_dev(t24, t24_value);
    			const stickycontent_changes = {};

    			if (dirty[0] & /*availableBaseAssets, selectedAssets, availableQuoteAssets, relatedQuoteAssets*/ 30 | dirty[1] & /*$$scope*/ 16) {
    				stickycontent_changes.$$scope = { dirty, ctx };
    			}

    			stickycontent.$set(stickycontent_changes);

    			if (!/*paths*/ ctx[5].length) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div20, t36);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*paths*/ 32) {
    				each_value = /*paths*/ ctx[5].filter(func);
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div19, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stickycontent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stickycontent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div11);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(div12);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(div22);
    			destroy_component(stickycontent);
    			if (if_block) if_block.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(div23);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function quoteBackgroundColor(selectedAssets, relatedQuoteAssets, asset) {
    	const isSelected = selectedAssets.includes(asset);
    	const isRelated = relatedQuoteAssets.includes(asset);

    	return isSelected && isRelated
    	? '#c8c8e6'
    	: isSelected ? '#c8c8c8' : isRelated ? '#c8c8ff' : '#fff';
    }

    const func = path => 'percent' in path;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let feePerTrade = 75;
    	let availableQuoteAssets = [];
    	let availableBaseAssets = [];
    	let relatedQuoteAssets = [];
    	let selectedAssets = [];
    	let paths = [];
    	let prices = {};
    	let pairings = {};
    	let activePairIds = [];
    	let ws;
    	let wsStatus = 'red';
    	let sortingInterval;

    	onMount(() => {
    		getPairings().then(remotePairings => {
    			pairings = remotePairings;
    			$$invalidate(1, availableQuoteAssets = Object.keys(remotePairings));
    			$$invalidate(2, availableBaseAssets = [...new Set(Object.values(remotePairings).flat(1))].filter(base => !Object.keys(remotePairings).includes(base)));
    		});

    		initTicker();
    	});

    	function initTicker() {
    		ws = new WebSocket('wss://stream.binance.com/stream');

    		ws.onopen = () => {
    			$$invalidate(6, wsStatus = 'green');
    			sortingInterval = setInterval(sortPaths, 1000);

    			if (activePairIds.length > 0) {
    				ws.send(subscribeAction(activePairIds));
    			}
    		};

    		ws.onmessage = stream => {
    			const data = JSON.parse(stream.data);

    			if (data?.data) {
    				const { s, a, b } = data.data;
    				prices[s] = { 'BUY': a, 'SELL': b };
    				addPercent(paths, s);
    			}
    		};

    		ws.onclose = () => {
    			$$invalidate(6, wsStatus = 'red');
    			clearInterval(sortingInterval);

    			setTimeout(
    				() => {
    					$$invalidate(6, wsStatus = 'yellow');
    					initTicker();
    				},
    				1000
    			);
    		};
    	}

    	function handleWsSubscriptions(possiblePaths) {
    		const pairIds = [
    			...new Set(possiblePaths.flatMap(path => path.pairs.map(pair => pair.tickerName)))
    		];

    		let newPairIds = pairIds.filter(id => !activePairIds.includes(id));

    		if (newPairIds.length > 0) {
    			ws.send(subscribeAction(newPairIds));
    			activePairIds = [...activePairIds, ...newPairIds];
    		}

    		let oldPairIds = activePairIds.filter(id => !pairIds.includes(id));

    		if (oldPairIds.length > 0) {
    			ws.send(unsubscribeAction(oldPairIds));
    			activePairIds = activePairIds.filter(id => !oldPairIds.includes(id));
    		}
    	}

    	function sortPaths() {
    		$$invalidate(5, paths = paths.sort((a, b) => b.percent - a.percent));
    	}

    	function addPercent(possiblePaths, changedId) {
    		const fees = (feePerTrade || 0) / 100000;
    		$$invalidate(5, paths = possiblePaths.map(addPercentChange(prices, fees, changedId)));
    	}

    	function newPaths(possiblePaths) {
    		if (possiblePaths.length > paths.length) {
    			return possiblePaths.map(possiblePath => paths.find(({ joined }) => joined === possiblePath.joined) || possiblePath);
    		} else {
    			return paths.filter(({ joined }) => possiblePaths.map(({ joined }) => joined).includes(joined));
    		}
    	}

    	function fillPaths() {
    		const nextPaths = generatePaths(selectedAssets).map(addPairs(pairings)).filter(path => path.pairs.every(Boolean));
    		handleWsSubscriptions(nextPaths);
    		addPercent(newPaths(nextPaths));
    	}

    	function toggleAsset(asset) {
    		if (selectedAssets.includes(asset)) {
    			$$invalidate(4, selectedAssets = selectedAssets.filter(c => c !== asset));
    		} else {
    			$$invalidate(4, selectedAssets = [...selectedAssets, asset]);
    		}

    		fillPaths();
    	}

    	function showRelatedQuoteAssets(asset) {
    		$$invalidate(3, relatedQuoteAssets = Object.keys(pairings).filter(c => pairings[c].includes(asset)));
    	}

    	function resetRelatedQuoteAssets() {
    		$$invalidate(3, relatedQuoteAssets = []);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		feePerTrade = to_number(this.value);
    		$$invalidate(0, feePerTrade);
    	}

    	const keyup_handler = () => addPercent(paths);
    	const click_handler = asset => toggleAsset(asset);
    	const mouseenter_handler = asset => showRelatedQuoteAssets(asset);
    	const click_handler_1 = asset => toggleAsset(asset);
    	const mouseenter_handler_1 = asset => showRelatedQuoteAssets(asset);

    	$$self.$capture_state = () => ({
    		addPairs,
    		addPercentChange,
    		generatePaths,
    		getPairings,
    		subscribeAction,
    		unsubscribeAction,
    		onMount,
    		StickyContent,
    		feePerTrade,
    		availableQuoteAssets,
    		availableBaseAssets,
    		relatedQuoteAssets,
    		selectedAssets,
    		paths,
    		prices,
    		pairings,
    		activePairIds,
    		ws,
    		wsStatus,
    		sortingInterval,
    		initTicker,
    		handleWsSubscriptions,
    		sortPaths,
    		addPercent,
    		newPaths,
    		fillPaths,
    		toggleAsset,
    		showRelatedQuoteAssets,
    		resetRelatedQuoteAssets,
    		quoteBackgroundColor
    	});

    	$$self.$inject_state = $$props => {
    		if ('feePerTrade' in $$props) $$invalidate(0, feePerTrade = $$props.feePerTrade);
    		if ('availableQuoteAssets' in $$props) $$invalidate(1, availableQuoteAssets = $$props.availableQuoteAssets);
    		if ('availableBaseAssets' in $$props) $$invalidate(2, availableBaseAssets = $$props.availableBaseAssets);
    		if ('relatedQuoteAssets' in $$props) $$invalidate(3, relatedQuoteAssets = $$props.relatedQuoteAssets);
    		if ('selectedAssets' in $$props) $$invalidate(4, selectedAssets = $$props.selectedAssets);
    		if ('paths' in $$props) $$invalidate(5, paths = $$props.paths);
    		if ('prices' in $$props) prices = $$props.prices;
    		if ('pairings' in $$props) pairings = $$props.pairings;
    		if ('activePairIds' in $$props) activePairIds = $$props.activePairIds;
    		if ('ws' in $$props) ws = $$props.ws;
    		if ('wsStatus' in $$props) $$invalidate(6, wsStatus = $$props.wsStatus);
    		if ('sortingInterval' in $$props) sortingInterval = $$props.sortingInterval;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		feePerTrade,
    		availableQuoteAssets,
    		availableBaseAssets,
    		relatedQuoteAssets,
    		selectedAssets,
    		paths,
    		wsStatus,
    		addPercent,
    		toggleAsset,
    		showRelatedQuoteAssets,
    		resetRelatedQuoteAssets,
    		input_input_handler,
    		keyup_handler,
    		click_handler,
    		mouseenter_handler,
    		click_handler_1,
    		mouseenter_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
        target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
