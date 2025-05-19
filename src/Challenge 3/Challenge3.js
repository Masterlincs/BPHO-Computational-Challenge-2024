import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import './Challenge3.css';

Chart.register(...registerables);

function Challenge3() {
    const [targetX, setTargetX] = useState(10);
    const [targetY, setTargetY] = useState(5);
    const [grav, setGrav] = useState(9.81);
    const [launchSpeed, setLaunchSpeed] = useState(15);
    const [initialHeight, setInitialHeight] = useState(0);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const chartRef = useRef();
    const intervalRef = useRef(null);

    const calculateLaunchAngle = useCallback((x, y, v, g) => {
        const root = v ** 4 - g * (g * x ** 2 + 2 * y * v ** 2);
        if (root < 0) return null;

        const angle1 = Math.atan((v ** 2 + Math.sqrt(root)) / (g * x));
        const angle2 = Math.atan((v ** 2 - Math.sqrt(root)) / (g * x));

        return [angle1 * 180 / Math.PI, angle2 * 180 / Math.PI];
    }, []);

    const angles = useMemo(() => calculateLaunchAngle(targetX, targetY - initialHeight, launchSpeed, grav), [targetX, targetY, initialHeight, launchSpeed, grav, calculateLaunchAngle]);

    const minLaunchSpeed = useMemo(() => {
        let low = 0;
        let high = 100;
        const epsilon = 0.01;

        while (high - low > epsilon) {
            const mid = (low + high) / 2;
            const angles = calculateLaunchAngle(targetX, targetY - initialHeight, mid, grav);

            if (angles) {
                high = mid;
            } else {
                low = mid;
            }
        }

        return high;
    }, [targetX, targetY, initialHeight, grav, calculateLaunchAngle]);

    const calculateTrajectoryPoints = useCallback((angle, u, steps) => {
        const points = [];
        const radians = angle * Math.PI / 180;
        const vx = u * Math.cos(radians);
        const vy = u * Math.sin(radians);
        let t = 0;
        let y = initialHeight;
        const dt = 0.1; // Time step

        while (y >= 0) {
            const x = vx * t;
            y = initialHeight + vy * t - 0.5 * grav * t * t;
            points.push({ x, y, time: t });
            t += dt;
        }
        return points;
    }, [grav, initialHeight]);

    const trajectoryData = useMemo(() => {
        if (launchSpeed < minLaunchSpeed || !angles) return [];
        
        const pointsHigh = calculateTrajectoryPoints(angles[0], launchSpeed, 100);
        const pointsLow = calculateTrajectoryPoints(angles[1], launchSpeed, 100);

        // Calculate the angle for minimum launch speed
        const minSpeedAngles = calculateLaunchAngle(targetX, targetY, minLaunchSpeed, grav);
        const pointsMin = minSpeedAngles ? calculateTrajectoryPoints(minSpeedAngles[0], minLaunchSpeed, 100) : [];

        return [
            { id: "High Angle", points: pointsHigh, color: "#4285F4" },
            { id: "Low Angle", points: pointsLow, color: "#34A853" },
            { id: "Minimum Speed", points: pointsMin, color: "#FBBC05" }
        ];
    }, [angles, launchSpeed, minLaunchSpeed, calculateTrajectoryPoints, calculateLaunchAngle, targetX, targetY, grav]);

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
                },
                {
                    label: 'Ball 3',
                    data: trajectoryData[2]?.points.length > 0 ? [trajectoryData[2].points[Math.min(animationIndex, trajectoryData[2].points.length - 1)]] : [],
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
            <h2 className="title">Challenge 3</h2>
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
                    <label>Gravity (m/s²):</label>
                    <input type="number" value={grav} onChange={(e) => setGrav(Number(e.target.value))} />
                </div>
                <div className="input-group">
                    <label>Launch Speed (m/s):</label>
                    <input type="number" value={launchSpeed} onChange={(e) => setLaunchSpeed(Number(e.target.value))} />
                </div>
                <div className="input-group">
                    <label>Initial Height (m):</label>
                    <input type="number" value={initialHeight} onChange={(e) => setInitialHeight(Number(e.target.value))} />
                </div>
            </div>
            <div className="button-container">
                <button className={`btn btn-primary ${isAnimating ? 'btn-disabled' : ''}`} onClick={replayAnimation} disabled={isAnimating}>Replay Animation</button>
                <button className="btn btn-primary" onClick={saveAsPNG}>Save as PNG</button>
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

export default Challenge3;