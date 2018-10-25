const catchTemplate = `
    try { 
        ERROR_VARIABLE.message += (FUNC_NAME + FUNC_LINE)
        window.JSTracker.catch(ERROR_VARIABLE)
    } catch (e) {
    }
`

let t;

module.exports = function (babel) {

    t = babel.types;

    const wrapCapture = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
        }
    }`)

    const wrapCaptureWithThrow = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
            throw ERROR_VARIABLE
        }
    }`)

    const wrapCaptureWithReturn = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
        }
    }`)

    const wrapCaptureWithReturnWithThrow = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
            throw ERROR_VARIABLE
        }
    }`)

    function astFunc({ throwError }) {

        let capture = wrapCaptureWithThrow
        let captureWithReturn = wrapCaptureWithReturnWithThrow

        if (throwError === false) {
            capture = wrapCapture
            captureWithReturn = wrapCaptureWithReturn
        }

        return {
            capture,
            captureWithReturn
        }

    }

    return {
        visitor: {

            // Classs 类中的错误捕获
            ClassDeclaration(path, _ref = { opts: {} }) {

                if (!path.get('body')) return;

                let bodyPaths = path.get('body').get('body')

                if (!bodyPaths) return;

                if (bodyPaths.length === 0) return;

                bodyPaths.forEach(bodyPath => {

                    if (!bodyPath) return;

                    const bodyNode = bodyPath.node;

                    if (!bodyNode) return;

                    const bodyType = bodyNode.type;
                    const bodyKey = bodyNode.key;

                    if (['ClassMethod', 'ClassProperty'].indexOf(bodyType) === -1) return;

                    let funcname = bodyKey && bodyKey.name;

                    if (!funcname) return;

                    if (bodyType === 'ClassProperty') {

                        bodyPath = bodyPath.get('value');

                        if (!bodyPath) return;

                        if (!bodyPath.node) return;

                        if (!isFuncTypeNode(bodyPath.node.type)) return;
                    }

                    replaceFuncBody(bodyPath, astFunc(_ref.opts));
                });
            },

            // 计时器、Promise 中的错误捕获
            Function(path, _ref = { opts: {} }) {

                const parent = path.parent;

                if (!parent) return;

                if (!parent.callee) return;

                const astObj = astFunc(_ref.opts);

                const calleeName = parent.callee.name;
                if (checkAsyncName(calleeName)) return replaceFuncBody(path, astObj);


                const calleeProp = parent.callee.property;
                if (calleeProp && checkAsyncProp(calleeProp.name)) return replaceFuncBody(path, astObj);


                const parentType = parent.type;
                if (parentType === 'ExpressionStatement') return replaceFuncBody(path, astObj);
            },

            // setState 中的错误捕获
            CallExpression(path, _ref = { opts: {} }) {

                if (!path.node) return;
                if (!path.node.callee) return;

                const calleeProp = path.node.callee.property;

                if (!calleeProp) return;

                if (!path.parent) return;

                if ((['setState'].indexOf(calleeProp.name) > -1 && path.parent.type === 'ExpressionStatement')) {

                    if (!path.node.arguments) return;

                    const args = path.get('arguments');

                    const l = path.node.arguments.length;
                    if (!l) return;

                    const funcPath = args[l - 1];

                    if (!funcPath) return;
                    if (!funcPath.node) return;

                    const funcType = funcPath.node.type;

                    if (!isFuncTypeNode(funcType)) return;

                    return replaceFuncBody(funcPath, astFunc(_ref.opts));
                }
            },

            // {} 中属性的方法
            Property(path, _ref = { opts: {} }) {

                const { parent } = path;

                if (!parent) return;
                if (parent.type !== 'ObjectExpression') return;

                const childPath = path.get('value');

                if (!childPath) return;

                const childNode = childPath.node;

                if (!childNode) return;

                if (!isFuncTypeNode(childNode.type)) return;

                replaceFuncBody(childPath, astFunc(_ref.opts));
            },

            // = 赋值右边的方法
            AssignmentExpression(path, _ref = { opts: {} }) {
                const { parent } = path;

                if (!parent) return;
                if (parent.type !== 'ExpressionStatement') return;

                const childPath = path.get('right');

                if (!childPath) return;

                const childNode = childPath.node;

                if (!childNode) return;

                if (!isFuncTypeNode(childNode.type)) return;

                replaceFuncBody(childPath, astFunc(_ref.opts));
            },

            // Program下定义的方法
            FunctionDeclaration(path, _ref = { opts: {} }) {
                const { parent, node } = path;

                if (!parent) return;
                if (['Program', 'ExportNamedDeclaration', 'ExportDefaultDeclaration'].indexOf(parent.type) < 0) return;
                if (!node.id) return;
                if (!node.id.name) return;

                replaceFuncBody(path, astFunc(_ref.opts));
            },

            // 变量定义方法
            VariableDeclarator(path, _ref = { opts: {} }) {
                const { parent } = path;

                if (!parent) return;
                if (parent.type !== 'VariableDeclaration') return;

                const childPath = path.get('init');

                if (!childPath) return;

                const childNode = childPath.node;

                if (!childNode) return;

                if (!isFuncTypeNode(childNode.type)) return;

                replaceFuncBody(childPath, astFunc(_ref.opts));
            },

            // 嵌套函数
            BlockStatement(path, _ref = { opts: {} }) {
                const { parent } = path;

                if (!parent) return;

                if (!isFuncTypeNode(parent.type) && parent.type !== 'TryStatement') return;

                const childPaths = path.get('body');

                if (!childPaths.length) return;

                childPaths.forEach(childPath => {

                    if (!childPath) return;

                    const childNode = childPath.node;

                    if (!childNode) return;

                    if (!isFuncTypeNode(childNode.type)) return;

                    replaceFuncBody(childPath, astFunc(_ref.opts));
                });

            },

            // 自执行函数 + addEventListener
            ExpressionStatement(path, _ref = { opts: {} }) {

                const childPath = path.get('expression');
                if (!childPath) return;

                const childNode = childPath.node;
                if (!childNode) return;

                if (childNode.type !== 'CallExpression') return;

                const sunPath = childPath.get('callee');
                if (!sunPath) return;

                const sunNode = sunPath.node;
                if (!sunNode) return;

                // addEventListener
                const { object, property } = sunNode;
                const args = childPath.get('arguments');
                if (isEventListenr(object, property, args)) {

                    replaceFuncBody(args[1], astFunc(_ref.opts));

                    return;
                }

                // 自执行函数
                if (!isFuncTypeNode(sunNode.type)) return;

                replaceFuncBody(sunPath, astFunc(_ref.opts));
            }
        }
    }
}

