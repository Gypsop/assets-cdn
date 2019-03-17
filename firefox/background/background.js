let runtime = {
    status: true,
    assets: 0,
    rules: {},
    desktop: !navigator.userAgent.match(/(android|mobile)/i)
};
const defaultRulesUrl = "https://raw.githubusercontent.com/saowang/assets-cdn/master/rules.json";

function getVariable() {
    return {
        rules: runtime.rules,
        defaultRulesUrl: defaultRulesUrl
    };
}

function autoAddBadgeText() {
    if (runtime.desktop) {
        browser.browserAction.setBadgeText({
            text: (++runtime.assets).toString()
        });
    }
}

async function redirect(details) {
    let resolved = await browser.dns.resolve(details.url.match(/^https?:\/\/([^/]+)\/?/)[1], ["canonical_name"]);
    let result = {};
    for (let item in runtime.rules.redirect) {
        for (let rule of runtime.rules.redirect[item]) {
            let match = details.url.match(new RegExp(rule[0]));
            if (rule.length == 1) {
                if (item == "CNAME" && "canonicalName" in resolved) {
                    if (resolved.canonicalName.match(rule[0])) {
                        autoAddBadgeText();
                        result.cancel = true;
                    }
                } else if (match) {
                    autoAddBadgeText();
                    result.cancel = true;
                }
            } else {
                if (match) {
                    autoAddBadgeText();
                    result.redirectUrl = details.url.replace(match[1], rule[1]);
                }
            }
        }
    }
    return result;
};

function optimizeDocument(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
    autoAddBadgeText();
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
}

function optimizeHeaders(details) {
    autoAddBadgeText();
    for (let i = 0; i < details.responseHeaders.length; i++) {
        if (details.responseHeaders[i].name.match(/(content-security-policy|referrer-policy)/i)) {
            details.responseHeaders.splice(i, 1);
        }
    }
    return {
        responseHeaders: details.responseHeaders
    };
}

function addListener() {
    if (runtime.desktop) {
        browser.browserAction.getBadgeText({}).then(function(text) {
            runtime.assets = text == "" ? 0 : parseInt(text);
        });
        browser.browserAction.setIcon({
            path: "icons/gitlab.svg"
        });
        browser.browserAction.setBadgeBackgroundColor({
            color: "green"
        });
    }
    if ("redirect" in runtime.rules) {
        browser.webRequest.onBeforeRequest.addListener(redirect, {
            urls: ["*://*/*"]
        }, ["blocking"]);
    }
    if ("optimize" in runtime.rules) {
        if ("document" in runtime.rules.optimize) {
            browser.webRequest.onBeforeRequest.addListener(optimizeDocument, {
                types: ["main_frame", "sub_frame"],
                urls: runtime.rules.optimize.document
            }, ["blocking"]);
        }
        if ("headers" in runtime.rules.optimize) {
            browser.webRequest.onHeadersReceived.addListener(optimizeHeaders, {
                types: ["main_frame", "sub_frame"],
                urls: runtime.rules.optimize.headers
            }, ["blocking", "responseHeaders"]);
        }
    }
}

function removeListener() {
    if (runtime.desktop) {
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
    if ("redirect" in runtime.rules) {
        browser.webRequest.onBeforeRequest.removeListener(redirect);
    }
    if ("optimize" in runtime.rules) {
        if ("document" in runtime.rules.optimize) {
            browser.webRequest.onBeforeRequest.removeListener(optimizeDocument);
        }
        if ("headers" in runtime.rules.optimize) {
            browser.webRequest.onHeadersReceived.removeListener(optimizeHeaders);
        }
    }
}

function tryInitializationWith(rulesUrl, callback) {
    $.ajax({
        type: "GET",
        url: rulesUrl,
        cache: false,
        dataType: "json",
        success: function(rules) {
            browser.storage.local.get(function(settings) {
                runtime.rules = rules;
                browser.storage.local.set({
                    rulesUrl: rulesUrl,
                    updated: Date.now()
                });
                if ("status" in settings) {
                    runtime.status = settings.status;
                }
                if (runtime.status) {
                    addListener();
                    callback(true, "规则更新成功~");
                } else {
                    removeListener();
                    callback(true, "规则更新成功~ 但是未开启插件!");
                }
            });
        },
        error: function(e) {
            callback(false, "规则更新失败!");
        }
    });
}

tryInitializationWith(defaultRulesUrl);
browser.browserAction.onClicked.addListener(function() {
    browser.storage.local.set({
        status: !runtime.status
    });
    browser.storage.local.get(function(settings) {
        tryInitializationWith(settings.rulesUrl);
    });
});