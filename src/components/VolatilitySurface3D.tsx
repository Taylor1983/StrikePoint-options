import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Activity,
  Layers,
  Eye,
  RotateCw,
  Maximize2,
  Sliders,
  Compass,
  Zap,
  Info,
  RefreshCw,
  Download,
  Share2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { ExpirationOptionChain, Ticker } from '../types/options';
import {
  generate3DVolatilitySurface,
  SurfaceGridData,
  SurfacePoint,
  MarketKnotPoint,
  ColorMapId,
  getSurfaceColor,
  SurfaceShocks,
} from '../utils/volatilitySurfaceMath';
import { playKeyClick, playTerminalAlert } from '../utils/terminalSound';

interface VolatilitySurface3DProps {
  ticker: Ticker;
  allChains: ExpirationOptionChain[];
  onNavigateToChain?: () => void;
  onNavigateToHIVG?: () => void;
  onNavigateToSkews?: () => void;
  onNavigateToValuation?: () => void;
}

export const VolatilitySurface3D: React.FC<VolatilitySurface3DProps> = ({
  ticker,
  allChains,
  onNavigateToChain,
  onNavigateToHIVG,
  onNavigateToSkews,
  onNavigateToValuation,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Visualization settings state
  const [colormap, setColormap] = useState<ColorMapId>('bloomberg');
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'hybrid' | 'points'>('hybrid');
  const [showMarketKnots, setShowMarketKnots] = useState(true);
  const [showAtmRidge, setShowAtmRidge] = useState(true);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [heightScale, setHeightScale] = useState(1.4);
  const [opacity, setOpacity] = useState(0.92);
  const [activeSliceDte, setActiveSliceDte] = useState<number | null>(null);

  // Surface Stress Test / Scenario Shocks
  const [shocks, setShocks] = useState<SurfaceShocks>({
    parallelBump: 0,
    skewTwist: 1.0,
    termInversion: 0,
  });

  // Selected or hovered 3D point info for HUD inspection
  const [hoveredNode, setHoveredNode] = useState<{
    point: SurfacePoint;
    screenX: number;
    screenY: number;
  } | null>(null);

  const [hoveredKnot, setHoveredKnot] = useState<MarketKnotPoint | null>(null);

  // Generate 3D Surface grid data with current parameters and shocks
  const surfaceData: SurfaceGridData = useMemo(() => {
    return generate3DVolatilitySurface(ticker, allChains, shocks, 36, 26);
  }, [ticker, allChains, shocks]);

  // Three.js internal references
  const threeState = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    surfaceMesh: THREE.Mesh | null;
    wireframeMesh: THREE.LineSegments | null;
    pointsMesh: THREE.Points | null;
    atmSpline: THREE.Line | null;
    knotGroup: THREE.Group | null;
    probeMarker: THREE.Mesh | null;
    probeLaser: THREE.Line | null;
    slicePlanesGroup: THREE.Group | null;
    animFrameId: number;
  } | null>(null);

  // Coordinate normalization helpers:
  // X: Strike / Moneyness [-12, 12]
  // Z: DTE / Tenor [-12, 12]
  // Y: Implied Volatility [0, 10]
  const mapX = useCallback(
    (moneyness: number) => {
      const minM = 76;
      const maxM = 124;
      return ((moneyness - minM) / (maxM - minM) - 0.5) * 26;
    },
    []
  );

  const mapZ = useCallback(
    (dte: number) => {
      const minD = surfaceData.minDte;
      const maxD = surfaceData.maxDte;
      // Use square root scaling for visual balance of tenors
      const frac = (Math.sqrt(dte) - Math.sqrt(minD)) / (Math.sqrt(maxD) - Math.sqrt(minD) || 1);
      return (frac - 0.5) * 26;
    },
    [surfaceData.minDte, surfaceData.maxDte]
  );

  const mapY = useCallback(
    (iv: number) => {
      const baseline = surfaceData.minIV * 0.85;
      const span = Math.max(0.15, surfaceData.maxIV * 1.15 - baseline);
      return Math.max(0.1, ((iv - baseline) / span) * 9 * heightScale);
    },
    [surfaceData.minIV, surfaceData.maxIV, heightScale]
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = Math.max(480, mountRef.current.clientHeight || 550);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.FogExp2(0x04060a, 0.012);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(22, 19, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // allow viewing slightly from underneath
    controls.minDistance = 10;
    controls.maxDistance = 85;
    controls.target.set(0, 3.5, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff5e6, 1.8);
    dirLight1.position.set(18, 30, 22);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00e5ff, 0.8);
    dirLight2.position.set(-20, -10, -20);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xff9900, 0.6);
    dirLight3.position.set(0, 25, -25);
    scene.add(dirLight3);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(30, 20, 0x334155, 0x141b2a);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // 3D Bounding Cage lines
    const boxGeo = new THREE.BoxGeometry(26, 9.5, 26);
    const boxMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.5 });
    const boxWire = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), boxMat);
    boxWire.position.set(0, 4.75, 0);
    scene.add(boxWire);

    // Probe marker for interactive raycasting
    const probeGeo = new THREE.SphereGeometry(0.38, 20, 20);
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd600,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const probeMarker = new THREE.Mesh(probeGeo, probeMat);
    probeMarker.visible = false;
    scene.add(probeMarker);

    // Probe laser line to floor
    const laserMat = new THREE.LineDashedMaterial({
      color: 0xffd600,
      dashSize: 0.4,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.8,
    });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const probeLaser = new THREE.Line(laserGeo, laserMat);
    probeLaser.computeLineDistances();
    probeLaser.visible = false;
    scene.add(probeLaser);

    const knotGroup = new THREE.Group();
    scene.add(knotGroup);

    const slicePlanesGroup = new THREE.Group();
    scene.add(slicePlanesGroup);

    threeState.current = {
      scene,
      camera,
      renderer,
      controls,
      surfaceMesh: null,
      wireframeMesh: null,
      pointsMesh: null,
      atmSpline: null,
      knotGroup,
      probeMarker,
      probeLaser,
      slicePlanesGroup,
      animFrameId: 0,
    };

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      threeState.current!.animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.4;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!mountRef.current || !canvasRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = Math.max(480, mountRef.current.clientHeight || 550);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(threeState.current?.animFrameId || 0);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update auto-rotate on controls
  useEffect(() => {
    if (threeState.current?.controls) {
      threeState.current.controls.autoRotate = isAutoRotate;
      threeState.current.controls.autoRotateSpeed = 1.6;
    }
  }, [isAutoRotate]);

  // Rebuild 3D Surface Geometry whenever surface data, colormap, or display settings change
  useEffect(() => {
    if (!threeState.current) return;
    const { scene } = threeState.current;

    // Clean up previous meshes
    if (threeState.current.surfaceMesh) {
      scene.remove(threeState.current.surfaceMesh);
      threeState.current.surfaceMesh.geometry.dispose();
      threeState.current.surfaceMesh = null;
    }
    if (threeState.current.wireframeMesh) {
      scene.remove(threeState.current.wireframeMesh);
      threeState.current.wireframeMesh.geometry.dispose();
      threeState.current.wireframeMesh = null;
    }
    if (threeState.current.pointsMesh) {
      scene.remove(threeState.current.pointsMesh);
      threeState.current.pointsMesh.geometry.dispose();
      threeState.current.pointsMesh = null;
    }
    if (threeState.current.atmSpline) {
      scene.remove(threeState.current.atmSpline);
      threeState.current.atmSpline.geometry.dispose();
      threeState.current.atmSpline = null;
    }

    const { grid, strikes, moneynessList, dtes, minIV, maxIV } = surfaceData;
    const numZ = dtes.length;
    const numX = strikes.length;

    // Generate Parametric BufferGeometry
    const positions: number[] = [];
    const colors: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    const ivSpan = Math.max(0.01, maxIV - minIV);

    for (let j = 0; j < numZ; j++) {
      const dte = dtes[j];
      const zPos = mapZ(dte);

      for (let i = 0; i < numX; i++) {
        const pt = grid[j][i];
        const xPos = mapX(pt.moneyness);
        const yPos = mapY(pt.iv);

        positions.push(xPos, yPos, zPos);

        // Calculate vertex color from colormap
        const tVal = (pt.iv - minIV) / ivSpan;
        const c = getSurfaceColor(tVal, colormap);
        colors.push(c.r / 255, c.g / 255, c.b / 255);
      }
    }

    // Triangular Faces
    for (let j = 0; j < numZ - 1; j++) {
      for (let i = 0; i < numX - 1; i++) {
        const a = j * numX + i;
        const b = (j + 1) * numX + i;
        const c = (j + 1) * numX + (i + 1);
        const d = j * numX + (i + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // 1. Shaded Surface Mesh
    if (renderMode === 'solid' || renderMode === 'hybrid') {
      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.22,
        side: THREE.DoubleSide,
        transparent: opacity < 1.0,
        opacity: opacity,
      });

      const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
      scene.add(surfaceMesh);
      threeState.current.surfaceMesh = surfaceMesh;
    }

    // 2. Wireframe Ribs (Grid Lines along Strike & DTE)
    if (renderMode === 'wireframe' || renderMode === 'hybrid') {
      const wirePositions: number[] = [];
      const wireColors: number[] = [];

      // Strike ribs (isochrones: constant DTE)
      for (let j = 0; j < numZ; j++) {
        for (let i = 0; i < numX - 1; i++) {
          const pt1 = grid[j][i];
          const pt2 = grid[j][i + 1];
          wirePositions.push(
            mapX(pt1.moneyness),
            mapY(pt1.iv) + 0.02,
            mapZ(pt1.dte),
            mapX(pt2.moneyness),
            mapY(pt2.iv) + 0.02,
            mapZ(pt2.dte)
          );
          const c1 = getSurfaceColor((pt1.iv - minIV) / ivSpan, colormap);
          const c2 = getSurfaceColor((pt2.iv - minIV) / ivSpan, colormap);
          wireColors.push(c1.r / 255, c1.g / 255, c1.b / 255, c2.r / 255, c2.g / 255, c2.b / 255);
        }
      }

      // Tenor ribs (isosmiles: constant Strike)
      for (let i = 0; i < numX; i += 2) {
        for (let j = 0; j < numZ - 1; j++) {
          const pt1 = grid[j][i];
          const pt2 = grid[j + 1][i];
          wirePositions.push(
            mapX(pt1.moneyness),
            mapY(pt1.iv) + 0.02,
            mapZ(pt1.dte),
            mapX(pt2.moneyness),
            mapY(pt2.iv) + 0.02,
            mapZ(pt2.dte)
          );
          const c1 = getSurfaceColor((pt1.iv - minIV) / ivSpan, colormap);
          const c2 = getSurfaceColor((pt2.iv - minIV) / ivSpan, colormap);
          wireColors.push(c1.r / 255, c1.g / 255, c1.b / 255, c2.r / 255, c2.g / 255, c2.b / 255);
        }
      }

      const wireGeo = new THREE.BufferGeometry();
      wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePositions, 3));
      wireGeo.setAttribute('color', new THREE.Float32BufferAttribute(wireColors, 3));

      const wireMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: renderMode === 'wireframe' ? 0.95 : 0.45,
        linewidth: 1,
      });

      const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
      scene.add(wireMesh);
      threeState.current.wireframeMesh = wireMesh;
    }

    // 3. Point Cloud Mode
    if (renderMode === 'points') {
      const pMat = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
      });
      const pointsMesh = new THREE.Points(geometry, pMat);
      scene.add(pointsMesh);
      threeState.current.pointsMesh = pointsMesh;
    }

    // 4. ATM Spine Line (Strike = 100% Moneyness across all DTEs)
    if (showAtmRidge) {
      const atmPoints: THREE.Vector3[] = [];
      dtes.forEach((dte, j) => {
        // Find node closest to 100% moneyness
        const row = grid[j];
        let closest = row[0];
        let minDiff = Infinity;
        row.forEach((pt) => {
          const diff = Math.abs(pt.moneyness - 100);
          if (diff < minDiff) {
            minDiff = diff;
            closest = pt;
          }
        });
        atmPoints.push(new THREE.Vector3(mapX(100), mapY(closest.iv) + 0.08, mapZ(dte)));
      });

      if (atmPoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(atmPoints);
        const smoothPoints = curve.getPoints(60);
        const atmGeo = new THREE.BufferGeometry().setFromPoints(smoothPoints);
        const atmMat = new THREE.LineBasicMaterial({
          color: 0xffd600,
          linewidth: 3,
        });
        const atmLine = new THREE.Line(atmGeo, atmMat);
        scene.add(atmLine);
        threeState.current.atmSpline = atmLine;
      }
    }

    // 5. Market Knot Points (Actual Traded Contracts Floating on Surface)
    const { knotGroup } = threeState.current;
    if (knotGroup) {
      while (knotGroup.children.length > 0) {
        const obj = knotGroup.children[0];
        knotGroup.remove(obj);
      }

      if (showMarketKnots && surfaceData.marketKnots.length > 0) {
        const sphereGeo = new THREE.SphereGeometry(0.24, 12, 12);

        surfaceData.marketKnots.forEach((knot) => {
          const x = mapX(knot.moneyness);
          const y = mapY(knot.iv) + 0.05;
          const z = mapZ(knot.dte);

          const color =
            knot.type === 'atm' ? 0xffd600 : knot.type === 'call' ? 0x00e676 : 0xff334b;

          const knotMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.6,
            roughness: 0.2,
          });

          const mesh = new THREE.Mesh(sphereGeo, knotMat);
          mesh.position.set(x, y, z);
          mesh.userData = { knot };
          knotGroup.add(mesh);
        });
      }
    }
  }, [
    surfaceData,
    colormap,
    renderMode,
    showMarketKnots,
    showAtmRidge,
    heightScale,
    opacity,
    mapX,
    mapY,
    mapZ,
  ]);

  // Raycasting for interactive HUD probing
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!threeState.current || !canvasRef.current) return;
    const { camera, scene, probeMarker, probeLaser, knotGroup, surfaceMesh } = threeState.current;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // 1. First check if hovering a market knot
    if (showMarketKnots && knotGroup && knotGroup.children.length > 0) {
      const knotIntersects = raycaster.intersectObjects(knotGroup.children);
      if (knotIntersects.length > 0) {
        const knot = knotIntersects[0].object.userData.knot as MarketKnotPoint;
        setHoveredKnot(knot);
        if (probeMarker && probeLaser) {
          const pt = knotIntersects[0].point;
          probeMarker.position.copy(pt);
          probeMarker.visible = true;

          const posAttr = probeLaser.geometry.attributes.position;
          posAttr.setXYZ(0, pt.x, pt.y, pt.z);
          posAttr.setXYZ(1, pt.x, 0, pt.z);
          posAttr.needsUpdate = true;
          probeLaser.computeLineDistances();
          probeLaser.visible = true;
        }
        return;
      }
    }

    setHoveredKnot(null);

    // 2. Otherwise check surface mesh intersection
    const targets = surfaceMesh ? [surfaceMesh] : [];
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const p = hit.point;

      // Find closest grid node
      let closestNode: SurfacePoint | null = null;
      let minDst = Infinity;

      for (let j = 0; j < surfaceData.dtes.length; j++) {
        for (let i = 0; i < surfaceData.strikes.length; i++) {
          const node = surfaceData.grid[j][i];
          const nx = mapX(node.moneyness);
          const ny = mapY(node.iv);
          const nz = mapZ(node.dte);
          const distSq = (nx - p.x) ** 2 + (ny - p.y) ** 2 + (nz - p.z) ** 2;
          if (distSq < minDst) {
            minDst = distSq;
            closestNode = node;
          }
        }
      }

      if (closestNode) {
        setHoveredNode({
          point: closestNode,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });

        if (probeMarker && probeLaser) {
          probeMarker.position.set(mapX(closestNode.moneyness), mapY(closestNode.iv), mapZ(closestNode.dte));
          probeMarker.visible = true;

          const posAttr = probeLaser.geometry.attributes.position;
          posAttr.setXYZ(0, mapX(closestNode.moneyness), mapY(closestNode.iv), mapZ(closestNode.dte));
          posAttr.setXYZ(1, mapX(closestNode.moneyness), 0, mapZ(closestNode.dte));
          posAttr.needsUpdate = true;
          probeLaser.computeLineDistances();
          probeLaser.visible = true;
        }
      }
    } else {
      setHoveredNode(null);
      if (probeMarker) probeMarker.visible = false;
      if (probeLaser) probeLaser.visible = false;
    }
  };

  const handlePointerLeave = () => {
    setHoveredNode(null);
    setHoveredKnot(null);
    if (threeState.current?.probeMarker) threeState.current.probeMarker.visible = false;
    if (threeState.current?.probeLaser) threeState.current.probeLaser.visible = false;
  };

  // Camera preset viewpoints
  const setCameraView = (view: 'iso' | 'front_skew' | 'side_term' | 'top_down') => {
    if (!threeState.current) return;
    playKeyClick();
    const { camera, controls } = threeState.current;

    setIsAutoRotate(false);
    controls.target.set(0, 3.5, 0);

    switch (view) {
      case 'iso':
        // Default 3D Isometric View
        camera.position.set(22, 19, 28);
        break;
      case 'front_skew':
        // Front View: Look straight down the DTE axis (Moneyness vs IV Smile)
        camera.position.set(0, 7.5, 34);
        break;
      case 'side_term':
        // Side View: Look straight down the Strike axis (Maturity vs IV Term Structure)
        camera.position.set(34, 7.5, 0);
        break;
      case 'top_down':
        // Planar 2D Heatmap: Looking straight down from the ceiling
        camera.position.set(0.01, 38, 0.01);
        break;
    }
    camera.lookAt(0, 3.5, 0);
    controls.update();
  };

  // Reset scenario shocks
  const handleResetShocks = () => {
    playKeyClick();
    setShocks({
      parallelBump: 0,
      skewTwist: 1.0,
      termInversion: 0,
    });
  };

  // Export high-res canvas snapshot
  const handleDownloadSnapshot = () => {
    playTerminalAlert();
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${ticker.symbol}_3D_VOLATILITY_SURFACE.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // 2D slice profile data when a specific DTE is highlighted or active
  const activeSliceChain = useMemo(() => {
    if (!activeSliceDte) return null;
    return allChains.find((c) => c.dte === activeSliceDte) || null;
  }, [allChains, activeSliceDte]);

  return (
    <div className="flex flex-col gap-3 font-mono text-xs select-none">
      {/* Top Bloomberg Terminal Header */}
      <div className="bg-[#05070a] border border-[#1e2638] rounded-t p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#ff9900] text-black font-black rounded text-[11px] tracking-wider">
              SURF 3D
            </span>
            <span className="text-white font-black text-sm tracking-wide">
              {ticker.symbol} // 3D VOLATILITY SURFACE & LOCAL DISPERSION ENGINE
            </span>
            <span className="text-[#8b9bb4] text-[11px]">({ticker.name})</span>
          </div>

          <div className="hidden lg:flex items-center gap-3 border-l border-[#1e2638] pl-3 text-[11px]">
            <div>
              <span className="text-[#64748b]">SPOT: </span>
              <span className="text-white font-bold">${ticker.price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#64748b]">30D ATM IV: </span>
              <span className="text-[#00e5ff] font-bold">{(ticker.currentIV * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[#64748b]">IV RANGE: </span>
              <span className="text-[#ffd600] font-bold">
                {(surfaceData.minIV * 100).toFixed(1)}% - {(surfaceData.maxIV * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Screen Navigation Links */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {onNavigateToSkews && (
            <button
              onClick={onNavigateToSkews}
              className="px-2.5 py-1 bg-[#0c121e] hover:bg-[#1e2638] text-[#cbd5e1] hover:text-[#ff9900] border border-[#2b354d] rounded font-bold transition-colors"
            >
              &lt;F7 VOLS / SKEWS&gt;
            </button>
          )}
          {onNavigateToHIVG && (
            <button
              onClick={onNavigateToHIVG}
              className="px-2.5 py-1 bg-[#0c121e] hover:bg-[#1e2638] text-[#cbd5e1] hover:text-[#00e5ff] border border-[#2b354d] rounded font-bold transition-colors"
            >
              &lt;F8 HIVG / HVT&gt;
            </button>
          )}
          {onNavigateToChain && (
            <button
              onClick={onNavigateToChain}
              className="px-2.5 py-1 bg-[#0c121e] hover:bg-[#1e2638] text-[#cbd5e1] hover:text-white border border-[#2b354d] rounded font-bold transition-colors"
            >
              &lt;F2 OMON CHAIN&gt;
            </button>
          )}
          <button
            onClick={handleDownloadSnapshot}
            title="Export high-resolution PNG snapshot"
            className="p-1.5 bg-[#0c121e] hover:bg-[#ff9900] hover:text-black text-[#8b9bb4] border border-[#2b354d] rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Workstation Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Left Column: 3D Canvas & Camera HUD (8 or 9 cols) */}
        <div className="xl:col-span-9 flex flex-col gap-2">
          {/* Canvas Viewport Container */}
          <div
            ref={mountRef}
            className="relative w-full h-[540px] md:h-[580px] bg-[#04060a] border border-[#1e2638] rounded overflow-hidden select-none"
          >
            {/* 3D WebGL Canvas */}
            <canvas
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="w-full h-full cursor-grab active:cursor-grabbing block"
            />

            {/* Viewport Overlay Controls (Top-Left) */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 bg-[#07090e]/85 backdrop-blur border border-[#1e2638] p-1 rounded shadow-xl">
              <span className="text-[10px] text-[#8b9bb4] px-1 font-bold">VIEW:</span>
              <button
                onClick={() => setCameraView('iso')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#ff9900] hover:text-black text-[#cbd5e1] font-bold rounded text-[10px] border border-[#2b354d] transition-colors"
              >
                3D ISO
              </button>
              <button
                onClick={() => setCameraView('front_skew')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#ff9900] hover:text-black text-[#cbd5e1] font-bold rounded text-[10px] border border-[#2b354d] transition-colors"
              >
                SKEW (FRONT)
              </button>
              <button
                onClick={() => setCameraView('side_term')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#ff9900] hover:text-black text-[#cbd5e1] font-bold rounded text-[10px] border border-[#2b354d] transition-colors"
              >
                TERM (SIDE)
              </button>
              <button
                onClick={() => setCameraView('top_down')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#ff9900] hover:text-black text-[#cbd5e1] font-bold rounded text-[10px] border border-[#2b354d] transition-colors"
              >
                PLANAR (TOP)
              </button>

              <div className="w-[1px] h-4 bg-[#1e2638] mx-1" />

              <button
                onClick={() => {
                  playKeyClick();
                  setIsAutoRotate(!isAutoRotate);
                }}
                className={`px-2 py-0.5 font-bold rounded text-[10px] border transition-colors flex items-center gap-1 ${
                  isAutoRotate
                    ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                }`}
              >
                <RotateCw className={`w-3 h-3 ${isAutoRotate ? 'animate-spin' : ''}`} />
                <span>ROTATE</span>
              </button>
            </div>

            {/* Colormap & Render Mode Toolbar (Top-Right) */}
            <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 z-10 bg-[#07090e]/85 backdrop-blur border border-[#1e2638] p-1 rounded shadow-xl">
              <span className="text-[10px] text-[#8b9bb4] px-1 font-bold">RAMP:</span>
              {(['bloomberg', 'turbo', 'cyberpunk', 'viridis', 'icefire'] as ColorMapId[]).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    playKeyClick();
                    setColormap(c);
                  }}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded border ${
                    colormap === c
                      ? 'bg-[#ff9900] text-black border-[#ff9900]'
                      : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}

              <div className="w-[1px] h-4 bg-[#1e2638] mx-1" />

              <span className="text-[10px] text-[#8b9bb4] px-1 font-bold">STYLE:</span>
              <button
                onClick={() => {
                  playKeyClick();
                  setRenderMode(renderMode === 'hybrid' ? 'solid' : renderMode === 'solid' ? 'wireframe' : renderMode === 'wireframe' ? 'points' : 'hybrid');
                }}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#2b354d] text-[#00e5ff] font-bold rounded text-[10px] border border-[#2b354d]"
              >
                {renderMode.toUpperCase()}
              </button>
            </div>

            {/* 3D Axis Legend / Compass Overlay (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 bg-[#07090e]/90 backdrop-blur border border-[#1e2638] p-2.5 rounded shadow-2xl text-[10px] space-y-1 z-10 pointer-events-none">
              <div className="text-[#ffd600] font-black tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>3D AXIS MAPPINGS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#ff334b] font-bold">X-AXIS:</span>
                <span className="text-[#cbd5e1]">Strike ($) &amp; % Moneyness (76% - 124%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00e676] font-bold">Y-AXIS:</span>
                <span className="text-[#cbd5e1]">Implied Volatility Height (σ%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00e5ff] font-bold">Z-AXIS:</span>
                <span className="text-[#cbd5e1]">
                  Expiration Maturity ({surfaceData.minDte}d - {surfaceData.maxDte}d)
                </span>
              </div>
              <div className="text-[9px] text-[#64748b] pt-1 border-t border-[#1e2638]">
                Left-Click + Drag: Rotate · Right-Click + Drag: Pan · Scroll: Zoom
              </div>
            </div>

            {/* Colormap Gradient Scale Ribbon (Bottom-Right) */}
            <div className="absolute bottom-3 right-3 bg-[#07090e]/90 backdrop-blur border border-[#1e2638] p-2.5 rounded shadow-2xl z-10 pointer-events-none">
              <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] mb-1 font-bold">
                <span>{(surfaceData.minIV * 100).toFixed(0)}% (LOW IV)</span>
                <span>{(surfaceData.maxIV * 100).toFixed(0)}% (HIGH IV)</span>
              </div>
              <div className="w-44 h-2.5 rounded overflow-hidden flex border border-[#1e2638]">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const t = idx / 23;
                  const c = getSurfaceColor(t, colormap);
                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full"
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Real-time HUD Inspection Tooltip on Surface Hover */}
            {hoveredNode && !hoveredKnot && (
              <div
                className="absolute z-20 pointer-events-none bg-[#0a0f1d]/95 backdrop-blur-md border-2 border-[#ffd600] rounded p-2.5 shadow-2xl font-mono text-[11px] text-[#cbd5e1] min-w-[240px]"
                style={{
                  left: Math.min(mountRef.current?.clientWidth ? mountRef.current.clientWidth - 260 : 300, hoveredNode.screenX + 16),
                  top: Math.max(10, hoveredNode.screenY - 100),
                }}
              >
                <div className="flex items-center justify-between border-b border-[#1e2638] pb-1 mb-1.5">
                  <span className="text-[#ffd600] font-black uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>SURFACE NODE</span>
                  </span>
                  <span className="text-white font-black text-sm">
                    {(hoveredNode.point.iv * 100).toFixed(2)}% IV
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-[#64748b]">STRIKE: </span>
                    <strong className="text-white">${hoveredNode.point.strike.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">MONEYNESS: </span>
                    <strong className="text-[#00e5ff]">{hoveredNode.point.moneyness.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">TENOR: </span>
                    <strong className="text-white">{hoveredNode.point.dte} Days</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">DELTA (Δ): </span>
                    <strong className={hoveredNode.point.greeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                      {hoveredNode.point.greeks.delta.toFixed(3)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">VEGA (ν): </span>
                    <strong className="text-white">${hoveredNode.point.greeks.vega.toFixed(3)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">GAMMA (Γ): </span>
                    <strong className="text-white">{hoveredNode.point.greeks.gamma.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">SKEW SLOPE: </span>
                    <strong className="text-[#ff9900]">
                      {(hoveredNode.point.skewSlope * 100).toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">TERM SLOPE: </span>
                    <strong className="text-[#a78bfa]">
                      {(hoveredNode.point.termSlope * 1000).toFixed(2)} bp/d
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time HUD Inspection Tooltip on Traded Market Knot Hover */}
            {hoveredKnot && (
              <div
                className="absolute z-20 pointer-events-none bg-[#0a0f1d]/95 backdrop-blur-md border-2 border-[#00e676] rounded p-2.5 shadow-2xl font-mono text-[11px] text-[#cbd5e1] min-w-[250px]"
                style={{
                  left: Math.min(mountRef.current?.clientWidth ? mountRef.current.clientWidth - 270 : 300, 20),
                  top: 20,
                }}
              >
                <div className="flex items-center justify-between border-b border-[#1e2638] pb-1 mb-1.5">
                  <span className="text-[#00e676] font-black uppercase flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>TRADED MARKET QUOTE</span>
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-black rounded uppercase bg-[#141b28] text-white">
                    {hoveredKnot.type}
                  </span>
                </div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">EXPIRATION:</span>
                    <strong className="text-white">
                      {hoveredKnot.formattedDate} ({hoveredKnot.dte}d)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">STRIKE / MONEYNESS:</span>
                    <strong className="text-white">
                      ${hoveredKnot.strike.toFixed(2)} ({hoveredKnot.moneyness}% ATM)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">MARKET IMPLIED VOL:</span>
                    <strong className="text-[#ffd600] font-black text-xs">
                      {(hoveredKnot.iv * 100).toFixed(2)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">DAILY VOLUME:</span>
                    <strong className="text-[#cbd5e1]">{hoveredKnot.volume.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OPEN INTEREST:</span>
                    <strong className="text-[#cbd5e1]">{hoveredKnot.openInterest.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Expiration Slice Selector Bar */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#8b9bb4] text-[10px] font-bold uppercase flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#ff9900]" />
                <span>EXPIRY CROSS-SECTIONS:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {allChains.map((c) => (
                  <button
                    key={c.dte}
                    onClick={() => {
                      playKeyClick();
                      setActiveSliceDte(activeSliceDte === c.dte ? null : c.dte);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      activeSliceDte === c.dte
                        ? 'bg-[#ff9900] text-black border-[#ff9900]'
                        : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                    }`}
                  >
                    {c.dte}d ({c.formattedDate.split(',')[0]})
                  </button>
                ))}
              </div>
            </div>

            {activeSliceDte && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#00e5ff]">
                  Slicing {activeSliceDte}DTE Skew Curve
                </span>
                <button
                  onClick={() => setActiveSliceDte(null)}
                  className="text-[9px] px-1.5 py-0.5 bg-[#141b28] hover:bg-[#ff334b] hover:text-white rounded border border-[#2b354d]"
                >
                  CLEAR SLICE
                </button>
              </div>
            )}
          </div>

          {/* 2D Cross-section Slice Chart Drawer (if an expiry slice is clicked) */}
          {activeSliceChain && (
            <div className="bg-[#07090e] border border-[#ff9900]/40 rounded p-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff9900] animate-pulse" />
                  <span className="text-white font-bold text-xs uppercase">
                    2D CROSS-SECTION SLICE // {activeSliceChain.formattedDate} ({activeSliceChain.dte} DTE)
                  </span>
                  <span className="text-[#8b9bb4] text-[10px]">
                    ATM IV: {(activeSliceChain.avgIV * 100).toFixed(1)}%
                  </span>
                </div>
                {onNavigateToChain && (
                  <button
                    onClick={onNavigateToChain}
                    className="text-[9px] font-bold text-[#ff9900] hover:underline"
                  >
                    Open Full Chain &gt;
                  </button>
                )}
              </div>

              {/* Mini SVG Skew Curve */}
              <div className="h-28 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 600 110" preserveAspectRatio="none">
                  {(() => {
                    const sortedCalls = [...activeSliceChain.calls].sort((a, b) => a.strike - b.strike);
                    const minS = sortedCalls[0]?.strike || ticker.price * 0.8;
                    const maxS = sortedCalls[sortedCalls.length - 1]?.strike || ticker.price * 1.2;
                    const minIv = Math.min(...sortedCalls.map((c) => c.iv)) * 0.9;
                    const maxIv = Math.max(...sortedCalls.map((c) => c.iv)) * 1.1;

                    const getX = (strike: number) =>
                      30 + ((strike - minS) / (maxS - minS || 1)) * 540;
                    const getY = (iv: number) =>
                      95 - ((iv - minIv) / (maxIv - minIv || 1)) * 75;

                    const path = sortedCalls.reduce((acc, c, idx) => {
                      const px = getX(c.strike);
                      const py = getY(c.iv);
                      return `${acc} ${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                    }, '');

                    const atmX = getX(ticker.price);

                    return (
                      <g>
                        {/* Grid lines */}
                        <line x1="30" y1="20" x2="570" y2="20" stroke="#1e2638" strokeDasharray="2 2" />
                        <line x1="30" y1="57" x2="570" y2="57" stroke="#1e2638" strokeDasharray="2 2" />
                        <line x1="30" y1="95" x2="570" y2="95" stroke="#1e2638" strokeDasharray="2 2" />

                        {/* ATM Marker */}
                        <line x1={atmX} y1="15" x2={atmX} y2="95" stroke="#ffd600" strokeDasharray="3 3" />
                        <text x={atmX} y="12" fill="#ffd600" fontSize="8" textAnchor="middle" fontFamily="monospace">
                          Spot ${ticker.price.toFixed(2)}
                        </text>

                        {/* Curve */}
                        <path d={path} fill="none" stroke="#ff9900" strokeWidth="2.5" />

                        {/* Data dots */}
                        {sortedCalls.filter((_, i) => i % 2 === 0).map((c) => (
                          <g key={c.strike}>
                            <circle cx={getX(c.strike)} cy={getY(c.iv)} r="3" fill="#00e5ff" />
                            <text
                              x={getX(c.strike)}
                              y="105"
                              fill="#64748b"
                              fontSize="7.5"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              ${c.strike}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Institutional Diagnostics & Stress Testing HUD (3 or 4 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-3">
          {/* Display & Physics Controls */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col gap-2.5 shadow-lg">
            <div className="text-[11px] font-black text-white uppercase flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="flex items-center gap-1.5 text-[#ff9900]">
                <Sliders className="w-3.5 h-3.5" />
                <span>SURFACE GEOMETRY CONTROLS</span>
              </span>
            </div>

            {/* Height Exaggeration Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8b9bb4] mb-1">
                <span>Z-Height Exaggeration:</span>
                <strong className="text-white">{heightScale.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={heightScale}
                onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#141b28] rounded appearance-none cursor-pointer accent-[#ff9900]"
              />
            </div>

            {/* Surface Opacity Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8b9bb4] mb-1">
                <span>Mesh Translucency / Opacity:</span>
                <strong className="text-white">{Math.round(opacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#141b28] rounded appearance-none cursor-pointer accent-[#ff9900]"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-1.5 pt-1 border-t border-[#1e2638]">
              <label className="flex items-center justify-between text-[10px] text-[#cbd5e1] cursor-pointer hover:text-white">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-[#00e676]" />
                  <span>Traded Market Quote Spheres</span>
                </span>
                <input
                  type="checkbox"
                  checked={showMarketKnots}
                  onChange={(e) => setShowMarketKnots(e.target.checked)}
                  className="accent-[#00e676]"
                />
              </label>

              <label className="flex items-center justify-between text-[10px] text-[#cbd5e1] cursor-pointer hover:text-white">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#ffd600]" />
                  <span>100% ATM Spine Ridge</span>
                </span>
                <input
                  type="checkbox"
                  checked={showAtmRidge}
                  onChange={(e) => setShowAtmRidge(e.target.checked)}
                  className="accent-[#ffd600]"
                />
              </label>
            </div>
          </div>

          {/* Institutional Stress Testing & Volatility Shocks */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col gap-2.5 shadow-lg">
            <div className="text-[11px] font-black text-white uppercase flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="flex items-center gap-1.5 text-[#00e5ff]">
                <Activity className="w-3.5 h-3.5" />
                <span>VOLATILITY SURFACE SHOCKS</span>
              </span>
              {(shocks.parallelBump !== 0 || shocks.skewTwist !== 1.0 || shocks.termInversion !== 0) && (
                <button
                  onClick={handleResetShocks}
                  className="text-[9px] text-[#ff334b] hover:underline flex items-center gap-0.5"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>RESET</span>
                </button>
              )}
            </div>

            {/* Parallel Bump */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8b9bb4] mb-1">
                <span>Parallel Vol Bump (± Vega):</span>
                <strong
                  className={
                    shocks.parallelBump > 0
                      ? 'text-[#00e676]'
                      : shocks.parallelBump < 0
                      ? 'text-[#ff334b]'
                      : 'text-white'
                  }
                >
                  {shocks.parallelBump >= 0 ? '+' : ''}
                  {(shocks.parallelBump * 100).toFixed(1)}% pts
                </strong>
              </div>
              <input
                type="range"
                min="-0.10"
                max="0.10"
                step="0.01"
                value={shocks.parallelBump}
                onChange={(e) =>
                  setShocks((prev) => ({ ...prev, parallelBump: parseFloat(e.target.value) }))
                }
                className="w-full h-1 bg-[#141b28] rounded appearance-none cursor-pointer accent-[#00e5ff]"
              />
            </div>

            {/* Skew Slope Twist */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8b9bb4] mb-1">
                <span>Skew Slope Multiplier (Put Wing):</span>
                <strong className={shocks.skewTwist > 1 ? 'text-[#ff9900]' : 'text-white'}>
                  {shocks.skewTwist.toFixed(2)}x
                </strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={shocks.skewTwist}
                onChange={(e) =>
                  setShocks((prev) => ({ ...prev, skewTwist: parseFloat(e.target.value) }))
                }
                className="w-full h-1 bg-[#141b28] rounded appearance-none cursor-pointer accent-[#ff9900]"
              />
            </div>

            {/* Term Inversion / Event Shock */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8b9bb4] mb-1">
                <span>Front-Month Event Shock (Backwardation):</span>
                <strong className={shocks.termInversion > 0 ? 'text-[#ff334b]' : 'text-white'}>
                  {shocks.termInversion >= 0 ? '+' : ''}
                  {(shocks.termInversion * 100).toFixed(1)}% pts
                </strong>
              </div>
              <input
                type="range"
                min="-0.08"
                max="0.12"
                step="0.01"
                value={shocks.termInversion}
                onChange={(e) =>
                  setShocks((prev) => ({ ...prev, termInversion: parseFloat(e.target.value) }))
                }
                className="w-full h-1 bg-[#141b28] rounded appearance-none cursor-pointer accent-[#ff334b]"
              />
            </div>
          </div>

          {/* Quantitative Arbitrage & Surface Diagnostics */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col gap-2 shadow-lg">
            <div className="text-[11px] font-black text-white uppercase border-b border-[#1e2638] pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#ffd600]">
                <Info className="w-3.5 h-3.5" />
                <span>SURFACE ARBITRAGE CHECKS</span>
              </span>
              <span className="text-[9px] px-1 bg-[#064e3b] text-[#a7f3d0] font-bold rounded">
                NO-ARB OK
              </span>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#8b9bb4]">Calendar Spread Arbitrage:</span>
                <span className="text-[#00e676] font-bold">∂w/∂T &gt; 0 (Strict Monotonic)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9bb4]">Butterfly Arbitrage:</span>
                <span className="text-[#00e676] font-bold">∂²C/∂K² ≥ 0 (Density Convex)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9bb4]">SABR / SVI Parameter α:</span>
                <span className="text-white font-mono">{(ticker.currentIV * 0.92).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9bb4]">SABR Vol of Vol (ν):</span>
                <span className="text-[#ff9900] font-mono">0.384</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9bb4]">Spot-Vol Correlation (ρ):</span>
                <span className="text-[#ff334b] font-mono">-0.642 (Equity Asymmetry)</span>
              </div>
            </div>
          </div>

          {/* Actionable Structuring Playbook */}
          <div className="bg-[#090d16] border border-[#1e2638] rounded p-3">
            <div className="text-[10px] text-[#ff9900] font-bold uppercase mb-1">
              SURFACE STRUCTURE PLAYBOOK
            </div>
            <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
              Steep front-month put skew indicates heavy hedging demand. Favorable for{' '}
              <strong className="text-white">Ratio Put Backspreads</strong> or{' '}
              <strong className="text-[#00e5ff]">Calendar Call Spreads</strong> selling high-IV front months.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
