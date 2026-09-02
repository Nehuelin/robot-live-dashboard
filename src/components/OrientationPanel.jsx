import React, { useRef, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Metric } from './Shared';
import { fmt } from '../utils';

export function OrientationPanel({ imu = {}, timestamp = 0 }) {
  const pitch = Math.max(-35, Math.min(35, Number(imu.pitch) || 0));
  const roll = Math.max(-35, Math.min(35, Number(imu.roll) || 0));

  const chartDataRef = useRef({ labels: [], roll: [], pitch: [], yaw: [] });
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const data = chartDataRef.current;
    data.labels.push(fmt(timestamp, 1));
    data.roll.push(Number(imu.roll) || 0);
    data.pitch.push(Number(imu.pitch) || 0);
    data.yaw.push(Number(imu.yaw) || 0);

    if (data.labels.length > 60) {
      data.labels.shift();
      data.roll.shift();
      data.pitch.shift();
      data.yaw.shift();
    }

    setChartData({
      labels: [...data.labels],
      datasets: [
        { label: 'Roll', data: [...data.roll], borderColor: '#42e8e0', borderWidth: 1.5, pointRadius: 0 },
        { label: 'Pitch', data: [...data.pitch], borderColor: '#ffba52', borderWidth: 1.5, pointRadius: 0 },
        { label: 'Yaw', data: [...data.yaw], borderColor: '#68e0a0', borderWidth: 1.5, pointRadius: 0 },
      ]
    });
  }, [imu, timestamp]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: {
        display: true,
        suggestedMin: -5,
        suggestedMax: 5,
        ticks: { color: '#7d8b97', font: { size: 9 } },
        grid: { color: '#26313b' }
      }
    }
  };

  return (
    <div className="orientation-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minHeight: 0 }}>
        <div className="attitude" style={{ flexShrink: 0 }} aria-label={`Roll ${fmt(imu.roll)} grados, pitch ${fmt(imu.pitch)} grados`}>
          <div className="attitude-world" style={{ transform: `translateY(${pitch * 2.5}px) rotate(${-roll * 1.5}deg)` }}>
            <div className="sky" />
            <div className="ground" />
            <div className="horizon-line" />
          </div>
          <div className="reticle">⌁</div>
        </div>
        <div className="orientation-metrics" style={{ flexShrink: 0 }}>
          <Metric label="ROLL" value={fmt(imu.roll)} unit="°" />
          <Metric label="PITCH" value={fmt(imu.pitch)} unit="°" />
          <Metric label="YAW" value={fmt(imu.yaw)} unit="°" />
        </div>

        {/* El gráfico ahora ocupa el espacio vacío a la derecha */}
        <div className="imu-chart" style={{ flex: 1, height: '100%', minHeight: '140px', position: 'relative', marginLeft: '10px' }}>
          {chartData && <Line data={chartData} options={chartOptions} />}
        </div>
      </div>

      <div className="accel-row" style={{ marginTop: 'auto' }}>
        <span>ACCEL</span>
        <b>X {fmt(imu.ax, 2)}</b>
        <b>Y {fmt(imu.ay, 2)}</b>
        <b>Z {fmt(imu.az, 2)} m/s²</b>
      </div>
    </div>
  );
}
