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

var map_select = ['Multiple DP map', 'Multiple CM map', 'Env. map approximation (DPMAP)', 'Env. map approx. (Directional light)'];
var map_select_api = { map_type: 'Multiple DP map' };
var maptype = 0;

var settings;

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
var al_side = 1252;

var lightsize = .028;
var tiles_per_second = 5;
var tiles_length = .2;
var my_quad, my_quad_buffer;
var time_scale = 60;
var draw_tex_id = 1;
var draw_mldptex_id = 1;
var draw_layer_idx = 0;
var draw_mlcmtex_id = 0;
var draw_mlenvtex_id = 0;

//var model;
var modelforward0 = new THREE.Vector3(0, 0, 1);
var modelforward = new THREE.Vector3(0, 0, 1);
var actions, activeAction;
var model = new Array(), mixer = new Array();
var my_interval_id, face, num_of_display_robot = 1;

var isAnimate = true;

var my_dot;
var lineA;

//multiple light
var light1, light2;
var Max_num_light = 16;
var n_light = 3;

var ml_light = new Array();
var ml_lpos = new Array(Max_num_light);
var ml_lsize = new Array(Max_num_light);
var ml_zFar = new Array(Max_num_light);

//multiple light dp map
var mldp_fbo, mldp_rbo;
var mldp_cameraRTT, mldp_RTT, mldp_Screen, mltexdp_rt_id, mltexdp_id;
var mltexdp_rt_s_id, mltexdp_s_id;  //draw_texture indeed stores the depth map and basis maps.
//multiple light cubemap
var mlcm_fbo, mlcm_rbo;
var mlcm_camera, mlcm_face_mat, mlcm_Screen, mltexcm_rt, mltexcm;

//env + omni light 
var N_omni_light = 4;
//DP Env. map approximation
var NENV_light = 8;//16
NENV_light = NENV_light + N_omni_light;

var env_light = new Array();
var tmplpos = new Array(NENV_light);
var tmpzFar = new Array(NENV_light);
var tmpls = new Array(NENV_light);
var tmple = new Array(NENV_light);

var mlenvdp_fbo, mlenvdp_rbo;
var mlenvdp_cameraRTT, mlenvdp_RTT, mlenvdp_Screen, mlenv_texdp_rt_id, mlenv_texdp_id;
var mlenv_texdp_rt_s_id, mlenv_texdp_s_id;  //draw_texture indeed stores the depth map and basis maps.

//Annen env. map approximation
var num_arealight = 8;
//var num_arealight = 16;
var my_arealight = new Array(16);
var al_lpos = new Array(num_arealight);
var al_lsize = new Array(num_arealight);
var al_le = new Array(num_arealight);
var al_lmv = new Array(num_arealight);
var al_lit_up = new Array(num_arealight);
var al_lit_fovy = 2.0;//Math.PI / 3.0;

var al_fbo, al_rbo;
var al_cameraRTT, al_RTT, al_Screen, altex_rt_id, altex_id;
var altex_rt_s_id, altex_s_id; // draw
var al_scalefactor = 4.0 * Math.sqrt(3.0);     //12.0;// for litfar = 4.4

//al env+omni
var omni_light = new Array();
var allpos_omni = new Array(N_omni_light);
var alzFar_omni = new Array(N_omni_light);
var alls_omni = new Array(N_omni_light);
var allmv_omni = new Array(N_omni_light);

var al_fbo_omni, al_rbo_omni;
var al_cameraRTT_omni, al_RTT_omni, altex_rt_id_omni, altex_id_omni;
var altex_rt_s_id_omni, altex_s_id_omni; // draw

var j_lidx = 0;
var j_scalef = 0.3;//0.005;

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

for (var i = 0; i < NENV_light; i++) {
  tmplpos[i] = new THREE.Vector3(1.0, 1.0, 1.0);
  tmpls[i] = lightsize;
  tmpzFar[i] = zFar;
  tmple[i] = new THREE.Vector3(1.0, 1.0, 1.0);
}

// 8 omni. light sources for env. map lighting
tmplpos[0] = new THREE.Vector3(2.000000, 0.000000, 0.000000);
tmpzFar[0] = 3.316625;
tmpls[0] = 0.202000;
tmple[0] = new THREE.Vector3(653.766846, 500.968536, 463.145081);
tmplpos[1] = new THREE.Vector3(-2.000000, 0.000000, 0.000000);
tmpzFar[1] = 3.316625;
tmpls[1] = 0.202000;
tmple[1] = new THREE.Vector3(435.257538, 358.090302, 370.116486);
tmplpos[2] = new THREE.Vector3(0.048196, 1.927851, 0.530159);
tmpzFar[2] = 3.465893;
tmpls[2] = 0.075000;
tmple[2] = new THREE.Vector3(1013.427795, 751.373474, 561.850891);
tmplpos[3] = new THREE.Vector3(0.077080, 1.541600, 1.271820);
tmpzFar[3] = 3.575052;
tmpls[3] = 0.075000;
tmple[3] = new THREE.Vector3(934.985596, 643.564941, 473.207184);
tmplpos[4] = new THREE.Vector3(0.000000, 2.000000, 0.000000);
tmpzFar[4] = 3.316625;
tmpls[4] = 0.202000;
tmple[4] = new THREE.Vector3(1049.918091, 744.753113, 594.493042);
tmplpos[5] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
tmpzFar[5] = 3.316625;
tmpls[5] = 0.202000;
tmple[5] = new THREE.Vector3(53.823242, 32.297832, 25.698626);
tmplpos[6] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
tmpzFar[6] = 3.316625;
tmpls[6] = 0.202000;
tmple[6] = new THREE.Vector3(459.423737, 310.439880, 262.451355);
tmplpos[7] = new THREE.Vector3(0.000000, 0.000000, -2.000000);
tmpzFar[7] = 3.316625;
tmpls[7] = 0.202000;
tmple[7] = new THREE.Vector3(45.370766, 28.192625, 22.930178);

//Annen area light
if (num_arealight == 8) {
  //lit far = 3
  al_lpos[0] = new THREE.Vector3(2.999531, 0.037494, -0.037494);
  al_lsize[0] = 80.000000;
  al_le[0] = new THREE.Vector3(653.766846, 500.968536, 463.145081);
  al_lpos[1] = new THREE.Vector3(-2.999531, 0.037494, 0.037494);
  al_lsize[1] = 80.000000;
  al_le[1] = new THREE.Vector3(435.257538, 358.090302, 370.116486);
  al_lpos[2] = new THREE.Vector3(0.109382, 2.916869, 0.692757);
  al_lsize[2] = 6.000000;
  al_le[2] = new THREE.Vector3(1013.352295, 751.463013, 561.865356);
  al_lpos[3] = new THREE.Vector3(0.145350, 2.325608, 1.889556);
  al_lsize[3] = 6.000000;
  al_le[3] = new THREE.Vector3(934.985596, 643.564941, 473.207184);
  al_lpos[4] = new THREE.Vector3(0.037494, 2.999531, -0.037494);
  al_lsize[4] = 80.000000;
  al_le[4] = new THREE.Vector3(1049.926147, 744.745483, 594.490295);
  al_lpos[5] = new THREE.Vector3(0.037494, -2.999531, 0.037494);
  al_lsize[5] = 80.000000;
  al_le[5] = new THREE.Vector3(53.823242, 32.297832, 25.698626);
  al_lpos[6] = new THREE.Vector3(0.037494, 0.037494, 2.999532);
  al_lsize[6] = 80.000000;
  al_le[6] = new THREE.Vector3(459.423737, 310.439880, 262.451355);
  al_lpos[7] = new THREE.Vector3(-0.037494, 0.037494, -2.999532);
  al_lsize[7] = 80.000000;
  al_le[7] = new THREE.Vector3(45.370766, 28.192625, 22.930178);
  al_lmv[0] = new THREE.Matrix4();
  al_lmv[0].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[1] = new THREE.Matrix4();
  al_lmv[1].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[2] = new THREE.Matrix4();
  al_lmv[2].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[3] = new THREE.Matrix4();
  al_lmv[3].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[4] = new THREE.Matrix4();
  al_lmv[4].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[5] = new THREE.Matrix4();
  al_lmv[5].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[6] = new THREE.Matrix4();
  al_lmv[6].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[7] = new THREE.Matrix4();
  al_lmv[7].set(0.021649, 0.021646, -1.001845, -0.999844,
    0.000000, -1.731916, -0.012523, -0.012498,
    1.731916, -0.000271, 0.012523, 0.012498,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lit_fovy = 2.0;
  al_lit_up[0] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[1] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[2] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[3] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[4] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[5] = new THREE.Vector3(0.000000, 0.000000, -2.000000);
  al_lit_up[6] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[7] = new THREE.Vector3(0.000000, -2.000000, 0.000000);

} else if (num_arealight == 16) {
  al_lpos[0] = new THREE.Vector3(2.597366, 1.396084, -0.551940);
  al_lsize[0] = 0.062500;
  al_le[0] = new THREE.Vector3(426.568085, 375.457275, 343.624756);

  al_lpos[1] = new THREE.Vector3(2.999531, 0.037494, -0.037494);
  al_lsize[1] = 0.202000;
  al_le[1] = new THREE.Vector3(470.524536, 352.222137, 326.226166);

  al_lpos[2] = new THREE.Vector3(-2.149550, 2.015204, -0.564257);
  al_lsize[2] = 0.075000;
  al_le[2] = new THREE.Vector3(237.708755, 210.868988, 176.271393);

  al_lpos[3] = new THREE.Vector3(-2.999531, 0.037494, 0.037494);
  al_lsize[3] = 0.202000;
  al_le[3] = new THREE.Vector3(366.043304, 298.833801, 315.169556);

  al_lpos[4] = new THREE.Vector3(0.108742, 2.899786, 0.761194);
  al_lsize[4] = 0.062500;
  al_le[4] = new THREE.Vector3(1014.167664, 753.484680, 563.074829);

  al_lpos[5] = new THREE.Vector3(0.145350, 2.325608, 1.889556);
  al_lsize[5] = 0.062500;
  al_le[5] = new THREE.Vector3(936.373901, 644.868835, 472.348602);

  al_lpos[6] = new THREE.Vector3(0.166605, 2.665679, 1.366161);
  al_lsize[6] = 0.050000;
  al_le[6] = new THREE.Vector3(663.514465, 433.537476, 293.066925);

  al_lpos[7] = new THREE.Vector3(-1.419088, 2.522824, -0.788383);
  al_lsize[7] = 0.062500;
  al_le[7] = new THREE.Vector3(521.887329, 363.179840, 277.748871);

  al_lpos[8] = new THREE.Vector3(1.459124, 2.483615, -0.838220);
  al_lsize[8] = 0.062500;
  al_le[8] = new THREE.Vector3(321.660919, 294.303436, 208.193527);

  al_lpos[9] = new THREE.Vector3(1.838478, 2.262742, -0.707107);
  al_lsize[9] = 0.100000;
  al_le[9] = new THREE.Vector3(441.712952, 333.723206, 218.192017);

  al_lpos[10] = new THREE.Vector3(0.037494, 2.999531, -0.037494);
  al_lsize[10] = 0.202000;
  al_le[10] = new THREE.Vector3(343.149200, 241.226212, 204.760117);

  al_lpos[11] = new THREE.Vector3(0.037494, -2.999531, 0.037494);
  al_lsize[11] = 0.202000;
  al_le[11] = new THREE.Vector3(53.823242, 32.297832, 25.698626);

  al_lpos[12] = new THREE.Vector3(0.138356, 2.020000, 2.213698);
  al_lsize[12] = 0.062500;
  al_le[12] = new THREE.Vector3(317.720673, 229.898941, 171.150620);

  al_lpos[13] = new THREE.Vector3(0.150710, 1.778378, 2.411360);
  al_lsize[13] = 0.062500;
  al_le[13] = new THREE.Vector3(228.309143, 162.203079, 119.334068);

  al_lpos[14] = new THREE.Vector3(0.037494, 0.037494, 2.999532);
  al_lsize[14] = 0.202000;
  al_le[14] = new THREE.Vector3(237.703140, 158.103638, 138.044647);

  al_lpos[15] = new THREE.Vector3(-0.037494, 0.037494, -2.999532);
  al_lsize[15] = 0.202000;
  al_le[15] = new THREE.Vector3(45.370766, 28.192625, 22.930178);

  al_lmv[0] = new THREE.Matrix4();
  al_lmv[0].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[1] = new THREE.Matrix4();
  al_lmv[1].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[2] = new THREE.Matrix4();
  al_lmv[2].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[3] = new THREE.Matrix4();
  al_lmv[3].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[4] = new THREE.Matrix4();
  al_lmv[4].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[5] = new THREE.Matrix4();
  al_lmv[5].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[6] = new THREE.Matrix4();
  al_lmv[6].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[7] = new THREE.Matrix4();
  al_lmv[7].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[8] = new THREE.Matrix4();
  al_lmv[8].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[9] = new THREE.Matrix4();
  al_lmv[9].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[10] = new THREE.Matrix4();
  al_lmv[10].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[11] = new THREE.Matrix4();
  al_lmv[11].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[12] = new THREE.Matrix4();
  al_lmv[12].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[13] = new THREE.Matrix4();
  al_lmv[13].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[14] = new THREE.Matrix4();
  al_lmv[14].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lmv[15] = new THREE.Matrix4();
  al_lmv[15].set(0.360022, 0.788425, -0.867522, -0.865789,
    0.000000, -1.533074, -0.466293, -0.465361,
    1.694221, -0.167540, 0.184348, 0.183980,
    0.000000, 0.000000, 2.805806, 3.000000);

  al_lit_fovy = 2.000000
  al_lit_up[0] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[1] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[2] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[3] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[4] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[5] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[6] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[7] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[8] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[9] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[10] = new THREE.Vector3(0.000000, 0.000000, 2.000000);
  al_lit_up[11] = new THREE.Vector3(0.000000, 0.000000, -2.000000);
  al_lit_up[12] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[13] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[14] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
  al_lit_up[15] = new THREE.Vector3(0.000000, -2.000000, 0.000000);
}

if (num_arealight == 8) {
  for (var k = 0; k < num_arealight; k++) {
    al_lsize[k] = tmpls[k];     // for 8 light sources  ERROR
  }
}

cameraScreen = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
cameraScreen.position.set(.3, 3, 3);
cameraScreen_controls = new OrbitControls(cameraScreen, renderer.domElement);
cameraScreen_controls.maxPolarAngle = Math.PI * 0.5;
cameraScreen_controls.minDistance = 0.01;
cameraScreen_controls.maxDistance = 12;
cameraScreen_controls.target.set(.3, 0, 0);
cameraScreen_controls.update();

//var nn = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
//var nn = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
//console.log(nn);

//--------------------------------------------------------------------
//multiple light - dp map
//--------------------------------------------------------------------
mltexdp_id = new Array(Max_num_light);
mltexdp_rt_id = new Array(Max_num_light);
var i, j;
for (i = 0; i < Max_num_light; i++) {
  mltexdp_rt_id[i] = new THREE.WebGLArrayRenderTarget(dp_side, dp_side, 2 * (M + 1));
  mltexdp_rt_id[i].texture.format = THREE.RGBAFormat;
  mltexdp_rt_id[i].texture.minFilter = THREE.LinearFilter;
  mltexdp_rt_id[i].texture.magFilter = THREE.LinearFilter;

  for (j = 0; j < 2 * (M + 1); j++)
    renderer.setRenderTarget(mltexdp_rt_id[i], j);

  mltexdp_id[i] = renderer.properties.get(mltexdp_rt_id[i].texture).__webglTexture;
  mltexdp_id[i].needsUpdate = true;
}

mltexdp_rt_s_id = new Array(Max_num_light * 2);
mltexdp_s_id = new Array(Max_num_light * 2);
for (i = 0; i < Max_num_light * 2; i++) {
  mltexdp_rt_s_id[i] = new THREE.WebGLRenderTarget(dp_side, dp_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  renderer.setRenderTarget(mltexdp_rt_s_id[i]);
  mltexdp_s_id[i] = renderer.properties.get(mltexdp_rt_s_id[i].texture).__webglTexture;
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
  ml_lpos[i] = new THREE.Vector3(1.0,1.0,1.0);
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
    },
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

mldp_Screen.needsUpdate = true;
//--------------------------------------------------------------------

//--------------------------------------------------------------------
//multiple light cubemap
//--------------------------------------------------------------------
mltexcm_rt = new Array(3 * (M + 1));
mltexcm = new Array(3 * (M + 1));

for (i = 0; i < 3 * (M + 1); i++) {
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
    ndis_light: { value: n_light },
    cmmap: {
      value: [mltexcm_rt[0].texture, mltexcm_rt[1].texture, mltexcm_rt[2].texture, mltexcm_rt[3].texture, mltexcm_rt[4].texture,
      mltexcm_rt[5].texture, mltexcm_rt[6].texture, mltexcm_rt[7].texture, mltexcm_rt[8].texture, mltexcm_rt[9].texture,
      mltexcm_rt[10].texture, mltexcm_rt[11].texture, mltexcm_rt[12].texture, mltexcm_rt[13].texture, mltexcm_rt[14].texture
      ]
    },
    lightmv: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
  },
  vertexShader: document.getElementById('csm_mlcm_shader_vs').textContent,
  fragmentShader: document.getElementById('csm_mlcm_shader_fs').textContent
});
//--------------------------------------------------------------------

//--------------------------------------------------------------------
//multiple light for env map - dp map
//--------------------------------------------------------------------
mlenv_texdp_id = new Array(NENV_light/2);
mlenv_texdp_rt_id = new Array(NENV_light/2);
var i, j;
for (i = 0; i < NENV_light/2; i++) {
  mlenv_texdp_rt_id[i] = new THREE.WebGLArrayRenderTarget(dp_side, dp_side, 2 * 2 * (M + 1));
  mlenv_texdp_rt_id[i].texture.format = THREE.RGBAFormat;
  mlenv_texdp_rt_id[i].texture.minFilter = THREE.LinearFilter;
  mlenv_texdp_rt_id[i].texture.magFilter = THREE.LinearFilter;

  for (j = 0; j <  2 *2 * (M + 1); j++)
    renderer.setRenderTarget(mlenv_texdp_rt_id[i], j);

  mlenv_texdp_id[i] = renderer.properties.get(mlenv_texdp_rt_id[i].texture).__webglTexture;
  mlenv_texdp_id[i].needsUpdate = true;
}

mlenv_texdp_rt_s_id = new Array(NENV_light * 2);
mlenv_texdp_s_id = new Array(NENV_light * 2);
for (i = 0; i < NENV_light * 2; i++) {
  mlenv_texdp_rt_s_id[i] = new THREE.WebGLRenderTarget(dp_side, dp_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  renderer.setRenderTarget(mlenv_texdp_rt_s_id[i]);
  mlenv_texdp_s_id[i] = renderer.properties.get(mlenv_texdp_rt_s_id[i].texture).__webglTexture;
}

mlenvdp_cameraRTT = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
mlenvdp_RTT = new THREE.ShaderMaterial({
  uniforms: {
    mvp: { value: new THREE.Matrix4() },
    zFar: { value: Math.sqrt(12.0) },        //error
    l: { value: new THREE.Vector3(0, 0, 0) }
  },
  vertexShader: document.getElementById('mldp_shader_vs').textContent,
  fragmentShader: document.getElementById('mldp_shader_fs').textContent,
});

mlenvdp_Screen = new THREE.ShaderMaterial({
  uniforms: {
    eye: { value: new THREE.Vector3() },
    zNear: { value: zNear },
    shadow_a: { value: shadow_a },
    shadow_b: { value: shadow_b },
    l: { value: tmplpos },
    light_intensity: { value: tmple },
    mlenvdp_zFar: { value: tmpzFar },
    lsize: { value: tmpls },
    j_scale: {value: j_scalef},
    mlenv_dpmap: {
      value: [
        mlenv_texdp_rt_id[0].texture, mlenv_texdp_rt_id[1].texture, mlenv_texdp_rt_id[2].texture,
        mlenv_texdp_rt_id[3].texture
        , mlenv_texdp_rt_id[4].texture, mlenv_texdp_rt_id[5].texture,
        //mlenv_texdp_rt_id[6].texture, mlenv_texdp_rt_id[7].texture
      ]
    },
    lightmv: {
      value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
        new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()
        ,new THREE.Matrix4(), new THREE.Matrix4(),new THREE.Matrix4(), new THREE.Matrix4()
      ]
    }
  },
  vertexShader: document.getElementById('csm_mlenvdp_shader_vs').textContent,
  fragmentShader: document.getElementById('csm_mlenvdp_shader_fs').textContent
});
mlenvdp_Screen.needsUpdate = true;
//--------------------------------------------------------------------


//--------------------------------------------------------------------
//multiple area light for env map - 2D texture
//--------------------------------------------------------------------
// for omni light plus env
for (var i = 0; i < N_omni_light; i++) {
  allpos_omni[i] = new THREE.Vector3();
  alls_omni[i] = lightsize;
  alzFar_omni[i] = zFar;
  allmv_omni[i] = new THREE.Matrix4();
}

altex_rt_id_omni = new Array(N_omni_light/2);
altex_id_omni = new Array(N_omni_light / 2);

//for generate basis maps 
for (var i = 0; i < N_omni_light / 2; i++) {
  altex_rt_id_omni[i] = new THREE.WebGLArrayRenderTarget(dp_side, dp_side, 2 * 2 * (M + 1));
  altex_rt_id_omni[i].texture.format = THREE.RGBAFormat;
  altex_rt_id_omni[i].texture.minFilter = THREE.LinearFilter;
  altex_rt_id_omni[i].texture.magFilter = THREE.LinearFilter;

  for (var j = 0; j <  2 *2 * (M + 1); j++)
    renderer.setRenderTarget(altex_rt_id_omni[i], j);

  altex_id_omni[i] = renderer.properties.get(altex_rt_id_omni[i].texture).__webglTexture;
  altex_id_omni[i].needsUpdate = true;
}

//for generate depth map 
altex_rt_s_id_omni = new Array(N_omni_light * 2);
altex_s_id_omni = new Array(N_omni_light * 2);
for (i = 0; i < N_omni_light * 2; i++) {
  altex_rt_s_id_omni[i] = new THREE.WebGLRenderTarget(dp_side, dp_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  renderer.setRenderTarget(altex_rt_s_id_omni[i]);
  altex_s_id_omni[i] = renderer.properties.get(altex_rt_s_id_omni[i].texture).__webglTexture;
}

al_cameraRTT_omni = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100);
al_RTT_omni = new THREE.ShaderMaterial({
  uniforms: {
    mvp: { value: new THREE.Matrix4() },
    zFar: { value: Math.sqrt(12.0) },        //error
    l: { value: new THREE.Vector3(0, 0, 0) }
  },
  vertexShader: document.getElementById('mldp_shader_vs').textContent,
  fragmentShader: document.getElementById('mldp_shader_fs').textContent,
});


//for env map
altex_rt_id = new Array(num_arealight);
altex_id = new Array(num_arealight);

for (i = 0; i < num_arealight; i++)
{
  altex_rt_id[i] = new THREE.WebGLArrayRenderTarget(al_side, al_side, M + 1);
  altex_rt_id[i].texture.format = THREE.RGBAFormat;
  altex_rt_id[i].texture.minFilter = THREE.LinearFilter;
  altex_rt_id[i].texture.magFilter = THREE.LinearFilter;
  for (j = 0; j < M + 1; j++)
    renderer.setRenderTarget(altex_rt_id[i], j);
  altex_id[i] = renderer.properties.get(altex_rt_id[i].texture).__webglTexture;
  altex_id[i].needsUpdate = true;
}

altex_rt_s_id = new Array(num_arealight);
altex_s_id = new Array(num_arealight); // for generate depth map
for (i = 0; i < num_arealight; i++)
{
  altex_rt_s_id[i] = new THREE.WebGLRenderTarget(al_side, al_side, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  renderer.setRenderTarget(altex_rt_s_id[i]);
  altex_s_id[i] = renderer.properties.get(altex_rt_s_id[i].texture).__webglTexture;
}
 // for generate depth maps
al_cameraRTT = new THREE.OrthographicCamera(-100, 100, -100, 100, -100, 100); 
al_RTT = new THREE.ShaderMaterial({
  uniforms: {
    mvp: { value: new THREE.Matrix4() },
    uPerspectiveMatrix: { value: new THREE.Matrix4() },
    uViewMatrix: { value: new THREE.Matrix4() },
    lc: { value: new THREE.Vector3(0, 0, 0) },
    scalefactor: {value: al_scalefactor}
  },
  vertexShader: document.getElementById('alenv_shader_vs').textContent,
  fragmentShader: document.getElementById('alenv_shader_fs').textContent,
});
al_RTT.needsUpdate = true;

al_Screen = new THREE.ShaderMaterial({
  uniforms: {
    eye: { value: new THREE.Vector3() },
    shadow_a: { value: shadow_a },
    shadow_b: { value: shadow_b },
    scalefactor0: { value: al_scalefactor },
    lidx: { value: j_lidx },
    j_scale: { value: j_scalef },
    lightsize: { value: al_lsize },
    lc: { value: al_lpos },
    le: { value: al_le },
    almap_arr: {
      value: [
        altex_rt_id[0].texture, altex_rt_id[1].texture, altex_rt_id[2].texture,
        altex_rt_id[3].texture, altex_rt_id[4].texture, altex_rt_id[5].texture,
        altex_rt_id[6].texture, altex_rt_id[7].texture
      //  ,
      //  altex_rt_id[8].texture, altex_rt_id[9].texture, altex_rt_id[10].texture,
      //  altex_rt_id[11].texture, altex_rt_id[12].texture, altex_rt_id[13].texture,
      //  altex_rt_id[14].texture, altex_rt_id[15].texture, 
      ]
    },
    lightmv: { //value: al_lmv
      value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
        new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()
      //  ,
      //new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(),
      //new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()
      ]
    },
    lc_omni: { value: allpos_omni },
    zFar_omni: { value: alzFar_omni },
    lsize_omni: { value: alls_omni },
    zNear: {value: zNear},
    lightmv_omni: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
    omnimap_arr: {value:[altex_rt_id_omni[0].texture, altex_rt_id_omni[1].texture]}
  },
  vertexShader: document.getElementById('csm_alenv_shader_vs').textContent,
  fragmentShader: document.getElementById('csm_alenv_shader_fs').textContent
});
al_Screen.needsUpdate = true;

//--------------------------------------------------------------------
my_quad = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,]);
my_quad.n = 6;

var grid;
{
  var rt_geometry = new THREE.TorusGeometry(0.2, 0.04, 64, 32);
  screen_zmesh1 = new THREE.Mesh(rt_geometry, mldp_Screen);
  screen_zmesh1.position.set(0, .25, 0);
  screen_zmesh1.scale.set(1, 1, 1);
  screen_zmesh1.rotation.y = 0;

  screen_zmesh2 = new THREE.Mesh(rt_geometry, mldp_Screen);
  screen_zmesh2.position.set(0, .5, 0);
  screen_zmesh2.scale.set(0.75, 0.75, 0.75);
  screen_zmesh2.rotation.y = Math.PI / 2;

  screen_mesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 100, 100), mldp_Screen);
  screen_mesh.rotation.x = -Math.PI / 2;

  grid = new THREE.GridHelper(20, 100, 0xffffff, 0xffffff);
  grid.position.set(0, .002, 0);
  grid.material.opacity = 0.2;//0.2;
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
  ml_lpos[1] = new THREE.Vector3(light1.position.x, light1.position.y, light1.position.z);

  light2 = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDDDDDD }));
  light2.position.set(.9, .9, .7);
  light2.scale.set(lightsize, lightsize, lightsize);
  ml_light.push(light2);
  ml_lpos[2] = new THREE.Vector3(light2.position.x, light2.position.y, light2.position.z);
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
  var y = 0.9;
  var z = THREE.MathUtils.randFloat(0.0, 1.0);//0.5, 0.9);
  tl.position.set(x, y, z);
  tl.scale.set(lightsize, lightsize, lightsize);
  ml_light.push(tl);
  sceneScreen.add(tl);
  ml_lpos[i] = new THREE.Vector3(tl.position.x, tl.position.y, tl.position.z);
}

for (i = 0; i < N_omni_light; i++)
{
  allpos_omni[i] = ml_lpos[i];
tmplpos[i + 8] = ml_lpos[i];
  var geometry = new THREE.SphereGeometry(1, 20, 20);
  var tmpe = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDC143C }));
  tmpe.position.set(ml_lpos[i].x, ml_lpos[j].y, ml_lpos[j].z);
  tmpe.scale.set(lightsize, lightsize, lightsize);
  omni_light.push(tmpe);
  sceneScreen.add(tmpe);
}

// Add env map approximated light sources
for (var j = 0; j < NENV_light; j++) {
  var geometry = new THREE.SphereGeometry(1, 20, 20);
  var tmpe = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDC143C }));
  tmpe.position.set(tmplpos[j].x, tmplpos[j].y, tmplpos[j].z);
  tmpe.scale.set(tmpls[j], tmpls[j], tmpls[j]);
  env_light.push(tmpe);
  sceneScreen.add(tmpe);
}

//add area light for approximating env map
for (var j = 0; j < num_arealight; j++) {
  var geometry = new THREE.SphereGeometry(1, 20, 20);
  var tmpe = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xDC143C }));
  tmpe.position.set(al_lpos[j].x, al_lpos[j].y, al_lpos[j].z);
  tmpe.scale.set(al_lsize[j], al_lsize[j], al_lsize[j]);
  my_arealight.push(tmpe);
  sceneScreen.add(tmpe);
}

var objects = [];
objects.push(light_sphere);
objects.push(light1);
objects.push(light2);
for (var i = 0; i < Max_num_light; i++)
  objects.push(ml_light[i]);
for (var i = 0; i < num_arealight; i++)
  objects.push(my_arealight[i]);
