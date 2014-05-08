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

        getInputDrawing: function(scene) {
            return new TwoDDrawing(scene, 0, -200);
        },

        getOutputDrawing: function(scene) {
            return new TwoDDrawing(scene, 0, 200);
        },

        setControls: function() {
            this.controls.noRotate = true;
        }
    };
});
