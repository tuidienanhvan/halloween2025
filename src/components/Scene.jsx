import { useEffect, useRef } from 'react';

const CONFIG = {
  RECIPIENT_NAME: 'Luyện Mai Nhi',
  TYPEWRITER_SPEED: 80,
  DELAY_BEFORE_NAME: 500,
  BIRTHDAY_TEXT: 'HAPPY HALLOWEEN',
  GREETING_TEXT: 'Hello công chúa của ta - Luyện Mai Nhi,',
  POEM_LINES: [
    'Mười tám - một đêm trăng máu dưới bầu trời u ám',
    'Nguyện mọi lời nguyền hóa thành phước lành quấn quanh linh hồn ngươi',
    'Dây trói tình thâm đâm xuyên xen kẽ như mạng nhện trong cổ mộ',
    'Ngôi nhà ngươi ở mãi mãi ấm áp bởi hơi thở mê hoặc từ bóng tối',
    'Trên tay ngươi là lọ thuốc may mắn được ban phước từ gã phù thủy',
    'Và trái tim ngươi luôn bị ràng buộc bởi những sợi xích của ta không thể tháo rời.'
  ],
  DELAY_BETWEEN_SECTIONS: 1000,
  SIGNATURE_TEXT: '- Từ chúa tể hắc ám đánh cắp nỗi buồn ngươi đi dưới ánh trăng máu Halloween, kẻ mang tên Từ Anh Văn.',
  FLASH_DURATION: 300, // Flash ngắn, dữ dội
  FADE_DURATION: 2500 // Fade dài, rùng rợn
};

// Easing function for fade
function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

// Responsive font sizes with height scaling
function getResponsiveFontSizes(width, height) {
  const isMobile = width < 768;
  const scaleFactor = Math.min(1, height / 800);

  if (isMobile) {
    return {
      BIRTHDAY_FONT_SIZE: Math.min(width * 0.04, 24) * scaleFactor,
      GREETING_FONT_SIZE: Math.min(width * 0.045, 28) * scaleFactor,
      POEM_FONT_SIZE: Math.min(width * 0.035, 20) * scaleFactor,
      SIGNATURE_FONT_SIZE: Math.min(width * 0.03, 18) * scaleFactor
    };
  } else {
    return {
      BIRTHDAY_FONT_SIZE: Math.min(width * 0.025, 36) * scaleFactor,
      GREETING_FONT_SIZE: Math.min(width * 0.035, 48) * scaleFactor,
      POEM_FONT_SIZE: Math.min(width * 0.025, 32) * scaleFactor,
      SIGNATURE_FONT_SIZE: Math.min(width * 0.02, 28) * scaleFactor
    };
  }
}

