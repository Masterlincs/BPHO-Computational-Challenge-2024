import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';

Chart.register(...registerables);

const ProjectileMotionComparison = () => {
    const [launchHeight, setLaunchHeight] = useState(10);
    const [launchAngle, setLaunchAngle] = useState(45);
    const [gravity, setGravity] = useState(9.81);
    const [launchSpeed, setLaunchSpeed] = useState(20);
    const [dragCoefficient, setDragCoefficient] = useState(0.1);
    const [crossSectionalArea, setCrossSectionalArea] = useState(0.007854);
    const [objectMass, setObjectMass] = useState(0.1);
    const [scaleHeight, setScaleHeight] = useState(8500);
    const [seaLevelDensity, setSeaLevelDensity] = useState(1.225);
    const [trajectoryData, setTrajectoryData] = useState([]);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [tableData, setTableData] = useState([]);

    const calculateAirDensity = (altitude) => {
        return seaLevelDensity * Math.exp(-altitude / scaleHeight);
    };

    const chartRefs = {
        trajectory: useRef(null),
        heightTime: useRef(null),
    };
    const intervalRef = useRef(null);

    const calculateTrajectoryPoints = useCallback(() => {
        let data = [];
        let x = 0;
        let y = launchHeight;
        let vx = launchSpeed * Math.cos(launchAngle * Math.PI / 180);
        let vy = launchSpeed * Math.sin(launchAngle * Math.PI / 180);
        let xNormal = 0;
        let yNormal = launchHeight;
        let vxNormal = vx;
        let vyNormal = vy;
        let t = 0;
        let dt = 0.01;
    
        while (y >= 0 && yNormal >= 0) {
            const currentAirDensity = calculateAirDensity(y);
            const k = 0.5 * dragCoefficient * currentAirDensity * crossSectionalArea / objectMass;
            const kNormal = 0.5 * dragCoefficient * seaLevelDensity * crossSectionalArea / objectMass;
            const v = Math.sqrt(vx * vx + vy * vy);
            const vNormal = Math.sqrt(vxNormal * vxNormal + vyNormal * vyNormal);
            const ax = -k * v * vx;
            const ay = -gravity - k * v * vy;
            const axNormal = -kNormal * vNormal * vxNormal;
            const ayNormal = -gravity - kNormal * vNormal * vyNormal;
    
            data.push({
                t,
                x, y, xNormal, yNormal,
                vx, vy, v,
                vxNormal, vyNormal, vNormal
            });
    
            x += vx * dt + 0.5 * ax * dt * dt;
            y += vy * dt + 0.5 * ay * dt * dt;
            vx += ax * dt;
            vy += ay * dt;
    
            xNormal += vxNormal * dt + 0.5 * axNormal * dt * dt;
            yNormal += vyNormal * dt + 0.5 * ayNormal * dt * dt;
            vxNormal += axNormal * dt;
            vyNormal += ayNormal * dt;
    
            t += dt;
    
            if (data.length > 10000) break; // Safeguard against infinite loops
        }
    
        return data;
    }, [launchHeight, launchAngle, gravity, launchSpeed, dragCoefficient, crossSectionalArea, objectMass, scaleHeight, seaLevelDensity, calculateAirDensity]);

    useEffect(() => {
        const data = calculateTrajectoryPoints();
        if (Array.isArray(data) && data.length > 0) {
            setTrajectoryData(data);
            setAnimationIndex(0);
            setIsAnimating(false);
            
            // Generate table data
            const tableInterval = Math.max(1, Math.floor(data.length / 10));
            const newTableData = data.filter((_, index) => index % tableInterval === 0 || index === data.length - 1);
            setTableData(newTableData);
        } else {
            console.error('Invalid trajectory data:', data);
            setTrajectoryData([]);
            setAnimationIndex(0);
            setIsAnimating(false);
            setTableData([]);
        }
    }, [calculateTrajectoryPoints]);

    const startAnimation = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setIsAnimating(true);
        setAnimationIndex(0);

        intervalRef.current = setInterval(() => {
            setAnimationIndex((prevIndex) => {
                if (prevIndex < trajectoryData.length - 1) {
                    return prevIndex + 1;
                } else {
                    clearInterval(intervalRef.current);
                    setIsAnimating(false);
                    return prevIndex;
                }
            });
        }, 20);
    };

    const replayAnimation = () => {
        startAnimation();
    };

    const saveAsPNG = (chartRef, chartName) => {
        if (chartRef.current) {
            const link = document.createElement('a');
            link.download = `${chartName.toLowerCase().replace(/\s+/g, '_')}.png`;
            link.href = chartRef.current.canvas.toDataURL('image/png');
            link.click();
        }
    };

    const getChartData = (data, xKey, yKey, yKeyNormal) => ({
        datasets: [
            {
                label: 'Diminishing Air Resistance',
                data: data.filter(point => point && point[xKey] !== undefined && point[yKey] !== undefined)
                          .map(point => ({ x: point[xKey], y: point[yKey] })),
                borderColor: 'rgba(0, 123, 255, 0.7)',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: 'Normal Air Resistance',
                data: data.filter(point => point && point[xKey] !== undefined && point[yKeyNormal] !== undefined)
                          .map(point => ({ x: point[xKey], y: point[yKeyNormal] })),
                borderColor: 'rgba(255, 99, 132, 0.7)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: 'Ball (Diminishing Air Resistance)',
                data: data[animationIndex] && data[animationIndex][xKey] !== undefined && data[animationIndex][yKey] !== undefined
                    ? [{ x: data[animationIndex][xKey], y: data[animationIndex][yKey] }]
                    : [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgb(75, 192, 192)',
                pointRadius: 6,
                pointHoverRadius: 8,
            },
            {
                label: 'Ball (Normal Air Resistance)',
                data: data[animationIndex] && data[animationIndex][xKey] !== undefined && data[animationIndex][yKeyNormal] !== undefined
                    ? [{ x: data[animationIndex][xKey], y: data[animationIndex][yKeyNormal] }]
                    : [],
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgb(255, 159, 64)',
                pointRadius: 6,
                pointHoverRadius: 8,
            },
        ],
    });

    const getChartOptions = (xKey, yLabel, title) => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: true,
                    text: xKey === 't' ? 'Time (s)' : 'Distance (m)',
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
                    text: yLabel,
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
        },
        plugins: {
            title: {
                display: true,
                text: title,
                font: {
                    size: 16,
                    weight: 'bold',
                },
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
                            `${context.dataset.label}`,
                            `${xKey}: ${point.x.toFixed(2)}`,
                            `${yLabel}: ${point.y.toFixed(2)}`,
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
    });

    const maxHeight = trajectoryData.length > 0 ? Math.max(...trajectoryData.map(point => point.y)).toFixed(2) : 'N/A';
    const range = trajectoryData.length > 0 ? trajectoryData[trajectoryData.length - 1].x.toFixed(2) : 'N/A';
    const timeOfFlight = trajectoryData.length > 0 ? trajectoryData[trajectoryData.length - 1].t.toFixed(2) : 'N/A';

    return (
        <div className="trajectoryCalculator">
            <h1 className="title">Bonus Challenge 1</h1>
            <div className="inputContainer">
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
                <label>Drag Coefficient:</label>
                <input 
                    type="number" 
                    value={dragCoefficient} 
                    onChange={(e) => setDragCoefficient(Number(e.target.value))} 
                    step="0.01"
                />
            </div>
            <div className="inputGroup">
                <label>Cross-sectional Area (m²):</label>
                <input 
                    type="number" 
                    value={crossSectionalArea} 
                    onChange={(e) => setCrossSectionalArea(Number(e.target.value))} 
                    step="0.000001"
                />
            </div>
            <div className="inputGroup">
                <label>Object Mass (kg):</label>
                <input 
                    type="number" 
                    value={objectMass} 
                    onChange={(e) => setObjectMass(Number(e.target.value))} 
                    step="0.01"
                />
            </div>
            <div className="inputGroup">
                <label>Scale Height (m):</label>
                <input 
                    type="number" 
                    value={scaleHeight} 
                    onChange={(e) => setScaleHeight(Number(e.target.value))} 
                    step="1"
                />
            </div>
            <div className="inputGroup">
                <label>Sea Level Density (kg/m³):</label>
                <input 
                    type="number" 
                    value={seaLevelDensity} 
                    onChange={(e) => setSeaLevelDensity(Number(e.target.value))} 
                    step="0.001"
                />
            </div>
        </div>
            </div>
            <div className="buttonContainer">
                <button
                    onClick={replayAnimation}
                    disabled={isAnimating}
                    className={`btn ${isAnimating ? 'btnDisabled' : 'btnPrimary'}`}
                >
                    {isAnimating ? 'Animating...' : 'Replay Animation'}
                </button>
            </div>
            <div className="chartContainer">
                <Line
                    data={getChartData(trajectoryData, 'x', 'y', 'yNormal')}
                    options={getChartOptions('x', 'Height (m)', 'Trajectory (y vs x)')}
                    ref={chartRefs.trajectory}
                />
                <div className="buttonContainer">
                    <button onClick={() => saveAsPNG(chartRefs.trajectory, 'Trajectory')} className="btn btnPrimary saveButton">
                        Save as PNG
                    </button>
                </div>
            </div>
            <div className="chartContainer">
                <Line
                    data={getChartData(trajectoryData, 't', 'y', 'yNormal')}
                    options={getChartOptions('t', 'Height (m)', 'Height vs Time')}
                    ref={chartRefs.heightTime}
                />
                <div className="buttonContainer">
                    <button onClick={() => saveAsPNG(chartRefs.heightTime, 'Height vs Time')} className="btn btnPrimary saveButton">
                        Save as PNG
                    </button>
                </div>
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
                <h3>Trajectory Comparison Table</h3>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Time (s)</th>
                                <th>X (m) Diminishing Air Resistance</th>
                                <th>Y (m) Diminishing Air Resistance</th>
                                <th>X (m) Normal Air Resistance</th>
                                <th>Y (m) Normal Air Resistance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((point, index) => (
                                <tr key={index}>
                                    <td>{point.t.toFixed(2)}</td>
                                    <td>{point.x.toFixed(2)}</td>
                                    <td>{point.y.toFixed(2)}</td>
                                    <td>{point.xNormal.toFixed(2)}</td>
                                    <td>{point.yNormal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectileMotionComparison;