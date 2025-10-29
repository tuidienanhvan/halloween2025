// Hằng số cấu hình
export const CONFIG = {
    CAMERA: {
      FOV: 75,
      NEAR: 0.1,
      FAR: 100,
      POSITION: [0.02, 1.19, -0.10],
      ROTATION_Y: Math.PI,
    },
    CAMERA_ANIMATION: {
      DURATION: 2, // 2 giây
      TV_POSITION: [-0.3, 1.2, 1.95], // Vị trí camera khi zoom vào TV
      TV_ROTATION: { x: 0, y: 0 }, // Rotation khi nhìn TV
      SPIRAL_ROTATIONS: 0, // Số vòng xoay (0 = không xoay, 1 = 360 độ, 2 = 720 độ)
      EASE: 'power2.inOut', // Easing function
      SHAKE_INTENSITY: 0.1, // Cường độ rung khi gần đích
    },
    RENDERER: {
      ANTIALIAS: true,
      POWER_PREFERENCE: 'high-performance',
      TONE_MAPPING_EXPOSURE: 1.3,
    },
    SCENE: {
      BACKGROUND_COLOR: 0x0a0a1e,
      FOG_COLOR: 0x1a1a2e,
      FOG_DENSITY: 0.08,
    },
    MOUSE_SENSITIVITY: 0.005,
    TOUCH_SENSITIVITY: 0.003,
    MODEL_SCALE: 1 / 100,
    ANIMATION: {
      DELTA_TIME: 0.016,
      LIGHT_INTENSITY: {
        SPOT_BASE: 5.0,
        POINT_BASE: 3.5,
      },
      PHASES: {
        ON: {
          DURATION: () => 10 + Math.random() * 10,
          FLICKER_AMPLITUDE: 0.03,
          FLICKER_SPEED: 10,
        },
        FLICKER: {
          SPEED: 6,
          MAX_FLICKERS: () => 3 + Math.floor(Math.random() * 3),
        },
        OFF: {
          DURATION: () => 1 + Math.random() * 2,
        },
        FLICKER_ON: {
          SPEED: 8,
          MAX_FLICKERS: () => 3 + Math.floor(Math.random() * 2),
        },
      },
    },
    FADE: {
      DURATION: 0.5, // Thời gian fade to black và fade in Scene.jsx (giây)
    },
  };