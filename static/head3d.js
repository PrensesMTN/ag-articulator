window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const getStageW = () => container.clientWidth || window.innerWidth;
  const getStageH = () => container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(32, getStageW() / getStageH(), 0.1, 100);
  camera.position.set(3.2, 0.05, 4.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(getStageW(), getStageH());
  if (getStageW() < 768) camera.position.set(2.5, 0.02, 4.9);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.18, 0.05);

  // Ultra-Clean Holographic Edge-Only Fresnel Shell (No Fleshy/Muddy Bulk)
  const xrayShellMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      cRim: { value: new THREE.Color(0xc084fc) },
      cHighlight: { value: new THREE.Color(0xfef08a) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 cRim;
      uniform vec3 cHighlight;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float ndotv = abs(dot(vNormal, vViewDir));
        float rim = pow(1.0 - ndotv, 3.6);
        vec3 col = mix(cRim, cHighlight, pow(rim, 2.0) * 0.35);
        gl_FragColor = vec4(col, rim * 0.24);
      }
    `
  });

  // Clean Anatomical Wireframe Line Materials
  const outerGridMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.18 });
  const profileLineMat = new THREE.LineBasicMaterial({ color: 0xe9d5ff, transparent: true, opacity: 0.65 });
  const brainLineMat = new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.44 });
  const cerebellumMat = new THREE.LineBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.42 });
  const spineLineMat = new THREE.LineBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.48 });
  const skullBoneMat = new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.36 });
  const teethLineMat = new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.58 });
  const jawLineMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.94 });
  const palateLineMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.65 });
  const tractRingMat = new THREE.LineBasicMaterial({ color: 0xe9d5ff, transparent: true, opacity: 0.48 });
  const tongueLineMat = new THREE.LineBasicMaterial({ color: 0xe879f9, transparent: true, opacity: 0.85 });
  const lipLineMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.96 });
  const waveRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.0
  });

  const root = new THREE.Group();
  scene.add(root);

  // =========================================================================
  // 1. SEAMLESS C2-CONTINUOUS HUMAN HEAD & NECK SURFACE (Soft Cheeks, No Protrusions)
  // =========================================================================
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function evalAnatomicalSurface(u, v) {
    const theta = (u - 0.5) * Math.PI * 2.0; // 0 = front (+Z)
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const headSplit = 0.66;

    if (v <= headSplit) {
      const hv = v / headSplit; // 0 = crown, 1 = cervicomental junction
      const phi = hv * Math.PI * 0.90;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      // Smooth human cranial & facial proportions
      let x = sinP * sinT * 0.73;
      let y = cosP * 1.05 + 0.11;
      let z = sinP * cosT * 0.86 - 0.06;

      // Smooth occipital fullness in back & gentle taper toward nape
      if (cosT < 0) {
        const backMask = Math.pow(-cosT, 1.3);
        const craniumBack = smoothstep(-0.20, 0.35, y);
        const napeTaper = smoothstep(0.05, -0.58, y);
        z -= backMask * craniumBack * 0.11;
        z += backMask * napeTaper * 0.24;
      }

      // Gentle facial oval taper from temples down to jawline (no wide/protruding cheekbones)
      if (y < 0.22) {
        const lowerT = smoothstep(0.22, -0.56, y);
        x *= (1.0 - lowerT * 0.26);
        z *= (1.0 - lowerT * 0.06);
      }

      // Subtle, natural anterior facial landmarks (no harsh ridges)
      if (cosT > 0) {
        const front = Math.pow(cosT, 1.5);

        // Soft supraorbital brow contour
        const brow = Math.exp(-Math.pow((y - 0.33) / 0.11, 2)) * Math.exp(-Math.pow(x / 0.50, 2));
        z += brow * 0.045 * front;

        // Gentle orbital eye recess
        const eyeL = Math.pow((x - 0.26) / 0.15, 2) + Math.pow((y - 0.23) / 0.095, 2);
        const eyeR = Math.pow((x + 0.26) / 0.15, 2) + Math.pow((y - 0.23) / 0.095, 2);
        z -= (Math.exp(-eyeL) + Math.exp(-eyeR)) * 0.052 * front;

        // Very soft, smooth cheek contour (flat/natural, zero protruding cheekbone)
        const cheekL = Math.pow((x - 0.36) / 0.22, 2) + Math.pow((y - 0.03) / 0.18, 2);
        const cheekR = Math.pow((x + 0.36) / 0.22, 2) + Math.pow((y - 0.03) / 0.18, 2);
        z += (Math.exp(-cheekL) + Math.exp(-cheekR)) * 0.014 * front;

        // Refined human nose bridge, tip & soft nostrils
        if (y < 0.30 && y > -0.10) {
          const noseVert = smoothstep(0.30, 0.06, y) * smoothstep(-0.10, 0.03, y);
          const ridgeW = 0.075 + smoothstep(0.24, 0.02, y) * 0.045;
          const noseBridge = Math.exp(-Math.pow(x / ridgeW, 2)) * noseVert;
          z += noseBridge * 0.22 * front;

          const alaL = Math.exp(-Math.pow((x - 0.105) / 0.055, 2) - Math.pow((y + 0.01) / 0.042, 2));
          const alaR = Math.exp(-Math.pow((x + 0.105) / 0.055, 2) - Math.pow((y + 0.01) / 0.042, 2));
          z += (alaL + alaR) * 0.055 * front;
        }

        // Soft upper & lower lip fullness + natural chin
        const upperLip = Math.exp(-Math.pow(x / 0.21, 2) - Math.pow((y + 0.12) / 0.045, 2));
        const oralCrease = Math.exp(-Math.pow(x / 0.20, 2) - Math.pow((y + 0.17) / 0.024, 2));
        const lowerLip = Math.exp(-Math.pow(x / 0.19, 2) - Math.pow((y + 0.22) / 0.045, 2));
        const chinFold = Math.exp(-Math.pow(x / 0.20, 2) - Math.pow((y + 0.30) / 0.05, 2));
        const chin = Math.exp(-Math.pow(x / 0.22, 2) - Math.pow((y + 0.43) / 0.11, 2));

        z += (upperLip * 0.055 - oralCrease * 0.035 + lowerLip * 0.050 - chinFold * 0.030 + chin * 0.095) * front;
      }

      // Smooth submental blend into neck collar at hv -> 1
      const neckBlend = smoothstep(0.84, 1.0, hv);
      if (neckBlend > 0) {
        const neckX = sinT * 0.35;
        const neckY = -0.58;
        const neckZ = -0.10 + cosT * 0.34;
        x = x * (1 - neckBlend) + neckX * neckBlend;
        y = y * (1 - neckBlend) + neckY * neckBlend;
        z = z * (1 - neckBlend) + neckZ * neckBlend;
      }

      return new THREE.Vector3(x, y, z);
    } else {
      // Seamless Cervical Neck -> Clavicle / Shoulder Transition
      const nt = (v - headSplit) / (1.0 - headSplit); // 0..1
      const y = -0.58 - nt * 0.92;
      const flare = Math.pow(nt, 2.1);
      const rx = 0.35 + flare * 0.40;
      const zFront = 0.24 + flare * 0.06;
      const zBack = -0.44 - flare * 0.20;
      const zMid = (zFront + zBack) * 0.5;
      const rz = (zFront - zBack) * 0.5;
      return new THREE.Vector3(sinT * rx, y, zMid + cosT * rz);
    }
  }

  // High-resolution smooth shell for clean normals (zero polygon faceting)
  const shellU = 64;
  const shellV = 48;
  const shellGeo = new THREE.BufferGeometry();
  const shellVerts = [];
  const shellIndices = [];
  for (let iv = 0; iv <= shellV; iv++) {
    for (let iu = 0; iu <= shellU; iu++) {
      const p = evalAnatomicalSurface(iu / shellU, iv / shellV);
      shellVerts.push(p.x, p.y, p.z);
    }
  }
  for (let iv = 0; iv < shellV; iv++) {
    for (let iu = 0; iu < shellU; iu++) {
      const a = iv * (shellU + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (shellU + 1) + iu;
      const d = c + 1;
      shellIndices.push(a, c, b, b, c, d);
    }
  }
  shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(shellVerts, 3));
  shellGeo.setIndex(shellIndices);
  shellGeo.computeVertexNormals();
  root.add(new THREE.Mesh(shellGeo, xrayShellMat));

  // Clean Quad-Wireframe Contours sampled from the exact smooth surface
  const wireU = 36;
  const wireV = 26;
  for (let iv = 1; iv < wireV; iv++) {
    const pts = [];
    for (let iu = 0; iu <= wireU; iu++) {
      pts.push(evalAnatomicalSurface(iu / wireU, iv / wireV));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), outerGridMat));
  }
  for (let iu = 0; iu < wireU; iu++) {
    const pts = [];
    for (let iv = 0; iv <= wireV; iv++) {
      pts.push(evalAnatomicalSurface(iu / wireU, iv / wireV));
    }
    const isSagittal = (iu === wireU / 2 || iu === 0);
    root.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      isSagittal ? profileLineMat : outerGridMat
    ));
  }

  // =========================================================================
  // 2. INTERNAL CEREBRAL CORTEX & CEREBELLUM WIREFRAME
  // =========================================================================
  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.62, -0.10);

  [-1, 1].forEach(side => {
    const hemiLines = 11;
    for (let l = 0; l < hemiLines; l++) {
      const vFrac = (l + 1) / (hemiLines + 1);
      const phi = vFrac * Math.PI * 0.78;
      const pts = [];
      const steps = 34;
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI;
        const rBase = 0.53;
        const gyrus =
          0.022 * Math.sin(theta * 9.0 + l * 1.7) * Math.sin(phi * 7.0) +
          0.014 * Math.cos(theta * 14.0 - l * 2.3);
        const r = rBase + gyrus;
        let bx = side * (0.032 + Math.sin(phi) * Math.sin(theta) * r * 0.90);
        let by = Math.cos(phi) * r * 0.75;
        let bz = Math.cos(theta) * r * 1.22;
        if (by < -0.05 && bz > 0.05) {
          by *= 0.65;
        }
        pts.push(new THREE.Vector3(bx, by, bz));
      }
      brainGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), brainLineMat));
    }
  });

  for (let c = 0; c < 6; c++) {
    const yf = -0.32 - c * 0.030;
    const w = 0.32 * Math.sin(((c + 1) / 7) * Math.PI);
    const pts = [];
    for (let s = 0; s <= 20; s++) {
      const a = (s / 20) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * w, yf, -0.44 + Math.sin(a) * w * 0.55));
    }
    brainGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cerebellumMat));
  }
  root.add(brainGroup);

  // =========================================================================
  // 3. CERVICAL SPINE VERTEBRAE (C1–C7 WITH SPINOUS PROCESSES)
  // =========================================================================
  const spineGroup = new THREE.Group();
  for (let v = 0; v < 7; v++) {
    const t = v / 6;
    const vy = -0.28 - v * 0.175;
    const vz = -0.20 + Math.sin(t * Math.PI) * 0.045 - t * 0.06;

    const bodyPts = [];
    for (let k = 0; k <= 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      bodyPts.push(new THREE.Vector3(Math.cos(a) * 0.105, vy, vz + Math.sin(a) * 0.09));
    }
    spineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bodyPts), spineLineMat));

    const spinousPts = [
      new THREE.Vector3(-0.085, vy + 0.02, vz - 0.04),
      new THREE.Vector3( 0.000, vy - 0.04, vz - 0.21 - (v === 6 ? 0.035 : 0)),
      new THREE.Vector3( 0.085, vy + 0.02, vz - 0.04)
    ];
    spineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(spinousPts), spineLineMat));
  }
  root.add(spineGroup);

  // =========================================================================
  // 4. CRANIOFACIAL FEATURES: EYES, SUBTLE ZYGOMATIC ARCH, TEETH & EARS
  // =========================================================================
  function createAnatomicalEye(side) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.25, 0.24, 0.71);
    eyeGroup.rotation.y = side * 0.22;

    const lidPts = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const ex = Math.cos(a) * 0.13;
      const ey = Math.sin(a) * 0.062 * (1.0 - 0.25 * Math.abs(Math.cos(a)));
      const ez = (1.0 - Math.pow(ex / 0.135, 2)) * 0.030;
      lidPts.push(new THREE.Vector3(ex, ey, ez));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lidPts), profileLineMat));

    [0.058, 0.028].forEach(r => {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.032));
      }
      eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), jawLineMat));
    });

    const browPts = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * 2 - 1;
      browPts.push(new THREE.Vector3(
        t * 0.145,
        0.105 + (1 - t * t) * 0.035 - t * side * 0.012,
        0.042 - Math.abs(t) * 0.028
      ));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(browPts), skullBoneMat));

    root.add(eyeGroup);
    return { eyeGroup };
  }

  const leftEye = createAnatomicalEye(1);
  const rightEye = createAnatomicalEye(-1);

  [-1, 1].forEach(side => {
    // Sleek, non-protruding internal zygomatic arch
    const zygPts = [
      new THREE.Vector3(side * 0.34, 0.12, 0.56),
      new THREE.Vector3(side * 0.49, 0.10, 0.36),
      new THREE.Vector3(side * 0.56, 0.09, 0.10),
      new THREE.Vector3(side * 0.56, 0.08, -0.06)
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(zygPts), skullBoneMat));

    // Anatomical Ear (Helix & Antihelix)
    const helixPts = [];
    const antiPts = [];
    for (let k = 0; k <= 28; k++) {
      const a = -Math.PI * 0.62 + (k / 28) * Math.PI * 1.42;
      helixPts.push(new THREE.Vector3(
        side * (0.69 + Math.cos(a) * 0.022),
        0.08 + Math.sin(a) * 0.18,
        -0.12 + Math.cos(a) * 0.095
      ));
      antiPts.push(new THREE.Vector3(
        side * (0.67 + Math.cos(a) * 0.014),
        0.08 + Math.sin(a) * 0.12,
        -0.11 + Math.cos(a) * 0.055
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPts), profileLineMat));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(antiPts), skullBoneMat));
  });

  // Upper Maxillary Dental Arch
  const upperTeethPts = [];
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI * 0.44 + (k / 24) * Math.PI * 0.88;
    upperTeethPts.push(new THREE.Vector3(Math.sin(a) * 0.21, -0.11, 0.44 + Math.cos(a) * 0.30));
  }
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperTeethPts), teethLineMat));

  // =========================================================================
  // 5. ARTICULATED MANDIBLE (JAWBONE) & LOWER DENTAL ARCH
  // =========================================================================
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.06, -0.02);

  const jawOuterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.48,  0.02, -0.04),
    new THREE.Vector3(-0.43, -0.27,  0.02),
    new THREE.Vector3(-0.31, -0.43,  0.36),
    new THREE.Vector3(-0.15, -0.48,  0.68),
    new THREE.Vector3( 0.00, -0.49,  0.76),
    new THREE.Vector3( 0.15, -0.48,  0.68),
    new THREE.Vector3( 0.31, -0.43,  0.36),
    new THREE.Vector3( 0.43, -0.27,  0.02),
    new THREE.Vector3( 0.48,  0.02, -0.04)
  ]);
  jawPivot.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(jawOuterCurve.getPoints(72)),
    jawLineMat
  ));

  const lowerTeethPts = [];
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI * 0.44 + (k / 24) * Math.PI * 0.88;
    lowerTeethPts.push(new THREE.Vector3(Math.sin(a) * 0.19, -0.23, 0.44 + Math.cos(a) * 0.28));
  }
  jawPivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lowerTeethPts), teethLineMat));
  root.add(jawPivot);

  // =========================================================================
  // 6. INTERNAL VOCAL TRACT: TRACHEA, GLOTTIS, PALATE, TONGUE & LIPS
  // =========================================================================
  const glottisGroup = new THREE.Group();
  glottisGroup.position.set(0, -1.16, 0.04);
  for (let r = 0; r < 8; r++) {
    const pts = [];
    const radius = 0.125 + (r / 8) * 0.032;
    for (let k = 0; k <= 26; k++) {
      const a = (k / 26) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, r * 0.078, Math.sin(a) * radius * 0.85));
    }
    glottisGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      r === 6 ? jawLineMat : tractRingMat
    ));
  }
  root.add(glottisGroup);

  const palate = new THREE.Object3D();
  palate.position.set(0, 0.04, 0.50);
  root.add(palate);

  for (let p = 0; p < 6; p++) {
    const zPos = 0.22 + p * 0.092;
    const width = 0.20 - Math.pow(p / 6, 1.6) * 0.075;
    const archH = 0.080 - (p / 6) * 0.020;
    const archPts = [];
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * Math.PI;
      archPts.push(new THREE.Vector3(
        Math.cos(a) * width,
        -0.06 + Math.sin(a) * archH,
        zPos
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(archPts), palateLineMat));
  }

  const velumPivot = new THREE.Group();
  velumPivot.position.set(0, 0.00, 0.22);
  const velumPts = [
    new THREE.Vector3(-0.11, 0, 0),
    new THREE.Vector3( 0.11, 0, 0),
    new THREE.Vector3( 0.08, -0.08, -0.14),
    new THREE.Vector3(-0.08, -0.08, -0.14),
    new THREE.Vector3(-0.11, 0, 0)
  ];
  velumPivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(velumPts), jawLineMat));
  root.add(velumPivot);

  const tongueGroup = new THREE.Group();
  const tSlices = 12;
  const tArcSegs = 14;
  const tongueLines = [];

  for (let is = 0; is <= tSlices; is++) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array((tArcSegs + 1) * 3), 3));
    const line = new THREE.Line(geom, tongueLineMat);
    tongueGroup.add(line);
    tongueLines.push({ line, is, total: tSlices });
  }
  const tongueSpineGeom = new THREE.BufferGeometry();
  tongueSpineGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array((tSlices + 1) * 3), 3));
  tongueGroup.add(new THREE.Line(tongueSpineGeom, jawLineMat));
  root.add(tongueGroup);

  function updateTongueGrid(txNorm, tyNorm) {
    const tx = (txNorm - 0.5) * 0.20;
    const ty = (tyNorm - 0.25) * 0.20;
    const spinePos = tongueSpineGeom.attributes.position;

    for (const item of tongueLines) {
      const s = item.is / item.total;
      const zBase = 0.15 + s * 0.56 + tx * Math.sin(s * Math.PI);
      const halfW = 0.16 * Math.sin(Math.pow(s, 0.72) * Math.PI * 0.88 + 0.18);
      const dorsalArch = Math.sin(s * Math.PI) * (0.052 + ty);
      const yBase = -0.22 + s * 0.025 + dorsalArch;

      const pos = item.line.geometry.attributes.position;
      for (let ia = 0; ia <= tArcSegs; ia++) {
        const a = (ia / tArcSegs) * Math.PI;
        const x = Math.cos(a) * halfW;
        const y = yBase + Math.sin(a) * (0.038 + Math.max(0, ty) * 0.22);
        pos.setXYZ(ia, x, y, zBase);
        if (ia === tArcSegs / 2) {
          spinePos.setXYZ(item.is, 0, y + 0.004, zBase);
        }
      }
      pos.needsUpdate = true;
    }
    spinePos.needsUpdate = true;
  }
  updateTongueGrid(0.48, 0.32);

  const lipGroup = new THREE.Group();
  lipGroup.position.set(0, -0.165, 0.82);
  root.add(lipGroup);

  const upperLip = new THREE.Object3D();
  upperLip.position.set(0, 0.03, 0);
  lipGroup.add(upperLip);

  const upperLipPts = [
    new THREE.Vector3(-0.17,  0.000, -0.050),
    new THREE.Vector3(-0.085, 0.014,  0.010),
    new THREE.Vector3(-0.032, 0.026,  0.038),
    new THREE.Vector3( 0.000, 0.018,  0.041),
    new THREE.Vector3( 0.032, 0.026,  0.038),
    new THREE.Vector3( 0.085, 0.014,  0.010),
    new THREE.Vector3( 0.17,  0.000, -0.050)
  ];
  const upperLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperLipPts), lipLineMat);
  lipGroup.add(upperLipLine);

  const lowerLipPts = [
    new THREE.Vector3(-0.17,  0.000, -0.050),
    new THREE.Vector3(-0.080,-0.020,  0.014),
    new THREE.Vector3( 0.000,-0.028,  0.034),
    new THREE.Vector3( 0.080,-0.020,  0.014),
    new THREE.Vector3( 0.17,  0.000, -0.050)
  ];
  const lowerLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lowerLipPts), lipLineMat);
  lipGroup.add(lowerLipLine);

  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.162, 28), waveRingMat.clone());
    wr.position.set(0, -0.165, 0.88);
    root.add(wr);
    waveRings.push(wr);
  }

  function projectToScreen(obj3D) {
    const v = new THREE.Vector3();
    obj3D.getWorldPosition(v);
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  function updateCadPins() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 960) return;

    const pins = [
      { obj: palate, el: "pinPalate", tx: w * 0.37, ty: h * 0.24 },
      { obj: upperLip, el: "pinLip", tx: w * 0.62, ty: h * 0.36 },
      { obj: tongueGroup, el: "pinTongue", tx: w * 0.63, ty: h * 0.55 },
      { obj: glottisGroup, el: "pinGlottis", tx: w * 0.38, ty: h * 0.73 }
    ];

    for (const p of pins) {
      const s = projectToScreen(p.obj);
      const line = document.getElementById(p.el + "Line");
      const dot = document.getElementById(p.el + "Dot");
      const box = document.getElementById(p.el + "Box");
      if (!line || !dot || !box) continue;

      const elbowX = p.tx > s.x ? p.tx - 24 : p.tx + 24;
      line.setAttribute("points", `${s.x.toFixed(1)},${s.y.toFixed(1)} ${elbowX.toFixed(1)},${p.ty.toFixed(1)} ${p.tx.toFixed(1)},${p.ty.toFixed(1)}`);
      dot.setAttribute("cx", s.x.toFixed(1));
      dot.setAttribute("cy", s.y.toFixed(1));
      box.setAttribute("transform", `translate(${p.tx.toFixed(1)}, ${p.ty.toFixed(1)})`);
    }
  }

  function updateKinematics(state, timeMs) {
    jawPivot.rotation.x = state.jaw_open * 0.26;
    velumPivot.rotation.x = -state.velum_open * 0.50;
    updateTongueGrid(state.tongue_x, state.tongue_y);

    const openAmt = Math.max(0, state.lip_open - 0.10);
    const roundScaleX = 1.0 - state.lip_round * 0.34;
    const protrudeZ = 0.82 + state.lip_round * 0.08;

    lipGroup.position.set(0, -0.165 - state.jaw_open * 0.025, protrudeZ);
    lipGroup.scale.set(roundScaleX, 1.0, 1.0);
    upperLipLine.position.y = openAmt * 0.024;
    lowerLipLine.position.y = -openAmt * 0.082;

    const blinkCycle = (timeMs % 3800) / 3800;
    const blinkScale = blinkCycle > 0.95
      ? Math.max(0.12, Math.abs(Math.cos(((blinkCycle - 0.95) / 0.05) * Math.PI)))
      : 1.0;
    leftEye.eyeGroup.scale.y = blinkScale;
    rightEye.eyeGroup.scale.y = blinkScale;

    const vib = 1.0 + state.glottis_voicing * 0.12 * Math.sin(timeMs * 0.08);
    glottisGroup.scale.set(vib, 1.0, vib);

    waveRings.forEach((wr, idx) => {
      if (state.glottis_voicing > 0.06) {
        const cycle = ((timeMs * 0.0018 + idx * 0.33) % 1.0);
        const sc = 0.65 + cycle * 2.3;
        wr.scale.set(sc, sc, 1.0);
        wr.position.z = protrudeZ + 0.05 + cycle * 0.85;
        wr.material.opacity = (1.0 - cycle) * 0.52 * state.glottis_voicing;
      } else {
        wr.material.opacity = 0.0;
      }
    });
  }

  const sCanvas = document.getElementById("spectrumCanvas");
  const sCtx = sCanvas.getContext("2d");

  function resizeSpectrum() {
    sCanvas.width = sCanvas.clientWidth * devicePixelRatio;
    sCanvas.height = sCanvas.clientHeight * devicePixelRatio;
  }

  function drawSpectrum(analyser) {
    const w = sCanvas.width;
    const h = sCanvas.height;
    sCtx.clearRect(0, 0, w, h);
    if (!analyser) return;

    const len = analyser.frequencyBinCount;
    const data = new Uint8Array(len);
    analyser.getByteFrequencyData(data);

    const grad = sCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#a855f7");
    grad.addColorStop(1, "#facc15");

    sCtx.strokeStyle = grad;
    sCtx.lineWidth = 2.2;
    sCtx.beginPath();
    const maxBins = Math.floor(len * 0.42);
    const step = w / maxBins;
    let x = 0;
    for (let i = 0; i < maxBins; i++) {
      const v = data[i] / 255.0;
      const y = h - v * (h - 10) - 4;
      if (i === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
      x += step;
    }
    sCtx.stroke();
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(getStageW(), getStageH());
  if (getStageW() < 768) camera.position.set(2.5, 0.02, 4.9);
    resizeSpectrum();
  });

  function startLoop(onTick) {
    handleResize();
    function frame(now) {
      controls.update();
      onTick(now);
      updateKinematics(window.AgSynth.state, now);
      updateCadPins();
      renderer.render(scene, camera);
      drawSpectrum(window.AgSynth.getAnalyser());
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return { startLoop };
})();
