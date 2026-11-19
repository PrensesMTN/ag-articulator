window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.2, 0.05, 4.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.18, 0.05);

  // Subtle X-Ray Rim Glow Shell Material (Purple & Solar Yellow Theme)
  const xrayShellMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      cRim: { value: new THREE.Color(0xc084fc) },
      cCore: { value: new THREE.Color(0x1e1035) }
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
      uniform vec3 cCore;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.6);
        vec3 col = mix(cCore, cRim, fresnel);
        gl_FragColor = vec4(col, fresnel * 0.34);
      }
    `
  });

  // Clean Anatomical Wireframe Line Materials
  const outerGridMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.20 });
  const profileLineMat = new THREE.LineBasicMaterial({ color: 0xe9d5ff, transparent: true, opacity: 0.68 });
  const brainLineMat = new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.44 });
  const cerebellumMat = new THREE.LineBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.42 });
  const spineLineMat = new THREE.LineBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.48 });
  const skullBoneMat = new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.45 });
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
  // 1. TRUE HUMAN PROFILE LOFT (Crown -> Forehead -> Nose -> Lips -> Chin -> Neck -> Shoulders)
  // =========================================================================
  // Anatomical sagittal profile slices: [y, zFront, zBack, halfWidthX, zCenterOffset]
  const PROFILE_SLICES = [
    [ 1.18,  0.00,  0.00, 0.02, -0.04], // 0: Crown vertex
    [ 1.13,  0.42, -0.52, 0.48, -0.05], // 1: Upper parietal dome
    [ 1.00,  0.68, -0.82, 0.68, -0.07], // 2: Upper forehead / occiput
    [ 0.82,  0.80, -0.96, 0.76, -0.08], // 3: Mid forehead
    [ 0.60,  0.85, -1.02, 0.78, -0.08], // 4: Lower forehead
    [ 0.42,  0.89, -1.03, 0.77, -0.07], // 5: Supraorbital brow ridge
    [ 0.32,  0.81, -1.00, 0.75, -0.09], // 6: Nasion (bridge indentation) & eye level
    [ 0.18,  0.95, -0.94, 0.73, -0.02], // 7: Mid nasal dorsum & cheekbones
    [ 0.05,  1.07, -0.84, 0.69,  0.04], // 8: Nasal tip (Pronasion) & ear mid
    [-0.03,  0.88, -0.72, 0.65,  0.04], // 9: Subnasale (base of nose)
    [-0.11,  0.93, -0.60, 0.61,  0.08], // 10: Upper lip peak (Labrale superius)
    [-0.17,  0.88, -0.52, 0.58,  0.10], // 11: Oral fissure (mouth line) & occiput base
    [-0.24,  0.91, -0.46, 0.55,  0.14], // 12: Lower lip (Labrale inferius)
    [-0.31,  0.83, -0.44, 0.51,  0.13], // 13: Mentolabial fold (chin crease)
    [-0.43,  0.89, -0.44, 0.45,  0.16], // 14: Chin prominence (Pogonion)
    [-0.53,  0.68, -0.45, 0.40,  0.08], // 15: Under chin (Submental floor)
    [-0.60,  0.32, -0.46, 0.37, -0.07], // 16: Cervicomental throat angle
    [-0.78,  0.26, -0.47, 0.36, -0.10], // 17: Upper-mid neck / larynx
    [-1.02,  0.24, -0.48, 0.37, -0.12], // 18: Mid cervical neck
    [-1.26,  0.23, -0.51, 0.41, -0.14], // 19: Lower neck
    [-1.44,  0.25, -0.58, 0.54, -0.16], // 20: Suprasternal notch / trapezius flare
    [-1.58,  0.30, -0.68, 0.78, -0.19]  // 21: Clavicle & shoulder base
  ];

  function evalAnatomicalSurface(u, sliceIdx) {
    const [y, zF, zB, rx, zOff] = PROFILE_SLICES[sliceIdx];
    const theta = (u - 0.5) * Math.PI * 2.0; // 0 = front (+Z)
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const zMid = (zF + zB) * 0.5;
    const rz = (zF - zB) * 0.5;
    let x = sinT * rx;
    let z = zMid + cosT * rz;

    // Refine anterior facial landmarks so sides don't bulge like a sphere
    if (cosT > 0 && sliceIdx >= 4 && sliceIdx <= 15) {
      const lateralFactor = Math.pow(Math.abs(sinT), 1.4);
      // Narrow nose ridge laterally on slices 6..9
      if (sliceIdx >= 6 && sliceIdx <= 9) {
        const noseSharpness = Math.exp(-Math.pow(x / 0.13, 2));
        const baseZ = 0.80 + cosT * 0.04;
        z = baseZ + (z - baseZ) * noseSharpness;
        // Nostrils (alae) on slice 8-9
        if (sliceIdx >= 8) {
          const ala = Math.exp(-Math.pow((Math.abs(x) - 0.11) / 0.055, 2));
          z += ala * 0.065;
        }
      }
      // Subtle eye socket recesses on slice 6
      if (sliceIdx === 6) {
        const socket = Math.exp(-Math.pow((Math.abs(x) - 0.27) / 0.14, 2));
        z -= socket * 0.075;
      }
      // Taper sides of lips and chin smoothly toward cheeks/jaw
      if (sliceIdx >= 10 && sliceIdx <= 14) {
        z -= lateralFactor * 0.12;
      }
    }

    return new THREE.Vector3(x, y, z);
  }

  const uCols = 40;
  const vRows = PROFILE_SLICES.length - 1;

  // Build smooth translucent X-ray skin mesh for depth perception
  const shellGeo = new THREE.BufferGeometry();
  const shellVerts = [];
  const shellIndices = [];
  for (let iv = 0; iv <= vRows; iv++) {
    for (let iu = 0; iu <= uCols; iu++) {
      const p = evalAnatomicalSurface(iu / uCols, iv);
      shellVerts.push(p.x, p.y, p.z);
    }
  }
  for (let iv = 0; iv < vRows; iv++) {
    for (let iu = 0; iu < uCols; iu++) {
      const a = iv * (uCols + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (uCols + 1) + iu;
      const d = c + 1;
      shellIndices.push(a, c, b, b, c, d);
    }
  }
  shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(shellVerts, 3));
  shellGeo.setIndex(shellIndices);
  shellGeo.computeVertexNormals();
  root.add(new THREE.Mesh(shellGeo, xrayShellMat));

  // Build clean Quad-Wireframe Lines over the anatomical surface
  for (let iv = 1; iv < vRows; iv++) {
    const pts = [];
    for (let iu = 0; iu <= uCols; iu++) {
      pts.push(evalAnatomicalSurface(iu / uCols, iv));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), outerGridMat));
  }
  for (let iu = 0; iu < uCols; iu++) {
    const pts = [];
    for (let iv = 0; iv <= vRows; iv++) {
      pts.push(evalAnatomicalSurface(iu / uCols, iv));
    }
    const isSagittal = (iu === uCols / 2 || iu === 0);
    root.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      isSagittal ? profileLineMat : outerGridMat
    ));
  }

  // =========================================================================
  // 2. INTERNAL CEREBRAL CORTEX & CEREBELLUM WIREFRAME (Inspired by Reference)
  // =========================================================================
  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.64, -0.10);

  [-1, 1].forEach(side => {
    const hemiLines = 11;
    for (let l = 0; l < hemiLines; l++) {
      const vFrac = (l + 1) / (hemiLines + 1);
      const phi = vFrac * Math.PI * 0.78;
      const pts = [];
      const steps = 34;
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI; // 0 = front, PI = back
        const rBase = 0.56;
        // Convoluted cortical gyri/sulci folds
        const gyrus =
          0.024 * Math.sin(theta * 9.0 + l * 1.7) * Math.sin(phi * 7.0) +
          0.015 * Math.cos(theta * 14.0 - l * 2.3);
        const r = rBase + gyrus;
        let bx = side * (0.035 + Math.sin(phi) * Math.sin(theta) * r * 0.92);
        let by = Math.cos(phi) * r * 0.76;
        let bz = Math.cos(theta) * r * 1.24;
        // Temporal lobe tuck under frontal lobe
        if (by < -0.05 && bz > 0.05) {
          by *= 0.65;
        }
        pts.push(new THREE.Vector3(bx, by, bz));
      }
      brainGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), brainLineMat));
    }
  });

  // Cerebellum tucked at posterior cranial base
  for (let c = 0; c < 6; c++) {
    const yf = -0.34 - c * 0.032;
    const w = 0.34 * Math.sin(((c + 1) / 7) * Math.PI);
    const pts = [];
    for (let s = 0; s <= 20; s++) {
      const a = (s / 20) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * w, yf, -0.46 + Math.sin(a) * w * 0.55));
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
    // Natural cervical lordosis curve
    const vz = -0.22 + Math.sin(t * Math.PI) * 0.045 - t * 0.06;

    // Vertebral body cylinder ring
    const bodyPts = [];
    for (let k = 0; k <= 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      bodyPts.push(new THREE.Vector3(Math.cos(a) * 0.11, vy, vz + Math.sin(a) * 0.095));
    }
    spineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bodyPts), spineLineMat));

    // Posterior neural arch & spinous process pointing backward
    const spinousPts = [
      new THREE.Vector3(-0.09, vy + 0.02, vz - 0.04),
      new THREE.Vector3( 0.00, vy - 0.04, vz - 0.23 - (v === 6 ? 0.04 : 0)),
      new THREE.Vector3( 0.09, vy + 0.02, vz - 0.04)
    ];
    spineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(spinousPts), spineLineMat));
  }
  root.add(spineGroup);

  // =========================================================================
  // 4. CRANIOFACIAL SKELETON: EYES, ZYGOMATIC ARCH, MAXILLARY TEETH & EARS
  // =========================================================================
  function createAnatomicalEye(side) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.26, 0.31, 0.72);
    eyeGroup.rotation.y = side * 0.22;

    // Almond eyelid fissure
    const lidPts = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const ex = Math.cos(a) * 0.135;
      const ey = Math.sin(a) * 0.065 * (1.0 - 0.25 * Math.abs(Math.cos(a)));
      const ez = (1.0 - Math.pow(ex / 0.14, 2)) * 0.032;
      lidPts.push(new THREE.Vector3(ex, ey, ez));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lidPts), profileLineMat));

    // Iris & Pupil rings
    [0.062, 0.030].forEach(r => {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.034));
      }
      eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), jawLineMat));
    });

    // Brow arch
    const browPts = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * 2 - 1;
      browPts.push(new THREE.Vector3(
        t * 0.155,
        0.115 + (1 - t * t) * 0.038 - t * side * 0.015,
        0.045 - Math.abs(t) * 0.03
      ));
    }
    eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(browPts), skullBoneMat));

    root.add(eyeGroup);
    return { eyeGroup };
  }

  const leftEye = createAnatomicalEye(1);
  const rightEye = createAnatomicalEye(-1);

  // Zygomatic Arches (Cheekbone-to-Ear Bridges) & Anatomical Ears
  [-1, 1].forEach(side => {
    const zygPts = [
      new THREE.Vector3(side * 0.36, 0.16, 0.64),
      new THREE.Vector3(side * 0.56, 0.14, 0.42),
      new THREE.Vector3(side * 0.64, 0.12, 0.12),
      new THREE.Vector3(side * 0.62, 0.10, -0.06)
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(zygPts), skullBoneMat));

    // Helix & Antihelix Ear Contours
    const helixPts = [];
    const antiPts = [];
    for (let k = 0; k <= 28; k++) {
      const a = -Math.PI * 0.62 + (k / 28) * Math.PI * 1.42;
      helixPts.push(new THREE.Vector3(
        side * (0.69 + Math.cos(a) * 0.022),
        0.08 + Math.sin(a) * 0.19,
        -0.12 + Math.cos(a) * 0.10
      ));
      antiPts.push(new THREE.Vector3(
        side * (0.67 + Math.cos(a) * 0.014),
        0.08 + Math.sin(a) * 0.13,
        -0.11 + Math.cos(a) * 0.06
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(helixPts), profileLineMat));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(antiPts), skullBoneMat));
  });

  // Upper Maxillary Dental Arch
  const upperTeethPts = [];
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI * 0.44 + (k / 24) * Math.PI * 0.88;
    upperTeethPts.push(new THREE.Vector3(Math.sin(a) * 0.23, -0.11, 0.46 + Math.cos(a) * 0.32));
  }
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperTeethPts), teethLineMat));

  // =========================================================================
  // 5. ARTICULATED MANDIBLE (JAWBONE) & LOWER DENTAL ARCH
  // =========================================================================
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.06, -0.02);

  const jawOuterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.52,  0.02, -0.04), // Left TMJ condyle
    new THREE.Vector3(-0.46, -0.28,  0.02), // Left gonion (jaw angle)
    new THREE.Vector3(-0.34, -0.44,  0.38),
    new THREE.Vector3(-0.16, -0.49,  0.72),
    new THREE.Vector3( 0.00, -0.50,  0.80), // Chin (Menton)
    new THREE.Vector3( 0.16, -0.49,  0.72),
    new THREE.Vector3( 0.34, -0.44,  0.38),
    new THREE.Vector3( 0.46, -0.28,  0.02),
    new THREE.Vector3( 0.52,  0.02, -0.04)
  ]);
  jawPivot.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(jawOuterCurve.getPoints(72)),
    jawLineMat
  ));

  // Lower Mandibular Teeth Arch
  const lowerTeethPts = [];
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI * 0.44 + (k / 24) * Math.PI * 0.88;
    lowerTeethPts.push(new THREE.Vector3(Math.sin(a) * 0.21, -0.24, 0.46 + Math.cos(a) * 0.30));
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
    const radius = 0.13 + (r / 8) * 0.035;
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
  palate.position.set(0, 0.04, 0.52);
  root.add(palate);

  for (let p = 0; p < 6; p++) {
    const zPos = 0.24 + p * 0.095;
    const width = 0.22 - Math.pow(p / 6, 1.6) * 0.08;
    const archH = 0.085 - (p / 6) * 0.022;
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
  velumPivot.position.set(0, 0.00, 0.24);
  const velumPts = [
    new THREE.Vector3(-0.12, 0, 0),
    new THREE.Vector3( 0.12, 0, 0),
    new THREE.Vector3( 0.09, -0.08, -0.14),
    new THREE.Vector3(-0.09, -0.08, -0.14),
    new THREE.Vector3(-0.12, 0, 0)
  ];
  velumPivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(velumPts), jawLineMat));
  root.add(velumPivot);

  // Articulated Anatomical Tongue Grid
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
      const zBase = 0.16 + s * 0.58 + tx * Math.sin(s * Math.PI);
      const halfW = 0.17 * Math.sin(Math.pow(s, 0.72) * Math.PI * 0.88 + 0.18);
      const dorsalArch = Math.sin(s * Math.PI) * (0.055 + ty);
      const yBase = -0.22 + s * 0.025 + dorsalArch;

      const pos = item.line.geometry.attributes.position;
      for (let ia = 0; ia <= tArcSegs; ia++) {
        const a = (ia / tArcSegs) * Math.PI;
        const x = Math.cos(a) * halfW;
        const y = yBase + Math.sin(a) * (0.04 + Math.max(0, ty) * 0.22);
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

  // Sculpted Human Cupid's Bow Upper & Lower Lip Wireframes
  const lipGroup = new THREE.Group();
  lipGroup.position.set(0, -0.165, 0.88);
  root.add(lipGroup);

  const upperLip = new THREE.Object3D();
  upperLip.position.set(0, 0.03, 0);
  lipGroup.add(upperLip);

  const upperLipPts = [
    new THREE.Vector3(-0.18,  0.000, -0.055),
    new THREE.Vector3(-0.09,  0.015,  0.012),
    new THREE.Vector3(-0.035, 0.028,  0.042),
    new THREE.Vector3( 0.00,  0.019,  0.045),
    new THREE.Vector3( 0.035, 0.028,  0.042),
    new THREE.Vector3( 0.09,  0.015,  0.012),
    new THREE.Vector3( 0.18,  0.000, -0.055)
  ];
  const upperLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperLipPts), lipLineMat);
  lipGroup.add(upperLipLine);

  const lowerLipPts = [
    new THREE.Vector3(-0.18,  0.000, -0.055),
    new THREE.Vector3(-0.085,-0.022,  0.015),
    new THREE.Vector3( 0.00, -0.030,  0.036),
    new THREE.Vector3( 0.085,-0.022,  0.015),
    new THREE.Vector3( 0.18,  0.000, -0.055)
  ];
  const lowerLipLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lowerLipPts), lipLineMat);
  lipGroup.add(lowerLipLine);

  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.162, 28), waveRingMat.clone());
    wr.position.set(0, -0.165, 0.94);
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
    const protrudeZ = 0.88 + state.lip_round * 0.08;

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
