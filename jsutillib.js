/**
   Copyright 2021 Carlos A. (https://github.com/dealfonso)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

(function(exports, document) {
    "use strict";
    if (exports.jsutils === undefined) {
        exports.jsutils = {};
    }
    Array.prototype._trim = function() {
        return this.filter(function(e) {
            return `${e}`.trim() !== "";
        });
    };
    Element.prototype._append = function(...args) {
        this.append(...args);
        return this;
    };
    function tag(tag, props = {}, text = null) {
        let parts_id = tag.split("#");
        let id = null;
        if (parts_id.length == 1) {
            tag = parts_id[0];
        } else {
            parts_id[1] = parts_id[1].split(".");
            id = parts_id[1][0];
            tag = [ parts_id[0], ...parts_id[1].slice(1) ].join(".");
        }
        let parts = tag.split(".");
        tag = parts[0];
        if (tag === "") {
            tag = "div";
        }
        if (typeof props === "string") {
            text = props;
            props = {};
        }
        if (text !== null) {
            props.textContent = text;
        }
        if (id !== null) {
            props.id = id;
        }
        props.className = [ props.className, ...parts.slice(1) ]._trim().join(" ").trim();
        let el = document.createElement(tag);
        for (let prop in props) {
            if (el[prop] !== undefined) {
                el[prop] = props[prop];
            } else {
                el.setAttribute(prop, props[prop]);
            }
        }
        return el;
    }
    function merge(o1, o2) {
        let result = {};
        for (let key in o1) {
            result[key] = o1[key];
            if (o2[key] !== undefined) {
                result[key] = o2[key];
            }
        }
        return result;
    }
    function processprops(target, objectfnc = v => v, clone = false) {
        if (typeof target === "object") {
            let result = target;
            if (clone) {
                result = {};
            }
            for (let prop in target) {
                if (target.hasOwnProperty(prop)) {
                    result[prop] = objectfnc(target[prop], prop, target);
                }
            }
            if (clone) {
                result.__proto__ = target.__proto__;
            }
            return result;
        } else {
            return target;
        }
    }
    function clone(target, objectfnc = x => clone(x)) {
        return processprops(target, objectfnc, true);
    }
    exports.jsutils.tag = tag;
    exports.jsutils.merge = merge;
    exports.jsutils.clone = clone;
    exports.jsutils.processprops = processprops;
})(window, document);

(function(exports, document) {
    "use strict";
    if (exports.jsutils === undefined) {
        exports.jsutils = {};
    }
    function grabbable(el, options = {}) {
        if (options === false) {
            this.each(function() {
                if (this._grabbable !== undefined) {
                    this._grabbable.deactivate();
                    delete this._grabbable;
                }
            });
            return el;
        }
        let defaults = {
            classdragging: "grabbing",
            callbackstart: function() {},
            callbackend: function() {},
            callbackmove: function(dx, dy) {}
        };
        function on_document_mousemove(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let grabbable = $el.get(0)._grabbable;
            let dx = e.clientX - grabbable.initial.x0 + $("body").scrollLeft();
            let dy = e.clientY - grabbable.initial.y0 + $("body").scrollTop();
            $el.offset({
                left: grabbable.initial.position.left + dx,
                top: grabbable.initial.position.top + dy
            });
            $el.get(0).dispatchEvent(new CustomEvent("grabbable-move", {
                detail: {
                    grabbed: $el
                }
            }));
            if (typeof grabbable.settings.callbackmove === "function") {
                grabbable.settings.callbackmove.bind($el)(dx, dy);
            }
        }
        function on_document_mouseup(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $el.get(0).dispatchEvent(new Event("object-dragged"));
            let grabbable = $el.get(0)._grabbable;
            $(document).off("mousemove", grabbable.handlers.document_mousemove);
            $(document).off("mouseup", grabbable.handlers.document_mouseup);
            if (grabbable.settings.classdragging !== null) $el.removeClass(grabbable.settings.classdragging);
            $el.get(0).dispatchEvent(new CustomEvent("grabbable-end", {
                detail: {
                    grabbed: $el
                }
            }));
            if (typeof grabbable.settings.callbackend === "function") {
                grabbable.settings.callbackend.bind($el)();
            }
        }
        function on_mousedown(e, $el) {
            if (e.which !== 1) {
                return;
            }
            e.preventDefault();
            e.stopImmediatePropagation();
            let grabbable = $el.get(0)._grabbable;
            if (grabbable.settings.classdragging !== null) $el.addClass(grabbable.settings.classdragging);
            grabbable.initial = {
                x0: e.clientX + $("body").scrollLeft(),
                y0: e.clientY + $("body").scrollTop(),
                position: $el.position(),
                parent: {
                    left: 0,
                    top: 0
                }
            };
            if ([ "absolute", "fixed" ].indexOf($el.css("position")) !== 1) {
                grabbable.initial.parent = $el.parent().offset();
            }
            $(document).on("mousemove", grabbable.handlers.document_mousemove);
            $(document).on("mouseup", grabbable.handlers.document_mouseup);
            $el.get(0).dispatchEvent(new CustomEvent("grabbable-start", {
                detail: {
                    grabbed: $el
                }
            }));
            if (typeof grabbable.settings.callbackstart === "function") {
                grabbable.settings.callbackstart.bind($el)();
            }
        }
        class Grabbable {
            constructor($el, settings) {
                this.settings = $.extend({}, defaults, settings);
                this.handlers = {
                    mousedown: function(e) {
                        on_mousedown(e, $el);
                    },
                    document_mousemove: function(e) {
                        on_document_mousemove(e, $el);
                    },
                    document_mouseup: function(e) {
                        on_document_mouseup(e, $el);
                    }
                };
                this.$el = $el;
            }
            activate() {
                this.$el.on("mousedown", this.handlers.mousedown);
            }
            deactivate() {
                this.$el.off("mousedown", this.handlers.mousedown);
                $("document").off("mousemove", this.handlers.document_mousemove);
                $("document").off("mouseup", this.handlers.document_mouseup);
            }
        }
        el.each(function() {
            let $this = $(this);
            if (this._grabbable !== undefined) {
                this._grabbable.deactivate();
                delete this._grabbable;
            }
            this._grabbable = new Grabbable($this, options);
            this._grabbable.activate();
        });
        return el;
    }
    exports.jsutils.grabbable = grabbable;
})(window, document);

(function(exports, document) {
    "use strict";
    if (exports.jsutils === undefined) {
        exports.jsutils = {};
    }
    function selectable(el, options = {}) {
        if (options === false) {
            this.each(function() {
                if (this._selectable !== undefined) {
                    this._selectable.deactivate();
                    delete this._selectable;
                }
            });
            return el;
        }
        let defaults = {
            creatediv: () => $('<div id="selection" class="selection"></div>'),
            callbackmove: function(dx, dy) {},
            callbackstart: (x, y) => true,
            callbackend: function(x, y, w, h) {},
            autoappend: true,
            minw: 20,
            minh: 20,
            defaultsize: {
                w: 100,
                h: 100
            }
        };
        function on_document_mousemove(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let selectable = $el.get(0)._selectable;
            let dx = e.clientX - selectable.initial.x0 + $("body").scrollLeft();
            let dy = e.clientY - selectable.initial.y0 + $("body").scrollTop();
            let x = selectable.initial.x0;
            let y = selectable.initial.y0;
            if (dx < 0) {
                dx = -dx;
                x = selectable.initial.x0 - dx;
            }
            if (dy < 0) {
                dy = -dy;
                y = selectable.initial.y0 - dy;
            }
            selectable.$selection.offset({
                left: x,
                top: y
            }).width(dx).height(dy);
            $el.get(0).dispatchEvent(new CustomEvent("selectable-move", {
                detail: {
                    selection: selectable.$selection
                }
            }));
            if (typeof selectable.settings.callbackmove === "function") {
                selectable.settings.callbackmove.bind($el)(dx, dy);
            }
        }
        function on_document_mouseup(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let selectable = $el.get(0)._selectable;
            $(document).off("mousemove", selectable.handlers.document_mousemove);
            $(document).off("mouseup", selectable.handlers.document_mouseup);
            let x0 = selectable.initial.x0;
            let y0 = selectable.initial.y0;
            let dx = e.clientX - x0 + $("body").scrollLeft();
            let dy = e.clientY - y0 + $("body").scrollTop();
            if (dx < 0) {
                dx = -dx;
                x0 = selectable.initial.x0 - dx;
            }
            if (dy < 0) {
                dy = -dy;
                y0 = selectable.initial.y0 - dy;
            }
            if (dx < selectable.settings.minw || dy < selectable.settings.minh) {
                if (selectable.settings.defaultsize !== undefined) {
                    if (selectable.settings.defaultsize.w !== undefined && selectable.settings.defaultsize.h !== undefined) {
                        dx = selectable.settings.defaultsize.w;
                        dy = selectable.settings.defaultsize.h;
                        if (selectable.settings.defaultsize.x !== undefined && selectable.settings.defaultsize.y !== undefined) {
                            x0 = selectable.settings.defaultsize.x;
                            y0 = selectable.settings.defaultsize.y;
                        } else {
                            x0 = x0 - dx / 2;
                            y0 = y0 - dy / 2;
                        }
                    }
                }
            }
            if (dx < selectable.settings.minw || dy < selectable.settings.minh) {
                selectable.$selection.remove();
                selectable.$seleccion = null;
                return;
            }
            selectable.$selection.offset({
                left: x0,
                top: y0
            }).width(dx).height(dy);
            $el.get(0).dispatchEvent(new CustomEvent("selectable-end", {
                detail: {
                    selection: selectable.$selection
                }
            }));
            if (typeof selectable.settings.callbackend === "function") {
                selectable.settings.callbackend.bind(selectable.$selection)(x0, y0, dx, dy);
            }
        }
        function on_mousedown(e, $el) {
            if (e.which !== 1) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            let selectable = $el.get(0)._selectable;
            selectable.initial.x0 = e.clientX + $("body").scrollLeft();
            selectable.initial.y0 = e.clientY + $("body").scrollTop();
            if (typeof selectable.settings.callbackstart === "function") {
                if (selectable.settings.callbackstart.bind($el)(selectable.initial.x0, selectable.initial.y0) === false) return;
            }
            let $selection = selectable.settings.creatediv();
            if (selectable.settings.autoappend) {
                $el.append($selection);
            }
            $selection.offset({
                left: selectable.initial.x0,
                top: selectable.initial.y0
            });
            selectable.$selection = $selection;
            $(document).on("mousemove", selectable.handlers.document_mousemove);
            $(document).on("mouseup", selectable.handlers.document_mouseup);
            $el.get(0).dispatchEvent(new CustomEvent("selectable-start", {
                detail: {
                    selection: selectable.$selection
                }
            }));
        }
        class Selectable {
            constructor($el, settings) {
                this.settings = $.extend({}, defaults, settings);
                this.handlers = {
                    mousedown: function(e) {
                        on_mousedown(e, $el);
                    },
                    document_mousemove: function(e) {
                        on_document_mousemove(e, $el);
                    },
                    document_mouseup: function(e) {
                        on_document_mouseup(e, $el);
                    }
                };
                this.initial = {
                    x0: 0,
                    y0: 0
                };
                this.$el = $el;
                this.$selection = null;
            }
            activate() {
                this.$el.on("mousedown", this.handlers.mousedown);
            }
            deactivate() {
                this.$el.off("mousedown", this.handlers.mousedown);
                $("document").off("mousemove", this.handlers.document_mousemove);
                $("document").off("mouseup", this.handlers.document_mouseup);
            }
        }
        el.each(function() {
            let $this = $(this);
            if (this._selectable !== undefined) {
                this._selectable.deactivate();
                delete this._selectable;
            }
            this._selectable = new Selectable($this, options);
            this._selectable.activate();
        });
        return el;
    }
    exports.jsutils.selectable = selectable;
})(window, document);

(function(exports, document) {
    "use strict";
    if (exports.jsutils === undefined) {
        exports.jsutils = {};
    }
    function sizable(el, options = {}) {
        if (options === false) {
            this.each(function() {
                if (this._sizable !== undefined) {
                    this._sizable.deactivate();
                    delete this._sizable;
                }
            });
            return this;
        }
        let defaults = {
            autoaddsizers: false,
            createsizers: function($el) {
                $el.append($('<div class="resizer-h resizer-left"></div>'));
                $el.append($('<div class="resizer-h resizer-right"></div>'));
                $el.append($('<div class="resizer-v resizer-top"></div>'));
                $el.append($('<div class="resizer-v resizer-bottom"></div>'));
                $el.append($('<div class="resizer-sq resizer-top-left"></div>'));
                $el.append($('<div class="resizer-sq resizer-bottom-left"></div>'));
                $el.append($('<div class="resizer-sq resizer-top-right"></div>'));
                $el.append($('<div class="resizer-sq resizer-bottom-right"></div>'));
            },
            classsizing: "sizing",
            callbackstart: function() {},
            callbackend: function() {},
            callbacksize: function(dx, dy) {}
        };
        function on_document_mousemove(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let sizable = $el.get(0)._sizable;
            let diffx = e.clientX - sizable.initial.x0 + $("body").scrollLeft();
            let diffy = e.clientY - sizable.initial.y0 + $("body").scrollTop();
            let position = sizable.initial.position;
            let parent = sizable.initial.parent;
            let offset = {
                top: position.top - parent.top + diffy * sizable.deltas.dy,
                left: position.left - parent.left + diffx * sizable.deltas.dx
            };
            sizable.$sized.offset(offset);
            let width = position.width + diffx * sizable.deltas.dw;
            if (width > 0) {
                sizable.$sized.width(width);
            }
            let height = position.height - diffy * sizable.deltas.dh;
            if (height > 0) {
                sizable.$sized.height(height);
            }
            sizable.$sized.get(0).dispatchEvent(new CustomEvent("sizable-size", {
                detail: {
                    sized: sizable.$sized
                }
            }));
            if (typeof sizable.settings.callbacksize === "function") {
                sizable.settings.callbacksize.bind(sizable.$sized)(diffx, diffy);
            }
        }
        function on_document_mouseup(e, $el) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let sizable = $el.get(0)._sizable;
            $(document).off("mousemove", sizable.handlers.document_mousemove);
            $(document).off("mouseup", sizable.handlers.document_mouseup);
            if (sizable.settings.classsizing !== null) $el.removeClass(sizable.settings.classsizing);
            sizable.$sized.get(0).dispatchEvent(new CustomEvent("sizable-end", {
                detail: {
                    sized: sizable.$sized
                }
            }));
            if (typeof sizable.settings.callbackend === "function") {
                sizable.settings.callbackend.bind(sizable.$sized)();
            }
        }
        function on_mousedown(e, $el) {
            if (e.which !== 1) {
                return;
            }
            e.preventDefault();
            e.stopImmediatePropagation();
            let sizable = $el.get(0)._sizable;
            if (sizable.settings.classsizing !== null) $el.addClass(sizable.settings.classsizing);
            sizable.initial.x0 = e.clientX + $("body").scrollLeft();
            sizable.initial.y0 = e.clientY + $("body").scrollTop();
            let position = sizable.$sized.offset();
            position.width = sizable.$sized.width();
            position.height = sizable.$sized.height();
            sizable.initial.position = position;
            if ([ "absolute", "fixed" ].indexOf($el.css("position")) !== 1) {
                let offset = sizable.$sized.parent().offset();
                position.left += offset.left;
                position.top += offset.top;
                sizable.initial.parent.left = offset.left;
                sizable.initial.parent.top = offset.top;
            }
            sizable.$sized.get(0).dispatchEvent(new CustomEvent("sizable-start", {
                detail: {
                    sized: sizable.$sized
                }
            }));
            if (typeof sizable.settings.callbackstart === "function") {
                sizable.settings.callbackstart.bind(sizable.$sized)();
            }
            $(document).on("mousemove", sizable.handlers.document_mousemove);
            $(document).on("mouseup", sizable.handlers.document_mouseup);
        }
        class Sizer {
            constructor($el, $sized, settings, dx, dy, dw, dh) {
                this.settings = $.extend({}, defaults, settings);
                this.handlers = {
                    mousedown: function(e) {
                        on_mousedown(e, $el);
                    },
                    document_mousemove: function(e) {
                        on_document_mousemove(e, $el);
                    },
                    document_mouseup: function(e) {
                        on_document_mouseup(e, $el);
                    }
                };
                this.initial = {
                    position: {
                        left: 0,
                        top: 0,
                        width: 0,
                        height: 0
                    },
                    parent: {
                        left: 0,
                        top: 0
                    },
                    x0: 0,
                    y0: 0
                };
                this.deltas = {
                    dx: dx,
                    dy: dy,
                    dw: dw,
                    dh: dh
                };
                this.$el = $el;
                this.$sized = $sized;
            }
            activate() {
                this.$el.on("mousedown", this.handlers.mousedown);
            }
            deactivate() {
                this.$el.off("mousedown", this.handlers.mousedown);
                $("document").off("mousemove", this.handlers.document_mousemove);
                $("document").off("mouseup", this.handlers.document_mouseup);
            }
        }
        class Sizable {
            constructor($el, settings) {
                this.settings = $.extend({}, defaults, settings);
                this.$el = $el;
                this.sizers = [];
            }
            activate() {
                let $this = this.$el;
                this.sizers.push(...$this.find(".resizer-left").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 1, 0, -1, 0);
                    return this._sizable;
                }), ...$this.find(".resizer-right").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 0, 0, 1, 0);
                    return this._sizable;
                }), ...$this.find(".resizer-top").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 0, 1, 0, 1);
                    return this._sizable;
                }), ...$this.find(".resizer-bottom").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 0, 0, 0, -1);
                    return this._sizable;
                }), ...$this.find(".resizer-top-left").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 1, 1, -1, 1);
                    return this._sizable;
                }), ...$this.find(".resizer-top-right").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 0, 1, 1, 1);
                    return this._sizable;
                }), ...$this.find(".resizer-bottom-left").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 1, 0, -1, -1);
                    return this._sizable;
                }), ...$this.find(".resizer-bottom-right").map(function() {
                    this._sizable = new Sizer($(this), $this, options, 0, 0, 1, -1);
                    return this._sizable;
                }));
                for (let sizer of this.sizers) {
                    sizer.activate();
                }
            }
            deactivate() {
                for (let sizer of this.sizers) {
                    sizer.deactivate();
                    delete sizer._sizable;
                }
            }
        }
        el.each(function() {
            if (this._sizable !== undefined) {
                this._sizable.deactivate();
                delete this._sizable;
            }
            let globaloptions = $.extend({}, defaults, options);
            if (globaloptions.autoaddsizers) {
                globaloptions.createsizers($(this));
            }
            this._sizable = new Sizable($(this), options);
            this._sizable.activate();
        });
    }
    exports.jsutils.sizable = sizable;
})(window, document);

(function(exports, document) {
    "use strict";
    if (exports.jsutils === undefined) {
        exports.jsutils = {};
    }
    function is_proxy(p) {
        return typeof p === "object" && p.is_proxy === true;
    }
    class ListenerController {
        static subscriptions = {};
        constructor(proxy, target, settings) {
            this.__proxy = proxy;
            this.__target = target;
            this.__settings = Object.assign({}, settings);
            this.__event_listeners = [];
            this.__parent = null;
        }
        __fire_events(name, value, suffix = "") {
            if (is_proxy(name)) {
                for (let prop in this.__target) {
                    if (this.__target[prop] === name) {
                        name = prop;
                        value = this.__proxy[prop];
                    }
                }
            }
            let e = new CustomEvent(this.__settings.eventtype, {
                detail: {
                    name: name,
                    value: value
                }
            });
            this.dispatchEvent(e);
            this.__settings.eventtarget.forEach(et => {
                et.dispatchEvent(e);
            });
            let varname = name;
            if (this.__parent !== null) {
                varname = this.__parent.listener.__fire_events(this.__proxy, undefined, `.${name}${suffix}`);
                varname = `${varname}.${name}`;
            }
            this.notify(varname, value, `${name}${suffix}`);
            return varname;
        }
        addEventListener(type, eventHandler) {
            var listener = {};
            listener.type = type;
            listener.eventHandler = eventHandler;
            this.__event_listeners.push(listener);
        }
        dispatchEvent(event) {
            if (event.cancelBubble) {
                return;
            }
            this.__event_listeners.forEach(listener => {
                if (listener.type === event.type) {
                    listener.eventHandler(event);
                }
            });
        }
        removeEventListener(type, eventHandler) {
            this.__event_listeners = this.__event_listeners.filter(listener => {
                return listener.type !== type || listener.eventHandler !== eventHandler;
            });
        }
        notify(varname, value, from) {
            for (let k in ListenerController.subscriptions) {
                let subscription = ListenerController.subscriptions[k];
                if (subscription.re.test(varname)) {
                    subscription.callbacks.forEach(sub => {
                        sub(varname, value, from);
                    });
                }
            }
        }
        listen(varnames, eventHandler) {
            if (!Array.isArray(varnames)) {
                varnames = [ varnames ];
            }
            varnames.forEach(function(varname) {
                if (ListenerController.subscriptions[varname] === undefined) {
                    let re = varname.replace(".", "\\.").replace("*", ".*").replace("?", "[^.]*");
                    re = `^${re}$`;
                    ListenerController.subscriptions[varname] = {
                        re: new RegExp(re),
                        callbacks: []
                    };
                }
                ListenerController.subscriptions[varname].callbacks.push(eventHandler);
            });
        }
        unlisten(varname, eventHandler) {
            if (ListenerController.subscriptions[varname] === undefined) {
                return;
            }
            ListenerController.subscriptions[varname].callbacks.filter(function(e) {
                return e !== eventHandler;
            });
        }
    }
    let VariableListener = (original, options = {}) => {
        let defaults = {
            listenonchildren: true,
            eventtarget: [ window ],
            eventtype: "update-variable",
            cloneobjects: false,
            convertproperties: true
        };
        let settings = jsutils.merge(defaults, options);
        if (!Array.isArray(settings.eventtarget)) {
            settings.eventtarget = [ settings.eventtarget ];
        }
        function convertobject(value, settings) {
            if (typeof value === "object") {
                let children = [];
                if (settings.convertproperties) {
                    let tranformfnc = x => x;
                    if (settings.cloneobjects) {
                        tranformfnc = jsutils.clone;
                    }
                    value = jsutils.processprops(value, function(x) {
                        let mychildren = [];
                        if (Array.isArray(x)) {
                            x = x.map(y => VariableListener(tranformfnc(y), settings));
                            x.forEach(y => mychildren.push(y.listener));
                        }
                        let clonedprop = convertobject(tranformfnc(x), settings);
                        if (clonedprop.is_proxy !== undefined) children.push(clonedprop.listener);
                        mychildren.forEach(child => {
                            child.__parent = clonedprop;
                        });
                        return clonedprop;
                    }, settings.cloneobjects);
                }
                value = VariableListener(value, settings);
                value.listener.__parent = proxy;
                children.forEach(child => {
                    child.__parent = value;
                });
            } else {}
            return value;
        }
        let listener = null;
        let proxy = new Proxy(original, {
            get(target, name, receiver) {
                if (listener === null) {
                    listener = new ListenerController(proxy, target, settings);
                }
                switch (name) {
                  case "is_proxy":
                    return true;

                  case "listener":
                    return listener;

                  case "value":
                    return function() {
                        return jsutils.clone(target, function(x) {
                            if (is_proxy(x)) {
                                return x.object();
                            }
                            return x;
                        });
                    };

                  case "object":
                    return function() {
                        return target;
                    };
                }
                if ([ "listen", "unlisten", "addEventListener", "removeEventListener", "dispatchEvent" ].includes(name)) {
                    return listener[name].bind(listener);
                }
                let rv = Reflect.get(target, name, receiver);
                return rv;
            },
            set(target, name, value, receiver) {
                if (listener === null) {
                    listener = new ListenerController(proxy, target, settings);
                }
                let reserved = [ "value", "listener", "is_proxy", "listen", "unlisten", "addEventListener", "removeEventListener", "dispatchEvent" ].includes(name);
                if (reserved) {
                    throw new Exception("invalid keyword");
                }
                if (settings.listenonchildren) {
                    value = convertobject(value, settings);
                }
                let retval = Reflect.set(target, name, value, receiver);
                listener.__fire_events(name, value);
                return retval;
            }
        });
        return proxy;
    };
    exports._GLOBALS = VariableListener({});
    exports.jsutils.VariableListener = VariableListener;
})(window, document);

(function($) {
    "use strict";
    if ($.fn.jsutils === undefined) {
        $.fn.jsutils = {};
    }
    $.fn.jsutils.getVersion = function() {
        return "1.0.0-beta";
    };
})(jQuery);