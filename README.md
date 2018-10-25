# babel-plugin-try-catch-auto

* 作者：liuduan
* 邮箱：liuduan.05.05@163.com
* 版本：**`2.4.2`**

## 介绍

_babel插件，js文件经过babel编译时会自动在`function` 内部嵌入`try catch`代码片段，用于捕获函数体中的异常，并上报异常数据到服务器。
</br>
因`onerror`及`react componentDidCatch`不能捕获异步方法中的异常而开开发该插件_

---

## 安装

```
cnpm i -D babel-plugin-try-catch-auto
```

- 如果你还没有安装 `npm`，可通过以下方式进行 [安装](https://nodejs.org/en/download/)。
- 安装cnpm `npm install -g cnpm --registry=https://registry.npm.taobao.org`


---

## 使用

### 1. 捕获异常不向外继续抛出配置
```javascript
// .babelrc文件内配置
{
    "presets": [
        ["env", {
            "modules": false
        }],
        "react",
        "stage-2"
    ],
    "plugins": [
        // 如果没有引入antd，可忽略 import 插件配置，import插件仅供示例参考
        [
            "import",
            {
                "libraryName": "antd",
                "libraryDirectory": "lib",
                "style": "css"
            }
        ],
        [
            "try-catch-auto", 
            {
                "throwError": false // throwError = false 时，捕获异常不向外继续抛出
            }
        ]
    ]
}
```

### 2. 捕获异常继续向外抛出配置
```javascript
// .babelrc文件内配置
{
    "presets": [
        ["env", {
            "modules": false
        }],
        "react",
        "stage-2"
    ],
    "plugins": [
        // 如果没有引入antd，可忽略 import 插件配置，import插件仅供示例参考
        [
            "import",
            {
                "libraryName": "antd",
                "libraryDirectory": "lib",
                "style": "css"
            }
        ],
        "try-catch-auto"
    ]
}
```


## Changelog

### 2.4.0
1. 优化`catch`上报参数
2. 增加`throwError`参数配置

### 2.4.1
1. 替换函数节点为Function

### 2.4.2
1. 对添加try catch的模块增加严格审核，减少不必要的try catch
2. error.message中增加了`方法名`和`方法行号`起始位置的信息，具体在message结尾以`:`间隔
3. 补充了属性方法中的错误捕获

---