'use strict'
/**
 * 游戏基本架构类
 * 在2020年1月20号，决定取消2DContext支持，只使用webgl作为图形引擎
 * @author 谭振宇
 * @version 0.1.0
 */
let Moon = (function() {
    let moon = {};
    /**
     * 存放游戏集合
     */
    moon.Game = {};

    /**
     * 游戏初始化
     * @param {{ canvas:string, width: number, height: number, graphics:string}} config 配置信息 
     */
    moon.init = function(config) {
        if (!config)
            throw '没有配置信息';
        if (!config.canvas)
            throw '未填写画布id';
        if (!config.width || !config.height)
            throw '未填写画布大小';

        // 初始化游戏，生成游戏集合
        // 设置基本信息
        this.Game.canvas = document.getElementById('canvas');
        this.Game.WIDTH = config.width;
        this.Game.HEIGHT = config.height;

        // 设置画布大小
        this.Game.canvas.width = this.Game.WIDTH;
        this.Game.canvas.height = this.Game.HEIGHT;

        // 设置图形
        if (!config.graphics) {
            // 默认使用webgl
            this.Game.graphics = 'webgl';
        } else {
            // 如果有配置，则载入配置
            this.Game.graphics = config.graphics;
        }

        // 一些使用类
        // 游戏时间类
        this.Game.GameTime = new this.GameTime();
        // 资源类
        this.Game.Resource = new this.Resource.Resource();
        // 面板管理器
        this.Game.PannelManager = new this.PannelManager();
        // 摄像机
        this.Game.Camera = new this.Camera.Camera(
            new this.Vector3(0, 0, 1),
            new this.Vector2(this.Game.WIDTH, this.Game.HEIGHT)
        );

        // 接下来解决同名类问题
        // 选择2D绘图图形模块
        this.Game.Drawing2D =
            this.Game.graphics == 'webgl' ?
            new this.Drawing.Drawing3D.Drawing2D(this.Game.canvas.getContext('webgl')) :
            new this.Drawing.Drawing2D(this.Game.canvas.getContext('2d'));
    }

    // 游戏渲染
    moon.Game.render = function() {
        this.GameTime.setLastTime();
        this.PannelManager.render();
        this.GameTime.start();
        requestAnimationFrame(this.render.bind(this));
    }

    /**
     * 开始游戏
     */
    moon.Game.start = function() {
        this.render();
    }

    moon.GameTime = (function() {
        /**
         * 游戏时间类
         */
        function GameTime() {
            this.elapsedTime = (1 / 60);
            this.runTime = 0;
            this.startTime = new Date();
            this.lastTime = 0;
        }
        /**
         * 设置上一次运行的时间
         */
        GameTime.prototype.setLastTime = function() {
            this.lastTime = this.runTime;
        };
        /**
         * 开始计时时间
         */
        GameTime.prototype.start = function() {
            this.runTime = this.getTime();
            this.elapsedTime = (this.runTime - this.lastTime);
        };
        /**
         * 获取时间
         */
        GameTime.prototype.getTime = function() {
            let now = new Date();
            return (now - this.startTime) / 1000;
        };
        return GameTime;
    }());

    /**
     * 游戏工具
     */
    moon.Utils = (function() {
        let utils = {};

        /**
         * 限制值v在min与max之内
         */
        utils.clamp = function(v, min, max) {
            if (v < min)
                v = min;
            else if (v > max)
                v = max;
            return v;
        }

        /**
         * 将度数转化为角度
         */
        utils.degreeToRadian = function(degree) {
            return degree * Math.PI / 180;
        }

        /**
         * 将角度转化为度数
         */
        utils.radianToDegree = function(angle) {
            return angle * 180 / Math.PI;
        }

        /**
         * 将0.1到100转化为0到1的深度值
         */
        utils.getDepth = function(depth) {
            let near = 0.1,
                far = 100;

            let z = depth * 2 - 1;
            return (2 * near) / (far + near - z * (far - near));
        }

        /**
         * 将字符串颜色转化为float数组
         */
        utils.colorStrToArr = function(str) {
            if (str[0] != '#')
                throw '颜色错误';
            let r = str.substring(1, 3);
            let g = str.substring(3, 5);
            let b = str.substring(5, 7);
            if (str.length <= 7)
                return new Float32Array([
                    Math.floor(Number.parseInt(r, 16) / 255),
                    Math.floor(Number.parseInt(g, 16) / 255),
                    Math.floor(Number.parseInt(b, 16) / 255),
                    1
                ]);
            let a = str.substring(7, 9);
            return new Float32Array([
                Math.floor(Number.parseInt(r, 16) / 255),
                Math.floor(Number.parseInt(g, 16) / 255),
                Math.floor(Number.parseInt(b, 16) / 255),
                Math.floor(Number.parseInt(a, 16) / 255)
            ]);
        }

        return utils;
    }());

    moon.Resource = (function() {
        let resource = {};

        /**
         * 资源的请求方式
         */
        resource.method = {
            get: 'GET',
            post: 'POST'
        };

        /**
         * 请求资源的类型
         */
        resource.type = {
            image: 0,
            sound: 1,
            json: 2,
            bin: 3,
            text: 4
        };

        /**
         * 根据资源类型获取返回类型
         */
        resource.getType = function(type) {
            let result = 'text';
            switch (type) {
                case resource.type.image:
                case resource.type.sound:
                    result = 'blob';
                    break;
                case resource.type.json:
                    result = 'json';
                    break;
                case resource.type.bin:
                    result = 'arraybuffer';
                    break;
            }
            return result;
        };

        /**
         * 根据类型创建文件
         */
        resource.createResource = function(type, r, callback) {
            let result;


            if (type == resource.type.json || type == resource.type.bin || type == resource.type.text) {
                result = r;
                callback(result);
                return;
            }

            // 如果时声音和图片，需要转化成src，调用onload
            if (type == resource.type.image) {
                if (window.createImageBitmap) { // 检测是否支持该函数，createImageBitmap效率高
                    createImageBitmap(r).then(function(img) {
                        callback(img);
                        return;
                    });
                } else {
                    result = new Image();
                    result.src = window.URL.createObjectURL(r);
                    // 当资源加载好
                    result.onload = function() {
                        callback(this);
                        return;
                    }
                }
            } else if (type == resource.type.sound) {
                result = new Audio();
                result.src = window.URL.createObjectURL(r);
                // 当资源加载好
                result.oncanplaythrough = function() {
                    callback(this);
                    return;
                }
            }
            // 如果给入类型错误
            // callback(null);
        };

        resource.Resource = (function() {
            /**
             * 资源类
             */
            function Resource() {
                this.R = {}; // 使用的资源
                this.waiting = []; // 等待被加载的资源
                this.method = 'GET'; // 默认使用GET方法加载资源
            }
            /**
             * 预加载的资源
             */
            Resource.prototype.preload = function(type, src, name) {
                // 将资源加载到等待组中
                let s = { name: name, src: src, type: type };
                this.waiting.push(s);
            };
            /**
             * 获取资源加载进度
             */
            Resource.prototype.loadPrograss = function(index, count) {};
            /**
             * 加载正在等待组中的资源
             */
            Resource.prototype.load = function(callback) {

                // 如果没有想要加载的资源，直接调用回调函数
                if (this.waiting.length == 0) {
                    callback();
                    return;
                }

                let count = 0;
                // 加载资源
                for (let i = 0; i < this.waiting.length; i++) {
                    let xhr = new XMLHttpRequest();



                    let self = this;

                    // 当前请求的内容
                    let s = this.waiting[i];
                    // 设置xhr请求的内容
                    xhr.responseType = resource.getType(s.type);

                    // 占位，之后改为onreadystatechanged
                    // 如果加载成功
                    xhr.onload = function() {
                        resource.createResource(s.type, this.response, function(r) {
                            count++;
                            // 设置加载过程
                            self.loadPrograss(count + 1, self.waiting.length);
                            // 将资源放入R中
                            self.R[s.name] = r;

                            if (count == self.waiting.length) {
                                self.waiting.splice(0, self.waiting.length); // 清除等待组
                                callback(); // 如果全部加载，则调用回调函数
                            }
                        });
                    }

                    // 如果发生错误
                    xhr.onerror = function() {
                        count++;
                        // 设置加载过程
                        self.loadPrograss(count, self.waiting.length);

                        if (count == self.waiting.length) {
                            self.waiting.splice(0, self.waiting.length); // 清除等待组
                            callback(); // 如果全部加载，则调用回调函数
                        }

                    }

                    xhr.open(this.method, s.src);
                    xhr.send(null);
                }
            };
            /**
             * 释放不用的资源
             */
            Resource.prototype.disposeResource = function(name) {
                delete this.R[name];
            };
            return Resource;
        }());
        return resource;
    }());

    moon.Pannel = (function() {
        /**
         * 游戏使用的PANNEL
         */
        function Pannel() {
            this.enable = true;
            this.visible = true;
        }
        /**
         * 对其进行重写，加载资源
         */
        Pannel.prototype.preload = function() {};
        /**
         * 对其进行重写，当加载完成时触发
         */
        Pannel.prototype.loaded = function() {};
        /**
         * 对其进行重写，当显示时触发
         */
        Pannel.prototype.showed = function() {};
        /**
         * 对其进行重写，当隐藏时触发
         */
        Pannel.prototype.hided = function() {};
        /**
         * 对其进行重写，当页面销毁时触发
         */
        Pannel.prototype.destroyed = function() {};
        /**
         * 对其进行重写，更新当前页面的数据
         */
        Pannel.prototype.update = function() {};
        /**
         * 对其进行重写，更新当前页面的绘制内容
         */
        Pannel.prototype.draw = function() {};
        return Pannel;
    }());

    moon.PannelManager = (function() {
        /**
         * 用来管理所有的面板
         */
        function PannelManager() {
            this.pannels = [];
        }

        /**
         * 添加游戏面板
         * @param {Pannel} pannel 游戏面板 
         */
        PannelManager.prototype.add = function(pannel) {
            if (this.pannels.indexOf(pannel) == -1 && pannel instanceof moon.Pannel) {

                // 添加到类的时候开始加载资源
                pannel.preload();
                let self = this;
                // 查找并加载资源
                moon.Game.Resource.load(function() {
                    // 当资源加载好触发
                    pannel.loaded();
                    moon.Sound.Audio.loadAudio(function() {
                        self.pannels.push(pannel);
                        self.show(pannel);
                    });
                });
            }
        }

        /**
         * 移除游戏面板
         * @param {Pannel} pannel 游戏面板 
         */
        PannelManager.prototype.remove = function(pannel) {
            let index = this.pannels.indexOf(pannel);
            if (index != -1) {
                this.pannels[index].destroyed();
                this.pannels.splice(index, 1);
            }
        }

        /**
         * 显示游戏面板
         * @param {Pannel} pannel 游戏面板
         */
        PannelManager.prototype.show = function(pannel) {
            let index = this.pannels.indexOf(pannel);
            if (index != -1) {
                this.pannels[index].showed();
                this.pannels[index].enable = true;
                this.pannels[index].visible = true;
            }
        }

        /**
         * 隐藏游戏面板
         * @param {Pannel} pannel 游戏面板
         */
        PannelManager.prototype.hide = function(pannel) {
            let index = this.pannels.indexOf(pannel);
            if (index != -1) {
                this.pannels[index].hided();
                this.pannels[index].enable = false;
                this.pannels[index].visible = false;
            }
        }

        /**
         * 执行渲染
         */
        PannelManager.prototype.render = function() {
            for (let i = 0; i < this.pannels.length; i++) {
                if (this.pannels[i].enable)
                    this.pannels[i].update();
                if (this.pannels[i].visible)
                    this.pannels[i].draw();
            }
        }

        return PannelManager;
    }());

    // 二维向量
    moon.Vector2 = (function() {
        /**
         * 二维向量
         * @param {number} X X坐标
         * @param {number} y Y坐标
         */
        function Vector2(x, y) {
            this.x = x;
            this.y = y;
        }
        /**
         * 向量和
         * @param {moon.Vector2} vec2 二维向量
         */
        Vector2.prototype.plus = function(vec2) {
            this.x += vec2.x;
            this.y += vec2.y;
        };
        /**
         * 向量差
         * @param {moon.Vector2} vec2 二维向量
         */
        Vector2.prototype.minus = function(vec2) {
            this.x -= vec2.x;
            this.y -= vec2.y;
        };
        /**
         * 向量积
         * @param {moon.Vector2} vec2 二维向量
         */
        Vector2.prototype.multiple = function(vec2) {
            this.x *= vec2.x;
            this.y *= vec2.y;
        };
        /**
         * 向量除
         * @param {moon.Vector2} vec2 二维向量
         */
        Vector2.prototype.divide = function(vec2) {
            if (vec2.x != 0)
                this.x /= vec2.x;
            if (vec2.y != 0)
                this.y /= vec2.y;
        };
        /**
         * 为零向量
         */
        Vector2.prototype.isZero = function() {
            return this.x == 0 && this.y == 0;
        };
        /**
         * 将向量变为单位向量
         */
        Vector2.prototype.normalize = function() {
            if (this.isZero())
                return;
            let l = Math.sqrt(this.x * this.x + this.y * this.y);
            this.x /= l;
            this.y /= l;
        };
        /**
         * 转化为float数组
         */
        Vector2.prototype.toFloatArray = function() {
            return new Float32Array([this.x, this.y]);
        };
        /**
         * 设置为零向量
         */
        Vector2.prototype.toZero = function() {
            this.x = 0;
            this.y = 0;
        };
        /**
         * 克隆当前对象
         */
        Vector2.prototype.clone = function() {
            return new Vector2(this.x, this.y);
        };
        return Vector2;
    }());

    // 三维向量
    moon.Vector3 = (function() {
        /**
         * 三维向量
         * @param {number} X X坐标
         * @param {number} y Y坐标
         * @param {number} z Z坐标
         */
        function Vector3(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        /**
         * 向量和
         * @param {moon.Vector3} vec3 三维向量
         */
        Vector3.prototype.plus = function(vec3) {
            this.x += vec3.x;
            this.y += vec3.y;
            this.z += vec3.z;
        };
        /**
         * 向量差
         * @param {moon.Vector3} vec3 三维向量
         */
        Vector3.prototype.minus = function(vec3) {
            this.x -= vec3.x;
            this.y -= vec3.y;
            this.z -= vec3.z;
        };
        /**
         * 向量积
         * @param {moon.Vector3} vec3 三维向量
         */
        Vector3.prototype.multiple = function(vec3) {
            this.x *= vec3.x;
            this.y *= vec3.y;
            this.z *= vec3.z;
        };
        /**
         * 向量除
         * @param {moon.Vector3} vec3 三维向量
         */
        Vector3.prototype.divide = function(vec3) {
            if (vec3.x != 0)
                this.x /= vec3.x;
            if (vec3.y != 0)
                this.y /= vec3.y;
            if (vec3.z != 0)
                this.z /= vec3.z;
        };
        /**
         * 为零向量
         */
        Vector3.prototype.isZero = function() {
            return this.x == 0 && this.y == 0 && this.z == 0;
        };
        /**
         * 将向量变为单位向量
         */
        Vector3.prototype.normalize = function() {
            if (this.isZero())
                return;
            let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            this.x /= l;
            this.y /= l;
            this.z /= l;
        };
        /**
         * 转化为float数组
         */
        Vector3.prototype.toFloatArray = function() {
            return new Float32Array([this.x, this.y, this.z]);
        };
        /**
         * 设置为零向量
         */
        Vector3.prototype.toZero = function() {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        };
        /**
         * 克隆当前对象
         */
        Vector3.prototype.clone = function() {
            return new Vector3(this.x, this.y, this.z);
        };
        return Vector3;
    }());

    // 矩形
    moon.Rectangle = (function() {
        /**
         * 矩形
         * @param {number} x X坐标
         * @param {number} y Y坐标
         * @param {number} width 宽度
         * @param {number} height 高度
         */
        function Rectangle(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        /**
         * 设置
         * @param {number} x X坐标
         * @param {number} y Y坐标
         * @param {number} width 宽度
         * @param {number} height 高度
         */
        Rectangle.prototype.setRectangle = function(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        };
        /**
         * 矩形是否包含一个坐标点
         * @param {number} x X坐标
         * @param {number} y Y坐标
         */
        Rectangle.prototype.contain = function(x, y) {
            return this.x <= x && this.x + this.width >= x &&
                this.y <= y && this.y + this.height >= y;
        };
        /**
         * 两矩形是否相交
         * @param {Rectangle} rectangle 矩形
         */
        Rectangle.prototype.intersect = function(rectangle) {
            if (this.x + this.width <= rectangle.x || this.x >= rectangle.x + rectangle.width)
                return false;
            if (this.y + this.height <= rectangle.y || this.y >= rectangle.y + rectangle.height)
                return false;
            return true;
            // return (Math.abs(this.x - rectangle.x) < (this.width + rectangle.width) / 2 &&
            //     Math.abs(this.y - rectangle.y) < (this.height + rectangle.height) / 2);
        }
        return Rectangle;
    }());

    moon.Drawing = (function() {
        let drawing = {};

        drawing.Font2D = {
            /**
             * 字体位置
             */
            FontAlign: {
                start: 'start',
                end: 'end',
                left: 'left',
                right: 'right',
                center: 'center'
            },
            /**
             * 字体基线
             */
            FontBaseline: {
                top: 'top',
                middle: 'middle',
                alphabetic: 'alphabetic',
                ideographic: 'ideographic',
                bottom: 'bottom'
            },
            /**
             * 创建字体
             */
            createFont: function(name, size, align, baseline) {
                return {
                    name: size + 'px ' + name,
                    align: align || this.FontAlign.start,
                    baseline: baseline || this.FontBaseline.top
                }
            },
            /**
             * 测量字体
             */
            measureText: function(ctx, text) {
                let width = ctx.measureText(text).width;
                return width;
            }
        }

        /**
         * 镜像处理枚举值
         */
        drawing.Filter = {
            none: 0,
            filterX: 1,
            filterY: 2,
            filterXY: 3
        }

        // 2DContext
        drawing.Drawing2D = (function() {
            /**
             * 2DContext图形类
             * @param {context} ctx 图形上下文
             */
            function Drawing2D(ctx) {
                this.ctx = ctx;
                this.clearColor = '#ffffff'; // 清屏颜色
                this.color = '#000000'; // 全局绘图颜色
                this.fillColor = '#bbffff'; // 全局填充色
                this.width = 1; // 全局绘图大小
            }
            /**
             * 设置清屏颜色
             */
            Drawing2D.prototype.clearColor = function(r, g, b) {
                this.clearColor = '#' + r.toString(16) + g.toString(16) + b.toString();
            };
            /**
             * 绘制一条线
             * @param {Vector2} vec2_1 向量1
             * @param {Vector2} vec2_2 向量2
             * @param {String} color 颜色
             * @param {number} width 线条的宽度
             */
            Drawing2D.prototype.drawLine = function(vec2_1, vec2_2, color, width) {
                this.ctx.strokeStyle = color || this.color;
                this.ctx.lineWidth = width || this.width;
                this.ctx.beginPath();
                this.ctx.moveTo(vec2_1.x, vec2_1.y);
                this.ctx.lineTo(vec2_2.x, vec2_2.y);
                // this.ctx.closePath();
                this.ctx.stroke();
            };
            /**
             * 绘制一连串的线，如果线多，使用此速度比较快
             * @param {[moon.Vector2]} vec2s 二维向量数组
             * @param {string} color 颜色
             * @param {number} width 线条的宽度
             */
            Drawing2D.prototype.drawLines = function(vec2s, color, width) {
                this.ctx.strokeStyle = color || this.color;
                this.ctx.lineWidth = width || this.width;
                this.ctx.beginPath();
                this.ctx.moveTo(vec2s[0].x, vec2s[0].y);
                for (let i = 1; i < vec2s.length; i++) {
                    this.ctx.lineTo(vec2s[i].x, vec2s[i].y);
                }
                // this.ctx.closePath();
                this.ctx.stroke();
            };
            /**
             * 填充一连串的线的内容，如果线多，使用此速度比较快
             * @param {[moon.Vector2]]} vec2s 二维向量数组
             * @param {string} color 颜色
             */
            Drawing2D.prototype.fillLines = function(vec2s, color) {
                this.ctx.fillStyle = color || this.fillColor;
                this.ctx.beginPath();
                this.ctx.moveTo(vec2s[0].x, vec2s[0].y);
                for (let i = 1; i < vec2s.length; i++) {
                    this.ctx.lineTo(vec2s[i].x, vec2s[i].y);
                }
                this.ctx.closePath();
                // this.ctx.stroke();
                this.ctx.fill();
            };
            /**
             * 绘制一个矩形
             * @param {moon.Rectangle} rectangle 矩形
             * @param {string} color 颜色
             * @param {number} width 线条的宽度
             */
            Drawing2D.prototype.drawRectangle = function(rectangle, color, width) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = color || this.color;
                this.ctx.lineWidth = width || WIDTH;
                this.ctx.rect(rectangle.x, rectangle.y,
                    rectangle.width,
                    rectangle.height);
                this.ctx.stroke();
            };
            /**
             * 填充一个矩形
             * @param {moon.Rectangle} rectangle 矩形
             * @param {string} color 颜色
             */
            Drawing2D.prototype.fillRectangle = function(rectangle, color) {
                this.ctx.beginPath();
                this.ctx.fillStyle = color || this.fillColor;
                this.ctx.rect(rectangle.x, rectangle.y,
                    rectangle.width,
                    rectangle.height);
                this.ctx.fill();
            };
            /**
             * 绘制一整张图片
             * @param {Image} image 绘制的图片
             * @param {moon.Rectangle} dest 绘制的具体位置
             */
            Drawing2D.prototype.drawPicture = function(image, dest) {
                this.ctx.drawImage(image,
                    dest.x,
                    dest.y,
                    dest.width,
                    dest.height);
            };
            /**
             * 绘制一张精灵
             * @param {Image} image 绘制的图片
             * @param {moon.Rectangle} src 图片中需要被绘制的部分
             * @param {moon.Rectangle} dest 图片绘制的具体位置
             */
            Drawing2D.prototype.drawSprite = function(image, src, dest) {
                this.ctx.drawImage(image,
                    src.x,
                    src.y,
                    src.width,
                    src.height,
                    dest.x,
                    dest.y,
                    dest.width,
                    dest.height);
            };
            /**
             * 绘制一张图片，包括图片的变换
             */
            Drawing2D.prototype.picture = function(image, dest, center, angle, filter, alpha) {
                // 简单坐标系的变换
                let x = dest.x;
                let y = dest.y;

                dest.x = -center.x;
                dest.y = -center.y;

                // 镜面处理
                if (filter == drawing.Filter.filterX) {
                    x = moon.Game.WIDTH - x - 2 * center.x;
                    this.ctx.translate(moon.Game.WIDTH, 0);
                    this.ctx.scale(-1, 1);
                    angle = -angle;
                } else if (filter == drawing.Filter.filterY) {
                    y = moon.Game.HEIGHT - y - 2 * center.y;
                    this.ctx.translate(0, moon.Game.HEIGHT);
                    this.ctx.scale(1, -1);
                    angle = -angle;
                } else if (filter == drawing.Filter.filterXY) {
                    x = moon.Game.WIDTH - x - 2 * center.x;
                    this.ctx.translate(moon.Game.WIDTH, 0);
                    this.ctx.scale(-1, 1);
                    y = moon.Game.HEIGHT - y - 2 * center.y;
                    this.ctx.translate(0, moon.Game.HEIGHT);
                    this.ctx.scale(1, -1);
                }


                this.ctx.translate(x + center.x, y + center.y); // 平移到目标位置
                this.ctx.rotate(angle); // 旋转

                this.ctx.globalAlpha = alpha || 1; // 设置透明度

                this.ctx.drawImage(image,
                    dest.x,
                    dest.y,
                    dest.width,
                    dest.height);

                this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 恢复坐标系
                this.ctx.globalAlpha = 1; // 回复透明度

            };
            /**
             * 绘制精灵，包括精灵额变换
             */
            Drawing2D.prototype.sprite = function(image, src, dest, center, angle, filter, alpha) {
                // 简单坐标系的变换
                let x = dest.x;
                let y = dest.y;

                dest.x = -center.x;
                dest.y = -center.y;


                // 镜面翻转
                if (filter == drawing.Filter.filterX) {
                    x = moon.Game.WIDTH - x - 2 * center.x;
                    this.ctx.translate(moon.Game.WIDTH, 0);
                    this.ctx.scale(-1, 1);
                    angle = -angle;
                } else if (filter == drawing.Filter.filterY) {
                    y = moon.Game.HEIGHT - y - 2 * center.y;
                    this.ctx.translate(0, moon.Game.HEIGHT);
                    this.ctx.scale(1, -1);
                    angle = -angle;
                } else if (filter == drawing.Filter.filterXY) {
                    x = moon.Game.WIDTH - x - 2 * center.x;
                    this.ctx.translate(moon.Game.WIDTH, 0);
                    this.ctx.scale(-1, 1);
                    y = moon.Game.HEIGHT - y - 2 * center.y;
                    this.ctx.translate(0, moon.Game.HEIGHT);
                    this.ctx.scale(1, -1);
                }


                this.ctx.translate(x + center.x, y + center.y); // 平移到目标位置
                this.ctx.rotate(angle); // 旋转

                this.ctx.globalAlpha = alpha || 1; // 设置透明度

                this.ctx.drawImage(image,
                    src.x,
                    src.y,
                    src.width,
                    src.height,
                    dest.x,
                    dest.y,
                    dest.width,
                    dest.height);

                this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 恢复坐标系
                this.ctx.globalAlpha = 1; // 回复透明度
            };
            /**
             * 绘制文字
             * @param {string} text 绘制的文字
             * @param {moon.Vector2} vec2 文字的坐标
             * @param {moon.Font} font 绘制的字体
             * @param {string} color 绘制的颜色 
             */
            Drawing2D.prototype.drawText = function(text, vec2, font, color) {
                this.ctx.textAlign = font.align;
                this.ctx.textBaseline = font.baseline;
                this.ctx.font = font.name;
                this.ctx.fillStyle = color || this.color;
                this.ctx.fillText(text, vec2.x, vec2.y);
            };
            /**
             * 清屏
             */
            Drawing2D.prototype.clear = function() {
                this.ctx.beginPath();
                this.ctx.fillStyle = this.clearColor;
                this.ctx.rect(0, 0, moon.Game.WIDTH, moon.Game.HEIGHT);
                this.ctx.fill();
            }
            return Drawing2D;
        }());

        // 3DWebgl
        drawing.Drawing3D = (function() {
            let drawing3D = {};


            /**
             * 测试选项，颜色、深度和模板
             */
            drawing3D.TestOption = {
                COLOR: 0,
                COLOR_DEPTH: 1,
                COLOR_DEPTH_STENCIL: 2
            }

            /**
             * 创建着色器程序
             * @param {context} gl 图形上下文
             * @param {string} vertexShader 顶点着色器
             * @param {string} fragmentShader 片段着色器
             */
            drawing3D.createProgram = function(gl, vertexShader, fragmentShader) {
                // 创建着色器程序
                // 顶点着色器
                let vShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vShader, vertexShader);
                gl.compileShader(vShader);
                // 片段着色器
                let fShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fShader, fragmentShader);
                gl.compileShader(fShader);
                // 链创建着色器程序并链接着色器
                let shaderProgram = gl.createProgram();
                gl.attachShader(shaderProgram, vShader);
                gl.attachShader(shaderProgram, fShader);
                gl.linkProgram(shaderProgram);
                return shaderProgram;
            }

            // 贴图
            drawing3D.Texture = (function() {
                /**
                 * 贴图类
                 * @param {texture} tex 贴图 
                 * @param {number} width 宽度
                 * @param {number} height 高度
                 */
                function Texture(tex, width, height) {
                    this.tex = tex;
                    this.width = width;
                    this.height = height;
                }
                /**
                 * 设置尺寸
                 */
                Texture.prototype.setSize = function(width, height) {
                    this.width = width;
                    this.height = height;
                };
                /**
                 * 获取webgl使用的贴图
                 */
                Texture.prototype.getTexture = function() {
                    return this.tex;
                };
                return Texture;
            }());

            // 着色器程序
            drawing3D.ShaderProgram = (function() {
                /**
                 * 着色器程序
                 */
                function ShaderProgram(name, gl, vertexShader, fragmentShader) {
                    this.name = name;
                    this.gl = null;
                    this.program = null;
                    if (gl) {
                        this.gl = gl;
                        this.program = drawing3D.createProgram(gl, vertexShader, fragmentShader);
                    }
                    this.uniforms = {};
                }
                /**
                 * 使用挡墙的着色器程序
                 */
                ShaderProgram.prototype.use = function() {
                    this.gl.useProgram(this.program);
                };
                return ShaderProgram;
            }());

            // 着色器程序管理器
            drawing3D.shaderProgramManager = (function() {
                /**
                 * 着色器程序
                 */
                function shaderProgramManager() {
                    this.programs = {};
                    this.currentProgram = null;
                }
                /**
                 * 添加着色器
                 */
                shaderProgramManager.prototype.add = function(program) {
                    if (JSON.stringify(this.programs) == '{}') {
                        if (this.currentProgram == null)
                            this.currentProgram = program; // 第一个着色器程序默认
                    }
                    this.programs[program.name] = program;
                };
                /**
                 * 使用着色器
                 */
                shaderProgramManager.prototype.useProgram = function(name) {
                    this.programs[name].use();
                    this.currentProgram = this.programs[name];
                };
                shaderProgramManager.prototype.hasProgram = function(name) {
                    if (this.programs[name])
                        return true;
                    return false;
                };
                return shaderProgramManager;
            }());

            /**
             * 向量
             */
            drawing3D.Vector = (function() {
                let vector = {};

                /**
                 * 三维向量
                 */
                vector.vec3 = (function() {
                    let v3 = {};

                    /**
                     * 向量叉乘
                     */
                    v3.cross = function(a, b, result) {
                        result = result || new Float32Array(3);
                        result[0] = a[1] * b[2] - a[2] * b[1];
                        result[1] = a[2] * b[0] - a[0] * b[2];
                        result[3] = a[0] * b[1] - a[1] * b[0];
                        return result;
                    }

                    /**
                     * 向量标准化
                     */
                    v3.normalize = function(vec3, result) {
                        result = result || new Float32Array(3);
                        if (vec3[0] == 0 && vec3[1] == 0 && vec3[2] == 0) {
                            result[0] = result[1] = result[2] = 0;
                            return result;
                        }

                        let l = Math.sqrt(vec3[0] * vec3[0] + vec3[1] * vec3[1] + vec3[2] * vec3[2])
                        result[0] = vec3[0] / l;
                        result[1] = vec3[1] / l;
                        result[2] = vec3[2] / l;
                        return result;
                    }

                    /**
                     * 两向量相加
                     */
                    v3.plus = function(a, b, result) {
                        result = result || new Float32Array(3);
                        result[0] = a[0] + b[0];
                        result[1] = a[1] + b[1];
                        result[2] = a[2] + b[2];
                        return result;
                    }

                    /**
                     * 两向量相减
                     */
                    v3.minus = function(a, b, result) {
                        result = result || new Float32Array(3);
                        result[0] = a[0] - b[0];
                        result[1] = a[1] - b[1];
                        result[2] = a[2] - b[2];
                        return result;
                    }

                    v3.multuply = function(a, t, result) {
                        result = result || new Float32Array(3);
                        result[0] = a[0] * t;
                        result[1] = a[1] * t;
                        result[2] = a[2] * t;
                        return result;
                    }

                    return v3;
                }());

                return vector;
            }());

            /**
             * 矩阵
             */
            drawing3D.Matrix = (function() {
                let mat = {};

                mat.mat4 = (function() {
                    let m4 = {};

                    // 单位矩阵
                    const origin = new Float32Array([
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1
                    ]);

                    /**
                     * 只读单位矩阵
                     */
                    m4.constOrigin = function() {
                        return origin;
                    }

                    /**
                     * 单位矩阵
                     */
                    m4.origin = function() {
                        return new Float32Array([
                            1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0, 1, 0,
                            0, 0, 0, 1
                        ]);
                    }

                    /**
                     * 将webgl坐标系化为画布坐标系
                     */
                    m4.ortho = function(left, right, bottom, top, near, far) {
                        let m = new Float32Array(16);
                        m[0] = 2 / (right - left);
                        m[1] = 0;
                        m[2] = 0;
                        m[3] = 0;
                        m[4] = 0;
                        m[5] = 2 / (top - bottom);
                        m[6] = 0;
                        m[7] = 0;
                        m[8] = 0;
                        m[9] = 0;
                        m[10] = 2 / (near - far);
                        m[11] = 0;
                        m[12] = (left + right) / (left - right);
                        m[13] = (bottom + top) / (bottom - top);
                        m[14] = (near + far) / (near - far);
                        m[15] = 1;
                        return m;
                    }

                    /**
                     * 矩阵平移
                     */
                    m4.translate = function(m, x, y, z) {
                        m[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
                        m[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
                        m[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
                        // return m;
                    }

                    /**
                     * 矩阵缩放
                     */
                    m4.scale = function(m, x, y, z) {
                        m[0] *= x;
                        m[1] *= x;
                        m[2] *= x;
                        m[3] *= x;
                        m[4] *= y;
                        m[5] *= y;
                        m[6] *= y;
                        m[7] *= y;
                        m[8] *= z;
                        m[9] *= z;
                        m[10] *= z;
                        m[11] *= z;
                        // return m;
                    }


                    /**
                     * 矩阵绕X轴旋转
                     */
                    m4.xRotate = function(m, angle) {
                        let cos = Math.cos(angle);
                        let sin = Math.sin(angle);

                        let m4 = m[4],
                            m5 = m[5],
                            m6 = m[6],
                            m7 = m[7];


                        m[4] = cos * m[4] + sin * m[8];
                        m[5] = cos * m[5] + sin * m[9];
                        m[6] = cos * m[6] + sin * m[10];
                        m[7] = cos * m[7] + sin * m[11];
                        m[8] = cos * m[8] - sin * m4;
                        m[9] = cos * m[9] - sin * m5;
                        m[10] = cos * m[10] - sin * m6;
                        m[11] = cos * m[11] - sin * m7;
                        // return m;
                    }

                    /**
                     * 矩阵绕Y轴旋转
                     */
                    m4.yRotate = function(m, angle) {
                        let cos = Math.cos(angle);
                        let sin = Math.sin(angle);

                        let m0 = m[0],
                            m1 = m[1],
                            m2 = m[2],
                            m3 = m[3];

                        m[0] = cos * m[0] - sin * m[8];
                        m[1] = cos * m[1] - sin * m[9];
                        m[2] = cos * m[2] - sin * m[10];
                        m[3] = cos * m[3] - sin * m[11];
                        m[8] = cos * m[8] + sin * m0;
                        m[9] = cos * m[9] + sin * m1;
                        m[10] = cos * m[10] + sin * m2;
                        m[11] = cos * m[11] + sin * m3;
                        // return m;
                    }

                    /**
                     * 矩阵绕Z轴旋转
                     */
                    m4.zRotate = function(m, angle) {
                        let cos = Math.cos(angle);
                        let sin = Math.sin(angle);

                        let m0 = m[0],
                            m1 = m[1],
                            m2 = m[2],
                            m3 = m[3];

                        m[0] = cos * m[0] + sin * m[4];
                        m[1] = cos * m[1] + sin * m[5];
                        m[2] = cos * m[2] + sin * m[6];
                        m[3] = cos * m[3] + sin * m[7];
                        m[4] = cos * m[4] - sin * m0;
                        m[5] = cos * m[5] - sin * m1;
                        m[6] = cos * m[6] - sin * m2;
                        m[7] = cos * m[7] - sin * m3;
                        // return m;
                    }

                    /**
                     * 摄像机朝向矩阵
                     */
                    m4.lookAt = function(cameraPos, target, up) {
                        let result = new Float32Array(16);

                        let z = drawing3D.Vector.vec3.normalize(
                            drawing3D.Vector.vec3.minus(cameraPos, target)
                        );

                        let x = drawing3D.Vector.vec3.normalize(
                            drawing3D.Vector.vec3.cross(up, z)
                        );

                        let y = drawing3D.Vector.vec3.normalize(
                            drawing3D.Vector.vec3.cross(z, x)
                        );

                        result[0] = x[0];
                        result[1] = x[1];
                        result[2] = x[2];
                        result[3] = 0;
                        result[4] = y[0];
                        result[5] = y[1];
                        result[6] = y[2];
                        result[7] = 0;
                        result[8] = z[0];
                        result[9] = z[1];
                        result[10] = z[2];
                        result[11] = 0;
                        result[12] = cameraPos[0];
                        result[13] = cameraPos[1];
                        result[14] = cameraPos[2];
                        result[15] = 1;
                        return result;
                    }

                    m4.perspective = function(radians, aspect, near, far) {
                        let m = new Float32Array(16);

                        let f = Math.tan(Math.PI * 0.5 - 0.5 * radians);
                        let range = 1.0 / (near - far);

                        m[0] = f / aspect;
                        m[1] = 0;
                        m[2] = 0;
                        m[3] = 0;
                        m[4] = 0;
                        m[5] = f;
                        m[6] = 0;
                        m[7] = 0;
                        m[8] = 0;
                        m[9] = 0;
                        m[10] = (near + far) * range;
                        m[11] = -1;
                        m[12] = 0;
                        m[13] = 0;
                        m[14] = near * far * range * 2;
                        m[15] = 0;

                        return m;
                    }

                    return m4;
                }());


                return mat;
            }());

            // 2D绘图
            drawing3D.Drawing2D = (function() {
                /**
                 * 着色器程序
                 */
                const SHADER = {
                    /**
                     * 简单着色器
                     */
                    SIMPLE: {
                        VERTEX_SHADER: // 顶点着色器
                            'attribute vec4 a_Position;' +
                            'attribute vec2 a_TexCoord;' +
                            'uniform mat4 u_Projection;' + // 坐标系转换矩阵
                            'uniform mat4 u_View;' + // 摄像机矩阵
                            'uniform mat4 u_Transform;' + // 变换矩阵
                            'uniform mat4 u_TexTransform;' +
                            'varying vec2 v_TexCoord;' +
                            'void main() {' +
                            'gl_Position = u_Projection * u_View * u_Transform * a_Position;' +
                            'v_TexCoord = (u_TexTransform * vec4(a_TexCoord, 0, 1.0)).xy;' +
                            '}',
                        FRAGMENT_SHADER: // 片段着色器
                            'precision mediump float;' +
                            'uniform sampler2D u_Sampler;' +
                            'uniform vec4 u_Color;' +
                            'varying vec2 v_TexCoord;' +
                            'void main() {' +
                            'gl_FragColor = u_Color * texture2D(u_Sampler, v_TexCoord);' + // 叠加颜色
                            'if(gl_FragColor.a < 0.1) discard;' + // 显示透明度使用
                            '}'
                    },
                    SIMPLE_LIGHT: {
                        VERTEX_SHADER: // 顶点着色器
                            'attribute vec4 a_Position;' +
                            'attribute vec2 a_TexCoord;' +
                            'uniform mat4 u_Projection;' + // 坐标系转换矩阵
                            'uniform mat4 u_View;' + // 摄像机矩阵
                            'uniform mat4 u_Transform;' + // 变换矩阵
                            'uniform mat4 u_TexTransform;' +
                            'varying vec2 v_TexCoord;' +
                            'varying vec3 v_FragPosition;' +
                            'void main() {' +
                            'vec4 transPosition = u_Transform * a_Position;' +
                            'v_FragPosition = transPosition.xyz;' +
                            'gl_Position = u_Projection * u_View * transPosition;' +
                            'v_TexCoord = (u_TexTransform * vec4(a_TexCoord, 0, 1.0)).xy;' +
                            '}',
                        FRAGMENT_SHADER: // 片段着色器
                            'precision mediump float;' +
                            'const int MAX_LIGHT = 100;' + // 最多100个灯光
                            'struct Light {' +
                            'vec3 position;' + // 灯光位置
                            'float radius;' + // 灯光边界
                            'float innerRadius;' + // 灯光内边界
                            'vec3 color;' +
                            '};' + // 灯光
                            'uniform Light lights[MAX_LIGHT];' + // 灯光数组
                            'uniform int u_LightCount;' + // 灯光数量
                            'uniform float u_Ambient;' + // 环境光强度
                            'uniform vec3 u_AmbientColor;' + // 环境光颜色
                            'uniform sampler2D u_Sampler;' +
                            'uniform vec4 u_Color;' + // 叠加颜色
                            'varying vec2 v_TexCoord;' +
                            'varying vec3 v_FragPosition;' +
                            'void main() {' +
                            'vec4 result = vec4(0.0);' + // 计算的颜色结果
                            'bool noLight = true;' + // 未照到光线
                            'for(int i = 0; i < MAX_LIGHT; i++) {' + // 循环遍历每一个灯光
                            'if (i >= u_LightCount) break;' + // 因为数组不支持变量，因此限制循环条件（webgl1.0的问题）
                            'float dist = distance(lights[i].position, v_FragPosition);' + // 计算距离
                            'if (dist <= lights[i].radius) {' +
                            'float epsilon = lights[i].innerRadius - lights[i].radius;' + // 计算内外圈差值
                            'vec4 ori = vec4(1.0);' +
                            'vec3 lcolor = lights[i].color;' +
                            'if (epsilon != 0.0)' +
                            'lcolor *= clamp((dist - lights[i].radius) / epsilon, u_Ambient, 1.0);' + // 计算灯光渐变
                            'vec4 light = vec4(lcolor, 1.0);' +
                            'result = (ori - ((ori - light) * (ori - result)));' + // 光线混合算法
                            'noLight = false;' +
                            '}' +
                            '}' +
                            'if (noLight) result = vec4((u_AmbientColor * u_Ambient), 1.0);' + // 如果没有被光照到
                            'gl_FragColor = result * u_Color * texture2D(u_Sampler, v_TexCoord);' + // 叠加颜色
                            'if (gl_FragColor.a < 0.1) discard;' + // 显示透明度使用
                            '}'
                    },
                    /**
                     * 暂时取消使用
                     * 简单3D灯光着色器
                     */
                    SIMPLE_LIGHT3D: {
                        VERTEX_SHADER: // 顶点着色器
                            'attribute vec4 a_Position;' +
                            'attribute vec2 a_TexCoord;' +
                            'uniform mat4 u_Projection;' + // 坐标系转换矩阵
                            'uniform mat4 u_View;' + // 摄像机矩阵
                            'uniform mat4 u_Transform;' + // 变换矩阵
                            'uniform mat4 u_TexTransform;' +
                            'varying vec2 v_TexCoord;' +
                            'varying vec3 v_FragPosition;' +
                            'void main() {' +
                            'vec4 transPosition = u_Transform * a_Position;' +
                            'v_FragPosition = transPosition.xyz;' +
                            'gl_Position = u_Projection * u_View * transPosition;' +
                            'v_TexCoord = (u_TexTransform * vec4(a_TexCoord, 0, 1.0)).xy;' +
                            '}',
                        FRAGMENT_SHADER: // 片段着色器
                            'precision mediump float;' +
                            'const int MAX_LIGHT = 10;' + // 最多10个灯光
                            'struct Light {' +
                            'vec3 position;' + // 灯光位置
                            'vec3 direction;' + // 灯光朝向
                            'float cutOff;' + // 灯光边界
                            'vec3 color;' +
                            '};' + // 灯光
                            'uniform Light lights[MAX_LIGHT];' + // 灯光数组
                            'uniform int u_LightCount;' + // 灯光数量
                            'uniform float u_Ambient;' + // 环境光强度
                            'uniform vec3 u_AmbientColor;' + // 环境光颜色
                            'uniform sampler2D u_Sampler;' +
                            'uniform vec4 u_Color;' + // 叠加颜色
                            'varying vec2 v_TexCoord;' +
                            'varying vec3 v_FragPosition;' +
                            'void main() {' +
                            'vec4 result = vec4(0.0);' + // 计算的颜色结果
                            'bool noLight = true;' + // 未照到光线
                            'for(int i = 0; i < MAX_LIGHT; i++) {' + // 循环遍历每一个灯光
                            'if (i >= u_LightCount) break;' + // 因为数组不支持变量，因此限制循环条件
                            'vec3 lightDir = normalize(lights[i].position - v_FragPosition);' + // 计算片段指向光源的向量
                            'float theta = dot(lightDir, normalize(-lights[i].direction));' + // 计算差值
                            'if (theta > lights[i].cutOff) {' +
                            'vec4 ori = vec4(1.0);' +
                            'vec4 light = vec4(lights[i].color, 1.0);' +
                            'result = (ori - ((ori - light) * (ori - result)));' + // 光线混合算法
                            'noLight = false;' +
                            '}' +
                            '}' +
                            'if (noLight) result = vec4((u_AmbientColor * u_Ambient), 1.0);' + // 如果没有被光照到
                            'gl_FragColor = result * u_Color * texture2D(u_Sampler, v_TexCoord);' + // 叠加颜色
                            'if (gl_FragColor.a < 0.1) discard;' + // 显示透明度使用
                            '}'
                    }
                }

                // 绘制图片的顶点
                // 图片占整个绘制区域的大小
                // 每四位为一组，前两位是webgl坐标，笛卡尔坐标系
                // 后两位是贴图坐标，是左下角为坐标系原点
                const IMAGE_VERTICES = new Float32Array([
                    0.0, 1.0, 0.0, 1.0,
                    0.0, 0.0, 0.0, 0.0,
                    1.0, 1.0, 1.0, 1.0,
                    1.0, 0.0, 1.0, 0.0
                ]);

                /**
                 * 3DWebgl的2D图形类
                 * @param {context} ctx 图形上下文
                 */
                function Drawing2D(ctx) {
                    this.gl = ctx; // 因为是webgl，因此使用gl代表上下文
                    // this.clearColor = '#ffffff'; // 清屏颜色
                    this.color = '#000000'; // 全局绘图颜色
                    this.fillColor = '#bbffff'; // 全局填充色
                    this.width = 1; // 全局绘图大小
                    this.imageColor = new Float32Array([1.0, 1.0, 1.0, 1.0]); // 默认叠加色

                    this.gl.clearColor(255, 255, 255, 255); // 设置清屏颜色

                    // 调整绘制小于等于缓冲区大小
                    this.gl.depthFunc(this.gl.LEQUAL);

                    // 化为坐标系的矩阵
                    this.projection = drawing3D.Matrix.mat4.ortho(0, moon.Game.WIDTH, moon.Game.HEIGHT, 0, -1, 1);

                    // 摄像机矩阵
                    this.view = moon.Game.Camera.getMatrix();

                    // 清屏选项，默认只清理颜色
                    this.clearOption = this.gl.COLOR_BUFFER_BIT;

                    this.shaderProgramManager = new drawing3D.shaderProgramManager();

                    // 默认创建简单着色器
                    this.changeProgram(Drawing2D.ShaderProgram.type.simple);


                    // TEMP ====================================
                    // 绑定缓冲
                    // 创建顶点缓冲
                    let vertexBuffer = this.gl.createBuffer();
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer); // 绑定缓冲
                }
                Drawing2D.prototype.constructor = Drawing2D; // 构造函数
                // 静态函数=============================

                Drawing2D.ShaderProgram = (function() {
                    let shaderProgram = {};
                    /**
                     * 着色器程序类型
                     */
                    shaderProgram.type = {
                        simple: 'simple',
                        simpleLight: 'simpleLight'
                    }

                    // 简单着色器程序
                    shaderProgram.Simple = (function() {
                        /**
                         * 简单着色器
                         */
                        function Simple(name, gl, vertexShader, fragmentShader) {
                            drawing3D.ShaderProgram.call(this, name, gl, vertexShader, fragmentShader);
                            if (!this.gl)
                                return;
                            // 获取不变对象
                            this.uniforms = {
                                u_Projection: this.gl.getUniformLocation(this.program, 'u_Projection'),
                                u_View: this.gl.getUniformLocation(this.program, 'u_View'),
                                u_Transform: this.gl.getUniformLocation(this.program, 'u_Transform'),
                                u_TexTransform: this.gl.getUniformLocation(this.program, 'u_TexTransform'),
                                u_Color: this.gl.getUniformLocation(this.program, 'u_Color')
                            };
                        }
                        Simple.prototype = new drawing3D.ShaderProgram();
                        Simple.prototype.constructor = Simple;
                        /**
                         * 设置坐标系矩阵
                         */
                        Simple.prototype.setProjection = function(projection) {
                            this.gl.uniformMatrix4fv(this.uniforms.u_Projection, false, projection);
                        };
                        /**
                         * 设置摄像机矩阵
                         */
                        Simple.prototype.setView = function(view) {
                            this.gl.uniformMatrix4fv(this.uniforms.u_View, false, view);
                        };
                        /**
                         * 设置变换矩阵
                         */
                        Simple.prototype.setTransform = function(transform) {
                            this.gl.uniformMatrix4fv(this.uniforms.u_Transform, false, transform);
                        };
                        /**
                         * 设置贴图矩阵
                         */
                        Simple.prototype.setTexTransform = function(transform) {
                            this.gl.uniformMatrix4fv(this.uniforms.u_TexTransform, false, transform);
                        };
                        /**
                         * 设置颜色矩阵
                         */
                        Simple.prototype.setColor = function(color) {
                            this.gl.uniform4fv(this.uniforms.u_Color, color);
                        };
                        return Simple;
                    }());

                    shaderProgram.SimpleLight = (function() {
                        /**
                         * 简单灯光着色器
                         */
                        function SimpleLight(name, gl, vertexShader, fragmentShader) {
                            shaderProgram.Simple.call(this, name, gl, vertexShader, fragmentShader);
                            // 添加不变对象
                            this.uniforms.u_Ambient = this.gl.getUniformLocation(this.program, 'u_Ambient'); // 环境光强度
                            this.uniforms.u_AmbientColor = this.gl.getUniformLocation(this.program, 'u_AmbientColor'); // 环境光颜色
                            this.uniforms.u_LightCount = this.gl.getUniformLocation(this.program, 'u_LightCount'); // 灯光数量
                            // 存储灯光
                            this.lights = [];
                        }
                        SimpleLight.prototype = new shaderProgram.Simple();
                        SimpleLight.prototype.constructor = SimpleLight;
                        /**
                         * 初始化灯光环境
                         */
                        SimpleLight.prototype.init = function() {
                            // 默认环境光强度为1，颜色为白色
                            this.setAmbient(1);
                            this.setAmbientColor(new Float32Array([1.0, 1.0, 1.0]));
                        };
                        /**
                         * 设置环境光强度
                         */
                        SimpleLight.prototype.setAmbient = function(ambient) {
                            this.gl.uniform1f(this.uniforms.u_Ambient, ambient);
                        };
                        /**
                         * 设置环境光颜色
                         */
                        SimpleLight.prototype.setAmbientColor = function(color) {
                            this.gl.uniform3fv(this.uniforms.u_AmbientColor, color);
                        };
                        /**
                         * 设置环境光数量
                         */
                        SimpleLight.prototype.setLightCount = function(count) {
                            this.gl.uniform1i(this.uniforms.u_LightCount, count);
                        };
                        SimpleLight.prototype.addLight = function(position, radius, innerRadius, color) {
                            let i = this.lights.length;
                            let light = {
                                color: this.gl.getUniformLocation(this.program, 'lights[' + i + '].color'),
                                position: this.gl.getUniformLocation(this.program, 'lights[' + i + '].position'),
                                radius: this.gl.getUniformLocation(this.program, 'lights[' + i + '].radius'),
                                innerRadius: this.gl.getUniformLocation(this.program, 'lights[' + i + '].innerRadius')
                            };

                            this.setLightCount(i + 1); // 添加灯光

                            // 设置当前灯光属性
                            this.gl.uniform3fv(light.position, new Float32Array([position.x, position.y, 1]));
                            this.gl.uniform1f(light.radius, radius);
                            this.gl.uniform1f(light.innerRadius, innerRadius || 0);
                            this.gl.uniform3fv(light.color, color || new Float32Array([1.0, 1.0, 1.0]));

                            this.lights.push(light); // 添加灯光
                            return i;
                        };
                        /**
                         * 弹出最后一个灯光
                         */
                        SimpleLight.prototype.popLight = function() {
                            return this.lights.pop();
                        };
                        /**
                         * 改变灯光位置
                         */
                        SimpleLight.prototype.changeLightPosition = function(index, position) {
                            this.gl.uniform3fv(this.lights[index].position, new Float32Array([position.x, position.y, 1]));
                        };
                        /**
                         * 改变灯光半径
                         */
                        SimpleLight.prototype.changeLightRadius = function(index, radius) {
                            this.gl.uniform1f(this.lights[index].radius, radius);
                        };
                        /**
                         * 改变灯光内半径
                         */
                        SimpleLight.prototype.changeLightInnerRadius = function(index, radius) {
                            this.gl.uniform1f(this.lights[index].innerRadius, radius);
                        };
                        /**
                         * 改变灯光颜色
                         */
                        SimpleLight.prototype.changeLightColor = function(index, color) {
                            this.gl.uniform3fv(this.lights[index].color, color);
                        };
                        return SimpleLight;
                    }());
                    return shaderProgram;
                }());


                // ====================================
                /**
                 * 设置清屏颜色
                 */
                Drawing2D.prototype.setClearColor = function(r, g, b, a) {
                    this.gl.clearColor(r, g, b, a);
                };
                /**
                 * 设置测试选项
                 */
                Drawing2D.prototype.setTestOption = function(option) {
                    switch (option) {
                        case drawing3D.TestOption.COLOR:
                            this.gl.disable(this.gl.DEPTH_TEST); // 关闭深度测试
                            this.gl.disable(this.gl.STENCIL_TEST); // 关闭模板测试
                            this.clearOption = this.gl.COLOR_BUFFER_BIT;
                            break;
                        case drawing3D.TestOption.COLOR_DEPTH:
                            this.gl.enable(this.gl.DEPTH_TEST); // 开启深度测试
                            this.gl.disable(this.gl.STENCIL_TEST); // 关闭模板测试
                            this.clearOption = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT;
                            break;
                        case drawing3D.TestOption.COLOR_DEPTH_STENCIL:
                            this.gl.enable(this.gl.DEPTH_TEST); // 开启深度测试
                            this.gl.enable(this.gl.STENCIL_TEST); // 开启模板测试
                            this.clearOption = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT;
                            break;
                    }
                };
                /**
                 * 切换着色器程序
                 */
                Drawing2D.prototype.changeProgram = function(name) {
                    let program = this.shaderProgramManager.hasProgram(name);
                    if (!program) {
                        let pro;
                        switch (name) {
                            case Drawing2D.ShaderProgram.type.simple:
                                pro = new Drawing2D.ShaderProgram.Simple(
                                    name,
                                    this.gl,
                                    SHADER.SIMPLE.VERTEX_SHADER,
                                    SHADER.SIMPLE.FRAGMENT_SHADER
                                );
                                this.shaderProgramManager.add(pro);
                                break;
                            case Drawing2D.ShaderProgram.type.simpleLight:
                                pro = new Drawing2D.ShaderProgram.SimpleLight(
                                    name,
                                    this.gl,
                                    SHADER.SIMPLE_LIGHT.VERTEX_SHADER,
                                    SHADER.SIMPLE_LIGHT.FRAGMENT_SHADER
                                );
                                this.shaderProgramManager.add(pro);
                                break;
                        }
                    }
                    this.shaderProgramManager.useProgram(name);
                    this.shaderProgramManager.currentProgram.setProjection(this.projection);
                };

                /**
                 * 创建贴图，为绘制的图片
                 */
                Drawing2D.prototype.createTexture = function(image, width, height) {
                    let gl = this.gl;
                    // 获取每一个元素的所占大小
                    let FSIZE = IMAGE_VERTICES.BYTES_PER_ELEMENT;

                    // 创建顶点缓冲
                    // let vertexBuffer = gl.createBuffer();
                    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // 绑定缓冲
                    gl.bufferData(gl.ARRAY_BUFFER, IMAGE_VERTICES, gl.STATIC_DRAW); // 填写缓冲区,静态绘制

                    // 传输着色器程序内容
                    let a_Position = gl.getAttribLocation(this.shaderProgramManager.currentProgram.program, 'a_Position');
                    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0); // 将前两位坐标填入
                    gl.enableVertexAttribArray(a_Position);

                    let a_TexCoord = gl.getAttribLocation(this.shaderProgramManager.currentProgram.program, 'a_TexCoord'); // 贴图坐标
                    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2); // 将后两位填入
                    gl.enableVertexAttribArray(a_TexCoord);

                    // 创建贴图
                    let tex = gl.createTexture();
                    let u_Sampler = gl.getUniformLocation(this.shaderProgramManager.currentProgram.program, 'u_Sample'); // 获取样本值


                    // 贴图类
                    let texure = new drawing3D.Texture(tex, width || image.width, height || image.height);
                    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // 将贴图关于Y轴镜像处理
                    gl.activeTexture(gl.TEXTURE0); // 激活图元0，因为不需要叠加图元，所以激活一个即可

                    gl.bindTexture(gl.TEXTURE_2D, tex); // 绑定贴图

                    // 设置插值
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    // 临近处理，这样不需要2^n图像也可以伸展使用
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

                    // 不预反乘ALPHA，SpriteFont使用
                    // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

                    // 绑定图片
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                    // 将样本设置为图元0
                    gl.uniform1i(u_Sampler, 0);

                    return texure;
                };
                /**
                 * 绘制图片
                 */
                Drawing2D.prototype.drawPicture = function(texture, dest, color, depth) {
                        let gl = this.gl;
                        // 使用2D绘图着色器程序
                        // gl.useProgram(this.program);
                        // 激活图元0
                        gl.activeTexture(gl.TEXTURE0);
                        // 绑定贴图
                        gl.bindTexture(gl.TEXTURE_2D, texture.tex);

                        // 使用四阶矩阵
                        let mat4 = drawing3D.Matrix.mat4;

                        // 设置转换坐标系矩阵
                        // let u_Projection = gl.getUniformLocation(this.program, 'u_Projection');
                        // gl.uniformMatrix4fv(u_Projection, false, this.projection);

                        // 设置视角矩阵
                        // let u_View = gl.getUniformLocation(this.program, 'u_View');
                        // gl.uniformMatrix4fv(this.uniform.u_View, false, moon.Game.Camera.getMatrix());
                        this.shaderProgramManager.currentProgram.setView(moon.Game.Camera.getMatrix());

                        // 进行坐标变换
                        // 获取着色器变换值
                        // let u_Transform = gl.getUniformLocation(this.program, 'u_Transform');
                        // 转换坐标系，并生成矩阵
                        let mt = mat4.origin();
                        // 平移矩阵
                        mat4.translate(mt, dest.x, dest.y, depth || 0);
                        // 放大矩阵
                        mat4.scale(mt, dest.width, dest.height, 1);

                        // // 设置矩阵
                        // gl.uniformMatrix4fv(this.uniform.u_Transform, false, mt);
                        this.shaderProgramManager.currentProgram.setTransform(mt);

                        // 贴图坐标变换
                        // let u_TexTransform = gl.getUniformLocation(this.program, 'u_TexTransform');
                        // gl.uniformMatrix4fv(this.uniform.u_TexTransform, false, mat4.constOrigin());
                        this.shaderProgramManager.currentProgram.setTexTransform(mat4.constOrigin());

                        // 设置叠加色
                        // let u_Color = gl.getUniformLocation(this.program, 'u_Color');

                        // 设置叠加色
                        // gl.uniform4fv(this.uniform.u_Color, color || this.imageColor);
                        this.shaderProgramManager.currentProgram.setColor(color || this.imageColor);

                        // 绘制三角形带
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    }
                    /**
                     * 绘制精灵
                     */
                Drawing2D.prototype.drawSprite = function(texture, src, dest, color, depth) {
                    let gl = this.gl;
                    // 使用2D绘图着色器程序
                    // gl.useProgram(this.program);
                    // 激活图元0
                    gl.activeTexture(gl.TEXTURE0);
                    // 绑定贴图
                    gl.bindTexture(gl.TEXTURE_2D, texture.tex);


                    // 使用四阶矩阵
                    let mat4 = drawing3D.Matrix.mat4;

                    // 设置转换坐标系矩阵
                    // let u_Projection = gl.getUniformLocation(this.program, 'u_Projection');
                    // gl.uniformMatrix4fv(u_Projection, false, this.projection);

                    // 设置视角矩阵
                    // let u_View = gl.getUniformLocation(this.program, 'u_View');
                    // gl.uniformMatrix4fv(this.uniform.u_View, false, moon.Game.Camera.getMatrix());
                    this.shaderProgramManager.currentProgram.setView(moon.Game.Camera.getMatrix());

                    // 进行坐标变换
                    // 获取着色器变换值
                    // let u_Transform = gl.getUniformLocation(this.program, 'u_Transform');

                    // 转换坐标系，并生成矩阵
                    let mt = mat4.origin();
                    // 平移矩阵
                    mat4.translate(mt, dest.x, dest.y, depth || 0);
                    // 放大矩阵
                    mat4.scale(mt, dest.width, dest.height, 1);

                    // // 设置矩阵
                    // gl.uniformMatrix4fv(this.uniform.u_Transform, false, mt);
                    this.shaderProgramManager.currentProgram.setTransform(mt);

                    // 贴图坐标变换
                    // let u_TexTransform = gl.getUniformLocation(this.program, 'u_TexTransform');

                    // 贴图四阶矩阵
                    let tmt = mat4.origin();
                    // 平移贴图
                    mat4.translate(tmt, src.x / texture.width, src.y / texture.height, 0);
                    //缩放贴图
                    mat4.scale(tmt, src.width / texture.width, src.height / texture.height, 1);
                    // gl.uniformMatrix4fv(this.uniform.u_TexTransform, false, tmt);
                    this.shaderProgramManager.currentProgram.setTexTransform(tmt);

                    // 设置叠加色
                    // let u_Color = gl.getUniformLocation(this.program, 'u_Color');

                    // 设置叠加色
                    // gl.uniform4fv(this.uniform.u_Color, color || this.imageColor);
                    this.shaderProgramManager.currentProgram.setColor(color || this.imageColor);

                    // 绘制三角形带
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                };
                /**
                 * 绘制一整张图片，包括图片的变换
                 */
                Drawing2D.prototype.picture = function(texture, dest, center, angle, filter, color, depth) {
                    let gl = this.gl;
                    // 使用2D绘图着色器程序
                    // gl.useProgram(this.program);
                    // 激活图元0
                    gl.activeTexture(gl.TEXTURE0);
                    // 绑定贴图
                    gl.bindTexture(gl.TEXTURE_2D, texture.tex);

                    // 使用四阶矩阵
                    let mat4 = drawing3D.Matrix.mat4;
                    // 设置转换坐标系矩阵
                    // let u_Projection = gl.getUniformLocation(this.program, 'u_Projection');
                    // gl.uniformMatrix4fv(u_Projection, false, this.projection);

                    // 设置视角矩阵
                    // let u_View = gl.getUniformLocation(this.program, 'u_View');
                    // gl.uniformMatrix4fv(this.uniform.u_View, false, moon.Game.Camera.getMatrix());
                    this.shaderProgramManager.currentProgram.setView(moon.Game.Camera.getMatrix());

                    // 进行坐标变换
                    // 获取着色器变换值
                    // let u_Transform = gl.getUniformLocation(this.program, 'u_Transform');

                    // 转换坐标系，并生成矩阵
                    let mt = mat4.origin();

                    // 将中心点移动到原点
                    mat4.translate(mt, center.x + dest.x, center.y + dest.y, 0);
                    mat4.zRotate(mt, angle);

                    // 镜像处理
                    if (filter == drawing.Filter.filterX)
                        mat4.yRotate(mt, Math.PI);
                    else if (filter == drawing.Filter.filterY)
                        mat4.xRotate(mt, Math.PI);
                    else if (filter == drawing.Filter.filterXY) {
                        mat4.yRotate(mt, Math.PI);
                        mat4.xRotate(mt, Math.PI);
                    }

                    // 平移矩阵
                    mat4.translate(mt, -center.x, -center.y, depth || 0);
                    // 放大矩阵
                    mat4.scale(mt, dest.width, dest.height, 1);

                    // // 设置矩阵
                    // gl.uniformMatrix4fv(this.uniform.u_Transform, false, mt);
                    this.shaderProgramManager.currentProgram.setTransform(mt);

                    // 贴图坐标变换
                    // let u_TexTransform = gl.getUniformLocation(this.program, 'u_TexTransform');
                    // gl.uniformMatrix4fv(this.uniform.u_TexTransform, false, mat4.constOrigin());
                    this.shaderProgramManager.currentProgram.setTexTransform(mat4.constOrigin());

                    // 设置叠加色
                    // let u_Color = gl.getUniformLocation(this.program, 'u_Color');

                    // 设置叠加色
                    // gl.uniform4fv(this.uniform.u_Color, color || this.imageColor);
                    this.shaderProgramManager.currentProgram.setColor(color || this.imageColor);

                    // 绘制三角形带
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                };
                /**
                 * 绘制一张精灵，包括精灵的变换
                 */
                Drawing2D.prototype.sprite = function(texture, src, dest, center, angle, filter, color, depth) {
                    let gl = this.gl;
                    // 使用2D绘图着色器程序
                    // gl.useProgram(this.program);
                    // 激活图元0
                    gl.activeTexture(gl.TEXTURE0);
                    // 绑定贴图
                    gl.bindTexture(gl.TEXTURE_2D, texture.tex);

                    // 使用四阶矩阵
                    let mat4 = drawing3D.Matrix.mat4;
                    // 设置转换坐标系矩阵
                    // let u_Projection = gl.getUniformLocation(this.program, 'u_Projection');
                    // gl.uniformMatrix4fv(u_Projection, false, this.projection);

                    // 设置视角矩阵
                    // let u_View = gl.getUniformLocation(this.program, 'u_View');
                    // gl.uniformMatrix4fv(this.uniform.u_View, false, moon.Game.Camera.getMatrix());
                    this.shaderProgramManager.currentProgram.setView(moon.Game.Camera.getMatrix());

                    // 进行坐标变换
                    // 获取着色器变换值
                    // let u_Transform = gl.getUniformLocation(this.program, 'u_Transform');
                    // 转换坐标系，并生成矩阵
                    let mt = mat4.origin();

                    // 将中心点移动到原点
                    mat4.translate(mt, center.x + dest.x, center.y + dest.y, depth || 0);
                    mat4.zRotate(mt, angle);

                    // 镜像处理
                    if (filter == drawing.Filter.filterX)
                        mat4.yRotate(mt, Math.PI);
                    else if (filter == drawing.Filter.filterY)
                        mat4.xRotate(mt, Math.PI);
                    else if (filter == drawing.Filter.filterXY) {
                        mat4.yRotate(mt, Math.PI);
                        mat4.xRotate(mt, Math.PI);
                    }

                    // 平移矩阵
                    mat4.translate(mt, -center.x, -center.y, 0);
                    // 放大矩阵
                    mat4.scale(mt, dest.width, dest.height, 1);

                    // // 设置矩阵
                    // gl.uniformMatrix4fv(this.uniform.u_Transform, false, mt);
                    this.shaderProgramManager.currentProgram.setTransform(mt);

                    // 贴图坐标变换
                    // let u_TexTransform = gl.getUniformLocation(this.program, 'u_TexTransform');

                    // 贴图四阶矩阵
                    let tmt = mat4.origin();
                    // 平移贴图
                    mat4.translate(tmt, src.x / texture.width, src.y / texture.height, 0);
                    //缩放贴图
                    mat4.scale(tmt, src.width / texture.width, src.height / texture.height, 1);

                    // gl.uniformMatrix4fv(this.uniform.u_TexTransform, false, tmt);
                    this.shaderProgramManager.currentProgram.setTexTransform(tmt);

                    // 设置叠加色
                    // let u_Color = gl.getUniformLocation(this.program, 'u_Color');

                    // 设置叠加色
                    // gl.uniform4fv(this.uniform.u_Color, color || this.imageColor);
                    this.shaderProgramManager.currentProgram.setColor(color || this.imageColor);

                    // 绘制三角形带
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                };

                /**
                 * 清理屏幕
                 */
                Drawing2D.prototype.clear = function() {
                    this.gl.clear(this.clearOption);
                };

                return Drawing2D;
            }());
            return drawing3D;
        }());

        // 文字贴图
        drawing.SpriteFont = (function() {
            let spriteFont = {};

            spriteFont.Font = (function() {
                /**
                 * 字体类，不直接创建，通过方法创建
                 */
                function Font(image, option) {
                    this.image = image;
                    this.option = option;
                    this.color = new Float32Array([0, 0, 0, 1]);
                }
                /**
                 * 绘制字体
                 */
                Font.prototype.draw = function(text, x, y, color, depth) {
                    let G = moon.Game.Drawing2D;
                    let gl = G.gl;

                    // 开启alpha混合
                    gl.enable(gl.BLEND);
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);


                    let offsetx = 0;
                    let offsety = 0;
                    let src = new Moon.Rectangle(0, 0, this.option.width, this.option.width);
                    let dest = new Moon.Rectangle(0, 0, this.option.width, this.option.width);
                    for (let i = 0; i < text.length; i++) {
                        if (text[i] == '\n') {
                            offsety += this.option.width;
                            offsetx = 0;
                            continue;
                        }

                        src.x = this.option.text[text[i]].x * this.option.width;
                        src.y = this.option.text[text[i]].y * this.option.width;
                        src.width = this.option.text[text[i]].width; // 设置绘制宽度
                        dest.x = x + offsetx;
                        dest.y = y + offsety;
                        dest.width = src.width;
                        G.drawSprite(this.image, src, dest, color || this.color, depth || 0);
                        offsetx += src.width;
                    }

                    // 关闭alpha混合
                    gl.disable(gl.BLEND);
                };
                /**
                 * 获取一个文字的大小
                 */
                Font.prototype.measure = function(text) {
                    return this.option.text[text].width;
                };
                return Font;
            }());

            /**
             * 创建精灵字体
             */
            spriteFont.createSpriteFont = function(text, font, size, color) {
                text += ''; // 将其转化为字符串

                // 创建画布和上下文
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');

                // 保存结果
                let result = {};
                result.width = 0; // 设置大小
                result.text = {};


                ctx.font = size + 'px ' + font; // 设置字体
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top'; // 设置文字位置

                let measureResult; // 测量结果值

                let maxWidth = 0; // 最大字体大小
                let length = 0; // 不重复的文字数目

                let descent = 0; // 文字的偏移

                // 第一次循环，找到最大的一个字符作为基本字符大小
                // 并且能够计算出画布的大小
                // 并排除相同的文字
                for (let i = 0; i < text.length; i++) {
                    // 排除相同的文字
                    if (result.text[text[i]])
                        continue;


                    length++; // 计算不重复的文字数量

                    measureResult = ctx.measureText(text[i]);


                    result.text[text[i]] = {
                        width: Math.ceil(measureResult.width)
                    }; // 将文字放入信息中

                    if (maxWidth < measureResult.width)
                        maxWidth = measureResult.width;

                    if (measureResult.actualBoundingBoxDescent) { // 查看是否有值
                        let des = measureResult.actualBoundingBoxDescent;
                        if (descent < des)
                            descent = des;
                    }
                }

                maxWidth = Math.floor((maxWidth > size ? maxWidth : size)); // 设置最大大小
                descent = Math.ceil(descent);

                // 两像素偏移
                if (descent > maxWidth) {
                    let max = descent;
                    descent = descent - maxWidth + 1;
                    maxWidth = max + 1;
                } else {
                    descent = 2;
                    maxWidth += 2;
                }


                // 设置文字大小
                result.width = maxWidth;

                // 找出最大之后，计算出行和列的文字数目
                let countX = Math.ceil(Math.sqrt(length));
                let countY = Math.ceil(length / countX);
                // 设置画布大小
                canvas.width = countX * maxWidth;
                canvas.height = countY * maxWidth;

                // 修改了画布大小之后，画布设置重置了
                // 重新设置字体信息
                ctx.font = size + 'px ' + font; // 设置字体
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top'; // 设置文字位置

                // 绘制的颜色默认为白色
                ctx.fillStyle = color || '#ffffff';



                let x, y, i = 0;
                // 绘制文字
                for (let r in result.text) {

                    x = i % countX;
                    y = Math.floor(i / countX);

                    i++;

                    // 往下平移1像素
                    ctx.fillText(r, x * maxWidth + 1, y * maxWidth + descent - 1);

                    // ctx.rect(x * maxWidth, y * maxWidth, maxWidth, maxWidth);
                    // ctx.stroke();

                    // 保存文字信息
                    result.text[r].x = x;
                    result.text[r].y = y;
                }

                // 使用data加载，也可以使用canvas加载
                let ft = new spriteFont.Font(
                    Moon.Game.Drawing2D.createTexture(ctx.getImageData(0, 0, canvas.width, canvas.height)),
                    result);
                return ft;
            }
            return spriteFont;
        }());

        return drawing;
    }());

    // 声音模块
    moon.Sound = (function() {
        let sound = {};

        /**
         * 声音初始化
         */
        sound.init = function() {
            if (!sound.ctx) {
                sound.ctx = new AudioContext(); // 创建声音上下文
                sound.panner = sound.ctx.createStereoPanner(); // 简单环境音控制器
            }
        }

        // 用来播放音乐
        sound.Music = (function() {
            let music = {};

            let list = {};

            /**
             * 创建音乐，不支持环境音
             */
            music.createMusic = function(name, element, loop) {
                list[name] = {};
                list[name].audio = element;
                list[name].audio.loop = loop || false; // 设置循环
                list[name].source = sound.ctx.createMediaElementSource(element); // 创建声音源
            }

            /**
             * 播放音乐
             */
            music.play = function(name) {
                if (list[name].audio.paused) {
                    list[name].source.connect(sound.ctx.destination);
                    list[name].audio.play();
                }

            }

            /**
             * 暂停音乐
             */
            music.pause = function(name) {
                if (!list[name].audio.paused)
                    list[name].audio.pause();
            }

            /**
             * 停止播放音乐
             */
            music.stop = function(name) {
                if (!list[name].audio.paused)
                    list[name].audio.pause();
                list[name].audio.currentTime = 0;
                list[name].source.disconnect(sound.ctx.destination);
            }

            /**
             * 设置循环
             */
            music.setLoop = function(name, loop) {
                list[name].audio.loop = loop;
            }

            /**
             * 设置音量
             */
            music.setVolume = function(name, volum) {
                list[name].audio.volume = moon.Utils.clamp(volum, 0, 1);
            }

            return music;
        }());

        // 声音模块
        sound.Audio = (function() {
            /**
             * 由于声音文件比较大，数量多
             * 因此游戏不会等待所有声音加载完毕再开始游戏
             * 声音在加载完成后调用才会发出声音
             */
            let audio = {};

            let list = {}; // 保存声音列表

            /**
             * 创建一个声音组，将想要的声音以片段的形式保存在声音组中
             * 声音组共享一个音量大小
             * @param {string} name 声音组名称
             * @param {number} time 声音组时长
             */
            audio.createGroup = function(name, time) {
                let length = Math.ceil(time * sound.ctx.sampleRate); // 计算帧长
                let buffer = sound.ctx.createBuffer(2, length, sound.ctx.sampleRate); // 立体声，双声道

                let group = {
                    time: time,
                    buffer: buffer,
                    gain: sound.ctx.createGain(), // 音量控制器
                    sounds: {}
                };
                list[name] = group; // 将声音组添加到列表中
            }

            // 等待加载的数量
            let waitings = [];

            /**
             * 添加声音到声音组中
             * @param {string} group 组名
             * @param {string} name 声音名
             * @param {arraybuffer} bin 声音二进制文件
             * @param {number} startInSource 在声音中的起始位置
             * @param {number} start 放在声音组的起始位置
             * @param {number} length 声音长度
             */
            audio.preCreateAudio = function(group, name, bin, startInSource, start, length) {
                let audio = {
                    group: group,
                    name: name,
                    bin: bin,
                    startInSource: startInSource,
                    start: start,
                    length: length
                }
                waitings.push(audio);
            }

            audio.loadAudio = function(callback) {
                if (waitings.length == 0) {
                    callback();
                    return;
                }
                let count = 0;

                for (let i = 0; i < waitings.length; i++) {
                    let wait = waitings[i];
                    sound.ctx.decodeAudioData(wait.bin,
                        // 如果加载成功
                        function(buffer) {
                            list[wait.group][wait.name] = {
                                start: wait.start,
                                length: wait.length,
                                loop: false
                            }; // 添加声音信息

                            let index = Math.ceil(wait.startInSource * sound.ctx.sampleRate);
                            let len = Math.ceil(wait.length * sound.ctx.sampleRate);
                            let sIndex = Math.ceil(wait.start * sound.ctx.sampleRate);

                            // 将声音段帧复制到声音组中
                            list[wait.group].buffer.getChannelData(0).set(buffer.getChannelData(0).slice(index, index + len), sIndex);
                            list[wait.group].buffer.getChannelData(1).set(buffer.getChannelData(1).slice(index, index + len), sIndex);

                            count++;
                            if (count == waitings.length) {
                                waitings.splice(0, waitings.length);
                                callback();
                                return;
                            }
                        },
                        function() {
                            count++;
                            if (count == waitings.length) {
                                waitings.splice(0, waitings.length);
                                callback();
                                return;
                            }
                            throw '声音 ' + name + ' 加载失败';
                        });
                }

            }

            /**
             * 播放某组声音
             */
            audio.play = function(group, name) {
                let source = sound.ctx.createBufferSource();
                source.buffer = list[group].buffer;
                source.connect(list[group].gain);
                list[group].gain.connect(sound.ctx.destination);
                let audio = list[group][name];
                list[group][name].source = source;

                // 播放声音
                source.start(0, audio.start);

                if (audio.loop) {
                    source.loop = true;
                    source.loopStart = audio.start;
                    source.loopEnd = audio.start + audio.length;
                    audio.source = source;
                } else {
                    source.stop(sound.ctx.currentTime + audio.length);
                }
            }

            /**
             * 停止声音
             */
            audio.stop = function(group, name) {
                if (list[group][name].source)
                    list[group][name].source.stop();
            }

            /**
             * 播放声音组
             */
            audio.playGroup = function(group, loop) {
                let source = sound.ctx.createBufferSource();
                source.buffer = list[group].buffer;
                source.loop = loop || false;
                source.connect(list[group].gain);
                list[group].gain.connect(sound.ctx.destination);
                source.start();
            }

            /**
             * 设置音量
             */
            audio.setVolume = function(group, volume) {
                list[group].gain.gain = moon.Utils(volume, 0, 1);
            }

            return audio;
        }());

        return sound;
    }());

    // 组类
    moon.Group = (function() {
        let group = {};

        group.UpdateGroup = (function() {
            /**
             * 更新组
             */
            function UpdateGroup() {
                this.group = [];
                this.groupIndex = {}; // 保存组名和组值键值对
                // 这样分开写的原因是貌似遍历JSON文件效率比较低
            }
            /**
             * 添加更新实体
             */
            UpdateGroup.prototype.add = function(name, body) {
                if (body.update) {
                    this.groupIndex[name] = this.group.push(body) - 1;
                }
            };
            /**
             * 移除实体，移除时效率比较慢
             */
            UpdateGroup.prototype.remove = function(name) {
                let index = this.groupIndex[name];
                if (index != undefined && index >= 0) {
                    this.group.splice(index, 1);
                    delete this.groupIndex[name];
                    for (let k in this.groupIndex) { // 重新定位index
                        if (this.groupIndex[k] > index)
                            this.groupIndex[k]--;
                    }
                }
            };
            /**
             * 获取组元素
             */
            UpdateGroup.prototype.get = function(name) {
                return this.group[this.groupIndex[name]];
            };
            UpdateGroup.prototype.update = function() {
                for (let i = 0; i < this.group.length; i++) {
                    this.group[i].update();
                }
            };
            return UpdateGroup;
        }())

        // 可绘图的组
        group.DrawableGroup = (function() {
            /**
             * 可绘制的组
             */
            function DrawableGroup() {
                group.UpdateGroup.call(this);
            }
            DrawableGroup.prototype = new group.UpdateGroup();
            DrawableGroup.prototype.constructor = DrawableGroup;
            /**
             * 添加可绘制实体
             */
            DrawableGroup.prototype.add = function(name, body) {
                if (body.update && body.draw) {
                    this.groupIndex[name] = this.group.push(body) - 1;
                }
            };
            /**
             * 绘制
             */
            DrawableGroup.prototype.draw = function() {
                for (let i = 0; i < this.group.length; i++) {
                    this.group[i].draw();
                }
            };
            return DrawableGroup;
        }());

        return group;
    }());

    // 游戏对象
    moon.GameObject = (function() {
        /**
         * 游戏对象
         */
        function GameObject(position, size) {
            this.position = position ? position.clone() : new moon.Vector3(0, 0, 0);
            this.size = size ? size.clone() : new moon.Vector3(0, 0, 0);
        }
        /**
         * 设置位置
         */
        GameObject.prototype.setPosition = function(position) {
            this.position = position.clone();
        };
        /**
         * 设置大小
         */
        GameObject.prototype.setSize = function(size) {
            this.size = size.clone();
        };
        return GameObject;
    }());


    // 物理系统
    moon.Physic = (function() {
        let physic = {};

        /**
         * 物理类型
         * none 不受物理约束
         * static 不受物理约束，可对其他物体造成物理效果
         * dynamic 受物理约束
         */
        physic.bodyType = {
            none: 0,
            static: 1,
            dynamic: 2
        }

        /**
         * 碰撞器方法，判断带有碰撞器的对象
         * flag无或false返回左边调整后的位置，true返回右侧调整的位置
         * 未碰撞则返回空
         */
        physic.Collide2D = {
            /**
             * 阈值
             * 边界阈值corner
             * 最小速度minVelocity
             */
            threshold: {
                corner: 0.1,
                minVelocity: 0.004
            },
            /**
             * 进入边界值处理
             * x则处理到X坐标上，y则处理到Y坐标上，random则随机处理
             */
            cornerResolveType: {
                x: 0,
                y: 1,
                random: 2
            },
            cornerResolve: 2, // 默认为随机
            /**
             * 矩形与矩形碰撞
             */
            rectWithRect: function(c1, c2, flag) {
                let a, b;
                if (flag) {
                    a = c2;
                    b = c1;
                } else {
                    a = c1;
                    b = c2;
                } // 设置碰撞内容

                // 首先计算两物体的中心坐标
                // 其次，将两中间体中心坐标求出距离
                // 将距离除上被碰撞的物体的一半长款得到比率来判断碰撞位置
                // 1) 如果两比率几乎相等，代表从边角碰撞
                // 2) 如果X比率大于Y比率代表从X轴碰撞，否则从Y轴碰撞
                // 3) 调整坐标值，再处理各种物理
                let aRect = new moon.Rectangle(
                    a.position.x + a.collider.position.x,
                    a.position.y + a.collider.position.y,
                    a.collider.size.x,
                    a.collider.size.y
                );
                let bRect = new moon.Rectangle(
                    b.position.x + b.collider.position.x,
                    b.position.y + b.collider.position.y,
                    b.collider.size.x,
                    b.collider.size.y
                );

                // 如果两矩形碰撞
                if (aRect.intersect(bRect)) {
                    // 求出两中心坐标
                    let aMidX = aRect.x + aRect.width * 0.5,
                        aMidY = aRect.y + aRect.height * 0.5,
                        bMidX = bRect.x + bRect.width * 0.5,
                        bMidy = bRect.y + bRect.height * 0.5;

                    // 计算中心点距离比率
                    let dx = (aMidX - bMidX) / (bRect.width * 0.5),
                        dy = (aMidY - bMidy) / (bRect.height * 0.5);

                    // 计算比率绝对值
                    let absDx = Math.abs(dx),
                        absDy = Math.abs(dy);

                    // 计算坐标值
                    if (Math.abs(absDx - absDy) < this.threshold.corner) {
                        // 比率几乎相等
                        if (dx < 0)
                            a.position.x = bRect.x - aRect.width - a.collider.position.x;
                        else
                            a.position.x = bRect.x + bRect.width - a.collider.position.x;

                        if (dy < 0)
                            a.position.y = bRect.y - aRect.height - a.collider.position.y;
                        else
                            a.position.y = bRect.y + bRect.height - a.collider.position.y;

                        // 处理边界
                        switch (this.cornerResolve) {
                            case this.cornerResolveType.random:
                                // 随机调整
                                if (Math.random() < 0.5) // 处理为X轴
                                    a.velocity.x = -a.velocity.x * b.collider.bounce.x;
                                else
                                    a.velocity.y = -a.velocity.y * b.collider.bounce.y;
                                break;
                            case this.cornerResolveType.x:
                                // 调整为X轴
                                a.velocity.x = -a.velocity.x * b.collider.bounce.x;
                                break;
                            case this.cornerResolveType.y:
                                // 调整为Y轴
                                a.velocity.y = -a.velocity.y * b.collider.bounce.y;
                                break;
                        }

                    } else if (absDx > absDy) {
                        // 如果从X轴碰撞过来
                        if (dx < 0)
                            a.position.x = bRect.x - aRect.width - a.collider.position.x;
                        else
                            a.position.x = bRect.x + bRect.width - a.collider.position.x;

                        a.velocity.x = -a.velocity.x * b.collider.bounce.x;

                    } else {
                        // 如果从Y轴碰撞过来
                        if (dy < 0)
                            a.position.y = bRect.y - aRect.height - a.collider.position.y;
                        else
                            a.position.y = bRect.y + bRect.height - a.collider.position.y;

                        a.velocity.y = -a.velocity.y * b.collider.bounce.y;

                    }

                    if (Math.abs(a.velocity.x) < this.threshold.minVelocity)
                        a.velocity.x = 0;
                    if (Math.abs(a.velocity.y) < this.threshold.minVelocity)
                        a.velocity.y = 0;

                    return true;
                }
                return false;
            },
            /**
             * 矩形与圆形碰撞
             */
            rectWithCir: function(c1, c2, flag) {

            },
            /**
             * 矩形与三角形碰撞
             */
            rectWithTri: function(c1, c2, flag) {

            },
            /**
             * 圆形与圆形
             */
            cirWithCir: function(c1, c2, flag) {

            },
            /**
             * 圆形与三角形
             */
            cirWithTri: function(c1, c2, flag) {

            },
            /**
             * 三角形与三角形
             */
            triWithTri: function(c1, c2, flag) {


            },
            /**
             * 矩形在矩形之内
             */
            rectInRect: function(c1, c2, flag) {
                let a, b;
                if (flag) {
                    a = c2;
                    b = c1;
                } else {
                    a = c1;
                    b = c2;
                } // 设置碰撞内容

                // 一个矩形只能在一个矩形之内运动
                let aRect = new moon.Rectangle(
                    a.position.x + a.collider.position.x,
                    a.position.y + a.collider.position.y,
                    a.collider.size.x,
                    a.collider.size.y
                );
                let bRect = new moon.Rectangle(
                    b.position.x + b.collider.position.x,
                    b.position.y + b.collider.position.y,
                    b.collider.size.x,
                    b.collider.size.y
                );

                if (aRect.x + aRect.width > bRect.width) { // 与右边界碰撞
                    a.position.x = bRect.width - aRect.width - a.collider.position.x;
                    a.velocity.x = -a.velocity.x * b.collider.bounce.x;
                } else if (aRect.x < bRect.x) { // 与左边界碰撞
                    a.position.x = -a.collider.position.x;
                    a.velocity.x = -a.velocity.x * b.collider.bounce.x;
                }

                if (aRect.y + aRect.height > bRect.height) { // 与下边界碰撞
                    a.position.y = bRect.height - aRect.height - a.collider.position.y;
                    a.velocity.y = -a.velocity.y * b.collider.bounce.y;
                } else if (aRect.y < bRect.x) { // 与有边界碰撞
                    a.position.y = -a.collider.position.y;
                    a.velocity.y = -a.velocity.y * b.collider.bounce.y;
                }
            }
        };

        // 碰撞器
        physic.Collider = (function() {
            /**
             * 碰撞器，通过重写来编写碰撞器
             */
            function Collider(position, size) {
                moon.GameObject.call(this, position, size);
                this.bounce = new moon.Vector2(0, 0); // 弹性
                this.friction = new moon.Vector2(0, 0); // 摩擦力
            }
            Collider.prototype = new moon.GameObject();
            Collider.prototype.constructor = Collider;
            Collider.prototype.collide = function() {};
            return Collider;
        }());

        /**
         * 碰撞器类型
         */
        physic.colliderType = {
            rectangle: 0,
            circle: 1,
            triangle: 2,
            inner: 3
        }

        // 矩形碰撞器
        physic.RectangleCollider = (function() {
            /**
             * 矩形碰撞器
             */
            function RectangleCollider(position, size) {
                physic.Collider.call(this, position, size);
                this.type = physic.colliderType.rectangle;
            }
            RectangleCollider.prototype = new physic.Collider();
            RectangleCollider.prototype.constructor = RectangleCollider;

            /**
             * 重写方法，与其他带有碰撞器物体碰撞
             */
            RectangleCollider.prototype.collide = function(b1, b2) {
                // 判断碰撞类型
                switch (b2.collider.type) {
                    case physic.colliderType.rectangle:
                        physic.Collide2D.rectWithRect(b1, b2);
                        break;
                }
            };
            return RectangleCollider;
        }());

        // 范围碰撞器，在矩形范围内，与矩形边界碰撞
        physic.InnerRectangleCollider = (function() {
            function InnerRectangleCollider(position, size) {
                physic.Collider.call(this, position, size);
                this.type = physic.colliderType.inner;
            }
            InnerRectangleCollider.prototype = new physic.Collider();
            InnerRectangleCollider.prototype.constructor = InnerRectangleCollider;

            /**
             * 重写方法
             */
            InnerRectangleCollider.prototype.collide = function(b1, b2) {
                switch (b1.collider.type) {
                    case physic.colliderType.rectangle:
                        physic.Collide2D.rectInRect(b1, b2);
                        break;
                }
            }
            return InnerRectangleCollider;
        }());



        // 刚体，享受物理效果
        physic.RegidBody = (function() {
            function RegidBody(position, size) {
                moon.GameObject.call(this, position, size);
                this.type = physic.bodyType.dynamic; // 类型默认动态物理
                this.collider = new moon.Physic.RectangleCollider(new moon.Vector2(0, 0), this.size.clone()); // 默认矩形碰撞器
                this.velocity = new moon.Vector2(0, 0); // 速度
            }
            RegidBody.prototype = new moon.GameObject(); // 继承GameObject
            RegidBody.prototype.constructor = RegidBody;
            /**
             * 设置碰撞器
             */
            RegidBody.prototype.setCollider = function(collider) {
                this.collider = collider;
            };
            return RegidBody;
        }());

        // 世界类
        physic.World2D = (function() {
            /**
             * 世界类，表示一个世界的内容
             * @param {JSON} config 世界配置
             */
            function World2D(config) {
                this.position = new moon.Vector2(0, 0);
                this.size = new moon.Vector2(moon.Game.WIDTH, moon.Game.HEIGHT);
                this.gravity = new moon.Vector2(0, 0);
                this.borderCollide = true; // 默认边界碰撞
                // 碰撞为矩形范围
                this.collider = new physic.InnerRectangleCollider(new moon.Vector2(0, 0), new moon.Vector2(this.size.x, this.size.y));

                //================================可优化==================
                //将不同种类的物体分为不同种类的物体，这样便可以减少很多次循环
                // 缺点是不能够动态修改类型
                this.bodys = []; // 存放进行物理的物体

                if (!config)
                    return;
                if (config.gravity) {
                    this.gravity.x = config.gravity.x;
                    this.gravity.y = config.gravity.y;
                }
                if (config.size) {
                    this.size.x = config.size.x;
                    this.size.y = config.size.y;
                }
            }
            /**
             * 启用物体物理
             */
            World2D.prototype.enable = function(body) {
                this.bodys.push(body);
            };
            /**
             * 停用物体物理
             */
            World2D.prototype.disable = function(body) {
                this.bodys.splice(this.bodys.indexOf(body), 1);
            };
            /**
             * 运行物理世界
             */
            World2D.prototype.run = function() {
                for (let i = 0; i < this.bodys.length; i++) {
                    let b = this.bodys[i];

                    switch (b.type) {
                        case physic.bodyType.dynamic:
                            // 受到重力作用
                            b.velocity.x += this.gravity.x * moon.Game.GameTime.elapsedTime;
                            b.velocity.y += this.gravity.y * moon.Game.GameTime.elapsedTime;
                            break;
                        case physic.bodyType.static:
                            continue;
                            break;
                        case physic.bodyType.none:
                            continue;
                            break;
                    }
                    // 更新坐标值
                    b.position.plus(b.velocity);

                    // 开始物理运动和调整
                    // 遍历其他的物体，来检索碰撞
                    for (let j = 0; j < this.bodys.length; j++) {
                        let o = this.bodys[j];
                        if (b == o || o.type == physic.bodyType.none)
                            continue;

                        // 处理碰撞
                        if (o.type == physic.bodyType.dynamic)
                            b.collider.collide(o, b);
                        else
                            b.collider.collide(b, o);
                    }

                    // 调整与边界碰撞
                    if (this.borderCollide)
                        this.collider.collide(b, this);

                }
            };
            return World2D;
        }());

        /**
         * 表示网格阻隔块是什么阻隔类型
         */
        physic.GridBlockType = {
            none: 0,
            rectangle: 1,
            circle: 2,
            triangle: 3
        }

        // 网格世界
        physic.GridWorld2D = (function() {
            // 使用的临时阻隔块
            let colliders = {
                rectangle: null,
                circle: null,
                triangle: null
            };
            /**
             * 网格世界
             * @param {JSON} config 世界配置 
             */
            function GridWorld2D(config) {
                physic.World2D.call(this, config);
                this.gridSize = new moon.Vector2(32, 32); // 网格大小默认为32 * 32
                this.countOffset = new moon.Vector2(0, 0); // 网格的偏移值
                this.count = new moon.Vector2(0, 0); // 表示两轴的网格数量
                if (config) {
                    if (config.gridSize)
                        this.gridSize = config.gridSize;
                    if (config.count) // 计算出网格数量
                        this.count = config.count;
                    else {
                        this.count.x = this.size.x / this.gridSize.x;
                        this.count.y = this.size.y / this.gridSize.y;
                    }
                    if (config.countOffset)
                        this.countOffset = config.countOffset;
                }

                // 阻挡网格数组
                // 初始化
                this.blocks = new Int32Array(this.count.x * this.count.y);

                // 临时阻隔块初始化
                colliders.rectangle = new physic.RectangleCollider(new Moon.Vector2(0, 0), this.gridSize);
                // =======剩下的初始化=========
            }
            GridWorld2D.prototype = new physic.World2D();
            GridWorld2D.prototype.constructor = GridWorld2D;
            /**
             * 运行物理世界
             */
            GridWorld2D.prototype.run = function() {
                for (let i = 0; i < this.bodys.length; i++) {
                    let b = this.bodys[i];

                    switch (b.type) {
                        case physic.bodyType.dynamic:
                            // 受到重力作用
                            b.velocity.x += this.gravity.x * moon.Game.GameTime.elapsedTime;
                            b.velocity.y += this.gravity.y * moon.Game.GameTime.elapsedTime;
                            break;
                        case physic.bodyType.static:
                            continue;
                            break;
                        case physic.bodyType.none:
                            continue;
                            break;
                    }
                    // 更新坐标值
                    b.position.plus(b.velocity);

                    // 开始物理运动和调整
                    // 遍历其他的物体，来检索碰撞
                    for (let j = 0; j < this.bodys.length; j++) {
                        let o = this.bodys[j];
                        if (b == o || o.type == physic.bodyType.none)
                            continue;

                        // 处理碰撞
                        if (o.type == physic.bodyType.dynamic)
                            b.collider.collide(o, b);
                        else
                            b.collider.collide(b, o);
                    }

                    // 物体与地形碰撞
                    // 首先，计算出人物所在位置处于哪些网格之中
                    // 其次，比较人物所计算出的网格和总网格的大小来限定范围
                    // 遍历这些网格，判断是否碰撞
                    // 如果碰撞，判断网格碰撞类型
                    // 然后进行碰撞处理
                    // ========以后修改=========
                    // 假设人物是矩形

                    // 计算所在的末坐标
                    let endX = Math.floor((b.position.x + b.collider.position.x + b.collider.size.x) / this.gridSize.x);
                    let endY = Math.floor((b.position.y + b.collider.position.y + b.collider.size.y) / this.gridSize.y);

                    // 避免越界
                    if (endX >= this.count.x) endX = this.count.x - 1;
                    if (endY >= this.count.y) endY = this.count.y - 1;

                    // 碰撞器
                    let gridCollider =
                        new physic.RegidBody(new moon.Vector2(0, 0), new moon.Vector2(this.gridSize.x, this.gridSize.y));
                    gridCollider.type = physic.bodyType.static; // 碰撞器设置为静态碰撞器

                    // 计算所处网格坐标
                    // 并遍历
                    for (let px = Math.floor((this.position.x + b.position.x + b.collider.position.x) / this.gridSize.x) -
                            this.countOffset.x; px <= endX; px++)
                        for (let py = Math.floor((this.position.y + b.position.y + b.collider.position.y) / this.gridSize.y) -
                                this.countOffset.y; py <= endY; py++) {

                            // 获取阻隔块值
                            let block = this.blocks[py * this.count.x + px];
                            // 如果不是碰撞物
                            // 当前循环不做
                            if (block == physic.GridBlockType.none)
                                continue;

                            // 如果处于碰撞网格
                            // 执行碰撞判定
                            // 先假设全部为矩形碰撞器
                            // 设置碰撞器坐标
                            gridCollider.position.x = this.position.x + (this.countOffset.x + px) * this.gridSize.x;
                            gridCollider.position.y = this.position.y + (this.countOffset.y + py) * this.gridSize.y;

                            // 判断此碰撞器，并重设大小
                            switch (block) {
                                case physic.GridBlockType.rectangle:
                                    gridCollider.collider = colliders.rectangle;
                                    break;
                                case physic.GridBlockType.circle:
                                    break;
                                case physic.GridBlockType.triangle:
                                    break;
                            }


                            // 进行碰撞判定
                            gridCollider.collider.collide(b, gridCollider);
                        }

                    // 调整与边界碰撞
                    if (this.borderCollide)
                        this.collider.collide(b, this);

                }
            };
            return GridWorld2D;
        }());

        return physic;
    }());



    // 控件类
    moon.Controls = (function() {
        let controls = {};

        // 控件基类
        controls.Control = (function() {
            /**
             * 控件基类，使用要重写
             */
            function Control(position, size) {
                moon.GameObject.call(this, position, size);
                this.hasFocus = false; // 是否已聚焦
                this.canFocus = true; // 能否聚焦
                this.visible = true; // 是否可视
                this.enable = true; // 能否控制
                this.depth = 0; // 深度默认为0
                this.noCamera = true; // 不跟随摄像机移动
            }
            Control.prototype = new moon.GameObject();
            Control.prototype.constructor = Control;
            /**
             * 重写，当聚焦时触发
             */
            Control.prototype.selected = function() {};
            /**
             * 重写，当聚焦中处理输入
             */
            Control.prototype.handleInput = function() {};
            /**
             * 重写，更新事件
             */
            Control.prototype.update = function() {};
            /**
             * 重写，绘图事件
             */
            Control.prototype.draw = function() {};
            return Control;
        }());

        // 标签
        controls.Label = (function() {
            /**
             * 标签，不可聚焦
             * @param {string} text 显示的文字
             */
            function Label(text, font, position, size) {
                controls.Control.call(this, position, size);
                this.canFocus = false; // 不可聚焦
                this.enable = false; // 无需操作
                this.text = text || ''; // 显示的文字
                this.color = new Float32Array([0, 0, 0, 1]); // 默认为黑色不透明
                this.font = font;
            }
            Label.prototype = new controls.Control();
            Label.prototype.constructor = Label;
            /**
             * 绘制标签
             */
            Label.prototype.draw = function() {
                moon.Game.Camera.withCamera(this.noCamera);
                this.font.draw(this.text, this.position.x, this.position.y, this.color, this.depth);
                if (this.noCamera) moon.Game.Camera.withCamera(false);
            }
            return Label;
        }());

        // 可选择标签
        controls.SelectedLabel = (function() {
            function SelectedLabel(text, font, position, size) {
                controls.Control.call(this, position, size);
                this.text = text || ''; // 显示的文字
                this.color = new Float32Array([0, 0, 0, 1]); // 默认为黑色不透明
                this.selectedColor = new Float32Array([1, 1, 1, 1]); // 选择的默认颜色为白色
                this.font = font;
            }
            SelectedLabel.prototype = new controls.Control();
            SelectedLabel.prototype.constructor = SelectedLabel;
            /**
             * 绘制标签
             */
            SelectedLabel.prototype.draw = function() {
                moon.Game.Camera.withCamera(this.noCamera);
                if (this.hasFocus)
                    this.font.draw(this.text, this.position.x, this.position.y, this.selectedColor, this.depth);
                else
                    this.font.draw(this.text, this.position.x, this.position.y, this.color, this.depth);
                if (this.noCamera) moon.Game.Camera.withCamera(false);
            }
            return SelectedLabel;
        }());

        // 图片盒
        controls.PictureBox = (function() {
            function PictureBox(image, position, size) {
                controls.Control.call(this, position, size);
                this.canFocus = false; // 不可聚焦
                this.image = moon.Game.Drawing2D.createTexture(image);
                this.position = position;
                // 重写大小
                this.size = size || new moon.Vector2(image.width, image.height);
            }
            PictureBox.prototype = new controls.Control();
            PictureBox.prototype.constructor = PictureBox;
            /**
             * 绘制图片盒
             */
            PictureBox.prototype.draw = function() {
                moon.Game.Camera.withCamera(this.noCamera);
                let src = new moon.Rectangle(0, 0, this.image.width, this.image.height);
                let dest = new moon.Rectangle(this.position.x, this.position.y, this.size.x, this.size.y);
                moon.Game.Drawing2D.drawSprite(this.image, src, dest, null, this.depth);
                if (this.noCamera) moon.Game.Camera.withCamera(false);
            };
            return PictureBox;
        }());

        // 控件管理器
        controls.ControlManager = (function() {
            /**
             * 控件管理器
             */
            function ControlManager() {
                this.selectedIndex = 0;
                this.controls = [];
            }
            /**
             * 将控件放在控件管理器中
             */
            ControlManager.prototype.addControl = function(control) {
                if (!(control instanceof controls.Control))
                    return;
                if (this.controls.indexOf(control) == -1)
                    this.controls.push(control);
            };
            /**
             * 选择下一个控件
             */
            ControlManager.prototype.next = function() {
                if (this.controls.length == 0)
                    return;

                let currentIndex = this.selectedIndex;
                this.controls[this.selectedIndex].hasFocus = false;

                do {
                    this.selectedIndex++;
                    if (this.selectedIndex == this.controls.length)
                        this.selectedIndex = 0;

                    if (this.controls[this.selectedIndex].canFocus && this.controls[this.selectedIndex].enable) {
                        this.controls[this.selectedIndex].selected();

                        this.controls[this.selectedIndex].hasFocus = true;
                        break;
                    }

                } while (currentIndex != this.selectedIndex);
            };
            /**
             * 选择上一个控件
             */
            ControlManager.prototype.last = function() {
                if (this.controls.length == 0)
                    return;

                let currentIndex = this.selectedIndex;
                this.controls[this.selectedIndex].hasFocus = false;

                do {
                    this.selectedIndex--;
                    if (this.selectedIndex == 0)
                        this.selectedIndex = this.controls.length - 1;

                    if (this.controls[this.selectedIndex].canFocus && this.controls[this.selectedIndex].enable) {
                        this.controls[this.selectedIndex].selected();

                        this.controls[this.selectedIndex].hasFocus = true;
                        break;
                    }

                } while (currentIndex != this.selectedIndex);
            };
            /**
             * 默认聚焦
             */
            ControlManager.prototype.defaultFocus = function() {
                if (this.controls.length == 0)
                    return;

                if (this.controls[this.selectedIndex].canFocus)
                    this.controls[this.selectedIndex].hasFocus = true;
                else
                    this.next();
            };
            ControlManager.prototype.update = function() {
                for (let i = 0; i < this.controls.length; i++) {
                    if (this.controls[i].enable)
                        this.controls[i].update();
                    if (this.controls[i].hasFocus)
                        this.controls[i].handleInput();
                }
            };
            ControlManager.prototype.draw = function() {
                for (let i = 0; i < this.controls.length; i++) {
                    if (this.controls[i].visible)
                        this.controls[i].draw();
                }
            };
            return ControlManager;
        }());

        return controls;
    }());

    // 输入设备
    moon.Input = (function() {
        let input = {};

        // ======================方法不好===========
        // 有可能不捕捉，从而一直以为在按下
        // 延后捕捉则会出现按下，其实并没有按下

        // 鼠标
        input.Mouse = (function() {
            let mouse = {};

            let keyState = {}; // 存储鼠标信息

            /**
             * 鼠标的坐标
             */
            mouse.position = new moon.Vector2(0, 0);

            /**
             * 鼠标的按键
             */
            mouse.Keys = {
                left: 0,
                middle: 1,
                right: 2
            }

            /**
             * 激活按键
             */
            mouse.enableKey = function(key) {
                keyState[key] = {
                    last: false,
                    now: false
                };
            }


            /**
             * 鼠标按键按下
             */
            mouse.onKeyDown = function(key) {
                return keyState[key].now;
            }

            /**
             * 鼠标按下时
             */
            mouse.onKeyPress = function(key) {
                if (!keyState[key].last && keyState[key].now) {
                    keyState[key].last = true; // 复原
                    return true;
                }
                return false;
            }

            /**
             * 鼠标松开时
             */
            mouse.onKeyRelease = function(key) {
                if (keyState[key].last && !keyState[key].now) {
                    keyState[key].last = false; // 复原
                    return true;
                }
                return false;
            }

            // 按键按下
            function keyDown(event) {
                if (keyState[event.button] == undefined)
                    return;
                keyState[event.button].last = keyState[event.button].now;
                keyState[event.button].now = true;
            }

            // 按键松开
            function keyUp(event) {
                if (keyState[event.button] == undefined)
                    return;
                keyState[event.button].last = keyState[event.button].now;
                keyState[event.button].now = false;
            }

            // 设置鼠标坐标
            function setPosition(event) {
                mouse.position.x = event.offsetX;
                mouse.position.y = event.offsetY;
            }

            // 添加监听
            function addListener() {
                // 鼠标按下事件
                moon.Game.canvas.addEventListener('mousedown', keyDown);
                // 鼠标松开事件
                moon.Game.canvas.addEventListener('mouseup', keyUp);
                // 鼠标移动事件
                moon.Game.canvas.addEventListener('mousemove', setPosition);
            }

            // 移除监听
            function removeListener() {
                moon.Game.canvas.removeEventListener('mousedown', keyDown);
                moon.Game.canvas.removeEventListener('mouseup', keyUp);
                moon.Game.canvas.removeEventListener('mousemove', setPosition);
            }

            /**
             * 是否激活鼠标
             */
            mouse.enable = function(flag) {
                flag ? addListener() : removeListener();
            }

            return mouse;
        }());

        // 键盘
        input.Keyboard = (function() {
            let keyboard = {};

            let keyState = {}; // 存储键盘按钮信息

            // 按键
            keyboard.Keys = { A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90, Space: 32, Enter: 13, Left: 37, Up: 38, Right: 39, Down: 40, n0: 48, n1: 49, n2: 50, n3: 51, n4: 52, n5: 53, n6: 54, n7: 55, n8: 56, n9: 57 };

            /**
             * 激活按键
             */
            keyboard.enableKey = function(key) {
                keyState[key] = {
                    last: false,
                    now: false
                };
            }

            /**
             * 按钮是否按下
             */
            keyboard.onKeyDown = function(key) {
                return keyState[key].now;
            }

            /**
             * 按钮按下事件
             */
            keyboard.onKeyPress = function(key) {
                if (!keyState[key].last && keyState[key].now) {
                    keyState[key].last = true;
                    return true;
                }
                return false;
            }

            /**
             * 按钮松开事件
             */
            keyboard.onKeyRelease = function(key) {
                if (keyState[key].last && !keyState[key].now) {
                    keyState[key].last = false;
                    return true;
                }
                return false;
            }



            // 按钮按下
            function keyDown(event) {
                if (keyState[event.keyCode] == undefined)
                    return;
                keyState[event.keyCode].last = keyState[event.keyCode].now;
                keyState[event.keyCode].now = true;
            }

            // 按钮松开
            function keyUp(event) {
                if (keyState[event.keyCode] == undefined)
                    return;
                keyState[event.keyCode].last = keyState[event.keyCode].now;
                keyState[event.keyCode].now = false;
            }

            // 添加监听
            function addListener() {
                document.addEventListener('keydown', keyDown);
                document.addEventListener('keyup', keyUp);
            }

            // 删除监听
            function removeListener() {
                document.removeEventListener('keydown', keyDown);
                document.removeEventListener('keyup', keyUp);
            }

            /**
             * 是否激活键盘
             */
            keyboard.enable = function(flag) {
                flag ? addListener() : removeListener();
            }

            return keyboard;
        }());

        // 触摸
        input.Touch = (function() {
            let touch = {};

            let touchState = {
                touchStart: { state: false, info: null },
                touchEnd: { state: false, info: null },
                touchMove: { info: null }
            };

            let touchInfo = {}; // 保存触控信息

            /**
             * 触控信息，设置触控信息使用
             */
            touch.state = {
                press: 0,
                release: 1
            }

            /**
             * 设置触控信息
             */
            touch.setTouch = function(name, state) {
                switch (state) {
                    case touch.state.press:
                        touchInfo[name] = touchState.touchStart.info.identifier;
                        break;
                    case touch.state.release:
                        touchInfo[name] = touchState.touchEnd.info.identifier;
                        break;
                }
            }

            /**
             * 获取触控信息
             */
            touch.getTouch = function(name) {
                for (let i in touchState.touchMove.info) {
                    if (touchInfo[name] == touchState.touchMove.info[i].identifier)
                        return {
                            x: Math.floor(touchState.touchMove.info[i].pageX) - moon.Game.canvas.offsetLeft,
                            y: Math.floor(touchState.touchMove.info[i].pageY) - moon.Game.canvas.offsetTop
                        };
                }
                return null;
            }

            /**
             * 触摸按下时发生
             */
            touch.onPress = function() {
                if (touchState.touchStart.state) {
                    touchState.touchStart.state = false;
                    return true;
                }
                return false;
            }

            /**
             * 触摸松开时发生
             */
            touch.onRelease = function() {
                if (touchState.touchEnd.state) {
                    touchState.touchEnd.state = false;
                    return true;
                }
                return false;
            }

            /**
             * 有按键按下
             */
            touch.onTouch = function() {
                return touchState.touchMove.info.length > 0;
            }

            // 开始触摸时触发
            // 只传改变的触摸
            function touchStart(event) {
                touchState.touchStart.state = true;
                touchState.touchStart.info = event.changedTouches[0];
                touchState.touchMove.info = event.touches;
            }

            // 触摸时触发
            function touchMove(event) {
                touchState.touchMove.info = event.touches;
            }

            // 触摸结束时或系统结束触摸时触发
            function touchEnd(event) {
                touchState.touchEnd.state = true;
                touchState.touchEnd.info = event.changedTouches[0];
                touchState.touchMove.info = event.touches;
            }

            // 添加侦听
            function addListener() {
                document.addEventListener('touchstart', touchStart);
                document.addEventListener('touchmove', touchMove);
                document.addEventListener('touchend', touchEnd);
                document.addEventListener('touchcancel', touchEnd);
            }

            // 移除监听
            function removeListener() {
                document.removeEventListener('touchstart', touchStart);
                document.removeEventListener('touchmove', touchMove);
                document.removeEventListener('touchend', touchEnd);
                document.removeEventListener('touchcancel', touchEnd);
            }

            /**
             * 是否激活触摸
             */
            touch.enable = function(flag) {
                flag ? addListener() : removeListener();
            }


            return touch;
        }());

        // 手柄
        input.Gamepad = (function() {
            let gamepad = {};

            /**
             * 手柄按键
             */
            gamepad.Keys = {
                A: 0,
                B: 1,
                X: 2,
                Y: 3,
                LB: 4,
                RB: 5,
                LT: 6,
                RT: 7,
                BACK: 8,
                START: 9,
                L: 10,
                R: 11,
                UP: 12,
                DOWN: 13,
                LEFT: 14,
                RIGHT: 15,
                MAIN: 16,
                L_LEFT: 30, // 30 >> 5 = 0
                L_RIGHT: 31, // 0
                L_UP: 62, // 1
                L_DOWN: 63, // 1
                R_LEFT: 94, // 2
                R_RIGHT: 95, // 2
                R_UP: 126, // 3
                R_DOWN: 127, // 3
            }; // 手柄按钮通过移位操作，>> 5，大于16的轴通过移位axes数组


            /**
             * 阈值，超过阈值才算触发
             */
            gamepad.threshold = {
                axes: 0.1,
                button: 0.1, // 主要代表trigger阈值
            };

            /**
             * 手柄用户，最多支持4个手柄
             */
            gamepad.PlayerIndex = {
                palyer1: 0,
                player2: 1,
                player3: 2,
                player4: 3
            };

            let gamepads = {}; // 保存手柄的信息

            // 手柄连接
            function connect(event) {
                gamepads[event.gamepad.index] = {
                    id: event.gamepad.id,
                    connecting: true,
                    lastState: null,
                    state: event.gamepad
                };
            }

            // 手柄断开连接
            function disconnect(event) {
                delete gamepads[event.gamepad.index];
            }

            // 添加监听
            function addListener() {
                window.addEventListener('gamepadconnected', connect);
                window.addEventListener('gamepaddisconnected', disconnect);
            }

            // 移除监听
            function removeListener() {
                window.removeEventListener('gamepadconnected', connect);
                window.removeEventListener('gamepaddisconnected', disconnect);
            }

            /**
             * 手柄信息更新，启动手柄后调用
             */
            gamepad.update = function() {
                for (let pad in gamepads) {
                    gamepads[pad].lastState = gamepads[pad].state;
                    gamepads[pad].state = navigator.getGamepads()[pad];
                }
            }

            // 获取按键值
            gamepad.getKeyValue = function(playerIndex, key) {
                if (key < 17)
                    return gamepads[playerIndex].state.buttons[key].value;
                else
                    return gamepads[playerIndex].state.axes[key >> 5];
            }

            /**
             * 手柄按下事件
             */
            gamepad.onKeyDown = function(playerIndex, key) {
                let pad = gamepads[playerIndex];
                if (pad) {
                    if (key < 17)
                        return pad.state.buttons[key].pressed;
                    else {
                        let k = key >> 5;
                        return (key % 2 == 0 ? pad.state.axes[k] <= -this.threshold.axes :
                            pad.state.axes[k] >= this.threshold.axes);
                    }
                }
                return false;
            }

            /**
             * 手柄按下时事件
             */
            gamepad.onKeyPress = function(playerIndex, key) {
                let pad = gamepads[playerIndex];
                if (pad) {
                    if (key < 17)
                        return !pad.lastState.buttons[key].pressed &&
                            pad.state.buttons[key].pressed;
                    else {
                        let k = key >> 5;
                        return (key % 2 == 0 ?
                            (pad.lastState.axes[k] > -this.threshold.axes &&
                                pad.state.axes[k] <= -this.threshold.axes) :
                            (pad.lastState.axes[k] < this.threshold.axes &&
                                pad.state.axes[k] >= this.threshold.axes));

                    }
                }
                return false;

            }

            /**
             * 手柄松开时事件
             */
            gamepad.onKeyRelease = function(playerIndex, key) {
                let pad = gamepads[playerIndex];
                if (pad) {
                    if (key < 17)
                        return pad.lastState.buttons[key].pressed &&
                            !pad.state.buttons[key].pressed;
                    else {
                        let k = key >> 5;
                        return (key % 2 == 0 ?
                            (pad.lastState.axes[k] <= -this.threshold.axes &&
                                pad.state.axes[k] > -this.threshold.axes) :
                            (pad.lastState.axes[k] >= this.threshold.axes &&
                                pad.state.axes[k] < this.threshold.axes));

                    }
                }
                return false;
            }

            /**
             * 手柄震动
             * @param {gamepad.PlayerIndex} playerIndex 用户手柄
             * @param {number} delay 延迟震动，在delay毫秒后震动
             * @param {number} duration 持续时间，持续duration时间，不可长时间
             * @param {number} weak 从虚弱振动开始，0~1
             * @param {number} strong 振动到最强，0~1
             */
            gamepad.shake = function(playerIndex, delay, duration, weak, strong) {
                let pad = gamepads[playerIndex];
                if (pad) {
                    pad.state.vibrationActuator.playEffect(
                        pad.state.vibrationActuator.type, {
                            startDelay: delay,
                            duration: duration,
                            weakMagnitude: weak,
                            strongMagnitude: strong
                        }
                    );
                }
            }

            /**
             * 是否激活手柄
             */
            gamepad.enable = function(flag) {
                flag ? addListener() : removeListener();
            }

            return gamepad;
        }());


        return input;
    }());

    // 实体
    moon.Entity = (function() {
        let entity = {};

        // 绘图实体
        entity.DrawableEntity = (function() {
            /**
             * 绘图实体
             */
            function DrawableEntity(position, size) {
                moon.Physic.RegidBody.call(this, position, size);
                this.center = new moon.Vector2(this.size.x / 2, this.size.y / 2); // 中心点
                this.filter = moon.Drawing.Filter.none; // 镜像处理
                this.angle = 0; // 旋转角度
                this.color = new Float32Array([1, 1, 1, 1]);
                this.depth = 0; // 绘制深度默认为0
                this.noCamera = false; // 不跟随摄像机移动
            }
            DrawableEntity.prototype = new moon.Physic.RegidBody();
            DrawableEntity.prototype.constructor = DrawableEntity;
            DrawableEntity.prototype.update = function() {};
            DrawableEntity.prototype.draw = function() {};
            return DrawableEntity;
        }());

        // 图像
        entity.Image = (function() {
            function Image(image, position, size) {
                entity.DrawableEntity.call(this, position, size);

                this.image = moon.Game.Drawing2D.createTexture(image);

                // 添加属性
                if (size)
                    this.size = size.clone();
                else
                    this.size = new moon.Vector2(this.image.width, this.image.height);
            }
            Image.prototype = new entity.DrawableEntity();
            Image.prototype.constructor = Image;

            /**
             * 重写绘制方法
             */
            Image.prototype.draw = function() {
                moon.Game.Camera.withCamera(this.noCamera);
                let dest = new moon.Rectangle(
                    this.position.x,
                    this.position.y,
                    this.size.x,
                    this.size.y
                );
                moon.Game.Drawing2D.picture(this.image, dest, this.center, this.angle, this.filter, this.color, this.depth);
                if (this.noCamera) moon.Game.Camera.withCamera(false);
            }

            return Image;
        }());

        // 动画帧
        entity.AnimationFrame = (function() {
            /**
             * 一个帧的动画信息
             * @param {number} duration 这一帧的持续时间，单位秒
             * @param {com.Graphics.Rectangle} frameRect 这一帧的矩形大小
             */
            function AnimationFrame(duration, frameRect) {
                this.duration = duration;
                this.frameRect = frameRect;
            }
            return AnimationFrame;
        }());

        // 动画类
        entity.Animation = (function() {
            /**
             * 动画类，存储一系列动画帧
             * @param {string} name 动画名称
             */
            function Animation(name) {
                this.name = name;
                this.animationFrames = [];
                this.countTime = 0;
                this.frame = 0;
                this.loop = true;
                this._stoped = false;
            }
            /**
             * 添加动画帧
             */
            Animation.prototype.add = function(animationFrame) {
                if (animationFrame instanceof entity.AnimationFrame)
                    this.animationFrames.push(animationFrame);
            };
            /**
             * 移除动画帧
             */
            Animation.prototype.remove = function(animationFrame) {
                let index = this.animationFrames.indexOf(animationFrame);
                if (index != -1)
                    this.animationFrames.splice(index, 1);
            };
            /**
             * 设置帧数
             */
            Animation.prototype.setFrame = function(frame) {
                this.frame = moon.Utils.clamp(frame, 0, this.animationFrames.length);
            };
            /**
             * 获取帧矩形
             */
            Animation.prototype.getFrameRect = function() {
                return this.animationFrames[this.frame].frameRect;
            };
            /**
             * 更新动画帧
             */
            Animation.prototype.update = function() {
                if (this._stoped)
                    return;
                this.countTime += moon.Game.GameTime.elapsedTime;
                if (this.countTime < this.animationFrames[this.frame].duration)
                    return; // 控制播放时间

                this.frame++;
                if (this.frame >= this.animationFrames.length) {
                    this.frame = 0;
                    if (!this.loop)
                        this._stoped = true;
                    this.onEnd();
                }

                this.countTime = 0;
            };
            /**
             * 动画结束回调函数
             */
            Animation.prototype.onEnd = function() {};
            return Animation;
        }());

        // 动画管理器
        entity.AnimationManager = (function() {
            /**
             * 动画管理器，管理一系列动画
             */
            function AnimationManager() {
                this.animations = {};
                this.currentAnimation = null;
                this.playing = true; // 默认正在播放
            }
            /**
             * 添加动画
             */
            AnimationManager.prototype.add = function(animation) {
                this.animations[animation.name] = animation;
            };
            /**
             * 设置当前播放的动画
             */
            AnimationManager.prototype.setAnimation = function(name) {
                this.currentAnimation = this.animations[name];
                this.currentAnimation.frame = 0;
                this.currentAnimation.end = false;
            };
            /**
             * 播放动画
             */
            AnimationManager.prototype.play = function() {
                this.playing = true;
                this.currentAnimation.end = false;
            };
            /**
             * 暂停播放
             */
            AnimationManager.prototype.pause = function() {
                this.playing = false;
            };
            /**
             * 更新动画
             */
            AnimationManager.prototype.update = function() {
                if (this.playing)
                    this.currentAnimation.update();
            };
            return AnimationManager;
        }());

        entity.Sprite = (function() {
            function Sprite(image, position, size, animationManager) {
                entity.DrawableEntity.call(this, position, size);
                this.image = moon.Game.Drawing2D.createTexture(image);

                // 设置动画管理器
                if (animationManager)
                    this.animationManager = animationManager;
                else {
                    // 如果没有动画管理器，则默认动画管理器
                    let animationFrame = new entity.AnimationFrame(1, new moon.Rectangle(0, 0, this.image.width, this.image.height));
                    let animation = new entity.Animation('default');
                    animation.add(animationFrame);
                    let manager = new entity.AnimationManager();
                    manager.add(animation);
                    manager.setAnimation('default');
                    this.animationManager = manager;
                }
            }
            Sprite.prototype = new entity.DrawableEntity();
            Sprite.prototype.constructor = Sprite;

            /**
             * 绑定动画管理器
             */
            Sprite.prototype.bindAnimationManager = function(animationManager) {
                this.animationManager = animationManager;
            };

            /**
             * 更新
             */
            Sprite.prototype.update = function() {
                this.animationManager.update();
            };

            /**
             * 绘制
             */
            Sprite.prototype.draw = function() {
                moon.Game.Camera.withCamera(this.noCamera);
                let dest = new moon.Rectangle(
                    this.position.x,
                    this.position.y,
                    this.size.x,
                    this.size.y
                );
                moon.Game.Drawing2D.sprite(
                    this.image,
                    this.animationManager.currentAnimation.getFrameRect(),
                    dest,
                    this.center,
                    this.angle,
                    this.filter,
                    this.color,
                    this.depth
                );
                if (this.noCamera) moon.Game.Camera.withCamera(false);
            };
            Sprite.prototype
            return Sprite;
        }());

        // 文本
        // entity.Text = (function() {
        //     /**
        //      * 文本，修改后需要重新加载
        //      * 加载时间长，但绘图效率比SpriteFont高
        //      */
        //     function Text(text, position, size, color) {
        //         entity.DrawableEntity.call(this, position, size);
        //         this.color = color || new Float32Array([1, 1, 1, 1]);
        //         this.canvas = document.createElement('canvas');
        //         this.ctx = this.canvas.getContext('2d');
        //         this.text = text;
        //         this._dirty = true; // 表示画布是否需要重绘
        //     }
        //     /**
        //      * 设置文字
        //      */
        //     Text.prototype.setText = function(text) {
        //         if (text === this.text) {
        //             return;
        //         }
        //         this._dirty = true;
        //         this.text = text;
        //         let maxSize = 0;
        //         for (let i = 0; i < this.text.length; i++) {

        //         }
        //     };
        //     return Text;
        // }());



        // 灯光管理器
        entity.SimpleLightEnvironment = (function() {
            // 内部类
            // 灯光
            function SimpleLight(position, radius, innerRadius, color) {
                this.index = 0;
                this.position = position || moon.Vector2(0, 0);
                this.radius = radius || 100;
                this.innerRadius = innerRadius || 0;
                this.color = color || new Float32Array([1.0, 1.0, 1.0]);
            }


            function SimpleLightEnvironment() {
                this.lights = []; // 灯光数组
            }
            /**
             * 开启灯光
             */
            SimpleLightEnvironment.enable = function(flag) {
                if (flag) {
                    // 开启灯光灯光着色器
                    moon.Game.Drawing2D.changeProgram(
                        moon.Drawing.Drawing3D.Drawing2D.ShaderProgram.type.simpleLight
                    );
                    moon.Game.Drawing2D.shaderProgramManager.currentProgram.init();
                } else {
                    // 启动默认着色器程序
                    moon.Game.Drawing2D.changeProgram(
                        moon.Drawing.Drawing3D.Drawing2D.ShaderProgram.type.simple
                    );
                }
            };
            // 构造函数
            SimpleLightEnvironment.prototype.constructor = SimpleLightEnvironment;
            /**
             * 创建灯光
             * @param {moon.Vector2} position 灯光位置
             * @param {number} radius 灯光范围
             * @param {Float32Array} color 灯光颜色
             */
            SimpleLightEnvironment.prototype.createLight = function(position, radius, innerRadius, color) {
                let light = new SimpleLight(position, radius, innerRadius, color);
                light.index = moon.Game.Drawing2D.shaderProgramManager.currentProgram.addLight(
                    light.position,
                    light.radius,
                    light.innerRadius,
                    light.color
                ); // 创建灯光
                this.lights.push(light);
                return light;
            };
            /**
             * 添加灯光
             */
            SimpleLightEnvironment.prototype.addLight = function(light) {
                light.index = moon.Game.Drawing2D.shaderProgramManager.currentProgram.addLight(
                    light.position,
                    light.radius,
                    light.innerRadius,
                    light.color
                ); // 创建灯光
                this.lights.push(light);
            };
            /**
             * 更新灯光坐标
             */
            SimpleLightEnvironment.prototype.updateLightPosition = function(light) {
                // 更新光线坐标
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.changeLightPosition(
                    light.index,
                    light.position
                );
            };
            /**
             * 更新灯光颜色
             */
            SimpleLightEnvironment.prototype.updateLightColor = function(light) {
                // 更新光线坐标
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.changeLightColor(
                    light.index,
                    light.color
                );
            };
            /**
             * 更新灯光范围
             */
            SimpleLightEnvironment.prototype.updateLightRadius = function(light) {
                // 更新光线范围
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.changeLightRadius(
                    light.index,
                    light.radius
                );
            };
            /**
             * 更新灯光内圈范围
             */
            SimpleLightEnvironment.prototype.UpdateLightInnerRadius = function(light) {
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.changeLightInnerRadius(
                    light.index,
                    light.innerRadius
                );
            };
            /**
             * 更新灯光所有内容
             */
            SimpleLightEnvironment.prototype.updateAll = function(light) {
                this.updateLightPosition(light);
                this.updateLightColor(light);
                this.updateLightRadius(light);
            };
            /**
             * 改变环境光强度
             */
            SimpleLightEnvironment.prototype.setAmbient = function(ambient) {
                // 改变环境光强度
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.setAmbient(
                    ambient
                );
            };
            /**
             * 改变环境光颜色
             */
            SimpleLightEnvironment.prototype.setAmbientColor = function(color) {
                // 改变环境光颜色
                moon.Game.Drawing2D.shaderProgramManager.currentProgram.setAmbientColor(
                    color
                );
            };
            /**
             * 移除灯光
             */
            SimpleLightEnvironment.prototype.removeLight = function(light) {
                let program = moon.Game.Drawing2D.shaderProgramManager.currentProgram;
                program.setLightCount(program.lights.length - 1); // 减少灯光数
                program.popLight(); // 弹出最上方的灯光
                this.lights.splice(light.index, 1);
                for (let i = light.index; i < this.lights.length; i++) {
                    this.lights[i].index--; // 更新信息
                    // 更新灯光信息
                    this.updateAll(this.lights[this.lights[i].index]);
                }
            };
            return SimpleLightEnvironment;
        }());

        return entity;
    }());

    // 游戏中使用的实体
    moon.GameEntity = (function() {
        let gameEntity = {};

        // 瓷砖引擎
        gameEntity.TileEngine2D = (function() {
            let tileEngine2D = {};

            /**
             * 瓷砖大小，默认32*32
             */
            tileEngine2D.tileSize = {
                width: 32,
                height: 32
            }

            tileEngine2D.Tile = (function() {
                /**
                 * 某一块瓷砖信息
                 * @param {number} [tileset] 哪一个瓷砖资源
                 * @param {number} [tile] 第几块瓷砖
                 */
                function Tile(tileset, tile) {
                    this.tileset = tileset || 0;
                    this.tile = tile || 0;
                }
                return Tile;
            }());

            tileEngine2D.Tileset = (function() {
                /**
                 * 瓷砖资源
                 * @param {Image} image 资源图片
                 * @param {moon.Vector2} count 瓷砖两轴数目
                 * @param {moon.Vector2} size 瓷砖长宽
                 */
                function Tileset(image, count, size) {
                    this.image = moon.Game.Drawing2D.createTexture(image);
                    this.count = count.clone();
                    this.size = size.clone();

                    // 存储的资源矩形
                    this.srcRects = [];
                }
                /**
                 * 默认选取所有范围的瓷砖
                 */
                Tileset.prototype.default = function() {
                    for (let y = 0; y < this.count.y; y++) {
                        for (let x = 0; x < this.count.x; x++) {
                            let rec = new moon.Rectangle(
                                x * this.size.x,
                                y * this.size.y,
                                this.size.x,
                                this.size.y
                            );
                            this.srcRects.push(rec);
                        }
                    }
                };
                /**
                 * 添加瓷砖源矩形，并返回索引
                 */
                Tileset.prototype.addSrcRect = function(src) {
                    return this.srcRects.push(src) - 1;
                };
                /**
                 * 获取索引值的瓷砖矩形
                 */
                Tileset.prototype.getSrcRect = function(index) {
                    return this.srcRects[index];
                };
                return Tileset;
            }());

            // 瓷砖图层
            tileEngine2D.TileLayer = (function() {
                /**
                 * 瓷砖图层
                 * @param {[]} tiles 瓷砖信息
                 * @param {moon.Vector2} offset 瓷砖两轴偏移值
                 * @param {moon.Vector2} count 瓷砖两轴数量
                 */
                function TileLayer(tiles, count, offset) {
                    this.tiles = tiles;
                    this.offset = offset || new moon.Vector2(0, 0);
                    this.count = count;
                    this.withDepth = false; // 是否由深度不同而设置不同深度
                }
                /**
                 * 更新
                 */
                TileLayer.prototype.update = function() {};
                /**
                 * 绘制图层
                 */
                TileLayer.prototype.draw = function(tilesets, size) {

                    // 通过摄像机来计算可视区域
                    let px = Math.floor(moon.Game.Camera.position.x / tileEngine2D.tileSize.width) - this.offset.x;
                    let py = Math.floor(moon.Game.Camera.position.y / tileEngine2D.tileSize.height) - this.offset.y;

                    let pw = px + Math.floor(moon.Game.Camera.size.x / tileEngine2D.tileSize.width) + 2;
                    let ph = py + Math.floor(moon.Game.Camera.size.y / tileEngine2D.tileSize.height) + 2;

                    // 限制可视区域都在数组之中
                    px = Math.max(px, 0);
                    py = Math.max(py, 0);

                    pw = Math.min(pw, this.count.x);
                    ph = Math.min(ph, this.count.y);

                    // 绘制整体图层
                    let dest = new moon.Rectangle(0, 0, tileEngine2D.tileSize.width, tileEngine2D.tileSize.height);
                    let tile;
                    let offsetWidth = this.offset.x * tileEngine2D.tileSize.width,
                        offsetHeight = this.offset.y * tileEngine2D.tileSize.height;
                    let depth = 0; // 深度
                    for (let y = py; y < ph; y++) {
                        for (let x = px; x < pw; x++) {
                            tile = this.tiles[y * this.count.x + x];
                            if (tile.tile == -1) // 如果无
                                continue;

                            dest.x = x * tileEngine2D.tileSize.width + offsetWidth;
                            dest.y = y * tileEngine2D.tileSize.height + offsetHeight;

                            let tileset = tilesets[tile.tileset];

                            // 计算深度
                            if (this.withDepth)
                                depth = depth.y / size.y;

                            // 绘制瓷砖
                            moon.Game.Drawing2D.drawSprite(
                                tileset.image,
                                tileset.getSrcRect(tile.tile),
                                dest,
                                null, // 默认叠加色
                                depth
                            );
                        }
                    }
                };
                return TileLayer;
            }());

            // 实例图层
            tileEngine2D.InstanceLayer = (function() {
                /**
                 * 实例图层
                 * @param {[]} [instances] 实例集合
                 */
                function InstanceLayer(instances) {
                    this.instances = instances || [];
                }
                /**
                 * 实例更新
                 */
                InstanceLayer.prototype.update = function() {
                    for (let i = 0; i < this.instances.length; i++)
                        this.instances[i].update();
                };
                /**
                 * 绘制实例
                 */
                InstanceLayer.prototype.draw = function() {
                    // =====================可优化======
                    for (let i = 0; i < this.instances.length; i++) {

                        this.instances[i].draw();
                    }
                };
                return InstanceLayer;
            }());

            // 瓷砖地图
            tileEngine2D.TileMap = (function() {
                /**
                 * 瓷砖地图
                 */
                function TileMap() {
                    this.tilesets = []; // 瓷砖地图资源
                    this.layers = []; // 图层
                    this.blocks = null; // 阻隔块信息
                    this.maxCount = new moon.Vector2(0, 0); // 地图最大块数
                }
                /**
                 * 更新地图
                 */
                TileMap.prototype.update = function() {
                    for (let i = 0; i < this.layers.length; i++) {
                        this.layers[i].update();
                    }
                };
                /**
                 * 绘制地图
                 */
                TileMap.prototype.draw = function() {
                    for (let i = 0; i < this.layers.length; i++) {
                        this.layers[i].draw(this.tilesets, this.maxCount);
                    }
                };
                return TileMap;
            }());

            // 瓷砖地图管理器
            tileEngine2D.TileMapManager = (function() {
                /**
                 * 瓷砖地图管理器
                 */
                function TileMapManager() {
                    this.tileMaps = {};
                    this.world = null;
                    this.currentMap = null;
                }
                /**
                 * 添加瓷砖地图
                 */
                TileMapManager.prototype.addMap = function(name, map) {
                    this.tileMaps[name] = map;
                    if (this.currentMap == null)
                        this.currentMap = map;
                };
                /**
                 * 绑定世界
                 */
                TileMapManager.prototype.bindWorld = function(world) {
                    this.world = world;
                };
                /**
                 * 设置当前地图
                 */
                TileMapManager.prototype.setMap = function(name) {
                    this.currentMap = this.tileMaps[name];
                };
                /**
                 * 更新
                 */
                TileMapManager.prototype.update = function() {
                    this.world.run();
                    this.currentMap.update();
                };
                /**
                 * 绘制
                 */
                TileMapManager.prototype.draw = function() {
                    this.currentMap.draw();
                };
                return TileMapManager;
            }());

            return tileEngine2D;
        }());


        return gameEntity;
    }());

    moon.Camera = (function() {
        let camera = {};

        /**
         * 摄像机模式，自由模式和跟随模式
         */
        camera.cameraMode = {
            free: 0,
            follow: 1
        }

        camera.Camera = (function() {
            let saveMatrix = moon.Drawing.Drawing3D.Matrix.mat4.constOrigin();
            /**
             * 摄像机类
             * @param {moon.Vector3} position 摄像机坐标
             * @param {moon.Vector2} size 摄像机大小
             * @param {moon.Vector3} velocity 速度
             */
            function Camera(position, size, velocity, range) {
                this.position = position || new moon.Vector3(0, 0, 1);
                this.size = size || new moon.Vector2(moon.Game.WIDTH, Moon.Game.HEIGHT);
                this.velocity = velocity || new moon.Vector2(100, 100, 100);
                this.mode = camera.cameraMode.free;

                this.range = range || new moon.Rectangle(0, 0, moon.Game.WIDTH, moon.Game.HEIGHT); // 摄像头活动范围

                this.front = new Float32Array([0, 0, -1]); // 摄像头前方向
                this.up = new Float32Array([0, 1, 0]); // 摄像头上方向

                // 摄像头矩阵
                let pos = this.position.toFloatArray();
                pos[0] = -pos[0];
                pos[1] = -pos[1];
                pos[2] = -pos[2];
                this.matrix = moon.Drawing.Drawing3D.Matrix.mat4.lookAt(pos,
                    moon.Drawing.Drawing3D.Vector.vec3.plus(pos,
                        this.front),
                    this.up);

                this._noCamera = false; // true代表下一次使用Camera时不进行变换
            };
            /**
             * 下一次绘图是否包含摄像机变换
             */
            Camera.prototype.withCamera = function(flag) {
                this._noCamera = flag;
            };
            Camera.prototype.update = function() {
                this.lockCamera();

                // 更新摄像头矩阵
                let pos = this.position.toFloatArray();
                pos[0] = -pos[0];
                pos[1] = -pos[1];
                pos[2] = -pos[2];
                this.matrix = moon.Drawing.Drawing3D.Matrix.mat4.lookAt(pos,
                    moon.Drawing.Drawing3D.Vector.vec3.plus(pos,
                        this.front),
                    this.up);

                if (this.mode == camera.cameraMode.follow)
                    return;
            };
            /**
             * 将摄像机锁定在世界之中
             */
            Camera.prototype.lockCamera = function() {
                this.position.x = moon.Utils.clamp(
                    this.position.x,
                    this.range.x,
                    this.range.width - this.size.x
                );
                this.position.y = moon.Utils.clamp(
                    this.position.y,
                    this.range.y,
                    this.range.height - this.size.y
                );
            };
            /**
             * 将摄像机绑定在物体和世界中
             */
            Camera.prototype.lock = function(body, width, height) {
                if (this.mode == moon.cameraMode.free)
                    return;
                this.position.x = body.position.x + (body.size.x - this.size.x) / 2;
                this.position.y = body.position.y + (body.size.y - this.size.y) / 2;

                // this.position.x = Math.floor(this.position.x);
                // this.position.y = Math.floor(this.position.y);
                this.lockCamera(width, height);
            };
            /**
             * 保存当前摄像机信息
             */
            Camera.prototype.save = function() {
                saveMatrix = this.matrix;
            };
            /**
             * 恢复摄像机信息
             */
            Camera.prototype.restore = function() {
                this.matrix = saveMatrix;
            };
            /**
             * 重置摄像机
             */
            Camera.prototype.reset = function() {
                this.position.toZero();
                this.matrix = moon.Drawing.Drawing3D.Matrix.mat4.constOrigin();
            };
            /**
             * 获取摄像头矩阵
             */
            Camera.prototype.getMatrix = function() {
                if (this._noCamera)
                    return moon.Drawing.Drawing3D.Matrix.mat4.constOrigin();
                return this.matrix;
            };
            return Camera;
        }());

        return camera;
    }());

    // 插件系统
    moon.Plugin = (function() {
        let plugin = {};

        /**
         * 获取配置信息
         */
        plugin.getPlugin = function(url, callback, method) {
            let xhr = new XMLHttpRequest();
            xhr.responseType = 'json';
            xhr.onload = function() {
                callback(this.response);
            }
            xhr.open(method || 'GET', url);
            xhr.send(null);
        }

        /**
         * 加载插件
         * @param {[]} list 插件列表
         * @param {function} callback 回调函数
         */
        plugin.loadPlugin = function(list, callback) {
            // 插件数量
            let count = list.length;

            if (count == 0)
                callback();

            for (let i = 0; i < list.length; i++) {
                let s = document.createElement('script');
                s.onload = function() {
                    count--;
                    if (count == 0)
                        callback();
                }
                s.onerror = function() {
                    throw '插件 ' + list[i] + ' 加载失败';
                }
                s.src = list[i];
                // 添加插件
                document.body.appendChild(s);
            }
        }

        /**
         * 加载脚本
         */
        plugin.loadScript = function(url) {
            let s = document.createElement('script');
            s.src = url;
            document.body.appendChild(s);
        }

        return plugin;
    }());

    return moon;
}());