var container;
var camera, scene, renderer, trackballControls;
var spot1, spot2, spot3;    // helpers displaying sources of the lighting
var ambien1, ambient2, ambient3;
var robotMaterial, boxMaterial, floorMaterial;
var spotLight1, spotLight2, spotLight3;
var Box, B, C, D, E, F, FL, FR, FLtip, FRtip, raycaster, touchAngle, dropped = false, picked = false;

// source of the texture in base64 format
var imgData = "cracked_soil.jpg";

var gui = new dat.GUI();
var params = {  // parameters of GUI
    B: 0., C: 0., Elong: 20., E: 0., Fingers: -Math.PI/2.,
    diffuseColor:  "#ff0000", ambientColor:  "#101010", light: '1', "on": true,
    diffuse:  "#00aaff", ambient:  "#101010", specular:  "#007799", shininess: 100,
    material: "box", map: true,
    x: 10,
    y: 10,
    z: 10
};

// add materials and lighting folder to gui 
var Materials = gui.addFolder("Materials");
var Lighting = gui.addFolder("Lighting");

// add palette and its event listener
var diffuseMaterial = Materials.addColor( params, 'diffuse' ).name('Diffuse').listen();
// when the color in GUI is changed do the same for color of material
diffuseMaterial.onChange(function(value) {
    // eval - gets the variable by its string name
    eval(params.material + "Material").color.setHex( value.replace("#", "0x") );
});
var ambientMaterial = Materials.addColor( params, 'ambient' ).name('Ambient').listen();
ambientMaterial.onChange(function(value) {
    eval(params.material + "Material").emissive.setHex( value.replace("#", "0x") );
});
var specularMaterial = Materials.addColor( params, 'specular' ).name('Specular').listen();
specularMaterial.onChange(function(value) {
    eval(params.material + "Material").specular.setHex( value.replace("#", "0x") );
});

var shine = Materials.add(params, 'shininess', 0, 1000).listen();
shine.onChange(function(value) {
   eval(params.material + "Material").shininess = value ;
});

// choose index of the material
var material = Materials.add( params, 'material', [ "box", "robot" , "floor"] ).name("Material of").listen();
material.onChange(function(value) {
    // extract properties of material into current state of parameters of GUI
    params.diffuse = eval(params.material + "Material").color.getHexString();
    params.ambient = eval(params.material + "Material").emissive.getHexString();
    params.specular = eval(params.material + "Material").specular.getHexString();
    diffuseMaterial.setValue("#" + eval(params.material + "Material").color.getHexString());
    ambientMaterial.setValue("#" + eval(params.material + "Material").emissive.getHexString());
    specularMaterial.setValue("#" + eval(params.material + "Material").specular.getHexString());
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
});

// on/off the light source
var guiOn = Lighting.add(params, 'on', true).listen();
guiOn.onChange(function(value) {
    var light = eval("spotLight" + params.light);
    var spot = eval("spot" + params.light);
    if(value) {
        scene.add(light);
        scene.add(spot);
    } else {
        scene.remove(light);
        scene.remove(spot);
    }
});

// on/off the texture and bump mapping
var mapOn = Materials.add(params, 'map', true).listen();
mapOn.onChange(function(value) {
  if(value) {
    boxMaterial.map = map;
    boxMaterial.bumpMap = map;
    boxMaterial.needsUpdate = true;
  } else {
    boxMaterial.map = 0;
    boxMaterial.bumpMap = 0;
    boxMaterial.needsUpdate = true;
  }
});

var diffuseColor = Lighting.addColor( params, 'diffuseColor' ).name('Color (Diffuse)').listen();
diffuseColor.onChange(function(value) {
    eval("spotLight" + params.light).color.setHex( value.replace("#", "0x") );
    eval("spot" + params.light).material.color.setHex( value.replace("#", "0x") );
});

var ambientColor = Lighting.addColor( params, 'ambientColor' ).name('Color (Ambient)').listen();
ambientColor.onChange(function(value) {
    eval("ambient" + params.light).color.setHex( value.replace("#", "0x") );
});

// coords of the light sources
var guiX = Lighting.add(params, 'x', -100, 100).listen();
var guiY = Lighting.add(params, 'y', -100, 100).listen();
var guiZ = Lighting.add(params, 'z', -100, 100).listen();
guiX.onChange(function(value) {
    var light = eval("spotLight" + params.light);
    var spot = eval("spot" + params.light);
    spot.position.x = value;
    light.position.x = value;
});
guiY.onChange(function(value) {
    var light = eval("spotLight" + params.light);
    var spot = eval("spot" + params.light);
    spot.position.y = value;
    light.position.y = value;
});
guiZ.onChange(function(value) {
    var light = eval("spotLight" + params.light);
    var spot = eval("spot" + params.light);
    spot.position.z = value;
    light.position.z = value;
});

// choose index of the light source
var lightNumber = Lighting.add( params, 'light', [ "1", "2", "3" ] ).name('Light #').listen();
lightNumber.onChange(function(value) 
{   
    var light = eval("spotLight" + value);
    var spot = eval("spot" + value);
    params.diffuseColor = spot.material.color.getHexString();
    params.x = spot.position.x;
    params.y = spot.position.y;
    params.z = spot.position.z;
    diffuseColor.setValue("#" + spot.material.color.getHexString());
    ambientColor.setValue("#" + eval("ambient" + value).color.getHexString());
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
});

// robot parts conformation
var armPosition = gui.addFolder("Robot configuration");
armPosition.add(params, 'B', -Math.PI/2., Math.PI/2., 0.1);
armPosition.add(params, 'C', -Math.PI/2., Math.PI/24., 0.1);
armPosition.add(params, 'Elong', 2, 20, 0.1);
armPosition.add(params, 'E', -Math.PI/2., Math.PI/2., 0.1);
armPosition.add(params, 'Fingers', -Math.PI/2., -Math.PI/3., 0.1).onChange(function(value) {
    var originL = new THREE.Vector3(FLtip.matrixWorld.elements[12],
                                    FLtip.matrixWorld.elements[13],
                                    FLtip.matrixWorld.elements[14]);
    var originR = new THREE.Vector3(FRtip.matrixWorld.elements[12],
                                    FRtip.matrixWorld.elements[13],
                                    FRtip.matrixWorld.elements[14]);
    var direction = originR.clone().sub(originL);
    raycaster.set( originR, direction );
	Box.geometry.computeFaceNormals();
    if(raycaster.intersectObject(Box).length) {
        picked = true;
        if(touchAngle > params.Fingers)
            touchAngle = params.Fingers;
        FLpivot.rotation.z = touchAngle;
        FRpivot.rotation.z = -touchAngle;
        if(FLtip.children.indexOf(Box) < 0)
        	THREE.SceneUtils.attach(Box, scene, FLtip);
    } else {
        if(picked) {
	        dropped = true;
            picked = false;
        }
        touchAngle = params.Fingers;
        FLpivot.rotation.z = params.Fingers;
        FRpivot.rotation.z = -params.Fingers;
        if(FLtip.children.indexOf(Box) >= 0)
            THREE.SceneUtils.detach(Box, FLtip, scene);
    }
    
});

// call predefined functions
var map = new THREE.ImageUtils.loadTexture(imgData);
init();
lighting();
placeObjects();
animate();


function placeObjects() {
    robotMaterial = new THREE.MeshPhongMaterial( {color: 0xffff00, specular: 0x007799, shininess: 30, shading: THREE.SmoothShading, emissive: 0x070707, side: THREE.DoubleSide} );
    boxMaterial = new THREE.MeshPhongMaterial( {color: 0x00aaff, specular: 0x007799, shininess: 30, shading: THREE.SmoothShading, emissive: 0x070707, side: THREE.DoubleSide, map: map, bumpMap: map} );
    var geometry = new THREE.CylinderGeometry( 10, 10, 5, 32 );
    var A = new THREE.Mesh( geometry, robotMaterial );

    geometry = new THREE.CylinderGeometry( 5, 5, 10, 32 );
    B = new THREE.Mesh( geometry, robotMaterial );
    B.position.y = 5;

    C = new THREE.Mesh( geometry, robotMaterial );
    C.position.y = 10;
    C.rotation.x = Math.PI/2.;

    geometry = new THREE.CylinderGeometry( 3, 3, 20, 32 );
    D = new THREE.Mesh( geometry, robotMaterial );
    D.rotation.z = Math.PI/2.;
    D.position.x = -15;

    geometry = new THREE.CylinderGeometry( 2, 2, 20, 32 );
    E = new THREE.Mesh( geometry, robotMaterial );
    E.position.y = 20;

    geometry = new THREE.CylinderGeometry( 2, 2, 20, 32 );
    F = new THREE.Mesh( geometry, robotMaterial );
    F.rotation.z = Math.PI/2.;
    F.position.y = 10;
    
    //joint of the fingers
    FLpivot = new THREE.Object3D();
    FLpivot.position.y = -10;
    FLpivot.rotation.z = params.Fingers;
    FRpivot = new THREE.Object3D();
    FRpivot.position.y = 10;
    FRpivot.rotation.z = -params.Fingers;
    F.add( FLpivot );
    F.add( FRpivot );

    geometry = new THREE.CylinderGeometry( 1, 1, 20, 32 );
    FL = new THREE.Mesh( geometry, robotMaterial );
    FL.position.y = 10;

    geometry = new THREE.CylinderGeometry( 1, 1, 20, 32 );
    FR = new THREE.Mesh( geometry, robotMaterial );
    FR.position.y = -10;

    // tips of the fingers
    FLtip = new THREE.Object3D();
    FLtip.position.y = 10;
    FLtip.position.x = 1;
    FL.add( FLtip );

    FRtip = new THREE.Object3D();
    FRtip.position.y = -10;
    FRtip.position.x = -1;
    FR.add( FRtip );

    // this is the core of collision detector
    raycaster = new THREE.Raycaster();

    FLpivot.add( FL );
    FRpivot.add( FR );
    E.add( F );
    D.add( E );
    C.add( D );
    B.add( C );
    A.add( B );
    A.position.x = 30;
    // shadows are on here, but off in renderer now
    A.castShadow = true;
    A.receiveShadow = true;
    B.castShadow = true;
    C.castShadow = true;
    D.castShadow = true;
    E.castShadow = true;
    F.castShadow = true;
    FL.castShadow = true;
    FR.castShadow = true;
    scene.add( A );
    
    geometry = new THREE.BoxGeometry( 15, 15, 15, 32 );
    Box = new THREE.Mesh( geometry, boxMaterial );
    Box.position.x = -30;
    Box.position.y = 5;
    Box.geometry.mergeVertices();
    Box.castShadow = true;
    Box.receiveShadow = true;
    scene.add( Box );

}

