import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import './Challenge1.css';

Chart.register(...registerables);

const TrajectoryCalculator = () => {
  const [initialVelocity, setInitialVelocity] = useState(10);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(0);
  const [trajectory, setTrajectory] = useState([]);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const chartRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    calculateTrajectory();
  }, [initialVelocity, angle, height]);

  useEffect(() => {
    if (trajectory.length > 0) {
      startAnimation();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trajectory]);

  const calculateTrajectory = () => {
    const g = 9.81;
    const v0 = initialVelocity;
    const theta = angle * (Math.PI / 180);
    const h0 = height;

    const trajectoryPoints = [];
    let t = 0;
    let x, y, prevY, vx, vy, v;

    do {
      x = v0 * Math.cos(theta) * t;
      y = h0 + v0 * Math.sin(theta) * t - 0.5 * g * t * t;
      vx = v0 * Math.cos(theta);
      vy = v0 * Math.sin(theta) - g * t;
      v = Math.sqrt(vx * vx + vy * vy);
      
      if (y < 0) {
        const ratio = prevY / (prevY - y);
        const finalX = trajectoryPoints[trajectoryPoints.length - 1].x + ratio * (x - trajectoryPoints[trajectoryPoints.length - 1].x);
        const finalT = trajectoryPoints[trajectoryPoints.length - 1].t + ratio * (t - trajectoryPoints[trajectoryPoints.length - 1].t);
        const finalVx = vx;
        const finalVy = trajectoryPoints[trajectoryPoints.length - 1].vy + ratio * (vy - trajectoryPoints[trajectoryPoints.length - 1].vy);
        const finalV = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
        trajectoryPoints.push({ x: finalX, y: 0, t: finalT, vx: finalVx, vy: finalVy, v: finalV });
        break;
      }

      trajectoryPoints.push({ x, y, t, vx, vy, v });
      prevY = y;
      t += 0.1;
    } while (y >= 0);

    setTrajectory(trajectoryPoints);
    setAnimationIndex(0);
    setIsAnimating(false);
  };

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
              `T: ${point.t.toFixed(2)} s`,
              `V: ${point.v.toFixed(2)} m/s`,
            ];
          },
        },
      },
      legend: {
        display: false,
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

  const maxHeight = trajectory.length > 0 ? Math.max(...trajectory.map(point => point.y)).toFixed(2) : 'N/A';
  const range = trajectory.length > 0 ? trajectory[trajectory.length - 1].x.toFixed(2) : 'N/A';
  const timeOfFlight = trajectory.length > 0 ? trajectory[trajectory.length - 1].t.toFixed(2) : 'N/A';

  return (
    <div className="trajectory-calculator">
      <h2 className="title">Challenge 1</h2>
      <div className="input-container">
        <div className="input-group">
          <label>
            Initial Velocity (m/s):
            <input
              type="number"
              value={initialVelocity}
              onChange={(e) => setInitialVelocity(Number(e.target.value))}
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
        </ul>
      </div>
    </div>
  );
};

export default TrajectoryCalculator;