var TwoDVisualization = AbstractVisualization.extend(function(base) {
    return {
        initRenderer: function() {
            var renderer = base.initRenderer.call(this);
            renderer.setClearColor(COLOR_LIGHT_BACKGROUND);
            return renderer;
        },

        initCamera: function(width, height) {
            var viewAngle = 45,
                aspect = width / height,
                near = 0.1,
                far = 10000;
                camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);

            camera.position.z = 1000;
            
            return camera;
        },

        getInputDrawing: function() {
            return new TwoDDrawing();
        },

        getOutputDrawing: function() {
            return new TwoDDrawing();
        },

        positionDrawings: function(inputDrawing, outputDrawing) {
            var padding = 100;

            var inputObject3D = inputDrawing.getObject3D(),
                outputObject3D = outputDrawing.getObject3D();
                inputSize = inputDrawing.getSize(),
                outputSize = outputDrawing.getSize(),
                total = Math.max(inputSize.y + outputSize.y, 100);

            inputObject3D.position.y = -(total / 4 + padding);
            outputObject3D.position.y = (total / 4 + padding);
        },

        setControls: function() {
            this.controls.noRotate = true;
        }
    };
});
