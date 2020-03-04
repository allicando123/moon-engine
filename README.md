# moonjs游戏引擎

**moon游戏引擎是一个简单可扩展的引擎**

由毕业设计为契机，我决定编写一个简单易用的H5游戏引擎。由于经验不足，因此在设计上有许多瑕疵，欢饮大家批评指正。该引擎只实现简单的功能，能够制作简易的游戏。在以后，我会不断完善引擎和增加内容。引擎在框架上搭建了3D，但是暂时并没有对3D游戏的支持。


## 引擎介绍

#### 概述
Moon引擎是一个无依赖，简单易用的游戏引擎。

该游戏引擎采用Pannel面板作为一个游戏页面，每一个Pannel面板都有独立的渲染功能。通过创建多个面板来创建不同的游戏界面，并由隐藏或销毁的方法将不显示Pannel面板。每个面板都可以独立加载资源和销毁资源，实现资源动态加载。

游戏在图形渲染上使用了webgl渲染，在开发时暂时取消了canvas2d的渲染，在以后中我会将其加入。

该引擎拓展性强，可通过编写插件，然后将插件路径写在setting.json中的plugin中。引擎加载方式是先初始化游戏引擎，然后加载插件，最后加载主程序。

引擎在加载时，会创建游戏必要的实例。
```javascript
Moon.Game.PannelManager;  // 管理所有的Pannel面板
Moon.Game.Drawing2D;  // 绘制2D图元
Moon.Game.Camera;  // 游戏用的摄像机
Moon.Game.GameTime; // 游戏时间
Moon.Game.Resource; // 游戏资源管理器
```

#### 使用

1. 下载  `npm install allicando123/moon-engine`  
2. 将下载后的的代码复制到工程路径中
3. 配置setting.json文件
```javascript
{
    "canvas": "canvas", // 画布id
    "width": 800, // 画布宽度，可选，默认为800
    "height": 600, // 画布高度，可选，默认为600
    "main": "./game.js", // 主游戏文件
    "plugin": [] // 插件数组，相对于app.js的相对路径
}
```
4. 在主游戏文件中编写代码
```javascript
let gamePannel = (function(){
	let gamePannel = new Moon.Pannel(); // 创建游戏面板
	gamePannel.preload = function() {
		// 预加载游戏资源
	};
	gamePannel.loaded = function() {
		// 游戏资源加载好触发
	};
	gamePannel.showed = function() {
		// 面板显示时触发
	};
	gamePannel.hided = function() {
		// 面板隐藏时触发
	};
	gamePannel.update = function() {
		// 游戏更新
	};
	gamePannel.draw = function() {
		// 游戏绘制
	};
	gamePannel.destroyed = function() {
		// 面板销毁时触发
	};
	// 这些方法选择需要的方法进行重写
	return gamePannel;
}());

Moon.Game.PannelManager.add(gamePannel); // 将面板加入到面板管理器中
Moon.Game.start(); // 启动游戏
```

#### 引擎支持

> 支持键盘、鼠标、触控、手柄四种交互模块  
> 支持灯光系统
> 支持物理世界和网格世界  
> 支持精灵动画，以及对精灵的图元各类变换  
> 支持砖块世界  
> 碰撞系统  
> UI模块支持  
> 文字渲染模块使用SpriteFont，支持动态渲染SpriteFont，也可以使用 createSpriteFont() 方法创建SpriteFont并生成本地文件。  
> 支持深度缓冲和颜色叠加  
> 支持声音模块，播放声音和音效  
> 支持插件系统，动态加载  

#### 特别说明

引擎使用XmlHttpRequest动态请求资源，由于跨域问题，因此需要架设服务器运行。或是开启跨域访问的方法运行。引擎推荐使用Chrome运行测试。

#### 更新

2020-2-24 加入了手柄控制系统  
```javascript
// 手柄系统
let Gamepad = Moon.Input.Gamepad;
Gamepad.enable(true); // 启用手柄

// 在面板更新函数中使用
pannel.update = function() {
	Gamepad.update(); // 更新手柄信息

	if(Gamepad.onKeyDown(Gamepad.PlayerIndex.player1, Gamepad.Keys.START)) {
		// 当手柄玩家 1 按下 Start 键后
		// 调用事件
	}
};
```

2020-2-24 加入手柄振动功能 `实验性的`
> 只支持Chromium内核的浏览器
```javascript
// 手柄玩家 1 手柄在延时 1000 毫秒后振动 1000 毫秒，振动幅度从 0~1
Gamepad.shake(Gamepad.PlayerIndex.player1, 1000, 1000, 0, 1);
```

