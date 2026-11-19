window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(1.85, 0.15, 4.95);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.18, 0.12);

  // Materials matching the scientific wireframe vocal-tract aesthetic in Purple & Solar Yellow
  const headGridMat = new THREE.LineBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.28
  });

  const faceLineMat = new THREE.LineBasicMaterial({
    color: 0xc4b5fd,
    transparent: true,
    opacity: 0.78
  });

  const sinusLineMat = new THREE.LineBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.42
  });

  const jawMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.92
  });

  const tractRingMat = new THREE.LineBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 0.72
  });

  const tractRibMat = new THREE.LineBasicMaterial({
    color: 0x7e22ce,
    transparent: true,
    opacity: 0.45
  });

  const tongueWireMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.88
  });

  const lipMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.95
  });

  const glottisMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.95
  });

  const root = new THREE.Group();
  scene.add(root);

  // Helper: Build clean Quad-Grid Wireframe (horizontal latitude rings + vertical meridian lines, no messy diagonals)
  function buildQuadGridLines(rows, cols, evalPointFn, material) {
    const positions = [];
    const grid = [];
    for (let r = 0; r <= rows; r++) {
      const rowPts = [];
      for (let c = 0; c <= cols; c++) {
        rowPts.push(evalPointFn(r / rows, c / cols));
      }
      grid.push(rowPts);
    }
    // Horizontal rings
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = grid[r][c], b = grid[r][c + 1];
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    // Vertical meridians
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const a = grid[r][c], b = grid[r + 1][c];
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineSegments(geo, material);
  }

  // =========================================================================
  // 1. OUTER HUMAN HEAD & NECK QUAD-GRID WIREFRAME
  // =========================================================================
  const headWireframe = buildQuadGridLines(22, 32, (u, v) => {
    const phi = u * Math.PI; // 0 (top) -> PI (bottom)
    const theta = v * Math.PI * 2; // 0 -> 2PI around Y
    let x = Math.sin(phi) * Math.sin(theta) * 0.82;
    let y = Math.cos(phi) * 1.12;
    let z = Math.sin(phi) * Math.cos(theta) * 0.95;

    // Occiput (back of skull) & neck transition
    if (z < 0) {
      if (y > -0.15) z *= 1.10;
      else {
        z *= 0.52;
        x *= 0.68;
      }
    }
    // Jawline taper
    if (y < 0.05 && z > 0) {
      const t = Math.min(1.0, (0.05 - y) / 1.12);
      x *= (1.0 - t * 0.28);
    }
    // Subtle brow & chin contour
    if (z > 0.3) {
      const brow = Math.exp(-Math.pow((y - 0.26) / 0.12, 2)) * Math.exp(-Math.pow(x / 0.55, 2));
      z += brow * 0.08;
      const chin = Math.exp(-Math.pow(x / 0.24, 2) - Math.pow((y + 0.72) / 0.16, 2));
      z += chin * 0.12;
    }
    return new THREE.Vector3(x, y + 0.22, z);
  }, headGridMat);
  root.add(headWireframe);

  // Cylindrical Neck Quad-Grid
  const neckWireframe = buildQuadGridLines(10, 24, (u, v) => {
    const theta = v * Math.PI * 2;
    const rX = 0.44 + u * 0.10;
    const rZ = 0.42 + u * 0.08;
    const y = -0.65 - u * 0.95;
    return new THREE.Vector3(Math.sin(theta) * rX, y, Math.cos(theta) * rZ - 0.16);
  }, headGridMat);
  root.add(neckWireframe);

  // =========================================================================
  // 2. STYLIZED LINE-ART EYES, BROWS, NOSE, SINUS RINGS & EARS (Like Reference)
  // =========================================================================
  function makeLoop(pts, mat, closed = true) {
    const curve = new THREE.CatmullRomCurve3(pts, closed);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
    return new THREE.Line(geo, mat);
  }

  const leftPupilGroup = new THREE.Group();
  const rightPupilGroup = new THREE.Group();

  [-1, 1].forEach(side => {
    const cx = side * 0.31;
    const cy = 0.34;
    const cz = 0.86;

    // Outer & inner eye contour loops
    const eyeOuter = makeLoop([
      new THREE.Vector3(cx - 0.13, cy,        cz - 0.03),
      new THREE.Vector3(cx,        cy + 0.075, cz + 0.02),
      new THREE.Vector3(cx + 0.13, cy,        cz - 0.03),
      new THREE.Vector3(cx,        cy - 0.065, cz + 0.01)
    ], faceLineMat, true);
    root.add(eyeOuter);

    // Eyebrow arch
    const brow = makeLoop([
      new THREE.Vector3(cx - 0.15 * side, cy + 0.12, cz - 0.02),
      new THREE.Vector3(cx,               cy + 0.16, cz + 0.02),
      new THREE.Vector3(cx + 0.14 * side, cy + 0.11, cz - 0.04)
    ], faceLineMat, false);
    root.add(brow);

    // Pupil circle
    const pGroup = side === 1 ? leftPupilGroup : rightPupilGroup;
    pGroup.position.set(cx, cy, cz + 0.015);
    const pupilRing = makeLoop([
      new THREE.Vector3(-0.042, 0, 0),
      new THREE.Vector3(0, 0.045, 0),
      new THREE.Vector3(0.042, 0, 0),
      new THREE.Vector3(0, -0.045, 0)
    ], faceLineMat, true);
    pGroup.add(pupilRing);
    root.add(pGroup);

    // Stylized Double-Loop Ear on sides
    const earOuter = makeLoop([
      new THREE.Vector3(side * 0.81, 0.32,  0.02),
      new THREE.Vector3(side * 0.86, 0.18, -0.10),
      new THREE.Vector3(side * 0.81, -0.04, -0.04),
      new THREE.Vector3(side * 0.78, 0.14,  0.04)
    ], faceLineMat, true);
    root.add(earOuter);

    // Internal Nasal Sinus Oval Rings (just like in reference image)
    const sinus = makeLoop([
      new THREE.Vector3(side * 0.11, 0.24, 0.65),
      new THREE.Vector3(side * 0.16, 0.12, 0.72),
      new THREE.Vector3(side * 0.10, 0.02, 0.66),
      new THREE.Vector3(side * 0.06, 0.13, 0.60)
    ], sinusLineMat, true);
    root.add(sinus);
  });

  // Geometric Nose Bridge & Nostril Wings
  const noseBridge = makeLoop([
    new THREE.Vector3(0, 0.34, 0.89),
    new THREE.Vector3(0, 0.16, 1.03),
    new THREE.Vector3(0, 0.03, 1.08),
    new THREE.Vector3(0, -0.02, 0.94)
  ], faceLineMat, false);
  root.add(noseBridge);

  const noseBase = makeLoop([
    new THREE.Vector3(-0.12, 0.01, 0.92),
    new THREE.Vector3(-0.06, 0.04, 1.05),
    new THREE.Vector3( 0.00, 0.03, 1.08),
    new THREE.Vector3( 0.06, 0.04, 1.05),
    new THREE.Vector3( 0.12, 0.01, 0.92)
  ], faceLineMat, false);
  root.add(noseBase);

  // =========================================================================
  // 3. BOLD CORAL-RED U-SHAPED ARTICULATED MANDIBLE (JAW)
  // =========================================================================
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.04, 0.06);
  root.add(jawPivot);

  const mandibleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.54,  0.02, -0.06), // Left Condyle
    new THREE.Vector3(-0.52, -0.05,  0.02), // Notch
    new THREE.Vector3(-0.50,  0.01,  0.10), // Coronoid peak
    new THREE.Vector3(-0.48, -0.34,  0.14), // Left Gonion (jaw angle)
    new THREE.Vector3(-0.34, -0.52,  0.56),
    new THREE.Vector3( 0.00, -0.58,  0.76), // Chin symphysis
    new THREE.Vector3( 0.34, -0.52,  0.56),
    new THREE.Vector3( 0.48, -0.34,  0.14), // Right Gonion
    new THREE.Vector3( 0.50,  0.01,  0.10), // Coronoid peak
    new THREE.Vector3( 0.52, -0.05,  0.02), // Notch
    new THREE.Vector3( 0.54,  0.02, -0.06)  // Right Condyle
  ]);
  const mandibleTube = new THREE.Mesh(
    new THREE.TubeGeometry(mandibleCurve, 64, 0.017, 8, false),
    jawMat
  );
  jawPivot.add(mandibleTube);

  // =========================================================================
  // 4. INTERNAL STACKED-RING VOCAL TRACT + SOLAR YELLOW TONGUE + PINK LIPS
  // =========================================================================
  const TRACT_SLICES = 28;
  const TRACT_SEGS = 24;

  // Centerline from trachea/glottis -> pharynx -> palate -> oral cavity -> lips
  const tractCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.45, -0.16), // Bottom trachea
    new THREE.Vector3(0, -1.02, -0.14), // Glottis / Larynx
    new THREE.Vector3(0, -0.56, -0.10), // Lower Pharynx
    new THREE.Vector3(0, -0.22, -0.02), // Upper Pharynx / Velum bend
    new THREE.Vector3(0, -0.14,  0.32), // Mid Oral Cavity
    new THREE.Vector3(0, -0.16,  0.64), // Alveolar ridge
    new THREE.Vector3(0, -0.18,  0.88)  // Lips exit
  ]);
  const tractFrames = tractCurve.computeFrenetFrames(TRACT_SLICES, false);

  // Dynamic Vocal Tract Wireframe Geometry (Horizontal Rings + Vertical Ribs)
  const ringVertCount = TRACT_SLICES * TRACT_SEGS * 2;
  const ribVertCount = (TRACT_SLICES - 1) * TRACT_SEGS * 2;

  const ringGeo = new THREE.BufferGeometry();
  const ringPositions = new Float32Array(ringVertCount * 3);
  ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
  const tractRingsMesh = new THREE.LineSegments(ringGeo, tractRingMat);
  root.add(tractRingsMesh);

  const ribGeo = new THREE.BufferGeometry();
  const ribPositions = new Float32Array(ribVertCount * 3);
  ribGeo.setAttribute("position", new THREE.BufferAttribute(ribPositions, 3));
  const tractRibsMesh = new THREE.LineSegments(ribGeo, tractRibMat);
  root.add(tractRibsMesh);

  // Solar Yellow Wireframe Tongue Dome inside Oral Cavity
  const tongueLines = buildQuadGridLines(10, 16, (u, v) => {
    const phi = u * Math.PI * 0.55;
    const theta = v * Math.PI * 2;
    return new THREE.Vector3(
      Math.sin(phi) * Math.sin(theta) * 0.25,
      Math.cos(phi) * 0.22 - 0.14,
      Math.sin(phi) * Math.cos(theta) * 0.34
    );
  }, tongueWireMat);
  const tongueBaseArr = Float32Array.from(tongueLines.geometry.attributes.position.array);
  tongueLines.position.set(0, -0.18, 0.36);
  root.add(tongueLines);

  // Concentric Neon Pink Lip Aperture Rings at Mouth Exit
  const lipGroup = new THREE.Group();
  lipGroup.position.set(0, -0.18, 0.89);
  root.add(lipGroup);

  const lipRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 10, 32), lipMat);
  const lipRingInner = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.011, 8, 28), lipMat);
  lipRingInner.position.z = -0.02;
  lipGroup.add(lipRingOuter, lipRingInner);

  // Glowing Solar Yellow Glottis Ring in Throat
  const glottisRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 28), glottisMat);
  glottisRing.rotation.x = Math.PI / 2;
  glottisRing.position.set(0, -1.02, -0.14);
  root.add(glottisRing);

  function updateVocalTractGeometry(state) {
    const grid = [];
    for (let i = 0; i < TRACT_SLICES; i++) {
      const t = i / (TRACT_SLICES - 1);
      const center = tractCurve.getPointAt(t);
      const N = tractFrames.normals[i];
      const B = tractFrames.binormals[i];

      // Radius profile along vocal tract (trachea -> pharynx -> oral cavity -> lips)
      let rx = 0.17;
      let ry = 0.17;

      if (t < 0.28) {
        // Trachea & Glottis
        rx = 0.16;
        ry = 0.16;
      } else if (t < 0.55) {
        // Pharynx & Velum expansion
        const vExp = state.velum_open * 0.06;
        rx = 0.21 + vExp;
        ry = 0.20 + vExp;
      } else if (t < 0.88) {
        // Oral cavity (widens with jaw_open)
        rx = 0.25 + state.jaw_open * 0.04;
        ry = 0.21 + state.jaw_open * 0.09;
      } else {
        // Lips exit
        const roundScale = 1.0 - state.lip_round * 0.35;
        rx = (0.19 + state.lip_open * 0.03) * roundScale;
        ry = 0.09 + state.lip_open * 0.13;
      }

      const slicePts = [];
      for (let j = 0; j < TRACT_SEGS; j++) {
        const ang = (j / TRACT_SEGS) * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        // Tongue constriction indentation on bottom of oral cavity
        let localRy = ry;
        if (t > 0.48 && t < 0.86 && sinA < 0) {
          const tongueDist = Math.abs((t - 0.48) / 0.38 - state.tongue_x);
          const bulge = Math.exp(-Math.pow(tongueDist / 0.24, 2)) * state.tongue_y * 0.13;
          localRy = Math.max(0.05, ry - bulge);
        }

        const px = center.x + B.x * (cosA * rx) + N.x * (sinA * localRy);
        const py = center.y + B.y * (cosA * rx) + N.y * (sinA * localRy);
        const pz = center.z + B.z * (cosA * rx) + N.z * (sinA * localRy);
        slicePts.push({ x: px, y: py, z: pz });
      }
      grid.push(slicePts);
    }

    let rIdx = 0;
    for (let i = 0; i < TRACT_SLICES; i++) {
      for (let j = 0; j < TRACT_SEGS; j++) {
        const a = grid[i][j];
        const b = grid[i][(j + 1) % TRACT_SEGS];
        ringPositions[rIdx++] = a.x; ringPositions[rIdx++] = a.y; ringPositions[rIdx++] = a.z;
        ringPositions[rIdx++] = b.x; ringPositions[rIdx++] = b.y; ringPositions[rIdx++] = b.z;
      }
    }
    ringGeo.attributes.position.needsUpdate = true;

    let bIdx = 0;
    for (let i = 0; i < TRACT_SLICES - 1; i++) {
      for (let j = 0; j < TRACT_SEGS; j++) {
        const a = grid[i][j];
        const b = grid[i + 1][j];
        ribPositions[bIdx++] = a.x; ribPositions[bIdx++] = a.y; ribPositions[bIdx++] = a.z;
        ribPositions[bIdx++] = b.x; ribPositions[bIdx++] = b.y; ribPositions[bIdx++] = b.z;
      }
    }
    ribGeo.attributes.position.needsUpdate = true;
  }

  function updateFloatingIpaPosition(state) {
    const el = document.getElementById("floatingIpa");
    if (!el) return;
    const v = new THREE.Vector3(0.24, -0.18, 0.94);
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = `${sx.toFixed(1)}px`;
    el.style.top = `${sy.toFixed(1)}px`;
    el.textContent = state.phoneme === "sil" ? "" : state.phoneme;
  }

  function updateKinematics(state, timeMs) {
    // Swing red mandible down when jaw opens
    jawPivot.rotation.x = state.jaw_open * 0.30;

    // Deform Solar Yellow tongue wireframe dome
    const tAttr = tongueLines.geometry.attributes.position;
    const tx = (state.tongue_x - 0.5) * 0.22;
    const ty = (state.tongue_y - 0.25) * 0.20;
    for (let i = 0; i < tAttr.count; i++) {
      const bx = tongueBaseArr[i * 3];
      const by = tongueBaseArr[i * 3 + 1];
      const bz = tongueBaseArr[i * 3 + 2];
      const lift = Math.max(0, by + 0.14) / 0.22;
      tAttr.setXYZ(i, bx, by + lift * ty - state.jaw_open * 0.04, bz + lift * tx);
    }
    tAttr.needsUpdate = true;

    // Deform Pink Lip Rings
    const roundScale = 1.0 - state.lip_round * 0.36;
    const openScaleY = 0.55 + state.lip_open * 0.85;
    const protrude = state.lip_round * 0.08;
    lipGroup.position.set(0, -0.18 - state.jaw_open * 0.03, 0.89 + protrude);
    lipGroup.scale.set(roundScale, openScaleY, 1.0);

    // Subtle eye gaze
    const gx = Math.sin(timeMs * 0.0009) * 0.018;
    const gy = Math.cos(timeMs * 0.0007) * 0.010;
    leftPupilGroup.position.set(0.31 + gx, 0.34 + gy, 0.875);
    rightPupilGroup.position.set(-0.31 + gx, 0.34 + gy, 0.875);

    // Glottis vibration
    const vib = 1.0 + state.glottis_voicing * 0.25 * Math.sin(timeMs * 0.09);
    glottisRing.scale.set(vib, vib, 1.0);

    updateVocalTractGeometry(state);
    updateFloatingIpaPosition(state);
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
      renderer.render(scene, camera);
      drawSpectrum(window.AgSynth.getAnalyser());
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return { startLoop };
})();
