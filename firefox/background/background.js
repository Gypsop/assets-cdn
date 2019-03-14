let global = {
    status: true,
    assets: 0,
    //rulesUrl: "https://raw.githubusercontent.com/saowang/assets-cdn/master/rules.json",
    rulesUrl: "http://localhost/rules.json",
    rules: {},
    desktop: !navigator.userAgent.match(/mobile/i)
};

let storage = {
    get: function(callback) {
        browser.storage.local.get(callback);
    },
    set: function(object) {
        browser.storage.local.set(object);
    }
};

function autoAdd() {
    if (global.desktop) {
        browser.browserAction.setBadgeText({
            text: (++global.assets).toString()
        });
    }
}


function getReplaceRegExp(string) {
    let match = string.match(/\(((?!\?:)([^()]*\([^()]*\)[^()]*)*[^)]*)\)/);
    if (match) {
        string = match[1];
    }
    return new RegExp(string);
}


async function redirect(details) {
    let resolved = await browser.dns.resolve(details.url.match(/^https?:\/\/([^/]+)\/?/)[1], ["canonical_name"]);
    let result = {};
    for (let item in global.rules.redirect) {
        for (let rule of global.rules.redirect[item]) {
            let match = details.url.match(new RegExp(rule[0]));
            if (rule.length == 1) {
                if (item == "CNAME" && "canonicalName" in resolved) {
                    if (resolved.canonicalName.match(rule[0])) {
                        autoAdd();
                        result.cancel = true;
                    }
                } else if (match) {
                    result.cancel = true;
                }
            } else {
                if (match) {
                    autoAdd();
                    result.redirectUrl = details.url.replace(match[1], match[1].replace(getReplaceRegExp(rule[0]), rule[1]));
                }
            }
        }
    }
    return result;
};

let optimize = {
    document: function(details) {
        let filter = browser.webRequest.filterResponseData(details.requestId);
        let decoder = new TextDecoder("utf-8");
        let encoder = new TextEncoder();
        autoAdd();
        filter.ondata = event => {
            let str = decoder.decode(event.data, {
                stream: true
            });
            str = str.replace(/(crossorigin|http-equiv|integrity)="[^"]+"/igm, "");
            filter.write(encoder.encode(str));
        };
        filter.onstop = event => {
            filter.disconnect();
        };
    },
    headers: function(details) {
        autoAdd();
        for (let i = 0; i < details.responseHeaders.length; i++) {
            if (details.responseHeaders[i].name.match(/(content-security-policy|referrer-policy)/i)) {
                details.responseHeaders.splice(i, 1);
            }
        }
        return {
            responseHeaders: details.responseHeaders
        };
    }
};

function addListener() {
    if (global.desktop) {
        browser.browserAction.getBadgeText({}).then(function(text) {
            global.assets = text == "" ? 0 : parseInt(text);
        });
        browser.browserAction.setIcon({
            path: "icons/gitlab.svg"
        });
        browser.browserAction.setBadgeBackgroundColor({
            color: "green"
        });
    }
    if ("redirect" in global.rules) {
        browser.webRequest.onBeforeRequest.addListener(redirect, {
            urls: ["*://*/*"]
        }, ["blocking"]);
    }
    if ("optimize" in global.rules) {
        if ("document" in global.rules.optimize) {
            browser.webRequest.onBeforeRequest.addListener(optimize.document, {
                types: ["main_frame", "sub_frame"],
                urls: global.rules.optimize.document
            }, ["blocking"]);
        }
        if ("headers" in global.rules.optimize) {
            browser.webRequest.onHeadersReceived.addListener(optimize.headers, {
                types: ["main_frame", "sub_frame"],
                urls: global.rules.optimize.headers
            }, ["blocking", "responseHeaders"]);
        }
    }
}

function removeListener() {
    if (global.desktop) {
        browser.browserAction.setBadgeText({
            text: ""
        });
        browser.browserAction.setTitle({
            title: "Assets CDN"
        });
        browser.browserAction.setIcon({
            path: "icons/gitlab-gray.svg"
        });
    }
    if ("redirect" in global.rules) {
        browser.webRequest.onBeforeRequest.removeListener(redirect);
    }
    if ("optimize" in global.rules) {
        if ("document" in global.rules.redirect) {
            browser.webRequest.onBeforeRequest.removeListener(optimize.document);
        }
        if ("headers" in global.rules.redirect) {
            browser.webRequest.onHeadersReceived.removeListener(optimize.headers);
        }
    }
}

function auto_add() {
    if (global.desktop) {
        browser.browserAction.setBadgeText({
            text: (++global.assets).toString()
        });
    }
}

storage.get(function(setting) {
    if ("rulesUrl" in setting) {
        global.rulesUrl = setting.rulesUrl;
    }
    if ("status" in setting) {
        global.status = setting.status;
    }

    if (global.status) {
        $.ajax({
            type: "GET",
            url: global.rulesUrl,
            cache: false,
            dataType: "json",
            success: function(rules) {
                storage.set({
                    updated: Date.now()
                });
                global.rules = rules;
                addListener();
            },
            error: function(e) {
                console.log(e);
            }
        });
    } else {
        removeListener();
    }
});
browser.browserAction.onClicked.addListener(function() {
    init_rules(() => init(!global.status));
});