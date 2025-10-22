import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { CONFIG } from './config.js';

// Custom plugin để xử lý KHR_materials_pbrSpecularGlossiness
export class KHRMaterialsPbrSpecularGlossiness {
  constructor(parser) {
    this.parser = parser;
    this.name = 'KHR_materials_pbrSpecularGlossiness';
  }

  getMaterialType() {
    return THREE.MeshStandardMaterial;
  }

  extendMaterialParams(materialIndex, materialParams) {
    const parser = this.parser;
    const materialDef = parser.json.materials[materialIndex];
    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }
    const extension = materialDef.extensions[this.name];
    let customColor = 0x3a3a4a;
    const matName = materialDef.name.toLowerCase();
    switch (matName) {
      case 'insulation':
        customColor = 0x4a4a6a;
        break;
      case 'cement':
        customColor = 0x3a3a4e;
        break;
      case 'chairmat':
        customColor = 0x4a4a5a;
        break;
      case 'lightandcablewhiteplastic':
        customColor = 0x5a5a7a;
        break;
      case 'thedooriron':
        customColor = 0x4a4a4a;
        break;
      case 'thedoorwood':
        customColor = 0x5a4a3a;
        break;
      case 'thedoorbolts':
        customColor = 0x3a3a3a;
        break;
      case 'thedoorframebits':
        customColor = 0x4a4a4a;
        break;
      case 'thedoordoorbits':
        customColor = 0x4a4a4a;
        break;
      default:
        customColor = 0x3a4a4a;
    }
    materialParams.color = new THREE.Color(customColor);
    materialParams.roughness = 0.95;
    materialParams.metalness = 0.05;

    if (extension.diffuseTexture) {
      return parser.loadTexture(extension.diffuseTexture.index).then((texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 30;
        materialParams.map = texture;
      });
    } else if (extension.specularGlossinessTexture) {
      return parser.loadTexture(extension.specularGlossinessTexture.index).then((texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 10;
        materialParams.map = texture;
      });
    }
    return Promise.resolve();
  }
}

// Khởi tạo scene
export const initScene = () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND_COLOR);
  scene.fog = new THREE.FogExp2(CONFIG.SCENE.FOG_COLOR, CONFIG.SCENE.FOG_DENSITY);
  return scene;
};

// Thiết lập ánh sáng
export const setupLighting = (scene, lightsRef) => {
  const ambientLight = new THREE.AmbientLight(0x505050, 0.8);
  scene.add(ambientLight);

  const ceilingSpotlight = new THREE.SpotLight(
    0xffcc88,
    CONFIG.ANIMATION.LIGHT_INTENSITY.SPOT_BASE,
    9,
    Math.PI / 2.5,
    0.6,
    1.2
  );
  ceilingSpotlight.position.set(0, 2.8, 0);
  ceilingSpotlight.target.position.set(0, 0, 0);
  scene.add(ceilingSpotlight);
  scene.add(ceilingSpotlight.target);
  lightsRef.current.ceiling = ceilingSpotlight;

  const ceilingPointLight = new THREE.PointLight(0xffcc88, CONFIG.ANIMATION.LIGHT_INTENSITY.POINT_BASE, 10, 1.4);
  ceilingPointLight.position.set(0, 2.6, 0);
  scene.add(ceilingPointLight);
  lightsRef.current.point = ceilingPointLight;

  const hemisphereLight = new THREE.HemisphereLight(0x707070, 0x404040, 1.5);
  hemisphereLight.position.set(0, 3, 0);
  scene.add(hemisphereLight);

  const dirLights = [
    { pos: [5, 2, 0], target: [0, 1.5, 0] },
    { pos: [-5, 2, 0], target: [0, 1.5, 0] },
    { pos: [0, 2, 5], target: [0, 1.5, 0] },
    { pos: [0, 2, -5], target: [0, 1.5, 0] },
  ];
  dirLights.forEach(({ pos, target }) => {
    const light = new THREE.DirectionalLight(0x3a3a4a, 0.4);
    light.position.set(...pos);
    light.target.position.set(...target);
    scene.add(light);
    scene.add(light.target);
  });

  const cornerLights = [
    [-5, 3, -5],
    [5, 3, -5],
    [-5, 3, 5],
    [5, 3, 5],
  ];
  cornerLights.forEach(([x, y, z]) => {
    const light = new THREE.DirectionalLight(0x3a3a4a, 0.3);
    light.position.set(x, y, z);
    light.target.position.set(0, 1, 0);
    scene.add(light);
    scene.add(light.target);
  });

  const topFillLight = new THREE.DirectionalLight(0x3a3a4a, 0.3);
  topFillLight.position.set(0, 5, 0);
  scene.add(topFillLight);

  const tvLight = new THREE.SpotLight(0x7a8a9a, 0.8, 3, Math.PI / 4, 0.5, 2);
  tvLight.position.set(-0.11, 0.5, 2.6);
  tvLight.target.position.set(-0.11, 0.5, 2.0);
  scene.add(tvLight);
  scene.add(tvLight.target);
};

