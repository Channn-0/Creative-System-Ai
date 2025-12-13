
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, Wand2, Download, AlertCircle, X, ZoomIn, 
    Sun, Moon, RefreshCw, Trash2
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { Navigation } from './components/Navigation';
import { VisualHelper } from './components/VisualHelper';
import { StudioPanel } from './components/modes/StudioPanel';
import { PortraitPanel } from './components/modes/PortraitPanel';
import { InteriorPanel } from './components/modes/InteriorPanel';
import { 
    AppMode,
    AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, 
    PortraitEnvironment, PortraitVibe,
    InteriorStyle, InteriorMaterial,
    ImageFile, GenerationState, HistoryItem 
} from './types';
import { generateOptimizedPrompt, generateImage } from './services/gemini';
import { downloadImage } from './utils';

// --- SVG GENERATORS (INSTANT PREVIEWS) ---

const generateLightingPreview = (type: LightingStyle): string => {
    const w = 400; const h = 300;
    const cx = w/2; const cy = h/2;
    
    // TUBE GEOMETRY (Standard Front View)
    // Standing on cap
    const capW = 50; const capH = 25;
    const bodyW_bottom = 50; const bodyW_top = 70;
    const bodyH = 110;
    const crimpH = 15;
    
    // Coordinates
    const capY = cy + 40;
    const bodyY_bottom = capY;
    const bodyY_top = bodyY_bottom - bodyH;
    
    const tubePath = `
        M ${cx - bodyW_bottom/2} ${bodyY_bottom} 
        L ${cx - bodyW_top/2} ${bodyY_top} 
        L ${cx + bodyW_top/2} ${bodyY_top} 
        L ${cx + bodyW_bottom/2} ${bodyY_bottom} 
        Z`;
        
    const crimpPath = `
        M ${cx - bodyW_top/2 - 2} ${bodyY_top}
        L ${cx - bodyW_top/2 - 2} ${bodyY_top - crimpH}
        L ${cx + bodyW_top/2 + 2} ${bodyY_top - crimpH}
        L ${cx + bodyW_top/2 + 2} ${bodyY_top}
        Z`;

    const capPath = `
        M ${cx - capW/2} ${capY}
        L ${cx - capW/2} ${capY + capH}
        Q ${cx} ${capY + capH + 5} ${cx + capW/2} ${capY + capH}
        L ${cx + capW/2} ${capY}
        Z`;

    let defs = '';
    let content = '';
    
    switch (type) {
        case LightingStyle.STUDIO:
            // Soft Gradient
            defs = `
                <linearGradient id="studioTube" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#cbd5e1"/>
                    <stop offset="40%" stop-color="#ffffff"/>
                    <stop offset="60%" stop-color="#ffffff"/>
                    <stop offset="100%" stop-color="#94a3b8"/>
                </linearGradient>
                <filter id="softShadow" x="-50%" y="0" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
                    <feOffset dy="5" result="offsetblur"/>
                    <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
                    <feMerge><feMergeNode in="offsetblur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            `;
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#e2e8f0" />
                <path d="${capPath}" fill="#475569" filter="url(#softShadow)" />
                <path d="${tubePath}" fill="url(#studioTube)" filter="url(#softShadow)" />
                <path d="${crimpPath}" fill="#e2e8f0" stroke="#cbd5e1" filter="url(#softShadow)" />
            `;
            break;

        case LightingStyle.NATURAL:
            // Hard Shadow + Warmth
            defs = `<filter id="leaf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" /></filter>`;
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#f1f5f9" />
                <!-- Shadow -->
                <g transform="skewX(-30) translate(120, 0)" opacity="0.2" fill="#000">
                     <path d="${capPath}" />
                     <path d="${tubePath}" />
                     <path d="${crimpPath}" />
                </g>
                <!-- Tube -->
                <g>
                    <path d="${capPath}" fill="#64748b" />
                    <path d="${tubePath}" fill="#ffffff" />
                    <path d="${crimpPath}" fill="#f1f5f9" />
                </g>
                <!-- Leaf Shadow Overlay -->
                <path d="M${cx-150} ${cy-150} C${cx} ${cy-50}, ${cx+50} ${cy+50}, ${cx+200} ${cy+200}" stroke="#000" stroke-width="80" opacity="0.05" filter="url(#leaf)"/>
            `;
            break;

        case LightingStyle.CINEMATIC:
            // Revised: Sharper silhouette with stronger rim light
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#0a0a0a" />
                <defs>
                    <linearGradient id="cineLight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#000"/>
                        <stop offset="40%" stop-color="#1e293b"/>
                        <stop offset="60%" stop-color="#fff"/> 
                        <stop offset="100%" stop-color="#334155"/>
                   </linearGradient>
                </defs>
                
                <!-- Strong Spotlight Beam from Right -->
                <path d="M${w} 0 L${cx-40} ${h} L${w} ${h} Z" fill="#fff" opacity="0.07" />
                
                <g>
                     <path d="${capPath}" fill="#0f172a" stroke="#334155" stroke-width="1"/>
                     <path d="${tubePath}" fill="url(#cineLight)" />
                     <path d="${crimpPath}" fill="url(#cineLight)" />
                </g>
            `;
            break;

        case LightingStyle.NEON:
            // Rim lights
            content = `
                 <rect x="0" y="0" width="${w}" height="${h}" fill="#0a0a0a" />
                 <defs>
                    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                 </defs>
                 <g filter="url(#neonGlow)">
                    <path d="${capPath}" stroke="#ec4899" stroke-width="3" fill="#171717" />
                    <path d="${tubePath}" stroke="#3b82f6" stroke-width="3" fill="#171717" />
                    <path d="${crimpPath}" stroke="#ec4899" stroke-width="3" fill="#171717" />
                 </g>
            `;
            break;

        case LightingStyle.MINIMALIST:
            // Flat, low contrast
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#f8fafc" />
                <g opacity="0.8">
                    <path d="${capPath}" fill="#cbd5e1" />
                    <path d="${tubePath}" fill="#ffffff" stroke="#e2e8f0" />
                    <path d="${crimpPath}" fill="#f1f5f9" stroke="#e2e8f0" />
                </g>
            `;
            break;

        case LightingStyle.PRODUCT_BOOST:
            // Vibrant Background
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#facc15" />
                <circle cx="${cx}" cy="${cy}" r="120" fill="#fef08a" opacity="0.5" />
                <g filter="drop-shadow(0px 10px 10px rgba(0,0,0,0.2))">
                    <path d="${capPath}" fill="#334155" />
                    <path d="${tubePath}" fill="#ffffff" />
                    <path d="${crimpPath}" fill="#ffffff" />
                </g>
                <!-- Specular Highlight -->
                <rect x="${cx-15}" y="${bodyY_top + 10}" width="10" height="80" fill="white" opacity="0.4" rx="5" />
            `;
            break;

        case LightingStyle.MATCH_REFERENCE:
            // Scanline
            content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="#1e293b" />
                <g stroke="#ffffff" stroke-width="2" fill="none" opacity="0.5">
                    <path d="${capPath}" stroke-dasharray="4 4" />
                    <path d="${tubePath}" stroke-dasharray="4 4" />
                    <path d="${crimpPath}" stroke-dasharray="4 4" />
                </g>
                <rect x="0" y="${cy}" width="${w}" height="2" fill="#3b82f6" opacity="0.8">
                    <animate attributeName="y" from="0" to="${h}" duration="2s" repeatCount="indefinite" />
                </rect>
            `;
            break;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${defs}${content}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateAnglePreview = (angle: CameraPerspective): string => {
    const w = 400; const h = 300;
    const cx = w/2; const cy = h/2;
    const bg = "#334155";
    
    // Geometry Colors for Tube
    const cTube = "#f1f5f9";
    const cCap = "#475569";
    const cHighlight = "#ffffff";

    let content = '';

    // Helper for Camera Icon
    const drawCamera = (scale = 1, rotate = 0, extraSvg = '') => `
        <g transform="translate(${cx}, ${cy}) rotate(${rotate}) scale(${scale}) translate(-${cx}, -${cy})">
            <!-- Camera Body -->
            <rect x="${cx-60}" y="${cy-40}" width="120" height="80" rx="10" fill="none" stroke="white" stroke-width="4"/>
            <!-- Lens -->
            <circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="white" stroke-width="4"/>
            <!-- Flash/Viewfinder Bump -->
            <rect x="${cx+20}" y="${cy-55}" width="20" height="15" fill="white"/>
            ${extraSvg}
        </g>
    `;

    switch (angle) {
        case CameraPerspective.FRONT:
             // 2D Flat Front View (Tube)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <g transform="translate(${cx}, ${cy})">
                    <!-- Crimp -->
                    <rect x="-35" y="-60" width="70" height="15" fill="${cTube}" />
                    <!-- Body -->
                    <path d="M -25 60 L -35 -45 L 35 -45 L 25 60 Z" fill="${cTube}" />
                    <!-- Cap -->
                    <rect x="-25" y="60" width="50" height="25" fill="${cCap}" />
                    <!-- Highlight -->
                    <rect x="-10" y="-40" width="5" height="90" fill="${cHighlight}" opacity="0.3" />
                    <text x="0" y="110" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">FRONT</text>
                </g>
             `;
            break;

        case CameraPerspective.TOP_DOWN:
             // Flat Lay (Tube)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <g transform="rotate(-90 ${cx} ${cy}) translate(0, -10)">
                    <path d="M ${cx-30} ${cy+65} L ${cx-40} ${cy-45} L ${cx+40} ${cy-45} L ${cx+30} ${cy+65} Z" fill="black" opacity="0.3" filter="blur(4px)" transform="translate(5, 5)" />
                    <rect x="${cx - 25}" y="${cy + 60}" width="50" height="25" fill="${cCap}" />
                    <path d="M ${cx - 25} ${cy + 60} L ${cx - 35} ${cy - 50} L ${cx + 35} ${cy - 50} L ${cx + 25} ${cy + 60} Z" fill="${cTube}" />
                    <rect x="${cx - 35}" y="${cy - 65}" width="70" height="15" fill="#e2e8f0" />
                </g>
                <text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">FLAT LAY</text>
            `;
            break;

        case CameraPerspective.ISOMETRIC:
             // 3D Boxy View (Tube)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <g transform="translate(${cx}, ${cy})">
                    <path d="M -25 60 L -25 85 L 25 85 L 25 60 Z" fill="${cCap}" />
                    <path d="M 25 60 L 25 85 L 45 65 L 45 40 Z" fill="#334155" opacity="0.5"/>
                    <path d="M -25 60 L -35 -45 L 35 -45 L 25 60 Z" fill="${cTube}" />
                    <path d="M 25 60 L 35 -45 L 55 -65 L 45 40 Z" fill="#cbd5e1" />
                    <path d="M -35 -45 L -35 -60 L 35 -60 L 35 -45 Z" fill="#e2e8f0" />
                    <path d="M 35 -45 L 35 -60 L 55 -80 L 55 -65 Z" fill="#94a3b8" />
                    <text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">ISOMETRIC</text>
                </g>
            `;
            break;

        case CameraPerspective.LOW_ANGLE:
             // Hero Shot (Tube)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <g transform="translate(${cx}, ${cy})">
                    <ellipse cx="0" cy="70" rx="35" ry="12" fill="#1e293b" stroke="${cCap}" stroke-width="2"/>
                    <path d="M -35 70 L -35 45 L 35 45 L 35 70 Z" fill="${cCap}" />
                    <path d="M -35 45 L -20 -50 L 20 -50 L 35 45 Z" fill="${cTube}" />
                    <rect x="-20" y="-65" width="40" height="15" fill="#e2e8f0" />
                    <path d="M -200 80 L 200 80 M -200 120 L 200 120" stroke="white" stroke-opacity="0.1" />
                    <text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">LOW ANGLE</text>
                </g>
             `;
            break;

        case CameraPerspective.HIGH_ANGLE:
             // Looking Down (Tube)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <g transform="translate(${cx}, ${cy})">
                    <ellipse cx="0" cy="80" rx="15" ry="8" fill="${cCap}" opacity="0.5"/> 
                    <path d="M -15 80 L -45 -20 L 45 -20 L 15 80 Z" fill="${cTube}" />
                    <path d="M -45 -20 Q 0 -30 45 -20 L 45 -40 Q 0 -50 -45 -40 Z" fill="#e2e8f0" />
                    <text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">HIGH ANGLE</text>
                </g>
             `;
             break;
             
        case CameraPerspective.CLOSE_UP:
             // Macro: Big Camera Icon
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                ${drawCamera(1.8)}
                <text x="${cx}" y="${cy+130}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">MACRO CLOSE-UP</text>
             `;
             break;

        case CameraPerspective.WIDE_ANGLE:
             // Wide Angle: Camera + Field of View Lines (from sketch)
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                <line x1="0" y1="0" x2="${cx-60}" y2="${cy-40}" stroke="white" stroke-width="3" />
                <line x1="${w}" y1="0" x2="${cx+60}" y2="${cy-40}" stroke="white" stroke-width="3" />
                <line x1="0" y1="${h}" x2="${cx-60}" y2="${cy+40}" stroke="white" stroke-width="3" />
                <line x1="${w}" y1="${h}" x2="${cx+60}" y2="${cy+40}" stroke="white" stroke-width="3" />
                ${drawCamera(1)}
                <text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">WIDE ANGLE</text>
             `;
             break;

        case CameraPerspective.DUTCH:
             // Dutch: Tilted Camera Icon
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                ${drawCamera(1, -15)}
                <text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">DUTCH ANGLE</text>
             `;
             break;

        default:
             // Generic Fallback
             content = `
                <rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />
                ${drawCamera(1)}
                <text x="${cx}" y="${cy+80}" fill="white" text-anchor="middle" font-family="sans-serif">${angle}</text>
             `;
             break;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${content}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateColorWheelPreview = (type: ColorTheory): string => {
  // SVG Configuration
  const width = 400; // Increased width for text labels
  const height = 380; 
  const centerX = width / 2;
  const centerY = 150; // Keep wheel at top
  const radius = 120;
  const innerRadius = 70;
  
  // Stroke is white as requested
  const strokeColor = "#ffffff"; 
  const strokeWidth = 5;
  
  // 12 Color Segments (HSL)
  const segments = Array.from({ length: 12 }, (_, i) => {
    const startAngle = (i * 30) - 15; // Offset to center top segment
    const endAngle = startAngle + 30;
    
    // Convert polar to cartesian
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(toRad(startAngle));
    const y1 = centerY + radius * Math.sin(toRad(startAngle));
    const x2 = centerX + radius * Math.cos(toRad(endAngle));
    const y2 = centerY + radius * Math.sin(toRad(endAngle));
    
    const x3 = centerX + innerRadius * Math.cos(toRad(endAngle));
    const y3 = centerY + innerRadius * Math.sin(toRad(endAngle));
    const x4 = centerX + innerRadius * Math.cos(toRad(startAngle));
    const y4 = centerY + innerRadius * Math.sin(toRad(startAngle));

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 0 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}
      Z
    `;
    
    // HSL Color: Start from Red (0) at top (index 0)
    const hue = i * 30;
    const color = `hsl(${hue}, 85%, 60%)`;
    
    return { path: pathData, color, index: i };
  });

  // Helper to draw connection lines/shapes
  const getCoords = (index: number, r: number = innerRadius + (radius - innerRadius)/2) => {
    const angle = (index * 30);
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };

  const drawCircle = (index: number) => {
    const { x, y } = getCoords(index);
    return `<circle cx="${x}" cy="${y}" r="14" fill="transparent" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  };

  // Helper for the bottom shade bar
  const drawShadeBar = (hue: number) => {
      const barWidth = 240;
      const barHeight = 40;
      const startX = (width - barWidth) / 2;
      const startY = 300;
      const blocks = 7;
      const blockWidth = barWidth / blocks;
      
      let rects = '';
      for(let i=0; i<blocks; i++) {
        // Lightness from 40% to 90%
        const l = 40 + (i * (55 / (blocks-1))); 
        const color = `hsl(${hue}, 85%, ${l}%)`;
        rects += `<rect x="${startX + i*blockWidth}" y="${startY}" width="${blockWidth}" height="${barHeight}" fill="${color}" stroke="white" stroke-width="1" />`;
      }
      return `<g>${rects}</g>`;
  };

  let overlay = '';
  let rotation = 0;

  switch (type) {
    case ColorTheory.TONE:
      rotation = 90; 
      overlay += `<text x="40" y="${centerY}" fill="white" font-family="sans-serif" font-weight="bold" font-size="20" dominant-baseline="middle" text-anchor="start">COOL</text>`;
      overlay += `<text x="${width-40}" y="${centerY}" fill="white" font-family="sans-serif" font-weight="bold" font-size="20" dominant-baseline="middle" text-anchor="end">WARM</text>`;
      break;

    case ColorTheory.MONOCHROMATIC:
       overlay += drawShadeBar(120);
       overlay += drawCircle(4);
      break;

    case ColorTheory.COMPLEMENTARY:
      const c1 = getCoords(0);
      const c2 = getCoords(6);
      overlay += `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(6);
      break;

    case ColorTheory.SPLIT_COMPLEMENTARY:
      const sc1 = getCoords(0);
      const sc2 = getCoords(5);
      const sc3 = getCoords(7);
      overlay += `<path d="M ${sc1.x} ${sc1.y} L ${centerX} ${centerY} L ${sc2.x} ${sc2.y} M ${centerX} ${centerY} L ${sc3.x} ${sc3.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(5);
      overlay += drawCircle(7);
      break;

    case ColorTheory.ANALOGOUS:
      const a1 = getCoords(11);
      const a2 = getCoords(1);
      overlay += `<path d="M ${a1.x} ${a1.y} Q ${centerX} ${centerY-radius-20} ${a2.x} ${a2.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" />`;
      overlay += drawCircle(11);
      overlay += drawCircle(0);
      overlay += drawCircle(1);
      break;

    case ColorTheory.TRIADIC:
      const t1 = getCoords(0);
      const t2 = getCoords(4);
      const t3 = getCoords(8);
      overlay += `<polygon points="${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(4);
      overlay += drawCircle(8);
      break;

    case ColorTheory.TETRADIC:
      const q1 = getCoords(0);
      const q2 = getCoords(3);
      const q3 = getCoords(6);
      const q4 = getCoords(9);
      overlay += `<polygon points="${q1.x},${q1.y} ${q2.x},${q2.y} ${q3.x},${q3.y} ${q4.x},${q4.y}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(3);
      overlay += drawCircle(6);
      overlay += drawCircle(9);
      break;

    default:
        overlay += `<circle cx="${centerX}" cy="${centerY}" r="${innerRadius-10}" fill="url(#rainbow)" opacity="0.3" />`;
        break;
  }

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff0000" />
            <stop offset="100%" stop-color="#0000ff" />
        </linearGradient>
      </defs>
      <g transform="rotate(${rotation} ${centerX} ${centerY})">
        ${segments.map(s => `<path d="${s.path}" fill="${s.color}" stroke="white" stroke-width="2" />`).join('')}
      </g>
      <g>
        ${overlay}
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

const App: React.FC = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.STUDIO);
  
  // Inputs
  const [inputImages, setInputImages] = useState<ImageFile[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [styleImages, setStyleImages] = useState<ImageFile[]>([]);
  const [useReference, setUseReference] = useState(true);

  // Mode Specific Configs
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  // Studio
  const [lighting, setLighting] = useState<LightingStyle>(LightingStyle.STUDIO);
  const [perspective, setPerspective] = useState<CameraPerspective>(CameraPerspective.FRONT);
  const [colorTheory, setColorTheory] = useState<ColorTheory>(ColorTheory.AUTO);
  const [referenceTactic, setReferenceTactic] = useState<ReferenceTactic>(ReferenceTactic.FULL);
  // Portrait
  const [portraitEnv, setPortraitEnv] = useState<PortraitEnvironment>(PortraitEnvironment.OFFICE);
  const [portraitVibe, setPortraitVibe] = useState<PortraitVibe>(PortraitVibe.PROFESSIONAL);
  // Interior
  const [interiorStyle, setInteriorStyle] = useState<InteriorStyle>(InteriorStyle.MINIMALIST);
  const [interiorMaterial, setInteriorMaterial] = useState<InteriorMaterial>(InteriorMaterial.WOOD_WHITE);

  // Generation
  const [promptText, setPromptText] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    isGeneratingPrompt: false,
    isGeneratingImage: false,
    error: null,
  });

  // UI Toggles
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeHelper, setActiveHelper] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // --- EFFECT: Theme & History Load ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    
    const savedHistory = localStorage.getItem('n-era-history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
  }, [isDarkMode]);

  // --- EFFECT: Match Reference Logic ---
  useEffect(() => {
    if (currentMode === AppMode.STUDIO && referenceTactic === ReferenceTactic.FULL && styleImages.length > 0) {
        if (lighting !== LightingStyle.MATCH_REFERENCE) setLighting(LightingStyle.MATCH_REFERENCE);
        if (perspective !== CameraPerspective.MATCH_REFERENCE) setPerspective(CameraPerspective.MATCH_REFERENCE);
    }
  }, [referenceTactic, styleImages, currentMode]);

  const activeInputImage = inputImages.length > 0 && inputImages[selectedImageIndex] ? inputImages[selectedImageIndex] : null;

  // --- DATA & PRELOADING ---

  const colorTheoryDescriptions: Record<ColorTheory, string> = {
    [ColorTheory.AUTO]: 'AI automatically analyzes your product\'s color palette and selects the most harmonious background colors.',
    [ColorTheory.MONOCHROMATIC]: 'Uses variations in lightness and saturation of a single color. Clean, cohesive, and minimalist.',
    [ColorTheory.TONE]: 'Uses distinct color temperatures (Warm vs Cool) to set the mood of the image.',
    [ColorTheory.COMPLEMENTARY]: 'Pairs colors from opposite sides of the wheel (e.g., Blue & Orange). High contrast and vibrant.',
    [ColorTheory.SPLIT_COMPLEMENTARY]: 'Uses a base color plus the two colors adjacent to its complement. High contrast but less tension.',
    [ColorTheory.ANALOGOUS]: 'Uses colors that are next to each other on the wheel. Harmonious and pleasing to the eye.',
    [ColorTheory.TRIADIC]: 'Uses three colors evenly spaced around the wheel. Offers high contrast while retaining harmony.',
    [ColorTheory.TETRADIC]: 'Uses four colors arranged into two complementary pairs. Rich, complex, and colorful.'
  };

  // Memoized Helper Data (Single Source of Truth)
  const helperData = useMemo(() => {
    
    // Stable Unsplash URLs
    const getUnsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&q=80`;

    return {
        LIGHTING: {
            title: "Lighting Styles",
            items: Object.values(LightingStyle).map(style => ({
                label: style,
                desc: style.toString(), // Simplified desc for now, usually mapped elsewhere
                imageUrl: generateLightingPreview(style) // INSTANT SVG
            }))
        },
        ANGLE: {
            title: "Camera Angles",
            items: Object.values(CameraPerspective).map(angle => ({
                label: angle,
                desc: angle.toString(),
                imageUrl: generateAnglePreview(angle) // INSTANT SVG
            }))
        },
        COLOR_THEORY: {
            title: "Color Theory",
            items: Object.values(ColorTheory).map(c => ({
                label: c, 
                desc: colorTheoryDescriptions[c as ColorTheory],
                imageUrl: generateColorWheelPreview(c as ColorTheory) // INSTANT SVG
            }))
        },
        PORTRAIT_ENV: {
            title: "Portrait Environment",
            items: [
                { label: 'Modern Office', desc: 'Clean, professional workspace background with soft depth of field.', imageUrl: getUnsplash('1497366216548-37526070297c') },
                { label: 'Cozy Cafe', desc: 'Warm, ambient lighting with blurred coffee shop details. Casual & inviting.', imageUrl: getUnsplash('1559925393-8be033611a8f') },
                { label: 'Nature', desc: 'Natural outdoor setting with greenery and dappled sunlight.', imageUrl: getUnsplash('1441974231531-c6227db76b6e') },
                { label: 'Urban Street', desc: 'City streets, concrete textures, and dynamic urban energy.', imageUrl: getUnsplash('1449824913935-59a10b8d2000') },
                { label: 'Studio Grey', desc: 'Classic neutral grey backdrop for pure focus on the subject.', imageUrl: getUnsplash('1519389950476-29a8e752cc80') },
                { label: 'Luxury Hotel', desc: 'High-end lobby aesthetic with warm lights, wood, and rich textures.', imageUrl: getUnsplash('1566073771259-6a8506099945') },
                { label: 'Sunset Beach', desc: 'Bright, airy coastal vibe with warm sand and sky tones.', imageUrl: getUnsplash('1507525428034-b723cf961d3e') }
            ]
        },
        PORTRAIT_VIBE: {
            title: "Vibe & Lighting",
            items: [
                { label: 'Professional', desc: 'Even, flattering lighting suitable for LinkedIn, CVs, and Corporate.', imageUrl: getUnsplash('1560250097-0b93528c311a') },
                { label: 'Candid & Soft', desc: 'Soft, natural light that feels unposed, authentic and friendly.', imageUrl: getUnsplash('1438761681033-6461ffad8d80') },
                { label: 'Dramatic', desc: 'High contrast shadows and highlights for a moody, artistic look.', imageUrl: getUnsplash('1534528741775-53994a69daeb') },
                { label: 'Golden Hour', desc: 'Warm, orange-hued lighting simulating sunset. Very flattering.', imageUrl: getUnsplash('1495745966610-2a67f2297e5e') },
                { label: 'Black & White', desc: 'Artistic monochromatic processing with strong contrast and timeless feel.', imageUrl: getUnsplash('1570295999919-56ceb5ecca61') }
            ]
        },
        INTERIOR_STYLE: {
            title: "Design Style",
            items: [
                { label: 'Minimalist', desc: 'Clean lines, decluttered spaces, and monochromatic palettes.', imageUrl: getUnsplash('1494438639946-1ebd1d20bf85') },
                { label: 'Industrial', desc: 'Raw elements like exposed brick, metal, and concrete. Loft vibes.', imageUrl: getUnsplash('1534349767944-1e244d23050d') },
                { label: 'Scandinavian', desc: 'Bright, airy, functional with warm wood and white tones. Japandi.', imageUrl: getUnsplash('1598928506311-c55ded91a20c') },
                { label: 'Mid-Century', desc: 'Retro aesthetic with organic curves, teak wood, and olive greens.', imageUrl: getUnsplash('1556228453-efd6c1ff04f6') },
                { label: 'Bohemian', desc: 'Eclectic, layered textures, plants, rugs, and relaxed vibes.', imageUrl: getUnsplash('1522771753033-6a3169f97771') },
                { label: 'Luxury Classic', desc: 'Ornate details, moldings, chandeliers, and sophisticated elegance.', imageUrl: getUnsplash('1600210492486-724fe5c67fb0') },
                { label: 'Cyberpunk', desc: 'Neon lights, dark tones, and futuristic tech elements.', imageUrl: getUnsplash('1515630267439-d943069c6930') }
            ]
        },
        INTERIOR_MATERIAL: {
            title: "Materials & Finishes",
            items: [
                { label: 'Wood & White', desc: 'Warm oak or walnut paired with crisp white surfaces.', imageUrl: getUnsplash('1513694203232-719a280e022f') },
                { label: 'Concrete & Metal', desc: 'Urban, raw textures using grey concrete and black steel.', imageUrl: getUnsplash('1517581177699-33ef28a37f1e') },
                { label: 'Velvet & Gold', desc: 'Soft, plush fabrics accented with metallic gold finishes.', imageUrl: getUnsplash('1505691938271-96e605687858') },
                { label: 'Earth Tones', desc: 'Beige, terracotta, linen, and olive greens for a grounded feel.', imageUrl: getUnsplash('1502005229766-31bf63baa546') },
                { label: 'Marble & Glass', desc: 'Sleek, reflective surfaces denoting high-end luxury.', imageUrl: getUnsplash('1564013799919-ab600027ffc6') },
                { label: 'Vibrant', desc: 'Bold, vibrant color combinations for a playful and energetic look.', imageUrl: getUnsplash('1530018607912-eff2daa1bac4') }
            ]
        }
    };
  }, []);

  // Preload Images Effect (Only for external URLs)
  useEffect(() => {
    if (currentMode === AppMode.PORTRAIT) {
        helperData.PORTRAIT_ENV.items.forEach(i => i.imageUrl && (new Image().src = i.imageUrl));
        helperData.PORTRAIT_VIBE.items.forEach(i => i.imageUrl && (new Image().src = i.imageUrl));
    } else if (currentMode === AppMode.INTERIOR) {
        helperData.INTERIOR_STYLE.items.forEach(i => i.imageUrl && (new Image().src = i.imageUrl));
        helperData.INTERIOR_MATERIAL.items.forEach(i => i.imageUrl && (new Image().src = i.imageUrl));
    }
  }, [currentMode, helperData]);

  // --- ACTIONS ---

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    setPromptText('');
    setGeneratedImageUrl(null);
    setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const handleReset = () => {
      setInputImages([]);
      setStyleImages([]);
      setGeneratedImageUrl(null);
      setPromptText('');
      setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const addToHistory = (imageUrl: string, prompt: string) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          mode: currentMode,
          timestamp: Date.now(),
          imageUrl,
          prompt,
          aspectRatio
      };
      const updatedHistory = [newItem, ...history].slice(0, 15);
      setHistory(updatedHistory);
      localStorage.setItem('n-era-history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    if (!activeInputImage) {
      setStatus(prev => ({ ...prev, error: "Please upload an image first." }));
      return;
    }

    // Step 1: Generate Prompt
    setStatus({ isGeneratingPrompt: true, isGeneratingImage: true, error: null });
    setGeneratedImageUrl(null);

    try {
      const prompt = await generateOptimizedPrompt({
        mode: currentMode,
        inputImage: activeInputImage,
        aspectRatio,
        lighting, perspective, colorTheory,
        styleReferences: styleImages,
        referenceTactic: useReference ? referenceTactic : ReferenceTactic.IGNORE,
        portraitEnv, portraitVibe,
        interiorStyle, interiorMaterial
      });
      
      setPromptText(prompt);

      // Step 2: Generate Image
      const resultBase64 = await generateImage(activeInputImage, prompt, aspectRatio);
      setGeneratedImageUrl(resultBase64);
      addToHistory(resultBase64, prompt);

    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Generation failed" }));
    } finally {
      setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false }));
    }
  };

  const handleRegenerateFromPrompt = async () => {
    if (!activeInputImage || !promptText) return;
    setStatus({ isGeneratingPrompt: false, isGeneratingImage: true, error: null });
    try {
        const resultBase64 = await generateImage(activeInputImage, promptText, aspectRatio);
        setGeneratedImageUrl(resultBase64);
        addToHistory(resultBase64, promptText);
    } catch (err: any) {
        setStatus(prev => ({ ...prev, error: err.message || "Generation failed" }));
    } finally {
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false }));
    }
  };

  // --- RENDER HELPERS ---

  const renderVisualHelper = () => {
    if (!activeHelper) return null;

    // Type assertion to ensure key access
    const data = helperData[activeHelper as keyof typeof helperData];

    if (!data) return null;

    return (
        <VisualHelper 
            isOpen={!!activeHelper}
            onClose={() => setActiveHelper(null)}
            title={data.title}
            description="Select the best option for your vision."
            items={data.items}
        />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-20 lg:pb-0 lg:pl-24">
      
      {/* --- NAVIGATION --- */}
      <Navigation 
        currentMode={currentMode} 
        onModeChange={handleModeChange} 
        onHistoryClick={() => setIsHistoryOpen(true)}
        hasHistory={history.length > 0}
      />

      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={(item) => {
            setGeneratedImageUrl(item.imageUrl);
            setPromptText(item.prompt);
            setAspectRatio(item.aspectRatio);
            setCurrentMode(item.mode);
            setIsHistoryOpen(false);
        }}
        onClear={() => { setHistory([]); localStorage.removeItem('n-era-history'); }}
        onDelete={(id) => {
            const up = history.filter(h => h.id !== id);
            setHistory(up);
            localStorage.setItem('n-era-history', JSON.stringify(up));
        }}
      />

      {renderVisualHelper()}

      {/* --- MAIN LAYOUT (APP SHELL) --- */}
      {/* Using 100dvh for better mobile browser support */}
      <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
        
        {/* --- LEFT: HERO CANVAS (The Result) --- */}
        {/* Mobile: 40% height, Tablet/Desktop: Full height. Shrink-0 prevents crushing on small screens. */}
        <div className="w-full lg:w-1/2 h-[40dvh] lg:h-full shrink-0 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center p-4 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 z-10">
           
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

           {/* Empty/Loading State */}
           {!generatedImageUrl && !status.isGeneratingImage && (
             <div className="text-center z-10 animate-fadeIn px-4">
               <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center mb-4 lg:mb-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transform rotate-6 border border-slate-100 dark:border-slate-700">
                 <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-brand-400" />
               </div>
               <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white mb-1 lg:mb-2">
                 {currentMode === AppMode.STUDIO ? 'Product Studio' : currentMode === AppMode.PORTRAIT ? 'AI Portrait' : 'Interior Design'}
               </h1>
               <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-xs lg:text-sm">
                 {activeInputImage ? "Ready. Configure below & Generate." : "Upload an image to start."}
               </p>
             </div>
           )}

           {/* Generating State (Snake Border) */}
           {(status.isGeneratingImage || status.isGeneratingPrompt) && (
             <div className="absolute z-20 flex flex-col items-center">
                 <div className="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-slate-800/50 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                     <div className="absolute inset-0 snake-border">
                        <span></span><span></span><span></span><span></span>
                     </div>
                     <Sparkles className="w-8 h-8 lg:w-12 lg:h-12 text-brand-400 animate-pulse" />
                 </div>
                 <p className="mt-4 lg:mt-6 text-xs lg:text-sm font-bold text-brand-500 animate-pulse tracking-widest uppercase bg-slate-950/50 px-3 py-1 rounded-full">
                    {status.isGeneratingPrompt ? 'Analyzing Prompt...' : 'Rendering Image...'}
                 </p>
             </div>
           )}

           {/* Result Display */}
           {generatedImageUrl && !status.isGeneratingImage && (
             <div className="relative w-full h-full flex items-center justify-center animate-fadeIn p-2">
                <div 
                  className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden group cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img 
                    src={generatedImageUrl} 
                    alt="AI Result"
                    className="max-w-full max-h-[calc(40dvh-2rem)] lg:max-h-[calc(100vh-6rem)] object-contain transition-all duration-500"
                  />
                  
                  {/* Desktop Hover Zoom Hint */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="text-white drop-shadow-md" size={32} />
                  </div>
                </div>

                {/* Canvas Actions */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 w-max max-w-full px-2">
                    <button
                        onClick={() => downloadImage(generatedImageUrl, `n-era-${currentMode}.png`)}
                        className="bg-brand-400 text-slate-900 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Download size={14} /> Save
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg border border-slate-200 dark:border-slate-700 hover:text-red-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
             </div>
           )}
        </div>

        {/* --- RIGHT: CONTROLS (Scrollable) --- */}
        {/* Flex-1 ensures it takes remaining space. Overflow-y-auto enables scrolling independently. */}
        <div className="flex-1 w-full lg:w-1/2 bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto p-5 lg:p-12 pb-24 lg:pb-12 space-y-8 lg:space-y-10">
            
            {/* Header (Desktop + Mobile Row) */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4 lg:pb-6 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur z-30 pt-2 lg:pt-0">
               <div className="flex items-center gap-3">
                 {/* Logo Icon */}
                 <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-brand-400/10 border border-slate-800 dark:border-slate-700">
                    <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-brand-400" />
                 </div>
                 
                 <span className="font-extrabold text-2xl lg:text-3xl tracking-tight text-slate-900 dark:text-white">
                    N.<span className="text-brand-400">ERA</span>
                 </span>
                 
                 <div className="h-4 lg:h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 lg:mx-2"></div>
                 
                 <span className="text-[10px] lg:text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full uppercase tracking-wide truncate max-w-[100px] lg:max-w-none">
                    {currentMode} Mode
                 </span>
               </div>

               <div className="flex items-center gap-1 lg:gap-2">
                 {(inputImages.length > 0 || generatedImageUrl) && (
                     <Button variant="ghost" className="!p-1.5 lg:!p-2 rounded-full text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={handleReset} title="Reset Canvas">
                         <Trash2 size={16} className="lg:w-[18px] lg:h-[18px]" />
                     </Button>
                 )}
                 <Button variant="ghost" className="!p-1.5 lg:!p-2 rounded-full" onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? <Sun size={16} className="lg:w-[18px] lg:h-[18px]" /> : <Moon size={16} className="lg:w-[18px] lg:h-[18px]" />}
                 </Button>
               </div>
            </div>

            {/* Error Message */}
            {status.error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex gap-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={18} /> {status.error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                {/* 1. UPLOAD SECTION */}
                <section className="animate-fadeIn md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 lg:mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] lg:text-xs font-bold text-slate-500">1</span>
                        Assets
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUpload 
                            label={currentMode === AppMode.PORTRAIT ? "Your Portrait" : currentMode === AppMode.INTERIOR ? "Room Photo" : "Product Shot"}
                            images={inputImages}
                            onImagesChange={setInputImages}
                            selectedIndex={selectedImageIndex}
                            onSelect={setSelectedImageIndex}
                            maxFiles={3}
                        />
                        
                        {/* Style References (Only for Studio) */}
                        {currentMode === AppMode.STUDIO && (
                            <div className="pt-0">
                                <ImageUpload label="Style Reference (Optional)" images={styleImages} onImagesChange={setStyleImages} optional maxFiles={1} />
                                {styleImages.length > 0 && (
                                <div className="mt-4">
                                    <Select 
                                        label="Reference Tactic" 
                                        options={Object.values(ReferenceTactic).filter(t => t !== ReferenceTactic.IGNORE).map(v => ({value: v, label: v}))}
                                        value={referenceTactic}
                                        onChange={(e) => setReferenceTactic(e.target.value as ReferenceTactic)}
                                        className="!py-2.5"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 px-1 leading-tight">
                                        Tip: Select "Complete Mimicry" to automatically match lighting and angle.
                                    </p>
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. CONFIGURATION SECTION */}
                <section className="animate-fadeIn delay-75 md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 lg:mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] lg:text-xs font-bold text-slate-500">2</span>
                        Configuration
                    </h2>
                    
                    <div className="space-y-6 lg:space-y-8">
                        {/* Common: Aspect Ratio */}
                        <div className="max-w-md">
                            <Select 
                                label="Format (Aspect Ratio)" 
                                options={Object.values(AspectRatio).map(v => ({value: v, label: v}))}
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            />
                        </div>

                        {/* STUDIO CONTROLS */}
                        {currentMode === AppMode.STUDIO && (
                            <StudioPanel
                                lighting={lighting}
                                setLighting={setLighting}
                                perspective={perspective}
                                setPerspective={setPerspective}
                                colorTheory={colorTheory}
                                setColorTheory={setColorTheory}
                                onShowHelper={setActiveHelper}
                            />
                        )}

                        {/* PORTRAIT CONTROLS */}
                        {currentMode === AppMode.PORTRAIT && (
                           <PortraitPanel 
                                env={portraitEnv}
                                setEnv={setPortraitEnv}
                                vibe={portraitVibe}
                                setVibe={setPortraitVibe}
                                onShowHelper={setActiveHelper}
                           />
                        )}

                        {/* INTERIOR CONTROLS */}
                        {currentMode === AppMode.INTERIOR && (
                           <InteriorPanel 
                                style={interiorStyle}
                                setStyle={setInteriorStyle}
                                material={interiorMaterial}
                                setMaterial={setInteriorMaterial}
                                onShowHelper={setActiveHelper}
                           />
                        )}
                    </div>
                </section>
            </div>

            {/* ACTION & PROMPT SECTION */}
            <div className="pt-6 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t border-slate-100 dark:border-slate-800 lg:border-none lg:static space-y-6 z-20">
               
               <Button 
                  onClick={handleGenerate}
                  className="w-full h-14 lg:h-16 text-lg lg:text-xl rounded-2xl shadow-xl shadow-brand-400/20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  isLoading={status.isGeneratingImage || status.isGeneratingPrompt}
                  disabled={!activeInputImage}
                  icon={<Wand2 size={24} />}
               >
                 {status.isGeneratingPrompt ? 'Analyzing Scene...' : status.isGeneratingImage ? 'Rendering Pixel Magic...' : 'Generate Transformation'}
               </Button>
               
               {/* PROMPT EDITOR */}
               {promptText && (
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={12} /> AI Prompt Logic
                        </label>
                        <span className="text-[10px] bg-brand-400/10 text-brand-500 px-2 py-1 rounded font-bold uppercase tracking-wide">Editable</span>
                    </div>
                    <textarea 
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="w-full h-24 lg:h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 lg:p-4 text-xs lg:text-sm text-slate-700 dark:text-slate-300 font-mono focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="mt-3 flex justify-end">
                        <Button 
                            onClick={handleRegenerateFromPrompt}
                            variant="secondary"
                            className="!py-1.5 !px-3 !text-xs !rounded-xl"
                            icon={<RefreshCw size={14} />}
                            disabled={status.isGeneratingImage}
                        >
                            Regenerate with edits
                        </Button>
                    </div>
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {isLightboxOpen && generatedImageUrl && (
         <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
            <img src={generatedImageUrl} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={32} /></button>
         </div>
      )}

    </div>
  );
};

export default App;
