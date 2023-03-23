import * as THREE from 'https://unpkg.com/three@0.148.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.148.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.148.0/examples/jsm/controls/OrbitControls.js';
import { DragControls  } from 'https://unpkg.com/three@0.148.0/examples/jsm/controls/DragControls.js';
import WebGL from 'https://unpkg.com/three@0.148.0/examples/jsm/capabilities/WebGL.js';
import { GUI } from 'https://unpkg.com/three@0.148.0/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'https://unpkg.com/three@0.148.0/examples/jsm/libs/stats.module.js';
import { Vector3 } from 'https://unpkg.com/three@0.148.0/build/three.module.js';
import { StereoEffect } from 'https://unpkg.com/three@0.148.0/examples/jsm/effects/StereoEffect.js';

if (WebGL.isWebGLAvailable() === false)
  document.body.appendChild(WebGL.getWebGLErrorMessage());
document.onselectstart = new Function('return false;');


var container, gui, stats, renderer;
var vrrender;
var isVr = false; 

var beizer_pos = [];
var beizer_t0 = 0;
var beizer_length = 0;
var beizer_t = 0;

var state_api = { state: 'Walking' };


var map_select = ['Seamless DP Map', 'Cubemap', 'Multiple DP map','Multiple CM map'];
var map_select_api = { map_type: 'Seamless DP Map' };
var maptype = 0;


var settings;

var cm_camera, cm_face_mat, cm_screen_mat, cm_rt, cm_texid;
var cameraRTT, materialRTT, materialScreen, texdp_rt_id, texdp_id;


var cameraScreen, cameraScreen_controls;
var screen_zmesh1, screen_zmesh2;
var screen_mesh;

var sceneScreen;
var light_sphere;

var M = 4;
var zNear = 0.3;
var zFar = Math.sqrt(12.0);
var shadow_a = 25.0;
var shadow_b = 20.0;


var cm_side = 512;
var dp_side = 886;

var dp_fbo, dp_rbo;
var cm_fbo, cm_rbo;

var lightsize = .028;
var tiles_per_second = 5;
var tiles_length = .2;
var my_quad, my_quad_buffer;
var time_scale = 60;
var draw_tex_id = 1;
var draw_mldptex_id = 1;
var draw_layer_idx = 0;
var draw_mlcmtex_id = 0;

//var model;
var modelforward0 = new THREE.Vector3(0, 0, 1);
var modelforward = new THREE.Vector3(0, 0, 1);
var actions, activeAction, previousAction;

var model = new Array(), mixer = new Array();
var my_interval_id, face, num_of_display_robot=1;


var my_dot;
var lineA;

//multiple light
var ml_light = new Array();
var light1, light2;
var Max_num_light = 16; 
//var number_display_light = 3;

var n_light = 3;

//var ml_lpos = new Array(n_light);
//var ml_lsize = new Array(n_light);
//var ml_zFar = new Array(n_light);
var ml_lpos = new Array(Max_num_light);
var ml_lsize = new Array(Max_num_light);
var ml_zFar = new Array(Max_num_light);
//dp map
var mldp_fbo, mldp_rbo;
var mldp_cameraRTT, mldp_RTT, mldp_Screen, mltexdp_rt_id, mltexdp_id;
var mltexdp_rt_s_id, mltexdp_s_id, draw_texture;  //draw_texture indeed stores the depth map and basis maps.
//cubemap
var mlcm_fbo, mlcm_rbo;
var mlcm_camera, mlcm_face_mat, mlcm_Screen, mltexcm_rt, mltexcm;


function onWindowResize() {
  cameraScreen.aspect = window.innerWidth / window.innerHeight;
  cameraScreen.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
  window.addEventListener('resize', onWindowResize, false);

  //gui = new dat.GUI();
  gui = new GUI();

  stats = new Stats();

  renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;

  container = document.getElementById('container');
  container.appendChild(renderer.domElement);
  container.appendChild(stats.dom);

  vrrender = new StereoEffect(renderer);
  vrrender.setSize(window.innerWidth, window.innerHeight);
  vrrender.setEyeSeparation(0.6);

  //--------------------------------------------------------------------
  //single light cube map
  //--------------------------------------------------------------------
  cm_camera = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
    cm_face_mat = new THREE.ShaderMaterial({
      uniforms: {
        mvp: { value: new THREE.Matrix4() },
        zFar: { value: zFar },
        l: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: document.getElementById('cm_shader_vs').textContent,
      fragmentShader: document.getElementById('cm_shader_fs').textContent,
    });
    cm_rt = new Array(M + 1);
    cm_texid = new Array(M + 1);
    var i, s;
    for (i = 0; i < M + 1; i++) {
      //cm_rt[i] = new THREE.WebGLRenderTargetCube(cm_side, cm_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
      cm_rt[i] = new THREE.WebGLCubeRenderTarget(cm_side, cm_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
      for (s = 0; s < 6; s++)
        renderer.setRenderTarget(cm_rt[i], s);
      cm_texid[i] = renderer.properties.get(cm_rt[i].texture).__webglTexture;
    }

    cm_screen_mat = new THREE.ShaderMaterial({
      uniforms: {
        l: { value: new THREE.Vector3() },
        eye: { value: new THREE.Vector3() },
        zNear: { value: zNear },
        zFar: { value: zFar },
        lightsize: { value: lightsize },
        cmmap: {
          value: [cm_rt[0].texture,
          cm_rt[1].texture,
          cm_rt[2].texture,
          cm_rt[3].texture,
          cm_rt[4].texture]
        },
        tex0: { value: cm_rt[1].texture },
        lightmv: { value: new THREE.Matrix4() },
        shadow_a: { value: shadow_a },
        shadow_b: { value: shadow_b },
      },
      vertexShader: document.getElementById('csm_cm_shader_vs').textContent,
      fragmentShader: document.getElementById('csm_cm_shader_fs').textContent
    });
   //--------------------------------------------------------------------

  //--------------------------------------------------------------------
  //single light dp map
  //--------------------------------------------------------------------
    cameraRTT = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
    materialRTT = new THREE.ShaderMaterial({
      uniforms: {
        mvp: { value: new THREE.Matrix4() },
        zFar: { value: zFar },
        l: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: document.getElementById('dp_shader_vs').textContent,
      fragmentShader: document.getElementById('dp_shader_fs').textContent,
      //side: THREE.DoubleSide,
    });

    cameraScreen = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraScreen.position.set(.3, 3, 3);
    cameraScreen_controls = new OrbitControls(cameraScreen, renderer.domElement);
    cameraScreen_controls.maxPolarAngle = Math.PI * 0.5;
    cameraScreen_controls.minDistance = 0.01;
    cameraScreen_controls.maxDistance = 12;
    cameraScreen_controls.target.set(.3, 0, 0);
    cameraScreen_controls.update();

    texdp_id = new Array(2 * (M + 1));
    texdp_rt_id = new Array(2 * (M + 1));
    var i;
    for (i = 0; i < 2 * (M + 1); i++) {
      texdp_rt_id[i] = new THREE.WebGLRenderTarget(dp_side, dp_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
      renderer.setRenderTarget(texdp_rt_id[i]);
      renderer.clear();
      texdp_id[i] = renderer.properties.get(texdp_rt_id[i].texture).__webglTexture;
    }

    materialScreen = new THREE.ShaderMaterial({
      uniforms: {
        l: { value: new THREE.Vector3() },
        eye: { value: new THREE.Vector3() },
        zNear: { value: zNear },
        zFar: { value: zFar },
        lightsize: { value: lightsize },
        dpmap: {
          value: [texdp_rt_id[0].texture, texdp_rt_id[1].texture,
          texdp_rt_id[2].texture, texdp_rt_id[3].texture,
          texdp_rt_id[4].texture, texdp_rt_id[5].texture,
          texdp_rt_id[6].texture, texdp_rt_id[7].texture,
          texdp_rt_id[8].texture, texdp_rt_id[9].texture]
        },
        tex0: { value: texdp_rt_id[1].texture },
        lightmv: { value: new THREE.Matrix4() },
        shadow_a: { value: shadow_a },
        shadow_b: { value: shadow_b },
      },
      vertexShader: document.getElementById('csm_dp_shader_vs').textContent,
      fragmentShader: document.getElementById('csm_dp_shader_fs').textContent
    });
  //--------------------------------------------------------------------

  var nn = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  console.log(nn);
  //--------------------------------------------------------------------
  //multiple light - dp map
  //--------------------------------------------------------------------
  //mltexdp_id = new Array(n_light);
  //mltexdp_rt_id = new Array(n_light);
  mltexdp_id = new Array(Max_num_light);
  mltexdp_rt_id = new Array(Max_num_light);
  var i, j;
  for (i = 0; i < Max_num_light ; i++)
  {
    mltexdp_rt_id[i] = new THREE.WebGLArrayRenderTarget(dp_side, dp_side, 2 * (M + 1));
    mltexdp_rt_id[i].texture.format = THREE.RGBAFormat;
    mltexdp_rt_id[i].texture.minFilter = THREE.LinearFilter;
    mltexdp_rt_id[i].texture.magFilter = THREE.LinearFilter;

    for (j = 0; j < 2 * (M + 1); j++)
      renderer.setRenderTarget(mltexdp_rt_id[i], j);

    mltexdp_id[i] = renderer.properties.get(mltexdp_rt_id[i].texture).__webglTexture;
    mltexdp_id[i].needsUpdate = true;
  }

  //mltexdp_rt_s_id = new Array(n_light*2);
  //mltexdp_s_id = new Array(n_light*2); 
  mltexdp_rt_s_id = new Array(Max_num_light*2);
  mltexdp_s_id = new Array(Max_num_light*2); 
  for (i = 0; i < Max_num_light * 2; i++) {
    mltexdp_rt_s_id[i] = new THREE.WebGLRenderTarget(dp_side, dp_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    renderer.setRenderTarget(mltexdp_rt_s_id[i]);
    mltexdp_s_id[i] = renderer.properties.get(mltexdp_rt_s_id[i].texture).__webglTexture;
  }

  //draw_texture = new Array(n_light);
  draw_texture = new Array(Max_num_light);
  for (var k = 0; k < Max_num_light; k++) {
    draw_texture[k] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, draw_texture[k]);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0, 
      gl.RGBA,
      dp_side, dp_side,
      2 * (M + 1),
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
  }

  mldp_cameraRTT = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
  mldp_RTT = new THREE.ShaderMaterial({
    uniforms: {
      mvp: { value: new THREE.Matrix4() },
      zFar: { value: Math.sqrt(12.0) },        //error
      l: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: document.getElementById('mldp_shader_vs').textContent,
    fragmentShader: document.getElementById('mldp_shader_fs').textContent,
  });

  var tmplmv = new Array(Max_num_light);
  for (var i = 0; i < Max_num_light; i++) {
    ml_lpos[i] = new THREE.Vector3();
    ml_lsize[i] = lightsize;
    ml_zFar[i] = zFar;
    tmplmv[i] = new THREE.Matrix4();
  }
  
  mldp_Screen = new THREE.ShaderMaterial({
    uniforms: {
      eye: { value: new THREE.Vector3() },
      zNear: { value: zNear },
      shadow_a: { value: shadow_a },
      shadow_b: { value: shadow_b },
      l: { value: ml_lpos },
      mldp_zFar: { value: ml_zFar },
      lsize: { value: ml_lsize },//,
      num_dis_light: { value: n_light },
      mldpmap: {
        value: [
          mltexdp_rt_id[0].texture, mltexdp_rt_id[1].texture, mltexdp_rt_id[2].texture,
          mltexdp_rt_id[3].texture, mltexdp_rt_id[4].texture, mltexdp_rt_id[5].texture,
          mltexdp_rt_id[6].texture, mltexdp_rt_id[7].texture, mltexdp_rt_id[8].texture,
          mltexdp_rt_id[9].texture, mltexdp_rt_id[10].texture, mltexdp_rt_id[11].texture,
          mltexdp_rt_id[12].texture, mltexdp_rt_id[13].texture, mltexdp_rt_id[14].texture,
          mltexdp_rt_id[15].texture
        ]
      }, //draw_texture[0]]},
      //lightmv: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] }
      lightmv: {
        value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
          new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
          new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
          new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()
        ]
      }
    },
    vertexShader: document.getElementById('csm_mldp_shader_vs').textContent,
    fragmentShader: document.getElementById('csm_mldp_shader_fs').textContent
  });

  //for (var k = 0; k < Max_num_light; k++) {
  //  mldp_Screen.uniforms.mldpmap.value[k] = mltexdp_rt_id[k].texture;
  //  mldp_Screen.uniforms.lightmv.value[k] = new THREE.Matrix4();
  //}
  mldp_Screen.needsUpdate = true;



  //--------------------------------------------------------------------


  //--------------------------------------------------------------------
  //multiple light cubemap
  //--------------------------------------------------------------------
  //var mlcm_fbo, mlcm_rbo;
  //mltexcm_rt = new Array(n_light * (M + 1));
  //mltexcm = new Array(n_light * (M + 1));
  mltexcm_rt = new Array(Max_num_light * (M + 1));
  mltexcm = new Array(Max_num_light * (M + 1));

  for (i = 0; i < Max_num_light * (M + 1); i++) {
    mltexcm_rt[i] = new THREE.WebGLCubeRenderTarget(cm_side, cm_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    for (j = 0; j < 6; j++)
      renderer.setRenderTarget(mltexcm_rt[i], j);
    mltexcm[i] = renderer.properties.get(mltexcm_rt[i].texture).__webglTexture;
  }

  mlcm_camera = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
  mlcm_face_mat = new THREE.ShaderMaterial({
    uniforms: {
      mvp: { value: new THREE.Matrix4() },
      zFar: { value: zFar },
      l: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: document.getElementById('mlcm_shader_vs').textContent,
    fragmentShader: document.getElementById('mlcm_shader_fs').textContent,
  });

  mlcm_Screen = new THREE.ShaderMaterial({
    uniforms: {
      eye: { value: new THREE.Vector3() },
      zNear: { value: zNear },
      shadow_a: { value: shadow_a },
      shadow_b: { value: shadow_b },
      l: { value: ml_lpos },
      mlcm_zFar: { value: ml_zFar },
      lsize: { value: ml_lsize },
      cmmap: {
        value: [mltexcm_rt[0].texture, mltexcm_rt[1].texture, mltexcm_rt[2].texture, mltexcm_rt[3].texture, mltexcm_rt[4].texture,
          mltexcm_rt[5].texture, mltexcm_rt[6].texture, mltexcm_rt[7].texture, mltexcm_rt[8].texture, mltexcm_rt[9].texture,
          mltexcm_rt[10].texture, mltexcm_rt[11].texture, mltexcm_rt[12].texture, mltexcm_rt[13].texture, mltexcm_rt[14].texture
        ]
      },
      lightmv: { value: [new THREE.Matrix4(),new THREE.Matrix4(),new THREE.Matrix4()] },
    },
    vertexShader: document.getElementById('csm_mlcm_shader_vs').textContent,
    fragmentShader: document.getElementById('csm_mlcm_shader_fs').textContent
  });
  //--------------------------------------------------------------------



  my_quad = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,]);
  my_quad.n = 6;

  var grid;
  {
    var rt_geometry = new THREE.TorusGeometry( 0.2, 0.04, 64, 32 );
    screen_zmesh1 = new THREE.Mesh(rt_geometry, materialScreen);
    //screen_zmesh1 = new THREE.Mesh(rt_geometry, mldp_Screen);
    screen_zmesh1.position.set(0, .25, 0);
    screen_zmesh1.scale.set(1, 1, 1);
    screen_zmesh1.rotation.y = 0;
    screen_zmesh2 = new THREE.Mesh(rt_geometry, materialScreen);
    //screen_zmesh2 = new THREE.Mesh(rt_geometry, mldp_Screen);
    screen_zmesh2.position.set(0, .5, 0);
    screen_zmesh2.scale.set(0.75, 0.75, 0.75);
    screen_zmesh2.rotation.y = Math.PI / 2;

    screen_mesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 100, 100), materialScreen);
    //screen_mesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 100, 100), mldp_Screen);
    screen_mesh.rotation.x = -Math.PI / 2;

    grid = new THREE.GridHelper(20, 100, 0x000000, 0x000000);
    grid.position.set(0, .002, 0);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;

    var geometry = new THREE.SphereGeometry(1, 20, 20);
    light_sphere = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDDDDDD }));
    light_sphere.position.set(.6, .8, .6);
    light_sphere.scale.set(lightsize, lightsize, lightsize);

    // MAX light setting
    ml_light.push(light_sphere);
    ml_lpos[0] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);

    my_dot = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x7D400C }));
    my_dot.position.set(.6, 0, .6);
    my_dot.scale.set(lightsize, lightsize, lightsize);

    //multiple light sphere
    light1 = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDDDDDD }));
    light1.position.set(.5, .8, .8);
    light1.scale.set(lightsize, lightsize, lightsize);
    ml_light.push(light1);
    ml_lpos[1] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);

    light2 = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDDDDDD }));
    light2.position.set(.9, .9, .7);
    light2.scale.set(lightsize, lightsize, lightsize);
    ml_light.push(light2);
    ml_lpos[2] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);

  }

  sceneScreen = new THREE.Scene();
  sceneScreen.add(screen_zmesh1);
  sceneScreen.add(screen_zmesh2);
  sceneScreen.add(screen_mesh);
  sceneScreen.add(grid);
  sceneScreen.add(light_sphere);
  sceneScreen.add(light1);
  sceneScreen.add(light2);
  sceneScreen.add(my_dot);


  //multiple light
  for (i = 3; i < Max_num_light; i++) {
    var tl = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDDDDDD }));
    var x = THREE.MathUtils.randFloat(0.0, 1.0);//0.1, 0.7);
    var y = 0.9;//THREE.MathUtils.randFloat(0.5, 0.9);
    var z =  THREE.MathUtils.randFloat(0.0, 1.0);//0.5, 0.9);
    //console.log(x);
    //console.log(y);
    //console.log(z);

    tl.position.set(x, y, z);
    tl.scale.set(lightsize, lightsize, lightsize);

    ml_light.push(tl);
    sceneScreen.add(tl);

    ml_lpos[i] = new THREE.Vector3(tl.position.x, tl.position.y, tl.position.z);
  }




  var objects = [];
  objects.push(light_sphere);
  objects.push(light1);
  objects.push(light2);
  for (var i = 0; i < Max_num_light; i++)
    objects.push(ml_light[i]);

  
  var dragControls = new DragControls(objects, cameraScreen, renderer.domElement);
  dragControls.addEventListener('dragstart', function () {
    cameraScreen_controls.enabled = false;
  });
  dragControls.addEventListener('dragend', function (my_event) {
    cameraScreen_controls.enabled = true;
  });

  sceneScreen.background = new THREE.Color(0xe0e0e0);
  sceneScreen.fog = new THREE.Fog(0xe0e0e0, 20, 100);
  sceneScreen.add(new THREE.AmbientLight(0x666666));
  var light = new THREE.DirectionalLight(0xdfebff, 1.75);
  light.position.set(2, 8, 4);
  sceneScreen.add(light);

  var material = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });
  const lineAvertex = [];
  lineAvertex.push(new THREE.Vector3(0, 0, 1));
  lineAvertex.push(new THREE.Vector3(0, 0, 0));
  lineAvertex.push(new THREE.Vector3(Math.sqrt(.5), 0, Math.sqrt(.5)));
  lineA = new THREE.BufferGeometry().setFromPoints(lineAvertex);

  var line = new THREE.Line(lineA, material);
  sceneScreen.add(line);

  var i;
  for( i=0; i<32; i++ )
  {
    var loader = new GLTFLoader();
    loader.load('./models/gltf/RobotExpressive/RobotExpressive.glb', function (gltf)
    {
      var tmp = gltf.scene;
      model.push(tmp);
      tmp.scale.set(.1, .1, .1);
      tmp.translateOnAxis(modelforward, .3);
 
      tmp.position.set(1, 0, -(model.length-1)*tile_length*2);
  
      sceneScreen.add(tmp);

      var tmp_mixer = new THREE.AnimationMixer(tmp);
      mixer.push( tmp_mixer );
      if(model.length==1)
        createGUI(tmp, gltf.animations);
      else
      {
        for (var i = 0; i < gltf.animations.length; i++)
        {
          if( gltf.animations[i].name=='Walking' )
          {
            tmp_mixer.clipAction(gltf.animations[i]).play();
            break;
          }
        }
      }

    }, undefined, function (e) {
      console.error(e);
    });
  }


}
actions = {};
var states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing'];
//var emotes = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
//var beizer_t_running = false;

// initial
//var mixer;
function createGUI(model, animations) {
       face = model.getObjectByName( 'Head_2' );

  for (var i = 0; i < animations.length; i++) {
    var clip = animations[i];
    var action = mixer[0].clipAction(clip);
    actions[clip.name] = action;
    //if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 3) {
    if (states.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }

  activeAction = actions['Walking'];
  activeAction.play();
      face.morphTargetInfluences[0] = 0;
      face.morphTargetInfluences[1] = 1;
      face.morphTargetInfluences[2] = 0;

  // states
  //var statesFolder = gui.addFolder('States');
  //var states_clipCtrl = statesFolder.add(state_api, 'state').options(states);
  //states_clipCtrl.onChange(function () {

  //});
  //statesFolder.open();


  // map selection
  var map_select_Folder = gui.addFolder('Map selection');
  var map_select_clipCtrl = map_select_Folder.add(map_select_api, 'map_type').options(map_select);
  map_select_clipCtrl.onChange(function (val) {
    if (val == "Seamless DP Map") {
      maptype = 0;
      screen_zmesh1.material = materialScreen;
      screen_zmesh2.material = materialScreen;
      screen_mesh.material = materialScreen;
    }
    if (val == "DP map") {
      maptype = 1;
    }
    if (val == "Cubemap") {
      maptype = 2;
      screen_zmesh1.material = cm_screen_mat;
      screen_zmesh2.material = cm_screen_mat;
      screen_mesh.material = cm_screen_mat;
    }

    if (val == "Multiple DP map") {
      maptype = 3;
      screen_zmesh1.material = mldp_Screen;
      screen_zmesh2.material = mldp_Screen;
      screen_mesh.material   = mldp_Screen;
    }

    if (val == "Multiple CM map") {
      maptype = 4;
      screen_zmesh1.material = mlcm_Screen;
      screen_zmesh2.material = mlcm_Screen;
      screen_mesh.material = mlcm_Screen;
    }

  });
  map_select_Folder.open();


  settings = {
    'lightsize': lightsize,
    'Tiles/Second': tiles_per_second,
    'tex_id': draw_tex_id,
    'time_scale': time_scale,
    'full screen': 0,
    'draw_mlcmtex_id': draw_mlcmtex_id,
    'draw_mldptex_id': draw_mldptex_id,
    'layer_idx': draw_layer_idx,
    'robot number': num_of_display_robot,
    'light number':n_light,
    'use vr': 0
  };

  var expressionFolder = gui.addFolder('Expressions');
  expressionFolder.add(settings, 'full screen', 0, 1, 1).onChange(
    function (val) {
      if (val == 1)
        openFullscreen();
      else
        closeFullscreen();
    });

  expressionFolder.add(settings, 'robot number', 1, 32, 1).onChange(
    function (val) {
      num_of_display_robot = val;
    });
  expressionFolder.add(settings, 'light number', 1, 16, 1).onChange(
    function (val) {
      //number_display_light = val;
      n_light = val;
      if (maptype == 4) {
        if (val < 4)
          n_light = val;
        else
          n_light = 3;
      }
    });
   

  expressionFolder.add(settings, 'lightsize', 0.02, .2, .001).onChange(
    function (val) {
      lightsize = val;
      light_sphere.scale.set(lightsize, lightsize, lightsize);
      light1.scale.set(lightsize, lightsize, lightsize);
      light2.scale.set(lightsize, lightsize, lightsize);
   for (i = 3; i < Max_num_light; i++) {
        ml_light[i].scale.set(lightsize, lightsize, lightsize);
      }
    });
  expressionFolder.add(settings, 'Tiles/Second', 1, 10, .001).onChange(
    function (val) {
      tiles_per_second = val;
    });
  expressionFolder.add(settings, 'tex_id', -1, 4, 1).onChange(
    function (val) {
      draw_tex_id = val;
    });
  expressionFolder.add(settings, 'time_scale', 1, 100, 1).onChange(
    function (val) {
      time_scale = val;
      clearInterval(my_interval_id);
    });
  expressionFolder.add(settings, 'layer_idx', -1, 4, 1).onChange(
    function (val) {
      draw_layer_idx = val;
    });
  expressionFolder.add(settings, 'draw_mlcmtex_id', -1, 14, 1).onChange(
    function (val) {
      draw_mlcmtex_id = val;//*(M+1);
    });
  expressionFolder.add(settings, 'draw_mldptex_id', -1, 16, 1).onChange(
    function (val) {
      if (val < n_light)//number_display_light)
        draw_mldptex_id = val;//*(M+1);
      else
        draw_mldptex_id = n_light-1; //draw_mldptex_id = number_display_light-1;//*(M+1);

  });
    
   expressionFolder.add(settings, 'use vr', 0, 1, 1).onChange(
    function (val) {
       if (val == 1) {
         isVr = true;
         draw_tex_id = -1;
         draw_layer_idx = -1;
         openFullscreen();
       }
       else {
         isVr = false;
         renderer.setSize(window.innerWidth, window.innerHeight);
         closeFullscreen();
         draw_tex_id = 0;
         draw_layer_idx = 0;
       }
    });
 
  expressionFolder.open();

}

var dt;

var theta0 = 0;
var tiles_per_second = 5;
var tile_length = .2;

function animate(dt, time_scale,lineA) {
  dt = clock.getDelta();//* time_scale;
  theta0 += dt*.1;

  for( var i=1; i<num_of_display_robot; i++ )
    model[i].visible = true;
  for( var i=num_of_display_robot; i<model.length; i++ )
    model[i].visible = false;


  //for (var i = 1; i < number_display_light; i++)
  //  ml_light[i].visible = true;
  //for( var i=number_display_light; i<ml_light.length; i++ )
  //  ml_light[i].visible = false;
  for (var i = 1; i < n_light; i++)
    ml_light[i].visible = true;
  for( var i=n_light; i<ml_light.length; i++ )
    ml_light[i].visible = false;


  var nrobot = Math.min(num_of_display_robot,model.length);
  for( var i=1; i<nrobot; i++ )
  {
    var theta = 2*Math.PI/nrobot*i   + theta0;
    var radius = tile_length*2 * nrobot / (2*Math.PI);
    radius = Math.max(1,radius);
    model[i].rotation.y = -theta;
    model[i].position.set( Math.cos(theta)*radius, 0, Math.sin(theta)*radius );
  }

  if (mixer[0]) mixer[0].update(dt * tiles_per_second*tiles_length);
  for( var i=1; i<Math.min(num_of_display_robot,mixer.length); i++ )
    if (mixer[i]) mixer[i].update(dt * 5*tiles_length);

                            

  requestAnimationFrame(animate);
  cameraScreen_controls.update();
  renderX(dt,time_scale,lineA);
  stats.update();
}

init();
let clock = new THREE.Clock();
my_quad_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
gl.bufferData(gl.ARRAY_BUFFER, my_quad, gl.STATIC_DRAW);
prepare_dpfbo(dp_side);
prepare_cmfbo(cm_side);

//multiple light
prepare_mldpfbo(dp_side);
prepare_mlcmfbo(cm_side);
animate();


//multiple light
function prepare_mldpfbo(dp_side)
{
  mldp_fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, mldp_fbo);

  mldp_rbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, mldp_rbo);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, dp_side, dp_side);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mldp_rbo);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function prepare_mlcmfbo(cm_side) {
  mlcm_fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, mlcm_fbo);

  mlcm_rbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, mlcm_rbo);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, cm_side, cm_side);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mlcm_rbo);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function prepare_dpfbo(dp_side)
{
  dp_fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, dp_fbo);

  dp_rbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, dp_rbo);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, dp_side, dp_side);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dp_rbo);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function prepare_cmfbo(cm_side) {
  cm_fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, cm_fbo);

  cm_rbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, cm_rbo);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, cm_side, cm_side);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, cm_rbo);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function genbasis_cmmap() {
  var i;
  var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  var port0 = gl.getParameter(gl.VIEWPORT);
  var tex0 = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);

  var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_cm.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_cm.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(genbasis_shader_cm.v0);
  gl.enableVertexAttribArray(genbasis_shader_cm.t0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, cm_fbo);
  gl.viewport(0, 0, cm_side, cm_side);

  var axis = [[0, 1, 0], [0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0]];
  var angle = [Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2, 0, Math.PI];

  // var cm_camera, cm_face_mat, cm_screen_mat;
  // var cm_rt, cm_texid;

  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
  for (i = 0; i < 6; i++) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cm_texid[1], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cm_texid[2], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cm_texid[3], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cm_texid[4], 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cm_texid[0]);

    var mpj = m4.orthographic(0, 1, 0, 1, -1, 1);
    var mv = m4.axisRotation(axis[i], angle[i]);
    var mv = m4.multiply(mv, m4.scaling(1, -1, 1));

    genbasis_shader_cm.use();
    gl.uniformMatrix4fv(genbasis_shader_cm.mpj, false, mpj);
    gl.uniformMatrix4fv(genbasis_shader_cm.mv, false, mv);
    gl.uniform1i(genbasis_shader_cm.depthmap, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
    gl.vertexAttribPointer(genbasis_shader_cm.v0, 2, gl.FLOAT, false, 8, 0);
    gl.vertexAttribPointer(genbasis_shader_cm.t0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  }
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  for (i = 0; i < M + 1; i++) {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cm_texid[i]);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  }

  if (!v0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_cm.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_cm.t0);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
  gl.viewport(port0[0], port0[1], port0[2], port0[3]);
}

function genbasis_dpmap() {
  var i;
  var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  var port0 = gl.getParameter(gl.VIEWPORT);
  var tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);

  var v0_enabled0 = gl.getVertexAttrib(genbasis_shader.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(genbasis_shader.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(genbasis_shader.v0);
  gl.enableVertexAttribArray(genbasis_shader.t0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, dp_fbo);
  gl.viewport(0, 0, dp_side, dp_side);

  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
  for (i = 0; i < 2; i++) {

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texdp_id[i * M + 1 + 1], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texdp_id[i * M + 1 + 2], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, texdp_id[i * M + 1 + 3], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, texdp_id[i * M + 1 + 4], 0);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texdp_id[i]);

    genbasis_shader.use();
    gl.uniformMatrix4fv(genbasis_shader.mvp, false, m4.orthographic(0, 1, 0, 1, -1, 1));
    gl.uniform1i(genbasis_shader.depthmap, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
    gl.vertexAttribPointer(genbasis_shader.v0, 2, gl.FLOAT, false, 8, 0);
    gl.vertexAttribPointer(genbasis_shader.t0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  }
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  for (i = 0; i < 2 * (M + 1); i++) {
    gl.bindTexture(gl.TEXTURE_2D, texdp_id[i]);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  if (!v0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader.t0);

  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
  gl.viewport(port0[0], port0[1], port0[2], port0[3]);
}

function draw_tex(tex0, matrix) {
  gl.activeTexture(gl.TEXTURE0);

  var prev_tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
  gl.bindTexture(gl.TEXTURE_2D, tex0);

  var v0_enabled0 = gl.getVertexAttrib(drawtex_shader.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(drawtex_shader.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(drawtex_shader.v0);
  gl.enableVertexAttribArray(drawtex_shader.t0);

  gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
  gl.vertexAttribPointer(drawtex_shader.v0, 2, gl.FLOAT, false, 8, 0);
  gl.vertexAttribPointer(drawtex_shader.t0, 2, gl.FLOAT, false, 8, 0);

  drawtex_shader.use();
  gl.uniform1i(drawtex_shader.tex0, 0);
  gl.uniformMatrix4fv(drawtex_shader.mvp, false, matrix);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  if (!v0_enabled0)
    gl.disableVertexAttribArray(drawtex_shader.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(drawtex_shader.t0);
  gl.bindTexture(gl.TEXTURE_2D, prev_tex0);
}



function drawcmtex(tex0) {
  // http://www.3dcpptutorials.sk/index.php?id=24

  var v0_enabled0 = gl.getVertexAttrib(drawcmtex_shader.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(drawcmtex_shader.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(drawcmtex_shader.v0);
  gl.enableVertexAttribArray(drawcmtex_shader.t0);

  gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
  gl.vertexAttribPointer(drawcmtex_shader.v0, 2, gl.FLOAT, false, 8, 0);
  gl.vertexAttribPointer(drawcmtex_shader.t0, 2, gl.FLOAT, false, 8, 0);

  gl.activeTexture(gl.TEXTURE0);
  var prev_tex0 = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex0);

  drawcmtex_shader.use();
  gl.uniform1i(drawcmtex_shader.tex0, 0);


  var aspect = window.innerWidth / window.innerHeight;

  var matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(0, 1, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(2, 1, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [0, 0, -1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(1, 1, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(3, 1, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);


  matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(1, 2, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [-1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  matrix = m4.orthographic(0, 9 * aspect, 0, 9, -1, 1);
  matrix = m4.multiply(matrix, m4.translation(1, 0, 0));
  gl.uniformMatrix4fv(drawcmtex_shader.mvp, false, matrix);
  gl.uniformMatrix4fv(drawcmtex_shader.mtc, true, [-1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  if (!v0_enabled0)
    gl.disableVertexAttribArray(drawcmtex_shader.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(drawcmtex_shader.t0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, prev_tex0);
}

// multiple light generate dp basis function
  function genbasis_mldpmapy() {
  var i, j;
  var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  var port0 = gl.getParameter(gl.VIEWPORT);
  var tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);

  var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(genbasis_shader_mldps.v0);
  gl.enableVertexAttribArray(genbasis_shader_mldps.t0);

  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, mldp_fbo);
  gl.viewport(0, 0, dp_side, dp_side);

  for (j = 0; j < n_light; j++)
  {
    for (i = 0; i < 2; i++)
    {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mltexdp_s_id[j * 2 + i]);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, mltexdp_id[j], 0, i);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, mltexdp_id[j], 0, i * M + 1 + 1);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT2, mltexdp_id[j], 0, i * M + 1 + 2);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT3, mltexdp_id[j], 0, i * M + 1 + 3);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT4, mltexdp_id[j], 0, i * M + 1 + 4);


      genbasis_shader_mldps.use();
      gl.uniformMatrix4fv(genbasis_shader_mldps.mvp, false, m4.orthographic(0, 1, 0, 1, -1, 1));
      gl.uniform1i(genbasis_shader_mldps.depthmap, 0);
      gl.uniform1i(genbasis_shader_mldps.layeridx, i);

      gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
      gl.vertexAttribPointer(genbasis_shader_mldps.v0, 2, gl.FLOAT, false, 8, 0);
      gl.vertexAttribPointer(genbasis_shader_mldps.t0, 2, gl.FLOAT, false, 8, 0);
      gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4]);

    }
   }
  ////This causes that I cannot render to each layer.
  //gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  for (i = 0; i < n_light; i++) {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, mltexdp_id[i]);
    gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  }

  if (!v0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_mldps.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_mldps.t0);

  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo0);
  gl.viewport(port0[0], port0[1], port0[2], port0[3]);
}

//draw
function draw_mldptex(tex0, matrix, layeridx) {
  gl.activeTexture(gl.TEXTURE0);

  var prev_tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex0);

  var v0_enabled0 = gl.getVertexAttrib(drawmldptex_shader.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(drawmldptex_shader.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(drawmldptex_shader.v0);
  gl.enableVertexAttribArray(drawmldptex_shader.t0);

  gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
  gl.vertexAttribPointer(drawmldptex_shader.v0, 2, gl.FLOAT, false, 8, 0);
  gl.vertexAttribPointer(drawmldptex_shader.t0, 2, gl.FLOAT, false, 8, 0);

  drawmldptex_shader.use();
  gl.uniform1i(drawmldptex_shader.tex0, 0);
  gl.uniform1i(drawmldptex_shader.layeridx, layeridx);
  gl.uniformMatrix4fv(drawmldptex_shader.mvp, false, matrix);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

  if (!v0_enabled0)
    gl.disableVertexAttribArray(drawmldptex_shader.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(drawmldptex_shader.t0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, prev_tex0);
}

function genbasis_mlcmmap() {
  var i, j;
  var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  var port0 = gl.getParameter(gl.VIEWPORT);
  var tex0 = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);

  var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_cm.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_cm.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
  gl.enableVertexAttribArray(genbasis_shader_cm.v0);
  gl.enableVertexAttribArray(genbasis_shader_cm.t0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, mlcm_fbo);
  gl.viewport(0, 0, cm_side, cm_side);


  for (j = 0; j < n_light; j++) {
    var axis = [[0, 1, 0], [0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0]];
    var angle = [Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2, 0, Math.PI];

    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
    for (i = 0; i < 6; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j*(M+1) + 1], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j*(M+1) + 2], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j*(M+1) + 3], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j*(M+1) + 4], 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, mltexcm[j*(M+1)]);

      var mpj = m4.orthographic(0, 1, 0, 1, -1, 1);
      var mv = m4.axisRotation(axis[i], angle[i]);
      var mv = m4.multiply(mv, m4.scaling(1, -1, 1));

      genbasis_shader_cm.use();
      gl.uniformMatrix4fv(genbasis_shader_cm.mpj, false, mpj);
      gl.uniformMatrix4fv(genbasis_shader_cm.mv, false, mv);
      gl.uniform1i(genbasis_shader_cm.depthmap, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
      gl.vertexAttribPointer(genbasis_shader_cm.v0, 2, gl.FLOAT, false, 8, 0);
      gl.vertexAttribPointer(genbasis_shader_cm.t0, 2, gl.FLOAT, false, 8, 0);
      gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

    }
  }
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  for (i = 0; i < n_light*(M + 1); i++) {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, mltexcm[i]);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  }

  if (!v0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_cm.v0);
  if (!t0_enabled0)
    gl.disableVertexAttribArray(genbasis_shader_cm.t0);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
  gl.viewport(port0[0], port0[1], port0[2], port0[3]);
}

function cm_render(renderer) {
  var i;
  var l = new vec3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  var eye = [
    new vec3(1, 0, 0), new vec3(-1, 0, 0),
    new vec3(0, 1, 0), new vec3(0, -1, 0),
    new vec3(0, 0, 1), new vec3(0, 0, -1),
  ];
  var up = [
    new vec3(0, -1, 0), new vec3(0, -1, 0),
    new vec3(0, 0, 1), new vec3(0, 0, -1),
    new vec3(0, -1, 0), new vec3(0, -1, 0),
  ];

  var mvp;
  cm_face_mat.uniforms["zFar"].value = zFar;
  cm_face_mat.uniforms["l"].value.set(l.x, l.y, l.z);


  var prev_color = new THREE.Color();

   renderer.getClearColor(prev_color);
  var prev_apaha = renderer.getClearAlpha();
  renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);

  var prev_background = sceneScreen.background;
  var prev_fog = sceneScreen.fog;
  sceneScreen.background = null;
  sceneScreen.fog = null;
  sceneScreen.overrideMaterial = cm_face_mat;

  // cm_rt[0].texture.generateMipmaps = false;
  for (i = 0; i < 6; i++) {
    var pj = m4.perspective(Math.PI / 2, 1, .001, 200);
    var mv = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
    var mvp = m4.multiply(pj, mv);
    cm_face_mat.uniforms["mvp"].value.set(
      mvp[0], mvp[4], mvp[8], mvp[12],
      mvp[1], mvp[5], mvp[9], mvp[13],
      mvp[2], mvp[6], mvp[10], mvp[14],
      mvp[3], mvp[7], mvp[11], mvp[15]);
    renderer.setRenderTarget(cm_rt[0], i);
    renderer.clear();
    renderer.render(sceneScreen, cm_camera);
  }
  sceneScreen.overrideMaterial = null;
  sceneScreen.background = prev_background;
  sceneScreen.fog = prev_fog;
  renderer.setClearColor(prev_color, prev_apaha);
  // cm_rt[0].texture.generateMipmaps = true;
}

