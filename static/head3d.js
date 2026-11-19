window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4.1, 0.28, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.14, 0.15);

  // Studio Lighting for Sculpted Human Head Contours
  const hemiLight = new THREE.HemisphereLight(0xc084fc, 0x1e1035, 1.1);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfacc15, 1.35);
  keyLight.position.set(3.5, 4.0, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xa855f7, 1.45);
  rimLight.position.set(-4.0, 2.0, -3.5);
  scene.add(rimLight);

  // Holographic Purple & Solar Yellow Materials
  const skinShellMat = new THREE.MeshPhongMaterial({
    color: 0x6b21a8,
    emissive: 0x2e1065,
    specular: 0xfacc15,
    shininess: 55,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const skinWireMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });

  const contourLineMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.72
  });

  const palateMat = new THREE.MeshPhongMaterial({
    color: 0xd97706,
    emissive: 0x78350f,
    wireframe: true,
    transparent: true,
    opacity: 0.65
  });

  const teethMat = new THREE.MeshPhongMaterial({
    color: 0xfef9c3,
    emissive: 0x713f12,
    shininess: 80,
    transparent: true,
    opacity: 0.85
  });

  const tongueMat = new THREE.MeshPhongMaterial({
    color: 0xc026d3,
    emissive: 0x701a75,
    specular: 0xfacc15,
    shininess: 45,
    transparent: true,
    opacity: 0.88
  });

  const lipMat = new THREE.MeshPhongMaterial({
    color: 0xe879f9,
    emissive: 0x86198f,
    specular: 0xfacc15,
    shininess: 70,
    transparent: true,
    opacity: 0.90
  });

  const eyeWhiteMat = new THREE.MeshPhongMaterial({
    color: 0xf5f3ff,
    emissive: 0x3b0764,
    shininess: 90,
    transparent: true,
    opacity: 0.85
  });

  const irisMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15
  });

  const glottisMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    wireframe: true,
    transparent: true,
    opacity: 0.90
  });

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0
  });

  const root = new THREE.Group();
  scene.add(root);

  // =========================================================================
  // 1. SCULPTED ANATOMICAL HUMAN HEAD & NECK (High-Res Parametric Mesh)
  // =========================================================================
  const headGeo = new THREE.SphereGeometry(1.0, 56, 48);
  const hPos = headGeo.attributes.position;
  const headBasePos = new Float32Array(hPos.array.length);

  for (let i = 0; i < hPos.count; i++) {
    let x = hPos.getX(i);
    let y = hPos.getY(i);
    let z = hPos.getZ(i);

    // Base human cranium proportions (taller & deeper front-to-back than wide)
    x *= 0.80;
    y *= 1.12;
    z *= 0.96;

    // Back of skull (Occiput) bulge & nape taper
    if (z < 0) {
      if (y > -0.1) z *= 1.12;
      else {
        z *= 0.62;
        x *= 0.72;
      }
    }

    // Face narrowing below cheekbones toward jaw & chin
    if (y < 0.05 && z > 0) {
      const t = Math.min(1.0, (0.05 - y) / 1.15);
      x *= (1.0 - t * 0.30);
      z *= (1.0 - t * 0.08);
    }

    // Forehead & Supraorbital Brow Ridge (y ~ 0.28, z > 0.5)
    if (z > 0.35) {
      const brow = Math.exp(-Math.pow((y - 0.27) / 0.11, 2)) * Math.exp(-Math.pow(x / 0.58, 2));
      z += brow * 0.12;

      // Eye Sockets (Concave orbital cavities at x = +-0.30, y = 0.15)
      const eyeDistL = Math.pow((x - 0.30) / 0.17, 2) + Math.pow((y - 0.15) / 0.11, 2);
      const eyeDistR = Math.pow((x + 0.30) / 0.17, 2) + Math.pow((y - 0.15) / 0.11, 2);
      z -= (Math.exp(-eyeDistL) + Math.exp(-eyeDistR)) * 0.16;

      // Zygomatic Cheekbones (x = +-0.48, y = 0.02)
      const cheekL = Math.pow((x - 0.47) / 0.20, 2) + Math.pow((y - 0.01) / 0.14, 2);
      const cheekR = Math.pow((x + 0.47) / 0.20, 2) + Math.pow((y - 0.01) / 0.14, 2);
      z += (Math.exp(-cheekL) + Math.exp(-cheekR)) * 0.09;

      // Sculpted Human Nose Bridge & Tip (x ~ 0, y from 0.22 down to -0.10)
      if (y < 0.25 && y > -0.16) {
        const noseProfile = Math.max(0, 1.0 - Math.abs(y + 0.04) / 0.22);
        const noseBridge = Math.exp(-Math.pow(x / 0.11, 2)) * Math.pow(noseProfile, 0.85);
        z += noseBridge * 0.30;

        // Nostrils (Alae) at y ~ -0.09, x = +-0.12
        const alaL = Math.exp(-Math.pow((x - 0.12) / 0.07, 2) - Math.pow((y + 0.09) / 0.05, 2));
        const alaR = Math.exp(-Math.pow((x + 0.12) / 0.07, 2) - Math.pow((y + 0.09) / 0.05, 2));
        z += (alaL + alaR) * 0.10;
      }

      // Philtrum & Upper Lip Muzzle
      const muzzle = Math.exp(-Math.pow(x / 0.34, 2) - Math.pow((y + 0.27) / 0.16, 2));
      z += muzzle * 0.11;

      // Chin Prominence (Mental Protuberance at y ~ -0.68, x ~ 0)
      const chin = Math.exp(-Math.pow(x / 0.24, 2) - Math.pow((y + 0.68) / 0.15, 2));
      z += chin * 0.17;
    }

    // Bottom submental floor flattening
    if (y < -0.78) {
      y = -0.78 + (y + 0.78) * 0.25;
      x *= 0.65;
      z *= 0.65;
    }

    hPos.setXYZ(i, x, y, z);
    headBasePos[i * 3] = x;
    headBasePos[i * 3 + 1] = y;
    headBasePos[i * 3 + 2] = z;
  }
  headGeo.computeVertexNormals();

  const headShell = new THREE.Mesh(headGeo, skinShellMat);
  headShell.position.set(0, 0.18, 0.0);
  root.add(headShell);

  const headWire = new THREE.Mesh(headGeo, skinWireMat);
  headWire.position.set(0, 0.18, 0.0);
  root.add(headWire);

  // Sagittal Profile Contour Line (Solar Yellow architectural line down face profile)
  const profilePts = [];
  for (let s = 0; s <= 40; s++) {
    const phi = (s / 40) * Math.PI;
    const py = Math.cos(phi) * 1.12;
    let pz = Math.sin(phi) * 0.96;
    if (py < 0.05) pz *= (1.0 - Math.min(1.0, (0.05 - py) / 1.15) * 0.08);
    pz += Math.exp(-Math.pow((py - 0.27) / 0.11, 2)) * 0.12;
    if (py < 0.25 && py > -0.16) {
      const np = Math.max(0, 1.0 - Math.abs(py + 0.04) / 0.22);
      pz += Math.pow(np, 0.85) * 0.30;
    }
    pz += Math.exp(-Math.pow((py + 0.27) / 0.16, 2)) * 0.11;
    pz += Math.exp(-Math.pow((py + 0.68) / 0.15, 2)) * 0.17;
    if (py < -0.78) {
      pz *= 0.65;
    }
    profilePts.push(new THREE.Vector3(0, py + 0.18, pz + 0.01));
  }
  const profileLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(profilePts),
    contourLineMat
  );
  root.add(profileLine);

  // Anatomical Neck & Cervical Column
  const neckGeo = new THREE.CylinderGeometry(0.42, 0.54, 1.05, 28, 10, true);
  const nPos = neckGeo.attributes.position;
  for (let i = 0; i < nPos.count; i++) {
    let x = nPos.getX(i), y = nPos.getY(i), z = nPos.getZ(i);
    const flare = Math.max(0, (-y - 0.1) / 0.45);
    x *= (1.0 + flare * 0.28);
    z *= 0.92;
    nPos.setXYZ(i, x, y, z);
  }
  neckGeo.computeVertexNormals();
  const neckShell = new THREE.Mesh(neckGeo, skinShellMat);
  neckShell.position.set(0, -1.02, -0.18);
  root.add(neckShell);
  const neckWire = new THREE.Mesh(neckGeo, skinWireMat);
  neckWire.position.set(0, -1.02, -0.18);
  root.add(neckWire);

  // =========================================================================
  // 2. HUMAN EYES & SCULPTED EARS
  // =========================================================================
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(0.29, 0.33, 0.76);
  const eyeBallL = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), eyeWhiteMat);
  const irisL = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), irisMat);
  irisL.position.set(0, 0, 0.082);
  leftEyeGroup.add(eyeBallL, irisL);
  root.add(leftEyeGroup);

  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(-0.29, 0.33, 0.76);
  const eyeBallR = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), eyeWhiteMat);
  const irisR = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), irisMat);
  irisR.position.set(0, 0, 0.082);
  rightEyeGroup.add(eyeBallR, irisR);
  root.add(rightEyeGroup);

  // Left & Right Ears
  [-1, 1].forEach(side => {
    const earGroup = new THREE.Group();
    const outerHelix = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 10, 20, Math.PI * 1.35), skinWireMat);
    outerHelix.rotation.y = side * (Math.PI / 2 - 0.22);
    outerHelix.rotation.z = side * -0.25;
    outerHelix.scale.set(0.75, 1.25, 1.0);
    earGroup.add(outerHelix);
    earGroup.position.set(side * 0.79, 0.16, -0.06);
    root.add(earGroup);
  });

  // =========================================================================
  // 3. INTERNAL VOCAL TRACT: PALATE, TEETH, ARTICULATING JAW, TONGUE & LIPS
  // =========================================================================
  const palate = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    palateMat
  );
  palate.scale.set(0.84, 0.42, 1.22);
  palate.position.set(0, -0.06, 0.44);
  root.add(palate);

  // Upper Dental Arch (Maxillary Teeth)
  const upperTeeth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.065, 18, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
    teethMat
  );
  upperTeeth.position.set(0, -0.14, 0.56);
  root.add(upperTeeth);

  // Soft Palate (Velum)
  const velumPivot = new THREE.Group();
  velumPivot.position.set(0, -0.07, 0.08);
  const velumMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.30, 4, 1, 4), palateMat);
  velumMesh.position.set(0, -0.03, -0.14);
  velumPivot.add(velumMesh);
  root.add(velumPivot);

  // Articulated Mandible (Lower Jaw + Lower Teeth + Muscular Tongue)
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.12, 0.06);

  const jawBone = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 20, Math.PI), palateMat);
  jawBone.rotation.x = Math.PI / 2 + 0.24;
  jawBone.position.set(0, -0.34, 0.42);
  jawPivot.add(jawBone);

  const lowerTeeth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.06, 18, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
    teethMat
  );
  lowerTeeth.position.set(0, -0.12, 0.49);
  jawPivot.add(lowerTeeth);

  const tongueGeo = new THREE.SphereGeometry(0.35, 20, 16);
  const tongueBasePos = Float32Array.from(tongueGeo.attributes.position.array);
  const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
  tongueMesh.position.set(0, -0.22, 0.38);
  jawPivot.add(tongueMesh);

  root.add(jawPivot);

  // Sculpted Human Upper Lip (Cupid's Bow Curve)
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.24, -0.02, -0.06),
    new THREE.Vector3(-0.11,  0.02,  0.02),
    new THREE.Vector3(-0.04,  0.04,  0.045),
    new THREE.Vector3( 0.00,  0.025, 0.048),
    new THREE.Vector3( 0.04,  0.04,  0.045),
    new THREE.Vector3( 0.11,  0.02,  0.02),
    new THREE.Vector3( 0.24, -0.02, -0.06)
  ]);
  const upperLip = new THREE.Mesh(new THREE.TubeGeometry(upperLipCurve, 24, 0.032, 10, false), lipMat);
  upperLip.position.set(0, -0.15, 0.89);
  root.add(upperLip);

  // Sculpted Human Lower Lip
  const lowerLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.23,  0.01, -0.06),
    new THREE.Vector3(-0.10, -0.035, 0.025),
    new THREE.Vector3( 0.00, -0.045, 0.042),
    new THREE.Vector3( 0.10, -0.035, 0.025),
    new THREE.Vector3( 0.23,  0.01, -0.06)
  ]);
  const lowerLip = new THREE.Mesh(new THREE.TubeGeometry(lowerLipCurve, 24, 0.036, 10, false), lipMat);
  lowerLip.position.set(0, -0.21, 0.88);
  root.add(lowerLip);

  // Glottis / Vocal Folds in Larynx
  const glottisGroup = new THREE.Group();
  glottisGroup.position.set(0, -1.05, -0.10);
  const glottisRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 8, 22), glottisMat);
  glottisRing.rotation.x = Math.PI / 2;
  glottisGroup.add(glottisRing);
  root.add(glottisGroup);

  // Acoustic Wave Rings radiating from Human Lips
  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.175, 28), ringMat.clone());
    wr.position.set(0, -0.18, 0.98);
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
      { obj: palate, el: "pinPalate", tx: w * 0.36, ty: h * 0.24 },
      { obj: upperLip, el: "pinLip", tx: w * 0.63, ty: h * 0.35 },
      { obj: tongueMesh, el: "pinTongue", tx: w * 0.64, ty: h * 0.55 },
      { obj: glottisGroup, el: "pinGlottis", tx: w * 0.37, ty: h * 0.74 }
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
    jawPivot.rotation.x = state.jaw_open * 0.32;
    velumPivot.rotation.x = -state.velum_open * 0.55;

    // Deform lower jaw skin vertices subtly in sync with jaw opening
    const jawDrop = state.jaw_open * 0.14;
    for (let i = 0; i < hPos.count; i++) {
      const bx = headBasePos[i * 3];
      const by = headBasePos[i * 3 + 1];
      const bz = headBasePos[i * 3 + 2];
      if (by < -0.22 && bz > 0.15) {
        const w = Math.min(1.0, (-0.22 - by) / 0.55) * Math.min(1.0, (bz - 0.15) / 0.65);
        hPos.setXYZ(i, bx, by - jawDrop * w, bz - jawDrop * 0.25 * w);
      }
    }
    hPos.needsUpdate = true;

    // Tongue articulation
    const pos = tongueGeo.attributes.position;
    const tx = (state.tongue_x - 0.5) * 0.36;
    const ty = (state.tongue_y - 0.25) * 0.38;
    for (let i = 0; i < pos.count; i++) {
      const bx = tongueBasePos[i * 3];
      const by = tongueBasePos[i * 3 + 1];
      const bz = tongueBasePos[i * 3 + 2];
      const topFactor = Math.max(0, by + 0.12);
      pos.setXYZ(i, bx * 0.68, by * 0.56 + topFactor * ty, bz * 1.22 + topFactor * tx);
    }
    pos.needsUpdate = true;

    // Sculpted human lip opening & rounding
    const protrude = state.lip_round * 0.16;
    const gap = state.lip_open * 0.11;
    const roundScale = 1.0 - state.lip_round * 0.34;

    upperLip.position.set(0, -0.15 + gap * 0.28, 0.89 + protrude);
    upperLip.scale.set(roundScale, 1.0 + state.lip_round * 0.32, 1.0 + state.lip_round * 0.25);

    lowerLip.position.set(0, -0.21 - gap * 0.92, 0.88 + protrude);
    lowerLip.scale.set(roundScale, 1.0 + state.lip_round * 0.32, 1.0 + state.lip_round * 0.25);

    // Subtle lifelike eye micro-gaze
    const gazeX = Math.sin(timeMs * 0.0009) * 0.08;
    const gazeY = Math.cos(timeMs * 0.0007) * 0.04;
    leftEyeGroup.rotation.set(gazeY, gazeX, 0);
    rightEyeGroup.rotation.set(gazeY, gazeX, 0);

    // Vocal fold vibration & acoustic rings
    const vib = 1.0 + state.glottis_voicing * 0.26 * Math.sin(timeMs * 0.09);
    glottisRing.scale.set(vib, vib, 1.0);

    waveRings.forEach((wr, idx) => {
      if (state.glottis_voicing > 0.06) {
        const cycle = ((timeMs * 0.0018 + idx * 0.33) % 1.0);
        const sc = 0.7 + cycle * 2.5;
        wr.scale.set(sc, sc, 1.0);
        wr.position.z = 0.96 + protrude + cycle * 0.90;
        wr.material.opacity = (1.0 - cycle) * 0.58 * state.glottis_voicing;
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
