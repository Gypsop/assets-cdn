let global = {
    status: true,
    assets: 0,
    rules_url: "https://github.com/saowang/assets-cdn/raw/master/rules.json",
    rules: {},
    desktop: !navigator.userAgent.match(/mobile/i)
};

function get_replace_pattern(string) {
    let match = string.match(/\(((?!\?:)([^()]*\([^()]*\)[^()]*)*[^)]*)\)/);
    if (match) {
        string = match[1];
    }
    return new RegExp(string);
}

// intl.locale.requested
function i18n(message, substitutions) {
    return browser.i18n.getMessage(message, substitutions);
}

// callback返回rules的状态
function get_rules(rules_url, callback) {
    rules_url = /https?:\/\/.+\.json$/.test(rules_url) ? rules_url : global.rules_url;
    $.ajax({
        type: "GET",
        url: rules_url,
        cache: false,
        dataType: "json",
        success: function(result) {
            // 初始化数据库
            browser.storage.local.set({
                updated: Date.now(),
                rules_url: rules_url,
                rules: JSON.stringify(result)
            });
            global.rules = result;
            callback(true, `${i18n("update succeed")}\n${rules_url}`);
        },
        error: function(e) {
            callback(false, `${i18n("update failed")}[${e.status}]\n${rules_url}`);
        }
    });
}

function init_rules(callback) {
    browser.storage.local.get(function(db) {
        let m = (Date.now() - db.updated) / 6e4;
        if (m > 60 || !db.rules) {
            // 过期
            get_rules(db.rules_url, function(status, info) {
                if (status) {
                    callback();
                }
            });
        } else {
            global.rules = JSON.parse(db.rules);
            callback();
        }
    });
}

function get_host(url) {
    return url.match(/^https?:\/\/([^/]+)\/?/)[1];
}

function auto_add() {
    if (global.desktop) {
        browser.browserAction.setBadgeText({
            text: (++global.assets).toString()
        });
    }
}

async function redirect(details) {
    let resolved = await browser.dns.resolve(get_host(details.url), ["canonical_name"]);
    let result = {};
    for (let i in global.rules.redirect) {
        for (let j of global.rules.redirect[i]) {
            let match = details.url.match(new RegExp(j[0]));
            if (i == "CNAME" && "canonicalName" in resolved) {
                if (resolved.canonicalName.match(j[0])) {
                    auto_add();
                    result.cancel = true;
                }
            } else if (match) {
                if (j.length == 1) {
                    result.cancel = true;
                } else {
                    result.redirectUrl = details.url.replace(match[1], match[1].replace(get_replace_pattern(j[0]), j[1]));
                }
                auto_add();
            }
        }
    }
    return result;
}

//暂时只能处理utf8的页面
function close_document_policy(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
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

function close_header_policy(details) {
    for (let i = 0; i < details.responseHeaders.length; i++) {
        if (details.responseHeaders[i].name.match(/(content-security-policy|referrer-policy)/i)) {
            details.responseHeaders.splice(i, 1);
        }
    }
    return {
        responseHeaders: details.responseHeaders
    };
}

function init(status) {
    global.status = status;
    browser.storage.local.set({
        status: status
    });
    if (status) {
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
        if ("close" in global.rules) {
            if ("document" in global.rules.close) {
                browser.webRequest.onBeforeRequest.addListener(close_document_policy, {
                    types: ["main_frame", "sub_frame"],
                    urls: global.rules.close.document
                }, ["blocking"]);
            }
            if ("header" in global.rules.close) {
                browser.webRequest.onHeadersReceived.addListener(close_header_policy, {
                    types: ["main_frame", "sub_frame"],
                    urls: global.rules.close.header
                }, ["blocking", "responseHeaders"]);
            }
        }
    } else {
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
        if ("close" in global.rules) {
            if ("document" in global.rules.close) {
                browser.webRequest.onBeforeRequest.removeListener(close_document_policy);
            }
            if ("header" in global.rules.close) {
                browser.webRequest.onHeadersReceived.removeListener(close_header_policy);
            }
        }
    }
}

browser.storage.local.get(function(db) {
    init_rules(() => init(db.status ? db.status : global.status));
});
browser.browserAction.onClicked.addListener(function() {
    init_rules(() => init(!global.status));
});