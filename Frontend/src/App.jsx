import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './App.css';

function App() {
  const [rowData, setRowData] = useState([]);
  const [agvs, setAgvs] = useState([]);
  const [agvLogs, setAgvLogs] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const svgRef = useRef();

  const nodePositions = [
    { id: 'Node1', x: 50, y: 50 },
    { id: 'Node2', x: 150, y: 50 },
    { id: 'Node3', x: 250, y: 50 },
    { id: 'Node4', x: 50, y: 150 },
    { id: 'Node5', x: 150, y: 150 },
    { id: 'Node6', x: 250, y: 150 },
    { id: 'Node7', x: 50, y: 250 },
    { id: 'Node8', x: 150, y: 250 },
    { id: 'Node9', x: 250, y: 250 },
  ];
  const paths = [
    { source: 'Node1', target: 'Node2' },
    { source: 'Node2', target: 'Node3' },
    { source: 'Node1', target: 'Node4' },
    { source: 'Node4', target: 'Node7' },
    { source: 'Node7', target: 'Node8' },
    { source: 'Node8', target: 'Node9' },
    { source: 'Node2', target: 'Node5' },
    { source: 'Node5', target: 'Node6' },
    { source: 'Node5', target: 'Node8' },
    { source: 'Node3', target: 'Node6' },
  ];

  const agvColors = d3.scaleOrdinal(d3.schemeCategory10);

  const convertTimeToSeconds = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePayloadUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      setRowData(data);
    };
    reader.readAsText(file);
  };

  const handleAgvLogUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      const convertedData = data.map(log => ({
        ...log,
        timestamp: convertTimeToSeconds(log.timestamp),
      }));
      setAgvLogs(convertedData);
    };
    reader.readAsText(file);
  };

  const startSimulation = () => {
    setIsSimulating(true);
    let time = 0;
    const interval = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = prevTime + 1;
        const currentLogs = agvLogs.filter((log) => log.timestamp <= newTime);
        setAgvs(currentLogs);
        if (newTime >= agvLogs[agvLogs.length - 1].timestamp) {
          clearInterval(interval);
          setIsSimulating(false);
        }
        return newTime;
      });
    }, 1000 / simulationSpeed);
  };

  const resetSimulation = () => {
    setCurrentTime(0);
    setAgvs([]);
    setIsSimulating(false);
  };

  const getAgvPath = (agvId) => {
    const agvLogsFiltered = agvLogs.filter((log) => log.agv_id === agvId);
    const path = [];
    for (let i = 0; i < agvLogsFiltered.length - 1; i++) {
      const source = agvLogsFiltered[i].location;
      const target = agvLogsFiltered[i + 1].location;
      path.push({ source, target });
    }
    return path;
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .selectAll('.path')
      .data(paths)
      .enter()
      .append('line')
      .attr('class', 'path')
      .attr('x1', (d) => nodePositions.find((n) => n.id === d.source).x)
      .attr('y1', (d) => nodePositions.find((n) => n.id === d.source).y)
      .attr('x2', (d) => nodePositions.find((n) => n.id === d.target).x)
      .attr('y2', (d) => nodePositions.find((n) => n.id === d.target).y)
      .attr('stroke', 'gray')
      .attr('stroke-width', 2);

    svg
      .selectAll('.node')
      .data(nodePositions)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 10)
      .attr('fill', 'blue');

    svg
      .selectAll('.node-label')
      .data(nodePositions)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', (d) => d.x + 15)
      .attr('y', (d) => d.y + 5)
      .text((d) => d.id)
      .attr('fill', 'black');
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const agvIds = [...new Set(agvLogs.map((log) => log.agv_id))];
    agvIds.forEach((agvId) => {
      const agvPath = getAgvPath(agvId);
      agvPath.forEach((edge) => {
        svg
          .append('line')
          .attr('class', 'agv-path')
          .attr('x1', nodePositions.find((n) => n.id === edge.source).x)
          .attr('y1', nodePositions.find((n) => n.id === edge.source).y)
          .attr('x2', nodePositions.find((n) => n.id === edge.target).x)
          .attr('y2', nodePositions.find((n) => n.id === edge.target).y)
          .attr('stroke', agvColors(agvId))
          .attr('stroke-width', 4);
      });
    });

    const agvGroups = svg
      .selectAll('.agv-group')
      .data(agvs)
      .enter()
      .append('g')
      .attr('class', 'agv-group')
      .attr('id', (d) => `agv-${d.agv_id}`);

    agvGroups
      .append('circle')
      .attr('class', 'agv')
      .attr('r', 8)
      .attr('fill', (d) => agvColors(d.agv_id));

    agvGroups
      .append('text')
      .attr('class', 'agv-label')
      .attr('x', 15)
      .attr('y', 5)
      .text((d) => `AGV${d.agv_id}`)
      .attr('fill', 'black');

    agvs.forEach((agv) => {
      const node = nodePositions.find((n) => n.id === agv.location);
      if (node) {
        d3.select(`#agv-${agv.agv_id}`)
          .transition()
          .duration(1000 / simulationSpeed)
          .ease(d3.easeLinear)
          .attr('transform', `translate(${node.x}, ${node.y})`);
      }
    });
  }, [agvs, simulationSpeed, agvLogs]);

  const columnDefs = [
    { headerName: 'Payload ID', field: 'payload_id' },
    { headerName: 'Source', field: 'src' },
    { headerName: 'Destination', field: 'destination' },
    { headerName: 'Status', field: 'status' },
    { headerName: 'Location', field: 'location' },
    { headerName: 'Delivered', field: 'delivered' },
  ];

  return (
    <div className="p-5 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-5">AGV Journey Tracer</h1>

      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Upload Data</h3>
        <div className="mb-2">
          <strong className="text-gray-600">Payload Data</strong>
          <input type="file" onChange={handlePayloadUpload} className="ml-2" />
        </div>
        <div>
          <strong className="text-gray-600">AGV Log Data</strong>
          <input type="file" onChange={handleAgvLogUpload} className="ml-2" />
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Simulation Controls</h3>
        <button
          onClick={startSimulation}
          disabled={isSimulating}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600 disabled:bg-blue-300"
        >
          Start
        </button>
        <button
          onClick={resetSimulation}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Reset
        </button>
        <div className="mt-3">
          <strong className="text-gray-600">Simulation Speed:</strong>
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="ml-2 p-1 border rounded"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>
        </div>
        <div className="mt-3">
          <strong className="text-gray-600">Timeline:</strong>
          <input
            type="range"
            min="0"
            max={agvLogs.length > 0 ? agvLogs[agvLogs.length - 1].timestamp : 100}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="ml-2"
          />
          <span className="ml-2 text-gray-700">Time: {formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">AGV Movement Simulation</h3>
        <svg ref={svgRef} width={500} height={500} className="border border-gray-300"></svg>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Payload Data</h3>
        <div className="ag-theme-alpine" style={{ height: 200, width: '100%' }}>
          <AgGridReact rowData={rowData} columnDefs={columnDefs} />
        </div>
      </div>
    </div>
  );
}

export default App;