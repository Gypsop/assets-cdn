## Assets CDN
Custom rules cancel or redirect CDN or cancel CNAME, rules default acceleration: Gitlab,GitHub etc

**功能:**
- 点击扩展图标关闭或打开
- 支持从网址加载自定义规则
- 规则自动更新(每1小时)
- 支持关闭默认的CSP限制
- 目前支持`utf-8`的网页关闭限制
- 屏蔽CNAME

**Firefox安装:** https://addons.mozilla.org/firefox/addon/assets-cdn/

## 开发
```bash
git clone https://github.com/saowang/assets-cdn.git
sudo npm install -g web-ext

web-ext --help
```
**规则说明:**
```js
{
    // 重定向网址
    "redirect": {
        // 名称代表注释
        "hao123": [
            // Array长度为1, 表示正则匹配该网址后, 屏蔽该网址
            ["https?://www.hao123.com"],
            // Array长度为2, 表示正则匹配该网址后, 用Array[1]正则替换Array[0]第一个括号的内容
            ["https?://(www.hao(\\d{3}).com)", "www.$1.com"]
        ],
        // 这个名称不能变, 表示屏蔽cname
        "CNAME": [
            [".*(yjs|yunjiasu)-cdn\\.(com|net)"]
        ]
    },
    // 关闭content-security-policy、referrer-policy
    "header": [
        // 参考: Match_patterns
        "*://*/*"
    ],
    // 关闭crossorigin、http-equiv、integrity
    "document": [
        // 参考: Match_patterns
        "*://*/*"
    ]
}
```
**参考:**
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp
- https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
