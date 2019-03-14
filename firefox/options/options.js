let bg = browser.extension.getBackgroundPage();

function tr(rule, fast, note) {
    return `<tr><td><code>${rule}</code></td><td><code>${fast}</code></td><td><small>${note}</small></td></tr>`;
}

function prettify(db) {
    let m = parseInt((Date.now() - db.updated) / 6e4);
    let tbody = [];
    for (let option in db.rules) {
        if (option == "redirect") {
            for (let domain in db.rules.redirect) {
                for (let item of db.rules.redirect[domain]) {
                    if (item[1]) {
                        tbody.push(tr(new RegExp(item[0]), item[1], bg.i18n("redirect", domain)));
                    } else {
                        tbody.push(tr(new RegExp(item[0]), "", bg.i18n("cancel", domain)));
                    }
                }
            }
        } else {
            for (let type in db.rules[option]) {
                for (let item of db.rules[option][type]) {
                    tbody.push(tr(item, "", bg.i18n("close", type)));
                }
            }
        }
    }
    if (m < 2) {
        $("#updated").html(bg.i18n("last updated: just now"));
    } else {
        $("#updated").html(bg.i18n("last updated:", m));
    }
    $("input").val(db.rulesUrl);
    $("tbody").html(tbody.join(""));
}

$("*[i18n]").each(function() {
    $(this).text(bg.i18n(this.textContent))
});
$("title").text(function() {
    return bg.i18n("Assets CDN setting", browser.runtime.getManifest().version);
});

// 这里只是加载后显示
browser.storage.local.get(function(db) {
    prettify(db);
});

$("input").bind("input propertychange", function() {
    let value = $("input").val();
    if (value == "" || /https?:\/\/.+\.json$/.test(value)) {
        $("input").removeClass("text-warning");
    } else {
        $("input").addClass("text-warning");
    }
});
$("form").submit(function(e) {
    e.preventDefault();
    $("button").addClass("disabled");
    bg.getRules($("input").val(), function(status, info) {
        if (status) {
            browser.storage.local.get(function(db) {
                prettify(db);
                bg.init(db.status);
            });
        }
        alert(info);
        $("button").removeClass("disabled");
    });
});