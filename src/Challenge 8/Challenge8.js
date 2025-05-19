import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from "lucide-react";
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import './Challenge8.css'

Chart.register(...registerables);

const AnimatedProjectileMotionSimulator = () => {
    const [launchHeight, setLaunchHeight] = useState(10);
    const [launchAngle, setLaunchAngle] = useState(45);
    const [gravity, setGravity] = useState(9.81);
    const [launchSpeed, setLaunchSpeed] = useState(5);
    const [coefficientOfRestitution, setCoefficientOfRestitution] = useState(0.7);
    const [numBounces, setNumBounces] = useState(6);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [trajectoryPoints, setTrajectoryPoints] = useState([]);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [tableData, setTableData] = useState([]);

    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const startTimeRef = useRef(null);
    const chartRef = useRef(null);

    const calculateTrajectoryPoints = useCallback(() => {
        let points = [];
        let x = 0;
        let y = launchHeight;
        let vx = launchSpeed * Math.cos(launchAngle * Math.PI / 180);
        let vy = launchSpeed * Math.sin(launchAngle * Math.PI / 180);
        let t = 0;
        let dt = 0.01;
        let bounceCount = 0;

        while (bounceCount < numBounces) {
            let x_new = x + vx * dt;
            let y_new = y + vy * dt - 0.5 * gravity * dt * dt;

            if (y_new < 0) {
                y_new = -y_new;
                vy = -coefficientOfRestitution * vy;
                bounceCount++;
            }

            points.push({ x: x_new, y: y_new, t, vx, vy, v: Math.sqrt(vx * vx + vy * vy) });

            vy = vy - gravity * dt;
            x = x_new;
            y = y_new;
            t += dt;

            if (points.length > 10000) break; // Safeguard against infinite loops
        }

        return points;
    }, [launchHeight, launchAngle, gravity, launchSpeed, coefficientOfRestitution, numBounces]);

    useEffect(() => {
        const points = calculateTrajectoryPoints();
        setTrajectoryPoints(points);
        
        // Generate table data
        const tableDataPoints = [];
        const interval = Math.max(1, Math.floor(points.length / 10)); // Show 10 rows or less
        for (let i = 0; i < points.length; i += interval) {
            const point = points[i];
            tableDataPoints.push({
                time: point.t.toFixed(2),
                x: point.x.toFixed(2),
                y: point.y.toFixed(2),
                vx: point.vx.toFixed(2),
                vy: point.vy.toFixed(2),
                v: point.v.toFixed(2)
            });
        }
        setTableData(tableDataPoints);
    }, [calculateTrajectoryPoints]);

    const animate = useCallback((timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsedTime = timestamp - startTimeRef.current;
        const duration = 5000; // Animation duration in milliseconds
        const progress = (elapsedTime % duration) / duration;
        const index = Math.floor(progress * trajectoryPoints.length);
        setAnimationIndex(index);
        
        if (isRecording) {
            renderToCanvas();
        }
        
        if (elapsedTime >= duration && isRecording) {
            stopRecording();
        } else {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [trajectoryPoints, isRecording]);

    useEffect(() => {
        if (isAnimating) {
            startTimeRef.current = null;
            animationRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationRef.current);
        }
        return () => cancelAnimationFrame(animationRef.current);
    }, [isAnimating, animate]);

    const toggleAnimation = () => setIsAnimating(!isAnimating);

    const renderToCanvas = () => {
        if (canvasRef.current && chartRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(chartRef.current.canvas, 0, 0, canvas.width, canvas.height);
        }
    };

    const startRecording = () => {
        if (canvasRef.current) {
            const stream = canvasRef.current.captureStream(30); // 30 FPS
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'projectile_motion.webm';
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setIsAnimating(true);
            startTimeRef.current = null;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsAnimating(false);
            chunksRef.current = [];
        }
    };

    const replayAnimation = () => {
        setIsAnimating(true);
        setAnimationIndex(0);
        startTimeRef.current = null;
    };

    const chartData = {
        datasets: [
            {
                label: 'Trajectory',
                data: trajectoryPoints,
                borderColor: 'rgba(0, 123, 255, 0.7)',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: 'Ball',
                data: trajectoryPoints.length > 0 ? [trajectoryPoints[animationIndex]] : [],
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

    const maxHeight = trajectoryPoints.length > 0 ? Math.max(...trajectoryPoints.map(point => point.y)).toFixed(2) : 'N/A';
    const range = trajectoryPoints.length > 0 ? trajectoryPoints[trajectoryPoints.length - 1].x.toFixed(2) : 'N/A';
    const timeOfFlight = trajectoryPoints.length > 0 ? trajectoryPoints[trajectoryPoints.length - 1].t.toFixed(2) : 'N/A';

    return (
        <div className="trajectoryCalculator">
            <h1 className="title">Challenge 8</h1>
            <div className="inputContainer">
                <div className="inputGroup">
                    <label>Launch Height (m):</label>
                    <input 
                        type="number" 
                        value={launchHeight} 
                        onChange={(e) => setLaunchHeight(Number(e.target.value))} 
                    />
                </div>
                <div className="inputGroup">
                    <label>Launch Angle (degrees):</label>
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
                    <label>Launch Speed (m/s):</label>
                    <input 
                        type="number" 
                        value={launchSpeed} 
                        onChange={(e) => setLaunchSpeed(Number(e.target.value))} 
                    />
                </div>
                <div className="inputGroup">
                    <label>Coefficient of Restitution:</label>
                    <input 
                        type="number" 
                        value={coefficientOfRestitution} 
                        onChange={(e) => setCoefficientOfRestitution(Number(e.target.value))} 
                        step="0.1" 
                        min="0" 
                        max="1" 
                    />
                </div>
                <div className="inputGroup">
                    <label>Number of Bounces:</label>
                    <input 
                        type="number" 
                        value={numBounces} 
                        onChange={(e) => setNumBounces(Number(e.target.value))} 
                        min="0" 
                    />
                </div>
            </div>
            <div className="buttonContainer">
                <button 
                    onClick={toggleAnimation} 
                    className={`btn ${isAnimating ? 'btnDisabled' : 'btnPrimary'}`}
                >
                    {isAnimating ? 'Stop Animation' : 'Start Animation'}
                </button>
                <button 
                    onClick={isRecording ? stopRecording : startRecording} 
                    className={`btn ${isRecording ? 'btnDisabled' : 'btnPrimary'}`}
                >
                    <Camera className="mr-2" />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <button 
                    onClick={replayAnimation}
                    disabled={isAnimating}
                    className={`btn ${isAnimating ? 'btnDisabled' : 'btnPrimary'}`}
                >
                    Replay Animation
                </button>
            </div>
            <div className="chartContainer">
                <Line
                    ref={chartRef}
                    data={chartData}
                    options={chartOptions}
                />
                <canvas 
                    ref={canvasRef} 
                    width="800" 
                    height="400" 
                    style={{ 
                        display: isRecording ? 'block' : 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none'
                    }}
                />
            </div>
            <div className="trajectoryData">
                <h3>Trajectory Data:</h3>
                <ul>
                    <li>Maximum Height: {maxHeight} m</li>
                    <li>Range: {range} m</li>
                    <li>Time of Flight: {timeOfFlight} s</li>
                </ul>
            </div>
            <div className="data-table">
                <h3>Trajectory Table:</h3>
                <div className='table-wrapper'>
                <table>
                    <thead>
                        <tr>
                            <th>Time (s)</th>
                            <th>X (m)</th>
                            <th>Y (m)</th>
                            <th>Vx (m/s)</th>
                            <th>Vy (m/s)</th>
                            <th>V (m/s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => (
                            <tr key={index}>
                                <td>{row.time}</td>
                                <td>{row.x}</td>
                                <td>{row.y}</td>
                                <td>{row.vx}</td>
                                <td>{row.vy}</td>
                                <td>{row.v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    );
};

export default AnimatedProjectileMotionSimulator;