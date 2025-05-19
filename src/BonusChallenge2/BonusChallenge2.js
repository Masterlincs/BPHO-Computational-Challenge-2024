import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const PlanetaryProjectileMotion = () => {
  const [initialVelocity, setInitialVelocity] = useState(10000);
  const [angle, setAngle] = useState(45);
  const [planetRadius, setPlanetRadius] = useState(6371000); // Earth's radius in meters
  const [rotationPeriod, setRotationPeriod] = useState(86400); // Earth's rotation period in seconds
  const [planetTexture, setPlanetTexture] = useState('earth');
  const [trajectory, setTrajectory] = useState([]);
  const [landingPosition, setLandingPosition] = useState({ lat: 0, lon: 0 });

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const planetRef = useRef(null);
  const projectileRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      initScene();
      animate();
      window.addEventListener('resize', handleWindowResize);
    }
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  useEffect(() => {
    calculateTrajectory();
  }, [initialVelocity, angle, planetRadius, rotationPeriod]);

  useEffect(() => {
    updatePlanetTexture();
  }, [planetTexture]);

  const handleWindowResize = () => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  };

  const initScene = () => {
    const scene = new THREE.Scene();
  
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3; // Adjusted
  
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
  
    const planet = createPlanet();
    scene.add(planet);
  
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(projectile);
  
    const light = new THREE.DirectionalLight(0xffffff, 1); // Adding light
    light.position.set(5, 5, 5).normalize();
    scene.add(light);
  
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    planetRef.current = planet;
    projectileRef.current = projectile;
  
    animate();
  };
  

  const createPlanet = () => {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const texture = new THREE.TextureLoader().load(`https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg`);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    return new THREE.Mesh(geometry, material);
  };

  const updatePlanetTexture = () => {
    if (planetRef.current) {
      const texture = new THREE.TextureLoader().load(`https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg`);
      planetRef.current.material.map = texture;
      planetRef.current.material.needsUpdate = true;
    }
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const renderScene = () => {
      if (planetRef.current) {
        planetRef.current.rotation.y += 2 * Math.PI / (rotationPeriod * 60); // Rotate the planet
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(renderScene);
    };
    
    renderScene();
  };

  const calculateTrajectory = () => {
    const g = 9.81; // m/s^2
    const v0 = initialVelocity;
    const theta = angle * (Math.PI / 180);
    const omega = 2 * Math.PI / rotationPeriod; // Angular velocity of the planet
  
    let t = 0;
    const dt = 0.1;
    const trajectoryPoints = [];
  
    let x = 0, y = 0, z = planetRadius;
    let vx = v0 * Math.cos(theta);
    let vy = 0;
    let vz = v0 * Math.sin(theta);
  
    while (z > planetRadius) {
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        console.error('Invalid trajectory point:', { x, y, z });
        break;
      }
  
      // Update position
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
  
      // Calculate distance from planet center
      const r = Math.sqrt(x * x + y * y + z * z);
  
      // Update velocity
      const ax = -g * (planetRadius / r) ** 2 * (x / r) + 2 * omega * vy + omega * omega * x;
      const ay = -g * (planetRadius / r) ** 2 * (y / r) - 2 * omega * vx + omega * omega * y;
      const az = -g * (planetRadius / r) ** 2 * (z / r);
  
      vx += ax * dt;
      vy += ay * dt;
      vz += az * dt;
  
      trajectoryPoints.push({ x, y, z });
      t += dt;
    }
  
    if (trajectoryPoints.length > 0) {
      const finalPoint = trajectoryPoints[trajectoryPoints.length - 1];
      
      if (finalPoint && finalPoint.z !== undefined) {
        // Normalize coordinates relative to the planet radius
        const normalizedX = finalPoint.x / planetRadius;
        const normalizedY = finalPoint.y / planetRadius;
        const normalizedZ = finalPoint.z / planetRadius;
  
        // Calculate latitude and longitude
        const lat = Math.asin(normalizedZ) * 180 / Math.PI; // Latitude in degrees
        const lon = Math.atan2(normalizedY, normalizedX) * 180 / Math.PI; // Longitude in degrees
  
        setLandingPosition({ lat, lon });
      } else {
        console.error('Final point is undefined or invalid:', finalPoint);
        setLandingPosition({ lat: 0, lon: 0 });
      }
    } else {
      console.error('No valid trajectory points were calculated.');
      setLandingPosition({ lat: 0, lon: 0 });
    }
  
    setTrajectory(trajectoryPoints);
  };
  
  

  const animateProjectile = () => {
    if (trajectory.length === 0) {
      console.error('No trajectory points available');
      return;
    }
  
    let index = 0;
    const animationInterval = setInterval(() => {
      if (index < trajectory.length) {
        const { x, y, z } = trajectory[index];
        if (projectileRef.current) {
          projectileRef.current.position.set(x / planetRadius, y / planetRadius, z / planetRadius);
        }
        index++;
      } else {
        clearInterval(animationInterval);
      }
    }, 16); // 60 fps
  };

  return (
    <div>
      <canvas ref={canvasRef} />
      <div className="controls">
        <div>
          <label>Initial Velocity (m/s): </label>
          <input type="number" value={initialVelocity} onChange={(e) => setInitialVelocity(Number(e.target.value))} />
        </div>
        <div>
          <label>Launch Angle (degrees): </label>
          <input type="number" value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
        </div>
        <div>
          <label>Planet Radius (m): </label>
          <input type="number" value={planetRadius} onChange={(e) => setPlanetRadius(Number(e.target.value))} />
        </div>
        <div>
          <label>Rotation Period (s): </label>
          <input type="number" value={rotationPeriod} onChange={(e) => setRotationPeriod(Number(e.target.value))} />
        </div>
        <div>
          <label>Planet Texture: </label>
          <select value={planetTexture} onChange={(e) => setPlanetTexture(e.target.value)}>
            <option value="earth">Earth</option>
            <option value="mars">Mars</option>
            <option value="moon">Moon</option>
          </select>
        </div>
        <button onClick={animateProjectile}>Launch Projectile</button>
        <div>
          <h3>Landing Position:</h3>
          <p>Latitude: {landingPosition.lat.toFixed(2)}°</p>
          <p>Longitude: {landingPosition.lon.toFixed(2)}°</p>
        </div>
      </div>
    </div>
  );
};

export default PlanetaryProjectileMotion;
