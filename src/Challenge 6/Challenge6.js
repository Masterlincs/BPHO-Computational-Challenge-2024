import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';

Chart.register(...registerables);

function ProjectileMotionSimulator() {
  const [launchAngle, setLaunchAngle] = useState(60);
  const [initialVelocity, setInitialVelocity] = useState(10);
  const [gravity, setGravity] = useState(9.81);
  const [initialHeight, setInitialHeight] = useState(2);
  const [numPoints, setNumPoints] = useState(100);
  const chartRef = useRef(null);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef(null);

  const calculateProjectileTrajectory = useCallback((theta, u, g, h, N) => {
    const toRadians = (deg) => deg * Math.PI / 180;
    theta = toRadians(theta);
    
    // Calculate time of flight
    const T = (u * Math.sin(theta) + Math.sqrt(u**2 * Math.sin(theta)**2 + 2*g*h)) / g;
    
    // Calculate range
    const R = u * Math.cos(theta) * T;
    
    // Generate points for the trajectory
    const t = Array.from({length: N}, (_, i) => i * T / (N - 1));
    const x = t.map(ti => u * Math.cos(theta) * ti);
    const y = t.map(ti => h + u * Math.sin(theta) * ti - 0.5 * g * ti**2);
    
    // Calculate apogee
    const ta = u * Math.sin(theta) / g;
    const xa = u * Math.cos(theta) * ta;
    const ya = h + u * Math.sin(theta) * ta - 0.5 * g * ta**2;
    
    // Calculate distance traveled (length of the trajectory)
    const dx = x.slice(1).map((xi, i) => xi - x[i]);
    const dy = y.slice(1).map((yi, i) => yi - y[i]);
    const distanceTraveled = dx.reduce((sum, dxi, i) => sum + Math.sqrt(dxi**2 + dy[i]**2), 0);
    
    return {
      x, y, R, T, xa, ya, ta, distanceTraveled
    };
  }, []);

  const trajectoryData = useMemo(() => {
    const theta_m = Math.asin(Math.sqrt(1 / (2 + 2*gravity*initialHeight/initialVelocity**2))) * 180 / Math.PI;
    const userTrajectory = calculateProjectileTrajectory(launchAngle, initialVelocity, gravity, initialHeight, numPoints);
    const maxRangeTrajectory = calculateProjectileTrajectory(theta_m, initialVelocity, gravity, initialHeight, numPoints);
    
    return {
      user: userTrajectory,
      maxRange: maxRangeTrajectory,
      theta_m
    };
  }, [launchAngle, initialVelocity, gravity, initialHeight, numPoints, calculateProjectileTrajectory]);

  useEffect(() => {
    startAnimation();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trajectoryData]);

  const startAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsAnimating(true);
    setAnimationIndex(0);

    intervalRef.current = setInterval(() => {
      setAnimationIndex((prevIndex) => {
        if (prevIndex < trajectoryData.user.x.length - 1) {
          return prevIndex + 1;
        } else {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          return prevIndex;
        }
      });
    }, 50);
  };

  const replayAnimation = () => {
    startAnimation();
  };

  const saveAsPNG = () => {
    if (chartRef.current) {
      const link = document.createElement('a');
      link.download = 'trajectory_chart.png';
      link.href = chartRef.current.canvas.toDataURL('image/png');
      link.click();
    }
  };

  const chartData = {
    datasets: [
      {
        label: 'User Trajectory',
        data: trajectoryData.user.x.map((x, i) => ({ x, y: trajectoryData.user.y[i] })),
        borderColor: 'rgba(66, 133, 244, 0.7)',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Max Range Trajectory',
        data: trajectoryData.maxRange.x.map((x, i) => ({ x, y: trajectoryData.maxRange.y[i] })),
        borderColor: 'rgba(52, 168, 83, 0.7)',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Ball',
        data: [{ x: trajectoryData.user.x[animationIndex], y: trajectoryData.user.y[animationIndex] }],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgb(255, 99, 132)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const chartOptions = {
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
        ticks: {
          color: '#0056b3',
        },
        grid: {
          color: 'rgba(0, 86, 179, 0.1)',
        },
        min: 0,
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(0, 86, 179, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        cornerRadius: 6,
        callbacks: {
          label: (context) => {
            const point = context.raw;
            return [
              `X: ${point.x.toFixed(2)} m`,
              `Y: ${point.y.toFixed(2)} m`,
            ];
          },
        },
      },
      legend: {
        display: true,
      },
      annotation: {
        annotations: {
          ground: {
            type: 'line',
            yMin: 0,
            yMax: 0,
            borderColor: 'rgba(255, 99, 132, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
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

  return (
    <div className="trajectoryCalculator">
      <h1 className="title">Challenge 6</h1>
      <form className="inputContainer">
        <div className="inputGroup">
          <label>Launch Angle (degrees):</label>
          <input
            type="number"
            value={launchAngle}
            onChange={(e) => setLaunchAngle(Number(e.target.value))}
          />
        </div>
        <div className="inputGroup">
          <label>Initial Velocity (m/s):</label>
          <input
            type="number"
            value={initialVelocity}
            onChange={(e) => setInitialVelocity(Number(e.target.value))}
          />
        </div>
        <div className="inputGroup">
          <label>Gravity (m/s²):</label>
          <input
            type="number"
            value={gravity}
            onChange={(e) => setGravity(Number(e.target.value))}
          />
        </div>
        <div className="inputGroup">
          <label>Initial Height (m):</label>
          <input
            type="number"
            value={initialHeight}
            onChange={(e) => setInitialHeight(Number(e.target.value))}
          />
        </div>
        <div className="inputGroup">
          <label>Number of Points:</label>
          <input
            type="number"
            value={numPoints}
            onChange={(e) => setNumPoints(Number(e.target.value))}
          />
        </div>
      </form>
      <div className="trajectoryData">
        <h3>User Trajectory (Blue)</h3>
        <ul>
          <li>Range: {trajectoryData.user.R.toFixed(2)} m</li>
          <li>Time of flight: {trajectoryData.user.T.toFixed(2)} s</li>
          <li>Apogee: ({trajectoryData.user.xa.toFixed(2)} m, {trajectoryData.user.ya.toFixed(2)} m) at {trajectoryData.user.ta.toFixed(2)} s</li>
          <li>Distance traveled: {trajectoryData.user.distanceTraveled.toFixed(2)} m</li>
        </ul>
        
        <h3>Maximum Range Trajectory (Green)</h3>
        <ul>
          <li>Launch angle: {trajectoryData.theta_m.toFixed(2)}°</li>
          <li>Range: {trajectoryData.maxRange.R.toFixed(2)} m</li>
          <li>Time of flight: {trajectoryData.maxRange.T.toFixed(2)} s</li>
          <li>Apogee: ({trajectoryData.maxRange.xa.toFixed(2)} m, {trajectoryData.maxRange.ya.toFixed(2)} m) at {trajectoryData.maxRange.ta.toFixed(2)} s</li>
          <li>Distance traveled: {trajectoryData.maxRange.distanceTraveled.toFixed(2)} m</li>
        </ul>
      </div>
      <div className="buttonContainer">
        <button className="btn btnPrimary" onClick={saveAsPNG}>Save as PNG</button>
        <button 
          className={`btn ${isAnimating ? 'btnDisabled' : 'btnPrimary'}`} 
          onClick={replayAnimation} 
          disabled={isAnimating}
        >
          Replay Animation
        </button>
      </div>
      <div className="chartContainer">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
      <div className="dataTable">
        <h3>Detailed Data:</h3>
        <table>
          <thead>
            <tr>
              <th>Time (s)</th>
              <th>x (m)</th>
              <th>y (m)</th>
            </tr>
          </thead>
          <tbody>
            {trajectoryData.user.x.map((x, index) => (
              <tr key={index}>
                <td>{(index * trajectoryData.user.T / (numPoints - 1)).toFixed(2)}</td>
                <td>{x.toFixed(2)}</td>
                <td>{trajectoryData.user.y[index].toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectileMotionSimulator;