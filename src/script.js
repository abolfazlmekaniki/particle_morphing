import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import gsap from 'gsap'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    if(particles){
        particles.material.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio);
    }
    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 8 * 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

debugObject.clearColor = '#160920'
gui.addColor(debugObject, 'clearColor').onChange(() => { renderer.setClearColor(debugObject.clearColor) })
renderer.setClearColor(debugObject.clearColor)

/**
 * Particles
 */


let particles = null;

gltfLoader.load('./models.glb',(gltf)=>{

    particles = {}
    particles.index=0;

    const positions = gltf.scene.children.map((child)=>{
            return child.geometry.attributes.position;
    })

    particles.maxCount = 0;

    for (const position of positions) {
        if(position.count>particles.maxCount){
            particles.maxCount = position.count;
        }
    }

    particles.positions = [];

    for (const position of positions) {

        const originArray = position.array;
        const newAarray = new Float32Array(particles.maxCount*3);

        for(let i=0;i<particles.maxCount*3;i+=3){

            if(i<originArray.length){
                newAarray[i] = originArray[i];
                newAarray[i+1] = originArray[i+1];
                newAarray[i+2] = originArray[i+2];
            }
            else{
                const randomindex = Math.floor(particles.maxCount*Math.random())*3;
                newAarray[i] = originArray[randomindex]
                newAarray[i+1] = originArray[randomindex+1];
                newAarray[i+2] = originArray[randomindex+2];
            }
        }

        particles.positions.push(new THREE.Float32BufferAttribute(newAarray,3));
    }
    // Geometry

    const sizesArray = new Float32Array(particles.maxCount)

    for(let i = 0; i < particles.maxCount; i++){
        sizesArray[i] = Math.random()
    }
	   


    particles.geometry = new THREE.BufferGeometry();
    particles.geometry.setAttribute("position",particles.positions[1]);
    particles.geometry.setAttribute("aPositionTarget",particles.positions[3]);
    particles.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1))
    // particles.geometry.setIndex(null);
    // Material

    particles.colorA = "#ff7300";
    particles.colorB= "0091ff";

    particles.material = new THREE.ShaderMaterial({
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        uniforms:
        {
            uSize: new THREE.Uniform(0.2),
            uProgress : new THREE.Uniform(0),
            uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
            uColorA:new THREE.Uniform(new THREE.Color(particles.colorA)),
            uColorB:new THREE.Uniform(new THREE.Color(particles.colorB)),
        },
        blending:THREE.AdditiveBlending,
        depthWrite:false,
    })
    
    // Points
    particles.points = new THREE.Points(particles.geometry, particles.material);
    particles.points.frustumCulled=false;
    scene.add(particles.points);

    particles.morph=(index)=>{
        particles.geometry.attributes.position = particles.positions[particles.index]
        particles.geometry.attributes.aPositionTarget = particles.positions[index]


        gsap.fromTo(
            particles.material.uniforms.uProgress,
            {value:0},
            {value:1,duration:3,ease:"linear"}
        )

        particles.index = index;
    }

    particles.morph0 = () => { particles.morph(0) }
        particles.morph1 = () => { particles.morph(1) }
        particles.morph2 = () => { particles.morph(2) }
        particles.morph3 = () => { particles.morph(3) }

        gui.addColor(particles, 'colorA').onChange(() => { particles.material.uniforms.uColorA.value.set(particles.colorA) })
        gui.addColor(particles, 'colorB').onChange(() => { particles.material.uniforms.uColorB.value.set(particles.colorB) })

        gui.add(particles, 'morph0')
        gui.add(particles, 'morph1')
        gui.add(particles, 'morph2')
        gui.add(particles, 'morph3')
})


/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Render normal scene
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()