function dp_render(renderer) {
  var i;
  var l = new vec3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  var eye = [new vec3(0.0, 0.0, -1.0), new vec3(0.0, 0.0, 1.0)];
  var up = [(new vec3(0.0, 1.0, 0.0)).neg(), (new vec3(0.0, 1.0, 0.0)).neg()];
  var mvp;
  materialRTT.uniforms["zFar"].value = zFar;
  materialRTT.uniforms["l"].value.set(l.x, l.y, l.z);

  var prev_color = new THREE.Color();
  renderer.getClearColor(prev_color);
  var prev_apaha = renderer.getClearAlpha();
  renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);

  var prev_background = sceneScreen.background;
  var prev_fog = sceneScreen.fog;
  sceneScreen.background = null;
  sceneScreen.fog = null;
  sceneScreen.overrideMaterial = materialRTT;
  for (i = 0; i < 2; i++) {
    mvp = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
    materialRTT.uniforms["mvp"].value.set(
      mvp[0], mvp[4], mvp[8], mvp[12],
      mvp[1], mvp[5], mvp[9], mvp[13],
      mvp[2], mvp[6], mvp[10], mvp[14],
      mvp[3], mvp[7], mvp[11], mvp[15]);

    renderer.setRenderTarget(texdp_rt_id[i]);
    renderer.clear();
    renderer.render(sceneScreen, cameraRTT);
  }
  sceneScreen.overrideMaterial = null;
  sceneScreen.background = prev_background;
  sceneScreen.fog = prev_fog;
  renderer.setClearColor(prev_color, prev_apaha);
}

function mldp_renderx(renderer)
{
  var i, j;
  for (i = 0; i < n_light; i++) {
    ml_lpos[i] = new THREE.Vector3(ml_light[i].position.x, ml_light[i].position.y, ml_light[i].position.z);
  }

  //ml_lpos[0] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  //ml_lpos[1] = new THREE.Vector3(light1.position.x, light1.position.y, light1.position.z);
  //ml_lpos[2] = new THREE.Vector3(light2.position.x, light2.position.y, light2.position.z);

  //ml_lpos[1] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  //ml_zFar[0] = zFar;
  //ml_zFar[1] = zFar;
  for (j = 0; j < n_light; j++)
  {
    var eye = [new vec3(0.0, 0.0, -1.0),         new vec3(0.0, 0.0, 1.0)];
    var up  = [(new vec3(0.0, 1.0, 0.0)).neg(), (new vec3(0.0, 1.0, 0.0)).neg()];

    var l = new vec3(ml_lpos[j].x, ml_lpos[j].y, ml_lpos[j].z);
    var mvp;
    mldp_RTT.uniforms["zFar"].value = ml_zFar[j];
    mldp_RTT.uniforms["l"].value.set(l.x, l.y, l.z);

    var prev_color = new THREE.Color();
    renderer.getClearColor(prev_color);
    var prev_apaha = renderer.getClearAlpha();
    renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);
    var prev_background = sceneScreen.background;
    var prev_fog = sceneScreen.fog;
    sceneScreen.background = null;
    sceneScreen.fog = null;

    sceneScreen.overrideMaterial = mldp_RTT;
    for (i = 0; i < 2; i++) {
      mvp = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
      mldp_RTT.uniforms["mvp"].value.set(
        mvp[0], mvp[4], mvp[8], mvp[12],
        mvp[1], mvp[5], mvp[9], mvp[13],
        mvp[2], mvp[6], mvp[10], mvp[14],
        mvp[3], mvp[7], mvp[11], mvp[15]);

      renderer.setRenderTarget(mltexdp_rt_s_id[2*j+i]);
      renderer.clear();
      renderer.render(sceneScreen, mldp_cameraRTT);
    }


  }
  sceneScreen.overrideMaterial = null;
  sceneScreen.background = prev_background;
  sceneScreen.fog = prev_fog;
  renderer.setClearColor(prev_color, prev_apaha);
}


function mlcm_render(renderer) {

  var prev_color = new THREE.Color();
  renderer.getClearColor(prev_color);
  var prev_apaha = renderer.getClearAlpha();
  renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);
  var prev_background = sceneScreen.background;
  var prev_fog = sceneScreen.fog;
  sceneScreen.background = null;
  sceneScreen.fog = null;
  sceneScreen.overrideMaterial = mlcm_face_mat;

  ml_lpos[0] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  ml_lpos[1] = new THREE.Vector3(light1.position.x, light1.position.y, light1.position.z);
  ml_lpos[2] = new THREE.Vector3(light2.position.x, light2.position.y, light2.position.z);

  var i, j;
  for (j = 0; j < n_light; j++) {
    var eye = [
      new vec3(1, 0, 0), new vec3(-1, 0, 0),
      new vec3(0, 1, 0), new vec3(0, -1, 0),
      new vec3(0, 0, 1), new vec3(0, 0, -1),
    ];
    var up = [
      new vec3(0, -1, 0), new vec3(0, -1, 0),
      new vec3(0, 0, 1), new vec3(0, 0, -1),
      new vec3(0, -1, 0), new vec3(0, -1, 0),
    ];
    var l = new vec3(ml_lpos[j].x, ml_lpos[j].y, ml_lpos[j].z);

    var mvp;
    mlcm_face_mat.uniforms["zFar"].value = zFar;
    mlcm_face_mat.uniforms["l"].value.set(l.x, l.y, l.z);

    for (i = 0; i < 6; i++) {
      var pj = m4.perspective(Math.PI / 2, 1, .001, 200);
      var mv = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
      var mvp = m4.multiply(pj, mv);
      mlcm_face_mat.uniforms["mvp"].value.set(
        mvp[0], mvp[4], mvp[8], mvp[12],
        mvp[1], mvp[5], mvp[9], mvp[13],
        mvp[2], mvp[6], mvp[10], mvp[14],
        mvp[3], mvp[7], mvp[11], mvp[15]);

      renderer.setRenderTarget(mltexcm_rt[j*(M+1)], i);
      renderer.clear();
      renderer.render(sceneScreen, mlcm_camera);
    }
  }
  sceneScreen.overrideMaterial = null;
  sceneScreen.background = prev_background;
  sceneScreen.fog = prev_fog;
  renderer.setClearColor(prev_color, prev_apaha);
}

function renderX(dt, time_scale, lineA) {
  {
    var dtheta = 2 * Math.PI * dt * .6;
    screen_zmesh1.rotation.y -= dtheta;
    screen_zmesh2.rotation.y -= dtheta;

  //  if (model) {
  //    if (beizer_pos.length > 0) {
  //      //console.log(beizer_length);
  //      var beizer_dt = ((new Date()).getTime() - beizer_t0) / 1000 / beizer_length * tiles_per_second * tiles_length;
  //      beizer_t0 = (new Date()).getTime();
  //      beizer_t = g_clamp(beizer_t + beizer_dt, 0, 1);

  //      my_dot.position.copy(beizer_pos[3]);
  //      lineA.verticesNeedUpdate = true;
  //      lineA.vertices[2].copy(beizer_direction(beizer_t));
  //      modelforward.copy(beizer_direction(beizer_t));

  //      var tmp = new THREE.Vector3();
  //      tmp.copy(modelforward);
  //      tmp.cross(modelforward0);
  //      model.rotation.y = (tmp.y > 0 ? -1 : 1) * Math.acos(modelforward.dot(modelforward0));
  //      model.position.copy(beizer(beizer_t));
  //    }
  //  }

    if (model[0]) {
      if (beizer_pos.length > 0) {

        //console.log(beizer_length);
        var beizer_dt = ((new Date()).getTime() - beizer_t0) / 1000 / beizer_length * tiles_per_second * tiles_length * time_scale;
        beizer_t0 = (new Date()).getTime();
        beizer_t = g_clamp(beizer_t + beizer_dt, 0, 1);

        //if (beizer_t >= 1 && beizer_t_running) {
        //  fadeToAction('walking', 0.2);
        //  beizer_t_running = false;
        //}

        my_dot.position.copy(beizer_pos[3]);
        //lineA.verticesNeedUpdate = true;
        //lineA.vertices[2].copy(beizer_direction(beizer_t));
        modelforward.copy(beizer_direction(beizer_t));

        var tmp = new THREE.Vector3();
        tmp.copy(modelforward);
        tmp.cross(modelforward0);
        model[0].rotation.y = (tmp.y > 0 ? -1 : 1) * Math.acos(modelforward.dot(modelforward0));
        model[0].position.copy(beizer(beizer_t));
      }
    }

  }

  if (maptype == 0 || maptype == 1) {
    dp_render(renderer);
    genbasis_dpmap();
  }
  if (maptype == 2) {
    cm_render(renderer);
    genbasis_cmmap();
  }
  if (maptype == 3) {
    mldp_renderx(renderer);
    genbasis_mldpmapy();
  }
  if (maptype == 4) {
    mlcm_render(renderer);
    genbasis_mlcmmap();
  }


  var l = new vec3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  renderer.setRenderTarget(null);
  renderer.clear();
  materialScreen.uniforms["l"].value.set(l.x, l.y, l.z);
  materialScreen.uniforms["eye"].value = cameraScreen.position;
  materialScreen.uniforms["lightsize"].value = lightsize;
  materialScreen.uniforms["zFar"].value = zFar;

  cm_screen_mat.uniforms["l"].value.set(l.x, l.y, l.z);
  cm_screen_mat.uniforms["eye"].value = cameraScreen.position;
  cm_screen_mat.uniforms["lightsize"].value = lightsize;
  cm_screen_mat.uniforms["zFar"].value = zFar;

  for (var k = 0; k < n_light; k++)
  {
    ml_lpos[k] = new THREE.Vector3(ml_light[k].position.x, ml_light[k].position.y, ml_light[k].position.z);
    ml_lsize[k] = lightsize;
    ml_zFar[k] = zFar;// 0.5;          
  }


  //ml_lpos[0] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  //ml_lpos[1] = new THREE.Vector3(light1.position.x, light1.position.y, light1.position.z);
  //ml_lpos[2] = new THREE.Vector3(light2.position.x, light2.position.y, light2.position.z);
  ////ml_lpos[1] = new THREE.Vector3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
  //ml_lsize[0] = lightsize;
  //ml_lsize[1] = lightsize;
  //ml_lsize[2] = lightsize;
  //ml_zFar[0] = zFar;// 0.5;
 // ml_zFar[1] = zFar;// 0.1;
 // ml_zFar[2] = zFar;// 0.1;

  {
    for (var i = 0; i < n_light; i++) {
      mldp_Screen.uniforms.l.value[i].set(ml_lpos[i].x, ml_lpos[i].y, ml_lpos[i].z);
      mldp_Screen.uniforms.lsize.value[i] = lightsize;
      mldp_Screen.uniforms.mldp_zFar.value[i] = ml_zFar[i];
    }
  }

  mldp_Screen.uniforms["num_dis_light"].value = n_light;
  mldp_Screen.uniforms["eye"].value = cameraScreen.position;


  {
    for (var i = 0; i < n_light; i++) {
      mlcm_Screen.uniforms.l.value[i].set(ml_lpos[i].x, ml_lpos[i].y, ml_lpos[i].z);
      mlcm_Screen.uniforms.lsize.value[i] = lightsize;
      mlcm_Screen.uniforms.mlcm_zFar.value[i] = ml_zFar[i];
    }
    mlcm_Screen.uniforms["eye"].value = cameraScreen.position;
  }

  // materialScreen.uniforms["lightmv"].value = new THREE.Matrix4();
  // sceneScreen.overrideMaterial = materialRTT;
  if (!isVr) {
    renderer.render(sceneScreen, cameraScreen);
  } else
    vrrender.render(sceneScreen, cameraScreen);

    if (draw_tex_id >= 0) {
      if (maptype == 0 || maptype == 1) {
        var draw_tex_matrix;
        draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
        draw_tex(texdp_id[draw_tex_id < 1 ? draw_tex_id : (draw_tex_id + 1)], draw_tex_matrix);
        draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
        draw_tex_matrix = m4.multiply(draw_tex_matrix, m4.translation(1, 0, 0));
        draw_tex(texdp_id[draw_tex_id < 1 ? 1 : (draw_tex_id + 5)], draw_tex_matrix);
      }


      if (maptype == 2)
        drawcmtex(cm_texid[draw_tex_id]);
    }

    if (draw_layer_idx >= 0) {
      if (maptype == 3) {
        var draw_tex_matrix;
        draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
        draw_mldptex(mltexdp_id[draw_mldptex_id], draw_tex_matrix, draw_layer_idx < 1 ? draw_layer_idx : (draw_layer_idx + 1));
        //draw_mldptex(draw_texture[0], draw_tex_matrix, draw_layer_idx < 1 ? draw_layer_idx : (draw_layer_idx + 1));

        draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
        draw_tex_matrix = m4.multiply(draw_tex_matrix, m4.translation(1, 0, 0));
        draw_mldptex(mltexdp_id[draw_mldptex_id], draw_tex_matrix, draw_layer_idx < 1 ? 1 : (draw_layer_idx + 5));
        //draw_mldptex(draw_texture[0], draw_tex_matrix, draw_layer_idx < 1 ? 1 : (draw_layer_idx + 5));
      }
    }
    if (draw_mlcmtex_id >= 0) {
      if (maptype == 4)
        drawcmtex(mltexcm[draw_mlcmtex_id]);
    }
  

}

var elem = document.body;

function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) { /* Firefox */
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE/Edge */
    elem.msRequestFullscreen();
  }
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}



document.getElementById('container').addEventListener('mousedown', onDocumentMouseDown, false);
document.getElementById('container').addEventListener('mouseup', onDocumentMouseUp, false);

document.getElementById('container').addEventListener('touchstart', onDocumentTouchStart, false);
document.getElementById('container').addEventListener('touchend', onDocumentTouchEnd, false);






function beizer(t) {
  if (beizer_pos.length == 0)
    return null;

  var pos0 = new THREE.Vector3();
  var pos1 = new THREE.Vector3();

  t = t < 0 ? 0 : (t < 1 ? t : 1);

  pos1.copy(beizer_pos[0]);
  pos1.multiplyScalar((1 - t) * (1 - t) * (1 - t));
  pos0.add(pos1);

  pos1.copy(beizer_pos[1]);
  pos1.multiplyScalar(3 * t * (1 - t) * (1 - t));
  pos0.add(pos1);

  pos1.copy(beizer_pos[2]);
  pos1.multiplyScalar(3 * t * t * (1 - t));
  pos0.add(pos1);

  pos1.copy(beizer_pos[3]);
  pos1.multiplyScalar(t * t * t);
  pos0.add(pos1);

  return pos0;
}

function beizer_direction(t) {
  if (beizer_pos.length == 0)
    return null;

  var pos0 = new THREE.Vector3();
  var pos1 = new THREE.Vector3();

  t = t < 0 ? 0 : (t < 1 ? t : 1);

  pos1.copy(beizer_pos[1]);
  pos1.sub(beizer_pos[0]);
  pos1.multiplyScalar(3 * (1 - t) * (1 - t));
  pos0.add(pos1);

  pos1.copy(beizer_pos[2]);
  pos1.sub(beizer_pos[1]);
  pos1.multiplyScalar(6 * (1 - t) * t);
  pos0.add(pos1);

  pos1.copy(beizer_pos[3]);
  pos1.sub(beizer_pos[2]);
  pos1.multiplyScalar(3 * t * t);
  pos0.add(pos1);

  return pos0.normalize();
}

var x0, y0;

function threejs_bezier_length(lst) {
  var xs = [lst[0].x, lst[1].x, lst[2].x, lst[3].x];
  var ys = [lst[0].z, lst[1].z, lst[2].z, lst[3].z];
  return getArcLength(xs, ys);
}

function onDocumentMouseDown(event) {
  event.preventDefault();
  x0 = (event.clientX / window.innerWidth) * 2 - 1;
  y0 = -(event.clientY / window.innerHeight) * 2 + 1;
}
function onDocumentTouchStart(event) {
  event.preventDefault();
  event = event.changedTouches[0];
  var rect = document.getElementById('container').getBoundingClientRect();
  x0 = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  y0 = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onDocumentMouseUp(event) {
  event.preventDefault();
  var x = (event.clientX / window.innerWidth) * 2 - 1;
  var y = -(event.clientY / window.innerHeight) * 2 + 1;
  process_up(x, y);
}
function onDocumentTouchEnd(event) {
  event.preventDefault();
  event = event.changedTouches[0];
  var rect = document.getElementById('container').getBoundingClientRect();
  var x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  var y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
  process_up(x, y);
}

function process_up(x, y) {
  if (Math.abs(x - x0) > .008 || Math.abs(y - y0) > .008)
    return;

  var mat = new THREE.Matrix4();
  mat.multiplyMatrices(cameraScreen.projectionMatrix, cameraScreen.matrixWorldInverse);

  var a, b, c, d;
  var e, f, g, h;
  var i, j, k, l;
  var m, n, o, p;
  a = mat.elements[0];
  b = mat.elements[4];
  c = mat.elements[8];
  d = mat.elements[12];
  e = mat.elements[1];
  f = mat.elements[5];
  g = mat.elements[9];
  h = mat.elements[13];
  i = mat.elements[2];
  j = mat.elements[6];
  k = mat.elements[10];
  l = mat.elements[14];
  m = mat.elements[3];
  n = mat.elements[7];
  o = mat.elements[11];
  p = mat.elements[15];

  var xx, zz;
  xx = ((h - y * p) * (c - x * o) - (d - x * p) * (g - y * o)) /
    ((a - x * m) * (g - y * o) - (e - y * m) * (c - x * o));

  zz = -((h - y * p) * (a - x * m) - (d - x * p) * (e - y * m)) /
    ((a - x * m) * (g - y * o) - (e - y * m) * (c - x * o));


  var endpt = new THREE.Vector3(xx, 0, zz);
  var endpt_dir = new THREE.Vector3();

  endpt_dir.copy(endpt);
  endpt_dir.sub(model[0].position);
  var l = endpt_dir.length();
  endpt_dir.normalize();

  var tmp = new THREE.Vector3();
  endpt_dir.copy(cameraScreen.position);
  endpt_dir.sub(endpt);
  endpt_dir.y = 0;
  endpt_dir.normalize();



  if (beizer_pos.length == 0) {
    beizer_pos.push(new THREE.Vector3());
    beizer_pos.push(new THREE.Vector3());
    beizer_pos.push(new THREE.Vector3());
    beizer_pos.push(new THREE.Vector3());
  }



  beizer_pos[0].copy(model[0].position);

  var vd = endpt_dir.dot(modelforward);

  beizer_pos[1].copy(modelforward);
  beizer_pos[1].multiplyScalar(l * .5 * Math.min(1.5 + vd, 1));
  beizer_pos[1].add(model[0].position);

  beizer_pos[2].copy(endpt_dir);
  beizer_pos[2].multiplyScalar(-l * .5);
  beizer_pos[2].add(endpt);

  beizer_pos[3].copy(endpt);

  beizer_length = threejs_bezier_length(beizer_pos);
  beizer_t0 = (new Date()).getTime();
  beizer_t = 0;

  //beizer_t_running = true;
  //fadeToAction( 'Running', 0.2 );

}
