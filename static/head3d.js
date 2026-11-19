window.AgHead3D = (() => {
  const container = document.getElementById("threeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4.8, 0.45, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0.0, -0.18, 0.1);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.34 });
  const brightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true, transparent: true, opacity: 0.72 });
  const organMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.85 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.0 });

  const root = new THREE.Group();
  scene.add(root);

  const craniumGeo = new THREE.SphereGeometry(1.22, 22, 18);
  const cPos = craniumGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i), y = cPos.getY(i), z = cPos.getZ(i);
    z *= 1.15;
    if (y < -0.15) { x *= 0.76; if (z > 0) z *= 0.88; }
    cPos.setXYZ(i, x, y, z);
  }
  craniumGeo.computeVertexNormals();
  const cranium = new THREE.Mesh(craniumGeo, wireMat);
  cranium.position.set(0, 0.58, -0.12);
  root.add(cranium);

  const faceGeo = new THREE.CylinderGeometry(0.68, 0.54, 1.05, 16, 8, true);
  const fPos = faceGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    let x = fPos.getX(i), y = fPos.getY(i), z = fPos.getZ(i);
    if (z > 0.25 && y > -0.1) z += 0.28 * (1.0 - Math.abs(x) * 2.2);
    fPos.setXYZ(i, x, y, z);
  }
  const faceMesh = new THREE.Mesh(faceGeo, wireMat);
  faceMesh.position.set(0, 0.12, 0.36);
  root.add(faceMesh);

  for (let v = 0; v < 6; v++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 - v * 0.01, 0.055, 8, 16), wireMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -0.55 - v * 0.28, -0.45);
    root.add(ring);
  }

  const palate = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    brightMat
  );
  palate.scale.set(0.85, 0.45, 1.25);
  palate.position.set(0, -0.14, 0.48);
  root.add(palate);

  const velumPivot = new THREE.Group();
  velumPivot.position.set(0, -0.14, 0.05);
  const velumMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.36, 4, 1, 4), brightMat);
  velumMesh.position.set(0, -0.04, -0.18);
  velumPivot.add(velumMesh);
  root.add(velumPivot);

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.12, 0.05);
  const jawBone = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.095, 8, 18, Math.PI), brightMat);
  jawBone.rotation.x = Math.PI / 2 + 0.25;
  jawBone.position.set(0, -0.34, 0.44);
  jawPivot.add(jawBone);

  const tongueGeo = new THREE.SphereGeometry(0.42, 16, 12);
  const tongueBasePos = Float32Array.from(tongueGeo.attributes.position.array);
  const tongueMesh = new THREE.Mesh(tongueGeo, organMat);
  tongueMesh.position.set(0, -0.32, 0.44);
  jawPivot.add(tongueMesh);
  root.add(jawPivot);

  const upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 18, Math.PI), organMat);
  upperLip.position.set(0, -0.22, 0.96);
  root.add(upperLip);

  const lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 18, Math.PI), organMat);
  lowerLip.rotation.z = Math.PI;
  lowerLip.position.set(0, -0.32, 0.95);
  root.add(lowerLip);

  const glottisGroup = new THREE.Group();
  glottisGroup.position.set(0, -1.25, -0.05);
  const glottisRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20), organMat);
  glottisRing.rotation.x = Math.PI / 2;
  glottisGroup.add(glottisRing);
  root.add(glottisGroup);

  const waveRings = [];
  for (let w = 0; w < 3; w++) {
    const wr = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.21, 24), ringMat.clone());
    wr.position.set(0, -0.27, 1.08);
    root.add(wr);
    waveRings.push(wr);
  }

  function applyThemeColors() {
    const cs = getComputedStyle(document.body);
    const p = cs.getPropertyValue("--head-primary").trim();
    const a = cs.getPropertyValue("--head-accent").trim();
    const o = cs.getPropertyValue("--head-organ").trim();
    if (p) wireMat.color.set(p);
    if (a) {
      brightMat.color.set(a);
      waveRings.forEach(wr => wr.material.color.set(a));
    }
    if (o) organMat.color.set(o);
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
      { obj: upperLip, el: "pinLip", tx: w * 0.63, ty: h * 0.34 },
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
    jawPivot.rotation.x = state.jaw_open * 0.34;
    velumPivot.rotation.x = -state.velum_open * 0.55;

    const pos = tongueGeo.attributes.position;
    const tx = (state.tongue_x - 0.5) * 0.42;
    const ty = (state.tongue_y - 0.25) * 0.46;
    for (let i = 0; i < pos.count; i++) {
      const bx = tongueBasePos[i * 3];
      const by = tongueBasePos[i * 3 + 1];
      const bz = tongueBasePos[i * 3 + 2];
      const topFactor = Math.max(0, by + 0.15);
      pos.setXYZ(i, bx * 0.72, by * 0.62 + topFactor * ty, bz * 1.25 + topFactor * tx);
    }
    pos.needsUpdate = true;

    const protrude = state.lip_round * 0.24;
    const gap = state.lip_open * 0.14;
    const roundScale = 1.0 - state.lip_round * 0.36;

    upperLip.position.set(0, -0.21 + gap * 0.35, 0.95 + protrude);
    upperLip.scale.set(roundScale, 1.0 + state.lip_round * 0.35, 1.0);

    lowerLip.position.set(0, -0.30 - gap * 0.95, 0.94 + protrude);
    lowerLip.scale.set(roundScale, 1.0 + state.lip_round * 0.35, 1.0);

    const vib = 1.0 + state.glottis_voicing * 0.28 * Math.sin(timeMs * 0.09);
    glottisRing.scale.set(vib, vib, 1.0);

    waveRings.forEach((wr, idx) => {
      if (state.glottis_voicing > 0.06) {
        const cycle = ((timeMs * 0.0018 + idx * 0.33) % 1.0);
        const sc = 0.7 + cycle * 2.6;
        wr.scale.set(sc, sc, 1.0);
        wr.position.z = 1.04 + protrude + cycle * 0.95;
        wr.material.opacity = (1.0 - cycle) * 0.55 * state.glottis_voicing;
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

    const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#10b981";
    sCtx.strokeStyle = accent;
    sCtx.lineWidth = 2.0;
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
    applyThemeColors();
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

  return { applyThemeColors, startLoop };
})();
