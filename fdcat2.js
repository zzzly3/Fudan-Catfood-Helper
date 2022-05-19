// Fudan Cat Food Helper
// Author: zzzly3
// Version: 2.0
// Date: May 19, 2022
// Usage:
// 1. call remove() to hide the cover
// 2. call test() to test the latency
// 3. call adjust(i) to adjust the submit time points,
//    where i is the last rid of requests whose server time is less than expected
// 4. call start() to start the work

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

const cat_start_time = -7000;
let submit_start = -2400;
let submit_interval = 200;
let submit_count = 25;
const adjust = i => {
    const a = [];
    if (i <= 0 || i >= submit_count) {
        console.error('Cat: adjust out of range');
        return;
    }
    if (submit_interval < 100) {
        console.error('Cat: can only adjust once');
        return;
    }
    submit_start = submit_start + (i - 1) * submit_interval - 200;
    submit_interval = 15;
    submit_count = 40;
    console.info('Cat: submit time has been adjusted to %d-%d', submit_start, submit_start + (submit_count - 1) * submit_interval);
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

const make_req = cnt => {
    let t = document.evaluate('//div[span="提交" and span="保存草稿"]/span[text()="提交"]', document).iterateNext();
    if (!t)
        return;
    t.click();
    t = document.evaluate('//div[span="确定" and span="取消"]/span[text()="确定"]', document).iterateNext();
    if (!t)
        t = document.evaluate('//div[a="确定" and a="取消"]/a[text()="确定"]', document).iterateNext(); // for mobile
    if (t) {
        cnt--;
        t.click();
    }
    if (cnt)
        setTimeout(() => make_req(cnt), 1);
}

const start_req = (i, r) => {
    const st = start_time();
    let nt = submit_start;
    let okresp = null;
    let finish = 0;
    while (i <= submit_count) {
        let t = (new Date()).getTime() - st;
        if (t >= nt) {
            console.log('Cat: submit at %dms', t);
            const xhr = new XMLHttpRequest(), i2 = i;
            xhr.open("post", r._url + "&r=" + i);
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    try {
                        if (xhr.response.code === 0) {
                            console.info('Req %d: **SUCCESS!**', i2);
                            okresp = xhr.response;
                        } else {
                            console.log('Req %d: %s', i2, xhr.response.result);
                        }
                    } catch {
                        console.log('Req %d: %s', i2, JSON.stringify(xhr.response));
                    }
                    if (++finish == submit_count) {
                        r._fake = okresp ? okresp : xhr.response;
                        r._cb();
                    }
                }
            };
            xhr.withCredentials = true;
            xhr.send(r._data);
            i++, nt += submit_interval;
        }
    }
    console.info('Cat: done');
}

const catch_req = () => {
    const xhr = XMLHttpRequest;
    let do_reduce = test_time === -1;
    window.XMLHttpRequest = function() {
        this._xhr = new xhr();
        const ok = {code: 0, result: '', data: ''};
        Object.defineProperty(this, "response", {get: () => this._fake ? this._fake : this._xhr.response});
        Object.defineProperty(this, "responseText", {get: () => this._fake ? JSON.stringify(this._fake) : this._xhr.responseText});
        Object.defineProperty(this, "readyState", {get: () => this._fake ? 4 : this._xhr.readyState});
        Object.defineProperty(this, "status", {get: () => this._fake ? 200 : this._xhr.status});
        Object.defineProperty(this, "statusText", {get: () => this._fake ? "OK" : this._xhr.statusText});
        Object.defineProperty(this, "onreadystatechange", {get: () => this._cb, set: e => this._cb = e});
        Object.defineProperty(this, "withCredentials", {get: () => this._xhr.withCredentials, set: e => this._xhr.withCredentials = e});
        this._xhr.onreadystatechange = () => {
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
                (!do_reduce && n.indexOf('/reduce') > -1)) // dont submit reduce when testing
                ? ok : false; 
            this._catch = n.indexOf && n.indexOf('/commit_aggregation') > -1;
            return this._xhr.open(t, n);
        };
        this.send = n => {
            // console.log(this);
            this._data = n;
            if (this._fake) {
                setTimeout(this._cb, 0);
            } else {
                if (this._catch) {
                    if (do_reduce)
                        console.info('Cat: reduce the stock at %dms', (new Date().getTime() - start_time()));
                    console.info('Cat: caught request at %dms', (new Date().getTime() - start_time()));
                    window.XMLHttpRequest = xhr;
                    trigger(submit_start, () => start_req(1, this));
                } else
                    return this._xhr.send(n);
            }
        };
        return this;
    };
    make_req(1);
}

const start_secondary = func => {
    const t = (new Date()).getTime() - start_time();
    if (t < cat_start_time) {
        setTimeout(() => start_secondary(func), 200);
        return;
    }
    console.info('Cat: start at %dms', t);
    func();
}

const start = (test=false) => {
    test_time = -1;
    if (test) {
        console.info("Cat: in test mode");
        test_time = (Math.round((new Date()).getTime() / 1000) + 10) * 1000;
    }
    console.info('Cat: expect to run at %s', new Date(start_time()).toLocaleString());
    start_secondary(catch_req);
}

const test = () => start(true);