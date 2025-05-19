import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
/// import './Challenge5.css';

Chart.register(...registerables);

function ProjectileMotionSimulator() {
  const [targetX, setTargetX] = useState(1000);
  const [targetY, setTargetY] = useState(300);
  const [launchHeight, setLaunchHeight] = useState(0);
  const [launchSpeed, setLaunchSpeed] = useState(150);
  const [gravity, setGravity] = useState(9.81);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const chartRef = useRef();
  const intervalRef = useRef(null);

  const calculateTrajectory = useCallback((angle, u, g, h) => {
    const radians = angle * Math.PI / 180;
    const vx = u * Math.cos(radians);
    const vy = u * Math.sin(radians);
    const flightTime = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
    const range = vx * flightTime;
    const maxHeight = h + (vy * vy) / (2 * g);
    return { range, maxHeight, flightTime };
  }, []);

  const calculateLaunchAngle = useCallback((x, y, u, g) => {
    const theta1 = Math.atan((u * u + Math.sqrt(Math.pow(u, 4) - g * (g * x * x + 2 * y * u * u))) / (g * x));
    const theta2 = Math.atan((u * u - Math.sqrt(Math.pow(u, 4) - g * (g * x * x + 2 * y * u * u))) / (g * x));
    const angle1 = theta1 * 180 / Math.PI;
    const angle2 = theta2 * 180 / Math.PI;
    if (isNaN(angle1) || isNaN(angle2)) {
      return null; // No real solutions, projectile can't reach the target with given parameters
    }
    return [angle1, angle2];
  }, []);

  const calculateBoundingParabola = useCallback((u, g, x, h = 0) => {
    return h + ((u * u) / (2 * g)) - ((g * x * x) / (2 * u ** 2));
  }, []);

  const calculateMaximumRange = useCallback((u, h, g) => {
    const optimumAngle = Math.atan(1 / Math.sqrt(1 + (g * h) / (u * u)));
    return (u * u / g) * (Math.sin(2 * optimumAngle) + Math.sqrt(Math.sin(2 * optimumAngle) * Math.sin(2 * optimumAngle) + 2 * g * h / (u * u)));
  }, []);

  const calculateOptimumAngle = useCallback((u, h, g) => {
    return Math.atan(1 / Math.sqrt(1 + (g * h) / (u * u))) * 180 / Math.PI;
  }, []);

  const { minLaunchSpeed, angles, boundingParabola, maximumRange, optimumAngle } = useMemo(() => {
    const minSpeed = Math.sqrt(gravity * (targetY + Math.sqrt(targetX * targetX + targetY * targetY)));
    const angles = calculateLaunchAngle(targetX, targetY, launchSpeed, gravity);
    const boundingParabola = x => calculateBoundingParabola(launchSpeed, gravity, x);
    const maximumRange = calculateMaximumRange(launchSpeed, launchHeight, gravity);
    const optimumAngle = calculateOptimumAngle(launchSpeed, launchHeight, gravity);
    return { minLaunchSpeed: minSpeed, angles, boundingParabola, maximumRange, optimumAngle };
  }, [targetX, targetY, launchHeight, gravity, launchSpeed, calculateLaunchAngle, calculateBoundingParabola, calculateMaximumRange, calculateOptimumAngle]);

  const calculateTrajectoryPoints = useCallback((angle, u, h, maxX) => {
    const points = [];
    const radians = angle * Math.PI / 180;
    const vx = u * Math.cos(radians);
    const vy = u * Math.sin(radians);
    for (let x = 0; x <= maxX; x += 5) { // Adjust step size for better performance
      const t = x / vx;
      const y = h + vy * t - 0.5 * gravity * t * t;
      if (y < 0) break;
      if (!isNaN(x) && !isNaN(y) && !isNaN(t)) {
        points.push({ x, y, time: t });
      }
    }
    return points;
  }, [gravity]);

  const trajectoryData = useMemo(() => {
    const colors = [
      "#4285F4", // Google Blue
      "#34A853", // Google Green
      "#EA4335", // Google Red
      "#FBBC05", // Google Yellow
      "#FF6D01", // Orange
    ];
    const maxX = Math.max(targetX * 2, maximumRange * 1.5);
    const trajectories = [
      { id: "High Angle", angle: angles ? angles[0] : null },
      { id: "Low Angle", angle: angles ? angles[1] : null },
      { id: "Optimum Angle (Max Range)", angle: optimumAngle },
    ].filter(t => t.angle !== null);

    const trajectoryPoints = trajectories.map((t, index) => ({
      ...t,
      points: calculateTrajectoryPoints(t.angle, launchSpeed, launchHeight, maxX),
      color: colors[index]
    }));

    // Calculate the bounding parabola points
    const boundingPoints = [];
    for (let x = 0; x <= maxX; x += 5) { // Adjust step size here as well
      const y = boundingParabola(x);
      if (y < 0) break;
      boundingPoints.push({ x, y });
    }

    // Correct handling of minimum speed parabolas
    const minSpeedPoints = [];
    if (angles) {
      const minLaunchAngles = calculateLaunchAngle(targetX, targetY, minLaunchSpeed, gravity);
      minLaunchAngles.forEach(angle => {
        const points = calculateTrajectoryPoints(angle, minLaunchSpeed, launchHeight, maxX);
        minSpeedPoints.push(...points);
      });
    }

    return [
      ...trajectoryPoints,
      { id: "Bounding Parabola", points: boundingPoints, color: colors[3] },
      { id: "Minimum Speed Parabola", points: minSpeedPoints, color: colors[4] }
    ];
  }, [angles, launchSpeed, minLaunchSpeed, calculateTrajectoryPoints, boundingParabola, targetX, launchHeight, gravity, calculateBoundingParabola, optimumAngle, maximumRange]);

  const chartData = useMemo(() => {
    return {
      datasets: trajectoryData.map(trajectory => ({
        label: trajectory.id,
        data: trajectory.points,
        borderColor: trajectory.color,
        backgroundColor: trajectory.color,
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      })).concat([
        {
          label: 'Ball 1',
          data: trajectoryData[0]?.points?.length > 0 ? [trajectoryData[0].points[Math.min(animationIndex, trajectoryData[0].points.length - 1)]] : [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgb(255, 99, 132)',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: 'Ball 2',
          data: trajectoryData[1]?.points?.length > 0 ? [trajectoryData[1].points[Math.min(animationIndex, trajectoryData[1].points.length - 1)]] : [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgb(75, 192, 192)',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: 'Ball 3',
          data: trajectoryData[2]?.points?.length > 0 ? [trajectoryData[2].points[Math.min(animationIndex, trajectoryData[2].points.length - 1)]] : [],
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgb(153, 102, 255)',
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ])
    };
  }, [trajectoryData, animationIndex]);

  const chartOptions = useMemo(() => {
    const allPoints = trajectoryData.flatMap(d => d.points);
    const xMax = Math.max(...allPoints.map(p => p.x), targetX);
    const yMax = Math.max(...allPoints.map(p => p.y), targetY);

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Distance (m)',
            color: '#0056b3',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          max: xMax * 1.1,
          ticks: {
            color: '#0056b3',
          },
          grid: {
            color: 'rgba(0, 86, 179, 0.1)',
          },
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Height (m)',
            color: '#0056b3',
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          max: yMax * 1.1,
          min: 0,
          ticks: {
            color: '#0056b3',
          },
          grid: {
            color: 'rgba(0, 86, 179, 0.1)',
          },
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          backgroundColor: 'rgba(0, 86, 179, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const point = context.raw;
              return [
                `X: ${point.x.toFixed(2)}m`,
                `Y: ${point.y.toFixed(2)}m`,
                `T: ${point.time ? point.time.toFixed(2) : 'N/A'}s`,
              ];
            },
          },
        },
      },
      animation: {
        duration: 0,
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    };
  }, [trajectoryData, targetX, targetY]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const replayAnimation = () => {
    setAnimationIndex(0);
    setIsAnimating(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setAnimationIndex((prevIndex) => {
        const maxIndex = Math.max(...trajectoryData.map(d => d.points.length));
        if (prevIndex >= maxIndex - 1) {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          return maxIndex - 1;
        }
        return prevIndex + 1;
      });
    }, 50);
  };

  const saveAsPNG = () => {
    const link = document.createElement('a');
    link.download = 'projectile_motion.png';
    link.href = chartRef.current.toBase64Image();
    link.click();
  };

  return (
    <div className="trajectory-calculator">
      <h2 className="title">Challenge 5</h2>
      <div className="input-container">
        <div className="input-group">
          <label>Target X (m):</label>
          <input type="number" value={targetX} onChange={(e) => setTargetX(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Target Y (m):</label>
          <input type="number" value={targetY} onChange={(e) => setTargetY(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Launch Height (m):</label>
          <input type="number" value={launchHeight} onChange={(e) => setLaunchHeight(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Launch Speed (m/s):</label>
          <input type="number" value={launchSpeed} onChange={(e) => setLaunchSpeed(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Gravity (m/s²):</label>
          <input type="number" value={gravity} onChange={(e) => setGravity(Number(e.target.value))} />
        </div>
      </div>
      <div className="button-container">
        <button className={`btn btn-primary ${isAnimating ? 'btn-disabled' : ''}`} onClick={replayAnimation} disabled={isAnimating}>
          Replay Animation
        </button>
        <button className="btn btn-primary" onClick={saveAsPNG}>Save as PNG</button>
      </div>
      <div className="chart-container">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
      <div className="trajectory-data">
    <h3>Trajectory Data:</h3>
    <ul>
        <li>Minimum launch speed: {minLaunchSpeed.toFixed(2)} m/s</li>
        <li>Calculated launch angles: {angles ? angles.map(a => a.toFixed(2)).join(', ') : 'No valid angles'} degrees</li>
        <li>Maximum range: {maximumRange.toFixed(2)} m</li>
    </ul>
  </div>
      {trajectoryData.map((trajectory, index) => (
        <div key={index} className="trajectory-data">
          <h3>{trajectory.id} Data:</h3>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Time (s)</th>
                  <th>x (m)</th>
                  <th>y (m)</th>
                </tr>
              </thead>
              <tbody>
                {trajectory.points.map((point, pointIndex) => (
                  <tr key={pointIndex}>
                    <td>{point.time !== undefined ? point.time.toFixed(2) : 'N/A'}</td>
                    <td>{point.x !== undefined ? point.x.toFixed(2) : 'N/A'}</td>
                    <td>{point.y !== undefined ? point.y.toFixed(2) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}  

export default ProjectileMotionSimulator;