2020-2-28 加入圆形灯光系统
>2020-3-4 已废弃
```javascript
let g = Moon.Game.Drawing2D; // 获取图形模块
let shaderProgram = Moon.Drawing.Drawing3D.Drawing2D.shaderProgram; // 不同的着色器程序
g.changeProgram(shaderProgram.simpleLight); // 启动简单灯光着色器程序

// 将环境光强度改为0.1
g.changeAmbient(shaderProgram.simpleLight, 0.1);
// 设置环境光颜色为绿色
g.changeAmbientColor(shaderProgram.simpleLight, new Float32Array([0.0, 1.0, 0.0]));

// 添加一个坐标为 (0,0) ，范围为 1000，颜色为白色的灯光
// 范围是以canvas大小为比例
// 生成灯光，并产生索引，索引从 0 递增
g.addLight(shaderProgram.simpleLight, new Moon.Vector2(0, 0), 1000, new Float32Array([1.0, 1.0, 1.0]));

// 将索引为 0 的灯光坐标变换到 (100,100) 处
g.changeLightPosition(shaderProgram.simpleLight, 0, new Moon.Vector2(100, 100));

// 将索引为 0 的灯光范围改为 800
g.changeLightRadius(shaderProgram.simpleLight, 0, 800);

// 将索引为 0 的灯光颜色改为红色
g.changeLightColor(shanderProgram.simpleLight, 0, new Float32Array([1.0, 0.0, 0.0]));

// 移除索引为 0 的颜色
// 其索引之后的灯光索引自减 1
g.removeLight(shanderProgram.simpleLight, 0);
```

2020-2-28 圆形灯光系统环境
> 将圆形灯光系统封装  
```javascript
let Entity = Moon.Entity;

// 启动圆形灯光系统
Entity.SimpleLightEnvironment.enable(true);

// 创建灯光环境实例
let environment = new Entity.SimpleLightEnvironment();
// 设置灯光强度
environment.changeAmbient(0.2);
// 改变环境光颜色为绿色
environment.changeAmbientColor(new Float32Array([0.0, 1.0, 0.0]));

// 创建灯光，灯光便会存在环境之中
let light = environment.createLight(new Moon.Vector(0, 0), 1000, new Float32Array([1.0, 1.0, 1.0]));

// 修改灯光属性
light.position.x = 100;
light.radius = 800;
light.color[0] = 0;

// 更新属性
environment.updateLightPosition(light);
environment.updateLightRadius(light);
environment.updateLightColor(light);

// 移除灯光
environment.removeLight(light);

// 将移除的灯光重新加入到环境之中
environment.addLight(light);
```
> 2020-3-4 修改
```javascript
// 创建灯光从 3 个参数修改为 4 个参数
// 灯光范围改为像素大小，为圆形灯光的半径
// 第 2 个参数是灯光的外圈半径，第 3 个参数是灯光的内圈半径，内圈半径灯光强度不衰减，外圈半径灯光强度衰减
// 创建一个圆心为 (0, 0) 半径为 100， 内圈半径为 20 ，颜色为白色的灯光
let light = environment.createLight(new Moon.Vector(0,0), 100, 20, new Float32Array[1.0, 1.0, 1.0]);

// 灯光可修改内圈半径
light.innerRadius = 100;

// 更新属性
environment.updateLightInnerRadius(light);

// 增加全部更新函数
environment.updateAll(light);
```

2020-3-4 修改灯光着色器以及对相关API做出修改  
> 相关修改在之前更新说明中做出了标注  
> 增加着色器程序扩展能力  

1. 简单灯光原生系统
```javascript
// 引擎加载后会创建自动创建着色器管理器
let manager = Moon.Game.Drawing2D.shaderProgramManager;

// 启动简单灯光着色器程序
Moon.Game.Drawing2D.changeProgram(
	Moon.Drawing.Drawing3D.Drawing2D.ShaderProgram.type.simpleLight
);

// 修改着色器程序的属性
// 修改环境光强度
manager.currentProgram.setAmbient(0.1);

// 修改环境光颜色
manager.currentProgram.setAmbientColor(new Float32Array([1.0, 1.0, 1.0]));

// 添加灯光
manager.currentProgram.addLight(new Moon.Vector(0,0), 100, 20, new Float32Array[1.0, 1.0, 1.0]);

// 修改灯光参数
manager.currentProgram.changeLightPosition(new Moon.Vector(100, 100));
manager.currentProgram.changeLightColor(new Float32Array([1.0, 1.0, 1.0]));
manager.currentProgram.changeLightRadius(100);
manager.currentProgram.changeLightInnerRadius(80);

// 弹出最后一个灯光
manager.currentProgram.pop();
```

2. 着色器程序拓展
```javascript
// 假设拥有两个着色器程序字符串vertexShader, fragmentShader
// 定义着色器程序类
let TestProgram = (function() {
	function TestProgram(name, gl, vs, fs) {
		Moon.Drawing.Drawing3D.ShaderProgram.call(this, gl, vs, fs);
		// 获取着色器全局参数对象
		this.uniforms.ambient = this.gl.getUniformLocation(this.program, 'u_ambient');
	}
	// 继承
	TestProgram.prototype = new Moon.Drawing.Drawing3D.ShaderProgram();
	TestProgram.prototype.constructor = TestProgram;
	TestProgram.prototype.setAmbient = function(ambient) {
		// 设置参数对象值
		this.gl.uniform1f(this.uniforms.ambient, ambient);
	}
	return TestProgram;
}());

// 创建着色器程序
let gl = Moon.Game.Drawing2D.gl;
let manager = Moon.Game.Drawing2D.shaderProgramManager;
let program = new TestProgram('light', gl, vertexShader, fragmentShader);
manager.add(program);

// 启动着色器程序
Moon.Game.Drawing2D.changeProgram('light');

// 对着色器进行操作
```

#### 联系我
Allicando123  
邮箱: 825225994@qq.com  
欢迎大家批评指正