function checkAsyncName(params) {
    if (!params) return false;
    return ['setTimeout', 'setInterval', 'Promise'].indexOf(params) > -1
}

function checkAsyncProp(params) {
    if (!params) return false;
    return ['requestAnimationFrame', 'then'].indexOf(params) > -1
}

function replaceFuncBody(path, { capture, captureWithReturn }) {
    const node = path.node;
    if (!node) return;

    let funcBody = node.body.body;
    let astTemplate = capture;

    if (!funcBody) {
        funcBody = node.body;
        if (!funcBody) return;
        if (isBaseTypeNode(funcBody.type)) return;

        astTemplate = captureWithReturn;
    } else {
        const len = funcBody.length;
        if (!len) return;

        // 检测若果如果第一个是try 就不再包裹
        const firstNode = funcBody[0];
        if (firstNode && firstNode.type === 'TryStatement') return;

        const secondNode = funcBody[1];
        if (secondNode && secondNode.type === 'TryStatement') return;

        let stopFlag = true;
        // todo:查看是否方法体中都是方法类型，如果是就不再try catch
        for (let i = 0; i < len; i++) {
            const currentNode = funcBody[i];
            if (currentNode && (!isFuncTypeNode(currentNode.type) && currentNode.type !== 'TryStatement')) {
                stopFlag = false;
                break;
            }
        }

        if (stopFlag) return;
    }

    const funcErrorVariable = path.scope.generateUidIdentifier('e');


    let funcId = node.id || node.key;
    let funcLoc = node.loc;
    let funcName = '';

    if (funcId && funcId.type === 'Identifier') {
        funcName = funcId.name || '';
        if (!funcLoc && funcId.loc) funcLoc = funcId.loc;
    }

    if (inWriteList(funcName)) return;

    let funcLine = (funcLoc && funcLoc.start) ? funcLoc.start.line + '' : '';

    funcName = t.StringLiteral(funcName ? (':' + funcName) : funcName);
    funcLine = t.StringLiteral(funcLine ? (':' + funcLine) : funcLine);

    const ast = astTemplate({
        FUNC_BODY: funcBody,
        FUNC_NAME: funcName,
        FUNC_LINE: funcLine,
        ERROR_VARIABLE: funcErrorVariable
    });

    path.get('body').replaceWith(ast);
}


function isFuncTypeNode(type) {
    return type && ['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration'].indexOf(type) > -1;
}

function isBaseTypeNode(type) {
    return type && ['Identifier', 'NumericLiteral', 'StringLiteral', 'BooleanLiteral', 'NullLiteral', 'ObjectExpression', 'ArrayExpression'].indexOf(type) > -1;
}

// 检测是否是事件监听器，如果是是否有回调方法
function isEventListenr(object, property, args) {

    if (!object || !property || !args) return false;

    if (!object.name) return false;

    if (['addEventListener', 'removeEventListener'].indexOf(property.name) < 0) return false;

    const len = args.length;

    if (len < 2 && len > 3) return false;

    const func = args[1];

    if (!func) return false;

    const funcNode = func.node;

    if (!funcNode) return false;

    if (!isFuncTypeNode(funcNode.type)) return false;

    return true;
}


// 白名单方法不trycatch
function inWriteList(funcName) {
    return funcName && ['defineProperties', '_defineProperty', '_classCallCheck', '_possibleConstructorReturn', '_inherits', '_objectWithoutProperties', '_createClass'].indexOf(funcName) > -1;
}