function Scene() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const fontSizesRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const offscreenCtxRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const signatureCtxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Offscreen canvas cho text chính
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCanvasRef.current = offscreenCanvas;
    offscreenCtxRef.current = offscreenCanvas.getContext('2d');

    // Offscreen canvas cho signature
    const signatureCanvas = document.createElement('canvas');
    signatureCanvas.width = width;
    signatureCanvas.height = height;
    signatureCanvasRef.current = signatureCanvas;
    signatureCtxRef.current = signatureCanvas.getContext('2d');

    // Get responsive font sizes
    fontSizesRef.current = getResponsiveFontSizes(width, height);

    // Animation state
    let time = 0;
    let animationState = {
      phase: 0,
      charIndex: 0,
      poemLineIndex: 0,
      poemCharIndex: 0,
      signatureCharIndex: 0,
      signatureCompleteTime: 0, // Thời điểm signature hoàn thành
      flashTime: 0,
      fadeProgress: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };

    // CRT Effect parameters
    const crtEffects = {
      scanlineIntensity: 0.25,
      scanlineCount: 0.7,
      noiseIntensity: 0.25,
      horizontalDistortion: 8,
      verticalDistortion: 3,
      flickerAmount: 0.08,
      colorBleed: 3,
      chromaShift: 2,
      glitchProbability: 0.03
    };

    // Crazy CRT parameters cho signature
    const crazyCrtEffects = {
      scanlineIntensity: 0.4,
      scanlineCount: 1.0,
      noiseIntensity: 0.5,
      horizontalDistortion: 12,
      verticalDistortion: 6,
      flickerAmount: 0.15,
      colorBleed: 5,
      chromaShift: 4,
      glitchProbability: 0.2,
      rotationAmplitude: 0.02
    };

    // Flash effect parameters
    const flashEffects = {
      brightness: 4.5, // Flash dữ dội
      noiseIntensity: 1.0, // Nhiễu mạnh
      glitchProbability: 0.8, // Glitch điên cuồng
      shakeAmplitude: 10 // Rung màn hình
    };

    // Noise generation
    function noise(x, y, time) {
      const n = Math.sin(x * 12.9898 + y * 78.233 + time) * 43758.5453;
      return (n - Math.floor(n));
    }

    // Random glitch
    function shouldGlitch(probability = crtEffects.glitchProbability) {
      return Math.random() < probability;
    }

    // Draw text to offscreen canvas
    function drawTextToOffscreen() {
      const currentTime = Date.now();
      const elapsed = currentTime - animationState.lastUpdateTime;
      const fontSizes = fontSizesRef.current;
      const offCtx = offscreenCtxRef.current;
      const sigCtx = signatureCtxRef.current;

      // Update animation
      if (elapsed > CONFIG.TYPEWRITER_SPEED) {
        animationState.lastUpdateTime = currentTime;

        if (animationState.phase === 0) {
          if (animationState.charIndex < CONFIG.BIRTHDAY_TEXT.length) {
            animationState.charIndex++;
          } else if (currentTime - animationState.startTime > CONFIG.BIRTHDAY_TEXT.length * CONFIG.TYPEWRITER_SPEED + CONFIG.DELAY_BETWEEN_SECTIONS) {
            animationState.phase = 1;
            animationState.charIndex = 0;
            animationState.startTime = currentTime;
          }
        } else if (animationState.phase === 1) {
          if (animationState.charIndex < CONFIG.GREETING_TEXT.length) {
            animationState.charIndex++;
          } else if (currentTime - animationState.startTime > CONFIG.GREETING_TEXT.length * CONFIG.TYPEWRITER_SPEED + CONFIG.DELAY_BETWEEN_SECTIONS) {
            animationState.phase = 2;
            animationState.poemLineIndex = 0;
            animationState.poemCharIndex = 0;
            animationState.startTime = currentTime;
          }
        } else if (animationState.phase === 2) {
          if (animationState.poemLineIndex < CONFIG.POEM_LINES.length) {
            const currentLine = CONFIG.POEM_LINES[animationState.poemLineIndex];
            if (animationState.poemCharIndex < currentLine.length) {
              animationState.poemCharIndex++;
            } else if (currentTime - animationState.startTime > currentLine.length * CONFIG.TYPEWRITER_SPEED + CONFIG.DELAY_BETWEEN_SECTIONS / 2) {
              animationState.poemLineIndex++;
              animationState.poemCharIndex = 0;
              animationState.startTime = currentTime;
            }
          } else if (currentTime - animationState.startTime > CONFIG.DELAY_BETWEEN_SECTIONS) {
            animationState.phase = 3;
            animationState.signatureCharIndex = 0;
            animationState.startTime = currentTime;
          }
        } else if (animationState.phase === 3) {
          if (animationState.signatureCharIndex < CONFIG.SIGNATURE_TEXT.length) {
            animationState.signatureCharIndex++;
          } else if (!animationState.signatureCompleteTime) {
            animationState.signatureCompleteTime = currentTime; // Lưu thời điểm hoàn thành
          } else if (currentTime - animationState.signatureCompleteTime > 1000) { // Chờ 1s
            animationState.phase = 4;
            animationState.flashTime = currentTime;
            animationState.startTime = currentTime;
          }
        } else if (animationState.phase === 4) {
          if (currentTime - animationState.flashTime > CONFIG.FLASH_DURATION) {
            animationState.phase = 5;
            animationState.startTime = currentTime;
          }
        } else if (animationState.phase === 5) {
          animationState.fadeProgress = Math.min(1, (currentTime - animationState.startTime) / CONFIG.FADE_DURATION);
        }
      }

      // Clear offscreen canvases
      offCtx.fillStyle = '#000000';
      offCtx.fillRect(0, 0, width, height);
      sigCtx.fillStyle = '#000000';
      sigCtx.fillRect(0, 0, width, height);

      if (animationState.phase < 4) { // Chỉ vẽ text trước flash
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.shadowBlur = 8;
        offCtx.shadowColor = '#00ff00';
        offCtx.fillStyle = '#00ff00';

        // Tính tổng height và startY
        const lineHeight = fontSizes.POEM_FONT_SIZE * 1.3;
        const totalPoemHeight = CONFIG.POEM_LINES.length * lineHeight;
        const totalContentHeight = fontSizes.BIRTHDAY_FONT_SIZE + fontSizes.GREETING_FONT_SIZE + totalPoemHeight + fontSizes.SIGNATURE_FONT_SIZE + 100;
        let startY = height * 0.2;
        if (totalContentHeight > height * 0.8) {
          startY = (height - totalContentHeight) / 2;
        }

        // Draw birthday text
        if (animationState.phase >= 0) {
          offCtx.font = `bold ${fontSizes.BIRTHDAY_FONT_SIZE}px 'Courier New', monospace`;
          const birthdayText = CONFIG.BIRTHDAY_TEXT.slice(0, 
            animationState.phase === 0 ? animationState.charIndex : CONFIG.BIRTHDAY_TEXT.length
          );
          offCtx.fillText(birthdayText, width / 2, startY);
          startY += fontSizes.BIRTHDAY_FONT_SIZE * 1.5;
        }

        // Draw greeting text
        if (animationState.phase >= 1) {
          offCtx.font = `bold ${fontSizes.GREETING_FONT_SIZE}px 'Courier New', monospace`;
          const greetingText = CONFIG.GREETING_TEXT.slice(0, 
            animationState.phase === 1 ? animationState.charIndex : CONFIG.GREETING_TEXT.length
          );
          offCtx.fillText(greetingText, width / 2, startY);
          startY += fontSizes.GREETING_FONT_SIZE * 1.5;
        }

        // Draw poem lines
        if (animationState.phase >= 2) {
          offCtx.font = `italic ${fontSizes.POEM_FONT_SIZE}px 'Courier New', monospace`;
          for (let i = 0; i < animationState.poemLineIndex; i++) {
            const y = startY + (i * lineHeight);
            offCtx.fillText(CONFIG.POEM_LINES[i], width / 2, y);
          }

          if (animationState.poemLineIndex < CONFIG.POEM_LINES.length) {
            const currentLine = CONFIG.POEM_LINES[animationState.poemLineIndex].slice(0, animationState.poemCharIndex);
            const y = startY + (animationState.poemLineIndex * lineHeight);
            offCtx.fillText(currentLine, width / 2, y);
          }
          startY += totalPoemHeight;
        }

        // Draw signature
        if (animationState.phase >= 3) {
          sigCtx.textAlign = 'right';
          sigCtx.textBaseline = 'middle';
          sigCtx.shadowBlur = 12;
          sigCtx.shadowColor = '#00ff00';
          sigCtx.fillStyle = '#00ff00';
          sigCtx.font = `italic ${fontSizes.SIGNATURE_FONT_SIZE}px 'Courier New', monospace`;
          const signatureText = CONFIG.SIGNATURE_TEXT.slice(0, animationState.signatureCharIndex);
          sigCtx.fillText(signatureText, width - 20, startY + fontSizes.SIGNATURE_FONT_SIZE);
        }
      }
    }

    // Apply crazy CRT effects cho signature
    function applyCrazyCRTEffects() {
      const sigCtx = signatureCtxRef.current;
      const imageData = sigCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Chromatic aberration
      const tempData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (x + crazyCrtEffects.chromaShift < width) {
            const shiftIdx = (y * width + (x + crazyCrtEffects.chromaShift)) * 4;
            data[shiftIdx] = tempData[i];
          }
          if (x - crazyCrtEffects.chromaShift >= 0) {
            const shiftIdx = (y * width + (x - crazyCrtEffects.chromaShift)) * 4;
            data[shiftIdx + 2] = tempData[i + 2];
          }
        }
      }

      // Horizontal distortion với rotation
      const distortedData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        const distortion = Math.sin(y * 0.05 + time * 2) * crazyCrtEffects.horizontalDistortion;
        const rotation = Math.sin(y * 0.1 + time * 3) * crazyCrtEffects.rotationAmplitude;
        const offset = Math.floor(distortion);
        for (let x = 0; x < width; x++) {
          const sourceX = x - offset + Math.floor(Math.cos(rotation) * 10);
          if (sourceX >= 0 && sourceX < width) {
            const sourceIdx = (y * width + sourceX) * 4;
            const targetIdx = (y * width + x) * 4;
            distortedData[targetIdx] = data[sourceIdx];
            distortedData[targetIdx + 1] = data[sourceIdx + 1];
            distortedData[targetIdx + 2] = data[sourceIdx + 2];
            distortedData[targetIdx + 3] = data[sourceIdx + 3];
          }
        }
      }

      // Vertical distortion
      for (let x = 0; x < width; x++) {
        const distortion = Math.sin(x * 0.03 + time * 1.5) * crazyCrtEffects.verticalDistortion;
        const offset = Math.floor(distortion);
        for (let y = 0; y < height; y++) {
          const sourceY = y - offset;
          if (sourceY >= 0 && sourceY < height) {
            const sourceIdx = (sourceY * width + x) * 4;
            const targetIdx = (y * width + x) * 4;
            data[targetIdx] = distortedData[sourceIdx];
            data[targetIdx + 1] = distortedData[sourceIdx + 1];
            data[targetIdx + 2] = distortedData[sourceIdx + 2];
            data[targetIdx + 3] = distortedData[sourceIdx + 3];
          }
        }
      }

      // Scanlines
      for (let y = 0; y < height; y++) {
        const scanline = Math.sin(y * Math.PI * crazyCrtEffects.scanlineCount);
        const intensity = crazyCrtEffects.scanlineIntensity * (0.5 + 0.5 * scanline);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] *= (1 - intensity);
          data[i + 1] *= (1 - intensity);
          data[i + 2] *= (1 - intensity);
        }
      }

      // Noise
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const n = (noise(x * 0.5, y * 0.5, time * 20) - 0.5) * crazyCrtEffects.noiseIntensity * 255;
          data[i] += n;
          data[i + 1] += n;
          data[i + 2] += n;
        }
      }

      // Color bleeding
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - crazyCrtEffects.colorBleed; x++) {
          const i = (y * width + x) * 4;
          const nextIdx = (y * width + (x + crazyCrtEffects.colorBleed)) * 4;
          data[nextIdx + 1] += data[i + 1] * 0.2;
        }
      }

      // Glitch
      if (shouldGlitch(crazyCrtEffects.glitchProbability)) {
        const glitchY = Math.floor(Math.random() * height);
        const glitchHeight = Math.floor(Math.random() * 30) + 10;
        for (let y = glitchY; y < Math.min(glitchY + glitchHeight, height); y++) {
          const shift = Math.floor(Math.random() * 60) - 30;
          for (let x = 0; x < width; x++) {
            const sourceX = x - shift;
            if (sourceX >= 0 && sourceX < width) {
              const sourceIdx = (y * width + sourceX) * 4;
              const targetIdx = (y * width + x) * 4;
              data[targetIdx] = tempData[sourceIdx];
              data[targetIdx + 1] = tempData[sourceIdx + 1];
              data[targetIdx + 2] = tempData[sourceIdx + 2];
            }
          }
        }
      }

      // Flicker
      const flicker = 1 - crazyCrtEffects.flickerAmount + crazyCrtEffects.flickerAmount * (Math.sin(time * 40) + Math.sin(time * 57) * 0.5);
      for (let i = 0; i < data.length; i += 4) {
        data[i] *= flicker;
        data[i + 1] *= flicker;
        data[i + 2] *= flicker;
      }

      sigCtx.putImageData(imageData, 0, 0);
    }

    // Apply vintage CRT effects
    function applyCRTEffects() {
      const imageData = offscreenCtxRef.current.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Shake effect cho flash
      let shakeX = 0, shakeY = 0;
      if (animationState.phase === 4) {
        shakeX = Math.random() * flashEffects.shakeAmplitude * 2 - flashEffects.shakeAmplitude;
        shakeY = Math.random() * flashEffects.shakeAmplitude * 2 - flashEffects.shakeAmplitude;
      }

      // Chromatic aberration
      const tempData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const shift = animationState.phase === 4 ? flashEffects.chromaShift : crtEffects.chromaShift;
          if (x + shift < width) {
            const shiftIdx = (y * width + (x + shift)) * 4;
            data[shiftIdx] = tempData[i];
          }
          if (x - shift >= 0) {
            const shiftIdx = (y * width + (x - shift)) * 4;
            data[shiftIdx + 2] = tempData[i + 2];
          }
        }
      }

      // Warp distortion cho flash
      const distortedData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        const distortion = Math.sin(y * 0.05 + time * 2) * (animationState.phase === 4 ? flashEffects.horizontalDistortion : crtEffects.horizontalDistortion);
        const offset = Math.floor(distortion);
        for (let x = 0; x < width; x++) {
          const sourceX = x - offset + (animationState.phase === 4 ? Math.sin(y * 0.1 + time * 5) * 15 : 0);
          if (sourceX >= 0 && sourceX < width) {
            const sourceIdx = (y * width + sourceX) * 4;
            const targetIdx = (y * width + x) * 4;
            distortedData[targetIdx] = data[sourceIdx];
            distortedData[targetIdx + 1] = data[sourceIdx + 1];
            distortedData[targetIdx + 2] = data[sourceIdx + 2];
            distortedData[targetIdx + 3] = data[sourceIdx + 3];
          }
        }
      }

      // Vertical distortion
      for (let x = 0; x < width; x++) {
        const distortion = Math.sin(x * 0.03 + time * 1.5) * (animationState.phase === 4 ? flashEffects.verticalDistortion : crtEffects.verticalDistortion);
        const offset = Math.floor(distortion);
        for (let y = 0; y < height; y++) {
          const sourceY = y - offset;
          if (sourceY >= 0 && sourceY < height) {
            const sourceIdx = (sourceY * width + x) * 4;
            const targetIdx = (y * width + x) * 4;
            data[targetIdx] = distortedData[sourceIdx];
            data[targetIdx + 1] = distortedData[sourceIdx + 1];
            data[targetIdx + 2] = distortedData[sourceIdx + 2];
            data[targetIdx + 3] = distortedData[sourceIdx + 3];
          }
        }
      }

      // Scanlines
      for (let y = 0; y < height; y++) {
        const scanline = Math.sin(y * Math.PI * (animationState.phase === 4 ? flashEffects.scanlineCount : crtEffects.scanlineCount));
        const intensity = (animationState.phase === 4 ? flashEffects.scanlineIntensity : crtEffects.scanlineIntensity) * (0.5 + 0.5 * scanline);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] *= (1 - intensity);
          data[i + 1] *= (1 - intensity);
          data[i + 2] *= (1 - intensity);
        }
      }

      // Noise với random bursts trong fade
      let currentNoiseIntensity = crtEffects.noiseIntensity;
      if (animationState.phase === 4) {
        currentNoiseIntensity = flashEffects.noiseIntensity;
      } else if (animationState.phase === 5) {
        const burst = Math.random() < 0.05 ? 0.3 : 0; // Nhiễu bất chợt
        currentNoiseIntensity = 0.3 * (1 - easeOutQuad(animationState.fadeProgress)) * (1 + burst);
      }
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const n = (noise(x * 0.5, y * 0.5, time * 20) - 0.5) * currentNoiseIntensity * 255;
          data[i] += n;
          data[i + 1] += n;
          data[i + 2] += n;
        }
      }

      // Color bleeding
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - crtEffects.colorBleed; x++) {
          const i = (y * width + x) * 4;
          const nextIdx = (y * width + (x + crtEffects.colorBleed)) * 4;
          data[nextIdx + 1] += data[i + 1] * 0.15;
        }
      }

      // Glitch
      if (shouldGlitch(animationState.phase === 4 ? flashEffects.glitchProbability : crtEffects.glitchProbability)) {
        const glitchY = Math.floor(Math.random() * height);
        const glitchHeight = Math.floor(Math.random() * 30) + 10;
        for (let y = glitchY; y < Math.min(glitchY + glitchHeight, height); y++) {
          const shift = Math.floor(Math.random() * 60) - 30;
          for (let x = 0; x < width; x++) {
            const sourceX = x - shakeX - shift; // Thêm shake
            if (sourceX >= 0 && sourceX < width) {
              const sourceIdx = ((y - shakeY) * width + sourceX) * 4;
              const targetIdx = (y * width + x) * 4;
              if (sourceIdx >= 0 && sourceIdx < data.length) {
                data[targetIdx] = tempData[sourceIdx];
                data[targetIdx + 1] = tempData[sourceIdx + 1];
                data[targetIdx + 2] = tempData[sourceIdx + 2];
              }
            }
          }
        }
      }

      // Flash brightness
      if (animationState.phase === 4) {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * flashEffects.brightness);
          data[i + 1] = Math.min(255, data[i + 1] * flashEffects.brightness);
          data[i + 2] = Math.min(255, data[i + 2] * flashEffects.brightness);
        }
      }

      // Flicker
      const flicker = 1 - crtEffects.flickerAmount + crtEffects.flickerAmount * (Math.sin(time * 30) + Math.sin(time * 47) * 0.5);
      for (let i = 0; i < data.length; i += 4) {
        data[i] *= flicker;
        data[i + 1] *= flicker;
        data[i + 2] *= flicker;
      }

      // Apply fade và vignette
      ctx.globalAlpha = animationState.phase === 5 ? 1 - easeOutQuad(animationState.fadeProgress) : 1;
      ctx.putImageData(imageData, shakeX, shakeY); // Áp dụng shake
      ctx.globalAlpha = 1;

      // Vignette cho fade
      if (animationState.phase === 5) {
        const vignette = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) * 0.6
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, `rgba(0, 0, 0, ${0.5 * easeOutQuad(animationState.fadeProgress)})`);
        vignette.addColorStop(1, `rgba(0, 0, 0, ${0.9 * easeOutQuad(animationState.fadeProgress)})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
      }

      // Screen curvature overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, 15);
      ctx.fillRect(0, height - 15, width, 15);
      ctx.fillRect(0, 0, 15, height);
      ctx.fillRect(width - 15, 0, 15, height);
    }

    // Main animation loop
    function animate() {
      time += 0.016;

      drawTextToOffscreen();
      applyCRTEffects();
      if (animationState.phase >= 3 && animationState.phase < 5) {
        applyCrazyCRTEffects();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(signatureCanvasRef.current, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (animationState.phase < 5 || animationState.fadeProgress < 0.99) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    // Start animation
    animate();

    // Handle resize
    function handleResize() {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      width = newWidth;
      height = newHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      offscreenCanvasRef.current.width = newWidth;
      offscreenCanvasRef.current.height = newHeight;
      signatureCanvasRef.current.width = newWidth;
      signatureCanvasRef.current.height = newHeight;
      
      fontSizesRef.current = getResponsiveFontSizes(newWidth, newHeight);
    }

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        imageRendering: 'pixelated'
      }}
    />
  );
}

export default Scene;
