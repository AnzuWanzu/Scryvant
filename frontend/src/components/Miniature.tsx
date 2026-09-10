import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const models: Record<string, string> = {
  barbarian: "Barbarian",
  fighter: "Knight",
  paladin: "Knight",
  rogue: "Rogue_Hooded",
  ranger: "Rogue",
  monk: "Rogue",
};

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points))
      return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export default function Miniature({
  palette,
  accessory,
  classId,
  die,
}: {
  palette: string;
  accessory: string;
  classId: string;
  die: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const controls = useRef<OrbitControls | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    let disposed = false;
    queueMicrotask(() => {
      setFailed(false);
      setLoading(true);
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(4.2, 3.2, 7.8);
    const orbit = new OrbitControls(camera, renderer.domElement);
    controls.current = orbit;
    orbit.target.set(0, 1.65, 0);
    orbit.enablePan = false;
    orbit.minDistance = 5;
    orbit.maxDistance = 12;
    orbit.minPolarAngle = 0.35;
    orbit.maxPolarAngle = Math.PI / 2.1;
    orbit.enableDamping = true;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedQuery.matches;
    const onMotionChange = () => {
      reduced = reducedQuery.matches;
    };
    reducedQuery.addEventListener("change", onMotionChange);
    const accent =
      palette === "ember"
        ? 0xe3a272
        : palette === "violet"
          ? 0xb6a3df
          : 0xa9d0a7;
    const stone = new THREE.MeshStandardMaterial({
      color: 0x354336,
      metalness: 0.25,
      roughness: 0.75,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0x9e8e60,
      metalness: 0.7,
      roughness: 0.4,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.2,
    });
    const add = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      y: number,
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    // The stage is a few primitives; the character and accessories are licensed KayKit assets.
    add(new THREE.CylinderGeometry(1.3, 1.42, 0.18, 64), stone, 0.08);
    add(new THREE.CylinderGeometry(1.31, 1.31, 0.035, 64), brass, 0.19);
    add(new THREE.CylinderGeometry(1.27, 1.28, 0.16, 64), stone, 0.27);
    const ring = add(new THREE.TorusGeometry(1.13, 0.01, 8, 100), glow, 0.36);
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const mark = add(
        new THREE.BoxGeometry(0.014, 0.012, i % 4 ? 0.06 : 0.13),
        brass,
        0.36,
      );
      mark.position.x = Math.cos(angle) * 1.21;
      mark.position.z = Math.sin(angle) * 1.21;
      mark.rotation.y = -angle;
    }
    const halo = add(new THREE.TorusGeometry(1.75, 0.006, 6, 128), brass, 1.9);
    halo.position.z = -0.65;
    const ambient = new THREE.HemisphereLight(0xdce8cf, 0x202d21, 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffdfab, 3.3);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.PointLight(accent, 9, 9);
    rim.position.set(-1, 3, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xbacac4, 1.5);
    fill.position.set(4, 3, 2);
    scene.add(fill);

    const loader = new GLTFLoader();
    let mixer: THREE.AnimationMixer | null = null;
    let model: THREE.Group | null = null;
    loader.load(
      `/models/${models[classId] ?? "Mage"}.glb`,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const scale = 2.9 / bounds.getSize(new THREE.Vector3()).y;
        model.scale.setScalar(scale);
        model.position.y = 0.36 - bounds.min.y * scale;
        model.rotation.y = -0.12;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
          if (
            /Spellbook_open|1H_Wand|2H_Staff|1H_Sword|2H_Sword|Crossbow|Dagger|Axe|Shield/i.test(
              object.name,
            )
          ) {
            object.visible = false;
          }
        });
        const builtIn = model.getObjectByName(
          accessory === "staff"
            ? "2H_Staff"
            : accessory === "sword"
              ? "1H_Sword"
              : "2H_Crossbow",
        );
        if (builtIn) builtIn.visible = true;
        else {
          const file =
            accessory === "staff"
              ? "staff"
              : accessory === "sword"
                ? "sword_1handed"
                : "crossbow_2handed";
          loader.load(
            `/models/${file}.gltf`,
            (asset) => {
              if (disposed) {
                disposeObject(asset.scene);
                return;
              }
              const hand =
                model?.getObjectByName("handslot.r") ??
                model?.getObjectByName("handslotr");
              if (hand) hand.add(asset.scene);
              else disposeObject(asset.scene);
            },
            undefined,
            () => {
              /* An unavailable accessory does not hide the character. */
            },
          );
        }
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);
        const idle = gltf.animations.find((clip) => clip.name === "Idle");
        if (idle) {
          mixer.clipAction(idle).play();
          mixer.update(0);
        }
        setLoading(false);
      },
      undefined,
      () => {
        if (!disposed) {
          setFailed(true);
          setLoading(false);
        }
      },
    );

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(element);
    const resize = new ResizeObserver(() => {
      const width = element.clientWidth,
        height = element.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    });
    resize.observe(element);
    const onLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    let frame = 0;
    let last = performance.now();
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      if (!reduced) mixer?.update(delta);
      orbit.update();
      renderer.render(scene, camera);
    };
    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      reducedQuery.removeEventListener("change", onMotionChange);
      orbit.dispose();
      controls.current = null;
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [palette, accessory, classId]);

  function rotate(angle: number) {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.object.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    orbit.update();
  }
  return (
    <div className="miniature-wrap">
      <div
        ref={mount}
        className="miniature"
        role="img"
        aria-label={`${classId} miniature by KayKit. Use the controls below to rotate.`}
      />
      {loading && !failed && (
        <span className="model-loading" role="status">
          Summoning your miniature…
        </span>
      )}
      {failed && (
        <div
          className="portrait-fallback"
          role="img"
          aria-label="Character portrait fallback"
        >
          <span>✦</span>
          <strong>The {classId}</strong>
          <small>Portrait mode</small>
        </div>
      )}
      <div className="orbit-controls">
        <button
          aria-label="Rotate miniature left"
          onClick={() => rotate(-0.25)}
        >
          ↶
        </button>
        <span>DRAG TO ROTATE · SCROLL TO ZOOM</span>
        <button
          aria-label="Rotate miniature right"
          onClick={() => rotate(0.25)}
        >
          ↷
        </button>
      </div>
      {die > 0 && (
        <div className="die-result">
          <span>THE DICE HAVE SPOKEN</span>
          <strong>{die}</strong>
        </div>
      )}
    </div>
  );
}
