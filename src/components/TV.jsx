import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';

// ⭐ HẰNG SỐ CẤU HÌNH
const CONFIG = {
  MATERIAL: {
    ROUGHNESS: 0.3,
    METALNESS: 0.5,
  },
  ANIMATION: {
    CAMERA: {
      ROTATION_DURATION: 2000,
      MOVE_DURATION: 2000,
      TARGET_DISTANCE: 0.1,
      ROTATION_SPEED: Math.PI * 2,
    },
  },
  AUDIO: {
    // ⚙️ CẤU HÌNH AUDIO - Thay đổi đường dẫn này
    PATH: '/audio/background.mp3', 
    VOLUME: 0.5,
    FADE_DURATION: 1000, // Thời gian fade in/out (ms)
    USE_3D_AUDIO: false, // Set true để dùng âm thanh 3D (PositionalAudio)
    REFETCH_DISTANCE: 10, // Khoảng cách nghe được âm thanh 3D
  },
};

// Custom plugin để xử lý KHR_materials_pbrSpecularGlossiness
class KHRMaterialsPbrSpecularGlossiness {
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
    console.log('Processing TV material:', materialDef.name, 'Extension data:', {
      diffuseFactor: extension.diffuseFactor,
      specularFactor: extension.specularFactor,
      glossinessFactor: extension.glossinessFactor,
      diffuseTextureIndex: extension.diffuseTexture?.index,
      specularGlossinessTextureIndex: extension.specularGlossinessTexture?.index,
    });

    let customColor = 0x3a3a4a;
    const matName = materialDef.name.toLowerCase();
    switch (matName) {
      case 'tv_glass':
        customColor = 0x3a3a4a;
        break;
      case 'tv_shadows':
        customColor = 0x2a2a2a;
        break;
      case 'material':
        customColor = 0x4a4a6a;
        break;
      default:
        customColor = 0x3a4a4a;
    }
    materialParams.color = new THREE.Color(customColor);
    console.log('Applied custom color for TV:', materialDef.name, materialParams.color.getHexString());

    materialParams.roughness = 0.95;
    materialParams.metalness = 0.05;

    if (extension.diffuseTexture) {
      return parser.loadTexture(extension.diffuseTexture.index).then((texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 30;
        materialParams.map = texture;
        console.log('Loaded diffuseTexture for TV:', materialDef.name, 'Texture index:', extension.diffuseTexture.index);
      }).catch((error) => {
        console.error('Error loading diffuseTexture for TV:', materialDef.name, error);
      });
    } else if (extension.specularGlossinessTexture) {
      return parser.loadTexture(extension.specularGlossinessTexture.index).then((texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 10;
        materialParams.map = texture;
        console.log('Loaded specularGlossinessTexture for TV:', materialDef.name, 'Texture index:', extension.specularGlossinessTexture.index);
      }).catch((error) => {
        console.error('Error loading specularGlossinessTexture for TV:', materialDef.name, error);
      });
    }

    return Promise.resolve();
  }
}

