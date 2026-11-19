window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(2.5, 0.16, 4.9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.10, 0.12);

  // Clean Quad-Wireframe Materials (Purple & Solar Yellow Theme)
  const headGridMat = new THREE.LineBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.24
  });

  const featureLineMat = new THREE.LineBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 0.72
  });

  const sinusLineMat = new THREE.LineBasicMaterial({
    color: 0x9333ea,
    transparent: true,
    opacity: 0.45
  });

  const jawLineMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.95
  });

  const palateLineMat = new THREE.LineBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.65
  });

  const tractRingMat = new THREE.LineBasicMaterial({
    color: 0xe9d5ff,
    transparent: true,
    opacity: 0.52
  });

  const tongueLineMat = new THREE.LineBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.82
  });

  const lipLineMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.96
  });

  const waveRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0
  });

  const root = new THREE.Group();
  scene.add(root);

  // =========================================================================
  // 1. REALISTIC HUMAN ANATOMICAL HEAD & NECK (Clean Parametric Quad Grid)
  // =========================================================================
  function evalHumanHeadSurface(u, v) {
    // u in [0, 1] around azimuth (0 = front +Z), v in [0, 1] top-to-bottom
    const theta = (u - 0.5) * Math.PI * 2.0; // 0 at front (+Z)
    const phi = v * Math.PI; // 0 at crown (+Y), PI at submental base (-Y)

    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    // Base cranial vault proportions
    let x = sinP * sinT * 0.78;
    let y = cosP * 1.12;
    let z = sinP * cosT * 0.94;

    // Occipital skull fullness in back & inward taper at nape
    if (z < 0) {
      if (y > -0.18) {
        z *= 1.12;
      } else {
        const napeT = Math.min(1.0, (-0.18 - y) / 0.85);
        z *= (1.12 - napeT * 0.56);
        x *= (1.0 - napeT * 0.24);
      }
    }

    // Temple narrowing & facial taper toward jaw/chin
    if (y > 0.15 && y < 0.65 && Math.abs(x) > 0.45) {
      x *= 0.95;
    }
    if (y < 0.05 && z > -0.1) {
      const jawT = Math.min(1.0, (0.05 - y) / 1.12);
      x *= (1.0 - jawT * 0.30);
      z *= (1.0 - jawT * 0.08);
    }

    // Anterior facial anatomy (z > 0.2)
    if (cosT > 0.15) {
      const frontMask = Math.pow(cosT, 1.4);

      // Supraorbital brow ridge (y ~ 0.28) with subtle glabella dip at center
      const glabellaDip = 1.0 - 0.28 * Math.exp(-Math.pow(x / 0.09, 2));
      const brow = Math.exp(-Math.pow((y - 0.28) / 0.095, 2)) * Math.exp(-Math.pow(x / 0.56, 2));
      z += brow * 0.12 * glabellaDip;

      // Recessed orbital eye sockets (x = +-0.28, y = 0.16)
      const eyeL = Math.pow((x - 0.28) / 0.16, 2) + Math.pow((y - 0.16) / 0.10, 2);
      const eyeR = Math.pow((x + 0.28) / 0.16, 2) + Math.pow((y - 0.16) / 0.10, 2);
      z -= (Math.exp(-eyeL) + Math.exp(-eyeR)) * 0.15;

      // Zygomatic cheekbones (x = +-0.46, y = 0.03) & buccal hollow below
      const cheekL = Math.pow((x - 0.46) / 0.18, 2) + Math.pow((y - 0.03) / 0.13, 2);
      const cheekR = Math.pow((x + 0.46) / 0.18, 2) + Math.pow((y - 0.03) / 0.13, 2);
      z += (Math.exp(-cheekL) + Math.exp(-cheekR)) * 0.085;

      const hollowL = Math.pow((x - 0.42) / 0.18, 2) + Math.pow((y + 0.24) / 0.16, 2);
      const hollowR = Math.pow((x + 0.42) / 0.18, 2) + Math.pow((y + 0.24) / 0.16, 2);
      z -= (Math.exp(-hollowL) + Math.exp(-hollowR)) * 0.055;

      // Anatomical Nose Bridge, Dorsum, Tip & Alae (Nostrils)
      if (y < 0.26 && y > -0.16) {
        const noseSpan = Math.max(0, 1.0 - Math.abs(y + 0.03) / 0.23);
        const ridgeWidth = 0.085 + Math.max(0, (-y + 0.08)) * 0.12;
        const noseBridge = Math.exp(-Math.pow(x / ridgeWidth, 2)) * Math.pow(noseSpan, 0.78);
        z += noseBridge * 0.29 * frontMask;

        const alaL = Math.exp(-Math.pow((x - 0.12) / 0.065, 2) - Math.pow((y + 0.08) / 0.045, 2));
        const alaR = Math.exp(-Math.pow((x + 0.12) / 0.065, 2) - Math.pow((y + 0.08) / 0.045, 2));
        z += (alaL + alaR) * 0.095 * frontMask;
      }

      // Maxillary muzzle & philtrum
      const muzzle = Math.exp(-Math.pow(x / 0.30, 2) - Math.pow((y + 0.26) / 0.15, 2));
      z += muzzle * 0.095 * frontMask;

      // Mentolabial sulcus (dip below lower lip) & Chin prominence (Mental protuberance)
      const sulcus = Math.exp(-Math.pow(x / 0.22, 2) - Math.pow((y + 0.46) / 0.07, 2));
      z -= sulcus * 0.045 * frontMask;

      const chin = Math.exp(-Math.pow(x / 0.22, 2) - Math.pow((y + 0.68) / 0.14, 2));
      z += chin * 0.16 * frontMask;
    }

    // Flatten submental floor under chin into neck transition
    if (y < -0.78) {
      const subT = Math.min(1.0, (-0.78 - y) / 0.34);
      y = -0.78 - subT * 0.08;
      x *= (1.0 - subT * 0.45);
      z = z * (1.0 - subT * 0.45) - subT * 0.08;
    }

    return new THREE.Vector3(x, y + 0.22, z);
  }

  // Build clean latitude (horizontal) & longitude (vertical) wireframe lines
  const headGroup = new THREE.Group();
  const uSegs = 36;
  const vSegs = 26;

  // Horizontal anatomical contour rings
  for (let iv = 1; iv < vSegs; iv++) {
    const v = iv / vSegs;
    const pts = [];
    for (let iu = 0; iu <= uSegs; iu++) {
      pts.push(evalHumanHeadSurface(iu / uSegs, v));
    }
    headGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), headGridMat));
  }

  // Vertical anatomical meridian lines
  for (let iu = 0; iu < uSegs; iu++) {
    const u = iu / uSegs;
    const pts = [];
    for (let iv = 0; iv <= vSegs; iv++) {
      pts.push(evalHumanHeadSurface(u, iv / vSegs));
    }
    const isSagittal = (iu === uSegs / 2);
    headGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      isSagittal ? featureLineMat : headGridMat
    ));
  }
  root.add(headGroup);

  // Anatomical Neck Quad Grid (Cervical & Sternocleidomastoid Contours)
  const neckGroup = new THREE.Group();
  const neckRings = 8;
  const neckCols = 24;
  function evalNeck(u, v) {
    const a = u * Math.PI * 2;
    const y = -0.56 - v * 0.95;
    const flare = Math.pow(v, 1.8) * 0.14;
    const rx = 0.39 + flare;
    const rz = 0.41 + flare * 0.7;
    return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz - 0.15);
  }
  for (let r = 0; r <= neckRings; r++) {
    const pts = [];
    for (let c = 0; c <= neckCols; c++) pts.push(evalNeck(c / neckCols, r / neckRings));
    neckGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), headGridMat));
  }
  for (let c = 0; c < neckCols; c++) {
    const pts = [];
    for (let r = 0; r <= neckRings; r++) pts.push(evalNeck(c / neckCols, r / neckRings));
    neckGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), headGridMat));
  }
  root.add(neckGroup);

  // =========================================================================
  // 2. ANATOMICAL WIREFRAME EYES, EYEBROWS, SINUSES & EARS
  // =========================================================================
  function createAnatomicalWireEye(side) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.28, 0.38, 0.80);
    eyeGroup.rotation.y = side * 0.22;

    // Almond-shaped palpebral fissure (eyelid outline)
    const lidPts = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const ex = Math.cos(a) * 0.145;
      const ey = Math.sin(a) * 0.072 * (1.0 - 0.25 * Math.abs(Math.cos(a)));
      const ez = (1.0 - Math.pow(ex / 0.15, 2)) * 0.035;
      lidPts.push(new THREE.Vector3(ex, ey, ez));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lidPts), featureLineMat));

    // Concentric Iris & Pupil rings
    [0.068, 0.034].forEach((r, idx) => {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.036 + idx * 0.008));
      }
      eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), jawLineMat));
    });

    // Anatomical Eyebrow Arch
    const browPts = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * 2 - 1;
      browPts.push(new THREE.Vector3(
        t * 0.165,
        0.13 + (1 - t * t) * 0.042 - t * side * 0.015,
        0.045 - Math.abs(t) * 0.035
      ));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(browPts), featureLineMat));

    root.add(eyeGroup);
    return { eyeGroup };
  }

  const leftEye = createAnatomicalWireEye(1);
  const rightEye = createAnatomicalWireEye(-1);

  // Maxillary Sinus & Nasal Cartilage Loops
  [-1, 1].forEach(side => {
    const sPts = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      sPts.push(new THREE.Vector3(
        side * (0.14 + Math.cos(a) * 0.06),
        0.15 + Math.sin(a) * 0.12,
        0.74 + Math.cos(a) * 0.05
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sPts), sinusLineMat));

    // Anatomical Ear (Outer Helix + Inner Antihelix)
    const helixPts = [];
    const antiPts = [];
    for (let k = 0; k <= 28; k++) {
      const a = -Math.PI * 0.62 + (k / 28) * Math.PI * 1.42;
      helixPts.push(new THREE.Vector3(
        side * (0.77 + Math.cos(a) * 0.025),
        0.22 + Math.sin(a) * 0.21,
        -0.08 + Math.cos(a) * 0.11
      ));
      antiPts.push(new THREE.Vector3(
        side * (0.75 + Math.cos(a) * 0.015),
        0.22 + Math.sin(a) * 0.14,
        -0.07 + Math.cos(a) * 0.065
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPts), featureLineMat));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(antiPts), sinusLineMat));
  });

  // =========================================================================
  // 3. ARTICULATED U-SHAPED MANDIBLE (SOLAR YELLOW JAW CONTOUR)
  // =========================================================================
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.06, 0.12);

  const jawOuterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.48,  0.05, -0.02), // Left TMJ condyle
    new THREE.Vector3(-0.45, -0.28,  0.04), // Left gonion (jaw angle)
    new THREE.Vector3(-0.34, -0.48,  0.36),
    new THREE.Vector3(-0.16, -0.56,  0.66),
    new THREE.Vector3( 0.00, -0.58,  0.74), // Chin (Menton)
    new THREE.Vector3( 0.16, -0.56,  0.66),
    new THREE.Vector3( 0.34, -0.48,  0.36),
    new THREE.Vector3( 0.45, -0.28,  0.04), // Right gonion
    new THREE.Vector3( 0.48,  0.05, -0.02)  // Right TMJ condyle
  ]);
  jawPivot.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(jawOuterCurve.getPoints(72)),
    jawLineMat
  ));

  // Inner mandibular arch line for 3D bone depth
  const jawInnerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42,  0.03,  0.04),
    new THREE.Vector3(-0.38, -0.23,  0.10),
    new THREE.Vector3(-0.27, -0.41,  0.38),
    new THREE.Vector3( 0.00, -0.49,  0.66),
    new THREE.Vector3( 0.27, -0.41,  0.38),
    new THREE.Vector3( 0.38, -0.23,  0.10),
    new THREE.Vector3( 0.42,  0.03,  0.04)
  ]);
  jawPivot.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(jawInnerCurve.getPoints(56)),
    palateLineMat
  ));
  root.add(jawPivot);

  // =========================================================================
  // 4. INTERNAL VOCAL TRACT: TRACHEA, GLOTTIS, PALATE, TONGUE GRID & LIPS
  // =========================================================================
  // Tracheal Rings & Larynx Glottis inside Neck
  const glottisGroup = new THREE.Group();
  glottisGroup.position.set(0, -1.14, 0.00);
  for (let r = 0; r < 8; r++) {
    const pts = [];
    const radius = 0.15 + (r / 8) * 0.045;
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, r * 0.082, Math.sin(a) * radius * 0.88));
    }
    glottisGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      r === 6 ? jawLineMat : tractRingMat
    ));
  }
  root.add(glottisGroup);

  // Vaulted Hard Palate & Pharyngeal Arch Wireframe Ribs
  const palate = new THREE.Object3D();
  palate.position.set(0, 0.08, 0.48);
  root.add(palate);

  for (let p = 0; p < 6; p++) {
    const zPos = 0.22 + p * 0.105;
    const width = 0.25 - Math.pow(p / 6, 1.6) * 0.09;
    const archH = 0.095 - (p / 6) * 0.025;
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

  // Soft Palate (Velum) Articulating Flap
  const velumPivot = new THREE.Group();
  velumPivot.position.set(0, 0.02, 0.22);
  const velumPts = [
    new THREE.Vector3(-0.14, 0, 0),
    new THREE.Vector3( 0.14, 0, 0),
    new THREE.Vector3( 0.10, -0.09, -0.16),
    new THREE.Vector3(-0.10, -0.09, -0.16),
    new THREE.Vector3(-0.14, 0, 0)
  ];
  velumPivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(velumPts), jawLineMat));
  root.add(velumPivot);

  // Articulated Anatomical Tongue Quad Grid (Tip, Blade, Dorsum, Root)
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
    const tx = (txNorm - 0.5) * 0.22;
    const ty = (tyNorm - 0.25) * 0.22;
    const spinePos = tongueSpineGeom.attributes.position;

    for (const item of tongueLines) {
      const s = item.is / item.total; // 0 = root (back), 1 = tip (front)
      const zBase = 0.14 + s * 0.62 + tx * Math.sin(s * Math.PI);
      const halfW = 0.19 * Math.sin(Math.pow(s, 0.72) * Math.PI * 0.88 + 0.18);
      const dorsalArch = Math.sin(s * Math.PI) * (0.06 + ty);
      const yBase = -0.24 + s * 0.03 + dorsalArch;

      const pos = item.line.geometry.attributes.position;
      for (let ia = 0; ia <= tArcSegs; ia++) {
        const a = (ia / tArcSegs) * Math.PI;
        const x = Math.cos(a) * halfW;
        const y = yBase + Math.sin(a) * (0.045 + Math.max(0, ty) * 0.25);
        pos.setXYZ(ia, x, y, zBase);
        if (ia === tArcSegs / 2) {
          spinePos.setXYZ(item.is, 0, y + 0.005, zBase);
        }
      }
      pos.needsUpdate = true;
    }
    spinePos.needsUpdate = true;
  }
  updateTongueGrid(0.48, 0.32);

  // Anatomical Cupid's Bow Upper & Lower Lip Wireframe Contours
  const lipGroup = new THREE.Group();
  lipGroup.position.set(0, -0.17, 0.89);
  root.add(lipGroup);

  const upperLip = new THREE.Object3D();
  upperLip.position.set(0, 0.03, 0);
  lipGroup.add(upperLip);

  const upperLipPts = [
    new THREE.Vector3(-0.19,  0.000, -0.05),
    new THREE.Vector3(-0.10,  0.014,  0.01),
    new THREE.Vector3(-0.04,  0.028,  0.035),
    new THREE.Vector3( 0.00,  0.018,  0.038),
    new THREE.Vector3( 0.04,  0.028,  0.035),
    new THREE.Vector3( 0.10,  0.014,  0.01),
    new THREE.Vector3( 0.19,  0.000, -0.05)
  ];
  const upperLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperLipPts), lipLineMat);
  lipGroup.add(upperLipLine);

  const lowerLipPts = [
    new THREE.Vector3(-0.19,  0.000, -0.05),
    new THREE.Vector3(-0.09, -0.022,  0.015),
    new THREE.Vector3( 0.00, -0.030,  0.032),
    new THREE.Vector3( 0.09, -0.022,  0.015),
    new THREE.Vector3( 0.19,  0.000, -0.05)
  ];
  const lowerLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lowerLipPts), lipLineMat);
  lipGroup.add(lowerLipLine);

  // Acoustic Wave Rings radiating from Lips
  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.162, 28), waveRingMat.clone());
    wr.position.set(0, -0.17, 0.94);
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
    // U-shaped Jaw rotation
    jawPivot.rotation.x = state.jaw_open * 0.28;
    velumPivot.rotation.x = -state.velum_open * 0.50;

    // Update anatomical tongue quad grid
    updateTongueGrid(state.tongue_x, state.tongue_y);

    // Upper & Lower Lip opening & rounding
    const openAmt = Math.max(0, state.lip_open - 0.10);
    const roundScaleX = 1.0 - state.lip_round * 0.34;
    const protrudeZ = 0.89 + state.lip_round * 0.09;

    lipGroup.position.set(0, -0.17 - state.jaw_open * 0.025, protrudeZ);
    lipGroup.scale.set(roundScaleX, 1.0, 1.0);
    upperLipLine.position.y = openAmt * 0.025;
    lowerLipLine.position.y = -openAmt * 0.085;

    // Subtle natural eye blink
    const blinkCycle = (timeMs % 3800) / 3800;
    const blinkScale = blinkCycle > 0.95
      ? Math.max(0.12, Math.abs(Math.cos(((blinkCycle - 0.95) / 0.05) * Math.PI)))
      : 1.0;
    leftEye.eyeGroup.scale.y = blinkScale;
    rightEye.eyeGroup.scale.y = blinkScale;

    // Trachea/Glottis vibration & acoustic rings
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeSpectrum();
  });

  function startLoop(onTick) {
    resizeSpectrum();
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