// Khởi tạo camera
export const initCamera = () => {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA.FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.CAMERA.NEAR,
    CONFIG.CAMERA.FAR
  );
  camera.position.set(...CONFIG.CAMERA.POSITION);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = CONFIG.CAMERA.ROTATION_Y;
  return camera;
};

// Khởi tạo renderer
export const initRenderer = (container) => {
  const renderer = new THREE.WebGLRenderer({
    antialias: CONFIG.RENDERER.ANTIALIAS,
    powerPreference: CONFIG.RENDERER.POWER_PREFERENCE,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.RENDERER.TONE_MAPPING_EXPOSURE;
  container.appendChild(renderer.domElement);
  return renderer;
};

// Hiệu ứng fade to black và chuyển sang Scene.jsx (sử dụng Timeline để tự động)
export const handleFadeToScene = (setShowScene, setFadeOpacity, fadeTimelineRef) => {
  if (fadeTimelineRef.current) {
    fadeTimelineRef.current.kill();
  }
  fadeTimelineRef.current = gsap.timeline({
    onComplete: () => {
      console.log('✅ Chuyển đổi sang Scene.jsx hoàn tất');
    }
  });

  // Bước 1: Fade to black (opacity từ 0 -> 1) - Tăng thời gian để mượt hơn
  fadeTimelineRef.current.to({}, {
    duration: CONFIG.FADE.DURATION * 1.5, // Tăng 50% thời gian fade to black để mượt
    onUpdate: () => {
      const progress = fadeTimelineRef.current.progress();
      setFadeOpacity(progress); // Tăng dần từ 0 đến 1
    }
  });

  // Bước 2: Hiển thị Scene.jsx ngay khi đen hoàn toàn
  fadeTimelineRef.current.call(() => {
    setShowScene(true);
  }, null, CONFIG.FADE.DURATION * 1.5);

  // Bước 3: Fade out overlay để lộ Scene.jsx (opacity từ 1 -> 0) - Giữ nguyên thời gian
  fadeTimelineRef.current.to({}, {
    duration: CONFIG.FADE.DURATION,
    onUpdate: () => {
      const totalDuration = CONFIG.FADE.DURATION * 2.5; // Tổng thời gian đến đây
      const progress = fadeTimelineRef.current.progress();
      const fadeOutStart = (CONFIG.FADE.DURATION * 1.5) / totalDuration;
      if (progress > fadeOutStart) {
        const fadeOutProgress = (progress - fadeOutStart) / (1 - fadeOutStart);
        setFadeOpacity(1 - fadeOutProgress); // Giảm dần từ 1 đến 0
      }
    }
  });
};

// Animation camera với GSAP - Zoom vào TV (tự động gọi handleFadeToScene khi kết thúc)
export const animateCameraToTV = (camera, isAnimatingRef, originalCameraStateRef, currentTweenRef, handleFadeToScene) => {
  if (isAnimatingRef.current) return;
  isAnimatingRef.current = true;
  originalCameraStateRef.current = {
    position: camera.position.clone(),
    rotation: { x: camera.rotation.x, y: camera.rotation.y },
  };
  const startRotY = camera.rotation.y;
  const spiralRotations = CONFIG.CAMERA_ANIMATION.SPIRAL_ROTATIONS * Math.PI * 2;
  const animationObject = {
    progress: 0,
    spiralRotation: 0,
    shake: 0,
  };

  if (currentTweenRef.current) {
    currentTweenRef.current.kill();
  }
  currentTweenRef.current = gsap.to(animationObject, {
    progress: 1,
    spiralRotation: spiralRotations,
    shake: CONFIG.CAMERA_ANIMATION.SHAKE_INTENSITY,
    duration: CONFIG.CAMERA_ANIMATION.DURATION,
    ease: CONFIG.CAMERA_ANIMATION.EASE,
    onUpdate: () => {
      // Interpolate position
      const targetPos = new THREE.Vector3(...CONFIG.CAMERA_ANIMATION.TV_POSITION);
      camera.position.lerpVectors(
        originalCameraStateRef.current.position,
        targetPos,
        animationObject.progress
      );

      // Thêm rung nhẹ khi gần đích
      if (animationObject.progress > 0.7) {
        const shakeOffset = new THREE.Vector3(
          (Math.random() - 0.5) * animationObject.shake,
          (Math.random() - 0.5) * animationObject.shake,
          (Math.random() - 0.5) * animationObject.shake
        );
        camera.position.add(shakeOffset);
      }

      // Xoay camera theo chiều kim đồng hồ từ đầu
      camera.rotation.y = startRotY + animationObject.spiralRotation;
      camera.rotation.x = originalCameraStateRef.current.rotation.x * (1 - animationObject.progress) + CONFIG.CAMERA_ANIMATION.TV_ROTATION.x * animationObject.progress;
    },
    onComplete: () => {
      isAnimatingRef.current = false;
      // Thêm delay ngắn để giữ hình ảnh TV một chút trước khi fade, tạo cảm giác mượt mà hơn
      gsap.delayedCall(0.8, () => { // Delay 0.8 giây sau khi animation kết thúc
        handleFadeToScene();
        console.log('🎥 Animation camera hoàn tất, bắt đầu chuyển đổi sau delay...');
      });
    },
  });
};

// Animation camera với GSAP - Reset về vị trí ban đầu
export const resetCamera = (camera, originalCameraStateRef, isAnimatingRef, currentTweenRef, setShowScene, setFadeOpacity) => {
  if (!originalCameraStateRef.current || isAnimatingRef.current) return;
  isAnimatingRef.current = true;

  // Fade to black trước khi reset
  const resetTimeline = gsap.timeline({
    onComplete: () => {
      setShowScene(false); // Ẩn Scene.jsx
      const startPos = camera.position.clone();
      const startRotX = camera.rotation.x;
      const startRotY = camera.rotation.y;
      const spiralRotations = CONFIG.CAMERA_ANIMATION.SPIRAL_ROTATIONS * Math.PI * 2;
      const animationObject = { progress: 0, spiralRotation: 0 };

      if (currentTweenRef.current) {
        currentTweenRef.current.kill();
      }
      currentTweenRef.current = gsap.to(animationObject, {
        progress: 1,
        spiralRotation: spiralRotations,
        duration: CONFIG.CAMERA_ANIMATION.DURATION,
        ease: CONFIG.CAMERA_ANIMATION.EASE,
        onUpdate: () => {
          camera.position.lerpVectors(
            startPos,
            originalCameraStateRef.current.position,
            animationObject.progress
          );
          camera.rotation.y = startRotY - animationObject.spiralRotation + (originalCameraStateRef.current.rotation.y - startRotY) * animationObject.progress;
          camera.rotation.x = startRotX + (originalCameraStateRef.current.rotation.x - startRotX) * animationObject.progress;
        },
        onComplete: () => {
          isAnimatingRef.current = false;
          originalCameraStateRef.current = null;
          // Fade in cảnh 3D
          gsap.to({}, {
            duration: CONFIG.FADE.DURATION,
            onUpdate: () => {
              const progress = this.progress();
              setFadeOpacity(1 - progress); // Giảm từ 1 về 0
            },
          });
        },
      });
    },
  });

  // Fade to black
  resetTimeline.to({}, {
    duration: CONFIG.FADE.DURATION * 1.5, // Tăng thời gian fade to black để mượt hơn
    onUpdate: () => {
      const progress = resetTimeline.progress();
      setFadeOpacity(progress); // Tăng từ 0 đến 1
    },
  });
};

// Thiết lập click handler
export const setupClickHandler = (camera, scene, renderer, isAnimatingRef, mouseRef, raycasterRef, originalCameraStateRef, animateCameraToTV, resetCamera) => {
  const onClick = (event) => {
    if (isAnimatingRef.current) return; // Ngăn click khi đang animate
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.userData.clickable && clickedObject.userData.type === 'tv_screen') {
        console.log('🖥️ Phát hiện click trên TV screen');
        if (originalCameraStateRef.current) {
          resetCamera(camera, originalCameraStateRef, isAnimatingRef, null, null, null);
        } else {
          animateCameraToTV(camera, isAnimatingRef, originalCameraStateRef, null, null);
        }
      }
    }
  };
  renderer.domElement.addEventListener('click', onClick);
  return () => {
    renderer.domElement.removeEventListener('click', onClick);
  };
};

