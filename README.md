# ONTI｜股市人格测绘

16+2 测试方案：
- 16 道基础题
- 命中模糊条件时自动补 2 题
- 9 个主类型
- 3 个隐藏彩蛋类型
- 首页和结果页继续保留 Ontter 宣传跳转

## 目录
- `site/`：直接可部署的网站文件
- `site/data/questions.json`：16 道基础题 + 6 道补题
- `site/data/results.json`：9 个主类型 + 3 个隐藏彩蛋类型文案

## 部署方式
这是纯静态 H5，不需要 Docker，不需要数据库。
直接上传到：
- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- 宝塔静态目录
- 普通 Nginx/Apache 静态目录

## 本地预览
因为页面通过 `fetch()` 读取 JSON，不要直接双击 `index.html`。
在 `site` 目录执行：

```bash
python -m http.server 8080
```

然后访问：

```text
http://127.0.0.1:8080
```

## 当前版本说明
- 首页命名：`ONTI｜Operation News Trading Indicator`
- 首页会展示几个高传播类型，吸引用户开始测试
- 若人格模糊，系统会在第 16 题后自动补 2 题
- 结果页会展示主类型 / 副类型 / 大方向
- 若命中隐藏类型，隐藏结果优先展示，常规类型下沉到“底层档案”
