
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function empty() {
        return text('');
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
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
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
            })
          }
          return null
        })))
        .flat(2)
        .filter(Boolean)
        .reduce((acc, pathObj) => {
          const {path} = pathObj;
          const current = acc.map(a => a.joined);
          if (
            !current.includes(path.join())
            && !current.includes([path[1], path[2], path[0]].join())
            && !current.includes([path[2], path[0], path[1]].join())
          ) {
            acc.push(pathObj);
          }
          return acc
        }, [])
    };

    const addPairs = pairings => path => ({
      ...path,
      pairs: path.path
        .map((currency, idx) => {
          const nextCurrency = path.path[path.path[idx + 1] ? idx + 1 : 0];
          if (pairings[currency] && pairings[currency].includes(nextCurrency)) {
            return {base: nextCurrency, quote: currency, side: 'BUY'}
          }
          if (pairings[nextCurrency] && pairings[nextCurrency].includes(currency)) {
            return {base: currency, quote: nextCurrency, side: 'SELL'}
          }
          return null
        })
        .map(pair => {
          if (pair) {
            return {
              ...pair,
              get id() {
                return `${this.base}${this.quote}`
              },
              get tickerName() {
                return `${this.id.toLowerCase()}@bookTicker`
              },
            }
          }
          return null
        }),
    });

    const addPercentChange = (prices, feePerTrade) => path => {
      const rawFeePerTrade = (feePerTrade || 0) / 1000000;
      const startBalance = 1;

      const endBalance = path.pairs.reduce((balance, pair) => {
        if (pair.side === 'BUY') {
          const fee = balance * rawFeePerTrade;
          const balanceAfterFee = balance - fee;
          return balanceAfterFee / (prices[pair.id]?.['BUY'] || 0)
        }
        const balanceAfterSold = balance * (prices[pair.id]?.['SELL'] || Infinity);
        const fee = balanceAfterSold * rawFeePerTrade;
        return balanceAfterSold - fee
      }, startBalance);

      const finalBalance = endBalance - startBalance;

      return {
        ...path,
        percent: finalBalance / Math.abs(startBalance) * 100,
        isProfitable: finalBalance > 0,
      }
    };

    let binanceApi;

    const getMarketData = () => {
      binanceApi = binanceApi || new window.ccxt.binance();
      return binanceApi.loadMarkets()
    };

    const getPairings = () => {
      return getMarketData()
        .then(marketData => {
          return Object.values(marketData).reduce((acc, market, idx) => {
            // if (idx === 0) {
            //   console.log(market)
            // }

            if (!market.active || !market.spot) {
              return acc
            }

            if (!acc[market.quote]) {
              acc[market.quote] = [market.base];
            } else {
              acc[market.quote].push(market.base);
            }
            return acc
          }, {})
        })
        .then(pairings => {
          return Object.entries(pairings).reduce((acc, [quote, bases]) => {
            acc[quote] = bases.filter(base => {
              if (acc[base]) {
                return true
              }
              return Object.entries(pairings).some(([quote2, bases2]) => {
                if (quote2 === quote) {
                  return false
                }
                return bases2.includes(base)
              })
            });
            return acc
          }, {})
        })
    };

    const subscribeAction = params => JSON.stringify({method: 'SUBSCRIBE', params, id: 1});
    const unsubscribeAction = params => JSON.stringify({method: 'UNSUBSCRIBE', params, id: 312});

    /* src\App.svelte generated by Svelte v3.45.0 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (120:6) {#each availableQuoteCurrencies as currency}
    function create_each_block_2(ctx) {
    	let label;
    	let input;
    	let input_value_value;
    	let t0;
    	let t1_value = /*currency*/ ctx[23] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "checkbox");
    			input.__value = input_value_value = /*currency*/ ctx[23];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[10][0].push(input);
    			add_location(input, file, 121, 10, 3707);
    			attr_dev(label, "class", "svelte-s1axyz");
    			add_location(label, file, 120, 8, 3688);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = ~/*selectedCurrencies*/ ctx[1].indexOf(input.__value);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[9]),
    					listen_dev(input, "change", /*fillPaths*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*availableQuoteCurrencies*/ 4 && input_value_value !== (input_value_value = /*currency*/ ctx[23])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*selectedCurrencies*/ 2) {
    				input.checked = ~/*selectedCurrencies*/ ctx[1].indexOf(input.__value);
    			}

    			if (dirty & /*availableQuoteCurrencies*/ 4 && t1_value !== (t1_value = /*currency*/ ctx[23] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[10][0].splice(/*$$binding_groups*/ ctx[10][0].indexOf(input), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(120:6) {#each availableQuoteCurrencies as currency}",
    		ctx
    	});

    	return block;
    }

    // (131:6) {#each availableBaseCurrencies as currency}
    function create_each_block_1(ctx) {
    	let label;
    	let input;
    	let input_value_value;
    	let t0;
    	let t1_value = /*currency*/ ctx[23] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "checkbox");
    			input.__value = input_value_value = /*currency*/ ctx[23];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[10][0].push(input);
    			add_location(input, file, 132, 10, 4015);
    			attr_dev(label, "class", "svelte-s1axyz");
    			add_location(label, file, 131, 8, 3996);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = ~/*selectedCurrencies*/ ctx[1].indexOf(input.__value);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler_1*/ ctx[11]),
    					listen_dev(input, "change", /*fillPaths*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*availableBaseCurrencies*/ 8 && input_value_value !== (input_value_value = /*currency*/ ctx[23])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*selectedCurrencies*/ 2) {
    				input.checked = ~/*selectedCurrencies*/ ctx[1].indexOf(input.__value);
    			}

    			if (dirty & /*availableBaseCurrencies*/ 8 && t1_value !== (t1_value = /*currency*/ ctx[23] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[10][0].splice(/*$$binding_groups*/ ctx[10][0].indexOf(input), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(131:6) {#each availableBaseCurrencies as currency}",
    		ctx
    	});

    	return block;
    }

    // (143:8) {#if !isNaN(path.percent) && isFinite(path.percent)}
    function create_if_block(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*path*/ ctx[20].percent.toFixed(4) + "";
    	let t0;
    	let t1;
    	let t2;
    	let span1;
    	let t3_value = /*path*/ ctx[20].joined + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = text("%");
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			set_style(span0, "width", "5rem");
    			set_style(span0, "font-weight", "bold");
    			set_style(span0, "color", /*path*/ ctx[20].isProfitable ? 'green' : 'red');
    			add_location(span0, file, 144, 12, 4425);
    			set_style(span1, "width", "10rem");
    			add_location(span1, file, 147, 12, 4594);
    			set_style(div, "display", "flex");
    			add_location(div, file, 143, 10, 4383);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(span1, t3);
    			append_dev(div, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*paths*/ 16 && t0_value !== (t0_value = /*path*/ ctx[20].percent.toFixed(4) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*paths*/ 16) {
    				set_style(span0, "color", /*path*/ ctx[20].isProfitable ? 'green' : 'red');
    			}

    			if (dirty & /*paths*/ 16 && t3_value !== (t3_value = /*path*/ ctx[20].joined + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(143:8) {#if !isNaN(path.percent) && isFinite(path.percent)}",
    		ctx
    	});

    	return block;
    }

    // (142:6) {#each paths as path (path.joined)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let show_if = !isNaN(/*path*/ ctx[20].percent) && isFinite(/*path*/ ctx[20].percent);
    	let if_block_anchor;
    	let if_block = show_if && create_if_block(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*paths*/ 16) show_if = !isNaN(/*path*/ ctx[20].percent) && isFinite(/*path*/ ctx[20].percent);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(142:6) {#each paths as path (path.joined)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let h1;
    	let t0;
    	let span0;
    	let t1;
    	let t2;
    	let t3;
    	let div4;
    	let div3;
    	let span1;
    	let t5;
    	let div1;
    	let t6;
    	let input;
    	let t7;
    	let div2;
    	let t8;
    	let span2;
    	let t9_value = /*feePerTrade*/ ctx[0] / 10000 + "";
    	let t9;
    	let t10;
    	let t11;
    	let div5;
    	let t12;
    	let div12;
    	let div9;
    	let div6;
    	let t13;
    	let div7;
    	let t14;
    	let div8;
    	let t15;
    	let div11;
    	let div10;
    	let each_blocks = [];
    	let each2_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_2 = /*availableQuoteCurrencies*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*availableBaseCurrencies*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*paths*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*path*/ ctx[20].joined;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each2_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text("Binance ");
    			span0 = element("span");
    			t1 = text("▲");
    			t2 = text(" Triangular\r\n    arbitrage monitor");
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			span1 = element("span");
    			span1.textContent = "FEES";
    			t5 = space();
    			div1 = element("div");
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			span2 = element("span");
    			t9 = text(t9_value);
    			t10 = text("%");
    			t11 = space();
    			div5 = element("div");
    			t12 = space();
    			div12 = element("div");
    			div9 = element("div");
    			div6 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t13 = space();
    			div7 = element("div");
    			t14 = space();
    			div8 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t15 = space();
    			div11 = element("div");
    			div10 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(span0, "color", /*wsStatus*/ ctx[5] === 0
    			? 'red'
    			: /*wsStatus*/ ctx[5] === 1 ? 'orange' : 'green');

    			add_location(span0, file, 99, 12, 3033);
    			add_location(h1, file, 98, 2, 3015);
    			attr_dev(div0, "class", "center-box svelte-s1axyz");
    			add_location(div0, file, 97, 0, 2987);
    			add_location(span1, file, 106, 4, 3262);
    			set_style(div1, "width", "1rem");
    			add_location(div1, file, 107, 4, 3285);
    			attr_dev(input, "type", "number");
    			add_location(input, file, 108, 4, 3323);
    			set_style(div2, "width", "1rem");
    			add_location(div2, file, 109, 4, 3397);
    			add_location(span2, file, 110, 4, 3435);
    			set_style(div3, "display", "flex");
    			set_style(div3, "align-items", "center");
    			add_location(div3, file, 105, 2, 3208);
    			attr_dev(div4, "class", "center-box svelte-s1axyz");
    			add_location(div4, file, 104, 0, 3180);
    			set_style(div5, "height", "4rem");
    			add_location(div5, file, 114, 0, 3492);
    			attr_dev(div6, "class", "select svelte-s1axyz");
    			add_location(div6, file, 118, 4, 3606);
    			set_style(div7, "height", "1rem");
    			add_location(div7, file, 127, 4, 3874);
    			attr_dev(div8, "class", "select svelte-s1axyz");
    			add_location(div8, file, 129, 4, 3915);
    			set_style(div9, "width", "49vw");
    			add_location(div9, file, 117, 2, 3574);
    			set_style(div10, "display", "flex");
    			set_style(div10, "flex-wrap", "wrap");
    			add_location(div10, file, 140, 4, 4222);
    			set_style(div11, "width", "49vw");
    			add_location(div11, file, 139, 2, 4190);
    			set_style(div12, "width", "98vw");
    			set_style(div12, "display", "flex");
    			add_location(div12, file, 116, 0, 3529);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span0);
    			append_dev(span0, t1);
    			append_dev(h1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, span1);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div3, t6);
    			append_dev(div3, input);
    			set_input_value(input, /*feePerTrade*/ ctx[0]);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div3, t8);
    			append_dev(div3, span2);
    			append_dev(span2, t9);
    			append_dev(span2, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div5, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div9);
    			append_dev(div9, div6);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div6, null);
    			}

    			append_dev(div9, t13);
    			append_dev(div9, div7);
    			append_dev(div9, t14);
    			append_dev(div9, div8);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div8, null);
    			}

    			append_dev(div12, t15);
    			append_dev(div12, div11);
    			append_dev(div11, div10);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div10, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(input, "keyup", /*addPercent*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wsStatus*/ 32) {
    				set_style(span0, "color", /*wsStatus*/ ctx[5] === 0
    				? 'red'
    				: /*wsStatus*/ ctx[5] === 1 ? 'orange' : 'green');
    			}

    			if (dirty & /*feePerTrade*/ 1 && to_number(input.value) !== /*feePerTrade*/ ctx[0]) {
    				set_input_value(input, /*feePerTrade*/ ctx[0]);
    			}

    			if (dirty & /*feePerTrade*/ 1 && t9_value !== (t9_value = /*feePerTrade*/ ctx[0] / 10000 + "")) set_data_dev(t9, t9_value);

    			if (dirty & /*availableQuoteCurrencies, selectedCurrencies, fillPaths*/ 134) {
    				each_value_2 = /*availableQuoteCurrencies*/ ctx[2];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*availableBaseCurrencies, selectedCurrencies, fillPaths*/ 138) {
    				each_value_1 = /*availableBaseCurrencies*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*paths, isNaN, isFinite*/ 16) {
    				each_value = /*paths*/ ctx[4];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each2_lookup, div10, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div12);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let feePerTrade = 1000;
    	let selectedCurrencies = [];
    	let availableQuoteCurrencies = [];
    	let availableBaseCurrencies = [];
    	let paths = [];
    	let prices = {};
    	let pairings = {};
    	let activePairIds = [];
    	let ws;
    	let wsStatus = 0;
    	let sortingInterval;

    	onMount(() => {
    		getPairings().then(remotePairings => {
    			pairings = remotePairings;
    			$$invalidate(2, availableQuoteCurrencies = Object.keys(remotePairings));
    			$$invalidate(3, availableBaseCurrencies = [...new Set(Object.values(remotePairings).flat(1))].filter(base => !Object.keys(remotePairings).includes(base)));
    		});

    		initTicker();
    	});

    	function initTicker() {
    		ws = new WebSocket('wss://stream.binance.com/stream');

    		ws.onopen = () => {
    			$$invalidate(5, wsStatus = 2);
    			sortingInterval = setInterval(sortPaths, 1000);

    			if (activePairIds.length > 0) {
    				ws.send(subscribeAction(activePairIds));
    			}
    		};

    		ws.onmessage = stream => {
    			const data = JSON.parse(stream.data);

    			if (data === null || data === void 0 ? void 0 : data.data) {
    				const { s, a, b } = data.data;
    				prices[s] = { 'BUY': a, 'SELL': b };
    			}

    			addPercent();
    		};

    		ws.onclose = () => {
    			$$invalidate(5, wsStatus = 0);
    			clearInterval(sortingInterval);

    			setTimeout(
    				() => {
    					$$invalidate(5, wsStatus = 1);
    					initTicker();
    				},
    				1000
    			);
    		};
    	}

    	function handleWsSubsriptions(possiblePaths) {
    		const pairIds = [
    			...new Set(possiblePaths.flatMap(path => path.pairs.map(pair => pair.tickerName)))
    		];

    		pairIds.forEach(pairId => {
    			if (!activePairIds.includes(pairId)) {
    				ws.send(subscribeAction([pairId]));
    				activePairIds = [...activePairIds, pairId];
    			}
    		});

    		activePairIds.forEach(activePairId => {
    			if (!pairIds.includes(activePairId)) {
    				ws.send(unsubscribeAction([activePairId]));
    				activePairIds = activePairIds.filter(pairId => pairId !== activePairId);
    			}
    		});
    	}

    	function sortPaths() {
    		$$invalidate(4, paths = paths.sort((a, b) => b.percent - a.percent));
    	}

    	function addPercent(possiblePaths = paths) {
    		$$invalidate(4, paths = possiblePaths.map(addPercentChange(prices, feePerTrade)));
    	}

    	function fillPaths() {
    		const possiblePaths = generatePaths(selectedCurrencies).map(addPairs(pairings)).filter(path => path.pairs.every(Boolean));
    		handleWsSubsriptions(possiblePaths);
    		addPercent(possiblePaths);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_input_handler() {
    		feePerTrade = to_number(this.value);
    		$$invalidate(0, feePerTrade);
    	}

    	function input_change_handler() {
    		selectedCurrencies = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(1, selectedCurrencies);
    	}

    	function input_change_handler_1() {
    		selectedCurrencies = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(1, selectedCurrencies);
    	}

    	$$self.$capture_state = () => ({
    		addPairs,
    		addPercentChange,
    		generatePaths,
    		getPairings,
    		subscribeAction,
    		unsubscribeAction,
    		onMount,
    		feePerTrade,
    		selectedCurrencies,
    		availableQuoteCurrencies,
    		availableBaseCurrencies,
    		paths,
    		prices,
    		pairings,
    		activePairIds,
    		ws,
    		wsStatus,
    		sortingInterval,
    		initTicker,
    		handleWsSubsriptions,
    		sortPaths,
    		addPercent,
    		fillPaths
    	});

    	$$self.$inject_state = $$props => {
    		if ('feePerTrade' in $$props) $$invalidate(0, feePerTrade = $$props.feePerTrade);
    		if ('selectedCurrencies' in $$props) $$invalidate(1, selectedCurrencies = $$props.selectedCurrencies);
    		if ('availableQuoteCurrencies' in $$props) $$invalidate(2, availableQuoteCurrencies = $$props.availableQuoteCurrencies);
    		if ('availableBaseCurrencies' in $$props) $$invalidate(3, availableBaseCurrencies = $$props.availableBaseCurrencies);
    		if ('paths' in $$props) $$invalidate(4, paths = $$props.paths);
    		if ('prices' in $$props) prices = $$props.prices;
    		if ('pairings' in $$props) pairings = $$props.pairings;
    		if ('activePairIds' in $$props) activePairIds = $$props.activePairIds;
    		if ('ws' in $$props) ws = $$props.ws;
    		if ('wsStatus' in $$props) $$invalidate(5, wsStatus = $$props.wsStatus);
    		if ('sortingInterval' in $$props) sortingInterval = $$props.sortingInterval;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		feePerTrade,
    		selectedCurrencies,
    		availableQuoteCurrencies,
    		availableBaseCurrencies,
    		paths,
    		wsStatus,
    		addPercent,
    		fillPaths,
    		input_input_handler,
    		input_change_handler,
    		$$binding_groups,
    		input_change_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

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