// Thiết lập điều khiển chuột và touch
export const setupControls = (camera, renderer, isAnimatingRef) => {
  let isDragging = false;
  let lastPosition = { x: 0, y: 0 };

  const onMouseDown = (event) => {
    if (isAnimatingRef.current) return;
    isDragging = true;
    lastPosition = { x: event.clientX, y: event.clientY };
  };

  const onMouseMove = (event) => {
    if (isDragging && !isAnimatingRef.current) {
      const deltaX = event.clientX - lastPosition.x;
      const deltaY = event.clientY - lastPosition.y;
      lastPosition = { x: event.clientX, y: event.clientY };
      camera.rotation.y -= deltaX * CONFIG.MOUSE_SENSITIVITY;
      camera.rotation.x -= deltaY * CONFIG.MOUSE_SENSITIVITY;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  };

  const onMouseUp = () => {
    isDragging = false;
  };

  const onTouchStart = (event) => {
    if (isAnimatingRef.current || event.touches.length !== 1) return;
    isDragging = true;
    lastPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchMove = (event) => {
    if (isDragging && !isAnimatingRef.current && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastPosition.x;
      const deltaY = event.touches[0].clientY - lastPosition.y;
      lastPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      camera.rotation.y -= deltaX * CONFIG.TOUCH_SENSITIVITY;
      camera.rotation.x -= deltaY * CONFIG.TOUCH_SENSITIVITY;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  };

  const onTouchEnd = () => {
    isDragging = false;
  };

  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mouseleave', onMouseUp);
  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
  renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
  renderer.domElement.addEventListener('touchend', onTouchEnd);
  renderer.domElement.addEventListener('touchcancel', onTouchEnd);

  return () => {
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    renderer.domElement.removeEventListener('mouseup', onMouseUp);
    renderer.domElement.removeEventListener('mouseleave', onMouseUp);
    renderer.domElement.removeEventListener('touchstart', onTouchStart);
    renderer.domElement.removeEventListener('touchmove', onTouchMove);
    renderer.domElement.removeEventListener('touchend', onTouchEnd);
    renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
  };
};

// Tải và xử lý model
export const loadModel = (scene, setLoadingProgress, setIsLoading) => {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, loaded, total) => {
    const progress = (loaded / total) * 100;
    setLoadingProgress(progress);
  };
  manager.onLoad = () => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };
  const loader = new GLTFLoader(manager);
  loader.register((parser) => new KHRMaterialsPbrSpecularGlossiness(parser));
  loader.load(
    '/models/the_room.glb',
    (gltf) => {
      const roomModel = gltf.scene;
      roomModel.scale.set(CONFIG.MODEL_SCALE, CONFIG.MODEL_SCALE, CONFIG.MODEL_SCALE);
      roomModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.colorWrite = true;
          child.material.needsUpdate = true;
          if (child.material.map) {
            child.material.map.encoding = THREE.sRGBEncoding;
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            child.material.map.magFilter = THREE.LinearFilter;
            child.material.map.anisotropy = 30;
            const blendColor = new THREE.Color(0.65, 0.65, 0.68);
            if (!child.material.color) child.material.color = new THREE.Color();
            child.material.color.lerp(blendColor, 0.35);
          } else {
            let defaultColor = 0x3a3a4a;
            const matName = child.material.name.toLowerCase();
            switch (matName) {
              case 'insulation':
                defaultColor = 0x4a4a6a;
                break;
              case 'cement':
                defaultColor = 0x3a3a4e;
                break;
              case 'chairmat':
                defaultColor = 0x4a4a5a;
                break;
              case 'lightandcablewhiteplastic':
                defaultColor = 0x5a5a7a;
                break;
              case 'thedooriron':
                defaultColor = 0x4a4a4a;
                break;
              case 'thedoorwood':
                defaultColor = 0x5a4a3a;
                break;
              case 'thedoorbolts':
                defaultColor = 0x3a3a3a;
                break;
              case 'thedoorframebits':
                defaultColor = 0x4a4a4a;
                break;
              case 'thedoordoorbits':
                defaultColor = 0x4a4a4a;
                break;
              default:
                defaultColor = 0x3a4a4a;
            }
            child.material.color = new THREE.Color(defaultColor);
          }
          if (child.material.normalMap) {
            child.material.normalMap.encoding = THREE.LinearEncoding;
            child.material.normalScale = new THREE.Vector2(0.8, 0.8);
          }
          if (child.material.roughnessMap) {
            child.material.roughnessMap.encoding = THREE.LinearEncoding;
          }
          if (child.material.metalnessMap) {
            child.material.metalnessMap.encoding = THREE.LinearEncoding;
          }
          child.material.roughness = 0.95;
          child.material.metalness = 0.05;
          child.material.needsUpdate = true;
        }
      });
      scene.add(roomModel);
      setLoadingProgress(100);
    },
    undefined,
    (error) => {
      console.error('❌ Error loading model:', error);
      setIsLoading(false);
    }
  );
};

