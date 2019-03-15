let runtime = {
    status: true,
    assets: 0,
    rules: {},
    desktop: !navigator.userAgent.match(/mobile/i)
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

function tryUpdateRulesWith(rulesUrl, callback) {
    $.ajax({
        type: "GET",
        url: rulesUrl,
        cache: false,
        dataType: "json",
        success: function(rules) {
            browser.storage.local.set({
                rulesUrl: rulesUrl,
                updated: Date.now()
            });
            runtime.rules = rules;
            addListener();
            callback(true);
        },
        error: function() {
            callback(false);
        }
    });
}

function initialization(rulesUrl = defaultRulesUrl) {
    browser.storage.local.get(function(setting) {
        if ("rulesUrl" in setting) {
            rulesUrl = setting.rulesUrl;
        }
        if ("status" in setting) {
            runtime.status = setting.status;
        }
        if (runtime.status) {
            tryUpdateRulesWith(rulesUrl);
        } else {
            removeListener();
        }
    });
}

initialization();
browser.browserAction.onClicked.addListener(function() {
    browser.storage.local.set({
        status: !runtime.status
    });
    initialization();
});