function TV({ scene, camera, position = [0, 1.5, 3], scale = 0.02, rotation = [0, 0, 0], onScreenClick }) {
  const tvModelRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameRef = useRef(null);
  const isLoadedRef = useRef(false);
  const tvScreenMeshRef = useRef(null);
  const gltfRef = useRef(null);
  
  // State quản lý animation
  const isTVOnRef = useRef(false);
  const actionsRef = useRef([]);
  
  // ⭐ Audio refs - Cải thiện
  const audioRef = useRef(null);
  const audioListenerRef = useRef(null); // Cho 3D audio
  const isAudioLoadedRef = useRef(false);
  const isAudioAvailableRef = useRef(true); // Track xem audio có khả dụng không
  const isTogglingRef = useRef(false);
  const fadeTimeoutRef = useRef(null);

  // ⭐ AUDIO UTILITY FUNCTIONS (giữ nguyên như mã gốc của bạn)
  
  /**
   * Fade audio volume
   * @param {Audio} audio - Audio element
   * @param {number} targetVolume - Target volume (0-1)
   * @param {number} duration - Fade duration in ms
   */
  const fadeAudio = (audio, targetVolume, duration) => {
    if (!audio) return Promise.resolve();
    
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const volumeDiff = targetVolume - startVolume;
      const steps = 20; // Số bước fade
      const stepDuration = duration / steps;
      const stepVolume = volumeDiff / steps;
      
      let currentStep = 0;
      
      const fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, Math.min(1, startVolume + stepVolume * currentStep));
        
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  };

  /**
   * Kiểm tra xem file audio có tồn tại không
   * @param {string} url - URL của audio file
   * @returns {Promise<boolean>}
   */
  const checkAudioExists = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Unable to check audio file existence:', error);
      return false;
    }
  };

  /**
   * Load audio - Cải thiện với nhiều tùy chọn
   */
  const loadAudio = async () => {
    try {
      // Kiểm tra file có tồn tại không
      const audioExists = await checkAudioExists(CONFIG.AUDIO.PATH);
      
      if (!audioExists) {
        console.warn('⚠️ Audio file not found:', CONFIG.AUDIO.PATH);
        console.warn('   Please ensure the file exists at: /public' + CONFIG.AUDIO.PATH);
        isAudioAvailableRef.current = false;
        return;
      }

      if (CONFIG.AUDIO.USE_3D_AUDIO && scene && camera) {
        // ⭐ Sử dụng 3D Audio (PositionalAudio) từ Three.js
        console.log('🎵 Loading 3D Positional Audio...');
        
        if (!audioListenerRef.current) {
          audioListenerRef.current = new THREE.AudioListener();
          camera.add(audioListenerRef.current);
        }

        const sound = new THREE.PositionalAudio(audioListenerRef.current);
        const audioLoader = new THREE.AudioLoader();
        
        audioLoader.load(
          CONFIG.AUDIO.PATH,
          (buffer) => {
            sound.setBuffer(buffer);
            sound.setRefDistance(CONFIG.AUDIO.REFETCH_DISTANCE);
            sound.setLoop(true);
            sound.setVolume(CONFIG.AUDIO.VOLUME);
            
            // Gắn audio vào TV model
            if (tvModelRef.current) {
              tvModelRef.current.add(sound);
            }
            
            audioRef.current = sound;
            isAudioLoadedRef.current = true;
            isAudioAvailableRef.current = true;
            console.log('✅ 3D Audio loaded successfully');
          },
          undefined,
          (error) => {
            console.error('❌ Error loading 3D audio:', error);
            isAudioAvailableRef.current = false;
          }
        );
      } else {
        // ⭐ Sử dụng HTML5 Audio (2D Audio)
        console.log('🎵 Loading 2D Audio...');
        
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0; // Bắt đầu với volume 0 để fade in
        audio.preload = 'auto';
        
        // Tạo promise để đợi audio load
        const loadPromise = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Audio load timeout'));
          }, 10000); // Timeout sau 10 giây

          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeoutId);
            isAudioLoadedRef.current = true;
            isAudioAvailableRef.current = true;
            console.log('✅ 2D Audio loaded successfully');
            resolve();
          }, { once: true });

          // eslint-disable-next-line no-unused-vars
          audio.addEventListener('error', (e) => {
            clearTimeout(timeoutId);
            const errorMessages = {
              1: 'MEDIA_ERR_ABORTED: The fetching was aborted by the user',
              2: 'MEDIA_ERR_NETWORK: A network error occurred',
              3: 'MEDIA_ERR_DECODE: The audio is corrupted or unsupported format',
              4: 'MEDIA_ERR_SRC_NOT_SUPPORTED: Audio format not supported or file not found'
            };
            
            const errorCode = audio.error?.code || 0;
            const errorMsg = errorMessages[errorCode] || 'Unknown error';
            
            console.error('❌ Audio Error:', {
              code: errorCode,
              message: errorMsg,
              path: CONFIG.AUDIO.PATH
            });
            console.error('   Solutions:');
            console.error('   1. Ensure file exists at /public' + CONFIG.AUDIO.PATH);
            console.error('   2. Check file format (MP3, OGG, WAV supported)');
            console.error('   3. Verify file permissions');
            
            isAudioLoadedRef.current = false;
            isAudioAvailableRef.current = false;
            reject(new Error(errorMsg));
          }, { once: true });
        });

        // Set src sau khi đã setup event listeners
        audio.src = CONFIG.AUDIO.PATH;
        
        try {
          await loadPromise;
          audioRef.current = audio;
        } catch (error) {
          console.error('Failed to load audio:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error in loadAudio:', error);
      isAudioAvailableRef.current = false;
    }
  };

  // Xử lý vật liệu của model
  const processMaterials = (model) => {
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.needsUpdate = true;

        if (child.material.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
        }

        child.material.roughness = child.material.roughness ?? CONFIG.MATERIAL.ROUGHNESS;
        child.material.metalness = child.material.metalness ?? CONFIG.MATERIAL.METALNESS;

        const meshName = child.name.toLowerCase();
        const matName = child.material.name ? child.material.name.toLowerCase() : '';
        
        const isTVGlassMesh = 
          meshName === 'tv_glass' ||
          meshName.includes('glass') ||
          meshName.includes('screen') ||
          matName === 'tv_glass';

        if (isTVGlassMesh) {
          child.userData.clickable = true;
          child.userData.type = 'tv_screen';
          tvScreenMeshRef.current = child;
          
          const worldPosition = new THREE.Vector3();
          child.getWorldPosition(worldPosition);
          
          const meshBox = new THREE.Box3().setFromObject(child);
          const center = new THREE.Vector3();
          meshBox.getCenter(center);
          const size = new THREE.Vector3();
          meshBox.getSize(size);
          
          console.log('🖥️ TV SCREEN MESH FOUND:', {
            meshName: child.name,
            materialName: child.material.name,
            worldPosition: {
              x: worldPosition.x.toFixed(3),
              y: worldPosition.y.toFixed(3),
              z: worldPosition.z.toFixed(3),
            },
            centerPosition: {
              x: center.x.toFixed(3),
              y: center.y.toFixed(3),
              z: center.z.toFixed(3),
            },
            size: {
              width: size.x.toFixed(3),
              height: size.y.toFixed(3),
              depth: size.z.toFixed(3),
            },
          });
        }

        if (meshName === 'remotecontrol_tv_0') {
          child.userData.clickable = true;
          child.userData.type = 'remote';
          console.log('🕹️ Remote mesh marked as clickable:', child.name);
        }

        const meshBox = new THREE.Box3().setFromObject(child);
        const meshSize = new THREE.Vector3();
        meshBox.getSize(meshSize);
        const hasUV = child.geometry.attributes.uv ? 'Yes' : 'No';
        console.log('TV Mesh Info:', {
          meshName: child.name,
          materialName: child.material.name,
          hasMap: !!child.material.map,
          color: child.material.color?.getHexString() || 'none',
          size: {
            width: meshSize.x.toFixed(2),
            height: meshSize.y.toFixed(2),
            depth: meshSize.z.toFixed(2),
          },
          hasUV,
          clickable: child.userData.clickable || false,
        });
      }
    });
  };

  // Animation loop cho mixer
  const animateBlenderClips = () => {
    if (mixerRef.current) {
      const delta = clockRef.current.getDelta();
      mixerRef.current.update(delta);
    }
    animationFrameRef.current = requestAnimationFrame(animateBlenderClips);
  };

  // ⭐ Toggle TV ON/OFF - Cải thiện (giữ nguyên)
  const toggleTV = async () => {
    if (isTogglingRef.current) {
      console.log('⏳ Toggle in progress, please wait...');
      return;
    }

    try {
      isTogglingRef.current = true;

      if (isTVOnRef.current) {
        // ===== TẮT TV =====
        console.log('🔄 Turning TV OFF...');
        
        // Stop animations
        if (actionsRef.current.length > 0) {
          actionsRef.current.forEach((action) => {
            action.stop();
          });
        }

        // Fade out và dừng audio
        if (audioRef.current && isAudioLoadedRef.current && isAudioAvailableRef.current) {
          if (CONFIG.AUDIO.USE_3D_AUDIO) {
            // 3D Audio
            if (audioRef.current.isPlaying) {
              audioRef.current.stop();
              console.log('🔇 3D Audio stopped');
            }
          } else {
            // 2D Audio với fade out
            try {
              await fadeAudio(audioRef.current, 0, CONFIG.AUDIO.FADE_DURATION);
              audioRef.current.pause();
              audioRef.current.currentTime = 0; // Reset về đầu
              console.log('🔇 2D Audio stopped with fade out');
            } catch (error) {
              console.error('Error fading out audio:', error);
            }
          }
        }
        
        isTVOnRef.current = false;
        console.log('✅ TV turned OFF');
        
      } else {
        // ===== BẬT TV =====
        console.log('🔄 Turning TV ON...');
        
        // Play animations
        if (actionsRef.current.length > 0) {
          actionsRef.current.forEach((action, index) => {
            action.play();
            console.log(`▶️ Playing animation ${index}: "${action.getClip().name}"`);
          });
        }

        // Play audio với fade in
        if (isAudioAvailableRef.current) {
          if (audioRef.current && isAudioLoadedRef.current) {
            try {
              if (CONFIG.AUDIO.USE_3D_AUDIO) {
                // 3D Audio
                if (!audioRef.current.isPlaying) {
                  audioRef.current.play();
                  console.log('🔊 3D Audio playing');
                }
              } else {
                // 2D Audio với fade in
                audioRef.current.volume = 0;
                await audioRef.current.play();
                await fadeAudio(audioRef.current, CONFIG.AUDIO.VOLUME, CONFIG.AUDIO.FADE_DURATION);
                console.log('🔊 2D Audio playing with fade in');
              }
            } catch (error) {
              console.error('❌ Error playing audio:', error.message);
              if (error.name === 'NotAllowedError') {
                console.warn('⚠️ Autoplay blocked. User interaction required.');
                console.warn('   Click anywhere on the page first to enable audio.');
              }
            }
          } else {
            console.warn('⚠️ Audio not loaded. Skipping audio playback.');
          }
        } else {
          console.warn('⚠️ Audio not available. TV will play without sound.');
        }
        
        isTVOnRef.current = true;
        console.log('✅ TV turned ON');
      }
    } catch (error) {
      console.error('❌ Error in toggleTV:', error);
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 300);
    }
  };

  // Thiết lập sự kiện nhấp chuột (sửa để gọi onScreenClick thay vì animation nội bộ)
  const setupClickHandler = () => {
    if (!scene || !camera || !tvModelRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(tvModelRef.current, true);
      if (intersects.length > 0) {
        const intersected = intersects.find((i) => 
          i.object.userData.type === 'tv_screen' || i.object.userData.type === 'remote'
        );
        if (intersected) {
          if (intersected.object.userData.type === 'tv_screen' && onScreenClick) {
            onScreenClick(); // Gọi hàm từ App.jsx để đồng bộ animation
            console.log('🖱️ Clicked on TV screen - Triggering App animation');
          } else if (intersected.object.userData.type === 'remote') {
            toggleTV();
            console.log('🕹️ Clicked on remote - toggling TV ON/OFF');
          }
        }
      }
    };

    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    };
  };

  useEffect(() => {
    if (!scene || !camera || isLoadedRef.current) return;

    const currentScene = scene;

    // ⭐ Load audio
    loadAudio();

    const loader = new GLTFLoader();
    loader.register((parser) => new KHRMaterialsPbrSpecularGlossiness(parser));

    loader.load(
      '/models/tv.glb',
      (gltf) => {
        tvModelRef.current = gltf.scene;
        gltfRef.current = gltf;
        tvModelRef.current.position.set(...position);
        tvModelRef.current.scale.set(scale, scale, scale);
        tvModelRef.current.rotation.set(...rotation);

        const box = new THREE.Box3().setFromObject(tvModelRef.current);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        console.log('📺 TV MODEL INFO:', {
          position: position,
          scale: scale,
          rotation: rotation,
          boundingBoxSize: {
            width: size.x.toFixed(3),
            height: size.y.toFixed(3),
            depth: size.z.toFixed(3),
          },
          boundingBoxCenter: {
            x: center.x.toFixed(3),
            y: center.y.toFixed(3),
            z: center.z.toFixed(3),
          },
        });

        processMaterials(tvModelRef.current);
        currentScene.add(tvModelRef.current);
        isLoadedRef.current = true;
        console.log('✅ TV Model added to scene');

        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`🎬 Found ${gltf.animations.length} animation(s) in TV model:`);
          gltf.animations.forEach((clip, index) => {
            console.log(`  Animation ${index}: "${clip.name}", Duration: ${clip.duration.toFixed(2)}s`);
          });

          mixerRef.current = new THREE.AnimationMixer(tvModelRef.current);

          actionsRef.current = gltf.animations.map((clip) => {
            const action = mixerRef.current.clipAction(clip);
            console.log(`📴 Animation "${clip.name}" loaded (TV OFF - black screen)`);
            return action;
          });

          isTVOnRef.current = false;

          animateBlenderClips();
        } else {
          console.log('⚠️ No animations found in TV model');
        }

        const cleanupClickHandler = setupClickHandler();
        return cleanupClickHandler;
      },
      undefined,
      (error) => {
        console.error('❌ Error loading TV model:', error);
      }
    );

    return () => {
      // Cleanup animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Cleanup fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }

      // Cleanup mixer
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      // ⭐ Cleanup audio
      if (audioRef.current) {
        if (CONFIG.AUDIO.USE_3D_AUDIO) {
          // 3D Audio cleanup
          if (audioRef.current.isPlaying) {
            audioRef.current.stop();
          }
          if (audioRef.current.parent) {
            audioRef.current.parent.remove(audioRef.current);
          }
        } else {
          // 2D Audio cleanup
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        audioRef.current = null;
        console.log('🎵 Audio cleaned up');
      }

      // Cleanup audio listener
      if (audioListenerRef.current && camera) {
        camera.remove(audioListenerRef.current);
        audioListenerRef.current = null;
      }

      // Cleanup TV model
      if (tvModelRef.current && currentScene) {
        currentScene.remove(tvModelRef.current);
        tvModelRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            child.material?.dispose();
          }
        });
        console.log('TV Model removed and resources disposed');
      }

      // Reset refs
      tvScreenMeshRef.current = null;
      isLoadedRef.current = false;
      gltfRef.current = null;
      actionsRef.current = [];
      isTVOnRef.current = false;
      isAudioLoadedRef.current = false;
      isAudioAvailableRef.current = true;
      isTogglingRef.current = false;
    };
  }, [scene, camera, position, scale, rotation, onScreenClick]); // Thêm onScreenClick vào dependency

  return null;
}

export default TV;