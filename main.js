// main.js

// ******************* Three.js Code ******************* //
// Scene setup
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 1, 1000
);
camera.position.set(0, 0, 200);
camera.lookAt(0, 0, 0);

/// Renderer setup using the specified canvas
var renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('threejs-canvas'),
    antialias: true,
    alpha: false // Set to false since we have a solid background
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Environment map for reflections
var path = 'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/';
var format = '.jpg';
var urls = [
    path + 'px' + format, path + 'nx' + format,
    path + 'py' + format, path + 'ny' + format,
    path + 'pz' + format, path + 'nz' + format
];

var reflectionCube = new THREE.CubeTextureLoader().load(urls);
reflectionCube.format = THREE.RGBFormat;

// Set scene background to white
scene.background = new THREE.Color(0xffffff);

// Create an octahedron geometry
var geometry = new THREE.OctahedronGeometry(50, 0); // Radius of 50, detail level 0

// Store the original vertex positions
var originalPositions = geometry.attributes.position.array.slice();

// Create a material with reflections
var material = new THREE.MeshStandardMaterial({
    color: 0xcccccc, // Light gray color for better visibility
    metalness: 0.5,
    roughness: 0.2,
    envMap: reflectionCube
});

var mesh = new THREE.Mesh(geometry, material);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

// Lighting
var ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Shader code embedded as strings
var vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

var fragmentShaderSource = `
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    float a = atan(uv.y, uv.x);
    float r = length(uv);

    float f = cos(a * 3.0 + iTime * 2.0) * 0.5 + 0.5;
    float d = abs(sin(r * 10.0 - iTime * 5.0)) * 0.1;

    float color = smoothstep(d, d + 0.01, f);

    vec3 col = vec3(color);

    // Set alpha to allow underlying scene visibility
    gl_FragColor = vec4(col, color * 0.5); // Alpha varies with color intensity
}
`;

// Initialize shaders and start animation
initWebGLShader(vertexShaderSource, fragmentShaderSource);
animate();

// ******************* WebGL Shader Code ******************* //
function initWebGLShader(vertexShaderSource, fragmentShaderSource) {
    // Get the overlay canvas and initialize WebGL
    var overlayCanvas = document.getElementById('overlay-canvas');
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    var gl = overlayCanvas.getContext('webgl', { alpha: true }) || overlayCanvas.getContext('experimental-webgl', { alpha: true });

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shader function
    function compileShader(gl, shaderSource, shaderType) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);

        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            console.error('Could not compile shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Create shader program
    var vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check program linking
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader program failed to link:', gl.getProgramInfoLog(program));
    }

    // Look up attribute and uniform locations
    var positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    var iTimeLocation = gl.getUniformLocation(program, 'iTime');
    var iResolutionLocation = gl.getUniformLocation(program, 'iResolution');

    // Create buffer
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set rectangle positions to cover the canvas
    var positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Store WebGL variables in a global object for access in animate()
    window.webGLVars = {
        gl: gl,
        program: program,
        positionAttributeLocation: positionAttributeLocation,
        iTimeLocation: iTimeLocation,
        iResolutionLocation: iResolutionLocation,
        positionBuffer: positionBuffer,
        overlayCanvas: overlayCanvas
    };
}

// ******************* Animation Loop Script ******************* //
function renderOverlay(time) {
    var gl = webGLVars.gl;
    var program = webGLVars.program;
    var positionAttributeLocation = webGLVars.positionAttributeLocation;
    var iTimeLocation = webGLVars.iTimeLocation;
    var iResolutionLocation = webGLVars.iResolutionLocation;
    var positionBuffer = webGLVars.positionBuffer;
    var overlayCanvas = webGLVars.overlayCanvas;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0); // Set alpha to 0 for transparency
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the program
    gl.useProgram(program);

    // Set uniforms
    gl.uniform1f(iTimeLocation, time * 0.001); // Convert milliseconds to seconds
    gl.uniform2f(iResolutionLocation, overlayCanvas.width, overlayCanvas.height);

    // Enable the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Bind the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer
    gl.vertexAttribPointer(
        positionAttributeLocation,
        2,          // 2 components per iteration
        gl.FLOAT,   // the data is 32bit floats
        false,      // normalize = false
        0,          // stride
        0           // offset
    );

    // Draw the rectangle
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function animate(time) {
    requestAnimationFrame(animate);

    // Time in seconds
    var timeInSeconds = time * 0.001;

    // Wave parameters
    var waveFrequency = 1.5; // Controls the spatial frequency of the wave
    var waveSpeed = 2.0;     // Controls the speed of the wave
    var amplitude = 5.0;     // Maximum displacement

    // Deform the octahedron geometry
    var positionAttribute = geometry.attributes.position;
    var positions = positionAttribute.array;

    for (let i = 0; i < positions.length; i += 3) {
        // Original position
        var ox = originalPositions[i];
        var oy = originalPositions[i + 1];
        var oz = originalPositions[i + 2];

        // Calculate the distance from the vertex to the center
        var distance = Math.sqrt(ox * ox + oy * oy + oz * oz);

        // Compute the displacement
        var displacement = Math.sin((distance * waveFrequency) - (timeInSeconds * waveSpeed)) * amplitude;

        // Apply the displacement along the normal direction
        var nx = ox / distance;
        var ny = oy / distance;
        var nz = oz / distance;

        positions[i] = ox + nx * displacement;
        positions[i + 1] = oy + ny * displacement;
        positions[i + 2] = oz + nz * displacement;
    }

    // Flag the position attribute for update
    positionAttribute.needsUpdate = true;

    /// Update normals for correct lighting
    geometry.computeVertexNormals();

    // Update Three.js scene
    mesh.rotation.y += 0.01; // Rotate the octahedron
    mesh.rotation.x += 0.005; // Slight rotation on x-axis
    renderer.render(scene, camera);

    // Render the overlay shader
    renderOverlay(time);
}

// Handle window resize
window.addEventListener('resize', function() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (window.webGLVars) {
        window.webGLVars.overlayCanvas.width = width;
        window.webGLVars.overlayCanvas.height = height;
    }
});
