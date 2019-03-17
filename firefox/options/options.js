let bg = browser.extension.getBackgroundPage();

function prettify() {
    browser.storage.local.get(function(setting) {
        let minute = parseInt((Date.now() - setting.updated) / 6e4);
        let tbody = [];
        let tr = function(rule, fast, note) {
            return `<tr><td><code>${rule}</code></td><td><code>${fast}</code></td><td><small>${note}</small></td></tr>`;
        }
        let variable = bg.getVariable();
        for (let option in variable.rules) {
            if (option == "redirect") {
                for (let remarks in variable.rules.redirect) {
                    for (let rule of variable.rules.redirect[remarks]) {
                        if (rule.length == 1) {
                            tbody.push(tr(new RegExp(rule[0]), "", `屏蔽${remarks}`));
                        } else {
                            tbody.push(tr(new RegExp(rule[0]), rule[1], `重定向${remarks}`));
                        }
                    }
                }
            } else if (option == "injection") {
                for (let remarks in variable.rules.injection) {
                    for (let rule of variable.rules.injection[remarks]) {
                        tbody.push(tr(rule[0], rule[1], `注入${remarks}`));
                    }
                }
            } else if (option == "optimize") {
                for (let remarks in variable.rules.optimize) {
                    for (let rule of variable.rules.optimize[remarks]) {
                        tbody.push(tr(rule, "", `优化${remarks}`));
                    }
                }
            }
        }
        if (minute < 1) {
            $("#updated").html("上次更新: 刚刚");
        } else {
            $("#updated").html(`上次更新: ${minute}分钟前`);
        }
        $("input").attr("placeholder", variable.defaultRulesUrl).val(setting.rulesUrl).removeClass("text-warning");
        $("tbody").html(tbody.join(""));
    });
}

prettify();
$("input").bind("input propertychange", function() {
    if (/https?:\/\/.+\.json$/.test($(this).val())) {
        $("input").removeClass("text-warning");
    } else {
        $("input").addClass("text-warning");
    }
});
$("form").submit(function(e) {
    e.preventDefault();
    $("button").addClass("disabled");
    let rulesUrl = $("input").val();
    if (rulesUrl.length == 0) {
        rulesUrl = $("input").attr("placeholder");
    }
    bg.tryInitializationWith(rulesUrl, function(status, message) {
        if (status) {
            prettify();
        }
        alert(message);
        $("button").removeClass("disabled");
    });
});
$("title").text(function() {
    return `${$(this).text()} v${browser.runtime.getManifest().version}`;
});