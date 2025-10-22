import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Scene from './components/Scene.jsx';
import TV from './components/TV.jsx';
import { CONFIG } from './config.js';
import { 
  initScene, 
  setupLighting, 
  initCamera, 
  initRenderer, 
  handleFadeToScene, 
  animateCameraToTV, 
  resetCamera, 
  setupClickHandler, 
  setupControls, 
  loadModel, 
  animate as startAnimation, 
  setupResizeHandler 
} from './threeUtils.js';

function App() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const lightsRef = useRef({ ceiling: null, point: null });
  const flickerStateRef = useRef({
    phase: 'on',
    timer: 0,
    nextPhaseTime: CONFIG.ANIMATION.PHASES.ON.DURATION(),
    flickerCount: 0,
    maxFlickers: 0,
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showScene, setShowScene] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isAnimatingRef = useRef(false);
  const originalCameraStateRef = useRef(null);
  const currentTweenRef = useRef(null);
  const fadeTimelineRef = useRef(null);
  const hasEnteredSceneRef = useRef(false); // ✅ THÊM: Flag để track đã vào Scene chưa

  useEffect(() => {
    if (!containerRef.current) return;

    const currentContainer = containerRef.current;
    const scene = initScene();
    sceneRef.current = scene;
    setupLighting(scene, lightsRef);
    const camera = initCamera();
    cameraRef.current = camera;
    const renderer = initRenderer(currentContainer);
    rendererRef.current = renderer;

    // Wrapper functions được định nghĩa trong useEffect để capture đúng state
    const handleFade = () => {
      handleFadeToScene(setShowScene, setFadeOpacity, fadeTimelineRef);
      hasEnteredSceneRef.current = true; // ✅ THÊM: Set flag khi vào Scene
    };

    const animateToTV = (cam) => {
      animateCameraToTV(
        cam,
        isAnimatingRef,
        originalCameraStateRef,
        currentTweenRef,
        handleFade // Pass callback
      );
    };

    const resetCam = (cam) => {
      resetCamera(
        cam,
        originalCameraStateRef,
        isAnimatingRef,
        currentTweenRef,
        setShowScene,
        setFadeOpacity
      );
    };

    const cleanupControls = setupControls(camera, renderer, isAnimatingRef);
    const cleanupClick = setupClickHandler(
      camera,
      scene,
      renderer,
      isAnimatingRef,
      mouseRef,
      raycasterRef,
      originalCameraStateRef,
      animateToTV,
      resetCam,
      hasEnteredSceneRef // ✅ THÊM: Pass flag để check trong click handler
    );

    loadModel(scene, setLoadingProgress, setIsLoading);
    startAnimation(camera, renderer, scene, lightsRef, flickerStateRef);
    const cleanupResize = setupResizeHandler(camera, renderer);

    return () => {
      if (currentTweenRef.current) {
        currentTweenRef.current.kill();
      }
      if (fadeTimelineRef.current) {
        fadeTimelineRef.current.kill();
      }
      cleanupControls();
      cleanupClick();
      cleanupResize();
      if (rendererRef.current && currentContainer) {
        currentContainer.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []); // Empty dependency - chỉ setup một lần

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {sceneRef.current && cameraRef.current && !hasEnteredSceneRef.current && ( // ✅ THÊM: Chỉ hiện TV khi chưa vào Scene
        <TV
          scene={sceneRef.current}
          camera={cameraRef.current}
          position={[-0.1, 0.8, 2.5]}
          scale={0.0050}
          rotation={[0, 0, 0]}
          onScreenClick={() => {
            if (!isAnimatingRef.current && cameraRef.current && !hasEnteredSceneRef.current) {
              animateCameraToTV(
                cameraRef.current,
                isAnimatingRef,
                originalCameraStateRef,
                currentTweenRef,
                () => {
                  handleFadeToScene(setShowScene, setFadeOpacity, fadeTimelineRef);
                  hasEnteredSceneRef.current = true;
                }
              );
            }
          }}
        />
      )}

      {/* Fade Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'black',
          opacity: fadeOpacity,
          pointerEvents: 'none',
          zIndex: 998,
          transition: 'opacity 0.1s ease',
        }}
      />

      {/* Scene.jsx */}
      {showScene && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1 - fadeOpacity,
            pointerEvents: 'auto',
            transition: 'opacity 0.1s ease',
          }}
        >
          <Scene />
        </div>
      )}

      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a1e 0%, #1a1a2e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            opacity: loadingProgress >= 100 ? 0 : 1,
            transition: 'opacity 0.8s ease-out',
            pointerEvents: loadingProgress >= 100 ? 'none' : 'auto',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              marginBottom: '40px',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '4px solid rgba(154, 91, 255, 0.2)',
                borderTop: '4px solid #9a5bff',
                borderRadius: '50%',
                animation: 'spin 1.5s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                top: '20px',
                left: '20px',
                border: '4px solid rgba(170, 102, 102, 0.2)',
                borderTop: '4px solid #aa6666',
                borderRadius: '50%',
                animation: 'spin-reverse 1s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '20px',
                height: '20px',
                top: '50px',
                left: '50px',
                background: 'linear-gradient(135deg, #9a5bff, #aa6666)',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>

          <div
            style={{
              width: '85%',
              maxWidth: '400px',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #9a5bff 0%, #aa6666 50%, #6a6a8a 100%)',
                borderRadius: '10px',
                width: `${loadingProgress}%`,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 20px rgba(154, 91, 255, 0.6)',
              }}
            />
          </div>

          <div
            style={{
              marginTop: '25px',
              color: '#9a5bff',
              fontSize: '18px',
              fontFamily: 'monospace',
              fontWeight: '600',
              letterSpacing: '2px',
            }}
          >
            {Math.round(loadingProgress)}%
          </div>

          <div
            style={{
              marginTop: '15px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontFamily: 'monospace',
              animation: 'fade 1.5s ease-in-out infinite',
            }}
          >
            Loading The Room...
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 1;
            }
            50% { 
              transform: scale(1.3);
              opacity: 0.7;
            }
          }
          
          @keyframes fade {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }

          * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
          }

          body {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }
        `}
      </style>
    </div>
  );
}

export default App;