for (var i = 0; i < NENV_light; i++)
  objects.push(env_light[i]);

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
for (i = 0; i < 32; i++) {
  var loader = new GLTFLoader();
  loader.load('models/gltf/RobotExpressive/RobotExpressive.glb', function (gltf) {
    var tmp = gltf.scene;//.children[ 0 ];
    model.push(tmp);
    tmp.scale.set(.1, .1, .1);
    tmp.translateOnAxis(modelforward, .3);
    tmp.position.set(1, 0, -(model.length - 1) * tile_length * 2);

    // new added, for modifing the model vertex
    tmp.traverse((child) => {
      if (child.isMesh) {
        child.material.flatShading = false;
        child.geometry.computeVertexNormals();
      }
    });

    sceneScreen.add(tmp);

    var tmp_mixer = new THREE.AnimationMixer(tmp);
    mixer.push(tmp_mixer);
    if (model.length == 1)
      createGUI(tmp, gltf.animations);
    else {
      for (var i = 0; i < gltf.animations.length; i++) {
        if (gltf.animations[i].name == 'Walking') {
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

// initial
function createGUI(model, animations) {
face = model.getObjectByName('Head_2');

for (var i = 0; i < animations.length; i++) {
  var clip = animations[i];
  var action = mixer[0].clipAction(clip);
  actions[clip.name] = action;
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

// map selection
var map_select_Folder = gui.addFolder('Map selection');
var map_select_clipCtrl = map_select_Folder.add(map_select_api, 'map_type').options(map_select);
map_select_clipCtrl.onChange(function (val) {
  if (val == "Multiple DP map") {
    maptype = 0;
    screen_zmesh1.material = mldp_Screen;
    screen_zmesh2.material = mldp_Screen;
    screen_mesh.material = mldp_Screen;
    screen_mesh.scale.set(1.0, 1.0, 1.0);
  }

  if (val == "Multiple CM map") {
    maptype = 1;
    screen_zmesh1.material = mlcm_Screen;
    screen_zmesh2.material = mlcm_Screen;
    screen_mesh.material = mlcm_Screen;
    screen_mesh.scale.set(1.0, 1.0, 1.0);
  }

  if (val == "Env. map approximation (DPMAP)") {
    maptype = 2;
    screen_zmesh1.material = mlenvdp_Screen;
    screen_zmesh2.material = mlenvdp_Screen;
    screen_mesh.material = mlenvdp_Screen;
    screen_mesh.scale.set(0.25, 0.25, 0.25);
  }

  if (val == "Env. map approx. (Directional light)")
  {
    maptype = 3;
    screen_zmesh1.material = al_Screen;
    screen_zmesh2.material = al_Screen;
    screen_mesh.material   = al_Screen;
    screen_mesh.scale.set(0.25, 0.25, 0.25);
  }
});
map_select_Folder.open();


settings = {
  'full screen': 0,
  'Tiles/Second': tiles_per_second,
  'time_scale': time_scale,
  'animate':isAnimate,
  'lightsize': lightsize,
  'tex_id': draw_tex_id,
  'draw_mlcmtex_id': draw_mlcmtex_id,
  'draw_mldptex_id': draw_mldptex_id,
  'draw_mlenvtex_id': draw_mlenvtex_id,
  'layer_idx': draw_layer_idx,
  'robot number': num_of_display_robot,
  'light number': n_light,
  'use vr': 0,
  'al fovy': Math.PI / 3.0,
  'light idx': 0,
  'intensity scale':0.05
};

var expressionFolder = gui.addFolder('Expressions');
expressionFolder.add(settings, 'full screen', 0, 1, 1).onChange(
  function (val) {
    if (val == 1)
      openFullscreen();
    else
      closeFullscreen();
  });

expressionFolder.add(settings, 'animate', 0, 1, 1).onChange(
  function (val) {
    if (val == 1)
      isAnimate = true;
    else
      isAnimate = false;
  });
expressionFolder.add(settings, 'robot number', 1, 32, 1).onChange(
  function (val) {
    num_of_display_robot = val;
  });
expressionFolder.add(settings, 'light number', 1, 16, 1).onChange(
  function (val) {
    if (maptype == 0) { 
      n_light = val;
    }
    if (maptype == 1) {
      if (val < 1)
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
expressionFolder.add(settings, 'tex_id', -1, 4, 1).onChange(
  function (val) {
    draw_tex_id = val;
  });
expressionFolder.add(settings, 'draw_mlcmtex_id', -1, 14, 1).onChange(
  function (val) {
    draw_mlcmtex_id = val;//*(M+1);
  });
expressionFolder.add(settings, 'draw_mldptex_id', -1, 16, 1).onChange(
  function (val) {
    if (val < n_light)
      draw_mldptex_id = val;
    else
      draw_mldptex_id = n_light - 1;
  });
expressionFolder.add(settings, 'draw_mlenvtex_id', -1, 15, 1).onChange(
  function (val) {
    draw_mlenvtex_id = val;
  });
expressionFolder.add(settings, 'layer_idx', -1, 4, 1).onChange(
  function (val) {
    draw_layer_idx = val;
  });
expressionFolder.add(settings, 'Tiles/Second', 1, 10, .001).onChange(
  function (val) {
    tiles_per_second = val;
  });
expressionFolder.add(settings, 'time_scale', 1, 100, 1).onChange(
  function (val) {
    time_scale = val;
    clearInterval(my_interval_id);
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

expressionFolder.add(settings, 'al fovy', 0, Math.PI, 0.1).onChange(
 function (val) {
   al_lit_fovy = val;
 });
expressionFolder.add(settings, 'light idx', 0, 15, 1).onChange(
 function (val) {
   j_lidx = val;
 });
expressionFolder.add(settings, 'intensity scale', 0, 1, 0.0001).onChange(
 function (val) {
    j_scalef= val;
 });

expressionFolder.open();

}

var dt;

var theta0 = 0;
var tiles_per_second = 5;
var tile_length = .2;

function animate(dt, time_scale, lineA) {
dt = clock.getDelta();//* time_scale;
if (isAnimate)
  theta0 += dt * .1;

for (var i = 1; i < num_of_display_robot; i++)
  model[i].visible = true;
for (var i = num_of_display_robot; i < model.length; i++)
  model[i].visible = false;

if (maptype == 0 || maptype == 1) {
  for (var i = 1; i < n_light; i++)
    ml_light[i].visible = true;
  for (var i = n_light; i < ml_light.length; i++)
    ml_light[i].visible = false;
}
else {
  for (var i = 0; i < ml_light.length; i++)
    ml_light[i].visible = false;
}
if (maptype == 2) {
  for (var i = 0; i < NENV_light; i++)
    env_light[i].visible = false;   //true; //
} else {
  for (var i = 0; i < NENV_light; i++)
      env_light[i].visible = false;   
}

if (maptype == 3) {
  for (var i = 0; i < num_arealight; i++) 
    my_arealight[i].visible = false;   //true; //
  for (var i = 0; i < N_omni_light;i++)
    omni_light[i].visible = false;
} else {
  for (var i = 0; i < num_arealight; i++)
    my_arealight[i].visible = false;   //true; //
  for (var i = 0; i < N_omni_light;i++)
    omni_light[i].visible = false;
}

var nrobot = Math.min(num_of_display_robot, model.length);
for (var i = 1; i < nrobot; i++) {
  var theta = 2 * Math.PI / nrobot * i + theta0;
  var radius = tile_length * 2 * nrobot / (2 * Math.PI);
  radius = Math.max(1, radius);
  model[i].rotation.y = -theta;
  model[i].position.set(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
}

if (isAnimate) {
  if (mixer[0]) mixer[0].update(dt * tiles_per_second * tiles_length);
  for (var i = 1; i < Math.min(num_of_display_robot, mixer.length); i++)
    if (mixer[i]) mixer[i].update(dt * 5 * tiles_length);
}

requestAnimationFrame(animate);
cameraScreen_controls.update();
renderX(dt, time_scale, lineA);

stats.update();
}

init();
let clock = new THREE.Clock();
my_quad_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
gl.bufferData(gl.ARRAY_BUFFER, my_quad, gl.STATIC_DRAW);

//multiple light
prepare_mldpfbo(dp_side);
prepare_mlcmfbo(cm_side);
prepare_mlenvdpfbo(dp_side);

//annen area light env map
prepare_alfbo(al_side);
prepare_alfbo_omni(dp_side);
animate();

//multiple light
function prepare_mldpfbo(dp_side) {
mldp_fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, mldp_fbo);

mldp_rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, mldp_rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, dp_side, dp_side);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mldp_rbo);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function prepare_mlcmfbo(cm_side) {
mlcm_fbo = gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER, mlcm_fbo);

mlcm_rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, mlcm_rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, cm_side, cm_side);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mlcm_rbo);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function prepare_mlenvdpfbo(dp_side) {
mlenvdp_fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, mlenvdp_fbo);

mlenvdp_rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, mlenvdp_rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, dp_side, dp_side);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mlenvdp_rbo);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function  prepare_alfbo(al_side) {
al_fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, al_fbo);

al_rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, al_rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, al_side, al_side);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, al_rbo);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function prepare_alfbo_omni(dp_side) {
al_fbo_omni = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, al_fbo_omni);

al_rbo_omni = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, al_rbo_omni);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, dp_side, dp_side);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, al_rbo_omni);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

for (j = 0; j < n_light; j++) {
  for (i = 0; i < 2; i++) {
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
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j * (M + 1) + 1], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j * (M + 1) + 2], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j * (M + 1) + 3], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mltexcm[j * (M + 1) + 4], 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, mltexcm[j * (M + 1)]);

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

for (i = 0; i < n_light * (M + 1); i++) {
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

function genbasis_mlenv_dpmapy() {
var i, j;
var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
var port0 = gl.getParameter(gl.VIEWPORT);
var tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);

var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
gl.enableVertexAttribArray(genbasis_shader_mldps.v0);
gl.enableVertexAttribArray(genbasis_shader_mldps.t0);

gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, mlenvdp_fbo);
gl.viewport(0, 0, dp_side, dp_side);

var n_tex = NENV_light / 2;
for (j = 0; j < n_tex; j++) {
  for (i = 0; i < 4; i++) {    // indeed  forloop four textures of two light, 0-1 for the first light, 2-3 for the second one
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mlenv_texdp_s_id[j * 4 + i]);

    var k, q;
    if (i == 0 || i == 1)
      k = 0;
    else
      k = 1;
    if (i == 0 || i == 2)
      q = 0;
    else
      q = 1;

    //console.log('i ' + i + ' k ' + k);
    // for each mltexdp_id, it stores two lights' shadow maps
    // 0-1 are the front and back of the first light, 2-9 are the basis maps
    // 10-11 are the front and back of the second light, 12-19 are the basis map
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, mlenv_texdp_id[j], 0, q + k*10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, mlenv_texdp_id[j], 0, q * M + 1 + 1 + k*10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT2, mlenv_texdp_id[j], 0, q * M + 1 + 2 + k*10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT3, mlenv_texdp_id[j], 0, q * M + 1 + 3 + k*10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT4, mlenv_texdp_id[j], 0, q * M + 1 + 4 + k*10);

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
for (i = 0; i < n_tex; i++) {
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, mlenv_texdp_id[i]);
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

function mldp_renderx(renderer) {
var i, j;
for (i = 0; i < n_light; i++) {
  ml_lpos[i] = new THREE.Vector3(ml_light[i].position.x, ml_light[i].position.y, ml_light[i].position.z);
  ml_zFar[i] = zFar;
}

for (j = 0; j < n_light; j++) {
  var eye = [new vec3(0.0, 0.0, -1.0), new vec3(0.0, 0.0, 1.0)];
  var up = [(new vec3(0.0, 1.0, 0.0)).neg(), (new vec3(0.0, 1.0, 0.0)).neg()];

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

    renderer.setRenderTarget(mltexdp_rt_s_id[2 * j + i]);
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
//console.log('mlcm_render ' + n_light);

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
  var l = new THREE.Vector3(ml_lpos[j].x, ml_lpos[j].y, ml_lpos[j].z);

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

    renderer.setRenderTarget(mltexcm_rt[j * (M + 1)], i);
    renderer.clear();
    renderer.render(sceneScreen, mlcm_camera);
  }
}
sceneScreen.overrideMaterial = null;
sceneScreen.background = prev_background;
sceneScreen.fog = prev_fog;
renderer.setClearColor(prev_color, prev_apaha);
}

function mlenvdp_render(renderer) {
var i, j;

for (j = 0; j < NENV_light; j++) {
  var eye = [new vec3(0.0, 0.0, -1.0), new vec3(0.0, 0.0, 1.0)];
  var up = [(new vec3(0.0, 1.0, 0.0)).neg(), (new vec3(0.0, 1.0, 0.0)).neg()];

  var l = new vec3(tmplpos[j].x, tmplpos[j].y, tmplpos[j].z);
  //var l = new vec3(env_light[j].position.x, env_light[j].position.y, env_light[j].position.z);
  //console.log('mlenvdp_render + l ' + l.x + ' ' + l.y + ' ' + l.z);
  var mvp;
  mlenvdp_RTT.uniforms["zFar"].value = tmpzFar[j];
  mlenvdp_RTT.uniforms["l"].value.set(l.x, l.y, l.z);

  var prev_color = new THREE.Color();
  renderer.getClearColor(prev_color);
  var prev_apaha = renderer.getClearAlpha();
  renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);
  var prev_background = sceneScreen.background;
  var prev_fog = sceneScreen.fog;
  sceneScreen.background = null;
  sceneScreen.fog = null;

  sceneScreen.overrideMaterial = mlenvdp_RTT;
  for (i = 0; i < 2; i++) {
    mvp = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
    mlenvdp_RTT.uniforms["mvp"].value.set(
      mvp[0], mvp[4], mvp[8], mvp[12],
      mvp[1], mvp[5], mvp[9], mvp[13],
      mvp[2], mvp[6], mvp[10], mvp[14],
      mvp[3], mvp[7], mvp[11], mvp[15]);

    renderer.setRenderTarget(mlenv_texdp_rt_s_id[2 * j + i]);
    renderer.clear();
    renderer.render(sceneScreen, mlenvdp_cameraRTT);
  }


}
sceneScreen.overrideMaterial = null;
sceneScreen.background = prev_background;
sceneScreen.fog = prev_fog;
renderer.setClearColor(prev_color, prev_apaha);
}



function draw_altex(tex0, matrix, layeridx) {
gl.activeTexture(gl.TEXTURE0);

var prev_tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex0);

var v0_enabled0 = gl.getVertexAttrib(drawaltex_shader.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
var t0_enabled0 = gl.getVertexAttrib(drawaltex_shader.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
gl.enableVertexAttribArray(drawaltex_shader.v0);
gl.enableVertexAttribArray(drawaltex_shader.t0);

gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
gl.vertexAttribPointer(drawaltex_shader.v0, 2, gl.FLOAT, false, 8, 0);
gl.vertexAttribPointer(drawaltex_shader.t0, 2, gl.FLOAT, false, 8, 0);

drawaltex_shader.use();
gl.uniform1i(drawaltex_shader.tex0, 0);
gl.uniform1i(drawaltex_shader.layeridx, layeridx);
gl.uniformMatrix4fv(drawaltex_shader.mvp, false, matrix);
gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);

if (!v0_enabled0)
  gl.disableVertexAttribArray(drawaltex_shader.v0);
if (!t0_enabled0)
  gl.disableVertexAttribArray(drawaltex_shader.t0);
gl.bindTexture(gl.TEXTURE_2D_ARRAY, prev_tex0);
}

// Annen area light depth map generation

function alenv_render(renderer) {
var i, j;
for (i = 0; i < num_arealight; i++) {
  al_lpos[i] = new THREE.Vector3(my_arealight[i].position.x, my_arealight[i].position.y, my_arealight[i].position.z);
}
var prev_color = new THREE.Color();
renderer.getClearColor(prev_color);
var prev_apaha = renderer.getClearAlpha();
renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);
var prev_background = sceneScreen.background;
var prev_fog = sceneScreen.fog;
sceneScreen.background = null;
sceneScreen.fog = null;
sceneScreen.overrideMaterial = al_RTT;
for (j = 0; j < num_arealight; j++)
{

  var l = new vec3(al_lpos[j].x, al_lpos[j].y, al_lpos[j].z);///2.0/Math.sqrt(3.0);
  al_RTT.uniforms["lc"].value.set(l.x, l.y, l.z); // lit far now is 2*sqrt(3)

  var mvp;
  //var pj = m4.perspective(Math.PI / 3.0, 1.0, 0.1, 100.0);   // can work 20230911
  //console.log('al_lit_fovy ' + al_lit_fovy);
  var pj = m4.perspective(al_lit_fovy, 1.0, 0.1, 100.0);   // Math.PI / 3.0
  var mv = m4.lookAt([l.x, l.y, l.z], [0.0, 0.0, 0.0], [al_lit_up[j].x, al_lit_up[j].y, al_lit_up[j].z]);
  mvp = m4.multiply(pj, mv);
  al_RTT.uniforms["mvp"].value.set(
      mvp[0], mvp[4], mvp[8], mvp[12],
      mvp[1], mvp[5], mvp[9], mvp[13],
      mvp[2], mvp[6], mvp[10], mvp[14],
      mvp[3], mvp[7], mvp[11], mvp[15]);

  al_lmv[j] = new THREE.Matrix4().fromArray(mvp);
  renderer.setRenderTarget(altex_rt_s_id[j]);
  renderer.clear();
  renderer.render(sceneScreen, al_cameraRTT);
}
sceneScreen.overrideMaterial = null;
sceneScreen.background = prev_background;
sceneScreen.fog = prev_fog;
renderer.setClearColor(prev_color, prev_apaha);
}

function genbasis_alenv_map() {
var i, j;
var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
var port0 = gl.getParameter(gl.VIEWPORT);
var tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);

var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_alenv.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_alenv.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
gl.enableVertexAttribArray(genbasis_shader_alenv.v0);
gl.enableVertexAttribArray(genbasis_shader_alenv.t0);

gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, al_fbo);
gl.viewport(0, 0, al_side, al_side);
 
for (j = 0; j < num_arealight; j++) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, altex_s_id[j]);
  gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, altex_id[j], 0, 0);
  gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, altex_id[j], 0, 1);
  gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT2, altex_id[j], 0, 2);
  gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT3, altex_id[j], 0, 3);
  gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT4, altex_id[j], 0, 4);

  genbasis_shader_alenv.use();
  gl.uniformMatrix4fv(genbasis_shader_alenv.mvp, false, m4.orthographic(0, 1, 0, 1, -1, 1));
  gl.uniform1i(genbasis_shader_alenv.depthmap, 0);
  gl.uniform1i(genbasis_shader_alenv.layeridx, i);

  gl.bindBuffer(gl.ARRAY_BUFFER, my_quad_buffer);
  gl.vertexAttribPointer(genbasis_shader_alenv.v0, 2, gl.FLOAT, false, 8, 0);
  gl.vertexAttribPointer(genbasis_shader_alenv.t0, 2, gl.FLOAT, false, 8, 0);
  gl.drawArrays(gl.TRIANGLES, 0, my_quad.n);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4]);
}
for (i = 0; i < num_arealight; i++) {
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, altex_id[i]);
  gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameterf(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
}
if (!v0_enabled0)
  gl.disableVertexAttribArray(genbasis_shader_alenv.v0);
if (!t0_enabled0)
  gl.disableVertexAttribArray(genbasis_shader_alenv.t0);

gl.bindTexture(gl.TEXTURE_2D, tex0);
gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo0);
gl.viewport(port0[0], port0[1], port0[2], port0[3]);
}

function alOmnidp_render(renderer) {
var i, j;
for (i = 0; i < N_omni_light; i++) {
  allpos_omni[i] = new THREE.Vector3(omni_light[i].position.x, omni_light[i].position.y, omni_light[i].position.z);
  alzFar_omni[i] = zFar;
}

for (j = 0; j < N_omni_light; j++) {
var eye = [new vec3(0.0, 0.0, -1.0), new vec3(0.0, 0.0, 1.0)];
var up = [(new vec3(0.0, 1.0, 0.0)).neg(), (new vec3(0.0, 1.0, 0.0)).neg()];

var l = new vec3(allpos_omni[j].x, allpos_omni[j].y, allpos_omni[j].z);
var mvp;
al_RTT_omni.uniforms["zFar"].value = alzFar_omni[j];
al_RTT_omni.uniforms["l"].value.set(l.x, l.y, l.z);

var prev_color = new THREE.Color();
renderer.getClearColor(prev_color);
var prev_apaha = renderer.getClearAlpha();
renderer.setClearColor(new THREE.Color(1, 1, 1), 1.0);
var prev_background = sceneScreen.background;
var prev_fog = sceneScreen.fog;
sceneScreen.background = null;
sceneScreen.fog = null;

sceneScreen.overrideMaterial = al_RTT_omni;
for (i = 0; i < 2; i++) {
  mvp = m4.lookAt([l.x, l.y, l.z], [eye[i].x + l.x, eye[i].y + l.y, eye[i].z + l.z], [up[i].x, up[i].y, up[i].z]);
  al_RTT_omni.uniforms["mvp"].value.set(
    mvp[0], mvp[4], mvp[8], mvp[12],
    mvp[1], mvp[5], mvp[9], mvp[13],
    mvp[2], mvp[6], mvp[10], mvp[14],
    mvp[3], mvp[7], mvp[11], mvp[15]);

  renderer.setRenderTarget(altex_rt_s_id_omni[2 * j + i]);
  renderer.clear();
  renderer.render(sceneScreen, al_cameraRTT_omni);
}
}
sceneScreen.overrideMaterial = null;
sceneScreen.background = prev_background;
sceneScreen.fog = prev_fog;
renderer.setClearColor(prev_color, prev_apaha);
}
function genbasis_alOmni_dpmap() {
var i, j;
var fbo0 = gl.getParameter(gl.FRAMEBUFFER_BINDING);
var port0 = gl.getParameter(gl.VIEWPORT);
var tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);

var v0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.v0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
var t0_enabled0 = gl.getVertexAttrib(genbasis_shader_mldps.t0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
gl.enableVertexAttribArray(genbasis_shader_mldps.v0);
gl.enableVertexAttribArray(genbasis_shader_mldps.t0);

gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, al_fbo_omni);
gl.viewport(0, 0, dp_side, dp_side);

var n_tex = N_omni_light / 2;
for (j = 0; j < n_tex; j++) {
  for (i = 0; i < 4; i++) {    // indeed  forloop four textures of two light, 0-1 for the first light, 2-3 for the second one
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, altex_s_id_omni[j * 4 + i]);

    var k, q;
    if (i == 0 || i == 1)
      k = 0;
    else
      k = 1;
    if (i == 0 || i == 2)
      q = 0;
    else
      q = 1;
    //console.log('i ' + i + ' k ' + k);
    // for each mltexdp_id, it stores two lights' shadow maps
    // 0-1 are the front and back of the first light, 2-9 are the basis maps
    // 10-11 are the front and back of the second light, 12-19 are the basis map
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, altex_id_omni[j], 0, q + k * 10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, altex_id_omni[j], 0, q * M + 1 + 1 + k * 10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT2, altex_id_omni[j], 0, q * M + 1 + 2 + k * 10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT3, altex_id_omni[j], 0, q * M + 1 + 3 + k * 10);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT4, altex_id_omni[j], 0, q * M + 1 + 4 + k * 10);

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
for (i = 0; i < n_tex; i++) {
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, altex_id_omni[i]);
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

function renderX(dt, time_scale, lineA) {
{
  var dtheta = 2 * Math.PI * dt * .6;
  if (isAnimate) {
    screen_zmesh1.rotation.y -= dtheta;
    screen_zmesh2.rotation.y -= dtheta;
  }
  if (model[0]) {
    if (beizer_pos.length > 0) {
      //console.log(beizer_length);
      var beizer_dt = ((new Date()).getTime() - beizer_t0) / 1000 / beizer_length * tiles_per_second * tiles_length * time_scale;
      beizer_t0 = (new Date()).getTime();
      beizer_t = g_clamp(beizer_t + beizer_dt, 0, 1);

      my_dot.position.copy(beizer_pos[3]);
      modelforward.copy(beizer_direction(beizer_t));

      var tmp = new THREE.Vector3();
      tmp.copy(modelforward);
      tmp.cross(modelforward0);
      model[0].rotation.y = (tmp.y > 0 ? -1 : 1) * Math.acos(modelforward.dot(modelforward0));
      model[0].position.copy(beizer(beizer_t));
    }
  }

}

if (maptype == 0) {
  mldp_renderx(renderer);
  genbasis_mldpmapy();
}
if (maptype == 1) {
  mlcm_render(renderer);
  genbasis_mlcmmap();
}
if (maptype == 2) {
  mlenvdp_render(renderer);
  genbasis_mlenv_dpmapy();
}
if (maptype == 3) {
  alenv_render(renderer);
  genbasis_alenv_map();
  alOmnidp_render(renderer);
  genbasis_alOmni_dpmap();
}

var l = new vec3(light_sphere.position.x, light_sphere.position.y, light_sphere.position.z);
renderer.setRenderTarget(null);
renderer.clear();

if (maptype == 0) {
  for (var k = 0; k < n_light; k++) {
    ml_lpos[k] = new THREE.Vector3(ml_light[k].position.x, ml_light[k].position.y, ml_light[k].position.z);
    ml_lsize[k] = lightsize;
    ml_zFar[k] = zFar;// 0.5;
  }
  for (var i = 0; i < n_light; i++) {
    mldp_Screen.uniforms.l.value[i].set(ml_lpos[i].x, ml_lpos[i].y, ml_lpos[i].z);
    mldp_Screen.uniforms.lsize.value[i] = lightsize;
    mldp_Screen.uniforms.mldp_zFar.value[i] = ml_zFar[i];
  }
  mldp_Screen.uniforms["num_dis_light"].value = n_light;
  mldp_Screen.uniforms["eye"].value = cameraScreen.position;
}

if (maptype == 1) {
  for (var k = 0; k < n_light; k++) {
    ml_lpos[k] = new THREE.Vector3(ml_light[k].position.x, ml_light[k].position.y, ml_light[k].position.z);
    ml_lsize[k] = lightsize;
    ml_zFar[k] = zFar;// 0.5;
  }
  {
    for (var i = 0; i < n_light; i++) {
      mlcm_Screen.uniforms.l.value[i].set(ml_lpos[i].x, ml_lpos[i].y, ml_lpos[i].z);
      mlcm_Screen.uniforms.lsize.value[i] = lightsize;
      mlcm_Screen.uniforms.mlcm_zFar.value[i] = ml_zFar[i];
    }
    mlcm_Screen.uniforms["ndis_light"].value = n_light;
    mlcm_Screen.uniforms["eye"].value = cameraScreen.position;
  }
}

if (maptype == 2) {
  mlenvdp_Screen.uniforms.j_scale.value = j_scalef;
  for (var i = 0; i < NENV_light; i++) {
    mlenvdp_Screen.uniforms.l.value[i].set(tmplpos[i].x, tmplpos[i].y, tmplpos[i].z);
    mlenvdp_Screen.uniforms.lsize.value[i] = tmpls[i];
    mlenvdp_Screen.uniforms.mlenvdp_zFar.value[i] = tmpzFar[i];
    mlenvdp_Screen.uniforms.light_intensity.value[i].set(tmple[i].x, tmple[i].y, tmple[i].z);
  }
  mlenvdp_Screen.uniforms["eye"].value = cameraScreen.position;
}

if (maptype == 3) {
  al_Screen.uniforms.lidx.value = j_lidx;
  al_Screen.uniforms.j_scale.value = j_scalef;
  for (var i = 0; i < num_arealight; i++) {
    al_Screen.uniforms.lc.value[i].set(al_lpos[i].x, al_lpos[i].y, al_lpos[i].z);
    al_Screen.uniforms.lightsize.value[i] = al_lsize[i];
    al_Screen.uniforms.le.value[i].set(al_le[i].x, al_le[i].y, al_le[i].z);
    al_Screen.uniforms.lightmv.value[i] = al_lmv[i];
  }
  for (var i = 0; i < N_omni_light; i++) {
    al_Screen.uniforms.lc_omni.value[i].set(allpos_omni[i].x, allpos_omni[i].y, allpos_omni[i].z);
    al_Screen.uniforms.lsize_omni.value[i] = lightsize;
    al_Screen.uniforms.zFar_omni.value[i] = zFar;
    }
  al_Screen.uniforms["eye"].value = cameraScreen.position;
}

if (!isVr) {
  renderer.render(sceneScreen, cameraScreen);
} else
  vrrender.render(sceneScreen, cameraScreen);


if (draw_layer_idx >= 0) {
  if (maptype == 0) {
    var draw_tex_matrix;
    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_mldptex(mltexdp_id[draw_mldptex_id], draw_tex_matrix, draw_layer_idx < 1 ? draw_layer_idx : (draw_layer_idx + 1));

    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_tex_matrix = m4.multiply(draw_tex_matrix, m4.translation(1, 0, 0));
    draw_mldptex(mltexdp_id[draw_mldptex_id], draw_tex_matrix, draw_layer_idx < 1 ? 1 : (draw_layer_idx + 5));
  }
}
if (draw_mlcmtex_id >= 0) {
  if (maptype == 1)
    drawcmtex(mltexcm[draw_mlcmtex_id]);
}

if (draw_mldptex_id >= 0 && draw_mlenvtex_id >= 8) {
  if (maptype == 3)
  {
    var indeed_texid, indeed_layeridf, indeed_layeridb;
    if (draw_mldptex_id == 0 || draw_mldptex_id == 1)
      indeed_texid = 0;
    if (draw_mldptex_id == 2 || draw_mldptex_id == 3)
      indeed_texid = 1;

    indeed_layeridf = draw_layer_idx < 1 ? draw_layer_idx : (draw_layer_idx + 1);
    indeed_layeridb = draw_layer_idx < 1 ? 1 : (draw_layer_idx + 5);
    if (draw_mldptex_id == 1 || draw_mldptex_id == 3) {
      indeed_layeridf = indeed_layeridf + 10;
      indeed_layeridb = indeed_layeridb + 10;
    }
    var draw_tex_matrix;
    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_mldptex(altex_id_omni[indeed_texid], draw_tex_matrix, indeed_layeridf);

    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_tex_matrix = m4.multiply(draw_tex_matrix, m4.translation(1, 0, 0));
    draw_mldptex(altex_id_omni[indeed_texid], draw_tex_matrix, indeed_layeridb);
  }
}

if (draw_mlenvtex_id >= 0) {
  if (maptype == 2) {

    var indeed_texid, indeed_layeridf, indeed_layeridb;
    if (draw_mlenvtex_id == 0 || draw_mlenvtex_id == 1)
      indeed_texid = 0;
    if (draw_mlenvtex_id == 2 || draw_mlenvtex_id == 3)
      indeed_texid = 1;
    if (draw_mlenvtex_id == 4 || draw_mlenvtex_id == 5)
      indeed_texid = 2;
    if (draw_mlenvtex_id == 6 || draw_mlenvtex_id == 7)
      indeed_texid = 3;
    if (draw_mlenvtex_id == 8 || draw_mlenvtex_id == 9)
      indeed_texid = 4;
    if (draw_mlenvtex_id == 10 || draw_mlenvtex_id == 11)
      indeed_texid = 5;

    indeed_layeridf = draw_layer_idx < 1 ? draw_layer_idx : (draw_layer_idx + 1);
    indeed_layeridb = draw_layer_idx < 1 ? 1 : (draw_layer_idx + 5);

    if (draw_mlenvtex_id == 1 || draw_mlenvtex_id == 3 || draw_mlenvtex_id == 5 || draw_mlenvtex_id == 7
      || draw_mlenvtex_id == 9 || draw_mlenvtex_id == 11) {
      indeed_layeridf = indeed_layeridf + 10;
      indeed_layeridb = indeed_layeridb + 10;
    }

    var draw_tex_matrix;
    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_mldptex(mlenv_texdp_id[indeed_texid], draw_tex_matrix, indeed_layeridf);

    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_tex_matrix = m4.multiply(draw_tex_matrix, m4.translation(1, 0, 0));
    draw_mldptex(mlenv_texdp_id[indeed_texid], draw_tex_matrix, indeed_layeridb);
  }

  if (maptype == 3)
  {
    var draw_tex_matrix;
    draw_tex_matrix = m4.orthographic(0, 4 * window.innerWidth / window.innerHeight, 0, 4, -1, 1);
    draw_altex(altex_id[draw_mlenvtex_id], draw_tex_matrix, draw_layer_idx<0 ? 0: draw_layer_idx);
  }

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