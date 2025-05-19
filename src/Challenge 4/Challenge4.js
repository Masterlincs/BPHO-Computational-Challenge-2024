import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';

Chart.register(...registerables);

function ProjectileMotionSimulator() {
    const [launchHeight, setLaunchHeight] = useState(10);
    const [launchAngle, setLaunchAngle] = useState(30);
    const [gravity, setGravity] = useState(9.81);
    const [launchSpeed, setLaunchSpeed] = useState(20);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const chartRef = useRef();
    const intervalRef = useRef(null);

    const calculateTrajectory = useCallback((angle, u, g, h) => {
        const theta = angle * Math.PI / 180;
        const vx = u * Math.cos(theta);
        const vy = u * Math.sin(theta);

        const flightTime = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
        const range = vx * flightTime;
        const maxHeight = h + (vy * vy) / (2 * g);

        return { range, maxHeight, flightTime };
    }, []);

    const calculateOptimumAngle = useCallback((u, h, g) => {
        const theta = Math.asin(1 / Math.sqrt(2 + (2 * g * h) / (u ** 2)));
        return theta * 180 / Math.PI;
    }, []);

    const calculateTrajectoryPoints = useCallback((angle, u, h, g, steps) => {
        const points = [];
        const { flightTime } = calculateTrajectory(angle, u, g, h);
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * flightTime;
            const x = (u * Math.cos(angle * Math.PI / 180)) * t;
            const y = h + (u * Math.sin(angle * Math.PI / 180)) * t - (0.5 * g * t * t);
            points.push({ x, y, time: t });
            if (y <= 0) break;
        }
        return points;
    }, [calculateTrajectory]);

    const trajectoryData = useMemo(() => {
        const userTrajectory = calculateTrajectoryPoints(launchAngle, launchSpeed, launchHeight, gravity, 100);
        
        const optimumAngle = calculateOptimumAngle(launchSpeed, launchHeight, gravity);
        const optimumTrajectory = calculateTrajectoryPoints(optimumAngle, launchSpeed, launchHeight, gravity, 100);

        return [
            { id: "User Trajectory", points: userTrajectory, color: "#4285F4" },
            { id: "Optimum Trajectory", points: optimumTrajectory, color: "#34A853" },
        ];
    }, [launchAngle, launchSpeed, launchHeight, gravity, calculateTrajectoryPoints, calculateOptimumAngle]);

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
                    data: trajectoryData[0]?.points.length > 0 ? [trajectoryData[0].points[Math.min(animationIndex, trajectoryData[0].points.length - 1)]] : [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgb(255, 99, 132)',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                },
                {
                    label: 'Ball 2',
                    data: trajectoryData[1]?.points.length > 0 ? [trajectoryData[1].points[Math.min(animationIndex, trajectoryData[1].points.length - 1)]] : [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgb(75, 192, 192)',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                }
            ])
        };
    }, [trajectoryData, animationIndex]);

    const chartOptions = useMemo(() => {
        const allPoints = trajectoryData.flatMap(d => d.points);
        const xMax = Math.max(...allPoints.map(p => p.x));
        const yMax = Math.max(...allPoints.map(p => p.y));
    
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
                                `X: ${point.x.toFixed(2)} m`,
                                `Y: ${point.y.toFixed(2)} m`,
                                `T: ${point.time ? point.time.toFixed(2) : 'N/A'} s`,
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
    }, [trajectoryData]);

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

    const optimumAngle = useMemo(() => {
        return calculateOptimumAngle(launchSpeed, launchHeight, gravity);
    }, [launchSpeed, launchHeight, gravity, calculateOptimumAngle]);

    return (
        <div className="trajectory-calculator">
            <h2 className="title">Challenge 4</h2>
            <div className="input-container">
                <div className="input-group">
                    <label htmlFor="launchHeight">Launch Height (m):</label>
                    <input
                        id="launchHeight"
                        type="number"
                        value={launchHeight}
                        onChange={(e) => setLaunchHeight(Number(e.target.value))}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="launchAngle">Launch Angle (degrees):</label>
                    <input
                        id="launchAngle"
                        type="number"
                        value={launchAngle}
                        onChange={(e) => setLaunchAngle(Number(e.target.value))}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="gravity">Gravity (m/s²):</label>
                    <input
                        id="gravity"
                        type="number"
                        value={gravity}
                        onChange={(e) => setGravity(Number(e.target.value))}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="launchSpeed">Launch Speed (m/s):</label>
                    <input
                        id="launchSpeed"
                        type="number"
                        value={launchSpeed}
                        onChange={(e) => setLaunchSpeed(Number(e.target.value))}
                    />
                </div>
            </div>
            <div className="trajectory-data">
                <h3>Trajectory Data:</h3>
                <ul>
                    <li>Optimum launch angle for maximum range: {optimumAngle.toFixed(2)}°</li>
                    <li>User trajectory range: {calculateTrajectory(launchAngle, launchSpeed, gravity, launchHeight).range.toFixed(2)} m</li>
                    <li>Optimum trajectory range: {calculateTrajectory(optimumAngle, launchSpeed, gravity, launchHeight).range.toFixed(2)} m</li>
                </ul>
            </div>
            <div className="button-container">
                <button
                    className={`btn btn-primary ${isAnimating ? 'btn-disabled' : ''}`}
                    onClick={replayAnimation}
                    disabled={isAnimating}
                >
                    Replay Animation
                </button>
                <button
                    className="btn btn-primary"
                    onClick={saveAsPNG}
                >
                    Save as PNG
                </button>
            </div>
            <div className="chart-container">
                <Line ref={chartRef} data={chartData} options={chartOptions} />
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
                                        <td>{point.time.toFixed(2)}</td>
                                        <td>{point.x.toFixed(2)}</td>
                                        <td>{point.y.toFixed(2)}</td>
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