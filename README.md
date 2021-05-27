
# 安装

1. 第一步, 全局安装

```bash
npm install -g oox
```

2. 第二步 *(非必要)*, 项目安装

```bash
npm install oox
```

# 使用方法
## 最简单用法

1. 创建文件 `entry.js`:

```javascript
exports.do = ( msg ) => {
    return 'msg:' + msg
}
```

2. 启动服务

```bash
oox entry.js port=3001
```

3. 访问服务

<!-- tabs:start -->

#### **HTTP**

```bash
POST / HTTP/1.1
Host: 127.0.0.1:3001
Content-Type: application/json
Content-Length: 68

{
    "action": "do",
    "params": [
        "hello world!"
    ]
}
```

#### **cURL**

```bash
curl --location --request POST 'http://127.0.0.1:3001/' \
--header 'Content-Type: application/json' \
--data-raw '{
    "action": "do",
    "params": [
        "hello world!"
    ]
}'
```

#### **HTTPie**

```bash
http :3001 action=do params='hello world!'
```

<!-- tabs:end -->