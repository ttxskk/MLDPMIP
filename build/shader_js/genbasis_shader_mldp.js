"use strict";

var genbasis_shader_mldp = new GShader(gl);
genbasis_shader_mldp.load_vertex_shader(
 `#version 300 es
        in vec4 v0;
        in vec2 t0;
        uniform mat4 mvp;
        out vec2 tc;
        void main()
            {
	        tc = t0;
	        gl_Position = mvp * v0;
            }
     `);
genbasis_shader_mldp.load_fragment_shader(
 `#version 300 es
        precision highp float;
        precision lowp sampler2DArray;

        #define PI 3.14159265358979

        in vec2 tc;
        uniform sampler2DArray depthmap;
        uniform int layeridx;

        layout(location = 0) out vec4 Frag0;
        layout(location = 1) out vec4 Frag1;
        layout(location = 2) out vec4 Frag2;
        layout(location = 3) out vec4 Frag3;
        void main()
        {
          float depth = texture( depthmap, vec3(tc,layeridx) ).x*2.0-1.0;
          vec4 kv = PI*depth*vec4(1.0, 3.0, 5.0, 7.0);
          Frag0 = cos(kv);
          Frag1 = sin(kv);
          Frag2 = depth*Frag0;
          Frag3 = depth*Frag1;

          Frag0 = vec4(0.5, 1.0, 0.5, 1.0);//texture( depthmap, vec3(tc,layeridx) );//vec4(1.0);//(Frag0+1.0) /2.0;      // [0,1]
          Frag1 = vec4(1.0, 0.5, 0.1, 1.0);//texture( depthmap, vec3(tc,layeridx) );//vec4(1.0, 0.0, 1.0, 1.0);//(Frag1+1.0) /2.0;      // [0,1]
          Frag2 = vec4(1.0, 0.1, 1.0, 1.0);//texture( depthmap, vec3(tc,layeridx) );//vec4(0.0, 1.0, 1.0, 1.0);//(Frag2+1.0) /2.0;      // [0,1]
          Frag3 = vec4(1.0, 1.0, 0.1, 1.0);//texture( depthmap, vec3(tc,layeridx) );//vec4(1.0, 1.0, 0.0, 1.0);//(Frag3+1.0) /2.0;      // [0,1]
        }

     `);
genbasis_shader_mldp.link();
genbasis_shader_mldp.add_attrib("v0");
genbasis_shader_mldp.add_attrib("t0");
genbasis_shader_mldp.add_attrib_uniform("mvp");
genbasis_shader_mldp.add_attrib_uniform("depthmap");
genbasis_shader_mldp.add_attrib_uniform("layeridx");
