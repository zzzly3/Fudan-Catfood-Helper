// Fudan Cat Food Helper
// Author: zzzly3
// Date: May 18, 2022

const remove = () =>
document.querySelector("#root > div > div.src-newform-mobile-pages-form-write-index__formContentWrap > div > div.src-newform-common-form-write-common-OutPeriodModal-m_index__out-period")
.hidden = true;

let test_time = -1;

const start_time = () => {
    if (test_time > 0)
        return test_time;
    const t = new Date();
    t.setHours(13);
    t.setMinutes(0);
    t.setSeconds(0);
    t.setMilliseconds(0);
    return t.getTime();
}

const cat_start_time = -10000;
const roll_start_time = -1800;
const roll_stop_time = 0;
let hook_submit_time = [];

const adjust = i => {
    hook_submit_time = [-2500, -2400, -2300, -2200, -2100, -2000, -1900, -1800, -1700, -1600, 
                        -1400, -1200, -1000, -800, -600, -300, 0];
    if (i <= 0 || i >= hook_submit_time.length)
        return;
    for (let j = hook_submit_time[i - 1] - 60; j <= hook_submit_time[i] + 60; j += 20)
        if (hook_submit_time.indexOf(j) === -1)
            hook_submit_time.push(j);
    hook_submit_time.sort((x, y) => x - y);
    console.log('Cat: submit time has been adjusted to %s', hook_submit_time.toString());
}
adjust(0);

const timer = (func, arg) => {
    const a = (new Date()).getTime();
    const r = func(arg);
    console.log("timer: %dms", (new Date()).getTime() - a);
    return r;
}

const trigger = (at, func) => {
    const st = start_time();
    let t = (new Date()).getTime() - st;
    if (t - at < -20)
        setTimeout(() => trigger(at, func), 1);
    else {
        while (1) {
            t = (new Date()).getTime() - st;
            if (t >= at)
                break;
        }
        console.log("trigger: %dms", t);
        func();
    }
}

const prepare = () => {
    let t = document.evaluate('//div[span="提交" and span="保存草稿"]/span[text()="提交"]', document).iterateNext();
    if (!t)
        return false;
    t.click();
    t = document.evaluate('//div[span="确定" and span="取消"]/span[text()="确定"]', document).iterateNext();
    if (!t)
        t = document.evaluate('//div[a="确定" and a="取消"]/a[text()="确定"]', document).iterateNext(); // for mobile
    if (!t)
        return null;
    return t;
}

const submit = btn => {
    btn.click();
}

const method_roll = () => {
    const t = (new Date()).getTime() - start_time();
    const r = prepare();
    if (r === false || t > roll_stop_time)
        return;
    if (r && t >= roll_start_time) {
        console.log('Cat: try at %dms.', t);
        submit(r);
    }
    setTimeout(method_roll, 1);
}

const method_hook = () => {
    const xhr = XMLHttpRequest;
    const req = [];
    let do_reduce = false;
    const do_req = () => {
        req.shift().f();
        if (req.length > 0)
            trigger(req[0].t, do_req);
        else
            console.log('Cat: done');
    };
    const make_req = cnt => {
        const r = prepare();
        if (r === false)
            return;
        if (r) {
            cnt--;
            submit(r);
        }
        if (cnt)
            setTimeout(() => make_req(cnt), 1);
    };
    window.XMLHttpRequest = function() {
        this._xhr = new xhr();
        const ok = {code: 0, result: '', data: ''};
        Object.defineProperty(this, "response", {get: () => this._fake ? ok : this._xhr.response});
        Object.defineProperty(this, "responseText", {get: () => this._fake ? JSON.stringify(ok) : this._xhr.responseText});
        Object.defineProperty(this, "readyState", {get: () => this._fake ? 4 : this._xhr.readyState});
        Object.defineProperty(this, "status", {get: () => this._fake ? 200 : this._xhr.status});
        Object.defineProperty(this, "statusText", {get: () => this._fake ? "OK" : this._xhr.statusText});
        Object.defineProperty(this, "onreadystatechange", {get: () => this._cb, set: e => this._cb = e});
        Object.defineProperty(this, "withCredentials", {get: () => this._xhr.withCredentials, set: e => this._xhr.withCredentials = e});
        this._xhr.onreadystatechange = () => {
            if (this._catch && this._xhr.readyState == 4 && this._xhr.status == 200) {
                console.log("Req %d: %s", this._rid, JSON.stringify(this._xhr.response));
            }
            if (this._cb && !this._fake) {
                this._cb();
            }
        };
        this.setRequestHeader = (h, v) => this._xhr.setRequestHeader(h, v);
        this.getAllResponseHeaders = () => this._xhr.getAllResponseHeaders();
        this.getResponseHeader = e => this._xhr.getResponseHeader(e);
        this.open = (t, n) => {
            this._url = n;
            this._fake = n.indexOf && (n.indexOf('/check') > -1 || 
                (!(do_reduce && test_time === -1) && n.indexOf('/reduce') > -1)); // dont submit reduce when testing
            this._catch = n.indexOf && n.indexOf('/commit_aggregation') > -1;
            return this._xhr.open(t, n);
        };
        this.send = n => {
            // console.log(this._xhr);
            if (this._fake) {
                setTimeout(this._cb, 0);
            } else if (this._catch) {
                if (do_reduce) { // all prepared
                    console.log('Cat: reduce the stock at %dms', (new Date().getTime() - start_time()));
                    console.log('Cat: preparations done, wait for the expected time');
                    window.XMLHttpRequest = xhr;
                    this._rid = -1;
                    this._xhr.send(n);
                } else {
                    req.push({t: hook_submit_time[req.length], f: () => this._xhr.send(n)});
                    this._rid = req.length;
                    console.log('Cat: req %d prepared at %dms', this._rid, (new Date().getTime() - start_time()));
                    if (req.length >= hook_submit_time.length) {
                        do_reduce = true;
                        make_req(1);
                        trigger(req[0].t, do_req);
                    }
                }
                
            } else
                return this._xhr.send(n);
        };
        return this;
    };
    make_req(hook_submit_time.length);
}

const start_secondary = func => {
    const t = (new Date()).getTime() - start_time();
    if (t < cat_start_time) {
        setTimeout(() => start_secondary(func), 200);
        return;
    }
    console.log('Cat: start at %dms', t);
    func();
}

const start = (method="hook", test=false) => {
    test_time = -1;
    if (test) {
        console.log("Cat: in test mode");
        test_time = (Math.round((new Date()).getTime() / 1000) + 10) * 1000;
    }
    const methods = [
        {name: "roll", func: method_roll},
        {name: "hook", func: method_hook}
    ];
    const m = methods.find(e => e.name == method);
    if (!m)
        console.log('Cat: unknown method %s', method);
    else {
        console.log('Cat: will try method *%s* at %s', m.name, new Date(start_time()).toLocaleString());
        start_secondary(m.func);
    }
}

const test = () => start('hook', true);

// if (typeof $$ !== 'undefined') // console
//     test();