function lighting() {
    // it should be a single ambient light but as mentor wish
    ambient1 = new THREE.AmbientLight( 0x101010 );
    scene.add( ambient1 );
    ambient2 = new THREE.AmbientLight( 0x101010 );
    scene.add( ambient2 );
    ambient3 = new THREE.AmbientLight( 0x101010 );
    scene.add( ambient3 );
    
    spotLight1 = new THREE.SpotLight( 0xff0000, 1.0 );
    spotLight1.position.set( 10, 35, 75 );
    spotLight1.castShadow = true;
    spotLight1.castShadow = true;
    spotLight1.shadowCameraNear = 2;
    spotLight1.shadowCameraFar = camera.far;
    spotLight1.shadowCameraFov = 90;
    spotLight1.shadowBias = -0.00022;
    spotLight1.shadowMapWidth = 4096;
    spotLight1.shadowMapHeight = 4096;
    scene.add( spotLight1 );

  	spot1 = new THREE.Mesh( new THREE.OctahedronGeometry(1, 2), new THREE.MeshBasicMaterial( {color: spotLight1.color} ) );
  	spot1.position.copy(spotLight1.position);
  	scene.add(spot1);

    spotLight2 = new THREE.SpotLight( 0xffff00, 1.0 );
    spotLight2.position.set( 10, 20, -15 );
    spotLight2.castShadow = true;
    spotLight2.castShadow = true;
    spotLight2.shadowCameraNear = 2;
    spotLight2.shadowCameraFar = camera.far;
    spotLight2.shadowCameraFov = 90;
    spotLight2.shadowBias = -0.00022;
    spotLight2.shadowMapWidth = 4096;
    spotLight2.shadowMapHeight = 4096;
    scene.add( spotLight2 );

  	spot2 = new THREE.Mesh( new THREE.OctahedronGeometry(1, 2), new THREE.MeshBasicMaterial( {color: spotLight2.color} ) );
  	spot2.position.copy(spotLight2.position);
  	scene.add(spot2);

    spotLight3 = new THREE.SpotLight( 0xffffff, 1.0 );
    spotLight3.position.set( -50, 50, -50 );
    spotLight3.castShadow = true;
    spotLight3.castShadow = true;
    spotLight3.shadowCameraNear = 2;
    spotLight3.shadowCameraFar = camera.far;
    spotLight3.shadowCameraFov = 90;
    spotLight3.shadowBias = -0.00022;
    spotLight3.shadowMapWidth = 4096;
    spotLight3.shadowMapHeight = 4096;
    scene.add( spotLight3 );

  	spot3 = new THREE.Mesh( new THREE.OctahedronGeometry(1, 2), new THREE.MeshBasicMaterial( {color: spotLight3.color} ) );
  	spot3.position.copy(spotLight3.position);
  	scene.add(spot3);

}

function init() {
    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 250 );
    camera.position.z = 90;
    camera.position.y = 50;
    
    scene = new THREE.Scene();

    floorMaterial = new THREE.MeshPhongMaterial( {color: 0xf0f0f0, shading: THREE.SmoothShading, emissive: 0x072534, side: THREE.DoubleSide} );
    var Floor = new THREE.Mesh( new THREE.BoxGeometry( 140, 1, 140 ), floorMaterial );
    Floor.position.y = -3;
    Floor.receiveShadow = true;
    scene.add( Floor );

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor( 0xeeeeee, 0 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    //renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.cullFace = THREE.CullFaceBack;

    trackballControls = new THREE.TrackballControls(camera, container);
    trackballControls.rotateSpeed = 5.0;
    trackballControls.zoomSpeed = 5.0;
    trackballControls.panSpeed = 5.0;
    trackballControls.staticMoving = false;

    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth-16, window.innerHeight-20 );
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    B.rotation.y = params.B;
    C.rotation.y = params.C;
    E.position.y = params.Elong;
    E.rotation.y = params.E;
    // this is emulation of dropping
    if(dropped) {
        if(Math.min.apply(Math, Box.geometry.vertices.map(function(val){return val.clone().applyMatrix4(Box.matrixWorld).y})) > -2.5) {
        	Box.position.y -= 9.88/Box.position.y;
            if(Box.rotation.x  > 0.)
                Box.rotation.x -= 0.01;
            else
                Box.rotation.x += 0.01;
        } else {
            var z = Box.rotation.z;
            if(z < -Math.PI/4.)
                Box.rotation.z -= 0.01;
            else
                Box.rotation.z += 0.01;
            if(Box.rotation.z > 0. || Box.rotation.z < -Math.PI/2.) {
                Box.rotation.z = 0.;
                dropped = false;
            }
        }
    }
    trackballControls.update();
    camera.lookAt( scene.position );
    renderer.render( scene, camera );
}

