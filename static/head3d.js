window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(2.4, 0.18, 4.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.10, 0.12);

  // Pure Wireframe Materials (Purple & Solar Yellow Theme)
  const headGridMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    wireframe: true,
    transparent: true,
    opacity: 0.20
  });

  const featureWireMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    wireframe: true,
    transparent: true,
    opacity: 0.58
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

  const jawContourMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    wireframe: true,
    transparent: true,
    opacity: 0.88
  });

  const jawLineMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.95
  });

  const tractWireMat = new THREE.MeshBasicMaterial({
    color: 0xe9d5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.42
  });

  const tractRingMat = new THREE.LineBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.65
  });

  const tongueWireMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    wireframe: true,
    transparent: true,
    opacity: 0.75
  });

  const lipRingMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.92
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
  // 1. OUTER WIREFRAME HEAD & NECK GRID (Quad-like Latitude/Longitude Mesh)
  // =========================================================================
  const headGeo = new THREE.SphereGeometry(1.0, 28, 22);
  const hPos = headGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    let x = hPos.getX(i);
    let y = hPos.getY(i);
    let z = hPos.getZ(i);

    x *= 0.80;
    y *= 1.12;
    z *= 0.94;

    if (z < 0) {
      if (y > -0.15) z *= 1.10;
      else {
        z *= 0.58;
        x *= 0.72;
      }
    }

    if (y < 0.05 && z > 0) {
      const t = Math.min(1.0, (0.05 - y) / 1.15);
      x *= (1.0 - t * 0.28);
      z *= (1.0 - t * 0.10);
    }

    // Subtle brow & cheekbone structure
    if (z > 0.35) {
      const brow = Math.exp(-Math.pow((y - 0.26) / 0.10, 2)) * Math.exp(-Math.pow(x / 0.56, 2));
      z += brow * 0.09;

      const cheekL = Math.pow((x - 0.45) / 0.20, 2) + Math.pow((y + 0.02) / 0.14, 2);
      const cheekR = Math.pow((x + 0.45) / 0.20, 2) + Math.pow((y + 0.02) / 0.14, 2);
      z += (Math.exp(-cheekL) + Math.exp(-cheekR)) * 0.07;

      const chin = Math.exp(-Math.pow(x / 0.22, 2) - Math.pow((y + 0.72) / 0.15, 2));
      z += chin * 0.12;
    }

    if (y < -0.82) {
      y = -0.82 + (y + 0.82) * 0.20;
      x *= 0.62;
      z *= 0.62;
    }

    hPos.setXYZ(i, x, y, z);
  }
  const headWire = new THREE.Mesh(headGeo, headGridMat);
  headWire.position.set(0, 0.22, 0.0);
  root.add(headWire);

  // Wireframe Neck Cylinder
  const neckGeo = new THREE.CylinderGeometry(0.42, 0.50, 1.12, 22, 8, true);
  const nPos = neckGeo.attributes.position;
  for (let i = 0; i < nPos.count; i++) {
    let x = nPos.getX(i), y = nPos.getY(i), z = nPos.getZ(i);
    const flare = Math.max(0, (-y - 0.15) / 0.45);
    x *= (1.0 + flare * 0.22);
    z *= 0.90;
    nPos.setXYZ(i, x, y, z);
  }
  const neckWire = new THREE.Mesh(neckGeo, headGridMat);
  neckWire.position.set(0, -1.04, -0.16);
  root.add(neckWire);

  // =========================================================================
  // 2. WIREFRAME NOSE, SINUS LOOPS, CONCENTRIC EYES & EARS
  // =========================================================================
  // Sculpted Wireframe Nose Prism
  const nosePts = [
    new THREE.Vector3(0.00, 0.44, 0.88),
    new THREE.Vector3(0.00, 0.12, 1.14),
    new THREE.Vector3(0.00, 0.04, 0.94),
    new THREE.Vector3(-0.12, 0.06, 0.91),
    new THREE.Vector3(0.00, 0.12, 1.14),
    new THREE.Vector3(0.12, 0.06, 0.91),
    new THREE.Vector3(0.00, 0.04, 0.94)
  ];
  const noseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(nosePts), featureLineMat);
  root.add(noseLine);

  // Nasal / Maxillary Sinus Wireframe Loops (as seen in reference)
  [-1, 1].forEach(side => {
    const sPts = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      sPts.push(new THREE.Vector3(
        side * (0.14 + Math.cos(a) * 0.065),
        0.16 + Math.sin(a) * 0.13,
        0.74 + Math.cos(a) * 0.05
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sPts), sinusLineMat));
  });

  // Concentric Wireframe Eyes & Arched Eyebrows
  function createWireframeEye(side) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.29, 0.38, 0.81);
    eyeGroup.rotation.y = side * 0.20;

    [0.135, 0.095, 0.055, 0.022].forEach((r, idx) => {
      const pts = [];
      for (let k = 0; k <= 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.82, idx * 0.012));
      }
      eyeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), featureLineMat));
    });

    // Arched Wireframe Eyebrow
    const browPts = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * 2 - 1;
      browPts.push(new THREE.Vector3(
        t * 0.16,
        0.16 + (1 - t * t) * 0.045,
        0.03 - Math.abs(t) * 0.03
      ));
    }
    const browLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(browPts), featureLineMat);
    eyeGroup.add(browLine);

    root.add(eyeGroup);
    return { eyeGroup, browLine };
  }

  const leftEye = createWireframeEye(1);
  const rightEye = createWireframeEye(-1);

  // Wireframe Ears
  [-1, 1].forEach(side => {
    const earPts = [];
    for (let k = 0; k <= 28; k++) {
      const a = -Math.PI * 0.65 + (k / 28) * Math.PI * 1.45;
      earPts.push(new THREE.Vector3(
        side * (0.79 + Math.cos(a) * 0.03),
        0.22 + Math.sin(a) * 0.21,
        -0.06 + Math.cos(a) * 0.11
      ));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(earPts), featureLineMat));
  });

  // =========================================================================
  // 3. ARTICULATED U-SHAPED WIREFRAME MANDIBLE (JAW CONTOUR)
  // =========================================================================
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.04, 0.14);

  const jawCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46,  0.04, -0.02),
    new THREE.Vector3(-0.44, -0.26,  0.04),
    new THREE.Vector3(-0.34, -0.46,  0.34),
    new THREE.Vector3(-0.16, -0.54,  0.64),
    new THREE.Vector3( 0.00, -0.56,  0.72),
    new THREE.Vector3( 0.16, -0.54,  0.64),
    new THREE.Vector3( 0.34, -0.46,  0.34),
    new THREE.Vector3( 0.44, -0.26,  0.04),
    new THREE.Vector3( 0.46,  0.04, -0.02)
  ]);
  const jawTube = new THREE.Mesh(new THREE.TubeGeometry(jawCurve, 44, 0.024, 8, false), jawContourMat);
  jawPivot.add(jawTube);

  const jawOutline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(jawCurve.getPoints(64)),
    jawLineMat
  );
  jawPivot.add(jawOutline);
  root.add(jawPivot);

  // =========================================================================
  // 4. INTERNAL VOCAL TRACT TUBE, TRACHEA RINGS, TONGUE GRID & LIP RINGS
  // =========================================================================
  // Trachea & Glottis Stack inside Neck
  const glottisGroup = new THREE.Group();
  glottisGroup.position.set(0, -1.08, 0.02);
  for (let r = 0; r < 7; r++) {
    const pts = [];
    const radius = 0.16 + (r / 7) * 0.04;
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, r * 0.085, Math.sin(a) * radius * 0.9));
    }
    glottisGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tractRingMat));
  }
  root.add(glottisGroup);

  // Curved Pharynx-to-Oral Vocal Tract Wireframe Tunnel
  const tractCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.48, 0.02),
    new THREE.Vector3(0, -0.24, 0.06),
    new THREE.Vector3(0, -0.06, 0.24),
    new THREE.Vector3(0, -0.08, 0.54),
    new THREE.Vector3(0, -0.16, 0.84)
  ]);
  const vocalTractMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tractCurve, 22, 0.21, 18, false),
    tractWireMat
  );
  root.add(vocalTractMesh);

  // Hard Palate Anchor for CAD Pin
  const palate = new THREE.Object3D();
  palate.position.set(0, 0.08, 0.48);
  root.add(palate);

  // Soft Palate (Velum) Wireframe Flap
  const velumPivot = new THREE.Group();
  velumPivot.position.set(0, 0.04, 0.18);
  const velumMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.24, 4, 1, 4), jawContourMat);
  velumMesh.position.set(0, -0.02, -0.10);
  velumPivot.add(velumMesh);
  root.add(velumPivot);

  // Articulated Ribbed Tongue Grid inside Oral Cavity
  const tongueGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.56, 16, 12, false);
  tongueGeo.rotateX(Math.PI / 2);
  const tongueBasePos = Float32Array.from(tongueGeo.attributes.position.array);
  const tongueMesh = new THREE.Mesh(tongueGeo, tongueWireMat);
  tongueMesh.position.set(0, -0.18, 0.44);
  root.add(tongueMesh);

  // Concentric Wireframe Lip Rings (Upper & Lower Lip Aperture)
  const lipGroup = new THREE.Group();
  lipGroup.position.set(0, -0.17, 0.88);
  root.add(lipGroup);

  const upperLip = new THREE.Object3D();
  upperLip.position.set(0, 0.05, 0);
  lipGroup.add(upperLip);

  const lipRings = [];
  [1.0, 0.78, 0.56].forEach((scaleFactor, idx) => {
    const pts = [];
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(a) * 0.21 * scaleFactor,
        Math.sin(a) * 0.11 * scaleFactor,
        idx * 0.018
      ));
    }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lipRingMat);
    lipGroup.add(ring);
    lipRings.push(ring);
  });

  // Acoustic Wave Rings radiating from Wireframe Lips
  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.17, 28), waveRingMat.clone());
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
      { obj: tongueMesh, el: "pinTongue", tx: w * 0.63, ty: h * 0.55 },
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

    // Tongue grid articulation (forward/back + dorsal arch)
    const pos = tongueGeo.attributes.position;
    const tx = (state.tongue_x - 0.5) * 0.24;
    const ty = (state.tongue_y - 0.25) * 0.22;
    for (let i = 0; i < pos.count; i++) {
      const bx = tongueBasePos[i * 3];
      const by = tongueBasePos[i * 3 + 1];
      const bz = tongueBasePos[i * 3 + 2];
      const arch = Math.cos((bz / 0.30) * (Math.PI * 0.45));
      const topMask = Math.max(0, by + 0.08);
      pos.setXYZ(
        i,
        bx * 0.92,
        by * 0.65 + topMask * ty * arch * 1.4,
        bz + tx * arch
      );
    }
    pos.needsUpdate = true;

    // Concentric Wireframe Lip Rings opening & rounding
    const openScaleY = 0.45 + state.lip_open * 1.15;
    const roundScaleX = 1.05 - state.lip_round * 0.38;
    const protrudeZ = 0.88 + state.lip_round * 0.10;
    lipGroup.position.set(0, -0.17 - state.jaw_open * 0.03, protrudeZ);
    lipGroup.scale.set(roundScaleX, openScaleY, 1.0);

    // Subtle eye blink & gaze
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
