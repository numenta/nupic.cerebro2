var AbstractVisualization = Fiber.extend(function() {
    return {
        init: function(container, history) {
            this.container = container;
            this.history = history;

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

            this.reshape = false;

            this.snapshot = null;
            this.loadLayersTimeout = null;
            this.loadLayersTimeoutDuration = 500; // default (in ms)

            this._initDrawings();
            this._initControls();
            this._initStats();
            this._initGUI();

            this.historyUpdated();

            this.setControls();
        },

        /* To Override */

        getInputDrawing: function() {return null;},
        getOutputDrawing: function() {return null;},
        initCamera: function(width, height) {return null;},
        setControls: function() {return null;}, // optional override

        // Events
        iterationChanged: function() {},

        /* Public */
        initRenderer: function() {
            return new THREE.WebGLRenderer();
        },

        render: function() {
            if (this.stats) this.stats.begin();

            this._update();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);

            if (this.stats) this.stats.end();

            requestAnimationFrame(this.render.bind(this));
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
            if (!this.playing) {
                this._enableController('speed');
                this._enableController('pause');
                this._player();
            } else {
                this.pause();
            }
            for (var i = 0; i < this.gui.__controllers.length; i++) {
                if (this.gui.__controllers[i].property === "play") {
                    this.gui.__controllers[i].name( (this.playing) ? "play" : "pause");
                }
            }
            this.playing = !this.playing;
        },

        pause: function() {
            clearTimeout(this.timer);
            this._disableController('speed');
        },

        /* Private */

        _player: function() {
            this.timer = _.delay(function(_this){
                _this.iteration++;
                if(_this.iteration < _this.guiIteration.__max) {
                    _this._player();
                } else {
                    _this.pause();
                }
            }, this._calculateSpeed(),this);
        },

        _calculateSpeed: function() {
            return this.maxSpeed - this.speed;
        },

        _findController: function(controllerName) {
            for (var i = 0; i < this.gui.__controllers.length; i++) {
                var controller = this.gui.__controllers[i];

                if (controller.property === controllerName) {
                    return controller;
                }
            }

            return null;
        },

        _disableController: function(controllerName) {
            var controller = this._findController(controllerName);
            if (!controller) return;

            if($(controller.__li).children(".disabled").length > 0) return;
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

        _initDrawings: function() {
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

            var inputDrawing = this.getInputDrawing(scene),
                outputDrawing = this.getOutputDrawing(scene);

            outputDrawing.setInputDrawing(inputDrawing);

            this.inputDrawing = inputDrawing;
            this.outputDrawing = outputDrawing;

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

        _initGUI: function() {
            var gui = new dat.GUI({ autoPlace: false }),
                domElement = $(gui.domElement);

            domElement.addClass("controls");
            this.container.append(domElement);

            this.next = this._nextIteration;
            this.prev = this._prevIteration;

            this.guiIteration = gui.add(this, 'iteration', 0, 0).step(1).listen();
            gui.add(this, 'play');
            gui.add(this, 'speed', 0, this.maxSpeed).step(1);
            gui.add(this, 'next');
            gui.add(this, 'prev');

            var outputDrawing = this.outputDrawing,
                updateCells = _.bind(outputDrawing.updateCells, outputDrawing),
                updateProximalSynapses = _.bind(outputDrawing.updateProximalSynapses, outputDrawing),
                updateDistalSynapses = _.bind(outputDrawing.updateDistalSynapses, outputDrawing),
                reshapeUpdated = _.bind(this._reshapeUpdated , this);

            var viewFolder = gui.addFolder('View');
            viewFolder.add(this.outputDrawing, 'showActiveColumns').onChange(updateCells);
            viewFolder.add(this.outputDrawing, 'showActiveCells').onChange(updateCells);
            viewFolder.add(this.outputDrawing, 'showPredictedCells').onChange(updateCells);
            viewFolder.add(this.outputDrawing, 'showProximalSynapses').onChange(updateProximalSynapses);
            viewFolder.add(this.outputDrawing, 'showDistalSynapses').onChange(updateDistalSynapses);
            viewFolder.add(this, 'reshape').onChange(reshapeUpdated);

            this.gui = gui;

            // disable some controllers
            this._disableController('speed');
        },

        _update: function() {
            if (this.lastIteration != this.iteration) {
                this._iterationUpdated();
                this.iterationChanged(); // fire event
                this.lastIteration = this.iteration;
            }
        },

        _nextIteration: function() {
            this.pause();
            this.iteration = Math.min(this.iteration + 1, this.history.length());
        },

        _prevIteration: function() {
            this.pause();
            this.iteration = Math.max(this.iteration - 1, 0);
        },

        _iterationUpdated: function() {
            var lastSnapshot = this.snapshot,
                snapshot = this.history.getSnapshotAtIndex(this.iteration - 1);

            if (!snapshot) {
                console.log("Invalid iteration index: " + this.iteration);
                console.log("History length: " + this.history.length());
                return;
            }

            this.snapshot = snapshot;

            this._loadLayers();

            var inputDimensions = snapshot.getInputLayer().getDimensions(),
                outputDimensions = snapshot.getOutputLayer().getDimensions(),
                inputDimensionsChanged = true,
                outputDimensionsChanged = true,
                inputDrawing = this.inputDrawing,
                outputDrawing = this.outputDrawing;

            inputDrawing.setLayerDimensions(inputDimensions, this.reshape);
            outputDrawing.setLayerDimensions(outputDimensions, this.reshape);

            if (lastSnapshot) {
                var lastInputDimensions = lastSnapshot.getInputLayer().getDimensions(),
                    lastOutputDimensions = lastSnapshot.getOutputLayer().getDimensions();

                if (_.isEqual(inputDimensions, lastInputDimensions))
                    inputDimensionsChanged = false;

                if (_.isEqual(outputDimensions, lastOutputDimensions))
                    outputDimensionsChanged = false;
            }

            if (inputDimensionsChanged) {
                inputDrawing.clear();
                inputDrawing.setup();
            }
            if (outputDimensionsChanged) {
                outputDrawing.clear();
                outputDrawing.setup();
            }
        },

        _reshapeUpdated: function() {
            var inputDrawing = this.inputDrawing,
                outputDrawing = this.outputDrawing,
                snapshot = this.snapshot,
                inputDimensions = snapshot.getInputLayer().getDimensions(),
                outputDimensions = snapshot.getOutputLayer().getDimensions();

            this._loadLayers();
            
            inputDrawing.setLayerDimensions(inputDimensions, this.reshape);
            outputDrawing.setLayerDimensions(outputDimensions, this.reshape);

            inputDrawing.clear();
            inputDrawing.setup();

            outputDrawing.clear();
            outputDrawing.setup();
        },

        _loadLayers: function() {
            var self = this,
                snapshot = this.snapshot,
                inputLayer = snapshot.getInputLayer(),
                outputLayer = snapshot.getOutputLayer(),
                inputDrawing = this.inputDrawing,
                outputDrawing = this.outputDrawing,
                timeout = this.loadLayersTimeout,
                timeoutDuration = this.loadLayersTimeoutDuration;

            inputDrawing.reset();
            inputDrawing.updateCells();

            outputDrawing.reset();
            outputDrawing.updateCells();
            outputDrawing.updateProximalSynapses();
            outputDrawing.updateDistalSynapses();

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(function() {
                inputLayer.getActiveCells(_.bind(function(error, activeCells) {
                    if (self.snapshot != this) return;

                    self.inputDrawing.setActiveCells(activeCells);
                    self.inputDrawing.updateCells();
                }, snapshot));

                outputLayer.getActiveColumns(_.bind(function(error, activeColumns) {
                    if (self.snapshot != this) return;

                    self.outputDrawing.setActiveColumns(activeColumns);
                    self.outputDrawing.updateCells();
                }, snapshot));

                outputLayer.getActiveCells(_.bind(function(error, activeCells) {
                    if (self.snapshot != this) return;

                    self.outputDrawing.setActiveCells(activeCells);
                    self.outputDrawing.updateCells();
                }, snapshot));

                outputLayer.getPredictedCells(_.bind(function(error, predictedCells) {
                    if (self.snapshot != this) return;

                    self.outputDrawing.setPredictedCells(predictedCells);
                    self.outputDrawing.updateCells();
                }, snapshot));

                outputLayer.getProximalSynapses(_.bind(function(error, proximalSynapses) {
                    if (self.snapshot != this) return;

                    self.outputDrawing.setProximalSynapses(proximalSynapses);
                    self.outputDrawing.updateProximalSynapses();
                }, snapshot));

                outputLayer.getDistalSynapses(_.bind(function(error, distalSynapses) {
                    if (self.snapshot != this) return;

                    self.outputDrawing.setDistalSynapses(distalSynapses);
                    self.outputDrawing.updateDistalSynapses();
                }, snapshot));
            }, timeoutDuration);

            this.loadLayersTimeout = timeout;
        }
    };
});
