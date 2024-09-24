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
