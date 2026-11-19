window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(2.9, 0.24, 4.9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.05, 0.12);

  // Soft Pixar/Cartoon Studio Three-Point Lighting
  const ambientLight = new THREE.AmbientLight(0xd8b4fe, 0.65);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x3b0764, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
  keyLight.position.set(2.8, 3.8, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xa855f7, 1.25);
  rimLight.position.set(-3.5, 2.2, -3.0);
  scene.add(rimLight);

  // Friendly Stylized Character Materials (Purple & Solar Yellow Theme)
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ff,
    emissive: 0x2e1065,
    emissiveIntensity: 0.22,
    roughness: 0.48,
    metalness: 0.04
  });

  const cheekBlushMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.26
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x4c1d95,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.35,
    roughness: 0.36,
    metalness: 0.15
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.65
  });

  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.0
  });

  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x7e22ce,
    emissive: 0x581c87,
    emissiveIntensity: 0.4,
    roughness: 0.2
  });

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090514 });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const lipMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0x9d174d,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.05
  });

  const mouthCavityMat = new THREE.MeshBasicMaterial({
    color: 0x2a0845
  });

  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0x881337,
    emissiveIntensity: 0.25,
    roughness: 0.4
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
  // 1. STYLIZED CARTOON CHARACTER HEAD (Smooth, Cute Proportions)
  // =========================================================================
  const headGeo = new THREE.SphereGeometry(0.95, 56, 48);
  const hPos = headGeo.attributes.position;
  const headBasePos = new Float32Array(hPos.array.length);

  for (let i = 0; i < hPos.count; i++) {
    let x = hPos.getX(i);
    let y = hPos.getY(i);
    let z = hPos.getZ(i);

    // Friendly cartoon proportions (slightly rounded cheeks, soft chin)
    x *= 0.88;
    y *= 1.04;
    z *= 0.92;

    // Gentle cheek fullness & tapered cute chin
    if (y < 0.0) {
      const t = Math.min(1.0, -y / 0.98);
      x *= (1.0 - t * 0.24);
      z *= (1.0 - t * 0.14);
    }

    // Soft cute button nose (x ~ 0, y ~ -0.02, z > 0.5)
    if (z > 0.45) {
      const nose = Math.exp(-Math.pow(x / 0.11, 2) - Math.pow((y + 0.02) / 0.09, 2));
      z += nose * 0.15;

      // Subtle soft cheek roundness
      const cheekL = Math.exp(-Math.pow((x - 0.38) / 0.22, 2) - Math.pow((y + 0.08) / 0.16, 2));
      const cheekR = Math.exp(-Math.pow((x + 0.38) / 0.22, 2) - Math.pow((y + 0.08) / 0.16, 2));
      z += (cheekL + cheekR) * 0.05;
    }

    hPos.setXYZ(i, x, y, z);
    headBasePos[i * 3] = x;
    headBasePos[i * 3 + 1] = y;
    headBasePos[i * 3 + 2] = z;
  }
  headGeo.computeVertexNormals();

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.14, 0.0);
  root.add(headMesh);

  // Soft Cartoon Cheek Blush
  [-1, 1].forEach(side => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), cheekBlushMat);
    blush.scale.set(1.2, 0.75, 0.3);
    blush.position.set(side * 0.42, 0.02, 0.75);
    blush.rotation.y = side * 0.45;
    root.add(blush);
  });

  // =========================================================================
  // 2. STYLIZED PURPLE & GOLD HAIR / CROWN SWOOP
  // =========================================================================
  const hairGroup = new THREE.Group();
  const hairCapGeo = new THREE.SphereGeometry(0.99, 44, 36, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const hcPos = hairCapGeo.attributes.position;
  for (let i = 0; i < hcPos.count; i++) {
    let x = hcPos.getX(i), y = hcPos.getY(i), z = hcPos.getZ(i);
    x *= 0.90;
    y *= 1.06;
    z *= 0.96;
    // Sweep front bangs slightly upward/sideways so forehead & brows stay clear
    if (z > 0.35 && y < 0.48) {
      y += (z - 0.35) * 0.38;
    }
    hcPos.setXYZ(i, x, y, z);
  }
  hairCapGeo.computeVertexNormals();
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.18, -0.03);
  hairGroup.add(hairCap);

  // Stylized Front Hair Quiff / Swoop
  const quiff = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), hairMat);
  quiff.scale.set(1.35, 0.62, 1.15);
  quiff.position.set(-0.08, 1.04, 0.36);
  quiff.rotation.set(0.28, -0.18, 0.14);
  hairGroup.add(quiff);

  // Sleek Solar-Gold Headband / Visor Trim
  const goldBand = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.022, 10, 48, Math.PI * 1.15), goldAccentMat);
  goldBand.rotation.x = Math.PI * 0.36;
  goldBand.rotation.z = -Math.PI * 0.075;
  goldBand.position.set(0, 0.55, 0.08);
  hairGroup.add(goldBand);

  root.add(hairGroup);

  // Cute Stylized Cartoon Ears + Gold Ear Nodes
  [-1, 1].forEach(side => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), skinMat);
    ear.scale.set(0.48, 1.05, 0.75);
    ear.position.set(side * 0.84, 0.10, -0.02);
    ear.rotation.z = side * -0.15;
    root.add(ear);

    const earNode = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), goldAccentMat);
    earNode.rotation.z = Math.PI / 2;
    earNode.position.set(side * 0.90, 0.10, -0.02);
    root.add(earNode);
  });

  // =========================================================================
  // 3. EXPRESSIVE CARTOON EYES, EYELIDS & EYEBROWS
  // =========================================================================
  function createCartoonEye(side) {
    const eyeRoot = new THREE.Group();
    eyeRoot.position.set(side * 0.30, 0.26, 0.78);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), scleraMat);
    sclera.scale.set(1.05, 1.12, 0.72);
    eyeRoot.add(sclera);

    const gazeGroup = new THREE.Group();
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.092, 20, 16), irisMat);
    iris.scale.set(1.0, 1.08, 0.45);
    iris.position.set(0, 0, 0.088);
    gazeGroup.add(iris);

    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 8, 24), goldAccentMat);
    goldRing.position.set(0, 0, 0.122);
    gazeGroup.add(goldRing);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), pupilMat);
    pupil.scale.set(1.0, 1.08, 0.4);
    pupil.position.set(0, 0, 0.112);
    gazeGroup.add(pupil);

    // Glossy white anime/Pixar catchlights
    const catch1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), catchlightMat);
    catch1.position.set(0.032, 0.034, 0.128);
    gazeGroup.add(catch1);

    const catch2 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), catchlightMat);
    catch2.position.set(-0.024, -0.022, 0.128);
    gazeGroup.add(catch2);

    eyeRoot.add(gazeGroup);

    // Blinking Upper Eyelid
    const eyelid = new THREE.Mesh(
      new THREE.SphereGeometry(0.164, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      skinMat
    );
    eyelid.scale.set(1.06, 1.13, 0.76);
    eyelid.rotation.x = -Math.PI * 0.42; // Open by default
    eyeRoot.add(eyelid);

    // Expressive Cartoon Eyebrow
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.13 * side, 0.00, 0.02),
      new THREE.Vector3( 0.00,        0.035, 0.05),
      new THREE.Vector3( 0.13 * side, 0.01, 0.01)
    ]);
    const brow = new THREE.Mesh(new THREE.TubeGeometry(browCurve, 16, 0.022, 8, false), hairMat);
    brow.position.set(0, 0.21, 0.08);
    eyeRoot.add(brow);

    root.add(eyeRoot);
    return { eyeRoot, gazeGroup, eyelid, brow };
  }

  const leftEye = createCartoonEye(1);
  const rightEye = createCartoonEye(-1);

  // =========================================================================
  // 4. CLEAN CARTOON MOUTH CAVITY, COHESIVE LIPS & CUTE TONGUE
  // =========================================================================
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.16, 0.81);
  root.add(mouthGroup);

  // Recessed dark-plum mouth cavity (prevents hollow/creepy look when speaking)
  const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), mouthCavityMat);
  mouthCavity.scale.set(1.15, 0.72, 0.45);
  mouthCavity.position.set(0, 0, -0.025);
  mouthGroup.add(mouthCavity);

  // Cute rounded cartoon tongue inside lower mouth
  const tongueMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), tongueMat);
  tongueMesh.scale.set(1.05, 0.45, 1.15);
  tongueMesh.position.set(0, -0.045, 0.005);
  mouthGroup.add(tongueMesh);

  // Cohesive Upper Lip (Smooth Cupid's Bow anchored cleanly at mouth corners)
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.185,  0.006, -0.045),
    new THREE.Vector3(-0.095,  0.014,  0.015),
    new THREE.Vector3(-0.035,  0.026,  0.035),
    new THREE.Vector3( 0.000,  0.018,  0.038),
    new THREE.Vector3( 0.035,  0.026,  0.035),
    new THREE.Vector3( 0.095,  0.014,  0.015),
    new THREE.Vector3( 0.185,  0.006, -0.045)
  ]);
  const upperLip = new THREE.Mesh(new THREE.TubeGeometry(upperLipCurve, 28, 0.023, 12, false), lipMat);
  upperLip.position.set(0, 0.008, 0.028);
  mouthGroup.add(upperLip);

  // Cohesive Lower Lip (Plump, friendly lower lip meeting upper lip cleanly)
  const lowerLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.182,  0.006, -0.045),
    new THREE.Vector3(-0.090, -0.018,  0.018),
    new THREE.Vector3( 0.000, -0.025,  0.034),
    new THREE.Vector3( 0.090, -0.018,  0.018),
    new THREE.Vector3( 0.182,  0.006, -0.045)
  ]);
  const lowerLip = new THREE.Mesh(new THREE.TubeGeometry(lowerLipCurve, 28, 0.026, 12, false), lipMat);
  lowerLip.position.set(0, -0.012, 0.026);
  mouthGroup.add(lowerLip);

  // =========================================================================
  // 5. STYLIZED NECK & HOLOGRAPHIC COLLAR RING
  // =========================================================================
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.72, 32), skinMat);
  neckMesh.position.set(0, -0.92, -0.08);
  root.add(neckMesh);

  const collarGroup = new THREE.Group();
  collarGroup.position.set(0, -1.16, -0.06);
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 12, 48), goldAccentMat);
  collarRing.rotation.x = Math.PI / 2;
  collarGroup.add(collarRing);
  root.add(collarGroup);

  // Acoustic Wave Rings radiating from Mouth
  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.165, 32), ringMat.clone());
    wr.position.set(0, -0.16, 0.92);
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
      { obj: leftEye.brow, el: "pinPalate", tx: w * 0.37, ty: h * 0.24 },
      { obj: upperLip, el: "pinLip", tx: w * 0.62, ty: h * 0.36 },
      { obj: tongueMesh, el: "pinTongue", tx: w * 0.63, ty: h * 0.55 },
      { obj: collarGroup, el: "pinGlottis", tx: w * 0.38, ty: h * 0.73 }
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
    // Gentle jaw movement on lower chin skin
    const jawDrop = Math.max(0, state.jaw_open - 0.15) * 0.085;
    for (let i = 0; i < hPos.count; i++) {
      const bx = headBasePos[i * 3];
      const by = headBasePos[i * 3 + 1];
      const bz = headBasePos[i * 3 + 2];
      if (by < -0.25 && bz > 0.1) {
        const w = Math.min(1.0, (-0.25 - by) / 0.55) * Math.min(1.0, (bz - 0.1) / 0.65);
        hPos.setXYZ(i, bx, by - jawDrop * w, bz - jawDrop * 0.15 * w);
      }
    }
    hPos.needsUpdate = true;

    // Smooth, natural cartoon lip articulation
    const openAmt = Math.max(0, state.lip_open - 0.12);
    const protrude = state.lip_round * 0.06;
    const roundScale = 1.0 - state.lip_round * 0.34;
    const verticalStretch = 1.0 + state.lip_round * 0.35;

    upperLip.position.set(0, 0.008 + openAmt * 0.022, 0.028 + protrude);
    upperLip.scale.set(roundScale, verticalStretch, 1.0);

    lowerLip.position.set(0, -0.012 - openAmt * 0.072, 0.026 + protrude);
    lowerLip.scale.set(roundScale, verticalStretch, 1.0);

    mouthCavity.scale.set(1.12 * roundScale, 0.35 + openAmt * 0.85, 0.45);
    mouthCavity.position.y = -openAmt * 0.022;

    // Tongue articulation inside mouth
    const tx = (state.tongue_x - 0.5) * 0.045;
    const ty = (state.tongue_y - 0.3) * 0.035;
    tongueMesh.position.set(0, -0.048 - openAmt * 0.025 + ty, 0.005 + tx);
    tongueMesh.scale.set(1.02 * roundScale, 0.45, 1.12);

    // Friendly idle head bob & subtle speech nod
    root.rotation.y = Math.sin(timeMs * 0.0008) * 0.06;
    root.rotation.x = Math.sin(timeMs * 0.0011) * 0.025 + state.glottis_voicing * 0.03;

    // Natural Cartoon Blinking every 3.6 seconds + expressive brows
    const blinkCycle = (timeMs % 3600) / 3600;
    let blinkAmt = 0;
    if (blinkCycle > 0.94) {
      blinkAmt = Math.sin(((blinkCycle - 0.94) / 0.06) * Math.PI);
    }
    const lidAngle = -Math.PI * 0.42 + blinkAmt * (Math.PI * 0.44);
    leftEye.eyelid.rotation.x = lidAngle;
    rightEye.eyelid.rotation.x = lidAngle;

    const browLift = 0.21 + state.glottis_voicing * 0.028;
    leftEye.brow.position.y = browLift;
    rightEye.brow.position.y = browLift;

    const gazeX = Math.sin(timeMs * 0.0009) * 0.07;
    const gazeY = Math.cos(timeMs * 0.0007) * 0.04;
    leftEye.gazeGroup.rotation.set(gazeY, gazeX, 0);
    rightEye.gazeGroup.rotation.set(gazeY, gazeX, 0);

    // Collar pulse & acoustic rings
    const pulse = 1.0 + state.glottis_voicing * 0.08 * Math.sin(timeMs * 0.06);
    collarRing.scale.set(pulse, pulse, 1.0);

    waveRings.forEach((wr, idx) => {
      if (state.glottis_voicing > 0.06) {
        const cycle = ((timeMs * 0.0018 + idx * 0.33) % 1.0);
        const sc = 0.65 + cycle * 2.3;
        wr.scale.set(sc, sc, 1.0);
        wr.position.z = 0.88 + protrude + cycle * 0.85;
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
