Cerebro2.AbstractVisualization = Fiber.extend(function() {
    return {
        init: function(container, history) {
            this.container = container;
            this.history = history;

            this.loadDelay = 500; // default (in ms)

            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.controls = null;
            this.stats = null;

            this.gui = null;
            this.guiIteration = null;

            this.iteration = 0;
            this.lastIteration = this.iteration;

            this.timer = null;
            this.playing = false;

            this.speed = 500;
            this.maxSpeed = 1000;

            this.snapshot = null;

            this.loadTimeout = null;

            try {
                this._initScene();
                this._initControls();
                this._initStats();

                this.initGUI();

                this.historyUpdated();
            }
            catch (e) {
                container.text(e);
                throw e;
            }
        },

        /* To Override */

        loadData: function() {},
        reset: function() {},

        // Events
        iterationChanged: function(currentSnapshot, lastSnapshot) {},

        /* Public */

        initRenderer: function() {
            try {
                var renderer = new THREE.WebGLRenderer({
                    // NOTE: uncomment below enable screenshots
                    // preserveDrawingBuffer: true
                });
            }
            catch (e) {
                // three.js doesn't throw an informative error message.
                // It just dereferences null.
                throw ("Failed to create WebGLRenderer.");
            }

            THREEx.Screenshot.bindKey(renderer);
            return renderer;
        },

        initCamera: function(width, height) {
            var viewAngle = 45,
                aspect = width / height,
                near = 0.1,
                far = 10000;
                camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);

            return camera;
        },

        initGUI: function() {
            var gui = new dat.GUI({ autoPlace: false }),
                domElement = $(gui.domElement);

            domElement.addClass("controls");
            this.container.append(domElement);

            this.next = this._nextIteration;
            this.prev = this._prevIteration;

            this.guiIteration = gui.add(this, 'iteration', 0, 0).step(1).listen();

            var animationControls = gui.addFolder('Animation');
            animationControls.add(this, 'play');
            animationControls.add(this, 'speed', 0, this.maxSpeed).step(1);
            animationControls.add(this, 'next');
            animationControls.add(this, 'prev');

            this.gui = gui;
        },

        render: function() {
            if (this.stats) this.stats.begin();

            this._update();
            this.controls.update();
            TWEEN.update();
            this.renderer.render(this.scene, this.camera);

            if (this.stats) this.stats.end();

            requestAnimationFrame(this.render.bind(this));
        },

        readyToLoadData: function() {
            var self = this,
                timeout = this.loadTimeout,
                delay = this.loadDelay;

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(function() {
                self.loadData()
            }, delay);

            this.loadTimeout = timeout;
        },

        historyUpdated: function() {
            var num = this.history.length(),
                guiIteration = this.guiIteration;

            var min = Number(num > 0),
                max = num;

            guiIteration.__min = min;
            guiIteration.__max = max;

            if (guiIteration.getValue() === 0) {
                guiIteration.setValue(min);
            }
        },

        play: function() {
            if (!this.playing && this._isControllerEnabled("play")) {
                  this.playing = true;
                  this._changeControllerText("play", "pause");
                  this._player();
              } else {
                  this.pause();
              }
        },

        pause: function() {
            clearTimeout(this.timer);
            this.playing = false;
            if (this._isControllerEnabled("play")) {
                this._changeControllerText("play", "play");
            }
        },

        /* Private */

        _player: function() {
            if (this.iteration < this.guiIteration.__max) {
                this.timer = _.delay(function(_this){
                    _this.iteration++;
                    _this._player();
                }, this._calculateSpeed(), this);
            } else {
                this.pause();
            }
        },

        _changeControllerText: function(name, label) {
            var controller = this._findController(name);
            if(controller) {
                controller.name(label);
                return controller.property;
            } else {
                return false;
            }
        },

        _calculateSpeed: function() {
            return this.maxSpeed - this.speed;
        },

        _findController: function(controllerName) {
            // first we look in the top level
            var controller = this._findControllerHelper(this.gui, controllerName);
            if (controller) {
                return controller;
            // then the folders
            } else {
                for (folder in this.gui.__folders) {
                    controller = this._findControllerHelper(this.gui.__folders[folder], controllerName);
                    if (controller) {
                        return controller;
                    }
                }
            }
            return null;
        },

        _findControllerHelper: function(obj, controllerName) {
            for (var i = 0; i < obj.__controllers.length; i++) {
                var controller = obj.__controllers[i];
                if (controller.property === controllerName) {
                    return controller;
                }
            }
            return null;
        },

        _findFolder: function(folderName) {
            return (_.isUndefined(this.gui.__folders[folderName])) ? null : this.gui.__folders[folderName];
        },

        _disableController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller || $(controller.__li).children(".disabled").length > 0) {
                return;
            }
            $(controller.__li).append("<div class='disabled'></div>");
        },

        _enableController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            $(controller.__li).children().remove(".disabled");
        },

        _hideController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            $(controller.__li).addClass("hidden");
        },

        _isControllerEnabled: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller || $(controller.__li).children(".disabled").length > 0) {
                return false;
            }
            return true;
        },

        _hideFolder: function(folderName) {
            var folder = this._findFolder(folderName);
            if (!folder) return;

            $(folder.__ul).addClass("hidden");
        },

        _initScene: function() {
            var container = this.container,
                width = container.width(),
                height = container.height();

            var scene = new THREE.Scene();
            var renderer = this.initRenderer();

            var camera = this.initCamera(width, height);
            scene.add(camera);

            renderer.setSize(width, height);
            this.container.append(renderer.domElement);

            this.renderer = renderer;
            this.camera = camera;
            this.scene = scene;

            this._watchForResize();
        },

        _watchForResize: function() {
            var renderer = this.renderer,
                camera = this.camera,
                container = this.container;

            $(window).resize(function() {
                var width = container.width(),
                    height = container.height();

                renderer.setSize(width, height);
                
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            });
        },

        _initControls: function() {
            var camera = this.camera,
                renderer = this.renderer,
                controls = new THREE.TrackballControls(camera, renderer.domElement);

            controls.rotateSpeed = 1.0;
            controls.zoomSpeed = 1.2;
            controls.panSpeed = 0.8;

            controls.noZoom = false;
            controls.noPan = false;

            controls.staticMoving = true;
            controls.dynamicDampingFactor = 0.3;

            controls.keys = [65, 83, 68];

            this.controls = controls;
        },

        _initStats: function() {
            var stats = new Stats(),
                domElement = $(stats.domElement);

            stats.setMode(0); // 0: fps; 1: ms

            domElement.addClass("stats");
            this.container.append(domElement);

            this.stats = stats;
        },

        _update: function() {
            if (this.lastIteration != this.iteration) {
                this._iterationChanged();
                this.lastIteration = this.iteration;
                this._setButtonState();
            }
        },

        _nextIteration: function() {
            this.pause();
            this.iteration = Math.min(this.iteration + 1, this.history.length());
        },

        _prevIteration: function() {
            this.pause();
            this.iteration = Math.max(this.iteration - 1, 1);
        },

        _iterationChanged: function() {
            var lastSnapshot = this.snapshot,
                snapshot = this.history.getSnapshotAtIndex(this.iteration - 1);

            if (!snapshot) {
                console.log("Invalid iteration index: " + this.iteration);
                console.log("History length: " + this.history.length());
                return;
            }
            
            this.snapshot = snapshot;
            this.readyToLoadData();
            this.iterationChanged(snapshot, lastSnapshot); // fire public event
        },

        _setButtonState: function() {
            if (this.guiIteration) {
                // if counter is at max:
                if (this.iteration >= this.guiIteration.__max) {
                    this._disableController("play");
                    this._disableController("next");
                    this._enableController("prev");
                // if counter is at min:
                } else if (this.iteration <= this.guiIteration.__min) {
                    this._enableController("play");
                    this._enableController("next");
                    this._disableController("prev");
                } else {
                    this._enableController("play");
                    this._enableController("next");
                    this._enableController("prev"); 
                }
            }
        },
        
        _updateFOV: function(value) {
            this.camera.fov = value;
            this.camera.updateProjectionMatrix();
        }
    };
});
