/* ============================================================
   WORLDKIT: PRAYER FLAGS (detailed: printed cloth texture, stitched border, frayed edge, wind wave)
   Order on every line: blue, white, red, green, yellow. Instanced per colour.
============================================================ */
const FLAG_COLS = ["#2F62A8", "#F3EFE6", "#C23A2E", "#3E8A4E", "#E3B53A"];
const _flagTex = {};
function flagTex(hex){
  if (_flagTex[hex]) return _flagTex[hex];
  const c = document.createElement("canvas"); c.width = 128; c.height = 160; const x = c.getContext("2d");
  x.fillStyle = hex; x.fillRect(0, 0, 128, 160);
  for (let i = 0; i < 1400; i++){ x.fillStyle = `rgba(${Math.random() > .5 ? "255,255,255" : "0,0,0"},${Math.random()*.06})`; x.fillRect(Math.random()*128, Math.random()*160, 1, 2 + Math.random()*3); }
  const ink = hex === "#F3EFE6" ? "rgba(40,40,60,.75)" : "rgba(20,15,10,.62)";
  x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 2;
  x.setLineDash([4, 3]); x.strokeRect(6, 8, 116, 136); x.setLineDash([]);
  x.beginPath(); x.arc(64, 62, 22, 0, 6.283); x.stroke();
  x.beginPath(); x.moveTo(46, 72); x.quadraticCurveTo(54, 50, 66, 52); x.quadraticCurveTo(80, 50, 84, 62); x.lineTo(78, 64); x.lineTo(76, 76); x.moveTo(52, 70); x.lineTo(50, 82); x.moveTo(70, 70); x.lineTo(72, 82); x.stroke();
  for (const [cx, cy] of [[20, 22], [108, 22], [20, 118], [108, 118]]){ x.beginPath(); x.arc(cx, cy, 6, 0, 6.283); x.stroke(); }
  for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++){ if (Math.random() > .82) continue; x.fillRect(16 + k*11 + Math.random()*2, 96 + r*8, 6 + Math.random()*4, 2); }
  x.globalCompositeOperation = "destination-out"; x.beginPath(); x.moveTo(0, 160);
  for (let i = 0; i <= 128; i += 4) x.lineTo(i, 148 + Math.random()*12); x.lineTo(128, 160); x.closePath(); x.fill();
  for (let i = 0; i < 40; i++) x.fillRect(Math.random()*128, 146 + Math.random()*10, 1, 6);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; _flagTex[hex] = t; return t;
}
function makeFlagLines(scene, lines, timeU){
  // lines: [{a:Vector3, b:Vector3, sag, n}]
  const per = FLAG_COLS.map(() => []);
  const ropeM = M("#D9C9A0", .95);
  lines.forEach(L => {
    const curve = catenary(L.a, L.b, L.sag);
    const rope = new THREE.Mesh(tube(curve, .012, 32, 4), ropeM); scene.add(rope);
    const dirv = L.b.clone().sub(L.a); const yaw = Math.atan2(dirv.x, dirv.z) + Math.PI/2;
    for (let i = 1; i <= L.n; i++){ const p = curve.getPoint(i/(L.n + 1)); per[(i - 1) % 5].push({ p, yaw, s: L.size || 1 }); }
  });
  const geo = new THREE.PlaneGeometry(.34, .42, 6, 6); geo.translate(0, -.21, 0);
  per.forEach((list, ci) => {
    if (!list.length) return;
    const mat = new THREE.MeshStandardMaterial({ map: flagTex(FLAG_COLS[ci]), side: THREE.DoubleSide, roughness: .9, alphaTest: .5 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = timeU;
      sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <project_vertex>", `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
          float hang = clamp(-transformed.y/0.42, 0.0, 1.0);
          float ph = ip.x*0.7 + ip.z*0.5 + ip.y*0.3;
          float w = sin(uTime*4.2 + ph + transformed.x*9.0 + hang*3.0)*0.07 + sin(uTime*7.1 + ph*1.7 + transformed.x*15.0)*0.025;
          mvPosition.z += w*(0.25 + hang);
          mvPosition.x += hang*hang*0.06*sin(uTime*1.3 + ph);
          mvPosition = instanceMatrix*mvPosition;
        #endif
        mvPosition = modelViewMatrix*mvPosition; gl_Position = projectionMatrix*mvPosition;`);
    };
    const im = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
    list.forEach((f, i) => { d.position.copy(f.p); d.rotation.set(0, f.yaw, (Math.random() - .5)*.08); d.scale.setScalar(f.s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = true; scene.add(im);
  });
}

