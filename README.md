## Assets CDN
可能是最好的网站加速器

**功能:**
- 正则表达式自定义规则
- 可以从你的网站加载规则
- 根据CNAME屏蔽一类网站
- 根据正则表达式屏蔽加载不了的网站
- 根据正则表达式重定向加载不了的网站
- 可以匹配规则优化网站的跨域限制
- 提供OSS镜像加速服务(github,gitlab,heroku)
- 当然也可以屏蔽广告
- 根据正则注入css或script
- 根据正则开启https

**Firefox安装:** https://addons.mozilla.org/firefox/addon/assets-cdn/

## 测试
```bash
git clone https://github.com/saowang/assets-cdn.git
sudo npm install -g web-ext

web-ext --help
```
**规则举例:**
```js
{
    "redirect": {
        "CNAME": [
            // 根据CNAME彻底屏蔽百度的广告
            [".*(yjs|yunjiasu)-cdn\\.(com|net)"]
        ],
        "google": [
            // 1个代表屏蔽，2个代表重定向
            ["^https?://(ajax\\.googleapis\\.com).*", "ajax.proxy.ustclug.org"],
            ["^https?://www\\.google-analytics\\.com"],
            ["^https?://adservice\\.google\\.com"],
            ["^https?://(www\\.google\\.com/recaptcha).*", "recaptcha.net/recaptcha"]
        ]
    },
    "optimize": {
        "headers": [
            // 参考 Match_patterns
            "*://*.gitlab.com/*",
            "*://*.github.com/*",
            "*://recaptcha.net/*"
        ],
        "document": [
            "*://*.github.com/*"
        ]
    }
}
```
**参考:**
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp
- https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
