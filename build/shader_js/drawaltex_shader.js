"use strict";

var drawaltex_shader = new GShader(gl);
drawaltex_shader.load_vertex_shader(
  `#version 300 es
    in vec4 v0;
    in vec2 t0;
    uniform mat4 mvp;
    out vec2 tc;

    void main()
    {
      gl_Position = mvp*v0;
      tc = t0;
    }
`);
drawaltex_shader.load_fragment_shader(
 `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 tc;
uniform sampler2DArray tex0;
uniform int layeridx;
out vec4 color;
void main()
{
  color = vec4( texture(tex0, vec3(tc, layeridx)).xyz, 1.0 );
}
`);
drawaltex_shader.link();
drawaltex_shader.add_attrib("v0");
drawaltex_shader.add_attrib("t0");
drawaltex_shader.add_attrib_uniform("tex0");
drawaltex_shader.add_attrib_uniform("mvp");
drawaltex_shader.add_attrib_uniform("layeridx");
