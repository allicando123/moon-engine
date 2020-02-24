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
		// 当手柄玩家1按下Start键后
		// 调用事件
	}
};
```

2020-2-24 加入手柄振动功能 `实验性的`
> 只支持Chromium内核的浏览器
```javascript
// 手柄玩家1手柄在延时1000毫秒后振动1000毫秒，振动幅度从0~1
Gamepad.shake(Gamepad.PlayerIndex.player1, 1000, 1000, 0, 1);
```

#### 联系我
Allicando123  
邮箱: 825225994@qq.com  
欢迎大家批评指正