// Vòng lặp animation với hiệu ứng nhấp nháy
export const animate = (camera, renderer, scene, lightsRef, flickerStateRef) => {
  const deltaTime = CONFIG.ANIMATION.DELTA_TIME;

  const handleOnPhase = (state) => {
    const flicker = Math.sin(state.timer * CONFIG.ANIMATION.PHASES.ON.FLICKER_SPEED) * CONFIG.ANIMATION.PHASES.ON.FLICKER_AMPLITUDE;
    lightsRef.current.ceiling.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.SPOT_BASE * (1 + flicker);
    lightsRef.current.point.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.POINT_BASE * (1 + flicker);
    if (state.timer >= state.nextPhaseTime) {
      state.phase = 'flicker';
      state.timer = 0;
      state.flickerCount = 0;
      state.maxFlickers = CONFIG.ANIMATION.PHASES.FLICKER.MAX_FLICKERS();
    }
  };

  const handleFlickerPhase = (state) => {
    const flickerValue = Math.sin(state.timer * CONFIG.ANIMATION.PHASES.FLICKER.SPEED * Math.PI * 2);
    const intensityFactor = flickerValue > 0 ? 0.8 + Math.random() * 0.2 : 0.1 + Math.random() * 0.1;
    lightsRef.current.ceiling.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.SPOT_BASE * intensityFactor;
    lightsRef.current.point.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.POINT_BASE * intensityFactor;
    if (state.timer > (1 / CONFIG.ANIMATION.PHASES.FLICKER.SPEED) * state.flickerCount) {
      state.flickerCount++;
    }
    if (state.flickerCount >= state.maxFlickers) {
      state.phase = 'off';
      state.timer = 0;
    }
  };

  const handleOffPhase = (state) => {
    lightsRef.current.ceiling.intensity = 0;
    lightsRef.current.point.intensity = 0;
    if (state.timer >= CONFIG.ANIMATION.PHASES.OFF.DURATION()) {
      state.phase = 'flicker_on';
      state.timer = 0;
      state.flickerCount = 0;
      state.maxFlickers = CONFIG.ANIMATION.PHASES.FLICKER_ON.MAX_FLICKERS();
    }
  };

  const handleFlickerOnPhase = (state) => {
    const flickerValue = Math.sin(state.timer * CONFIG.ANIMATION.PHASES.FLICKER_ON.SPEED * Math.PI * 2);
    const intensityFactor = flickerValue > 0 ? 0.5 + Math.random() * 0.3 : 0.05 + Math.random() * 0.1;
    lightsRef.current.ceiling.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.SPOT_BASE * intensityFactor;
    lightsRef.current.point.intensity = CONFIG.ANIMATION.LIGHT_INTENSITY.POINT_BASE * intensityFactor;
    if (state.timer > (1 / CONFIG.ANIMATION.PHASES.FLICKER_ON.SPEED) * state.flickerCount) {
      state.flickerCount++;
    }
    if (state.flickerCount >= state.maxFlickers) {
      state.phase = 'on';
      state.timer = 0;
      state.nextPhaseTime = CONFIG.ANIMATION.PHASES.ON.DURATION();
    }
  };

  function loop() {
    requestAnimationFrame(loop);
    if (lightsRef.current.ceiling && lightsRef.current.point) {
      const state = flickerStateRef.current;
      state.timer += deltaTime;
      switch (state.phase) {
        case 'on':
          handleOnPhase(state);
          break;
        case 'flicker':
          handleFlickerPhase(state);
          break;
        case 'off':
          handleOffPhase(state);
          break;
        case 'flicker_on':
          handleFlickerOnPhase(state);
          break;
        default:
          break;
      }
    }
    renderer.render(scene, camera);
  }
  loop();
};

// Xử lý resize cửa sổ
export const setupResizeHandler = (camera, renderer) => {
  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onWindowResize);
  return () => window.removeEventListener('resize', onWindowResize);
};