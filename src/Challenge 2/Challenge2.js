import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import './Challenge2.css';

Chart.register(...registerables);

const TrajectoryCalculator = () => {
  const [angle, setAngle] = useState(45);
  const [grav, setGrav] = useState(9.81);
  const [launchSpeed, setLaunchSpeed] = useState(10);
  const [height, setHeight] = useState(0);
  const [trajectory, setTrajectory] = useState([]);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const chartRef = useRef(null);
  const intervalRef = useRef(null);

  const calculateTrajectory = (time) => {
    const anglerad = angle * Math.PI / 180;
    const g = grav;
    const u = launchSpeed;
    const h = height;
    const x = u * Math.cos(anglerad) * time;
    const x_a = ((u * u) / g) * Math.sin(anglerad) * Math.cos(anglerad);
    const y_a = h + ((u * u) / (2 * g)) * Math.pow(Math.sin(anglerad), 2);
    const range = (Math.pow(u, 2) / g) * ((Math.sin(anglerad) * Math.cos(anglerad)) + (Math.cos(anglerad) * Math.sqrt(Math.pow(Math.sin(anglerad), 2) + ((2 * g * h) / Math.pow(u, 2)))));
    const y = h + x * Math.tan(anglerad) - (g / (2 * (u * u)) * (1 + Math.pow(Math.tan(anglerad), 2)) * (x * x));
    const T = range / (u * Math.cos(anglerad));

    return { x, y, x_a, y_a, range, T, time };
  };

  const trajectoryData = useMemo(() => {
    if (launchSpeed === 0 || angle === 0 || angle === 180) return [];
    
    const points = [];
    let t = 0;
    while (points.length < 1000) {
      const point = calculateTrajectory(t);
      if (point.y < 0 || !isFinite(point.x) || !isFinite(point.y)) break;
      points.push(point);
      t += 0.02;
    }
    return points;
  }, [angle, grav, launchSpeed, height, calculateTrajectory]);

  useEffect(() => {
    setTrajectory(trajectoryData);
    setAnimationIndex(0);
    setIsAnimating(false);
  }, [trajectoryData]);

  useEffect(() => {
    if (trajectory.length > 0) {
      startAnimation();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trajectory, startAnimation]);

  const startAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsAnimating(true);
    setAnimationIndex(0);

    intervalRef.current = setInterval(() => {
      setAnimationIndex((prevIndex) => {
        if (prevIndex < trajectory.length - 1) {
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
        label: 'Trajectory',
        data: trajectory,
        borderColor: 'rgba(0, 123, 255, 0.7)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Ball',
        data: trajectory.length > 0 ? [trajectory[animationIndex]] : [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgb(255, 99, 132)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Y Apogee',
        data: trajectory.length > 0 ? [{ x: trajectory[0].x_a, y: trajectory[0].y_a }] : [],
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgb(255, 159, 64)',
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
              `T: ${point.time ? point.time.toFixed(2) : 'N/A'} s`,
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

  const maxHeight = trajectory.length > 0 ? trajectory[0].y_a.toFixed(2) : 'N/A';
  const range = trajectory.length > 0 ? trajectory[0].range.toFixed(2) : 'N/A';
  const timeOfFlight = trajectory.length > 0 ? trajectory[0].T.toFixed(2) : 'N/A';
  const xApogee = trajectory.length > 0 ? trajectory[0].x_a.toFixed(2) : 'N/A';
  const yApogee = trajectory.length > 0 ? trajectory[0].y_a.toFixed(2) : 'N/A';

  return (
    <div className="trajectory-calculator">
      <h2 className="title">Challenge 2</h2>
      <div className="input-container">
        <div className="input-group">
          <label>
            Launch Speed (m/s):
            <input
              type="number"
              value={launchSpeed}
              onChange={(e) => setLaunchSpeed(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="input-group">
          <label>
            Angle (degrees):
            <input
              type="number"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="input-group">
          <label>
            Initial Height (m):
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="input-group">
          <label>
            Gravity (m/s²):
            <input
              type="number"
              value={grav}
              onChange={(e) => setGrav(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
      
      <div className="button-container">
        <button onClick={saveAsPNG} className="btn btn-primary">
          Save as PNG
        </button>
        <button
          onClick={replayAnimation}
          disabled={isAnimating}
          className={`btn ${isAnimating ? 'btn-disabled' : 'btn-primary'}`}
        >
          Replay Animation
        </button>
      </div>

      <div className="chart-container">
        <Line
          ref={chartRef}
          data={chartData}
          options={chartOptions}
        />
      </div>

      <div className="trajectory-data">
        <h3>Trajectory Data:</h3>
        <ul>
          <li>Maximum Height: {maxHeight} m</li>
          <li>Range: {range} m</li>
          <li>Time of Flight: {timeOfFlight} s</li>
          <li>X Apogee: {xApogee} m</li>
          <li>Y Apogee: {yApogee} m</li>
        </ul>
      </div>

      <div className="data-table">
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
            {trajectory.map((point, index) => (
              <tr key={index}>
                <td>{point.time.toFixed(2)}</td>
                <td>{point.x.toFixed(2)}</td>
                <td>{point.y.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrajectoryCalculator;