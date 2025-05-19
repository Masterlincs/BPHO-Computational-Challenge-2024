import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Challenge7.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdvancedProjectileMotionSimulator = () => {
  const [initialVelocity, setInitialVelocity] = useState(10);
  const [launchAngle, setLaunchAngle] = useState(85);
  const [gravity, setGravity] = useState(9.8);
  const [numPoints, setNumPoints] = useState(250);
  const chartRef = useRef(null);

  const calculateRange = useCallback((t, u, theta, g) => {
    const thetaRad = theta * Math.PI / 180;
    return Math.sqrt((u**2 * t**2) - g * t**3 * u * Math.sin(thetaRad) + (0.25 * g**2 * t**4));
  }, []);

  const calculateTrajectory = useCallback((theta, u, g, N) => {
    const thetaRad = theta * Math.PI / 180;

    // Calculate the total time of flight
    const T = (2 * u * Math.sin(thetaRad)) / g;

    // Calculate t_plus and t_minus
    const t_plus = (3*u) / (2*g) * Math.sin(thetaRad) + Math.sqrt((9* (u**2) / (4 * (g**2))) * Math.sin(thetaRad)**2 - ((2 * (u**2)/g**2)));
    const t_minus = (3*u) / (2*g) * Math.sin(thetaRad) - Math.sqrt((9* (u**2) / (4 * (g**2))) * Math.sin(thetaRad)**2 - ((2 * (u**2)/g**2)));

    // Calculate range at t_plus and t_minus
    const range_plus = calculateRange(t_plus, u, theta, g);
    const range_minus = calculateRange(t_minus, u, theta, g);

    // Generate data points
    const data = [];
    for (let i = 0; i < N; i++) {
      const t = (i * T) / (N - 1);
      const range = calculateRange(t, u, theta, g);
      data.push({ t, range });
    }

    return { data, t_plus, t_minus, range_plus, range_minus };
  }, [calculateRange]);

  const trajectoryData = useMemo(() => {
    return calculateTrajectory(launchAngle, initialVelocity, gravity, numPoints);
  }, [launchAngle, initialVelocity, gravity, numPoints, calculateTrajectory]);

  const chartData = {
    datasets: [
      {
        label: `Range over time (θ = ${launchAngle}°)`,
        data: trajectoryData.data.map(point => ({ x: point.t, y: point.range })),
        borderColor: 'blue',
        backgroundColor: 'blue',
        fill: false,
        tension: 0,
        pointRadius: 0,
      },
      {
        label: 'Extrema Points',
        data: [
          { x: trajectoryData.t_minus, y: trajectoryData.range_minus },
          { x: trajectoryData.t_plus, y: trajectoryData.range_plus },
        ],
        borderColor: 'red',
        backgroundColor: 'red',
        fill: false,
        showLine: false,
        pointRadius: 5,
        pointStyle: 'star',
      }
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
          text: 'Time (s)',
          color: '#333',
          font: { size: 14, weight: 'bold' },
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Range (m)',
          color: '#333',
          font: { size: 14, weight: 'bold' },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const point = context.raw;
            return `Time: ${point.x.toFixed(2)}s, Range: ${point.y.toFixed(2)}m`;
          },
        },
      },
      legend: { position: 'top' },
    },
  };

  const saveAsPNG = () => {
    if (chartRef.current) {
      const link = document.createElement('a');
      link.download = 'projectile_motion_chart.png';
      link.href = chartRef.current.canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="trajectoryCalculator">
      <h1 className="title">Challenge 7</h1>
      <div className="inputContainer">
        <div className="inputGroup">
          <label>Initial Velocity (m/s):</label>
          <input
            type="number"
            value={initialVelocity}
            onChange={(e) => setInitialVelocity(Number(e.target.value))}
          />
        </div>
        <div className="inputGroup">
          <label>Launch Angle (°):</label>
          <input
            type="number"
            value={launchAngle}
            onChange={(e) => setLaunchAngle(Number(e.target.value))}
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
          <label>Number of Points:</label>
          <input
            type="number"
            value={numPoints}
            onChange={(e) => setNumPoints(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="chartContainer">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
      <div className="buttonContainer">
        <button onClick={saveAsPNG} className="btn btnPrimary">Save as PNG</button>
      </div>
      <div className="dataTable">
        <h3>Extrema Points:</h3>
        <table>
          <thead>
            <tr>
              <th>Point</th>
              <th>Time (s)</th>
              <th>Range (m)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Maxima</td>
              <td>{trajectoryData.t_minus.toFixed(2)}</td>
              <td>{trajectoryData.range_minus.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Minima</td>
              <td>{trajectoryData.t_plus.toFixed(2)}</td>
              <td>{trajectoryData.range_plus.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvancedProjectileMotionSimulator;